import type { InterventionId, InterventionProfile } from "./types";

export const interventionProfiles: Record<InterventionId, InterventionProfile> = {
  baseline: {
    id: "baseline",
    name: "Baseline transmission",
    shortName: "Baseline",
    subtitle: "Fast release, fast reuptake",
    mechanism:
      "A presynaptic pulse releases transmitter into the synaptic cleft. Transmitter can bind a GPCR-like receptor, then unbound transmitter can be cleared by local reuptake transporters or diffuse out of the modeled cleft.",
    representativeExample: {
      mechanismLabel: "The endogenous transmitter released by the modeled presynaptic neuron.",
      name: "Serotonin (5-HT)"
    }
  },
  reuptake_inhibitor: {
    id: "reuptake_inhibitor",
    name: "Reuptake inhibitor",
    shortName: "Reuptake",
    subtitle: "Transporter blockade",
    mechanism:
      "Drug molecules bind transporter sites on the axon. Occupied transporters cannot reuptake transmitter, while open transporters can still clear it.",
    representativeExample: {
      mechanismLabel: "A representative SSRI that blocks serotonin reuptake transporters.",
      name: "Lexapro (escitalopram)"
    }
  },
  releaser: {
    id: "releaser",
    name: "Releaser",
    shortName: "Releaser",
    subtitle: "Transporter-mediated efflux",
    mechanism:
      "Releaser molecules interact with transporter sites and promote transporter-mediated transmitter efflux into the cleft while reducing reuptake. Intracellular and vesicular steps are not modeled here.",
    representativeExample: {
      mechanismLabel:
        "A representative monoamine releaser with strong serotonergic transporter effects.",
      name: "MDMA"
    }
  },
  agonist: {
    id: "agonist",
    name: "Agonist",
    shortName: "Agonist",
    subtitle: "Direct receptor activation",
    mechanism:
      "Drug molecules bind receptor orthosteric sites directly. When an agonist docks, the receptor activates and produces a postsynaptic signal event.",
    representativeExample: {
      mechanismLabel:
        "The active psychedelic metabolite of psilocybin, which activates 5-HT receptors.",
      name: "Psilocin (active form of psilocybin)"
    }
  },
  antagonist: {
    id: "antagonist",
    name: "Antagonist",
    shortName: "Antagonist",
    subtitle: "Orthosteric site blockade",
    mechanism:
      "Drug molecules occupy receptor orthosteric sites without activating them. While a receptor site is occupied, transmitter cannot bind there.",
    representativeExample: {
      mechanismLabel: "A representative antagonist that blocks 5-HT2A receptor activation.",
      name: "Ketanserin (5-HT2A antagonist)"
    }
  },
  pam: {
    id: "pam",
    name: "Positive allosteric modulator",
    shortName: "PAM",
    subtitle: "Allosteric gain boost",
    mechanism:
      "Drug molecules bind an allosteric regulatory site. They do not signal alone, but transmitter activation at PAM-bound receptors produces stronger postsynaptic signal events.",
    representativeExample: {
      mechanismLabel:
        "A representative endogenous lipid amide reported to potentiate 5-HT2A and 5-HT2C signaling.",
      name: "Oleamide"
    }
  }
};
