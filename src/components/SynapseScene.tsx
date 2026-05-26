import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent
} from "react";
import { Gauge, Moon, Pause, Play, Sun, Volume2, VolumeX } from "lucide-react";
import type { InterventionId, SimulationFrame } from "../simulation/types";
import { signalTimelineDefaults, type TimelineNote } from "./signalTimelineModel";
import {
  AllostericSiteOutline,
  DockedLigandMarker,
  DockedTransporterDrug,
  ReceptorGlyph,
  SignalNoteGlyph,
  TransporterGlyph,
  drawRoundedDiamond,
  type TransporterConformation
} from "./SynapseGlyphs";
import {
  boutonCenter,
  boutonRadius,
  buildVisualState,
  dendriteCenter,
  dendriteRadius,
  ligandColors,
  receptorSlots,
  reuptakeActiveColor,
  reuptakeBaseColor,
  synapseCenterY,
  synapseVisualTiming,
  transporterSlots,
  visualPalette,
  type DockedLigand,
  type SignalNote,
  type SignalSustain,
  type VisualMolecule
} from "./synapseVisualModel";

export { getReceptorRenderColors } from "./SynapseGlyphs";

interface SynapseSceneProps {
  drugStrength: number;
  frame: SimulationFrame;
  isPaused?: boolean;
  moleculesPerPulse: number;
  onTogglePaused?: () => void;
  onTogglePlaybackRate?: () => void;
  onToggleTheme: () => void;
  playbackRate?: number;
  selected: InterventionId;
  themeMode: "light" | "dark";
  currentTime: number;
}

function drawTransmitters(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  molecules: VisualMolecule[]
) {
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
  context.shadowBlur = 0;

  molecules.forEach((molecule) => {
    context.save();
    context.globalAlpha = molecule.alpha;
    context.fillStyle = molecule.color;
    context.translate(molecule.position.x, molecule.position.y);

    context.beginPath();
    if (molecule.shape === "rounded_diamond") {
      drawRoundedDiamond(context, molecule.radius * 1.24);
    } else {
      context.arc(0, 0, molecule.radius, 0, Math.PI * 2);
    }
    context.fill();

    context.globalAlpha = molecule.alpha * 0.78;
    context.strokeStyle = "rgba(255,255,255,0.88)";
    context.lineWidth = molecule.ligandKind === "transmitter" ? 1.9 : 2.2;
    context.stroke();
    context.restore();
  });
}

interface TimelineHistoryEntry {
  emittedAt: number;
  id: string;
  intensity: number;
  slotIndex: number;
}

interface TimelineSustainEntry {
  duration: number;
  id: string;
  intensity: number;
  slotIndex: number;
  startedAt: number;
}

interface TimelineSustain {
  duration: number;
  elapsed: number;
  id: string;
  intensity: number;
  slotIndex: number;
}

interface TimelineHistoryClock {
  baseTime: number;
  lastTime: number;
  notes: Map<string, TimelineHistoryEntry>;
  scopeKey: string;
  sustains: Map<string, TimelineSustainEntry>;
}

interface ReleaseVesicle {
  alpha: number;
  contentAlpha: number;
  fusion: number;
  id: string;
  radius: number;
  seed: number;
  x: number;
  y: number;
}

interface ScenePointer {
  localX: number;
  localY: number;
  sceneX: number;
  sceneY: number;
  stageHeight: number;
  stageWidth: number;
}

interface SceneTooltip {
  body: string;
  title: string;
  x: number;
  y: number;
}

type BrowserAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

interface SustainedTone {
  gain: GainNode;
  oscillator: OscillatorNode;
}

const releaseSite = {
  x: boutonCenter.x + boutonRadius - 10,
  y: synapseCenterY
};

const timelineViewBox = {
  height: 126,
  plotLeft: 58,
  plotRight: 906,
  staffGap: 18,
  staffTop: 39,
  width: 960
};
const sceneCanvasViewBox = {
  height: 560,
  width: 960
};
const visibleSceneHeight = 470;
const sceneViewportTop = (560 - visibleSceneHeight) / 2;

const receptorFrequencies = [783.99, 659.25, 587.33, 523.25, 440];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress;
const distance = (leftX: number, leftY: number, rightX: number, rightY: number) =>
  Math.hypot(leftX - rightX, leftY - rightY);
const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const easeOutCubic = (value: number) => 1 - (1 - clamp(value)) ** 3;

export const resizeMoleculeCanvasForDisplay = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1
) => {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = rect.width || sceneCanvasViewBox.width;
  const cssHeight = rect.height || sceneCanvasViewBox.height;
  const pixelRatio = Math.max(1, devicePixelRatio);
  const pixelWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(cssHeight * pixelRatio));

  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }

  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }

  context.setTransform(
    pixelWidth / sceneCanvasViewBox.width,
    0,
    0,
    pixelHeight / sceneCanvasViewBox.height,
    0,
    0
  );

  return sceneCanvasViewBox;
};

const getVesicleTransmitters = (vesicle: ReleaseVesicle) => {
  const count = 1 + Math.floor(seeded(vesicle.seed + 21) * 3);
  const radii = Array.from(
    { length: count },
    (_, index) => 4.4 + seeded(vesicle.seed + 43 + index * 13) * 1.8
  );
  const largestRadius = Math.max(...radii);
  const baseAngle = seeded(vesicle.seed + 59) * Math.PI * 2;
  const ringRadius =
    count === 1 ? vesicle.radius * 0.14 : Math.max(0, vesicle.radius - largestRadius * 0.82 - 0.8);

  return radii.map((radius, index) => {
    const angle = baseAngle + (index / count) * Math.PI * 2;
    const jitter = count === 1 ? 0 : (seeded(vesicle.seed + 71 + index * 17) - 0.5) * 1.4;

    return {
      id: `${vesicle.id}-transmitter-${index}`,
      radius,
      x: vesicle.x + Math.cos(angle) * (ringRadius + jitter),
      y: vesicle.y + Math.sin(angle) * (ringRadius + jitter)
    };
  });
};

const getAudioContext = (audioContextRef: MutableRefObject<AudioContext | null>) => {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as BrowserAudioWindow;
  const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContextRef.current || audioContextRef.current.state === "closed") {
    audioContextRef.current = new AudioContextConstructor();
  }

  return audioContextRef.current;
};

export const getSignalToneAudioSpec = (note: Pick<SignalNote, "intensity">) => {
  const isEnhanced = note.intensity > 1;

  return {
    duration: isEnhanced ? 0.3 : 0.2,
    peakGain: 0.06 * (isEnhanced ? 1.5 : 1)
  };
};

const playSignalTone = (audioContext: AudioContext, note: SignalNote) => {
  const frequency = receptorFrequencies[note.slotIndex] ?? receptorFrequencies[2];
  const now = audioContext.currentTime;
  const { duration, peakGain } = getSignalToneAudioSpec(note);
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
};

const startSustainedTone = (audioContext: AudioContext, sustain: SignalSustain): SustainedTone => {
  const frequency = receptorFrequencies[sustain.slotIndex] ?? receptorFrequencies[2];
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.03 * Math.min(1.2, sustain.intensity), now + 0.08);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);

  return { gain, oscillator };
};

const stopSustainedTone = (tone: SustainedTone, audioContext: AudioContext) => {
  const now = audioContext.currentTime;

  tone.gain.gain.cancelScheduledValues(now);
  tone.gain.gain.setTargetAtTime(0.0001, now, 0.035);
  tone.oscillator.stop(now + 0.16);
  tone.oscillator.onended = () => {
    tone.oscillator.disconnect();
    tone.gain.disconnect();
  };
};

const stopAllSustainedTones = (
  sustainedToneRefs: MutableRefObject<Map<string, SustainedTone>>,
  audioContext: AudioContext | null
) => {
  if (!audioContext || audioContext.state === "closed") {
    sustainedToneRefs.current.clear();
    return;
  }

  sustainedToneRefs.current.forEach((tone) => stopSustainedTone(tone, audioContext));
  sustainedToneRefs.current.clear();
};

export const getSignalNotePlaybackId = (
  note: Pick<SignalNote, "age" | "id"> & Partial<Pick<SignalNote, "emittedAt">>,
  currentTime: number,
  duration: number
) => {
  const safeDuration = Math.max(0.001, duration);
  const emittedAt = Math.max(0, note.emittedAt ?? currentTime - Math.max(0, note.age));
  const cycleIndex = Math.floor((emittedAt + 0.000001) / safeDuration);

  return `${cycleIndex}:${note.id}`;
};

export const getSignalSustainPlaybackId = (
  sustain: Pick<SignalSustain, "age" | "id"> & Partial<Pick<SignalSustain, "startedAt">>,
  currentTime: number,
  duration: number
) => {
  const safeDuration = Math.max(0.001, duration);
  const startedAt = Math.max(0, sustain.startedAt ?? currentTime - Math.max(0, sustain.age));
  const cycleIndex = Math.floor((startedAt + 0.000001) / safeDuration);

  return `${cycleIndex}:${sustain.id}`;
};

const getCurrentPlaybackCycle = (currentTime: number, duration: number) =>
  Math.floor(Math.max(0, currentTime) / Math.max(0.001, duration));

const prunePlayedNoteIds = (playedNoteIds: Set<string>, currentCycle: number) =>
  new Set(
    [...playedNoteIds].filter((id) => {
      const cycle = Number(id.split(":", 1)[0]);
      return Number.isFinite(cycle) && cycle >= currentCycle - 1;
    })
  );

const getRepeatingEventAge = (currentTime: number, marker: number, duration: number) => {
  if (currentTime < marker) {
    return Number.POSITIVE_INFINITY;
  }

  return (currentTime - marker) % duration;
};

const getBoutonMembraneXAtY = (y: number) => {
  const dy = y - boutonCenter.y;

  if (Math.abs(dy) >= boutonRadius) {
    return boutonCenter.x;
  }

  return boutonCenter.x + Math.sqrt(Math.max(0, boutonRadius ** 2 - dy ** 2));
};

const getDendriteMembraneXAtY = (y: number) => {
  const dy = y - dendriteCenter.y;

  if (Math.abs(dy) >= dendriteRadius) {
    return dendriteCenter.x;
  }

  return dendriteCenter.x - Math.sqrt(Math.max(0, dendriteRadius ** 2 - dy ** 2));
};

const isInsideAxon = (sceneX: number, sceneY: number) =>
  Math.abs(sceneY - boutonCenter.y) <= boutonRadius && sceneX <= getBoutonMembraneXAtY(sceneY);

const isInsideDendrite = (sceneX: number, sceneY: number) =>
  Math.abs(sceneY - dendriteCenter.y) <= dendriteRadius && sceneX >= getDendriteMembraneXAtY(sceneY);

const buildReleaseVesicles = (frame: SimulationFrame, currentTime: number): ReleaseVesicle[] => {
  const vesicleWindowSeconds = synapseVisualTiming.releaseDelaySeconds + 0.44;
  const vesiclesPerPulse = 3;

  return frame.eventMarkers.flatMap((marker) => {
    const age = getRepeatingEventAge(currentTime, marker, frame.duration);

    if (age > vesicleWindowSeconds) {
      return [];
    }

    return Array.from({ length: vesiclesPerPulse }, (_, index): ReleaseVesicle | null => {
      const localAge = age - index * 0.055;
      const seed = Math.round(marker * 1000) + index * 137;

      if (localAge < 0 || localAge > vesicleWindowSeconds) {
        return null;
      }

      const progress = easeOutCubic(localAge / synapseVisualTiming.releaseDelaySeconds);
      const fadeIn = clamp(localAge / 0.12);
      const fadeOut = clamp((vesicleWindowSeconds - localAge) / 0.32);
      const alpha = 0.36 * fadeIn * fadeOut;
      const contentAlpha =
        age < synapseVisualTiming.releaseDelaySeconds
          ? alpha * clamp((synapseVisualTiming.releaseDelaySeconds - age) / 0.04)
          : 0;
      const membraneOffset =
        (index - (vesiclesPerPulse - 1) / 2) * 56 + (seeded(seed + 4) - 0.5) * 22;
      const targetY = releaseSite.y + membraneOffset;
      const targetX = getBoutonMembraneXAtY(targetY) - 7 + (seeded(seed + 3) - 0.5) * 4;
      const startX = targetX - 78 - seeded(seed + 1) * 34;
      const startY = targetY + (seeded(seed + 2) - 0.5) * 62;
      const drift = Math.sin(localAge * 8.4 + seeded(seed + 5) * Math.PI * 2) * 5.5 * (1 - progress);

      return {
        alpha,
        contentAlpha,
        fusion:
          clamp((localAge - (synapseVisualTiming.releaseDelaySeconds - 0.08)) / 0.16) * fadeOut,
        id: `vesicle-${marker.toFixed(3)}-${index}`,
        radius: 13 + seeded(seed + 6) * 3,
        seed,
        x: lerp(startX, targetX, progress),
        y: lerp(startY, targetY, progress) + drift
      };
    }).filter((vesicle): vesicle is ReleaseVesicle => vesicle !== null);
  });
};

const ligandTooltipCopy = {
  agonist: {
    body: "A drug ligand that activates a receptor directly after docking.",
    title: "Agonist molecule"
  },
  antagonist: {
    body: "A drug ligand that occupies the receptor pocket without activating it.",
    title: "Antagonist molecule"
  },
  pam: {
    body: "A modulator that binds an allosteric side site and boosts later transmitter-driven activation.",
    title: "PAM molecule"
  },
  releaser: {
    body: "A drug ligand that binds transporter sites and makes them leak endogenous transmitter.",
    title: "Releaser molecule"
  },
  reuptake_inhibitor: {
    body: "A drug ligand that binds transporter sites and blocks transmitter uptake.",
    title: "Reuptake inhibitor"
  },
  transmitter: {
    body: "Endogenous transmitter diffusing through the cleft. It can dock into an open receptor, be cleared by local transporters, or diffuse out of the modeled cleft.",
    title: "Transmitter"
  }
} satisfies Record<VisualMolecule["ligandKind"], { body: string; title: string }>;

const dockedLigandTooltipCopy = (ligand: DockedLigand) => {
  if (ligand.target.kind === "transporter") {
    return ligand.ligandKind === "releaser"
      ? {
          body: "This occupied transporter is leaking transmitter into the cleft.",
          title: "Releaser-bound transporter"
        }
      : {
          body: "This occupied transporter is blocked from taking transmitter back up.",
          title: "Blocked transporter"
        };
  }

  if (ligand.ligandKind === "pam") {
    return {
      body: "A PAM is docked at the allosteric side site. It does not signal alone.",
      title: "Allosteric ligand"
    };
  }

  if (ligand.ligandKind === "agonist") {
    return {
      body: "The agonist is docked in the receptor pocket and directly drives receptor signaling.",
      title: "Docked agonist"
    };
  }

  if (ligand.ligandKind === "antagonist") {
    return {
      body: "The antagonist is occupying the receptor pocket and preventing activation here.",
      title: "Docked antagonist"
    };
  }

  return {
    body: "The transmitter is locked into the receptor pocket for a brief activation window.",
    title: "Docked transmitter"
  };
};

const tooltipPosition = (pointer: ScenePointer) => ({
  x: clamp(pointer.localX + 14, 8, Math.max(8, pointer.stageWidth - 248)),
  y: clamp(pointer.localY + 14, 8, Math.max(8, pointer.stageHeight - 92))
});

const makeTooltip = (
  pointer: ScenePointer,
  visualState: ReturnType<typeof buildVisualState>,
  releaseVesicles: ReleaseVesicle[]
): SceneTooltip | null => {
  const { sceneX, sceneY } = pointer;
  const position = tooltipPosition(pointer);
  const molecule = [...visualState.molecules]
    .reverse()
    .find((candidate) => distance(sceneX, sceneY, candidate.position.x, candidate.position.y) <= candidate.radius + 9);

  if (molecule) {
    return {
      ...position,
      ...ligandTooltipCopy[molecule.ligandKind]
    };
  }

  const dockedLigand = [...visualState.dockedLigands]
    .reverse()
    .find((candidate) => distance(sceneX, sceneY, candidate.position.x, candidate.position.y) <= 17);

  if (dockedLigand) {
    return {
      ...position,
      ...dockedLigandTooltipCopy(dockedLigand)
    };
  }

  const vesicle = releaseVesicles.find(
    (candidate) => distance(sceneX, sceneY, candidate.x, candidate.y) <= candidate.radius + 6
  );

  if (vesicle) {
    return {
      ...position,
      body: "A presynaptic vesicle drifting toward the membrane. Transmitter appears outside only after fusion.",
      title: "Release vesicle"
    };
  }

  const allostericSite = receptorSlots.find(
    (slot) => distance(sceneX, sceneY, slot.allosteric.x, slot.allosteric.y) <= 18
  );

  if (allostericSite) {
    return {
      ...position,
      body: "An allosteric side site. PAM molecules can bind here without signaling alone, then boost later transmitter-driven activation.",
      title: "Allosteric site"
    };
  }

  const receptor = receptorSlots.find((slot) => distance(sceneX, sceneY, slot.x, slot.y) <= 38);

  if (receptor) {
    const occupancy = visualState.receptorOccupancies[receptor.slotIndex];
    return {
      ...position,
      body: occupancy.active
        ? "This receptor is active because an activating ligand is currently docked."
        : occupancy.orthosteric
          ? "This receptor pocket is occupied, but it is not producing a signal."
          : occupancy.allosteric
            ? "This receptor has an allosteric modulator docked and is waiting for transmitter."
            : "An open receptor pocket. Transmitter or receptor-targeting drugs can bind here.",
      title: occupancy.active ? "Active receptor" : "Receptor site"
    };
  }

  const transporter = transporterSlots.find((slot) => distance(sceneX, sceneY, slot.x, slot.y) <= 42);

  if (transporter) {
    const occupancy = visualState.transporterOccupancies[transporter.slotIndex];
    return {
      ...position,
      body: occupancy.leaking
        ? "This transporter is occupied by a releaser and is leaking transmitter."
        : occupancy.ligand
          ? "This transporter is occupied by a drug molecule and cannot clear transmitter."
          : occupancy.absorbing
            ? "This transporter is actively taking transmitter back into the axon."
            : "An open transporter site that can clear nearby transmitter from the cleft.",
      title: occupancy.leaking ? "Leaking transporter" : "Transporter site"
    };
  }

  if (isInsideAxon(sceneX, sceneY)) {
    return {
      ...position,
      body: "Presynaptic side. Vesicles fuse at the membrane before transmitter enters the cleft.",
      title: "Axon bouton"
    };
  }

  if (isInsideDendrite(sceneX, sceneY)) {
    return {
      ...position,
      body: "Postsynaptic side. Receptor activations here produce the visual and audible signal notes.",
      title: "Dendrite"
    };
  }

  if (
    Math.abs(sceneY - synapseCenterY) <= boutonRadius &&
    sceneX > getBoutonMembraneXAtY(sceneY) &&
    sceneX < getDendriteMembraneXAtY(sceneY)
  ) {
    return {
      ...position,
      body: "Extracellular gap where transmitter diffuses between release, uptake, and receptor binding.",
      title: "Synaptic cleft"
    };
  }

  return null;
};

const sameTooltip = (left: SceneTooltip | null, right: SceneTooltip | null) =>
  left?.title === right?.title &&
  left?.body === right?.body &&
  Math.round(left?.x ?? -1) === Math.round(right?.x ?? -1) &&
  Math.round(left?.y ?? -1) === Math.round(right?.y ?? -1);

function useReceptorTimelineSignals(
  signalNotes: SignalNote[],
  signalSustains: SignalSustain[],
  currentTime: number,
  duration: number,
  scopeKey: string
): { notes: TimelineNote[]; sustains: TimelineSustain[] } {
  const historyRef = useRef<TimelineHistoryClock>({
    baseTime: 0,
    lastTime: currentTime,
    notes: new Map(),
    scopeKey,
    sustains: new Map()
  });
  const history = historyRef.current;

  if (history.scopeKey !== scopeKey) {
    history.baseTime = 0;
    history.lastTime = currentTime;
    history.notes.clear();
    history.sustains.clear();
    history.scopeKey = scopeKey;
  }

  if (currentTime < history.lastTime - duration * 0.5) {
    history.baseTime += duration;
  }

  history.lastTime = currentTime;
  const absoluteNow = history.baseTime + currentTime;

  signalNotes.forEach((note) => {
    if (history.notes.has(note.id)) {
      return;
    }

    history.notes.set(note.id, {
      emittedAt: note.emittedAt ?? absoluteNow,
      id: note.id,
      intensity: note.intensity,
      slotIndex: note.slotIndex
    });
  });

  signalSustains.forEach((sustain) => {
    const id = getSignalSustainPlaybackId(sustain, currentTime, duration);
    const startedAt = sustain.startedAt ?? absoluteNow - sustain.age;

    history.sustains.set(id, {
      duration: sustain.duration,
      id,
      intensity: sustain.intensity,
      slotIndex: sustain.slotIndex,
      startedAt
    });
  });

  history.notes.forEach((note, id) => {
    const elapsed = absoluteNow - note.emittedAt;
    if (elapsed < -0.05 || elapsed > signalTimelineDefaults.windowSeconds) {
      history.notes.delete(id);
    }
  });

  history.sustains.forEach((sustain, id) => {
    const endedAt = sustain.startedAt + sustain.duration;
    if (absoluteNow - endedAt > signalTimelineDefaults.windowSeconds || sustain.startedAt > absoluteNow + 0.05) {
      history.sustains.delete(id);
    }
  });

  const notes = Array.from(history.notes.values())
    .map((note) => ({
      elapsed: absoluteNow - note.emittedAt,
      id: note.id,
      intensity: note.intensity,
      slotIndex: note.slotIndex
    }))
    .filter((note) => note.elapsed >= 0 && note.elapsed <= signalTimelineDefaults.windowSeconds)
    .sort((left, right) => right.elapsed - left.elapsed);

  const sustains = Array.from(history.sustains.values())
    .map((sustain) => ({
      duration: sustain.duration,
      elapsed: absoluteNow - sustain.startedAt,
      id: sustain.id,
      intensity: sustain.intensity,
      slotIndex: sustain.slotIndex
    }))
    .filter((sustain) => sustain.elapsed >= 0 && sustain.elapsed - sustain.duration <= signalTimelineDefaults.windowSeconds)
    .sort((left, right) => right.elapsed - left.elapsed);

  return { notes, sustains };
}

function ReceptorNoteTimeline({ notes, sustains }: { notes: TimelineNote[]; sustains: TimelineSustain[] }) {
  const lineYs = receptorSlots.map((slot) => timelineViewBox.staffTop + slot.slotIndex * timelineViewBox.staffGap);
  const plotWidth = timelineViewBox.plotRight - timelineViewBox.plotLeft;

  return (
    <div className="note-timeline">
      <svg
        aria-label="Receptor note timeline"
        className="note-timeline-svg"
        role="img"
        viewBox={`0 0 ${timelineViewBox.width} ${timelineViewBox.height}`}
      >
        <defs>
          <linearGradient id="timeline-left-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--timeline-fade-color)" stopOpacity="1" />
            <stop offset="10%" stopColor="var(--timeline-fade-color)" stopOpacity="0.98" />
            <stop offset="28%" stopColor="var(--timeline-fade-color)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect className="timeline-bed" height="126" width="960" x="0" y="0" />
        <g className="staff-lines" aria-hidden="true">
          {lineYs.map((y, index) => (
            <line
              className="staff-line"
              key={index}
              x1={timelineViewBox.plotLeft}
              x2={timelineViewBox.plotRight}
              y1={y}
              y2={y}
            />
          ))}
        </g>
        <line
          className="timeline-now"
          x1={timelineViewBox.plotRight}
          x2={timelineViewBox.plotRight}
          y1={lineYs[0] - 15}
          y2={lineYs[lineYs.length - 1] + 17}
        />
        <g className="timeline-sustains">
          {sustains.map((sustain) => {
            const elapsedStart = sustain.elapsed;
            const elapsedEnd = Math.max(0, sustain.elapsed - sustain.duration);
            const xStart = Math.max(
              timelineViewBox.plotLeft,
              timelineViewBox.plotRight - (elapsedStart / signalTimelineDefaults.windowSeconds) * plotWidth
            );
            const xEnd = Math.min(
              timelineViewBox.plotRight,
              timelineViewBox.plotRight - (elapsedEnd / signalTimelineDefaults.windowSeconds) * plotWidth
            );
            const width = Math.max(5, xEnd - xStart);
            const y = lineYs[sustain.slotIndex] ?? lineYs[Math.floor(lineYs.length / 2)];
            const alpha = Math.max(
              0.18,
              0.74 - (Math.max(0, sustain.elapsed - sustain.duration) / signalTimelineDefaults.windowSeconds) * 0.54
            );

            return (
              <rect
                className="timeline-sustain"
                height="8"
                key={sustain.id}
                opacity={alpha}
                rx="4"
                width={width}
                x={xStart}
                y={y - 4}
              />
            );
          })}
        </g>
        <g className="timeline-notes">
          {notes.map((note) => {
            const x =
              timelineViewBox.plotRight -
              (note.elapsed / signalTimelineDefaults.windowSeconds) * plotWidth;
            const y = lineYs[note.slotIndex] ?? lineYs[Math.floor(lineYs.length / 2)];
            const alpha = Math.max(0.18, 0.94 - (note.elapsed / signalTimelineDefaults.windowSeconds) * 0.62);
            const scale = 0.72 + Math.min(0.22, Math.max(0, note.intensity - 1) * 0.24);

            return (
              <SignalNoteGlyph
                groupClassName="timeline-note"
                key={note.id}
                opacity={alpha}
                scale={scale}
                x={x}
                y={y}
              />
            );
          })}
        </g>
        <rect fill="url(#timeline-left-fade)" height="126" pointerEvents="none" width="960" x="0" y="0" />
      </svg>
    </div>
  );
}

export function SynapseScene({
  drugStrength,
  frame,
  isPaused = false,
  moleculesPerPulse,
  onTogglePaused,
  onTogglePlaybackRate,
  onToggleTheme,
  playbackRate = 1,
  selected,
  themeMode,
  currentTime
}: SynapseSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedNoteIdsRef = useRef(new Set<string>());
  const sustainedToneRefs = useRef(new Map<string, SustainedTone>());
  const audioScopeRef = useRef("");
  const lastAudioTimeRef = useRef(currentTime);
  const scenePointerRef = useRef<ScenePointer | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sceneTooltip, setSceneTooltip] = useState<SceneTooltip | null>(null);
  const audioSupported =
    typeof window !== "undefined" &&
    Boolean((window as BrowserAudioWindow).AudioContext ?? (window as BrowserAudioWindow).webkitAudioContext);
  const visualConfig = useMemo(
    () => ({ id: selected, strength: drugStrength }),
    [drugStrength, selected]
  );
  const visualState = useMemo(
    () => buildVisualState(frame, currentTime, moleculesPerPulse, visualConfig),
    [currentTime, frame, moleculesPerPulse, visualConfig]
  );
  const timelineScopeKey = useMemo(
    () =>
      [
        selected,
        drugStrength.toFixed(3),
        moleculesPerPulse,
        frame.duration,
        frame.eventMarkers.join(",")
      ].join(":"),
    [drugStrength, frame.duration, frame.eventMarkers, moleculesPerPulse, selected]
  );
  const timelineSignals = useReceptorTimelineSignals(
    visualState.signalNotes,
    visualState.signalSustains,
    currentTime,
    frame.duration,
    timelineScopeKey
  );
  const releaseVesicles = useMemo(
    () => buildReleaseVesicles(frame, currentTime),
    [currentTime, frame]
  );
  const sceneColorVars = {
    "--signal-color": visualPalette.receptor.note,
    "--signal-color-soft": "rgba(45, 157, 240, 0.28)",
    "--signal-color-medium": "rgba(45, 157, 240, 0.48)"
  } as CSSProperties;

  const updateSceneTooltip = (nextTooltip: SceneTooltip | null) => {
    setSceneTooltip((previousTooltip) =>
      sameTooltip(previousTooltip, nextTooltip) ? previousTooltip : nextTooltip
    );
  };

  const updateTooltipFromCoordinates = (
    clientX: number,
    clientY: number,
    currentTarget: HTMLDivElement
  ) => {
    const rect = currentTarget.getBoundingClientRect();
    const stageWidth = rect.width || 960;
    const stageHeight = rect.height || 560;
    const localX = clamp(clientX - rect.left, 0, stageWidth);
    const localY = clamp(clientY - rect.top, 0, stageHeight);
    const pointer = {
      localX,
      localY,
      sceneX: (localX / stageWidth) * 960,
      sceneY: sceneViewportTop + (localY / stageHeight) * visibleSceneHeight,
      stageHeight,
      stageWidth
    };

    scenePointerRef.current = pointer;
    updateSceneTooltip(makeTooltip(pointer, visualState, releaseVesicles));
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      return;
    }

    updateTooltipFromCoordinates(event.clientX, event.clientY, event.currentTarget);
  };

  const handleStageMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    updateTooltipFromCoordinates(event.clientX, event.clientY, event.currentTarget);
  };

  const handleStagePointerLeave = () => {
    scenePointerRef.current = null;
    updateSceneTooltip(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const canvasViewBox = resizeMoleculeCanvasForDisplay(canvas, context);
    drawTransmitters(context, canvasViewBox.width, canvasViewBox.height, visualState.molecules);
  }, [visualState.molecules]);

  useEffect(() => {
    const pointer = scenePointerRef.current;
    if (!pointer) {
      return;
    }

    updateSceneTooltip(makeTooltip(pointer, visualState, releaseVesicles));
  }, [releaseVesicles, visualState]);

  useEffect(() => {
    return () => {
      stopAllSustainedTones(sustainedToneRefs, audioContextRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (audioScopeRef.current !== timelineScopeKey) {
      stopAllSustainedTones(sustainedToneRefs, audioContextRef.current);
      playedNoteIdsRef.current = new Set(
        visualState.signalNotes.map((note) => getSignalNotePlaybackId(note, currentTime, frame.duration))
      );
      audioScopeRef.current = timelineScopeKey;
      lastAudioTimeRef.current = currentTime;
      return;
    }

    if (currentTime < lastAudioTimeRef.current - frame.duration * 0.5) {
      stopAllSustainedTones(sustainedToneRefs, audioContextRef.current);
      playedNoteIdsRef.current = new Set(
        visualState.signalNotes.map((note) => getSignalNotePlaybackId(note, currentTime, frame.duration))
      );
      lastAudioTimeRef.current = currentTime;
      return;
    }

    lastAudioTimeRef.current = currentTime;

    if (!audioEnabled || isPaused) {
      stopAllSustainedTones(sustainedToneRefs, audioContextRef.current);
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") {
      return;
    }

    const activeSustainIds = new Set(
      visualState.signalSustains.map((sustain) => getSignalSustainPlaybackId(sustain, currentTime, frame.duration))
    );

    sustainedToneRefs.current.forEach((tone, playbackId) => {
      if (!activeSustainIds.has(playbackId)) {
        stopSustainedTone(tone, audioContext);
        sustainedToneRefs.current.delete(playbackId);
      }
    });

    visualState.signalSustains.forEach((sustain) => {
      const playbackId = getSignalSustainPlaybackId(sustain, currentTime, frame.duration);

      if (!sustainedToneRefs.current.has(playbackId)) {
        sustainedToneRefs.current.set(playbackId, startSustainedTone(audioContext, sustain));
      }
    });

    playedNoteIdsRef.current = prunePlayedNoteIds(
      playedNoteIdsRef.current,
      getCurrentPlaybackCycle(currentTime, frame.duration)
    );

    visualState.signalNotes.forEach((note) => {
      const playbackId = getSignalNotePlaybackId(note, currentTime, frame.duration);

      if (playedNoteIdsRef.current.has(playbackId)) {
        return;
      }

      playedNoteIdsRef.current.add(playbackId);
      playSignalTone(audioContext, note);
    });
  }, [audioEnabled, currentTime, frame.duration, isPaused, timelineScopeKey, visualState.signalNotes, visualState.signalSustains]);

  const handleToggleAudio = async () => {
    if (audioEnabled) {
      stopAllSustainedTones(sustainedToneRefs, audioContextRef.current);
      setAudioEnabled(false);
      return;
    }

    const audioContext = getAudioContext(audioContextRef);
    if (!audioContext) {
      return;
    }

    await audioContext.resume();
    playedNoteIdsRef.current = new Set(
      visualState.signalNotes.map((note) => getSignalNotePlaybackId(note, currentTime, frame.duration))
    );
    setAudioEnabled(true);
  };

  return (
    <section className="scene-shell" aria-label="Animated synapse visualizer" style={sceneColorVars}>
      <div className="scene-topline">
        <div>
          <p className="eyebrow">Generic monoaminergic GPCR-like synapse</p>
          <h1>Receptor-level neuropharmacology</h1>
        </div>
        <div className="topline-actions">
          <button
            aria-label={isPaused ? "Play simulation" : "Pause simulation"}
            aria-pressed={isPaused}
            className="topline-button"
            onClick={onTogglePaused}
            type="button"
          >
            {isPaused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
            <span>{isPaused ? "Play" : "Pause"}</span>
          </button>
          <button
            aria-label={playbackRate === 0.5 ? "Switch to regular speed" : "Switch to half speed"}
            aria-pressed={playbackRate === 0.5}
            className="topline-button"
            onClick={onTogglePlaybackRate}
            type="button"
          >
            <Gauge aria-hidden="true" size={18} />
            <span>{playbackRate === 0.5 ? "0.5x" : "1x"}</span>
          </button>
          <button
            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={themeMode === "dark"}
            className="topline-button"
            onClick={onToggleTheme}
            type="button"
          >
            {themeMode === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            <span>{themeMode === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            aria-label={audioEnabled ? "Turn sound off" : "Turn sound on"}
            aria-pressed={audioEnabled}
            className="topline-button"
            disabled={!audioSupported}
            onClick={handleToggleAudio}
            type="button"
          >
            {audioEnabled ? <Volume2 aria-hidden="true" size={18} /> : <VolumeX aria-hidden="true" size={18} />}
            <span>{audioEnabled ? "Sound on" : "Sound off"}</span>
          </button>
        </div>
      </div>
      <div
        className="synapse-stage"
        onMouseLeave={handleStagePointerLeave}
        onMouseMove={handleStageMouseMove}
        onPointerLeave={handleStagePointerLeave}
        onPointerMove={handleStagePointerMove}
      >
        <svg
          aria-label="Simple synapse with axon, dendrite, transmitters, and receptors"
          className="synapse-svg"
          role="img"
          viewBox="0 0 960 560"
        >
          <path
            className="axon"
            d={`M0 ${synapseCenterY - boutonRadius} H${boutonCenter.x} A${boutonRadius} ${boutonRadius} 0 0 1 ${boutonCenter.x} ${
              synapseCenterY + boutonRadius
            } H0 Z`}
            fill="var(--anatomy-axon-fill)"
            stroke="var(--anatomy-axon-stroke)"
            strokeWidth="3.5"
          />
          <g className="release-vesicles" aria-hidden="true">
            {releaseVesicles.map((vesicle) => (
              <g key={vesicle.id}>
                <circle
                  className="vesicle-core"
                  cx={vesicle.x}
                  cy={vesicle.y}
                  opacity={vesicle.alpha}
                  r={vesicle.radius}
                />
                {vesicle.contentAlpha > 0 &&
                  getVesicleTransmitters(vesicle).map((transmitter) => (
                    <circle
                      className="vesicle-transmitter"
                      cx={transmitter.x}
                      cy={transmitter.y}
                      data-vesicle-id={vesicle.id}
                      fill={ligandColors.transmitter}
                      key={transmitter.id}
                      opacity={vesicle.contentAlpha * 0.62}
                      r={transmitter.radius}
                    />
                  ))}
                <circle
                  className="vesicle-rim"
                  cx={vesicle.x}
                  cy={vesicle.y}
                  opacity={vesicle.alpha * 0.9}
                  r={vesicle.radius}
                />
                {vesicle.fusion > 0 && (
                  <ellipse
                    className="vesicle-fusion"
                    cx={releaseSite.x + 1}
                    cy={vesicle.y}
                    opacity={vesicle.fusion * 0.28}
                    rx={4 + vesicle.fusion * 9}
                    ry={vesicle.radius * (0.34 + vesicle.fusion * 0.12)}
                  />
                )}
              </g>
            ))}
          </g>
          {transporterSlots.map((slot) => {
            const occupancy = visualState.transporterOccupancies[slot.slotIndex];
            const reuptakeColor = occupancy.activation > 0.05 ? reuptakeActiveColor : reuptakeBaseColor;
            const railHeight = 7.5 + occupancy.activation * 1.6;
            const conformation: TransporterConformation =
              occupancy.ligand?.ligandKind === "releaser"
                ? "out"
                : occupancy.ligand?.ligandKind === "reuptake_inhibitor"
                  ? "blocked"
                  : "in";

            return (
              <g
                className="reuptake-port"
                key={slot.slotIndex}
                opacity={occupancy.ligand ? 0.98 : 0.88}
                transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rotation})`}
              >
                <TransporterGlyph
                  color={reuptakeColor}
                  mode={conformation}
                  railHeight={railHeight}
                />
                {occupancy.ligand?.ligandKind === "reuptake_inhibitor" && (
                  <DockedTransporterDrug fill={ligandColors.reuptake_inhibitor} />
                )}
                {occupancy.ligand?.ligandKind === "releaser" && (
                  <DockedTransporterDrug fill={ligandColors.releaser} />
                )}
              </g>
            );
          })}
          <path
            className="dendrite"
            d={`M960 ${synapseCenterY - dendriteRadius} H${dendriteCenter.x} A${dendriteRadius} ${dendriteRadius} 0 0 0 ${dendriteCenter.x} ${
              synapseCenterY + dendriteRadius
            } H960 Z`}
            fill="var(--anatomy-dendrite-fill)"
            stroke="var(--anatomy-dendrite-stroke)"
            strokeWidth="3.5"
          />
          <g className="receptors">
            {receptorSlots.map((slot, index) => {
              const occupancy = visualState.receptorOccupancies[index];

              return (
                <g
                  key={`${slot.x}-${slot.y}`}
                  transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rotation})`}
                >
                  <ReceptorGlyph
                    active={occupancy.active}
                    noteIntensity={occupancy.noteIntensity}
                    orthosteric={occupancy.orthosteric}
                  />
                </g>
              );
            })}
          </g>
          <g aria-hidden="true" className="allosteric-sites">
            {receptorSlots.map((slot, index) => (
              <AllostericSiteOutline
                active={Boolean(visualState.receptorOccupancies[index].allosteric)}
                key={slot.slotIndex}
                x={slot.allosteric.x}
                y={slot.allosteric.y}
              />
            ))}
          </g>
          <g className="docked-ligands" aria-label="Docked receptor ligands">
            {visualState.dockedLigands
              .filter((ligand) => ligand.target.kind !== "transporter")
              .map((ligand) => (
                <DockedLigandMarker key={ligand.id} ligand={ligand} />
              ))}
          </g>
        </svg>
        <canvas
          aria-label="Animated transmitter molecules"
          className="molecule-canvas"
          height={sceneCanvasViewBox.height}
          ref={canvasRef}
          width={sceneCanvasViewBox.width}
        />
        {sceneTooltip && (
          <div
            className="scene-tooltip"
            role="tooltip"
            style={{ left: sceneTooltip.x, top: sceneTooltip.y }}
          >
            <strong>{sceneTooltip.title}</strong>
            <span>{sceneTooltip.body}</span>
          </div>
        )}
      </div>
      <ReceptorNoteTimeline notes={timelineSignals.notes} sustains={timelineSignals.sustains} />
    </section>
  );
}
