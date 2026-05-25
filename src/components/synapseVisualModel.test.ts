import { describe, expect, it } from "vitest";
import { defaultParams, simulateTransmission } from "../simulation/model";
import {
  buildVisualState,
  getMaoPosition,
  maoSlots,
  receptorSlots,
  synapseCenterY,
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

describe("synapse visual model", () => {
  it("defines five receptor slots, two transporter slots, and MAO clearing sites", () => {
    const state = buildVisualState(frame, 1, 7, baselineConfig);

    expect(receptorSlots).toHaveLength(5);
    expect(transporterSlots).toHaveLength(2);
    expect(maoSlots).toHaveLength(6);
    expect(state.receptorOccupancies).toHaveLength(5);
    expect(state.transporterOccupancies).toHaveLength(2);
    expect(state.maoOccupancies).toHaveLength(6);
  });

  it("floats MAO clearing sites over time", () => {
    const positions = [0.25, 2.25, 4.25, 6.25, 8.25].map((time) => getMaoPosition(1, time));
    const xRange = Math.max(...positions.map((position) => position.x)) - Math.min(...positions.map((position) => position.x));
    const yRange = Math.max(...positions.map((position) => position.y)) - Math.min(...positions.map((position) => position.y));

    expect(xRange).toBeGreaterThan(65);
    expect(yRange).toBeGreaterThan(8);
  });

  it("keeps MAO clearing sites in upper and lower cleft bands", () => {
    const sampleTimes = [0.5, 3, 6, 9.5];

    maoSlots.forEach((slot) => {
      sampleTimes.forEach((time) => {
        const position = getMaoPosition(slot.slotIndex, time);

        expect(position.x).toBeLessThan(710);
        if (slot.slotIndex < 3) {
          expect(position.y).toBeLessThan(synapseCenterY - 136);
        } else {
          expect(position.y).toBeGreaterThan(synapseCenterY + 136);
        }
      });
    });
  });

  it("produces transmitter notes only from active receptor captures", () => {
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

    expect(beforeRelease.molecules.filter((molecule) => molecule.ligandKind === "transmitter")).toHaveLength(0);
    expect(afterRelease.molecules.some((molecule) => molecule.ligandKind === "transmitter")).toBe(true);
  });

  it("allows transmitter to reach top and bottom receptors on the curved dendrite", () => {
    const activatedSlots = new Set(
      scanStates(frame, 30, baselineConfig).flatMap(({ state }) =>
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

  it("MAO enzymes bind free transmitter that misses receptors", () => {
    const scannedStates = scanStates(frame, 30, baselineConfig);
    const maoState = scannedStates.find(({ state }) =>
      state.maoOccupancies.some((occupancy) => occupancy.degrading)
    );
    const capturedMaoSlots = new Set(
      scannedStates.flatMap(({ state }) =>
        state.dockedLigands
          .filter((ligand) => ligand.target.kind === "mao" && ligand.ligandKind === "transmitter")
          .map((ligand) => ligand.target.slotIndex)
      )
    );

    expect(maoState).toBeDefined();
    expect(
      maoState?.state.dockedLigands.some(
        (ligand) => ligand.target.kind === "mao" && ligand.ligandKind === "transmitter"
      )
    ).toBe(true);
    expect(
      [...capturedMaoSlots].some((slotIndex) => slotIndex === 0 || slotIndex === 1 || slotIndex === 3 || slotIndex === 4)
    ).toBe(true);
  });

  it("inhibitor molecules occupy transporter sites and block those sites from absorbing", () => {
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

  it("MAOI occupancy blocks MAO sites from degrading transmitter while occupied", () => {
    const maoiState = scanStates(singleEventFrame, 18, {
      id: "maoi",
      strength: 1
    }).find(({ state }) =>
      state.maoOccupancies.some((occupancy) => occupancy.ligand?.ligandKind === "maoi")
    );

    expect(maoiState).toBeDefined();
    maoiState?.state.maoOccupancies
      .filter((occupancy) => occupancy.ligand?.ligandKind === "maoi")
      .forEach((occupancy) => {
        expect(occupancy.degrading).toBe(false);
      });
    maoiState?.state.dockedLigands
      .filter((ligand) => ligand.ligandKind === "maoi")
      .forEach((ligand) => {
        expect(ligand.target.kind).toBe("mao");
      });
  });

  it("releaser leaks can activate receptors near the top and bottom transporter paths", () => {
    const activatedSlots = new Set(
      scanStates(noPulseFrame, 7, {
        id: "releaser",
        strength: 1
      }).flatMap(({ state }) => state.signalNotes.map((note) => note.slotIndex))
    );

    expect(activatedSlots.has(0)).toBe(true);
    expect(activatedSlots.has(Math.floor(receptorSlots.length / 2))).toBe(true);
    expect(activatedSlots.has(receptorSlots.length - 1)).toBe(true);
  });

  it("agonist binding activates receptors and produces notes without pulse events", () => {
    const agonistNotes = countUniqueNotes(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    });
    const agonistState = scanStates(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    }).find(({ state }) => state.dockedLigands.some((ligand) => ligand.ligandKind === "agonist"));

    expect(agonistNotes).toBeGreaterThan(0);
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
    const drugKinds = [
      "reuptake_inhibitor",
      "releaser",
      "maoi",
      "agonist",
      "antagonist",
      "pam"
    ] as const;

    drugKinds.forEach((id) => {
      const state = buildVisualState(noPulseFrame, 1.2, 7, { id, strength: 1 });
      const drugMolecules = state.molecules.filter((molecule) => molecule.ligandKind === id);

      expect(drugMolecules.length).toBeGreaterThan(0);
      expect(drugMolecules.every((molecule) => molecule.shape === "rounded_diamond")).toBe(true);
    });
  });

  it("agonist occupancy continues emitting notes while the receptor remains bound", () => {
    const lateAgonistState = scanStates(noPulseFrame, 7, {
      id: "agonist",
      strength: 1
    }).find(({ state }) => {
      const lateBoundSlot = state.dockedLigands.find(
        (ligand) => ligand.ligandKind === "agonist" && ligand.age > synapseVisualTiming.noteSeconds
      )?.target.slotIndex;

      return (
        lateBoundSlot !== undefined &&
        state.receptorOccupancies[lateBoundSlot].active &&
        state.signalNotes.some((note) => note.slotIndex === lateBoundSlot)
      );
    });

    expect(lateAgonistState).toBeDefined();
  });

  it("antagonist occupancy blocks transmitter locks and creates no notes itself", () => {
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
    expect(antagonistPulseNotes).toBeLessThan(baselinePulseNotes);
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

  it("PAM occupancy emits no notes alone but amplifies transmitter-driven notes", () => {
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
    const pamOnlyState = scanStates(noPulseFrame, 7, { id: "pam", strength: 1 }).find(
      ({ state }) => state.dockedLigands.some((ligand) => ligand.ligandKind === "pam")
    );
    const antagonistOnlyState = scanStates(noPulseFrame, 7, {
      id: "antagonist",
      strength: 1
    }).find(({ state }) =>
      state.dockedLigands.some((ligand) => ligand.ligandKind === "antagonist")
    );

    expect(pamOnlyState).toBeDefined();
    expect(antagonistOnlyState).toBeDefined();
    expect(pamOnlyState?.state.receptorOccupancies.every((occupancy) => !occupancy.active)).toBe(true);
    expect(antagonistOnlyState?.state.receptorOccupancies.every((occupancy) => !occupancy.active)).toBe(true);
  });
});
