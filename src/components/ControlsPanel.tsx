import {
  Activity,
  CircleOff,
  Gauge,
  KeyRound,
  Recycle,
  Shield,
  Sparkles
} from "lucide-react";
import { interventionProfiles } from "../simulation/profiles";
import type { InterventionId, SimulationParams } from "../simulation/types";

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
    max: 1.6,
    step: 0.01,
    format: (value) => `${value.toFixed(2)} Hz`
  },
  {
    key: "moleculesPerPulse",
    label: "Molecules per pulse",
    min: 1,
    max: 18,
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
  const visibleControls = controls.filter(
    (control) => control.key !== "drugStrength" || selected !== "baseline"
  );

  return (
    <section className="panel controls-panel" aria-label="Simulation setup">
      <div className="panel-heading">
        <Shield aria-hidden="true" />
        <div>
          <p className="eyebrow">Toy simulation</p>
          <h2>Setup</h2>
        </div>
      </div>
      <div className="intervention-grid" role="tablist" aria-label="Drug intervention classes">
        {interventionOrder.map((id) => {
          const profile = interventionProfiles[id];
          const Icon = icons[id];
          const isActive = selected === id;

          return (
            <button
              aria-selected={isActive}
              className="intervention-button"
              key={id}
              onClick={() => onSelectIntervention(id)}
              role="tab"
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
          );
        })}
      </div>
      <div className="control-section">
        <p className="eyebrow">Visual controls</p>
        <div className="control-list">
          {visibleControls.map((control) => {
            const value = params[control.key];

            return (
              <label className="control-row" key={control.key}>
                <span>
                  <strong>{control.label}</strong>
                  <small>{control.format(value)}</small>
                </span>
                <input
                  aria-label={control.label}
                  max={control.max}
                  min={control.min}
                  onChange={(event) =>
                    onChange({
                      ...params,
                      [control.key]: Number(event.target.value)
                    })
                  }
                  step={control.step}
                  type="range"
                  value={value}
                />
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
