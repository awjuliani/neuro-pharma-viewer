import { describe, expect, it } from "vitest";
import { defaultParams, simulateTransmission } from "../simulation/model";
import {
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
  it("defines five receptor slots and two transporter slots", () => {
    const state = buildVisualState(frame, 1, 7, baselineConfig);

    expect(receptorSlots).toHaveLength(5);
    expect(transporterSlots).toHaveLength(2);
    expect(state.receptorOccupancies).toHaveLength(5);
    expect(state.transporterOccupancies).toHaveLength(2);
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

    expect(agonistNotes).toBeGreaterThan(0);
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
