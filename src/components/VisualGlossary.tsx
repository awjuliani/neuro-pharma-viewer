import type { ReactNode } from "react";
import {
  AllostericSiteOutline,
  DockedTransporterDrug,
  LigandGlyph,
  ReceptorGlyph,
  TransporterGlyph
} from "./SynapseGlyphs";
import { interventionProfiles } from "../simulation/profiles";
import type { InterventionId } from "../simulation/types";
import {
  ligandColors,
  reuptakeActiveColor,
  reuptakeBaseColor,
  type LigandKind
} from "./synapseVisualModel";

interface GlossaryEntry {
  description: string;
  id: string;
  name: string;
  renderGlyph: () => ReactNode;
}

interface GlossaryGroup {
  entries: GlossaryEntry[];
  id: string;
  title: string;
}

const withRepresentativeExample = (description: string, interventionId: InterventionId) => {
  const example = interventionProfiles[interventionId].representativeExample;

  return `${description} Representative example: ${example.name}`;
};

const ligandEntry = (
  ligandKind: LigandKind,
  name: string,
  description: string,
  interventionId: InterventionId
): GlossaryEntry => ({
  description: withRepresentativeExample(description, interventionId),
  id: `molecule-${ligandKind}`,
  name,
  renderGlyph: () => (
    <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
      <LigandGlyph
        className="glossary-ligand"
        ligandKind={ligandKind}
        radius={ligandKind === "transmitter" ? 10 : 9.5}
        x={60}
        y={41}
      />
    </svg>
  )
});

const antagonistDockedLigand = {
  age: 0,
  alpha: 1,
  id: "glossary-antagonist-bound",
  ligandKind: "antagonist" as const,
  position: { x: 31, y: 0 },
  target: { kind: "receptor_orthosteric" as const, slotIndex: 0 }
};

const glossaryGroups = [
  {
    id: "anatomy",
    title: "Anatomy",
    entries: [
      {
        description:
          "The axon bouton is the presynaptic terminal of a neuron. In chemical synapses, this is where electrical activity is converted into vesicle fusion and transmitter release.",
        id: "axon-bouton",
        name: "Axon bouton",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <path
              d="M-12 29 C2 29 16 27 24 21 C31 15 27 14 34 14 A27 27 0 0 1 34 68 C27 68 31 67 24 61 C16 55 2 53 -12 53 Z"
              fill="var(--anatomy-axon-fill)"
              stroke="var(--anatomy-axon-stroke)"
              strokeWidth="3"
            />
            <circle className="vesicle-core" cx="30" cy="32" r="10" />
            <circle className="vesicle-rim" cx="30" cy="32" r="10" />
            <circle cx="52" cy="41" fill={ligandColors.transmitter} opacity="0.76" r="5.4" />
          </svg>
        )
      },
      {
        description:
          "The synaptic cleft is the narrow extracellular gap between presynaptic and postsynaptic membranes. Its small size helps released transmitter rapidly encounter receptors, reuptake transporters, or diffusion paths away from the synapse.",
        id: "synaptic-cleft",
        name: "Synaptic cleft",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <path
              d="M-10 30 C2 30 14 28 21 22 C27 17 22 16 26 16 A25 25 0 0 1 26 66 C22 66 27 65 21 60 C14 54 2 52 -10 52 Z"
              fill="var(--anatomy-axon-fill)"
              stroke="var(--anatomy-axon-stroke)"
              strokeWidth="3"
            />
            <path
              d="M130 30 C118 30 106 28 99 22 C93 17 98 16 94 16 A25 25 0 0 0 94 66 C98 66 93 65 99 60 C106 54 118 52 130 52 Z"
              fill="var(--anatomy-dendrite-fill)"
              stroke="var(--anatomy-dendrite-stroke)"
              strokeWidth="3"
            />
            <circle cx="50" cy="31" fill={ligandColors.transmitter} opacity="0.74" r="4.8" />
            <circle cx="65" cy="45" fill={ligandColors.transmitter} opacity="0.56" r="5.4" />
            <circle cx="42" cy="55" fill={ligandColors.transmitter} opacity="0.38" r="3.8" />
          </svg>
        )
      },
      {
        description:
          "A dendrite is a postsynaptic receiving compartment of a neuron. Receptors sit in its membrane, where extracellular ligand binding can be converted into intracellular signaling inside the postsynaptic cell.",
        id: "dendrite",
        name: "Dendrite",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <path
              d="M132 29 C118 29 104 27 96 21 C89 15 93 14 86 14 A27 27 0 0 0 86 68 C93 68 89 67 96 61 C104 55 118 53 132 53 Z"
              fill="var(--anatomy-dendrite-fill)"
              stroke="var(--anatomy-dendrite-stroke)"
              strokeWidth="3.4"
            />
            <g
              className="glossary-dendrite-receptor"
              transform="translate(62 30) rotate(24) scale(0.34)"
            >
              <ReceptorGlyph active={false} noteIntensity={1} />
            </g>
            <g
              className="glossary-dendrite-receptor"
              transform="translate(62 52) rotate(-24) scale(0.34)"
            >
              <ReceptorGlyph active={false} noteIntensity={1} />
            </g>
          </svg>
        )
      },
      {
        description:
          "Synaptic vesicles are membrane-bound packets that store transmitter inside the presynaptic terminal. When they fuse with the axon membrane, transmitter is released into the cleft in a brief pulse.",
        id: "release-vesicle",
        name: "Synaptic vesicle",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <circle className="vesicle-core" cx="56" cy="41" r="20" />
            <circle cx="50" cy="37" fill={ligandColors.transmitter} opacity="0.58" r="5.2" />
            <circle cx="62" cy="35" fill={ligandColors.transmitter} opacity="0.48" r="4.4" />
            <circle cx="59" cy="49" fill={ligandColors.transmitter} opacity="0.5" r="5" />
            <circle className="vesicle-rim" cx="56" cy="41" r="20" />
          </svg>
        )
      }
    ]
  },
  {
    id: "receptors",
    title: "Receptors",
    entries: [
      {
        description:
          "An open receptor has an available orthosteric binding site on the postsynaptic membrane. It is silent until a compatible ligand binds and stabilizes an active signaling state.",
        id: "open-receptor",
        name: "Open receptor",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-receptor" transform="translate(48 41)">
              <ReceptorGlyph active={false} noteIntensity={1} />
            </g>
          </svg>
        )
      },
      {
        description:
          "An active receptor is currently producing a postsynaptic signal event. This represents ligand binding being converted into downstream cellular activity, shown here with a compact visual signal marker.",
        id: "active-receptor",
        name: "Active receptor",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-receptor" transform="translate(48 41)">
              <ReceptorGlyph active={true} noteIntensity={1} />
              <LigandGlyph ligandKind="transmitter" radius={5.8} x={31} y={0} />
            </g>
          </svg>
        )
      },
      {
        description:
          "An antagonist-bound receptor has its orthosteric site occupied but is not activated. That binding site is unavailable while the antagonist is docked, so transmitter cannot use that receptor site to signal.",
        id: "antagonist-bound-receptor",
        name: "Antagonist-bound receptor",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-receptor" transform="translate(48 41)">
              <ReceptorGlyph
                active={false}
                noteIntensity={1}
                orthosteric={antagonistDockedLigand}
              />
              <LigandGlyph ligandKind="antagonist" radius={5.8} x={31} y={0} />
            </g>
          </svg>
        )
      },
      {
        description:
          "An allosteric site is a regulatory binding site separate from the orthosteric transmitter site. Ligands at this site can change how strongly the receptor responds when the main site is activated.",
        id: "allosteric-site",
        name: "Allosteric site",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-receptor" transform="translate(38 48)">
              <ReceptorGlyph active={false} noteIntensity={1} />
            </g>
            <AllostericSiteOutline active={true} x={84} y={28} />
            <LigandGlyph ligandKind="pam" radius={5.4} x={84} y={28} />
          </svg>
        )
      }
    ]
  },
  {
    id: "transporters",
    title: "Transporters",
    entries: [
      {
        description:
          "An open reuptake transporter is available to move nearby transmitter back toward the presynaptic side. Transporters help terminate signaling by reducing transmitter in the extracellular space.",
        id: "open-transporter",
        name: "Open transporter",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-transporter" transform="translate(60 41)">
              <TransporterGlyph color={reuptakeBaseColor} mode="in" railHeight={7.5} />
            </g>
          </svg>
        )
      },
      {
        description:
          "A blocked transporter is occupied by a reuptake inhibitor in this model. That transporter cannot reuptake or clear transmitter while blocked, so nearby transmitter has more opportunity for additional receptor encounters.",
        id: "blocked-transporter",
        name: "Blocked transporter",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-transporter" transform="translate(60 41)">
              <TransporterGlyph color={reuptakeBaseColor} mode="blocked" railHeight={7.5} />
              <DockedTransporterDrug fill={ligandColors.reuptake_inhibitor} />
            </g>
          </svg>
        )
      },
      {
        description:
          "A reversed transporter is represented as outward-facing and releasing transmitter into the cleft. This captures the concept that some drugs can drive transporter-mediated transmitter efflux rather than simple reuptake.",
        id: "reversed-transporter",
        name: "Reversed transporter",
        renderGlyph: () => (
          <svg aria-hidden="true" className="glossary-svg" focusable="false" viewBox="0 0 120 82">
            <g className="glossary-transporter" transform="translate(60 41)">
              <TransporterGlyph color={reuptakeActiveColor} mode="out" railHeight={8.8} />
              <DockedTransporterDrug fill={ligandColors.releaser} />
            </g>
          </svg>
        )
      }
    ]
  },
  {
    id: "molecules",
    title: "Molecules",
    entries: [
      ligandEntry(
        "transmitter",
        "Transmitter",
        "A transmitter is an endogenous neurotransmitter released by a neuron. In this model, transmitter crosses the cleft, briefly binds receptors, and can then be cleared by reuptake transporters or drift away.",
        "baseline"
      ),
      ligandEntry(
        "reuptake_inhibitor",
        "Reuptake inhibitor",
        "A reuptake inhibitor is represented as a drug ligand that occupies transporter sites. By blocking transporter-mediated reuptake, it leaves more transmitter available in the cleft for possible receptor encounters.",
        "reuptake_inhibitor"
      ),
      ligandEntry(
        "releaser",
        "Releaser",
        "A releaser is represented as a drug ligand that changes transporter behavior. Instead of only clearing transmitter through reuptake, the occupied transporter can drive transmitter efflux back into the cleft.",
        "releaser"
      ),
      ligandEntry(
        "agonist",
        "Agonist",
        "An agonist is a ligand that activates a receptor after binding, often at the orthosteric site. In this visualization, agonist binding can create postsynaptic signal events without waiting for a presynaptic transmitter pulse.",
        "agonist"
      ),
      ligandEntry(
        "antagonist",
        "Antagonist",
        "An antagonist binds a receptor site without activating the receptor. Because it occupies the orthosteric binding site, it can prevent transmitter or agonists from producing a signal there.",
        "antagonist"
      ),
      ligandEntry(
        "pam",
        "PAM",
        "A positive allosteric modulator binds a separate regulatory site rather than the orthosteric transmitter site. In this model it does not signal alone, but it can amplify a later transmitter-driven receptor response.",
        "pam"
      )
    ]
  }
] satisfies GlossaryGroup[];

export function VisualGlossary() {
  return (
    <section aria-labelledby="visual-glossary-title" className="visual-glossary">
      <div className="glossary-heading">
        <p className="eyebrow">Learning reference</p>
        <h2 id="visual-glossary-title">Visual Glossary</h2>
      </div>
      <div className="glossary-groups">
        {glossaryGroups.map((group) => (
          <section className="glossary-group" data-glossary-group={group.id} key={group.id}>
            <h3>{group.title}</h3>
            <div className="glossary-grid">
              {group.entries.map((entry) => (
                <article className="glossary-entry" data-glossary-entry={entry.id} key={entry.id}>
                  <div className="glossary-visual">{entry.renderGlyph()}</div>
                  <div className="glossary-copy">
                    <h4>{entry.name}</h4>
                    <p>{entry.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
