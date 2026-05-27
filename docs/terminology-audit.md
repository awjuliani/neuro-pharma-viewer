# Terminology Audit

This audit keeps the simulator generic and monoaminergic/GPCR-like. Serotonin-related compounds are treated as representative examples, not as claims that the model is serotonin-specific.

| Current term or pattern | Recommended term | Where it appears | Reasoning | Priority |
| --- | --- | --- | --- | --- |
| Axon bouton | Axon bouton / presynaptic terminal | Anatomy glossary, scene tooltip | "Axon bouton" is approachable; "presynaptic terminal" grounds the biology in the description. | Keep |
| Dendrite | Dendrite / postsynaptic membrane | Anatomy glossary, scene tooltip | "Dendrite" is beginner-friendly; descriptions should clarify that receptor signaling is postsynaptic. | Keep |
| Release vesicle | Synaptic vesicle | Glossary and scene tooltip | "Synaptic vesicle" is the standard term for transmitter-containing presynaptic vesicles. | Must-fix |
| Cleanup / absorb | Reuptake / clearance | Intervention copy, transporter tooltips, glossary | Transporters do not generally "absorb" transmitter; they clear it by reuptake. | Must-fix |
| Releaser-bound transporter | Reversed transporter | Transporter glossary and scene tooltip | The state is a transporter configuration, not a separate object; "reversed" better conveys transporter-mediated efflux. | Keep |
| Leak | Efflux / transmitter efflux | Releaser and reversed-transporter copy | "Leak" is intuitive but imprecise; use "efflux" in descriptions for neuropharmacology grounding. | Must-fix |
| Receptor pocket | Orthosteric receptor site | Receptor, agonist, antagonist copy | "Orthosteric site" distinguishes the main ligand site from allosteric regulatory sites. | Must-fix |
| Allosteric side site | Allosteric regulatory site | PAM and allosteric site copy | "Regulatory site" is clearer and more standard than "side site." | Must-fix |
| Signal note | Postsynaptic signal event / visual signal marker | Timeline aria label, glossary, tooltips | "Note" is a visual/audio metaphor; descriptions should say it represents postsynaptic signaling. | Must-fix |
| Receptor note timeline | Postsynaptic signal timeline | Timeline aria label | The timeline shows modeled postsynaptic signaling, not receptors themselves. | Must-fix |
| Transmitter | Transmitter / neurotransmitter | Molecule glossary, scene tooltip | "Transmitter" remains concise; descriptions should introduce "neurotransmitter." | Keep |
| PAM | Positive allosteric modulator (PAM) | Intervention and molecule copy | The acronym is useful, but the expanded term should appear in explanatory copy. | Keep |
| Internal `absorbing` phase and occupancy field | Consider `reuptaking` or `beingReuptaken` | `synapseVisualModel` internals and tests | Internal-only but biologically imprecise; rename only with a focused internal refactor because it touches model contracts and tests. | Nice-to-fix |
| Internal `lock` wording in ids/helpers | Consider `bindingEvent` or `activationEvent` | `synapseVisualModel` internals and tests | Internal-only visual scheduling metaphor; not urgent while hidden from users. | Nice-to-fix |
| Internal `SignalNote` type/class naming | Consider `PostsynapticSignalEvent` for future refactor | Timeline and visual model internals | "Note" is acceptable as a rendering metaphor but less clear as a model concept. | Nice-to-fix |

## Canonical User-Facing Terms

- Anatomy: axon bouton, presynaptic terminal, synaptic cleft, dendrite, postsynaptic membrane, synaptic vesicle.
- Receptors: receptor, orthosteric receptor site, allosteric regulatory site, active receptor, antagonist-bound receptor, PAM-enhanced activation.
- Transporters: reuptake transporter, blocked transporter, reversed transporter, transporter-mediated efflux, reuptake, clearance.
- Molecules: transmitter, neurotransmitter, agonist, antagonist, reuptake inhibitor, releaser, positive allosteric modulator (PAM).
- Visual metaphors: postsynaptic signal event, visual signal marker, postsynaptic signal timeline, activation glow.

## Implementation Status

Must-fix user-facing copy has been applied across intervention profiles, intervention tooltips, scene tooltips, the visual glossary, and timeline accessibility labels. Internal-only `absorbing`, `lock`, and `SignalNote` names remain documented as nice-to-fix because they are stable model/rendering contracts rather than user-facing terminology.
