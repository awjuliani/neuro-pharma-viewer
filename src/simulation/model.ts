import type { SimulationFrame, SimulationParams } from "./types";

export const defaultParams: SimulationParams = {
  drugStrength: 0.5,
  pulseRate: 0.6,
  moleculesPerPulse: 6
};

export function simulateTransmission(
  params: SimulationParams,
  duration = 12,
  dt = 0.04
): SimulationFrame {
  const eventMarkers: number[] = [];
  const pulsePeriod = 1 / Math.max(0.15, params.pulseRate);
  let nextPulse = 0.86;

  for (let step = 0; step <= Math.round(duration / dt); step += 1) {
    const time = step * dt;

    if (time + dt / 2 >= nextPulse) {
      eventMarkers.push(nextPulse);
      nextPulse += pulsePeriod;
    }
  }

  return {
    duration,
    dt,
    eventMarkers
  };
}
