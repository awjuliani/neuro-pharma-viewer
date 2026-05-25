import type { InterventionId, SimulationFrame } from "../simulation/types";

export interface Point {
  x: number;
  y: number;
}

export type LigandKind =
  | "transmitter"
  | "reuptake_inhibitor"
  | "releaser"
  | "agonist"
  | "antagonist"
  | "pam";

export type BindingSiteKind = "receptor_orthosteric" | "receptor_allosteric" | "transporter";

type LigandSource = "ambient" | "leak" | "pulse";

export type MoleculeOrigin = "ambient_drug" | "leak" | "pulse";
export type MoleculePhase =
  | "absorbing"
  | "bound"
  | "docking"
  | "drift_to_axon"
  | "drift_to_dendrite"
  | "internalizing"
  | "rejected"
  | "removed";

export interface BindingTarget {
  kind: BindingSiteKind;
  slotIndex: number;
}

interface LigandEvent {
  count: number;
  ligandKind: LigandKind;
  marker: number;
  source: LigandSource;
}

export interface LigandDescriptor {
  age: number;
  capture: CaptureCandidate | null;
  emittedAt?: number;
  id: string;
  index: number;
  ligandKind: LigandKind;
  marker: number;
  source: LigandSource;
  target?: BindingTarget;
}

export interface CaptureCandidate {
  age: number;
  mode?: "antagonist_rebound";
  position: Point;
  target: BindingTarget;
}

export interface DockedLigand {
  age: number;
  alpha: number;
  id: string;
  ligandKind: LigandKind;
  position: Point;
  target: BindingTarget;
}

export interface ReceptorOccupancy {
  active: boolean;
  allosteric?: DockedLigand;
  noteIntensity: number;
  orthosteric?: DockedLigand;
  slotIndex: number;
}

export interface TransporterOccupancy {
  activation: number;
  absorbing: boolean;
  leaking: boolean;
  ligand?: DockedLigand;
  slotIndex: number;
}

export interface VisualMolecule {
  alpha: number;
  color: string;
  id: string;
  ligandKind: LigandKind;
  origin: MoleculeOrigin;
  phase: MoleculePhase;
  position: Point;
  pull: number;
  radius: number;
  shape: "circle" | "rounded_diamond";
}

export interface SignalNote {
  age: number;
  alpha: number;
  emittedAt: number;
  endedAt: number;
  id: string;
  intensity: number;
  position: Point;
  scale: number;
  slotIndex: number;
}

export interface SignalSustain {
  age: number;
  alpha: number;
  duration: number;
  endedAt: number;
  id: string;
  intensity: number;
  slotIndex: number;
  startedAt: number;
}

export interface InterventionVisualConfig {
  id: InterventionId;
  strength: number;
}

export interface VisualState {
  dockedLigands: DockedLigand[];
  molecules: VisualMolecule[];
  receptorOccupancies: ReceptorOccupancy[];
  signalNotes: SignalNote[];
  signalSustains: SignalSustain[];
  transporterOccupancies: TransporterOccupancy[];
}

export interface ScheduledLigandDescriptor extends LigandDescriptor {
  emittedAt: number;
  occurrenceIndex: number;
}

export interface AcceptedBindingEvent {
  boundEndAt: number;
  boundStartAt: number;
  capture: CaptureCandidate;
  descriptorKey: string;
  dockStartAt: number;
  encounterAt: number;
  id: string;
  ligandId: string;
  ligandKind: LigandKind;
  status: "accepted";
  target: BindingTarget;
}

export interface RejectedBindingEvent {
  capture: CaptureCandidate;
  descriptorKey: string;
  dockStartAt: number;
  encounterAt: number;
  id: string;
  ligandId: string;
  ligandKind: LigandKind;
  reason: "occupied";
  status: "rejected";
  target: BindingTarget;
}

export interface VisualSchedule {
  acceptedBindings: AcceptedBindingEvent[];
  currentTime: number;
  drugDescriptors: ScheduledLigandDescriptor[];
  rejectedBindings: RejectedBindingEvent[];
}

export const synapseCenterY = 280;
export const boutonCenter = { x: 74, y: synapseCenterY };
export const boutonRadius = 174;
export const dendriteCenter = { x: 886, y: synapseCenterY };
export const dendriteRadius = 174;
const axonReleaseSite = { x: boutonCenter.x + boutonRadius + 4, y: synapseCenterY };

export const receptorSlots = [Math.PI + 0.72, Math.PI + 0.36, Math.PI, Math.PI - 0.36, Math.PI - 0.72].map(
  (angle, slotIndex) => {
    const x = dendriteCenter.x + Math.cos(angle) * dendriteRadius;
    const y = dendriteCenter.y + Math.sin(angle) * dendriteRadius;
    const inwardNormal = normalize({ x: dendriteCenter.x - x, y: dendriteCenter.y - y });
    const tangent = { x: -inwardNormal.y, y: inwardNormal.x };

    return {
      allosteric: {
        x: x + inwardNormal.x * 34 + tangent.x * 22,
        y: y + inwardNormal.y * 34 + tangent.y * 22
      },
      inwardNormal,
      orthosteric: { x, y },
      rotation: ((angle - Math.PI) * 180) / Math.PI,
      slotIndex,
      tangent,
      x,
      y
    };
  }
);

export const transporterSlots = [-44, 44].map((rotation, slotIndex) => {
  const radians = (rotation * Math.PI) / 180;
  return {
    rotation,
    slotIndex,
    x: boutonCenter.x + Math.cos(radians) * boutonRadius,
    y: boutonCenter.y + Math.sin(radians) * boutonRadius
  };
});

const cyclicNoise = (seed: number, time: number, steps = 9, period = 12) => {
  const wrapped = ((time % period) + period) % period;
  const stepLength = period / steps;
  const index = Math.floor(wrapped / stepLength);
  const progress = (wrapped - index * stepLength) / stepLength;
  const eased = progress * progress * (3 - 2 * progress);
  const current = seeded(seed + index * 131) * 2 - 1;
  const next = seeded(seed + ((index + 1) % steps) * 131) * 2 - 1;

  return lerp(current, next, eased);
};

export const visualPalette = {
  anatomy: {
    axonFill: "#f7f9fa",
    axonStroke: "#dfe3e6",
    dendriteFill: "#f7f9f8",
    dendriteStroke: "#dce3e1"
  },
  receptor: {
    active: "#2d9df0",
    antagonistBound: "#7a2447",
    antagonistFill: "#efd6df",
    fill: "#d9f0ff",
    inactive: "#2478a6",
    note: "#2d9df0",
    pamActive: "#20d6c7",
    pamFill: "#d7fffb"
  },
  transporter: {
    active: "#f07a45",
    base: "#be6649"
  },
  ligands: {
    agonist: "#2d9df0",
    antagonist: "#b34a6b",
    pam: "#4c8f38",
    releaser: "#d56b2e",
    reuptake_inhibitor: "#8c514f",
    transmitter: "#2478a6"
  }
} satisfies {
  anatomy: Record<"axonFill" | "axonStroke" | "dendriteFill" | "dendriteStroke", string>;
  receptor: Record<
    "active" | "antagonistBound" | "antagonistFill" | "fill" | "inactive" | "note" | "pamActive" | "pamFill",
    string
  >;
  transporter: Record<"active" | "base", string>;
  ligands: Record<LigandKind, string>;
};
export const interventionAccentColors = {
  baseline: visualPalette.receptor.inactive,
  reuptake_inhibitor: visualPalette.ligands.reuptake_inhibitor,
  releaser: visualPalette.ligands.releaser,
  agonist: visualPalette.ligands.agonist,
  antagonist: visualPalette.ligands.antagonist,
  pam: visualPalette.ligands.pam
} satisfies Record<InterventionId, string>;
export const activeReceptorColor = visualPalette.receptor.active;
export const activeReceptorFill = visualPalette.receptor.fill;
export const antagonistBoundReceptorColor = visualPalette.receptor.antagonistBound;
export const antagonistBoundReceptorFill = visualPalette.receptor.antagonistFill;
export const inactiveReceptorColor = visualPalette.receptor.inactive;
export const pamEnhancedReceptorColor = visualPalette.receptor.pamActive;
export const pamEnhancedReceptorFill = visualPalette.receptor.pamFill;
export const reuptakeBaseColor = visualPalette.transporter.base;
export const reuptakeActiveColor = visualPalette.transporter.active;
export const ligandColors = visualPalette.ligands;
export const synapseVisualTiming = {
  boundSeconds: 0.5,
  dockSeconds: 0.34,
  drugBoundSeconds: 1,
  noteSeconds: 1.24,
  releaseDelaySeconds: 0.34,
  rejectedDrugBounceSeconds: 0.78,
  reuptakeFlashSeconds: 0.32,
  transporterInternalizeSeconds: 0.46,
  visibleSeconds: 3.1
};

const captureRadius = 23;
const drugCaptureRadius = 33;
const transporterCaptureRadius = 78;
const transmitterActiveSeconds = synapseVisualTiming.dockSeconds + synapseVisualTiming.boundSeconds;
const transmitterHistorySeconds =
  synapseVisualTiming.visibleSeconds + transmitterActiveSeconds + synapseVisualTiming.visibleSeconds;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress;

function normalize(point: Point): Point {
  const length = Math.hypot(point.x, point.y) || 1;
  return { x: point.x / length, y: point.y / length };
}

const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const easeOutCubic = (value: number) => {
  const clamped = clamp(value);
  return 1 - (1 - clamped) ** 3;
};

const getDendriteMembraneXAtY = (y: number) => {
  const dy = y - dendriteCenter.y;

  if (Math.abs(dy) >= dendriteRadius) {
    return dendriteCenter.x;
  }

  return dendriteCenter.x - Math.sqrt(Math.max(0, dendriteRadius ** 2 - dy ** 2));
};

const getRepeatingEventAge = (currentTime: number, marker: number, duration: number) => {
  if (currentTime < marker) {
    return Number.POSITIVE_INFINITY;
  }

  return (currentTime - marker) % duration;
};

const getTargetPoint = (target: BindingTarget) => {
  if (target.kind === "transporter") {
    return transporterSlots[target.slotIndex];
  }

  const receptor = receptorSlots[target.slotIndex];
  return target.kind === "receptor_allosteric" ? receptor.allosteric : receptor.orthosteric;
};

const getCapturePoint = (target: BindingTarget) => {
  if (target.kind === "receptor_allosteric") {
    return receptorSlots[target.slotIndex].orthosteric;
  }

  return getTargetPoint(target);
};

const getPulseEvents = (
  frame: SimulationFrame,
  currentTime: number,
  moleculeCount: number,
  historySeconds = synapseVisualTiming.visibleSeconds
): LigandEvent[] =>
  frame.eventMarkers
    .map((marker) => {
      const releaseMarker = marker + synapseVisualTiming.releaseDelaySeconds;

      return {
        count: moleculeCount,
        ligandKind: "transmitter" as const,
        marker: releaseMarker,
        source: "pulse" as const
      };
    })
    .filter((event) => getRepeatingEventAge(currentTime, event.marker, frame.duration) <= historySeconds);

interface TimedLigandEvent extends LigandEvent {
  emittedAt: number;
  occurrenceIndex: number;
}

const getAmbientDrugEventsInWindow = (
  frame: SimulationFrame,
  currentTime: number,
  config: InterventionVisualConfig,
  historySeconds: number
): TimedLigandEvent[] => {
  if (config.id === "baseline" || config.strength <= 0) {
    return [];
  }

  const ligandKind = config.id;
  const period = lerp(1.28, 0.247, clamp(config.strength));
  const count = Math.max(1, Math.round(1 + config.strength * 2));
  const events: TimedLigandEvent[] = [];
  const windowStart = Math.max(0, currentTime - historySeconds);
  const safeDuration = Math.max(0.001, frame.duration);

  for (let marker = 0.18; marker < frame.duration; marker += period) {
    const firstOccurrence = Math.max(0, Math.ceil((windowStart - marker) / safeDuration));
    const lastOccurrence = Math.floor((currentTime - marker) / safeDuration);

    for (let occurrenceIndex = firstOccurrence; occurrenceIndex <= lastOccurrence; occurrenceIndex += 1) {
      const emittedAt = marker + occurrenceIndex * safeDuration;
      if (emittedAt >= windowStart - 0.000001 && emittedAt <= currentTime + 0.000001) {
        events.push({
          count,
          emittedAt,
          ligandKind,
          marker,
          occurrenceIndex,
          source: "ambient"
        });
      }
    }
  }

  return events.sort((left, right) => left.emittedAt - right.emittedAt || left.marker - right.marker);
};

const getPulseTransmitterPosition = (index: number, marker: number, age: number): Point => {
  const seed = Math.round(marker * 1000) + index * 47;
  const startX = axonReleaseSite.x - 8 + seeded(seed + 1) * 9;
  const startY = axonReleaseSite.y + (seeded(seed + 2) - 0.5) * 170;
  const velocityX = 220 + seeded(seed + 3) * 110;
  const velocityY = (seeded(seed + 4) - 0.5) * 260;
  const diffusion = 14 + seeded(seed + 5) * 22;
  const phaseA = seeded(seed + 6) * Math.PI * 2;
  const phaseB = seeded(seed + 7) * Math.PI * 2;
  const diffusionScale = Math.sqrt(Math.max(0, age));

  return {
    x: startX + velocityX * age + Math.sin(age * 5.1 + phaseA) * diffusion * 0.45,
    y:
      startY +
      velocityY * age +
      Math.sin(age * 4.2 + phaseA) * diffusion * 1.12 * diffusionScale +
      Math.sin(age * 10.8 + phaseB) * diffusion * 0.44 * diffusionScale
  };
};

const getLeakTransmitterPosition = (
  index: number,
  marker: number,
  age: number,
  transporterSlotIndex: number
): Point => {
  const slot = transporterSlots[transporterSlotIndex];
  const seed = Math.round(marker * 1000) + index * 61 + transporterSlotIndex * 503 + 19007;
  const startX = slot.x + 10 + seeded(seed + 1) * 7;
  const startY = slot.y + (seeded(seed + 2) - 0.5) * 34;
  const velocityX = 208 + seeded(seed + 3) * 84;
  const velocityY = (seeded(seed + 4) - 0.5) * 116;
  const diffusion = 14 + seeded(seed + 5) * 20;
  const phaseA = seeded(seed + 6) * Math.PI * 2;
  const phaseB = seeded(seed + 7) * Math.PI * 2;
  const phaseC = seeded(seed + 8) * Math.PI * 2;
  const diffusionScale = Math.sqrt(Math.max(0, age));

  return {
    x: startX + velocityX * age + Math.sin(age * 4.8 + phaseA) * diffusion * 0.55,
    y:
      startY +
      velocityY * age +
      Math.sin(age * 4.7 + phaseA) * diffusion * 1.08 * diffusionScale +
      Math.sin(age * 10.1 + phaseB) * diffusion * 0.32 * diffusionScale +
      Math.sin(age * 2.15 + phaseC) * diffusion * 0.5 * age
  };
};

const getReturningTransmitterPosition = (
  index: number,
  marker: number,
  age: number,
  receptorSlotIndex: number
): Point => {
  const receptor = receptorSlots[receptorSlotIndex];
  const seed = Math.round(marker * 1000) + index * 73 + receptorSlotIndex * 613 + 27011;
  const targetTransporter =
    receptorSlotIndex < Math.floor(receptorSlots.length / 2)
      ? transporterSlots[0]
      : receptorSlotIndex > Math.floor(receptorSlots.length / 2)
        ? transporterSlots[1]
        : transporterSlots[seeded(seed + 1) < 0.5 ? 0 : 1];
  const diffusionScale = Math.sqrt(Math.max(0, age));
  const phaseA = seeded(seed + 2) * Math.PI * 2;
  const phaseB = seeded(seed + 3) * Math.PI * 2;
  const startX = receptor.x - 6;
  const startY = receptor.y;
  const targetY = targetTransporter.y + (seeded(seed + 4) - 0.5) * 52;
  const velocityX = -(212 + seeded(seed + 5) * 92);
  const velocityY = clamp((targetY - startY) / 2.1, -118, 118);

  return {
    x:
      startX +
      velocityX * age +
      Math.sin(age * 4.3 + phaseA) * 15 * diffusionScale,
    y:
      startY +
      velocityY * age +
      Math.sin(age * 3.6 + phaseA) * 22 * diffusionScale +
      Math.sin(age * 9.1 + phaseB) * 8 * diffusionScale
  };
};

const getAntagonistBouncedTransmitterPosition = (
  index: number,
  marker: number,
  age: number,
  receptorSlotIndex: number,
  startPosition: Point
): Point => {
  const seed = Math.round(marker * 1000) + index * 89 + receptorSlotIndex * 641 + 29023;
  const targetTransporter =
    receptorSlotIndex < Math.floor(receptorSlots.length / 2)
      ? transporterSlots[0]
      : receptorSlotIndex > Math.floor(receptorSlots.length / 2)
        ? transporterSlots[1]
        : transporterSlots[seeded(seed + 1) < 0.5 ? 0 : 1];
  const diffusionScale = Math.sqrt(Math.max(0, age));
  const phaseA = seeded(seed + 2) * Math.PI * 2;
  const phaseB = seeded(seed + 3) * Math.PI * 2;
  const targetY = targetTransporter.y + (seeded(seed + 4) - 0.5) * 52;
  const velocityX = -(212 + seeded(seed + 5) * 92);
  const velocityY = clamp((targetY - startPosition.y) / 2.1, -118, 118);

  return {
    x:
      startPosition.x +
      velocityX * age +
      Math.sin(age * 4.3 + phaseA) * 15 * diffusionScale,
    y:
      startPosition.y +
      velocityY * age +
      Math.sin(age * 3.6 + phaseA) * 22 * diffusionScale +
      Math.sin(age * 9.1 + phaseB) * 8 * diffusionScale
  };
};

const getBouncedTransmitterPosition = (
  index: number,
  marker: number,
  age: number,
  transporterSlotIndex: number,
  startPosition: Point
): Point => {
  const seed = Math.round(marker * 1000) + index * 83 + transporterSlotIndex * 727 + 31013;
  const diffusionScale = Math.sqrt(Math.max(0, age));
  const phaseA = seeded(seed + 1) * Math.PI * 2;
  const phaseB = seeded(seed + 2) * Math.PI * 2;
  const startX = startPosition.x;
  const startY = startPosition.y;
  const velocityX = 238 + seeded(seed + 4) * 88;
  const receptorBand =
    transporterSlotIndex === 0
      ? receptorSlots[Math.floor(seeded(seed + 5) * 3)]
      : receptorSlots[2 + Math.floor(seeded(seed + 5) * 3)];
  const velocityY = (receptorBand.y - startY) / 2.15 + (seeded(seed + 6) - 0.5) * 52;

  return {
    x:
      startX +
      velocityX * age +
      Math.sin(age * 4.8 + phaseA) * 16 * diffusionScale,
    y:
      startY +
      velocityY * age +
      Math.sin(age * 3.9 + phaseA) * 24 * diffusionScale +
      Math.sin(age * 9.8 + phaseB) * 8 * diffusionScale
  };
};

const getDrugPosition = (
  descriptor: Pick<LigandDescriptor, "index" | "ligandKind" | "marker">,
  age: number
): Point => {
  const seed = Math.round(descriptor.marker * 1000) + descriptor.index * 79 + descriptor.ligandKind.length * 997;
  const entryEdge = Math.floor(seeded(seed + 1) * 4);
  const diffusionScale = Math.sqrt(Math.max(0, age));
  const entersFromTop = entryEdge === 0;
  const entersFromBottom = entryEdge === 1;
  const entersFromLeft = entryEdge === 2;
  const startX =
    entersFromTop || entersFromBottom
      ? 104 + seeded(seed + 2) * 752
      : entersFromLeft
        ? -34
        : 994;
  const startY =
    entersFromTop
      ? -30
      : entersFromBottom
        ? 590
        : synapseCenterY - 168 + seeded(seed + 5) * 336;
  const velocityX =
    entersFromTop || entersFromBottom
      ? (seeded(seed + 3) - 0.5) * 48
      : (entersFromLeft ? 1 : -1) * (122 + seeded(seed + 3) * 46);
  const velocityY =
    entersFromTop || entersFromBottom
      ? (entersFromTop ? 1 : -1) * (106 + seeded(seed + 4) * 34)
      : (seeded(seed + 4) - 0.5) * 54;
  const wanderX = 54;
  const wanderY = 42;
  const slowWanderX = cyclicNoise(seed + 11, age, 8, 5.4) * wanderX * diffusionScale;
  const slowWanderY = cyclicNoise(seed + 23, age, 8, 5.4) * wanderY * diffusionScale;
  const fineWanderX = Math.sin(age * 1.65 + seeded(seed + 17) * Math.PI * 2) * 9 * diffusionScale;
  const fineWanderY = Math.sin(age * 1.42 + seeded(seed + 29) * Math.PI * 2) * 8 * diffusionScale;

  return {
    x: startX + velocityX * age + slowWanderX + fineWanderX,
    y: startY + velocityY * age + slowWanderY + fineWanderY
  };
};

const getLigandPosition = (descriptor: LigandDescriptor, age: number): Point => {
  if (descriptor.ligandKind !== "transmitter") {
    return getDrugPosition(descriptor, age);
  }

  if (descriptor.source === "leak" && descriptor.target?.kind === "transporter") {
    return getLeakTransmitterPosition(descriptor.index, descriptor.marker, age, descriptor.target.slotIndex);
  }

  return getPulseTransmitterPosition(descriptor.index, descriptor.marker, age);
};

const getCompatibleDrugTargetKinds = (ligandKind: LigandKind): BindingSiteKind[] => {
  if (ligandKind === "reuptake_inhibitor" || ligandKind === "releaser") {
    return ["transporter"];
  }

  if (ligandKind === "pam") {
    return ["receptor_allosteric"];
  }

  if (ligandKind === "agonist" || ligandKind === "antagonist") {
    return ["receptor_orthosteric"];
  }

  return [];
};

const getCompatibleDrugTargets = (ligandKind: LigandKind): BindingTarget[] => {
  const targets: BindingTarget[] = [];

  getCompatibleDrugTargetKinds(ligandKind).forEach((kind) => {
    if (kind === "transporter") {
      transporterSlots.forEach((slot) => targets.push({ kind, slotIndex: slot.slotIndex }));
      return;
    }

    receptorSlots.forEach((slot) => targets.push({ kind, slotIndex: slot.slotIndex }));
  });

  return targets;
};

const drugCaptureCache = new Map<string, CaptureCandidate | null>();

const findDrugCapture = (descriptor: LigandDescriptor): CaptureCandidate | null => {
  const cacheKey = `${descriptor.ligandKind}:${descriptor.marker.toFixed(3)}:${descriptor.index}`;
  if (drugCaptureCache.has(cacheKey)) {
    return drugCaptureCache.get(cacheKey) ?? null;
  }

  const compatibleTargets = getCompatibleDrugTargets(descriptor.ligandKind);

  if (compatibleTargets.length === 0) {
    drugCaptureCache.set(cacheKey, null);
    return null;
  }

  for (let age = 0.04; age <= synapseVisualTiming.visibleSeconds; age += 0.025) {
    const position = getLigandPosition(descriptor, age);
    const capture = compatibleTargets
      .map((target) => ({
        distance: Math.hypot(position.x - getCapturePoint(target).x, position.y - getCapturePoint(target).y),
        target
      }))
      .filter((candidate) => candidate.distance < drugCaptureRadius)
      .sort((left, right) => left.distance - right.distance)[0];

    if (capture) {
      const result = {
        age,
        position,
        target: capture.target
      };
      drugCaptureCache.set(cacheKey, result);
      return result;
    }
  }

  drugCaptureCache.set(cacheKey, null);
  return null;
};

const findTransmitterCapture = (
  descriptor: LigandDescriptor,
  blockedReceptorSlots: Set<number>,
  blockedTransporterSlots: Set<number>,
  historicalReceptorBlockers?: {
    assignments: Map<string, CaptureCandidate>;
    descriptors: LigandDescriptor[];
  },
  historicalTransporterBlockers?: {
    assignments: Map<string, CaptureCandidate>;
    descriptors: LigandDescriptor[];
  }
): CaptureCandidate | null => {
  for (let age = 0.04; age <= synapseVisualTiming.visibleSeconds; age += 0.025) {
    const position = getLigandPosition(descriptor, age);
    const secondsAgo = descriptor.age - age;
    const historicallyBlockedReceptorSlots = historicalReceptorBlockers
      ? getHistoricalOccupiedSlots(
          historicalReceptorBlockers.descriptors,
          historicalReceptorBlockers.assignments,
          secondsAgo
        )
      : blockedReceptorSlots;
    const historicallyAntagonistSlots = historicalReceptorBlockers
      ? getHistoricalOccupiedSlots(
          historicalReceptorBlockers.descriptors,
          historicalReceptorBlockers.assignments,
          secondsAgo,
          (blockingDescriptor) => blockingDescriptor.ligandKind === "antagonist"
        )
      : new Set<number>();
    const historicallyBlockedTransporterSlots = historicalTransporterBlockers
      ? getHistoricalTransporterState(
          historicalTransporterBlockers.descriptors,
          historicalTransporterBlockers.assignments,
          secondsAgo
        ).occupiedSlots
      : blockedTransporterSlots;

    const antagonistSlotIndex = receptorSlots.findIndex(
      (slot) =>
        historicallyAntagonistSlots.has(slot.slotIndex) &&
        Math.hypot(position.x - slot.x, position.y - slot.y) < captureRadius
    );

    if (antagonistSlotIndex !== -1) {
      return {
        age,
        mode: "antagonist_rebound",
        position,
        target: { kind: "receptor_orthosteric", slotIndex: antagonistSlotIndex }
      };
    }

    const slotIndex = receptorSlots.findIndex(
      (slot) =>
        !historicallyBlockedReceptorSlots.has(slot.slotIndex) &&
        Math.hypot(position.x - slot.x, position.y - slot.y) < captureRadius
    );

    if (slotIndex !== -1) {
      return {
        age,
        position,
        target: { kind: "receptor_orthosteric", slotIndex }
      };
    }

    if (position.x > axonReleaseSite.x + 42) {
      continue;
    }

    if (descriptor.source === "leak" && age < 0.52) {
      continue;
    }

    const transporterSlotIndex = transporterSlots.findIndex(
      (slot) =>
        !historicallyBlockedTransporterSlots.has(slot.slotIndex) &&
        Math.hypot(position.x - slot.x, position.y - slot.y) < transporterCaptureRadius
    );

    if (transporterSlotIndex !== -1) {
      return {
        age,
        position,
        target: { kind: "transporter", slotIndex: transporterSlotIndex }
      };
    }
  }

  return null;
};

function getHistoricalOccupiedSlots(
  descriptors: LigandDescriptor[],
  historicalAssignments: Map<string, CaptureCandidate>,
  secondsAgo: number,
  includeDescriptor: (descriptor: LigandDescriptor) => boolean = () => true
) {
  const occupiedSlots = new Set<number>();

  descriptors.forEach((descriptor) => {
    const capture = historicalAssignments.get(descriptor.id);

    if (!capture || !includeDescriptor(descriptor)) {
      return;
    }

    const ageAtTime = descriptor.age - secondsAgo;
    const unboundAtAge = capture.age + getActiveSeconds(descriptor);

    if (ageAtTime >= capture.age && ageAtTime <= unboundAtAge) {
      occupiedSlots.add(capture.target.slotIndex);
    }
  });

  return occupiedSlots;
}

interface HistoricalReceptorBlockers {
  assignments: Map<string, CaptureCandidate>;
  descriptors: LigandDescriptor[];
}

const getHistoricalTransporterState = (
  transporterDrugDescriptors: LigandDescriptor[],
  historicalTransporterAssignments: Map<string, CaptureCandidate>,
  secondsAgo: number
) => {
  const inhibitedSlots = new Set<number>();
  const occupiedSlots = new Set<number>();
  const reversedSlots = new Set<number>();

  transporterDrugDescriptors.forEach((descriptor) => {
    const capture = historicalTransporterAssignments.get(descriptor.id);

    if (!capture || capture.target.kind !== "transporter") {
      return;
    }

    const ageAtTime = descriptor.age - secondsAgo;
    const dockedAtAge = capture.age + synapseVisualTiming.dockSeconds;
    const unboundAtAge = capture.age + getActiveSeconds(descriptor);

    if (ageAtTime >= dockedAtAge && ageAtTime <= unboundAtAge) {
      occupiedSlots.add(capture.target.slotIndex);
      if (descriptor.ligandKind === "reuptake_inhibitor") {
        inhibitedSlots.add(capture.target.slotIndex);
      }
      if (descriptor.ligandKind === "releaser") {
        reversedSlots.add(capture.target.slotIndex);
      }
    }
  });

  return { inhibitedSlots, occupiedSlots, reversedSlots };
};

interface TransporterEncounter {
  capture: CaptureCandidate;
  mode: "open" | "rebound";
}

const findReturningTransporterEncounter = (
  descriptor: LigandDescriptor,
  receptorCapture: CaptureCandidate,
  maxReturnAge: number,
  transporterDrugDescriptors: LigandDescriptor[],
  historicalTransporterAssignments: Map<string, CaptureCandidate>
): TransporterEncounter | null => {
  const unboundAtAge = receptorCapture.age + transmitterActiveSeconds;

  for (let age = 0.04; age <= Math.min(maxReturnAge, synapseVisualTiming.visibleSeconds); age += 0.025) {
    const position = getReturningTransmitterPosition(
      descriptor.index,
      descriptor.marker,
      age,
      receptorCapture.target.slotIndex
    );

    if (position.x > axonReleaseSite.x + 42) {
      continue;
    }

    const secondsAgo = descriptor.age - (unboundAtAge + age);
    const { inhibitedSlots, occupiedSlots, reversedSlots } = getHistoricalTransporterState(
      transporterDrugDescriptors,
      historicalTransporterAssignments,
      secondsAgo
    );
    const transporterSlot = transporterSlots.find(
      (slot) => Math.hypot(position.x - slot.x, position.y - slot.y) < transporterCaptureRadius
    );

    if (!transporterSlot) {
      continue;
    }

    if (inhibitedSlots.has(transporterSlot.slotIndex) || reversedSlots.has(transporterSlot.slotIndex)) {
      return {
        capture: {
          age,
          position,
          target: { kind: "transporter", slotIndex: transporterSlot.slotIndex }
        },
        mode: "rebound"
      };
    }

    if (!occupiedSlots.has(transporterSlot.slotIndex)) {
      return {
        capture: {
          age,
          position,
          target: { kind: "transporter", slotIndex: transporterSlot.slotIndex }
        },
        mode: "open"
      };
    }
  }

  return null;
};

const findAntagonistBounceTransporterEncounter = (
  descriptor: LigandDescriptor,
  antagonistEncounter: CaptureCandidate,
  maxReturnAge: number
): CaptureCandidate | null => {
  const marker = descriptor.marker + antagonistEncounter.age + antagonistEncounter.target.slotIndex * 0.31;

  for (let age = 0.04; age <= Math.min(maxReturnAge, synapseVisualTiming.visibleSeconds); age += 0.025) {
    const position = getAntagonistBouncedTransmitterPosition(
      descriptor.index,
      marker,
      age,
      antagonistEncounter.target.slotIndex,
      antagonistEncounter.position
    );

    if (position.x > axonReleaseSite.x + 42) {
      continue;
    }

    const transporterSlot = transporterSlots.find(
      (slot) => Math.hypot(position.x - slot.x, position.y - slot.y) < transporterCaptureRadius
    );

    if (!transporterSlot) {
      continue;
    }

    return {
      age,
      position,
      target: { kind: "transporter", slotIndex: transporterSlot.slotIndex }
    };
  }

  return null;
};

const findReboundReceptorCapture = (
  descriptor: LigandDescriptor,
  blockedEncounter: CaptureCandidate,
  maxReboundAge: number,
  blockedReceptorSlots: Set<number>,
  historicalReceptorBlockers: HistoricalReceptorBlockers[] = []
): CaptureCandidate | null => {
  const marker = descriptor.marker + blockedEncounter.age + blockedEncounter.target.slotIndex * 0.23;

  for (let age = 0.06; age <= Math.min(maxReboundAge, synapseVisualTiming.visibleSeconds); age += 0.025) {
    const position = getBouncedTransmitterPosition(
      descriptor.index,
      marker,
      age,
      blockedEncounter.target.slotIndex,
      blockedEncounter.position
    );
    const secondsAgo = maxReboundAge - age;
    const historicallyBlockedReceptorSlots = historicalReceptorBlockers.reduce((blockedSlots, blockers) => {
      getHistoricalOccupiedSlots(blockers.descriptors, blockers.assignments, secondsAgo).forEach((slotIndex) =>
        blockedSlots.add(slotIndex)
      );
      return blockedSlots;
    }, new Set(blockedReceptorSlots));
    const slotIndex = receptorSlots.findIndex(
      (slot) =>
        !historicallyBlockedReceptorSlots.has(slot.slotIndex) &&
        Math.hypot(position.x - slot.x, position.y - slot.y) < captureRadius
    );

    if (slotIndex !== -1) {
      return {
        age,
        position,
        target: { kind: "receptor_orthosteric", slotIndex }
      };
    }
  }

  return null;
};

const getOpacity = (age: number) => {
  if (age < 0.16) {
    return age / 0.16;
  }

  if (age > synapseVisualTiming.visibleSeconds - 0.38) {
    return Math.max(0, (synapseVisualTiming.visibleSeconds - age) / 0.38);
  }

  return 1;
};

const getActiveSeconds = (descriptor: LigandDescriptor) =>
  descriptor.ligandKind === "transmitter"
    ? transmitterActiveSeconds
    : synapseVisualTiming.dockSeconds + synapseVisualTiming.drugBoundSeconds;

const getSiteKey = (target: BindingTarget) => `${target.kind}:${target.slotIndex}`;

const getDrugScheduleHistorySeconds = (frame: SimulationFrame) =>
  frame.duration +
  synapseVisualTiming.visibleSeconds +
  synapseVisualTiming.dockSeconds +
  synapseVisualTiming.drugBoundSeconds +
  synapseVisualTiming.rejectedDrugBounceSeconds;

const isReceptorTarget = (target: BindingTarget) =>
  target.kind === "receptor_orthosteric" || target.kind === "receptor_allosteric";

const getDescriptorKey = (descriptor: ScheduledLigandDescriptor) =>
  `${descriptor.id}@${descriptor.occurrenceIndex}:${descriptor.emittedAt.toFixed(3)}`;

const getBindingEventId = (descriptor: ScheduledLigandDescriptor, capture: CaptureCandidate) =>
  `${getDescriptorKey(descriptor)}:${getSiteKey(capture.target)}`;

const buildScheduledDrugDescriptors = (
  frame: SimulationFrame,
  currentTime: number,
  config: InterventionVisualConfig
): ScheduledLigandDescriptor[] =>
  getAmbientDrugEventsInWindow(frame, currentTime, config, getDrugScheduleHistorySeconds(frame)).flatMap((event) =>
    Array.from({ length: event.count }, (_, index) => makeScheduledDescriptor(event, index, currentTime))
  );

export const buildVisualSchedule = (
  frame: SimulationFrame,
  currentTime: number,
  config: InterventionVisualConfig
): VisualSchedule => {
  const drugDescriptors = buildScheduledDrugDescriptors(frame, currentTime, config);
  const acceptedBindings: AcceptedBindingEvent[] = [];
  const rejectedBindings: RejectedBindingEvent[] = [];
  const freeAtBySite = new Map<string, number>();
  const candidates = drugDescriptors
    .map((descriptor) => {
      const capture = findDrugCapture(descriptor);

      if (!capture) {
        return null;
      }

      const encounterAt = descriptor.emittedAt + capture.age;
      if (encounterAt > currentTime + 0.000001) {
        return null;
      }

      return { capture, descriptor, encounterAt };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort(
      (left, right) =>
        left.encounterAt - right.encounterAt ||
        left.descriptor.emittedAt - right.descriptor.emittedAt ||
        left.descriptor.index - right.descriptor.index
    );

  candidates.forEach(({ capture, descriptor, encounterAt }) => {
    const siteKey = getSiteKey(capture.target);
    const freeAt = freeAtBySite.get(siteKey) ?? Number.NEGATIVE_INFINITY;
    const descriptorKey = getDescriptorKey(descriptor);
    const id = getBindingEventId(descriptor, capture);

    if (encounterAt >= freeAt - 0.000001) {
      const dockStartAt = encounterAt;
      const boundStartAt = dockStartAt + synapseVisualTiming.dockSeconds;
      const boundEndAt = dockStartAt + getActiveSeconds(descriptor);

      freeAtBySite.set(siteKey, boundEndAt);
      acceptedBindings.push({
        boundEndAt,
        boundStartAt,
        capture,
        descriptorKey,
        dockStartAt,
        encounterAt,
        id,
        ligandId: descriptor.id,
        ligandKind: descriptor.ligandKind,
        status: "accepted",
        target: capture.target
      });
      return;
    }

    rejectedBindings.push({
      capture,
      descriptorKey,
      dockStartAt: encounterAt,
      encounterAt,
      id,
      ligandId: descriptor.id,
      ligandKind: descriptor.ligandKind,
      reason: "occupied",
      status: "rejected",
      target: capture.target
    });
  });

  return {
    acceptedBindings,
    currentTime,
    drugDescriptors,
    rejectedBindings
  };
};

const assignHistoricalSiteCaptures = (descriptors: LigandDescriptor[], targetKind: BindingSiteKind) => {
  const assigned = new Map<string, CaptureCandidate>();
  const occupiedUntilBySlot = new Map<number, number>();

  descriptors
    .filter((descriptor) => {
      const capture = descriptor.capture;
      return (
        capture &&
        capture.mode !== "antagonist_rebound" &&
        capture.target.kind === targetKind &&
        descriptor.age >= capture.age
      );
    })
    .sort((left, right) => {
      const leftCapturedAgo = left.capture ? left.age - left.capture.age : 0;
      const rightCapturedAgo = right.capture ? right.age - right.capture.age : 0;
      return rightCapturedAgo - leftCapturedAgo;
    })
    .forEach((descriptor) => {
      const capture = descriptor.capture;

      if (!capture) {
        return;
      }

      const captureAt = -(descriptor.age - capture.age);
      const releaseAt = captureAt + getActiveSeconds(descriptor);
      const occupiedUntil = occupiedUntilBySlot.get(capture.target.slotIndex) ?? Number.NEGATIVE_INFINITY;

      if (captureAt >= occupiedUntil) {
        occupiedUntilBySlot.set(capture.target.slotIndex, releaseAt);
        assigned.set(descriptor.id, capture);
      }
    });

  return assigned;
};

const makeDockedLigandFromBinding = (
  binding: AcceptedBindingEvent,
  currentTime: number
): DockedLigand | null => {
  const dockedAge = currentTime - binding.boundStartAt;

  if (dockedAge < 0 || currentTime > binding.boundEndAt) {
    return null;
  }

  return {
    age: dockedAge,
    alpha: clamp((binding.boundEndAt - currentTime) / 0.22),
    id: binding.ligandId,
    ligandKind: binding.ligandKind,
    position: getTargetPoint(binding.target),
    target: binding.target
  };
};

const buildAgonistSignalSustainFromBinding = (
  binding: AcceptedBindingEvent,
  currentTime: number
): SignalSustain | null => {
  if (binding.ligandKind !== "agonist") {
    return null;
  }

  const sustainAge = currentTime - binding.boundStartAt;
  const duration = binding.boundEndAt - binding.boundStartAt;

  if (sustainAge < 0 || sustainAge > duration) {
    return null;
  }

  const fadeIn = clamp(sustainAge / 0.18);
  const fadeOut = clamp((duration - sustainAge) / 0.28);

  return {
    age: sustainAge,
    alpha: 0.72 * fadeIn * fadeOut,
    duration,
    endedAt: binding.boundEndAt,
    id: `${binding.ligandId}-sustain`,
    intensity: 1,
    slotIndex: binding.target.slotIndex,
    startedAt: binding.boundStartAt
  };
};

const makeDescriptor = (
  event: LigandEvent,
  index: number,
  age: number,
  target?: BindingTarget,
  emittedAt?: number,
  occurrenceIndex = 0
): LigandDescriptor => ({
  age,
  capture: null,
  emittedAt,
  id: `${event.source}-${event.ligandKind}-${event.marker.toFixed(3)}-${index}`,
  index,
  ligandKind: event.ligandKind,
  marker: event.marker,
  source: event.source,
  target
});

const makeScheduledDescriptor = (
  event: TimedLigandEvent,
  index: number,
  currentTime: number
): ScheduledLigandDescriptor => {
  const descriptor = makeDescriptor(
    event,
    index,
    currentTime - event.emittedAt,
    undefined,
    event.emittedAt,
    event.occurrenceIndex
  );

  return {
    ...descriptor,
    emittedAt: event.emittedAt,
    id: `${descriptor.id}@${event.occurrenceIndex}`,
    occurrenceIndex: event.occurrenceIndex
  };
};

const getMoleculeOrigin = (descriptor: LigandDescriptor): MoleculeOrigin =>
  descriptor.source === "ambient"
    ? "ambient_drug"
    : descriptor.source;

const buildPulseDescriptors = (
  frame: SimulationFrame,
  currentTime: number,
  moleculeCount: number
) =>
  getPulseEvents(
    frame,
    currentTime,
    moleculeCount,
    transmitterHistorySeconds
  ).flatMap((event) =>
    Array.from({ length: event.count }, (_, index) => {
      const age = getRepeatingEventAge(currentTime, event.marker, frame.duration);
      return makeDescriptor(event, index, age, undefined, currentTime - age);
    })
  );

const makeLeakDescriptor = (
  sourceDescriptor: LigandDescriptor,
  capture: CaptureCandidate,
  leakIndex: number,
  moleculeIndex: number,
  age: number,
  emissionAge: number
): LigandDescriptor => {
  const marker = sourceDescriptor.marker + capture.target.slotIndex * 0.29 + emissionAge;

  return {
    age,
    capture: null,
    emittedAt: (sourceDescriptor.emittedAt ?? 0) + emissionAge,
    id: `leak-transmitter-${sourceDescriptor.id}-${leakIndex}-${moleculeIndex}`,
    index: moleculeIndex,
    ligandKind: "transmitter",
    marker,
    source: "leak",
    target: {
      kind: "transporter",
      slotIndex: capture.target.slotIndex
    }
  };
};

const buildLeakDescriptors = (
  releaserDescriptors: LigandDescriptor[],
  assignedTransporterCaptures: Map<string, CaptureCandidate>,
  strength: number
) => {
  if (strength <= 0 || releaserDescriptors.length === 0) {
    return [];
  }

  const period = lerp(0.72, 0.34, clamp(strength));
  const count = Math.max(1, Math.round(1 + strength * 2));
  const descriptors: LigandDescriptor[] = [];

  releaserDescriptors.forEach((sourceDescriptor) => {
    const capture = assignedTransporterCaptures.get(sourceDescriptor.id);

    if (!capture) {
      return;
    }

    const leakStartAge = capture.age + synapseVisualTiming.dockSeconds;
    const leakEndAge = capture.age + getActiveSeconds(sourceDescriptor);
    const latestEmissionAge = Math.min(sourceDescriptor.age, leakEndAge);

    if (latestEmissionAge < leakStartAge) {
      return;
    }

    for (
      let emissionAge = leakStartAge, leakIndex = 0;
      emissionAge <= latestEmissionAge;
      emissionAge += period, leakIndex += 1
    ) {
      const age = sourceDescriptor.age - emissionAge;

      if (age > transmitterHistorySeconds) {
        continue;
      }

      Array.from({ length: count }, (_, moleculeIndex) =>
        makeLeakDescriptor(sourceDescriptor, capture, leakIndex, moleculeIndex, age, emissionAge)
      ).forEach((descriptor) => descriptors.push(descriptor));
    }
  });

  return descriptors;
};

const buildPositionedVisualMolecule = (
  descriptor: LigandDescriptor,
  position: Point,
  phase: MoleculePhase,
  alphaAge: number,
  radius = descriptor.ligandKind === "transmitter" ? 7.2 : 6.5
): VisualMolecule | null => {
  const membraneX = getDendriteMembraneXAtY(position.y);

  if (position.x >= membraneX) {
    return null;
  }

  const membraneFadeStartX = membraneX - 32;
  const membraneFade =
    position.x <= membraneFadeStartX
      ? 1
      : clamp((membraneX - position.x) / (membraneX - membraneFadeStartX));
  const alpha = 0.88 * getOpacity(alphaAge) * membraneFade;

  if (alpha <= 0.02) {
    return null;
  }

  return {
    alpha,
    color: ligandColors[descriptor.ligandKind],
    id: descriptor.id,
    ligandKind: descriptor.ligandKind,
    origin: getMoleculeOrigin(descriptor),
    phase,
    position,
    pull: 0,
    radius,
    shape: descriptor.ligandKind === "transmitter" ? "circle" : "rounded_diamond"
  };
};

const buildVisualMolecule = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate | undefined,
  currentTime: number
): VisualMolecule | null => {
  if (capture) {
    const dockProgress = easeOutCubic((descriptor.age - capture.age) / synapseVisualTiming.dockSeconds);

    if (dockProgress >= 1) {
      return null;
    }

    const target = getTargetPoint(capture.target);

    return {
      alpha: 1,
      color: ligandColors[descriptor.ligandKind],
      id: descriptor.id,
      ligandKind: descriptor.ligandKind,
      origin: getMoleculeOrigin(descriptor),
      phase: "docking",
      position: {
        x: lerp(capture.position.x, target.x, dockProgress),
        y: lerp(capture.position.y, target.y, dockProgress)
      },
      pull: 0,
      radius: descriptor.ligandKind === "transmitter" ? 7.2 + dockProgress * 0.55 : 6.8,
      shape: descriptor.ligandKind === "transmitter" ? "circle" : "rounded_diamond"
    };
  }

  const position = getLigandPosition(descriptor, descriptor.age);
  return buildPositionedVisualMolecule(descriptor, position, "drift_to_dendrite", descriptor.age);
};

const buildRejectedDrugMolecule = (
  descriptor: ScheduledLigandDescriptor,
  rejection: RejectedBindingEvent,
  currentTime: number
): VisualMolecule | null => {
  if (!isReceptorTarget(rejection.target)) {
    return buildVisualMolecule(descriptor, undefined, currentTime);
  }

  const elapsedSinceEncounter = currentTime - rejection.encounterAt;
  if (elapsedSinceEncounter < 0) {
    return buildVisualMolecule(descriptor, undefined, currentTime);
  }

  if (elapsedSinceEncounter > synapseVisualTiming.rejectedDrugBounceSeconds) {
    return null;
  }

  const slot = receptorSlots[rejection.target.slotIndex];
  const progress = easeOutCubic(elapsedSinceEncounter / synapseVisualTiming.rejectedDrugBounceSeconds);
  const outward = {
    x: -slot.inwardNormal.x,
    y: -slot.inwardNormal.y
  };
  const lateral =
    Math.sin(elapsedSinceEncounter * 8.4 + descriptor.index * 0.9 + rejection.target.slotIndex) *
    15 *
    (1 - progress);

  return {
    alpha: 0.88 * (1 - progress),
    color: ligandColors[descriptor.ligandKind],
    id: `${descriptor.id}-rejected`,
    ligandKind: descriptor.ligandKind,
    origin: getMoleculeOrigin(descriptor),
    phase: "rejected",
    position: {
      x: rejection.capture.position.x + outward.x * (24 + 86 * progress) + slot.tangent.x * lateral,
      y: rejection.capture.position.y + outward.y * (24 + 86 * progress) + slot.tangent.y * lateral
    },
    pull: 0,
    radius: 6.8 * (1 - progress * 0.16),
    shape: "rounded_diamond"
  };
};

interface SignalLock {
  capture: CaptureCandidate;
  emittedAt: number;
  endedAt: number;
  elapsedSinceCapture: number;
  lockIndex: number;
}

interface TransmitterLifecycle {
  activeLocks: SignalLock[];
  absorption?: {
    capture: CaptureCandidate;
    elapsedSinceCapture: number;
  };
  dockedLigands: DockedLigand[];
  molecules: VisualMolecule[];
  signalLocks: SignalLock[];
}

const emptyTransmitterLifecycle = (): TransmitterLifecycle => ({
  activeLocks: [],
  dockedLigands: [],
  molecules: [],
  signalLocks: []
});

const buildDockingVisualMolecule = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate,
  elapsedSinceCapture: number,
  phase: MoleculePhase
): VisualMolecule | null => {
  const dockProgress = easeOutCubic(elapsedSinceCapture / synapseVisualTiming.dockSeconds);

  if (dockProgress >= 1) {
    return null;
  }

  const target = getTargetPoint(capture.target);

  return {
    alpha: 1,
    color: ligandColors[descriptor.ligandKind],
    id: descriptor.id,
    ligandKind: descriptor.ligandKind,
    origin: getMoleculeOrigin(descriptor),
    phase,
    position: {
      x: lerp(capture.position.x, target.x, dockProgress),
      y: lerp(capture.position.y, target.y, dockProgress)
    },
    pull: 0,
    radius: descriptor.ligandKind === "transmitter" ? 7.2 + dockProgress * 0.55 : 6.8,
    shape: descriptor.ligandKind === "transmitter" ? "circle" : "rounded_diamond"
  };
};

const buildAbsorbingTransmitterMolecule = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate,
  elapsedSinceCapture: number
): VisualMolecule | null => {
  const dockingMolecule = buildDockingVisualMolecule(descriptor, capture, elapsedSinceCapture, "absorbing");

  if (dockingMolecule) {
    return dockingMolecule;
  }

  const internalAge = elapsedSinceCapture - synapseVisualTiming.dockSeconds;

  if (internalAge < 0 || internalAge > synapseVisualTiming.transporterInternalizeSeconds) {
    return null;
  }

  const transporter = transporterSlots[capture.target.slotIndex];
  const inwardNormal = normalize({
    x: boutonCenter.x - transporter.x,
    y: boutonCenter.y - transporter.y
  });
  const progress = easeOutCubic(internalAge / synapseVisualTiming.transporterInternalizeSeconds);

  return {
    alpha: 0.88 * (1 - progress),
    color: ligandColors.transmitter,
    id: descriptor.id,
    ligandKind: "transmitter",
    origin: getMoleculeOrigin(descriptor),
    phase: "internalizing",
    position: {
      x: transporter.x + inwardNormal.x * 42 * progress,
      y: transporter.y + inwardNormal.y * 42 * progress
    },
    pull: 0,
    radius: 7.75 * (1 - progress * 0.18),
    shape: "circle"
  };
};

const buildBoundTransmitterLigand = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate,
  elapsedSinceCapture: number
): DockedLigand | null => {
  const dockedAge = elapsedSinceCapture - synapseVisualTiming.dockSeconds;

  if (dockedAge < 0 || elapsedSinceCapture > transmitterActiveSeconds) {
    return null;
  }

  return {
    age: dockedAge,
    alpha: 1,
    id: descriptor.id,
    ligandKind: descriptor.ligandKind,
    position: getTargetPoint(capture.target),
    target: capture.target
  };
};

const buildTransmitterSignalNote = (
  descriptor: LigandDescriptor,
  lock: SignalLock,
  intensity: number
): SignalNote | null => {
  const noteAge = lock.elapsedSinceCapture - synapseVisualTiming.dockSeconds;

  if (noteAge < 0 || noteAge > synapseVisualTiming.noteSeconds) {
    return null;
  }

  const slot = receptorSlots[lock.capture.target.slotIndex];
  const progress = clamp(noteAge / synapseVisualTiming.noteSeconds);
  const eased = easeOutCubic(progress);
  const fadeIn = clamp(noteAge / 0.14);
  const fadeOut = clamp((synapseVisualTiming.noteSeconds - noteAge) / 0.42);
  const lateralDrift =
    Math.sin(noteAge * 5.4 + descriptor.index * 0.7 + lock.lockIndex * 1.3) * 3.2 * (1 - progress);

  return {
    age: noteAge,
    alpha: 0.9 * fadeIn * fadeOut,
    emittedAt: lock.emittedAt,
    endedAt: lock.endedAt,
    id: `${descriptor.id}-lock-${lock.lockIndex}`,
    intensity,
    position: {
      x: slot.x + slot.inwardNormal.x * (40 + 62 * eased) + slot.tangent.x * lateralDrift,
      y: slot.y + slot.inwardNormal.y * (40 + 62 * eased) + slot.tangent.y * lateralDrift
    },
    scale: (0.72 + 0.2 * (1 - progress)) * intensity,
    slotIndex: lock.capture.target.slotIndex
  };
};

const buildTransmitterLifecycle = (
  descriptor: LigandDescriptor,
  initialCapture: CaptureCandidate | undefined,
  blockedReceptorSlots: Set<number>,
  transporterDrugDescriptors: LigandDescriptor[],
  historicalTransporterAssignments: Map<string, CaptureCandidate>,
  historicalReceptorBlockers: HistoricalReceptorBlockers[] = []
): TransmitterLifecycle => {
  const lifecycle = emptyTransmitterLifecycle();

  if (!initialCapture) {
    const molecule = buildPositionedVisualMolecule(
      descriptor,
      getLigandPosition(descriptor, descriptor.age),
      "drift_to_dendrite",
      descriptor.age
    );

    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  const initialElapsed = descriptor.age - initialCapture.age;

  if (initialElapsed < 0) {
    return lifecycle;
  }

  if (initialCapture.mode === "antagonist_rebound") {
    const transporterEncounter = findAntagonistBounceTransporterEncounter(
      descriptor,
      initialCapture,
      initialElapsed
    );

    if (transporterEncounter) {
      const encounterElapsed = initialElapsed - transporterEncounter.age;
      lifecycle.absorption = {
        capture: transporterEncounter,
        elapsedSinceCapture: encounterElapsed
      };

      const molecule = buildAbsorbingTransmitterMolecule(descriptor, transporterEncounter, encounterElapsed);
      if (molecule) {
        lifecycle.molecules.push(molecule);
      }

      return lifecycle;
    }

    const marker = descriptor.marker + initialCapture.age + initialCapture.target.slotIndex * 0.31;
    const position = getAntagonistBouncedTransmitterPosition(
      descriptor.index,
      marker,
      initialElapsed,
      initialCapture.target.slotIndex,
      initialCapture.position
    );
    const molecule = buildPositionedVisualMolecule(descriptor, position, "drift_to_axon", descriptor.age);
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  if (initialCapture.target.kind === "transporter") {
    lifecycle.absorption = {
      capture: initialCapture,
      elapsedSinceCapture: initialElapsed
    };

    const molecule = buildAbsorbingTransmitterMolecule(descriptor, initialCapture, initialElapsed);
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  if (initialElapsed < synapseVisualTiming.dockSeconds) {
    const molecule = buildDockingVisualMolecule(descriptor, initialCapture, initialElapsed, "docking");
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  const firstLock: SignalLock = {
    capture: initialCapture,
    emittedAt: (descriptor.emittedAt ?? 0) + initialCapture.age + synapseVisualTiming.dockSeconds,
    endedAt:
      (descriptor.emittedAt ?? 0) +
      initialCapture.age +
      synapseVisualTiming.dockSeconds +
      synapseVisualTiming.noteSeconds,
    elapsedSinceCapture: initialElapsed,
    lockIndex: 0
  };
  lifecycle.signalLocks.push(firstLock);

  if (initialElapsed <= transmitterActiveSeconds) {
    const docked = buildBoundTransmitterLigand(descriptor, initialCapture, initialElapsed);
    if (docked) {
      lifecycle.activeLocks.push(firstLock);
      lifecycle.dockedLigands.push(docked);
    }

    return lifecycle;
  }

  const returnAge = descriptor.age - (initialCapture.age + transmitterActiveSeconds);
  const returnEncounter = findReturningTransporterEncounter(
    descriptor,
    initialCapture,
    returnAge,
    transporterDrugDescriptors,
    historicalTransporterAssignments
  );

  if (!returnEncounter) {
    const position = getReturningTransmitterPosition(
      descriptor.index,
      descriptor.marker,
      returnAge,
      initialCapture.target.slotIndex
    );
    const molecule = buildPositionedVisualMolecule(descriptor, position, "drift_to_axon", returnAge);
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  const encounterElapsed = returnAge - returnEncounter.capture.age;

  if (returnEncounter.mode === "open") {
    lifecycle.absorption = {
      capture: returnEncounter.capture,
      elapsedSinceCapture: encounterElapsed
    };

    const molecule = buildAbsorbingTransmitterMolecule(descriptor, returnEncounter.capture, encounterElapsed);
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  const reboundAge = encounterElapsed;
  const reboundCapture = findReboundReceptorCapture(
    descriptor,
    returnEncounter.capture,
    reboundAge,
    blockedReceptorSlots,
    historicalReceptorBlockers
  );

  if (!reboundCapture) {
    const marker = descriptor.marker + returnEncounter.capture.age + returnEncounter.capture.target.slotIndex * 0.23;
    const position = getBouncedTransmitterPosition(
      descriptor.index,
      marker,
      reboundAge,
      returnEncounter.capture.target.slotIndex,
      returnEncounter.capture.position
    );
    const molecule = buildPositionedVisualMolecule(descriptor, position, "drift_to_dendrite", reboundAge);
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  const reboundElapsed = reboundAge - reboundCapture.age;

  if (reboundElapsed < synapseVisualTiming.dockSeconds) {
    const molecule = buildDockingVisualMolecule(descriptor, reboundCapture, reboundElapsed, "docking");
    if (molecule) {
      lifecycle.molecules.push(molecule);
    }

    return lifecycle;
  }

  const reboundLock: SignalLock = {
    capture: reboundCapture,
    emittedAt:
      (descriptor.emittedAt ?? 0) +
      initialCapture.age +
      transmitterActiveSeconds +
      returnEncounter.capture.age +
      reboundCapture.age +
      synapseVisualTiming.dockSeconds,
    endedAt:
      (descriptor.emittedAt ?? 0) +
      initialCapture.age +
      transmitterActiveSeconds +
      returnEncounter.capture.age +
      reboundCapture.age +
      synapseVisualTiming.dockSeconds +
      synapseVisualTiming.noteSeconds,
    elapsedSinceCapture: reboundElapsed,
    lockIndex: 1
  };
  lifecycle.signalLocks.push(reboundLock);

  if (reboundElapsed <= transmitterActiveSeconds) {
    const docked = buildBoundTransmitterLigand(descriptor, reboundCapture, reboundElapsed);
    if (docked) {
      lifecycle.activeLocks.push(reboundLock);
      lifecycle.dockedLigands.push(docked);
    }

    return lifecycle;
  }

  const secondReturnAge = reboundElapsed - transmitterActiveSeconds;
  const position = getReturningTransmitterPosition(
    descriptor.index,
    descriptor.marker + 1.7,
    secondReturnAge,
    reboundCapture.target.slotIndex
  );
  const molecule = buildPositionedVisualMolecule(descriptor, position, "drift_to_axon", secondReturnAge);
  if (molecule) {
    lifecycle.molecules.push(molecule);
  }

  return lifecycle;
};

const createEmptyReceptorOccupancies = (): ReceptorOccupancy[] =>
  receptorSlots.map((slot) => ({
    active: false,
    noteIntensity: 1,
    slotIndex: slot.slotIndex
  }));

const createEmptyTransporterOccupancies = (): TransporterOccupancy[] =>
  transporterSlots.map((slot) => ({
    activation: 0,
    absorbing: false,
    leaking: false,
    slotIndex: slot.slotIndex
  }));

export const sampleVisualState = (
  schedule: VisualSchedule,
  frame: SimulationFrame,
  currentTime: number,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
): VisualState => {
  const moleculeCount = Math.round(clamp(moleculesPerPulse, 1, 12));
  const drugDescriptors = schedule.drugDescriptors;
  const acceptedBindingsByDescriptor = new Map(
    schedule.acceptedBindings.map((binding) => [binding.descriptorKey, binding])
  );
  const rejectedBindingsByDescriptor = new Map(
    schedule.rejectedBindings.map((binding) => [binding.descriptorKey, binding])
  );
  const transporterDrugDescriptors = drugDescriptors.filter(
    (descriptor) =>
      descriptor.ligandKind === "reuptake_inhibitor" || descriptor.ligandKind === "releaser"
  );
  const orthostericDrugDescriptors = drugDescriptors.filter(
    (descriptor) => descriptor.ligandKind === "agonist" || descriptor.ligandKind === "antagonist"
  );
  const historicalTransporterAssignments = new Map(
    schedule.acceptedBindings
      .filter((binding) => binding.target.kind === "transporter")
      .map((binding) => [binding.ligandId, binding.capture] as const)
  );
  const historicalOrthostericDrugAssignments = new Map(
    schedule.acceptedBindings
      .filter((binding) => binding.target.kind === "receptor_orthosteric")
      .map((binding) => [binding.ligandId, binding.capture] as const)
  );
  const acceptedTransporterDrugDescriptors = transporterDrugDescriptors.filter((descriptor) =>
    historicalTransporterAssignments.has(descriptor.id)
  );
  const acceptedOrthostericDrugDescriptors = orthostericDrugDescriptors.filter((descriptor) =>
    historicalOrthostericDrugAssignments.has(descriptor.id)
  );
  const transporterOccupancies = createEmptyTransporterOccupancies();
  const transporterDocked = schedule.acceptedBindings.flatMap((binding): DockedLigand[] => {
    if (binding.target.kind !== "transporter") {
      return [];
    }

    const docked = makeDockedLigandFromBinding(binding, currentTime);
    if (!docked) {
      return [];
    }

    const occupancy = transporterOccupancies[binding.target.slotIndex];
    occupancy.ligand = docked;
    occupancy.leaking = binding.ligandKind === "releaser";
    return [docked];
  });
  const blockedTransporterSlots = new Set(
    transporterOccupancies
      .filter((occupancy) => occupancy.ligand)
      .map((occupancy) => occupancy.slotIndex)
  );

  const blockedReceptorSlots = new Set(
    schedule.acceptedBindings
      .filter(
        (binding) =>
          binding.target.kind === "receptor_orthosteric" &&
          currentTime >= binding.encounterAt &&
          currentTime <= binding.boundEndAt
      )
      .map((binding) => binding.target.slotIndex)
  );

  const primaryTransmitterDescriptors = [
    ...buildPulseDescriptors(frame, currentTime, moleculeCount),
    ...buildLeakDescriptors(
      acceptedTransporterDrugDescriptors.filter((descriptor) => descriptor.ligandKind === "releaser"),
      historicalTransporterAssignments,
      config.id === "releaser" ? config.strength : 0
    )
  ];
  primaryTransmitterDescriptors.forEach((descriptor) => {
    descriptor.capture = findTransmitterCapture(
      descriptor,
      blockedReceptorSlots,
      blockedTransporterSlots,
      {
        assignments: historicalOrthostericDrugAssignments,
        descriptors: acceptedOrthostericDrugDescriptors
      },
      {
        assignments: historicalTransporterAssignments,
        descriptors: acceptedTransporterDrugDescriptors
      }
    );
  });
  const initialTransmitterReceptorAssignments = assignHistoricalSiteCaptures(
    primaryTransmitterDescriptors,
    "receptor_orthosteric"
  );
  const initialAntagonistReboundAssignments = new Map(
    primaryTransmitterDescriptors
      .filter((descriptor) => descriptor.capture?.mode === "antagonist_rebound")
      .map((descriptor) => [descriptor.id, descriptor.capture as CaptureCandidate] as const)
  );
  const initialTransporterTransmitterAssignments = assignHistoricalSiteCaptures(
    primaryTransmitterDescriptors,
    "transporter"
  );
  const transmitterLifecycleEntries = primaryTransmitterDescriptors.map((descriptor) => ({
    descriptor,
    lifecycle: buildTransmitterLifecycle(
      descriptor,
      initialAntagonistReboundAssignments.get(descriptor.id) ??
        initialTransmitterReceptorAssignments.get(descriptor.id) ??
        initialTransporterTransmitterAssignments.get(descriptor.id),
      blockedReceptorSlots,
      acceptedTransporterDrugDescriptors,
      historicalTransporterAssignments,
      [
        {
          assignments: historicalOrthostericDrugAssignments,
          descriptors: acceptedOrthostericDrugDescriptors
        },
        {
          assignments: initialTransmitterReceptorAssignments,
          descriptors: primaryTransmitterDescriptors
        }
      ]
    )
  }));

  const receptorOccupancies = createEmptyReceptorOccupancies();
  const dockedLigands: DockedLigand[] = [...transporterDocked];

  schedule.acceptedBindings.forEach((binding) => {
    if (binding.target.kind !== "receptor_allosteric") {
      return;
    }

    const docked = makeDockedLigandFromBinding(binding, currentTime);
    if (docked) {
      receptorOccupancies[binding.target.slotIndex].allosteric = docked;
      dockedLigands.push(docked);
    }
  });

  schedule.acceptedBindings.forEach((binding) => {
    if (binding.target.kind !== "receptor_orthosteric") {
      return;
    }

    const docked = makeDockedLigandFromBinding(binding, currentTime);
    if (docked) {
      const occupancy = receptorOccupancies[binding.target.slotIndex];
      if (occupancy.orthosteric) {
        return;
      }

      occupancy.orthosteric = docked;
      occupancy.active = binding.ligandKind === "agonist";
      occupancy.noteIntensity = 1;
      dockedLigands.push(docked);
    }
  });

  transmitterLifecycleEntries.forEach(({ lifecycle }) => {
    lifecycle.activeLocks.forEach((lock) => {
      const docked = lifecycle.dockedLigands.find(
        (ligand) => ligand.target.slotIndex === lock.capture.target.slotIndex
      );

      if (!docked) {
        return;
      }

      const occupancy = receptorOccupancies[lock.capture.target.slotIndex];
      if (occupancy.orthosteric) {
        return;
      }

      occupancy.orthosteric = docked;
      occupancy.active = true;
      occupancy.noteIntensity = occupancy.allosteric?.ligandKind === "pam" ? 2.2 : 1;
      dockedLigands.push(docked);
    });
  });

  const drugMolecules = drugDescriptors.flatMap((descriptor): VisualMolecule[] => {
    const descriptorKey = getDescriptorKey(descriptor);
    const rejectedBinding = rejectedBindingsByDescriptor.get(descriptorKey);
    if (rejectedBinding) {
      const rejectedMolecule = buildRejectedDrugMolecule(descriptor, rejectedBinding, currentTime);
      return rejectedMolecule ? [rejectedMolecule] : [];
    }

    const capture = acceptedBindingsByDescriptor.get(descriptorKey)?.capture;
    const molecule = buildVisualMolecule(descriptor, capture, currentTime);
    return molecule ? [molecule] : [];
  });
  const transmitterMolecules = transmitterLifecycleEntries.flatMap(({ lifecycle }) => lifecycle.molecules);
  const molecules = [...drugMolecules, ...transmitterMolecules];

  transmitterLifecycleEntries.forEach(({ lifecycle }) => {
    if (!lifecycle.absorption) {
      return;
    }

    const { capture, elapsedSinceCapture } = lifecycle.absorption;
    const flashAge = elapsedSinceCapture - synapseVisualTiming.dockSeconds;
    const occupancy = transporterOccupancies[capture.target.slotIndex];
    if (occupancy.ligand) {
      return;
    }

    occupancy.activation = Math.max(
      occupancy.activation,
      flashAge < 0
        ? 0.45 + clamp(elapsedSinceCapture / synapseVisualTiming.dockSeconds) * 0.35
        : clamp(1 - flashAge / synapseVisualTiming.reuptakeFlashSeconds)
    );
    occupancy.absorbing = occupancy.activation > 0.05;
  });

  const transmitterNotes = transmitterLifecycleEntries.flatMap(({ descriptor, lifecycle }) =>
    lifecycle.signalLocks.flatMap((lock): SignalNote[] => {
      const receptor = receptorOccupancies[lock.capture.target.slotIndex];
      const intensity = receptor.allosteric?.ligandKind === "pam" ? 2.2 : 1;
      const note = buildTransmitterSignalNote(descriptor, lock, intensity);
      return note && note.alpha > 0.02 ? [note] : [];
    })
  );

  const signalSustains = schedule.acceptedBindings.flatMap((binding): SignalSustain[] => {
    const sustain = buildAgonistSignalSustainFromBinding(binding, currentTime);
    return sustain && sustain.alpha > 0.02 ? [sustain] : [];
  });

  return {
    dockedLigands,
    molecules,
    receptorOccupancies,
    signalNotes: transmitterNotes,
    signalSustains,
    transporterOccupancies
  };
};

export const buildVisualState = (
  frame: SimulationFrame,
  currentTime: number,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
): VisualState =>
  sampleVisualState(buildVisualSchedule(frame, currentTime, config), frame, currentTime, moleculesPerPulse, config);
