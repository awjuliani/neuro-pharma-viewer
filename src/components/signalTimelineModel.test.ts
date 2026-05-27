import { describe, expect, it } from "vitest";
import { defaultParams, simulateTransmission } from "../simulation/model";
import type { SimulationFrame } from "../simulation/types";
import { buildSignalTimeline, signalTimelineDefaults } from "./signalTimelineModel";
import { receptorSlots, type InterventionVisualConfig } from "./synapseVisualModel";

const frame = simulateTransmission(defaultParams);
const baselineConfig: InterventionVisualConfig = { id: "baseline", strength: 0 };

const noPulseFrame: SimulationFrame = {
  ...frame,
  duration: 4,
  eventMarkers: []
};

describe("signal timeline model", () => {
  it("builds rolling staff markers from postsynaptic signal events", () => {
    const notes = buildSignalTimeline(frame, 3.2, 12, baselineConfig);

    expect(notes.length).toBeGreaterThan(0);
    notes.forEach((note) => {
      expect(note.elapsed).toBeGreaterThanOrEqual(0);
      expect(note.elapsed).toBeLessThanOrEqual(signalTimelineDefaults.windowSeconds);
      expect(note.slotIndex).toBeGreaterThanOrEqual(0);
      expect(note.slotIndex).toBeLessThan(receptorSlots.length);
    });
  });

  it("does not create timeline markers when no receptor binding can emit a signal", () => {
    const notes = buildSignalTimeline(noPulseFrame, 2.2, 12, baselineConfig);

    expect(notes).toHaveLength(0);
  });
});
