import { describe, expect, it } from "vitest";
import { defaultParams, simulateTransmission } from "../simulation/model";
import {
  boutonCenter,
  buildVisualSchedule,
  buildVisualState,
  receptorSlots,
  synapseVisualTiming,
  transporterSlots,
  type InterventionVisualConfig,
  type VisualState
} from "./synapseVisualModel";
import type { SimulationFrame } from "../simulation/types";

interface TimedState {
  state: VisualState;
  time: number;
}

const frame = simulateTransmission(defaultParams);

const singleEventFrame: SimulationFrame = {
  ...frame,
  duration: 4,
  eventMarkers: [frame.eventMarkers[0]]
};

const noPulseFrame: SimulationFrame = {
  ...frame,
  duration: 4,
  eventMarkers: []
};

const longNoPulseFrame: SimulationFrame = {
  ...frame,
  duration: 12,
  eventMarkers: []
};

const baselineConfig: InterventionVisualConfig = { id: "baseline", strength: 0 };

const scanStates = (
  scannedFrame: SimulationFrame,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
): TimedState[] => {
  const states: TimedState[] = [];

  for (let time = 0; time <= scannedFrame.duration; time += 0.04) {
    states.push({
      state: buildVisualState(scannedFrame, time, moleculesPerPulse, config),
      time
    });
  }

  return states;
};

const countUniqueNotes = (
  scannedFrame: SimulationFrame,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
) => {
  const noteIds = new Set<string>();

  scanStates(scannedFrame, moleculesPerPulse, config).forEach(({ state }) => {
    state.signalNotes.forEach((note) => noteIds.add(note.id));
  });

  return noteIds.size;
};

const countUniqueSustains = (
  scannedFrame: SimulationFrame,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
) => {
  const sustainIds = new Set<string>();

  scanStates(scannedFrame, moleculesPerPulse, config).forEach(({ state }) => {
    state.signalSustains.forEach((sustain) => sustainIds.add(sustain.id));
  });

  return sustainIds.size;
};

const collectUniqueSustainIntervals = (
  scannedFrame: SimulationFrame,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
) => {
  const intervalsById = new Map<
    string,
    {
      endedAt: number;
      id: string;
      slotIndex: number;
      startedAt: number;
    }
  >();

  scanStates(scannedFrame, moleculesPerPulse, config).forEach(({ state }) => {
    state.signalSustains.forEach((sustain) => {
      intervalsById.set(sustain.id, {
        endedAt: sustain.endedAt,
        id: sustain.id,
        slotIndex: sustain.slotIndex,
        startedAt: sustain.startedAt
      });
    });
  });

  return [...intervalsById.values()];
};

const expectNoBindingOverlaps = (
  bindings: { boundEndAt: number; encounterAt: number; id: string }[]
) => {
  const sorted = [...bindings].sort((left, right) => left.encounterAt - right.encounterAt);

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];

    expect(
      current.encounterAt,
      `${current.id} starts before ${previous.id} releases`
    ).toBeGreaterThanOrEqual(previous.boundEndAt - 0.000001);
  }
};

const collectTransmitterPhases = (states: TimedState[]) => {
  const phasesById = new Map<string, Set<string>>();

  states.forEach(({ state }) => {
    state.molecules
      .filter((molecule) => molecule.ligandKind === "transmitter")
      .forEach((molecule) => {
        const phases = phasesById.get(molecule.id) ?? new Set<string>();
        phases.add(molecule.phase);
        phasesById.set(molecule.id, phases);
      });
    state.dockedLigands
      .filter((ligand) => ligand.ligandKind === "transmitter")
      .forEach((ligand) => {
        const phases = phasesById.get(ligand.id) ?? new Set<string>();
        phases.add("bound");
        phasesById.set(ligand.id, phases);
      });
  });

  return phasesById;
};

describe("synapse visual model", () => {
  it("defines five receptor slots and two transporter slots with no MAO clearance sites", () => {
    const state = buildVisualState(frame, 1, 7, baselineConfig);

    expect(receptorSlots).toHaveLength(5);
    expect(transporterSlots).toHaveLength(2);
    expect(state.receptorOccupancies).toHaveLength(5);
    expect(state.transporterOccupancies).toHaveLength(2);
    expect(Object.prototype.hasOwnProperty.call(state, "maoOccupancies")).toBe(false);
  });

  it("produces transmitter signal events only from active receptor captures", () => {
    const stateWithNote = scanStates(frame, 12, baselineConfig).find(
      ({ state }) => state.signalNotes.length > 0
    );

    expect(stateWithNote).toBeDefined();

    const note = stateWithNote?.state.signalNotes[0];
    expect(note).toBeDefined();
    expect(note?.slotIndex).toBeGreaterThanOrEqual(0);
    expect(note?.slotIndex).toBeLessThan(receptorSlots.length);
    expect(stateWithNote?.state.receptorOccupancies[note?.slotIndex ?? -1].active).toBe(true);
  });

  it("delays pulse transmitter visibility until vesicle release reaches the membrane", () => {
    const marker = singleEventFrame.eventMarkers[0];
    const beforeRelease = buildVisualState(
      singleEventFrame,
      marker + synapseVisualTiming.releaseDelaySeconds * 0.5,
      7,
      baselineConfig
    );
    const afterRelease = buildVisualState(
      singleEventFrame,
      marker + synapseVisualTiming.releaseDelaySeconds + 0.08,
      7,
      baselineConfig
    );

    expect(
      beforeRelease.molecules.filter((molecule) => molecule.ligandKind === "transmitter")
    ).toHaveLength(0);
    expect(afterRelease.molecules.some((molecule) => molecule.ligandKind === "transmitter")).toBe(
      true
    );
  });

  it("allows transmitter to reach top and bottom receptors on the curved dendrite", () => {
    const activatedSlots = new Set(
      scanStates(frame, 12, baselineConfig).flatMap(({ state }) =>
        state.signalNotes.map((note) => note.slotIndex)
      )
    );

    expect(activatedSlots.has(0)).toBe(true);
    expect(activatedSlots.has(receptorSlots.length - 1)).toBe(true);
  });

  it("does not turn reuptaken molecules into notes", () => {
    const reuptakeStates = scanStates(singleEventFrame, 1, baselineConfig);
    const reuptakeHappened = reuptakeStates.some(({ state }) =>
      state.transporterOccupancies.some((occupancy) => occupancy.activation > 0)
    );
    const noteHappened = reuptakeStates.some(({ state }) => state.signalNotes.length > 0);

    expect(reuptakeHappened).toBe(true);
    expect(noteHappened).toBe(false);
  });

  it("returns the same receptor-bound transmitter to the cleft after the binding window", () => {
    const scannedStates = scanStates(frame, 12, baselineConfig);
    const phasesById = collectTransmitterPhases(scannedStates);
    const persistentReturn = [...phasesById.values()].some(
      (phases) => phases.has("bound") && phases.has("drift_to_axon")
    );
    const noteIds = new Set(
      scannedStates.flatMap(({ state }) => state.signalNotes.map((note) => note.id))
    );

    expect(persistentReturn).toBe(true);
    expect([...noteIds].some((id) => id.includes("post-receptor"))).toBe(false);
  });

  it("keeps receptor-bound transmitter opaque until it unbinds", () => {
    const lateBoundLigands = scanStates(frame, 12, baselineConfig).flatMap(({ state }) =>
      state.dockedLigands.filter(
        (ligand) =>
          ligand.ligandKind === "transmitter" &&
          ligand.age > synapseVisualTiming.boundSeconds - 0.08
      )
    );

    expect(lateBoundLigands.length).toBeGreaterThan(0);
    expect(lateBoundLigands.every((ligand) => ligand.alpha === 1)).toBe(true);
  });

  it("captures transmitter at transporters only when it is locally near the site", () => {
    const scannedStates = scanStates(frame, 12, baselineConfig);
    const localCaptureState = scannedStates.find(({ state }) =>
      state.transporterOccupancies.some((occupancy) => {
        const slot = transporterSlots[occupancy.slotIndex];
        return (
          occupancy.absorbing &&
          state.molecules.some(
            (molecule) =>
              molecule.ligandKind === "transmitter" &&
              Math.hypot(molecule.position.x - slot.x, molecule.position.y - slot.y) < 80
          )
        );
      })
    );

    expect(localCaptureState).toBeDefined();
  });

  it("can reuptake the same returning transmitter at an open transporter", () => {
    const scannedStates = scanStates(frame, 12, baselineConfig);
    const phasesById = collectTransmitterPhases(scannedStates);
    const returnedAndAbsorbed = [...phasesById.values()].some(
      (phases) => phases.has("bound") && phases.has("absorbing")
    );
    const localReturningCaptureState = scannedStates.find(({ state }) =>
      state.transporterOccupancies.some(
        (occupancy) =>
          occupancy.absorbing &&
          state.molecules.some(
            (molecule) => molecule.phase === "absorbing" && molecule.ligandKind === "transmitter"
          )
      )
    );

    expect(returnedAndAbsorbed).toBe(true);
    expect(localReturningCaptureState).toBeDefined();
  });

  it("fades reuptaken transmitter inward through the transporter after uptake completes", () => {
    const scannedStates = scanStates(frame, 12, baselineConfig);
    const phasesById = collectTransmitterPhases(scannedStates);
    const internalizingState = scannedStates.find(({ state }) =>
      state.molecules.some((molecule) => {
        if (molecule.ligandKind !== "transmitter" || molecule.phase !== "internalizing") {
          return false;
        }

        return transporterSlots.some((slot) => {
          const inward = {
            x: boutonCenter.x - slot.x,
            y: boutonCenter.y - slot.y
          };
          const inwardLength = Math.hypot(inward.x, inward.y);
          const inwardDistance =
            ((molecule.position.x - slot.x) * inward.x +
              (molecule.position.y - slot.y) * inward.y) /
            inwardLength;

          return inwardDistance > 4 && molecule.alpha < 0.86;
        });
      })
    );
    const internalizingMolecule = internalizingState?.state.molecules.find(
      (molecule) => molecule.ligandKind === "transmitter" && molecule.phase === "internalizing"
    );

    expect(internalizingMolecule).toBeDefined();
    expect(
      internalizingMolecule && phasesById.get(internalizingMolecule.id)?.has("absorbing")
    ).toBe(true);
  });

  it("inhibitor molecules occupy transporter sites and block those sites from reuptaking transmitter", () => {
    const stateWithInhibitor = scanStates(frame, 7, {
      id: "reuptake_inhibitor",
      strength: 0.9
    }).find(({ state }) =>
      state.transporterOccupancies.some(
        (occupancy) => occupancy.ligand?.ligandKind === "reuptake_inhibitor"
      )
    );

    expect(stateWithInhibitor).toBeDefined();

    const inhibitedSites = stateWithInhibitor?.state.transporterOccupancies.filter(
      (occupancy) => occupancy.ligand?.ligandKind === "reuptake_inhibitor"
    );
    expect(inhibitedSites?.length).toBeGreaterThan(0);
    inhibitedSites?.forEach((occupancy) => {
      expect(occupancy.absorbing).toBe(false);
      expect(occupancy.leaking).toBe(false);
    });
    stateWithInhibitor?.state.dockedLigands
      .filter((ligand) => ligand.ligandKind === "reuptake_inhibitor")
      .forEach((ligand) => {
        expect(ligand.target.kind).toBe("transporter");
      });
  });

  it("keeps returning transmitter from entering inhibitor-occupied transporter sites", () => {
    const stateWithInhibitedReturningTransmitter = scanStates(frame, 12, {
      id: "reuptake_inhibitor",
      strength: 0.5
    }).find(
      ({ state }) =>
        state.molecules.some(
          (molecule) => molecule.ligandKind === "transmitter" && molecule.phase === "drift_to_axon"
        ) &&
        state.transporterOccupancies.some(
          (occupancy) => occupancy.ligand?.ligandKind === "reuptake_inhibitor"
        )
    );

    expect(stateWithInhibitedReturningTransmitter).toBeDefined();
    stateWithInhibitedReturningTransmitter?.state.transporterOccupancies
      .filter((occupancy) => occupancy.ligand?.ligandKind === "reuptake_inhibitor")
      .forEach((occupancy) => expect(occupancy.absorbing).toBe(false));
  });

  it("rebounds the same returning transmitter from inhibitor-blocked transporters", () => {
    const scannedStates = scanStates(frame, 12, {
      id: "reuptake_inhibitor",
      strength: 1
    });
    const phasesById = collectTransmitterPhases(scannedStates);
    const reboundNoteId = scannedStates
      .flatMap(({ state }) => state.signalNotes.map((note) => note.id))
      .find((id) => id.includes("lock-1"));
    const reboundMoleculeId = reboundNoteId?.replace(/-lock-1$/, "");
    const sameMoleculeRebound = Boolean(
      reboundMoleculeId && phasesById.get(reboundMoleculeId)?.has("drift_to_axon")
    );
    const reboundNearBlockedTransporter = scannedStates.find(({ state }) =>
      state.molecules.some((molecule) => {
        if (molecule.phase !== "drift_to_dendrite") {
          return false;
        }

        return state.transporterOccupancies.some((occupancy) => {
          const slot = transporterSlots[occupancy.slotIndex];
          return (
            occupancy.ligand?.ligandKind === "reuptake_inhibitor" &&
            Math.hypot(molecule.position.x - slot.x, molecule.position.y - slot.y) < 140
          );
        });
      })
    );

    expect(sameMoleculeRebound).toBe(true);
    expect(reboundNearBlockedTransporter).toBeDefined();
  });

  it("rebounds returning transmitter from releaser-reversed transporters", () => {
    const reboundNoteState = scanStates(frame, 12, {
      id: "releaser",
      strength: 1
    }).find(({ state }) => state.signalNotes.some((note) => note.id.includes("lock-1")));

    expect(reboundNoteState).toBeDefined();
  });

  it("allows rebound transmitter to activate receptors under reuptake inhibition", () => {
    const reboundNoteState = scanStates(frame, 12, {
      id: "reuptake_inhibitor",
      strength: 1
    }).find(({ state }) => state.signalNotes.some((note) => note.id.includes("lock-1")));

    expect(reboundNoteState).toBeDefined();
  });

  it("releaser occupancy emits transmitter from transporter sites", () => {
    const noLeak = buildVisualState(noPulseFrame, 1.2, 7, baselineConfig);
    const releaserState = scanStates(noPulseFrame, 7, {
      id: "releaser",
      strength: 1
    }).find(
      ({ state }) =>
        state.transporterOccupancies.some((occupancy) => occupancy.leaking) &&
        state.molecules.some((molecule) => molecule.ligandKind === "transmitter")
    );

    expect(noLeak.molecules).toHaveLength(0);
    expect(releaserState).toBeDefined();
    releaserState?.state.dockedLigands
      .filter((ligand) => ligand.ligandKind === "releaser")
      .forEach((ligand) => {
        expect(ligand.target.kind).toBe("transporter");
      });
  });

  it("starts releaser-driven efflux at transporter binding time instead of pre-populating a stream", () => {
    let earlyLeakState: VisualState | undefined;
    let leakingTransporters: typeof transporterSlots | undefined;

    for (let time = 0; time <= noPulseFrame.duration; time += 0.01) {
      const state = buildVisualState(noPulseFrame, time, 7, {
        id: "releaser",
        strength: 1
      });
      const leakingOccupancies = state.transporterOccupancies.filter(
        (occupancy) =>
          occupancy.leaking &&
          (occupancy.ligand?.age ?? Number.POSITIVE_INFINITY) >= 0.04 &&
          (occupancy.ligand?.age ?? Number.POSITIVE_INFINITY) <= 0.12
      );

      if (leakingOccupancies.length > 0) {
        earlyLeakState = state;
        leakingTransporters = leakingOccupancies.map(
          (occupancy) => transporterSlots[occupancy.slotIndex]
        );
        break;
      }
    }

    expect(earlyLeakState).toBeDefined();
    const leakedTransmitters =
      earlyLeakState?.molecules.filter((molecule) => molecule.ligandKind === "transmitter") ?? [];

    expect(leakedTransmitters.length).toBeGreaterThan(0);
    leakedTransmitters.forEach((molecule) => {
      expect(
        leakingTransporters?.some(
          (slot) => Math.hypot(molecule.position.x - slot.x, molecule.position.y - slot.y) < 62
        )
      ).toBe(true);
    });
  });

  it("releaser-driven efflux can activate receptors near the top and bottom transporter paths", () => {
    const activatedSlots = new Set(
      scanStates(longNoPulseFrame, 7, {
        id: "releaser",
        strength: 1
      }).flatMap(({ state }) => state.signalNotes.map((note) => note.slotIndex))
    );

    expect(activatedSlots.has(0)).toBe(true);
    expect(activatedSlots.has(Math.floor(receptorSlots.length / 2))).toBe(true);
    expect(activatedSlots.has(receptorSlots.length - 1)).toBe(true);
  });

  it("keeps effluxed transmitter diffusing after the transporter stops being reversed", () => {
    const persistedLeakState = scanStates(longNoPulseFrame, 7, {
      id: "releaser",
      strength: 0.4
    }).find(
      ({ state }) =>
        state.molecules.some((molecule) => molecule.ligandKind === "transmitter") &&
        state.transporterOccupancies.every((occupancy) => !occupancy.leaking)
    );

    expect(persistedLeakState).toBeDefined();
  });

  it("allows effluxed transmitter tracks to be reuptaken after they diffuse through the cleft", () => {
    const leakedReuptakeState = scanStates(longNoPulseFrame, 7, {
      id: "releaser",
      strength: 1
    }).find(({ state }) =>
      state.transporterOccupancies.some((occupancy) => {
        const slot = transporterSlots[occupancy.slotIndex];
        return (
          occupancy.absorbing &&
          state.molecules.some(
            (molecule) =>
              molecule.ligandKind === "transmitter" &&
              molecule.origin === "leak" &&
              molecule.phase === "absorbing" &&
              Math.hypot(molecule.position.x - slot.x, molecule.position.y - slot.y) < 82
          )
        );
      })
    );

    expect(leakedReuptakeState).toBeDefined();
  });

  it("agonist binding activates receptors and produces sustained signal without pulse events", () => {
    const agonistSustains = countUniqueSustains(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    });
    const agonistNotes = countUniqueNotes(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    });
    const agonistState = scanStates(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    }).find(
      ({ state }) =>
        state.dockedLigands.some((ligand) => ligand.ligandKind === "agonist") &&
        state.signalSustains.some(
          (sustain) => sustain.duration === synapseVisualTiming.drugBoundSeconds
        )
    );

    expect(agonistSustains).toBeGreaterThan(0);
    expect(agonistNotes).toBe(0);
    agonistState?.state.dockedLigands
      .filter((ligand) => ligand.ligandKind === "agonist")
      .forEach((ligand) => {
        expect(ligand.target.kind).toBe("receptor_orthosteric");
      });
  });

  it("receptor-targeting drugs diffuse visibly through the cleft before docking", () => {
    const agonistFreeState = scanStates(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    }).find(({ state }) =>
      state.molecules.some(
        (molecule) =>
          molecule.ligandKind === "agonist" &&
          molecule.position.x < receptorSlots[2].x &&
          molecule.position.y > 0 &&
          molecule.position.y < 560
      )
    );
    const pamFreeState = scanStates(noPulseFrame, 7, {
      id: "pam",
      strength: 1
    }).find(({ state }) =>
      state.molecules.some(
        (molecule) =>
          molecule.ligandKind === "pam" &&
          molecule.position.x < receptorSlots[2].x &&
          molecule.position.y > 0 &&
          molecule.position.y < 560
      )
    );

    expect(agonistFreeState).toBeDefined();
    expect(pamFreeState).toBeDefined();
  });

  it("lets antagonist diffusion reach the middle receptor at max strength", () => {
    const middleSlot = Math.floor(receptorSlots.length / 2);
    const middleAntagonistState = scanStates(longNoPulseFrame, 7, {
      id: "antagonist",
      strength: 1
    }).find(({ state }) =>
      state.dockedLigands.some(
        (ligand) =>
          ligand.ligandKind === "antagonist" &&
          ligand.target.kind === "receptor_orthosteric" &&
          ligand.target.slotIndex === middleSlot
      )
    );

    expect(middleAntagonistState).toBeDefined();
  });

  it("uses shared ambient diffusion instead of target-side drug spawn bands", () => {
    const transporterDrugAwayFromTransporters = scanStates(noPulseFrame, 7, {
      id: "reuptake_inhibitor",
      strength: 1
    }).some(({ state }) =>
      state.molecules.some(
        (molecule) =>
          molecule.ligandKind === "reuptake_inhibitor" &&
          molecule.position.x > 430 &&
          molecule.position.y > 0 &&
          molecule.position.y < 560
      )
    );
    const receptorDrugAwayFromReceptors = scanStates(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    }).some(({ state }) =>
      state.molecules.some(
        (molecule) =>
          molecule.ligandKind === "agonist" &&
          molecule.position.x < 470 &&
          molecule.position.y > 0 &&
          molecule.position.y < 560
      )
    );

    expect(transporterDrugAwayFromTransporters).toBe(true);
    expect(receptorDrugAwayFromReceptors).toBe(true);
  });

  it("renders drug molecules with one shared rounded diamond glyph language", () => {
    const drugKinds = ["reuptake_inhibitor", "releaser", "agonist", "antagonist", "pam"] as const;

    drugKinds.forEach((id) => {
      const state = buildVisualState(noPulseFrame, 1.2, 7, { id, strength: 1 });
      const drugMolecules = state.molecules.filter((molecule) => molecule.ligandKind === id);

      expect(drugMolecules.length).toBeGreaterThan(0);
      expect(drugMolecules.every((molecule) => molecule.shape === "rounded_diamond")).toBe(true);
    });
  });

  it("agonist occupancy continues sustained signaling while the receptor remains bound", () => {
    const lateAgonistState = scanStates(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    }).find(({ state }) => {
      const lateBoundSlot = state.dockedLigands.find(
        (ligand) =>
          ligand.ligandKind === "agonist" && ligand.age > synapseVisualTiming.drugBoundSeconds * 0.5
      )?.target.slotIndex;

      return (
        lateBoundSlot !== undefined &&
        state.receptorOccupancies[lateBoundSlot].active &&
        state.signalSustains.some((sustain) => sustain.slotIndex === lateBoundSlot)
      );
    });

    expect(lateAgonistState).toBeDefined();
  });

  it("does not backdate overlapping agonist sustains on the same receptor", () => {
    const intervals = collectUniqueSustainIntervals(frame, 7, {
      id: "agonist",
      strength: 1
    });

    receptorSlots.forEach((slot) => {
      const slotIntervals = intervals
        .filter((interval) => interval.slotIndex === slot.slotIndex)
        .sort((left, right) => left.startedAt - right.startedAt);

      for (let index = 1; index < slotIntervals.length; index += 1) {
        const previous = slotIntervals[index - 1];
        const current = slotIntervals[index];

        expect(
          current.startedAt,
          `${current.id} starts before ${previous.id} ends on slot ${slot.slotIndex}`
        ).toBeGreaterThanOrEqual(previous.endedAt - 0.000001);
      }
    });
  });

  it("visibly bounces receptor drugs that encounter an occupied site", () => {
    let rejectedAt: number | undefined;
    let rejectedLigandId: string | undefined;

    for (let time = 0; time <= frame.duration; time += 0.04) {
      const rejection = buildVisualSchedule(frame, time, {
        id: "agonist",
        strength: 1
      }).rejectedBindings.find((binding) => binding.target.kind === "receptor_orthosteric");

      if (rejection) {
        rejectedAt = rejection.encounterAt;
        rejectedLigandId = rejection.ligandId;
        break;
      }
    }

    expect(rejectedAt).toBeDefined();
    expect(rejectedLigandId).toBeDefined();

    const bouncedState = buildVisualState(frame, (rejectedAt ?? 0) + 0.16, 7, {
      id: "agonist",
      strength: 1
    });

    expect(
      bouncedState.molecules.some(
        (molecule) => molecule.ligandKind === "agonist" && molecule.phase === "rejected"
      )
    ).toBe(true);
    expect(bouncedState.dockedLigands.some((ligand) => ligand.id === rejectedLigandId)).toBe(false);
    expect(
      bouncedState.signalSustains.some((sustain) => sustain.id.startsWith(rejectedLigandId ?? ""))
    ).toBe(false);
  });

  it("keeps orthosteric receptor occupancy exclusive across ligands", () => {
    const configs: InterventionVisualConfig[] = [
      baselineConfig,
      { id: "reuptake_inhibitor", strength: 1 },
      { id: "releaser", strength: 1 },
      { id: "agonist", strength: 1 },
      { id: "antagonist", strength: 1 },
      { id: "pam", strength: 1 }
    ];

    configs.forEach((config) => {
      scanStates(frame, 12, config).forEach(({ state, time }) => {
        receptorSlots.forEach((slot) => {
          const orthostericLigands = state.dockedLigands.filter(
            (ligand) =>
              ligand.target.kind === "receptor_orthosteric" &&
              ligand.target.slotIndex === slot.slotIndex
          );

          expect(
            orthostericLigands.length,
            `${config.id} at ${time.toFixed(2)}s slot ${slot.slotIndex}: ${orthostericLigands
              .map((ligand) => ligand.id)
              .join(", ")}`
          ).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  it("resolves accepted binding intervals without overlaps per site", () => {
    const configs: InterventionVisualConfig[] = [
      { id: "reuptake_inhibitor", strength: 1 },
      { id: "releaser", strength: 1 },
      { id: "agonist", strength: 1 },
      { id: "antagonist", strength: 1 },
      { id: "pam", strength: 1 }
    ];

    configs.forEach((config) => {
      const schedule = buildVisualSchedule(frame, frame.duration, config);

      [...receptorSlots, ...transporterSlots].forEach((slot) => {
        ["receptor_orthosteric", "receptor_allosteric", "transporter"].forEach((kind) => {
          const bindings = schedule.acceptedBindings.filter(
            (binding) => binding.target.kind === kind && binding.target.slotIndex === slot.slotIndex
          );

          expectNoBindingOverlaps(bindings);
        });
      });
    });
  });

  it("antagonist occupancy blocks transmitter binding and creates no signal events itself", () => {
    const antagonistNoPulseNotes = countUniqueNotes(noPulseFrame, 7, {
      id: "antagonist",
      strength: 1
    });
    const baselinePulseNotes = countUniqueNotes(singleEventFrame, 12, baselineConfig);
    const antagonistPulseNotes = countUniqueNotes(singleEventFrame, 12, {
      id: "antagonist",
      strength: 1
    });

    expect(antagonistNoPulseNotes).toBe(0);
    expect(antagonistPulseNotes).toBeLessThanOrEqual(baselinePulseNotes);
    scanStates(noPulseFrame, 7, {
      id: "antagonist",
      strength: 1
    })
      .find(({ state }) => state.dockedLigands.some((ligand) => ligand.ligandKind === "antagonist"))
      ?.state.dockedLigands.filter((ligand) => ligand.ligandKind === "antagonist")
      .forEach((ligand) => {
        expect(ligand.target.kind).toBe("receptor_orthosteric");
      });
  });

  it("bounces transmitter away from antagonist-occupied receptors without receptor activation", () => {
    const scannedStates = scanStates(frame, 12, {
      id: "antagonist",
      strength: 1
    });
    const phasesById = collectTransmitterPhases(scannedStates);
    const noteIds = new Set(
      scannedStates.flatMap(({ state }) => state.signalNotes.map((note) => note.id))
    );
    const antagonistBounceId = Array.from(phasesById.entries()).find(([id, phases]) => {
      const hasNote = Array.from(noteIds).some((noteId) => noteId.startsWith(`${id}-lock-`));

      return (
        phases.has("drift_to_dendrite") &&
        phases.has("drift_to_axon") &&
        !phases.has("bound") &&
        !hasNote
      );
    })?.[0];
    const visibleAntagonistBounce = scannedStates.find(({ state }) =>
      state.molecules.some((molecule) => {
        if (molecule.id !== antagonistBounceId || molecule.phase !== "drift_to_axon") {
          return false;
        }

        return molecule.position.x > 520;
      })
    );

    expect(antagonistBounceId).toBeDefined();
    expect(visibleAntagonistBounce).toBeDefined();
  });

  it("PAM occupancy emits no signal events alone but amplifies transmitter-driven signal events", () => {
    const pamNoPulseNotes = countUniqueNotes(noPulseFrame, 7, {
      id: "pam",
      strength: 1
    });
    const pamNotes = scanStates(frame, 12, { id: "pam", strength: 1 }).flatMap(
      ({ state }) => state.signalNotes
    );

    expect(pamNoPulseNotes).toBe(0);
    expect(pamNotes.some((note) => note.intensity > 1)).toBe(true);
    scanStates(noPulseFrame, 7, { id: "pam", strength: 1 })
      .find(({ state }) => state.dockedLigands.some((ligand) => ligand.ligandKind === "pam"))
      ?.state.dockedLigands.filter((ligand) => ligand.ligandKind === "pam")
      .forEach((ligand) => {
        expect(ligand.target.kind).toBe("receptor_allosteric");
      });
  });

  it("keeps receptors inactive unless an activating ligand is bound", () => {
    const pamOnlyState = scanStates(noPulseFrame, 7, { id: "pam", strength: 1 }).find(({ state }) =>
      state.dockedLigands.some((ligand) => ligand.ligandKind === "pam")
    );
    const antagonistOnlyState = scanStates(noPulseFrame, 7, {
      id: "antagonist",
      strength: 1
    }).find(({ state }) =>
      state.dockedLigands.some((ligand) => ligand.ligandKind === "antagonist")
    );

    expect(pamOnlyState).toBeDefined();
    expect(antagonistOnlyState).toBeDefined();
    expect(pamOnlyState?.state.receptorOccupancies.every((occupancy) => !occupancy.active)).toBe(
      true
    );
    expect(
      antagonistOnlyState?.state.receptorOccupancies.every((occupancy) => !occupancy.active)
    ).toBe(true);
  });
});
