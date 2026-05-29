export const keyConcepts = [
  {
    definition:
      "A nerve cell that communicates by sending and receiving electrical and chemical signals.",
    term: "Neuron"
  },
  {
    definition:
      "The communication junction where one cell can influence another through released chemical messengers.",
    term: "Synapse"
  },
  {
    definition: "The sending side of a synapse, where chemical messenger release begins.",
    term: "Presynaptic"
  },
  {
    definition:
      "The receiving side of a synapse, where binding can be converted into cell signaling.",
    term: "Postsynaptic"
  },
  {
    definition:
      "The thin boundary of a cell. Many signaling proteins sit in or across this surface.",
    term: "Membrane"
  },
  {
    definition:
      "Any molecule that binds to a target protein or site. In this app, both natural messengers and drug-like molecules can act as ligands.",
    term: "Ligand"
  },
  {
    definition: "A specific part of a protein where a ligand can attach.",
    term: "Binding site"
  },
  {
    definition: "The main binding site where the natural messenger, or a direct mimic, attaches.",
    term: "Orthosteric"
  },
  {
    definition: "Made within the body or modeled cell system.",
    term: "Endogenous"
  },
  {
    definition: "Coming from outside the body or modeled system, such as a drug.",
    term: "Exogenous"
  },
  {
    definition:
      "Changing how strongly a response happens, rather than simply turning it on by itself.",
    term: "Modulation"
  },
  {
    definition: "Movement out of a cell or terminal into the surrounding extracellular space.",
    term: "Efflux"
  },
  {
    definition:
      "Removal of released chemical messenger from extracellular space by reuptake or diffusion away.",
    term: "Clearance"
  }
];

export function KeyConcepts() {
  return (
    <section aria-labelledby="key-concepts-title" className="panel key-concepts">
      <div className="key-concepts-heading">
        <p className="eyebrow">Before the glossary</p>
        <h2 id="key-concepts-title">Key Concepts</h2>
      </div>
      <dl className="key-concepts-list">
        {keyConcepts.map((concept) => (
          <div className="key-concept" key={concept.term}>
            <dt>{concept.term}</dt>
            <dd>{concept.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
