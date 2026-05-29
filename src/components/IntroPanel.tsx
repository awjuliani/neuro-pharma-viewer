import { MousePointerClick, Music4, SlidersHorizontal, X } from "lucide-react";

interface IntroPanelProps {
  onDismiss: () => void;
}

const steps = [
  {
    Icon: SlidersHorizontal,
    text: "Pick a drug intervention on the left to change how the molecules behave, then adjust pulse rate, molecules per pulse, and intervention strength."
  },
  {
    Icon: MousePointerClick,
    text: "Hover any element in the scene — a molecule, receptor, or transporter — to identify it and see what it is doing."
  },
  {
    Icon: Music4,
    text: "Read the staff below the scene: each lane is one receptor, and a mark appears whenever that receptor fires. Turn on sound to hear each signal event."
  }
];

export function IntroPanel({ onDismiss }: IntroPanelProps) {
  return (
    <section aria-labelledby="intro-panel-title" className="panel intro-panel">
      <button
        aria-label="Dismiss introduction"
        className="intro-dismiss"
        onClick={onDismiss}
        type="button"
      >
        <X aria-hidden="true" size={18} />
      </button>
      <div className="intro-heading">
        <p className="eyebrow">Start here</p>
        <h2 id="intro-panel-title">How to read this synapse</h2>
      </div>
      <p className="intro-lede">
        This is a single chemical synapse. The presynaptic axon on the left releases transmitter
        that drifts across the cleft to receptors on the postsynaptic dendrite at right.
      </p>
      <ol className="intro-steps">
        {steps.map(({ Icon, text }) => (
          <li className="intro-step" key={text}>
            <span className="intro-step-icon">
              <Icon aria-hidden="true" size={18} strokeWidth={2.1} />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
