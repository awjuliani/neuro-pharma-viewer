import type { DockedLigand, LigandKind, ReceptorOccupancy } from "./synapseVisualModel";
import {
  activeReceptorColor,
  activeReceptorFill,
  antagonistBoundReceptorColor,
  antagonistBoundReceptorFill,
  inactiveReceptorColor,
  ligandColors,
  pamEnhancedReceptorColor,
  pamEnhancedReceptorFill
} from "./synapseVisualModel";

export type TransporterConformation = "blocked" | "in" | "out";

export const drawRoundedDiamond = (context: CanvasRenderingContext2D, radius: number) => {
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

export const getReceptorRenderColors = (
  occupancy: Pick<ReceptorOccupancy, "active" | "noteIntensity"> & {
    orthosteric?: ReceptorOccupancy["orthosteric"];
  }
) => {
  const antagonistBound = occupancy.orthosteric?.ligandKind === "antagonist";
  const pamEnhanced = occupancy.active && occupancy.noteIntensity > 1;

  return {
    fill: antagonistBound
      ? antagonistBoundReceptorFill
      : pamEnhanced
        ? pamEnhancedReceptorFill
        : occupancy.active
          ? activeReceptorFill
          : "rgba(255,255,255,0.36)",
    stroke: antagonistBound
      ? antagonistBoundReceptorColor
      : pamEnhanced
        ? pamEnhancedReceptorColor
        : occupancy.active
          ? activeReceptorColor
          : inactiveReceptorColor
  };
};

export function LigandGlyph({
  alpha = 1,
  className,
  ligandKind,
  radius = ligandKind === "transmitter" ? 7.2 : 7,
  x = 0,
  y = 0
}: {
  alpha?: number;
  className?: string;
  ligandKind: LigandKind;
  radius?: number;
  x?: number;
  y?: number;
}) {
  const fill = ligandColors[ligandKind];
  const isDrug = ligandKind !== "transmitter";

  if (isDrug) {
    const size = radius * 2;

    return (
      <rect
        className={className}
        data-ligand-kind={ligandKind}
        fill={fill}
        height={size}
        opacity={alpha}
        rx={size * 0.3}
        stroke="rgba(255,255,255,0.88)"
        strokeWidth={Math.max(1.6, radius * 0.31)}
        transform={`translate(${x} ${y}) rotate(45)`}
        width={size}
        x={-size / 2}
        y={-size / 2}
      />
    );
  }

  return (
    <circle
      className={className}
      cx={x}
      cy={y}
      data-ligand-kind={ligandKind}
      fill={fill}
      opacity={alpha}
      r={radius}
      stroke="rgba(255,255,255,0.88)"
      strokeWidth={Math.max(1.6, radius * 0.31)}
    />
  );
}

export function DockedLigandMarker({ ligand }: { ligand: DockedLigand }) {
  return (
    <LigandGlyph
      alpha={ligand.alpha}
      className="docked-ligand-marker"
      ligandKind={ligand.ligandKind}
      radius={ligand.ligandKind === "transmitter" ? 7.2 : 7}
      x={ligand.position.x}
      y={ligand.position.y}
    />
  );
}

export function AllostericSiteOutline({
  active,
  x,
  y
}: {
  active: boolean;
  x: number;
  y: number;
}) {
  const size = active ? 18.5 : 17;

  return (
    <rect
      className="allosteric-site-outline"
      fill="none"
      height={size}
      rx={size * 0.3}
      stroke={ligandColors.pam}
      strokeWidth={active ? 2.6 : 2}
      transform={`translate(${x} ${y}) rotate(45)`}
      width={size}
      x={-size / 2}
      y={-size / 2}
    />
  );
}

export function DockedTransporterDrug({ fill }: { fill: string }) {
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

const transporterRailTransforms = {
  blocked: {
    lower: "translate(0px, 5px) rotate(0deg)",
    upper: "translate(0px, -5px) rotate(0deg)"
  },
  in: {
    lower: "translate(0px, 13px) rotate(12deg)",
    upper: "translate(0px, -13px) rotate(-12deg)"
  },
  out: {
    lower: "translate(0px, 13px) rotate(-12deg)",
    upper: "translate(0px, -13px) rotate(12deg)"
  }
} satisfies Record<TransporterConformation, { lower: string; upper: string }>;

export function TransporterGlyph({
  color,
  mode,
  railHeight
}: {
  color: string;
  mode: TransporterConformation;
  railHeight: number;
}) {
  const railTransforms = transporterRailTransforms[mode];

  return (
    <g className="transporter-glyph" data-conformation={mode}>
      {(["upper", "lower"] as const).map((rail) => (
        <g
          className={`transporter-rail transporter-rail-${rail}`}
          data-rail={rail}
          key={rail}
          style={{ transform: railTransforms[rail] }}
        >
          <rect
            className="transporter-rail-body"
            fill={color}
            height={railHeight}
            rx={railHeight / 2}
            width="58"
            x="-29"
            y={-railHeight / 2}
          />
        </g>
      ))}
      <line
        className="transporter-channel-line"
        opacity={mode === "blocked" ? 0.22 : 0.34}
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2.4"
        x1="-20"
        x2="20"
        y1="0"
        y2="0"
      />
    </g>
  );
}

export function ReceptorGlyph({
  active,
  noteIntensity,
  orthosteric
}: Pick<ReceptorOccupancy, "active" | "noteIntensity"> & {
  orthosteric?: ReceptorOccupancy["orthosteric"];
}) {
  const receptorColors = getReceptorRenderColors({ active, noteIntensity, orthosteric });

  return (
    <>
      <path
        d="M-22 -22 C8 -22 28 -10 28 0 C28 10 8 22 -22 22"
        fill="none"
        stroke={receptorColors.stroke}
        strokeLinecap="round"
        strokeWidth={active ? "13" : "10"}
      />
      <circle cx="31" cy="0" fill={receptorColors.fill} r="14" />
    </>
  );
}

export function SignalNoteGlyph({
  groupClassName,
  opacity,
  scale = 1,
  x = 0,
  y = 0
}: {
  groupClassName?: string;
  opacity?: number;
  scale?: number;
  x?: number;
  y?: number;
}) {
  return (
    <g className={groupClassName} opacity={opacity} transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse className="timeline-note-fill" cx="0" cy="0" rx="8.8" ry="6.2" transform="rotate(-18)" />
      <path className="timeline-note-stem" d="M7 -2 V-40 C20 -35 23 -27 13 -21" />
    </g>
  );
}
