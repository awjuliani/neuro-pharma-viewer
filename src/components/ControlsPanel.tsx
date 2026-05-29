import { Activity, CircleOff, Gauge, KeyRound, Recycle, Sparkles } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { interventionProfiles } from "../simulation/profiles";
import type { InterventionId, SimulationParams } from "../simulation/types";
import { interventionAccentColors } from "./synapseVisualModel";

interface ControlDefinition {
  key: keyof SimulationParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const controls: ControlDefinition[] = [
  {
    key: "drugStrength",
    label: "Intervention strength",
    min: 0,
    max: 1,
    step: 0.01,
    format: (value) => `${Math.round(value * 100)}%`
  },
  {
    key: "pulseRate",
    label: "Pulse rate",
    min: 0.35,
    max: 1.2,
    step: 0.01,
    format: (value) => `${value.toFixed(2)} Hz`
  },
  {
    key: "moleculesPerPulse",
    label: "Molecules per pulse",
    min: 1,
    max: 12,
    step: 1,
    format: (value) => `${Math.round(value)}`
  }
];

const icons = {
  baseline: Activity,
  reuptake_inhibitor: Recycle,
  releaser: Sparkles,
  agonist: KeyRound,
  antagonist: CircleOff,
  pam: Gauge
} satisfies Record<InterventionId, typeof Activity>;

const interventionOrder: InterventionId[] = [
  "baseline",
  "reuptake_inhibitor",
  "releaser",
  "agonist",
  "antagonist",
  "pam"
];

const modeledSignalCopy = {
  baseline: {
    detail:
      "Transmitter pulses cross the synaptic cleft, briefly activate open receptors, and can then be cleared by reuptake transporters.",
    title: "Baseline transmission"
  },
  reuptake_inhibitor: {
    detail:
      "Blocked transporters cannot reuptake returning transmitter, so missed clearance can leave the same molecule available for additional receptor encounters.",
    title: "Reuptake blockade"
  },
  releaser: {
    detail:
      "Reversed transporters drive transmitter efflux into the cleft while also reducing reuptake at those transporter sites.",
    title: "Transporter reversal"
  },
  agonist: {
    detail:
      "Agonist molecules bind receptor sites directly and produce postsynaptic signal events without requiring presynaptic transmitter release.",
    title: "Direct receptor activation"
  },
  antagonist: {
    detail:
      "Antagonist-bound orthosteric sites stay silent and unavailable, so transmitter is less likely to activate those receptors.",
    title: "Orthosteric blockade"
  },
  pam: {
    detail:
      "PAM-bound allosteric sites stay silent alone, but transmitter activation at those receptors produces stronger postsynaptic signal events.",
    title: "Positive allosteric modulation"
  }
} satisfies Record<InterventionId, { detail: string; title: string }>;

interface ControlsPanelProps {
  params: SimulationParams;
  onChange: (next: SimulationParams) => void;
  selected: InterventionId;
  onSelectIntervention: (id: InterventionId) => void;
}

export function ControlsPanel({
  params,
  onChange,
  selected,
  onSelectIntervention
}: ControlsPanelProps) {
  const pulseControls = controls.filter(
    (control) => control.key === "pulseRate" || control.key === "moleculesPerPulse"
  );
  const interventionStrengthControl = controls.find((control) => control.key === "drugStrength");
  const [hoveredIntervention, setHoveredIntervention] = useState<InterventionId | null>(null);

  const renderControl = (control: ControlDefinition, options?: { reserved?: boolean }) => {
    const value = params[control.key];
    const reserved = Boolean(options?.reserved);
    const ControlContainer = reserved ? "div" : "label";

    return (
      <ControlContainer className="control-row" key={control.key}>
        <span>
          <strong>{control.label}</strong>
          <small>{control.format(value)}</small>
        </span>
        <input
          aria-hidden={reserved ? true : undefined}
          aria-label={reserved ? undefined : control.label}
          disabled={reserved}
          max={control.max}
          min={control.min}
          onChange={(event) =>
            reserved
              ? undefined
              : onChange({
                  ...params,
                  [control.key]: Number(event.target.value)
                })
          }
          step={control.step}
          tabIndex={reserved ? -1 : undefined}
          type="range"
          value={value}
        />
      </ControlContainer>
    );
  };

  return (
    <section className="panel controls-panel" aria-label="Simulation setup">
      <div className="control-section control-section-primary">
        <p className="eyebrow">Pulse controls</p>
        <div className="control-list">{pulseControls.map((control) => renderControl(control))}</div>
      </div>
      <div className="intervention-section">
        <p className="selector-label">Select drug intervention</p>
        <div className="intervention-grid" role="tablist" aria-label="Drug intervention classes">
          {interventionOrder.map((id) => {
            const profile = interventionProfiles[id];
            const Icon = icons[id];
            const isActive = selected === id;
            const isTooltipVisible = hoveredIntervention === id;
            const signalCopy = modeledSignalCopy[id];
            const tooltipId = `intervention-tooltip-${id}`;

            return (
              <div
                className="intervention-option"
                key={id}
                onBlur={() => setHoveredIntervention(null)}
                onFocus={() => setHoveredIntervention(id)}
                onMouseEnter={() => setHoveredIntervention(id)}
                onMouseLeave={() => setHoveredIntervention(null)}
              >
                <button
                  aria-describedby={isTooltipVisible ? tooltipId : undefined}
                  aria-selected={isActive}
                  className="intervention-button"
                  onClick={() => onSelectIntervention(id)}
                  role="tab"
                  style={{ "--accent": interventionAccentColors[id] } as CSSProperties}
                  type="button"
                >
                  <span className="icon-shell">
                    <Icon aria-hidden="true" size={18} strokeWidth={2.1} />
                  </span>
                  <span>
                    <strong>{profile.shortName}</strong>
                    <small>{profile.subtitle}</small>
                  </span>
                </button>
                {isTooltipVisible && (
                  <div className="scene-tooltip intervention-tooltip" id={tooltipId} role="tooltip">
                    <strong>{signalCopy.title}</strong>
                    <span>{signalCopy.detail}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {interventionStrengthControl ? (
        <div
          aria-hidden={selected === "baseline" ? true : undefined}
          className={`control-section${selected === "baseline" ? " intervention-strength-placeholder" : ""}`}
        >
          <p className="eyebrow">Intervention control</p>
          <div className="control-list">
            {renderControl(interventionStrengthControl, { reserved: selected === "baseline" })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
