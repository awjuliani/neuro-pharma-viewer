import type { SimulationFrame } from "../simulation/types";
import {
  buildVisualState,
  synapseVisualTiming,
  type InterventionVisualConfig
} from "./synapseVisualModel";

export interface TimelineNote {
  elapsed: number;
  id: string;
  intensity: number;
  slotIndex: number;
}

export interface SignalTimelineOptions {
  sampleStepSeconds?: number;
  windowSeconds?: number;
}

export const signalTimelineDefaults = {
  sampleStepSeconds: 0.12,
  windowSeconds: 5.6
};

export const buildSignalTimeline = (
  frame: SimulationFrame,
  currentTime: number,
  moleculesPerPulse: number,
  config: InterventionVisualConfig,
  options: SignalTimelineOptions = {}
): TimelineNote[] => {
  const windowSeconds = options.windowSeconds ?? signalTimelineDefaults.windowSeconds;
  const sampleStepSeconds = options.sampleStepSeconds ?? signalTimelineDefaults.sampleStepSeconds;
  const notesById = new Map<string, TimelineNote>();

  for (let sampleOffset = 0; sampleOffset <= windowSeconds; sampleOffset += sampleStepSeconds) {
    const sampleTime = currentTime - sampleOffset;
    const state = buildVisualState(frame, sampleTime, moleculesPerPulse, config);

    state.signalNotes.forEach((note) => {
      const elapsed = sampleOffset + note.age;

      if (elapsed > windowSeconds + synapseVisualTiming.noteSeconds) {
        return;
      }

      const existing = notesById.get(note.id);
      if (!existing || elapsed < existing.elapsed) {
        notesById.set(note.id, {
          elapsed,
          id: note.id,
          intensity: note.intensity,
          slotIndex: note.slotIndex
        });
      }
    });
  }

  return Array.from(notesById.values())
    .filter((note) => note.elapsed <= windowSeconds)
    .sort((left, right) => right.elapsed - left.elapsed);
};
