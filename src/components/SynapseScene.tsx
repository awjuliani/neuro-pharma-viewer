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
import { FlaskConical, Volume2, VolumeX } from "lucide-react";
import { interventionProfiles } from "../simulation/profiles";
import type { InterventionId, SimulationFrame } from "../simulation/types";
import { signalTimelineDefaults, type TimelineNote } from "./signalTimelineModel";
import {
  activeReceptorColor,
  activeReceptorFill,
  boutonCenter,
  boutonRadius,
  buildVisualState,
  dendriteCenter,
  dendriteRadius,
  inactiveReceptorColor,
  ligandColors,
  maoActiveColor,
  maoBaseColor,
  maoSlots,
  receptorSlots,
  reuptakeActiveColor,
  reuptakeBaseColor,
  synapseCenterY,
  synapseVisualTiming,
  transporterSlots,
  visualPalette,
  type DockedLigand,
  type SignalNote,
  type VisualMolecule
} from "./synapseVisualModel";

interface SynapseSceneProps {
  drugStrength: number;
  frame: SimulationFrame;
  moleculesPerPulse: number;
  selected: InterventionId;
  currentTime: number;
}

const drawRoundedDiamond = (context: CanvasRenderingContext2D, radius: number) => {
  const corner = radius * 0.34;

  context.moveTo(0, -radius);
  if (typeof context.quadraticCurveTo !== "function") {
    context.lineTo(radius, 0);
    context.lineTo(0, radius);
    context.lineTo(-radius, 0);
    context.closePath();
    return;
  }

  context.quadraticCurveTo(corner, -radius + corner, radius - corner, -corner);
  context.quadraticCurveTo(radius, 0, radius - corner, corner);
  context.quadraticCurveTo(corner, radius - corner, 0, radius);
  context.quadraticCurveTo(-corner, radius - corner, -radius + corner, corner);
  context.quadraticCurveTo(-radius, 0, -radius + corner, -corner);
  context.quadraticCurveTo(-corner, -radius + corner, 0, -radius);
  context.closePath();
};

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

    if (molecule.ligandKind !== "transmitter") {
      context.globalAlpha = molecule.alpha * 0.78;
      context.strokeStyle = "rgba(255,255,255,0.88)";
      context.lineWidth = 2.2;
      context.stroke();
    }
    context.restore();
  });
}

function DockedLigandMarker({ ligand }: { ligand: DockedLigand }) {
  const fill = ligandColors[ligand.ligandKind];
  const isDrug = ligand.ligandKind !== "transmitter";

  if (isDrug) {
    return (
      <rect
        fill={fill}
        height="14"
        opacity={ligand.alpha}
        rx="4.2"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="2.2"
        transform={`translate(${ligand.position.x} ${ligand.position.y}) rotate(45)`}
        width="14"
        x="-7"
        y="-7"
      />
    );
  }

  return (
    <circle
      cx={ligand.position.x}
      cy={ligand.position.y}
      fill={fill}
      opacity={ligand.alpha}
      r="7.2"
    />
  );
}

function DockedTransporterDrug({ fill }: { fill: string }) {
  return (
    <rect
      fill={fill}
      height="16"
      rx="4.6"
      stroke="rgba(255,255,255,0.88)"
      strokeWidth="2.2"
      transform="rotate(45)"
      width="16"
      x="-8"
      y="-8"
    />
  );
}

type TransporterArrowMode = "blocked" | "in" | "out";

function TransporterArrow({
  color,
  mode,
  strokeWidth
}: {
  color: string;
  mode: TransporterArrowMode;
  strokeWidth: number;
}) {
  return (
    <g className="transporter-arrow" data-direction={mode}>
      <path
        className="transporter-arrow-chevron"
        d="M-6 -13 L-22 0 L-6 13"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        style={{
          opacity: mode === "blocked" ? 0 : 1,
          transform: mode === "out" ? "rotate(180deg)" : "rotate(0deg)"
        }}
      />
      <path
        className="transporter-arrow-line"
        d="M-14 -14 L-14 14"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        style={{
          opacity: mode === "blocked" ? 1 : 0,
          transform: mode === "blocked" ? "scaleY(1)" : "scaleY(0.32)"
        }}
      />
    </g>
  );
}

interface TimelineHistoryEntry {
  emittedAt: number;
  id: string;
  intensity: number;
  slotIndex: number;
}

interface TimelineHistoryClock {
  baseTime: number;
  lastTime: number;
  notes: Map<string, TimelineHistoryEntry>;
  scopeKey: string;
}

interface ReleaseVesicle {
  alpha: number;
  fusion: number;
  id: string;
  radius: number;
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

const playSignalTone = (audioContext: AudioContext, note: SignalNote) => {
  const frequency = receptorFrequencies[note.slotIndex] ?? receptorFrequencies[2];
  const now = audioContext.currentTime;
  const duration = 0.2 + Math.min(0.06, Math.max(0, note.intensity - 1) * 0.08);
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06 * Math.min(1.25, note.intensity), now + 0.008);
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

const getWrappedAge = (currentTime: number, marker: number, duration: number) =>
  (currentTime - marker + duration) % duration;

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
    const age = getWrappedAge(currentTime, marker, frame.duration);

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
      const membraneOffset =
        (index - (vesiclesPerPulse - 1) / 2) * 56 + (seeded(seed + 4) - 0.5) * 22;
      const targetY = releaseSite.y + membraneOffset;
      const targetX = getBoutonMembraneXAtY(targetY) - 7 + (seeded(seed + 3) - 0.5) * 4;
      const startX = targetX - 78 - seeded(seed + 1) * 34;
      const startY = targetY + (seeded(seed + 2) - 0.5) * 62;
      const drift = Math.sin(localAge * 8.4 + seeded(seed + 5) * Math.PI * 2) * 5.5 * (1 - progress);

      return {
        alpha: 0.36 * fadeIn * fadeOut,
        fusion:
          clamp((localAge - (synapseVisualTiming.releaseDelaySeconds - 0.08)) / 0.16) * fadeOut,
        id: `vesicle-${marker.toFixed(3)}-${index}`,
        radius: 13 + seeded(seed + 6) * 3,
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
  maoi: {
    body: "A drug ligand that binds MAO-like clearing enzymes and blocks transmitter breakdown.",
    title: "MAOI molecule"
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
    body: "Endogenous transmitter diffusing through the cleft. It can dock into an open receptor or be cleared by transporters or MAO-like enzymes.",
    title: "Transmitter"
  }
} satisfies Record<VisualMolecule["ligandKind"], { body: string; title: string }>;

const dockedLigandTooltipCopy = (ligand: DockedLigand) => {
  if (ligand.target.kind === "mao") {
    return ligand.ligandKind === "maoi"
      ? {
          body: "This enzyme is occupied by an MAOI and cannot remove transmitter.",
          title: "Blocked MAO"
        }
      : {
          body: "This transmitter is being bound by an MAO-like enzyme for removal.",
          title: "MAO-bound transmitter"
        };
  }

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

  const signalNote = visualState.signalNotes.find(
    (candidate) => distance(sceneX, sceneY, candidate.position.x, candidate.position.y) <= 24 * candidate.scale
  );

  if (signalNote) {
    return {
      ...position,
      body: "A signal note emitted by a real receptor activation event.",
      title: "Received signal"
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

  const mao = visualState.maoOccupancies.find(
    (occupancy) => distance(sceneX, sceneY, occupancy.position.x, occupancy.position.y) <= 30
  );

  if (mao) {
    return {
      ...position,
      body: mao.ligand
        ? "This MAO-like enzyme is occupied by an inhibitor, so it cannot bind free transmitter."
        : mao.degrading
          ? "This MAO-like enzyme is binding a free transmitter molecule and clearing it from the cleft."
          : "A floating MAO-like clearing enzyme. Free transmitter can bind here and be removed.",
      title: mao.ligand ? "Blocked MAO" : mao.degrading ? "Active MAO" : "MAO enzyme"
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

function useReceptorTimelineNotes(
  signalNotes: SignalNote[],
  currentTime: number,
  duration: number,
  scopeKey: string
): TimelineNote[] {
  const historyRef = useRef<TimelineHistoryClock>({
    baseTime: 0,
    lastTime: currentTime,
    notes: new Map(),
    scopeKey
  });
  const history = historyRef.current;

  if (history.scopeKey !== scopeKey) {
    history.baseTime = 0;
    history.lastTime = currentTime;
    history.notes.clear();
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
      emittedAt: absoluteNow,
      id: note.id,
      intensity: note.intensity,
      slotIndex: note.slotIndex
    });
  });

  history.notes.forEach((note, id) => {
    const elapsed = absoluteNow - note.emittedAt;
    if (elapsed < -0.05 || elapsed > signalTimelineDefaults.windowSeconds) {
      history.notes.delete(id);
    }
  });

  return Array.from(history.notes.values())
    .map((note) => ({
      elapsed: absoluteNow - note.emittedAt,
      id: note.id,
      intensity: note.intensity,
      slotIndex: note.slotIndex
    }))
    .filter((note) => note.elapsed >= 0 && note.elapsed <= signalTimelineDefaults.windowSeconds)
    .sort((left, right) => right.elapsed - left.elapsed);
}

function ReceptorNoteTimeline({ notes }: { notes: TimelineNote[] }) {
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
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="10%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="28%" stopColor="#ffffff" stopOpacity="0" />
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
        <g className="timeline-notes">
          {notes.map((note) => {
            const x =
              timelineViewBox.plotRight -
              (note.elapsed / signalTimelineDefaults.windowSeconds) * plotWidth;
            const y = lineYs[note.slotIndex] ?? lineYs[Math.floor(lineYs.length / 2)];
            const alpha = Math.max(0.18, 0.94 - (note.elapsed / signalTimelineDefaults.windowSeconds) * 0.62);
            const scale = 0.72 + Math.min(0.22, Math.max(0, note.intensity - 1) * 0.24);

            return (
              <g
                className="timeline-note"
                key={note.id}
                opacity={alpha}
                transform={`translate(${x} ${y}) scale(${scale})`}
              >
                <ellipse className="timeline-note-fill" cx="0" cy="0" rx="8.8" ry="6.2" transform="rotate(-18)" />
                <path className="timeline-note-stem" d="M7 -2 V-40 C20 -35 23 -27 13 -21" />
              </g>
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
  moleculesPerPulse,
  selected,
  currentTime
}: SynapseSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedNoteIdsRef = useRef(new Set<string>());
  const audioScopeRef = useRef("");
  const lastAudioTimeRef = useRef(currentTime);
  const scenePointerRef = useRef<ScenePointer | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sceneTooltip, setSceneTooltip] = useState<SceneTooltip | null>(null);
  const audioSupported =
    typeof window !== "undefined" &&
    Boolean((window as BrowserAudioWindow).AudioContext ?? (window as BrowserAudioWindow).webkitAudioContext);
  const profile = interventionProfiles[selected];
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
  const timelineNotes = useReceptorTimelineNotes(
    visualState.signalNotes,
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
      sceneY: (localY / stageHeight) * 560,
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

    drawTransmitters(context, canvas.width, canvas.height, visualState.molecules);
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
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (audioScopeRef.current !== timelineScopeKey) {
      playedNoteIdsRef.current = new Set(visualState.signalNotes.map((note) => note.id));
      audioScopeRef.current = timelineScopeKey;
      lastAudioTimeRef.current = currentTime;
      return;
    }

    if (currentTime < lastAudioTimeRef.current - frame.duration * 0.5) {
      playedNoteIdsRef.current = new Set(visualState.signalNotes.map((note) => note.id));
      lastAudioTimeRef.current = currentTime;
      return;
    }

    lastAudioTimeRef.current = currentTime;

    if (!audioEnabled) {
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") {
      return;
    }

    visualState.signalNotes.forEach((note) => {
      if (playedNoteIdsRef.current.has(note.id)) {
        return;
      }

      playedNoteIdsRef.current.add(note.id);
      playSignalTone(audioContext, note);
    });
  }, [audioEnabled, currentTime, frame.duration, timelineScopeKey, visualState.signalNotes]);

  const handleToggleAudio = async () => {
    if (audioEnabled) {
      setAudioEnabled(false);
      return;
    }

    const audioContext = getAudioContext(audioContextRef);
    if (!audioContext) {
      return;
    }

    await audioContext.resume();
    playedNoteIdsRef.current = new Set(visualState.signalNotes.map((note) => note.id));
    setAudioEnabled(true);
  };

  return (
    <section className="scene-shell" aria-label="Animated synapse visualizer" style={sceneColorVars}>
      <div className="scene-topline">
        <div>
          <p className="eyebrow">Generic GPCR synapse</p>
          <h1>Receptor-level neuropharmacology</h1>
        </div>
        <button
          aria-label={audioEnabled ? "Turn sound off" : "Turn sound on"}
          aria-pressed={audioEnabled}
          className="sound-toggle"
          disabled={!audioSupported}
          onClick={handleToggleAudio}
          type="button"
        >
          {audioEnabled ? <Volume2 aria-hidden="true" size={18} /> : <VolumeX aria-hidden="true" size={18} />}
          <span>{audioEnabled ? "Sound on" : "Sound off"}</span>
        </button>
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
            fill={visualPalette.anatomy.axonFill}
            stroke={visualPalette.anatomy.axonStroke}
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
            const reuptakeStrokeWidth = 8 + occupancy.activation * 2;
            const arrowMode: TransporterArrowMode =
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
                <path
                  d="M-22 -30 C18 -20 18 20 -22 30"
                  fill="none"
                  stroke={reuptakeColor}
                  strokeLinecap="round"
                  strokeWidth={reuptakeStrokeWidth}
                />
                <TransporterArrow
                  color={reuptakeColor}
                  mode={arrowMode}
                  strokeWidth={7 + occupancy.activation * 2}
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
          <g className="mao-enzymes" aria-label="MAO clearing enzymes">
            {visualState.maoOccupancies.map((occupancy) => {
              const slot = maoSlots[occupancy.slotIndex];
              const maoColor = occupancy.degrading ? maoActiveColor : maoBaseColor;
              const enzymeOpacity = occupancy.ligand ? 0.62 : 0.82;

              return (
                <g
                  className="mao-enzyme"
                  key={occupancy.slotIndex}
                  opacity={enzymeOpacity}
                  transform={`translate(${occupancy.position.x} ${occupancy.position.y}) rotate(${slot.rotation})`}
                >
                  <path
                    className="mao-enzyme-body"
                    d="M-18 -6 C-11 -19 8 -19 17 -8 C29 -5 30 11 18 17 C9 24 -9 21 -17 9 C-26 5 -25 -3 -18 -6 Z"
                    fill="rgba(255,255,255,0.62)"
                    stroke={maoColor}
                    strokeLinejoin="round"
                    strokeWidth={occupancy.degrading ? 4.4 : 3.2}
                  />
                  <circle
                    cx="-4"
                    cy="-2"
                    fill={occupancy.degrading ? maoActiveColor : "rgba(108,146,155,0.28)"}
                    r={occupancy.degrading ? 6.2 : 4.4}
                  />
                  <path
                    d="M7 -8 C1 -3 1 4 8 10"
                    fill="none"
                    stroke={maoColor}
                    strokeLinecap="round"
                    strokeWidth="2.8"
                  />
                </g>
              );
            })}
          </g>
          <path
            className="dendrite"
            d={`M960 ${synapseCenterY - dendriteRadius} H${dendriteCenter.x} A${dendriteRadius} ${dendriteRadius} 0 0 0 ${dendriteCenter.x} ${
              synapseCenterY + dendriteRadius
            } H960 Z`}
            fill={visualPalette.anatomy.dendriteFill}
            stroke={visualPalette.anatomy.dendriteStroke}
            strokeWidth="3.5"
          />
          <g className="signal-notes" aria-label="Received signal notes">
            {visualState.signalNotes.map((note) => (
              <g
                className="signal-note"
                key={note.id}
                opacity={note.alpha}
                transform={`translate(${note.position.x} ${note.position.y}) scale(${note.scale})`}
              >
                <text className="signal-note-glyph" dominantBaseline="central" textAnchor="middle" y="2">
                  ♪
                </text>
              </g>
            ))}
          </g>
          <g className="receptors">
            {receptorSlots.map((slot, index) => {
              const occupancy = visualState.receptorOccupancies[index];
              const receptorColor = occupancy.active ? activeReceptorColor : inactiveReceptorColor;

              return (
                <g
                  key={`${slot.x}-${slot.y}`}
                  transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rotation})`}
                >
                  <path
                    d="M-22 -22 C8 -22 28 -10 28 0 C28 10 8 22 -22 22"
                    fill="none"
                    stroke={receptorColor}
                    strokeLinecap="round"
                    strokeWidth={occupancy.active ? "13" : "10"}
                  />
                  <circle
                    cx="31"
                    cy="0"
                    fill={occupancy.active ? activeReceptorFill : "rgba(255,255,255,0.36)"}
                    r="14"
                  />
                </g>
              );
            })}
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
          height="560"
          ref={canvasRef}
          width="960"
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
      <ReceptorNoteTimeline notes={timelineNotes} />
      <div className="mechanism-strip">
        <div className="mechanism-card">
          <FlaskConical aria-hidden="true" size={20} />
          <div>
            <strong>{profile.name}</strong>
            <p>{profile.mechanism}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
