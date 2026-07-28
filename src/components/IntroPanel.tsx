import { MousePointerClick, Music4, SlidersHorizontal, X } from "lucide-react";

interface IntroPanelProps {
  onDismiss: () => void;
}

const steps = [
  {
    Icon: SlidersHorizontal,
    text: "Pick a drug intervention on the left to change how the particles behave, then adjust pulse rate, particles per pulse, and intervention strength."
  },
  {
    Icon: MousePointerClick,
    text: "On desktop, hover any element in the scene to identify it. On any device, the Visual Glossary below labels every part."
  },
  {
    Icon: Music4,
    text: "Read the staff below the scene: each lane represents one receptor in the model, and a mark appears whenever that receptor signals. Turn on sound to hear each signal event."
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
        In the scene, the presynaptic axon on the left releases transmitter that drifts across the
        cleft to receptors on the postsynaptic dendrite at right.
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
      <p className="intro-scope">
        <strong>Educational scope.</strong> This is a qualitative, not-to-scale teaching model of
        receptor-level drug mechanisms. Its controls shape the animation only: particles, paths,
        timing, rates, counts, and signal markers are simplified visual cues—not biological
        measurements, doses, or predictions of brain or clinical effects. The scene depicts one
        conventional synapse, and drug names are representative examples. “Receptor signaling”
        refers to modeled downstream activity rather than neuronal firing; this visualization is not
        medical guidance.
      </p>
    </section>
  );
}
