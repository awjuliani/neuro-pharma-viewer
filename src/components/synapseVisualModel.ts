import type { InterventionId, SimulationFrame } from "../simulation/types";

export interface Point {
  x: number;
  y: number;
}

export type LigandKind =
  | "transmitter"
  | "reuptake_inhibitor"
  | "releaser"
  | "maoi"
  | "agonist"
  | "antagonist"
  | "pam";

export type BindingSiteKind = "receptor_orthosteric" | "receptor_allosteric" | "transporter" | "mao";

type LigandSource = "ambient" | "leak" | "pulse";

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
  id: string;
  index: number;
  ligandKind: LigandKind;
  marker: number;
  source: LigandSource;
  target?: BindingTarget;
}

interface TransportState {
  absorbedAgo?: number;
  kind: "free" | "reuptaking" | "removed";
  position: Point;
  pull: number;
  transporterSlotIndex?: number;
}

interface CaptureCandidate {
  age: number;
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

export interface MaoOccupancy {
  activation: number;
  degrading: boolean;
  ligand?: DockedLigand;
  position: Point;
  slotIndex: number;
}

export interface VisualMolecule {
  alpha: number;
  color: string;
  ligandKind: LigandKind;
  position: Point;
  pull: number;
  radius: number;
  shape: "circle" | "rounded_diamond";
}

export interface SignalNote {
  age: number;
  alpha: number;
  id: string;
  intensity: number;
  position: Point;
  scale: number;
  slotIndex: number;
}

export interface InterventionVisualConfig {
  id: InterventionId;
  strength: number;
}

export interface VisualState {
  dockedLigands: DockedLigand[];
  maoOccupancies: MaoOccupancy[];
  molecules: VisualMolecule[];
  receptorOccupancies: ReceptorOccupancy[];
  signalNotes: SignalNote[];
  transporterOccupancies: TransporterOccupancy[];
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

export const maoSlots = [
  { band: "top", centerX: 344, centerY: synapseCenterY - 174, rotation: -18, seed: 1103, xRadius: 66, yRadius: 26 },
  { band: "top", centerX: 506, centerY: synapseCenterY - 172, rotation: -5, seed: 1907, xRadius: 88, yRadius: 26 },
  { band: "top", centerX: 636, centerY: synapseCenterY - 170, rotation: 14, seed: 2701, xRadius: 58, yRadius: 26 },
  { band: "bottom", centerX: 344, centerY: synapseCenterY + 174, rotation: -12, seed: 3511, xRadius: 66, yRadius: 26 },
  { band: "bottom", centerX: 506, centerY: synapseCenterY + 172, rotation: 4, seed: 4337, xRadius: 88, yRadius: 26 },
  { band: "bottom", centerX: 636, centerY: synapseCenterY + 170, rotation: 21, seed: 5197, xRadius: 58, yRadius: 26 }
].map((slot, slotIndex) => ({
  ...slot,
  slotIndex
}));

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

export const getMaoPosition = (slotIndex: number, time: number): Point => {
  const slot = maoSlots[slotIndex] ?? maoSlots[0];
  const y = slot.centerY + cyclicNoise(slot.seed, time) * slot.yRadius + cyclicNoise(slot.seed + 37, time, 13) * 12;
  const rawX =
    slot.centerX +
    cyclicNoise(slot.seed + 73, time) * slot.xRadius +
    cyclicNoise(slot.seed + 149, time, 11) * 18;
  const minX = 286;
  const maxX = Math.min(668, getDendriteMembraneXAtY(y) - 86);
  const minY = slot.band === "top" ? synapseCenterY - boutonRadius - 12 : synapseCenterY + 144;
  const maxY = slot.band === "top" ? synapseCenterY - 144 : synapseCenterY + boutonRadius + 12;

  return {
    x: clamp(rawX, minX, maxX),
    y: clamp(y, minY, maxY)
  };
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
    fill: "#d9f0ff",
    inactive: "#2478a6",
    note: "#2d9df0"
  },
  transporter: {
    active: "#f07a45",
    base: "#be6649"
  },
  mao: {
    active: "#8b6ee8",
    base: "#6f5c9c"
  },
  ligands: {
    agonist: "#2d9df0",
    antagonist: "#b34a6b",
    maoi: "#6f5c9c",
    pam: "#4c8f38",
    releaser: "#d56b2e",
    reuptake_inhibitor: "#8c514f",
    transmitter: "#2478a6"
  }
} satisfies {
  anatomy: Record<"axonFill" | "axonStroke" | "dendriteFill" | "dendriteStroke", string>;
  receptor: Record<"active" | "fill" | "inactive" | "note", string>;
  transporter: Record<"active" | "base", string>;
  mao: Record<"active" | "base", string>;
  ligands: Record<LigandKind, string>;
};
export const interventionAccentColors = {
  baseline: visualPalette.receptor.inactive,
  reuptake_inhibitor: visualPalette.ligands.reuptake_inhibitor,
  releaser: visualPalette.ligands.releaser,
  maoi: visualPalette.ligands.maoi,
  agonist: visualPalette.ligands.agonist,
  antagonist: visualPalette.ligands.antagonist,
  pam: visualPalette.ligands.pam
} satisfies Record<InterventionId, string>;
export const activeReceptorColor = visualPalette.receptor.active;
export const activeReceptorFill = visualPalette.receptor.fill;
export const inactiveReceptorColor = visualPalette.receptor.inactive;
export const maoActiveColor = visualPalette.mao.active;
export const maoBaseColor = visualPalette.mao.base;
export const reuptakeBaseColor = visualPalette.transporter.base;
export const reuptakeActiveColor = visualPalette.transporter.active;
export const ligandColors = visualPalette.ligands;
export const synapseVisualTiming = {
  boundSeconds: 0.5,
  dockSeconds: 0.34,
  drugBoundSeconds: 2.35,
  noteSeconds: 1.24,
  releaseDelaySeconds: 0.34,
  reuptakeFlashSeconds: 0.32,
  visibleSeconds: 3.1
};

const captureRadius = 23;
const drugCaptureRadius = 33;
const maoCaptureRadius = 24;

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

const wrappedAge = (currentTime: number, marker: number, duration: number) =>
  (currentTime - marker + duration) % duration;

const getTargetPoint = (target: BindingTarget, time = 0) => {
  if (target.kind === "transporter") {
    return transporterSlots[target.slotIndex];
  }

  if (target.kind === "mao") {
    return getMaoPosition(target.slotIndex, time);
  }

  const receptor = receptorSlots[target.slotIndex];
  return target.kind === "receptor_allosteric" ? receptor.allosteric : receptor.orthosteric;
};

const getCapturePoint = (target: BindingTarget, time = 0) => {
  if (target.kind === "receptor_allosteric") {
    return receptorSlots[target.slotIndex].orthosteric;
  }

  return getTargetPoint(target, time);
};

const getPulseEvents = (frame: SimulationFrame, currentTime: number, moleculeCount: number): LigandEvent[] =>
  frame.eventMarkers
    .map((marker) => {
      const releaseMarker = (marker + synapseVisualTiming.releaseDelaySeconds) % frame.duration;

      return {
        count: moleculeCount,
        ligandKind: "transmitter" as const,
        marker: releaseMarker,
        source: "pulse" as const
      };
    })
    .filter((event) => wrappedAge(currentTime, event.marker, frame.duration) <= synapseVisualTiming.visibleSeconds);

const getAmbientDrugEvents = (
  frame: SimulationFrame,
  currentTime: number,
  config: InterventionVisualConfig
): LigandEvent[] => {
  if (config.id === "baseline" || config.strength <= 0) {
    return [];
  }

  const ligandKind = config.id;
  const period = lerp(1.28, 0.247, clamp(config.strength));
  const count = Math.max(1, Math.round(1 + config.strength * 2));
  const events: LigandEvent[] = [];

  for (let marker = 0.18; marker < frame.duration; marker += period) {
    if (wrappedAge(currentTime, marker, frame.duration) <= synapseVisualTiming.visibleSeconds) {
      events.push({
        count,
        ligandKind,
        marker,
        source: "ambient"
      });
    }
  }

  return events;
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

const getDrugPosition = (
  descriptor: Pick<LigandDescriptor, "index" | "ligandKind" | "marker">,
  age: number
): Point => {
  const seed = Math.round(descriptor.marker * 1000) + descriptor.index * 79 + descriptor.ligandKind.length * 997;
  const entersFromTop = seeded(seed + 1) < 0.5;
  const diffusionScale = Math.sqrt(Math.max(0, age));
  const startX = 142 + seeded(seed + 2) * 656;
  const startY = entersFromTop ? -30 : 590;
  const velocityX = (seeded(seed + 3) - 0.5) * 70;
  const velocityY = (entersFromTop ? 1 : -1) * (148 + seeded(seed + 4) * 70);
  const wanderX = 76;
  const wanderY = 58;

  return {
    x:
      startX +
      velocityX * age +
      cyclicNoise(seed + 11, age, 10, 3.2) * wanderX * diffusionScale +
      cyclicNoise(seed + 17, age, 7, 1.7) * wanderX * 0.28,
    y:
      startY +
      velocityY * age +
      cyclicNoise(seed + 23, age, 10, 3.2) * wanderY * diffusionScale +
      cyclicNoise(seed + 29, age, 7, 1.7) * wanderY * 0.32
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

const getReuptakePlan = (index: number, marker: number) => {
  const seed = Math.round(marker * 1000) + index * 47;
  const slotIndex = (index + Math.floor(marker * 10)) % transporterSlots.length;
  const enabled = seeded(seed + 8) < 0.58;
  const startAge = 0.68 + seeded(seed + 9) * 0.22;
  const endAge = startAge + 0.55 + seeded(seed + 10) * 0.16;

  return { enabled, endAge, slotIndex, startAge };
};

const getTransmitterTransportState = (
  descriptor: LigandDescriptor,
  age: number,
  blockedTransporterSlots: Set<number>
): TransportState => {
  const basePosition = getLigandPosition(descriptor, age);

  if (descriptor.source === "leak") {
    return { kind: "free", position: basePosition, pull: 0 };
  }

  const plan = getReuptakePlan(descriptor.index, descriptor.marker);
  const target = transporterSlots[plan.slotIndex];
  const startPosition = getLigandPosition(descriptor, plan.startAge);
  const startsBeforeReceptor = startPosition.x < receptorSlots[0].x - 28;

  if (
    blockedTransporterSlots.has(plan.slotIndex) ||
    !plan.enabled ||
    !startsBeforeReceptor ||
    age < plan.startAge
  ) {
    return { kind: "free", position: basePosition, pull: 0, transporterSlotIndex: plan.slotIndex };
  }

  const progress = clamp((age - plan.startAge) / (plan.endAge - plan.startAge));
  const eased = easeOutCubic(progress);
  const turbulence = Math.sin(age * 8.8 + descriptor.index) * 7 * progress * (1 - progress);
  const position = {
    x: lerp(startPosition.x, target.x, eased),
    y: lerp(startPosition.y, target.y, eased) + turbulence
  };

  return {
    absorbedAgo: progress >= 1 ? age - plan.endAge : undefined,
    kind: progress >= 1 ? "removed" : "reuptaking",
    position,
    pull: progress,
    transporterSlotIndex: plan.slotIndex
  };
};

const getCompatibleDrugTargetKinds = (ligandKind: LigandKind): BindingSiteKind[] => {
  if (ligandKind === "reuptake_inhibitor" || ligandKind === "releaser") {
    return ["transporter"];
  }

  if (ligandKind === "maoi") {
    return ["mao"];
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

    if (kind === "mao") {
      maoSlots.forEach((slot) => targets.push({ kind, slotIndex: slot.slotIndex }));
      return;
    }

    receptorSlots.forEach((slot) => targets.push({ kind, slotIndex: slot.slotIndex }));
  });

  return targets;
};

const findDrugCapture = (descriptor: LigandDescriptor): CaptureCandidate | null => {
  const compatibleTargets = getCompatibleDrugTargets(descriptor.ligandKind);

  if (compatibleTargets.length === 0) {
    return null;
  }

  for (let age = 0.04; age <= synapseVisualTiming.visibleSeconds; age += 0.025) {
    const position = getLigandPosition(descriptor, age);
    const sceneTime = descriptor.marker + age;
    const capture = compatibleTargets
      .map((target) => ({
        distance: Math.hypot(position.x - getCapturePoint(target, sceneTime).x, position.y - getCapturePoint(target, sceneTime).y),
        target
      }))
      .filter((candidate) => candidate.distance < drugCaptureRadius)
      .sort((left, right) => left.distance - right.distance)[0];

    if (capture) {
      return {
        age,
        position,
        target: capture.target
      };
    }
  }

  return null;
};

const findTransmitterCapture = (
  descriptor: LigandDescriptor,
  blockedReceptorSlots: Set<number>,
  blockedTransporterSlots: Set<number>,
  blockedMaoSlots: Set<number>
): CaptureCandidate | null => {
  for (let age = 0.04; age <= synapseVisualTiming.visibleSeconds; age += 0.025) {
    const transport = getTransmitterTransportState(descriptor, age, blockedTransporterSlots);

    if (transport.kind === "removed") {
      return null;
    }

    const slotIndex = receptorSlots.findIndex(
      (slot) =>
        !blockedReceptorSlots.has(slot.slotIndex) &&
        Math.hypot(transport.position.x - slot.x, transport.position.y - slot.y) < captureRadius
    );

    if (slotIndex !== -1) {
      return {
        age,
        position: transport.position,
        target: { kind: "receptor_orthosteric", slotIndex }
      };
    }

    const maoSlotIndex = maoSlots.findIndex((slot) => {
      if (blockedMaoSlots.has(slot.slotIndex)) {
        return false;
      }

      const maoPosition = getMaoPosition(slot.slotIndex, descriptor.marker + age);
      return Math.hypot(transport.position.x - maoPosition.x, transport.position.y - maoPosition.y) < maoCaptureRadius;
    });

    if (maoSlotIndex !== -1) {
      return {
        age,
        position: transport.position,
        target: { kind: "mao", slotIndex: maoSlotIndex }
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
    ? synapseVisualTiming.dockSeconds + synapseVisualTiming.boundSeconds
    : synapseVisualTiming.dockSeconds + synapseVisualTiming.drugBoundSeconds;

const assignSiteCaptures = (
  descriptors: LigandDescriptor[],
  targetKind: BindingSiteKind,
  occupiedSlots = new Set<number>()
) => {
  const assigned = new Map<string, CaptureCandidate>();
  const occupied = new Set(occupiedSlots);

  descriptors
    .filter((descriptor) => {
      const capture = descriptor.capture;
      return (
        capture &&
        capture.target.kind === targetKind &&
        descriptor.age >= capture.age &&
        descriptor.age <= capture.age + getActiveSeconds(descriptor)
      );
    })
    .sort((left, right) => {
      const leftCapturedAgo = left.capture ? left.age - left.capture.age : 0;
      const rightCapturedAgo = right.capture ? right.age - right.capture.age : 0;
      return rightCapturedAgo - leftCapturedAgo;
    })
    .forEach((descriptor) => {
      const capture = descriptor.capture;

      if (capture && !occupied.has(capture.target.slotIndex)) {
        occupied.add(capture.target.slotIndex);
        assigned.set(descriptor.id, capture);
      }
    });

  return { assigned, occupied };
};

const makeDockedLigand = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate,
  currentTime: number
): DockedLigand | null => {
  const dockedAge = descriptor.age - capture.age - synapseVisualTiming.dockSeconds;

  if (dockedAge < 0) {
    return null;
  }

  return {
    age: dockedAge,
    alpha: clamp((getActiveSeconds(descriptor) - (descriptor.age - capture.age)) / 0.22),
    id: descriptor.id,
    ligandKind: descriptor.ligandKind,
    position: getTargetPoint(capture.target, currentTime),
    target: capture.target
  };
};

const buildSignalNote = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate,
  intensity: number,
  emittedAtAge = capture.age + synapseVisualTiming.dockSeconds,
  idSuffix = "note"
): SignalNote | null => {
  const noteAge = descriptor.age - emittedAtAge;

  if (noteAge < 0 || noteAge > synapseVisualTiming.noteSeconds) {
    return null;
  }

  const slot = receptorSlots[capture.target.slotIndex];
  const progress = clamp(noteAge / synapseVisualTiming.noteSeconds);
  const eased = easeOutCubic(progress);
  const fadeIn = clamp(noteAge / 0.14);
  const fadeOut = clamp((synapseVisualTiming.noteSeconds - noteAge) / 0.42);
  const lateralDrift =
    Math.sin(noteAge * 5.4 + descriptor.index * 0.7 + emittedAtAge * 1.3) * 3.2 * (1 - progress);

  return {
    age: noteAge,
    alpha: 0.9 * fadeIn * fadeOut,
    id: `${descriptor.id}-${idSuffix}`,
    intensity,
    position: {
      x: slot.x + slot.inwardNormal.x * (40 + 62 * eased) + slot.tangent.x * lateralDrift,
      y: slot.y + slot.inwardNormal.y * (40 + 62 * eased) + slot.tangent.y * lateralDrift
    },
    scale: (0.72 + 0.2 * (1 - progress)) * intensity,
    slotIndex: capture.target.slotIndex
  };
};

const buildAgonistSignalNotes = (descriptor: LigandDescriptor, capture: CaptureCandidate): SignalNote[] => {
  const firstEmissionAge = capture.age + synapseVisualTiming.dockSeconds;
  const activeAge = descriptor.age - firstEmissionAge;

  if (activeAge < 0) {
    return [];
  }

  const notePeriod = 0.58;
  const latestPulseIndex = Math.floor(activeAge / notePeriod);
  const notes: SignalNote[] = [];

  for (let pulseIndex = 0; pulseIndex <= latestPulseIndex; pulseIndex += 1) {
    const note = buildSignalNote(
      descriptor,
      capture,
      1,
      firstEmissionAge + pulseIndex * notePeriod,
      `note-${pulseIndex}`
    );

    if (note && note.alpha > 0.02) {
      notes.push(note);
    }
  }

  return notes;
};

const makeDescriptor = (
  event: LigandEvent,
  index: number,
  age: number,
  target?: BindingTarget
): LigandDescriptor => ({
  age,
  capture: null,
  id: `${event.source}-${event.ligandKind}-${event.marker.toFixed(3)}-${index}`,
  index,
  ligandKind: event.ligandKind,
  marker: event.marker,
  source: event.source,
  target
});

const buildDrugDescriptors = (
  frame: SimulationFrame,
  currentTime: number,
  config: InterventionVisualConfig
) =>
  getAmbientDrugEvents(frame, currentTime, config).flatMap((event) =>
    Array.from({ length: event.count }, (_, index) => {
      const age = wrappedAge(currentTime, event.marker, frame.duration);
      const descriptor = makeDescriptor(event, index, age);
      descriptor.capture = findDrugCapture(descriptor);
      return descriptor;
    })
  );

const buildPulseDescriptors = (
  frame: SimulationFrame,
  currentTime: number,
  moleculeCount: number
) =>
  getPulseEvents(frame, currentTime, moleculeCount).flatMap((event) =>
    Array.from({ length: event.count }, (_, index) =>
      makeDescriptor(event, index, wrappedAge(currentTime, event.marker, frame.duration))
    )
  );

const buildLeakDescriptors = (
  frame: SimulationFrame,
  currentTime: number,
  releaserTransporters: TransporterOccupancy[],
  strength: number
) => {
  if (strength <= 0 || releaserTransporters.length === 0) {
    return [];
  }

  const period = lerp(0.72, 0.34, clamp(strength));
  const count = Math.max(1, Math.round(1 + strength * 2));
  const events: LigandEvent[] = [];

  releaserTransporters.forEach((transporter) => {
    for (let marker = 0.26 + transporter.slotIndex * 0.16; marker < frame.duration; marker += period) {
      if (wrappedAge(currentTime, marker, frame.duration) <= synapseVisualTiming.visibleSeconds) {
        events.push({
          count,
          ligandKind: "transmitter",
          marker,
          source: "leak"
        });
      }
    }
  });

  return events.flatMap((event) =>
    Array.from({ length: event.count }, (_, index) => {
      const age = wrappedAge(currentTime, event.marker, frame.duration);
      const transporterSlotIndex = releaserTransporters[(index + Math.floor(event.marker * 10)) % releaserTransporters.length]
        .slotIndex;
      return makeDescriptor(event, index, age, {
        kind: "transporter",
        slotIndex: transporterSlotIndex
      });
    })
  );
};

const buildVisualMolecule = (
  descriptor: LigandDescriptor,
  capture: CaptureCandidate | undefined,
  blockedTransporterSlots: Set<number>,
  currentTime: number
): VisualMolecule | null => {
  if (capture) {
    const dockProgress = easeOutCubic((descriptor.age - capture.age) / synapseVisualTiming.dockSeconds);

    if (dockProgress >= 1) {
      return null;
    }

    const target = getTargetPoint(capture.target, currentTime);

    return {
      alpha: 1,
      color: ligandColors[descriptor.ligandKind],
      ligandKind: descriptor.ligandKind,
      position: {
        x: lerp(capture.position.x, target.x, dockProgress),
        y: lerp(capture.position.y, target.y, dockProgress)
      },
      pull: 0,
      radius: descriptor.ligandKind === "transmitter" ? 7.2 + dockProgress * 0.55 : 6.8,
      shape: descriptor.ligandKind === "transmitter" ? "circle" : "rounded_diamond"
    };
  }

  if (descriptor.capture && descriptor.age >= descriptor.capture.age) {
    return null;
  }

  const transport =
    descriptor.ligandKind === "transmitter"
      ? getTransmitterTransportState(descriptor, descriptor.age, blockedTransporterSlots)
      : { kind: "free" as const, position: getLigandPosition(descriptor, descriptor.age), pull: 0 };
  const membraneX = getDendriteMembraneXAtY(transport.position.y);

  if (transport.kind === "removed" || transport.position.x >= membraneX) {
    return null;
  }

  const membraneFadeStartX = membraneX - 32;
  const membraneFade =
    transport.position.x <= membraneFadeStartX
      ? 1
      : clamp((membraneX - transport.position.x) / (membraneX - membraneFadeStartX));
  const alpha = 0.88 * getOpacity(descriptor.age) * membraneFade;

  if (alpha <= 0.02) {
    return null;
  }

  return {
    alpha,
    color: ligandColors[descriptor.ligandKind],
    ligandKind: descriptor.ligandKind,
    position: transport.position,
    pull: transport.pull,
    radius: descriptor.ligandKind === "transmitter" ? 7.2 * (1 - transport.pull * 0.35) : 6.5,
    shape: descriptor.ligandKind === "transmitter" ? "circle" : "rounded_diamond"
  };
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

const createEmptyMaoOccupancies = (currentTime: number): MaoOccupancy[] =>
  maoSlots.map((slot) => ({
    activation: 0,
    degrading: false,
    position: getMaoPosition(slot.slotIndex, currentTime),
    slotIndex: slot.slotIndex
  }));

export const buildVisualState = (
  frame: SimulationFrame,
  currentTime: number,
  moleculesPerPulse: number,
  config: InterventionVisualConfig
): VisualState => {
  const moleculeCount = Math.round(clamp(moleculesPerPulse, 1, 30));
  const drugDescriptors = buildDrugDescriptors(frame, currentTime, config);
  const transporterDrugDescriptors = drugDescriptors.filter(
    (descriptor) =>
      descriptor.ligandKind === "reuptake_inhibitor" || descriptor.ligandKind === "releaser"
  );
  const maoDrugDescriptors = drugDescriptors.filter((descriptor) => descriptor.ligandKind === "maoi");
  const orthostericDrugDescriptors = drugDescriptors.filter(
    (descriptor) => descriptor.ligandKind === "agonist" || descriptor.ligandKind === "antagonist"
  );
  const pamDescriptors = drugDescriptors.filter((descriptor) => descriptor.ligandKind === "pam");

  const transporterAssignments = assignSiteCaptures(transporterDrugDescriptors, "transporter");
  const transporterOccupancies = createEmptyTransporterOccupancies();
  const transporterDocked = transporterDrugDescriptors.flatMap((descriptor): DockedLigand[] => {
    const capture = transporterAssignments.assigned.get(descriptor.id);
    const docked = capture ? makeDockedLigand(descriptor, capture, currentTime) : null;
    if (!capture || !docked) {
      return [];
    }

    const occupancy = transporterOccupancies[capture.target.slotIndex];
    occupancy.ligand = docked;
    occupancy.leaking = descriptor.ligandKind === "releaser";
    return [docked];
  });
  const blockedTransporterSlots = new Set(
    transporterOccupancies
      .filter((occupancy) => occupancy.ligand)
      .map((occupancy) => occupancy.slotIndex)
  );
  const releaserTransporters = transporterOccupancies.filter(
    (occupancy) => occupancy.ligand?.ligandKind === "releaser"
  );
  const maoAssignments = assignSiteCaptures(maoDrugDescriptors, "mao");
  const maoOccupancies = createEmptyMaoOccupancies(currentTime);
  const maoDocked = maoDrugDescriptors.flatMap((descriptor): DockedLigand[] => {
    const capture = maoAssignments.assigned.get(descriptor.id);
    const docked = capture ? makeDockedLigand(descriptor, capture, currentTime) : null;
    if (!capture || !docked) {
      return [];
    }

    maoOccupancies[capture.target.slotIndex].ligand = docked;
    return [docked];
  });
  const blockedMaoSlots = new Set(
    maoOccupancies
      .filter((occupancy) => occupancy.ligand)
      .map((occupancy) => occupancy.slotIndex)
  );

  const allostericAssignments = assignSiteCaptures(pamDescriptors, "receptor_allosteric");
  const orthostericDrugAssignments = assignSiteCaptures(
    orthostericDrugDescriptors,
    "receptor_orthosteric"
  );
  const blockedReceptorSlots = new Set(orthostericDrugAssignments.occupied);

  const transmitterDescriptors = [
    ...buildPulseDescriptors(frame, currentTime, moleculeCount),
    ...buildLeakDescriptors(frame, currentTime, releaserTransporters, config.id === "releaser" ? config.strength : 0)
  ];
  transmitterDescriptors.forEach((descriptor) => {
    descriptor.capture = findTransmitterCapture(
      descriptor,
      blockedReceptorSlots,
      blockedTransporterSlots,
      blockedMaoSlots
    );
  });
  const transmitterAssignments = assignSiteCaptures(
    transmitterDescriptors,
    "receptor_orthosteric",
    blockedReceptorSlots
  );
  const maoTransmitterAssignments = assignSiteCaptures(
    transmitterDescriptors,
    "mao",
    blockedMaoSlots
  );

  const receptorOccupancies = createEmptyReceptorOccupancies();
  const dockedLigands: DockedLigand[] = [...transporterDocked, ...maoDocked];

  pamDescriptors.forEach((descriptor) => {
    const capture = allostericAssignments.assigned.get(descriptor.id);
    const docked = capture ? makeDockedLigand(descriptor, capture, currentTime) : null;
    if (capture && docked) {
      receptorOccupancies[capture.target.slotIndex].allosteric = docked;
      dockedLigands.push(docked);
    }
  });

  orthostericDrugDescriptors.forEach((descriptor) => {
    const capture = orthostericDrugAssignments.assigned.get(descriptor.id);
    const docked = capture ? makeDockedLigand(descriptor, capture, currentTime) : null;
    if (capture && docked) {
      const occupancy = receptorOccupancies[capture.target.slotIndex];
      occupancy.orthosteric = docked;
      occupancy.active = descriptor.ligandKind === "agonist";
      occupancy.noteIntensity = 1;
      dockedLigands.push(docked);
    }
  });

  transmitterDescriptors.forEach((descriptor) => {
    const capture = transmitterAssignments.assigned.get(descriptor.id);
    const docked = capture ? makeDockedLigand(descriptor, capture, currentTime) : null;
    if (capture && docked) {
      const occupancy = receptorOccupancies[capture.target.slotIndex];
      occupancy.orthosteric = docked;
      occupancy.active = true;
      occupancy.noteIntensity = occupancy.allosteric?.ligandKind === "pam" ? 2.2 : 1;
      dockedLigands.push(docked);
    }
  });

  const allDescriptors = [...drugDescriptors, ...transmitterDescriptors];
  const molecules = allDescriptors.flatMap((descriptor): VisualMolecule[] => {
    const capture =
      transporterAssignments.assigned.get(descriptor.id) ??
      allostericAssignments.assigned.get(descriptor.id) ??
      orthostericDrugAssignments.assigned.get(descriptor.id) ??
      maoAssignments.assigned.get(descriptor.id) ??
      maoTransmitterAssignments.assigned.get(descriptor.id) ??
      transmitterAssignments.assigned.get(descriptor.id);
    const molecule = buildVisualMolecule(descriptor, capture, blockedTransporterSlots, currentTime);
    return molecule ? [molecule] : [];
  });

  transmitterDescriptors.forEach((descriptor) => {
    const transport = getTransmitterTransportState(descriptor, descriptor.age, blockedTransporterSlots);
    if (transport.kind !== "removed" || transport.absorbedAgo === undefined || transport.transporterSlotIndex === undefined) {
      return;
    }

    const occupancy = transporterOccupancies[transport.transporterSlotIndex];
    occupancy.activation = Math.max(
      occupancy.activation,
      clamp(1 - transport.absorbedAgo / synapseVisualTiming.reuptakeFlashSeconds)
    );
    occupancy.absorbing = occupancy.activation > 0.05;
  });

  transmitterDescriptors.forEach((descriptor) => {
    const capture = maoTransmitterAssignments.assigned.get(descriptor.id);
    if (!capture) {
      return;
    }

    const docked = makeDockedLigand(descriptor, capture, currentTime);
    const capturedAgo = descriptor.age - capture.age;
    const occupancy = maoOccupancies[capture.target.slotIndex];
    const degradationAge = capturedAgo - synapseVisualTiming.dockSeconds;
    occupancy.activation = Math.max(
      occupancy.activation,
      degradationAge < 0 ? 0 : clamp(1 - degradationAge / 0.38)
    );
    occupancy.degrading = occupancy.activation > 0.05;
    if (docked) {
      dockedLigands.push(docked);
    }
  });

  const signalNotes = [...transmitterDescriptors, ...orthostericDrugDescriptors].flatMap(
    (descriptor): SignalNote[] => {
      const capture =
        descriptor.ligandKind === "transmitter"
          ? transmitterAssignments.assigned.get(descriptor.id)
          : orthostericDrugAssignments.assigned.get(descriptor.id);

      if (!capture || descriptor.ligandKind === "antagonist") {
        return [];
      }

      if (descriptor.ligandKind === "agonist") {
        return buildAgonistSignalNotes(descriptor, capture);
      }

      const receptor = receptorOccupancies[capture.target.slotIndex];
      const intensity = descriptor.ligandKind === "transmitter" ? receptor.noteIntensity : 1;
      const note = buildSignalNote(descriptor, capture, intensity);
      return note && note.alpha > 0.02 ? [note] : [];
    }
  );

  return {
    dockedLigands,
    maoOccupancies,
    molecules,
    receptorOccupancies,
    signalNotes,
    transporterOccupancies
  };
};
