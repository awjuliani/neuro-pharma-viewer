import { describe, expect, it } from "vitest";
import { defaultParams, simulateTransmission } from "./model";

describe("transmission pulse schedule", () => {
  it("creates deterministic presynaptic pulse markers", () => {
    const frame = simulateTransmission(defaultParams, 4);

    expect(frame.eventMarkers[0]).toBeCloseTo(0.86);
    expect(frame.eventMarkers.length).toBeGreaterThan(2);
  });

  it("uses pulse rate as the only timing control", () => {
    const slow = simulateTransmission({ ...defaultParams, pulseRate: 0.5 }, 4);
    const fast = simulateTransmission({ ...defaultParams, pulseRate: 1.5 }, 4);

    expect(fast.eventMarkers.length).toBeGreaterThan(slow.eventMarkers.length);
  });
});
