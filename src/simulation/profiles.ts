import type { InterventionId, InterventionProfile } from "./types";

export const interventionProfiles: Record<InterventionId, InterventionProfile> = {
  baseline: {
    id: "baseline",
    name: "Baseline transmission",
    shortName: "Baseline",
    subtitle: "Fast pulse, fast cleanup",
    mechanism:
      "A presynaptic pulse releases transmitter into the cleft. Transmitter can bind a GPCR-like receptor, then unbound transmitter can be cleared by local reuptake transporters or diffuse out of the modeled cleft.",
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
      "Drug molecules bind transporter sites on the axon. Occupied transporters cannot absorb transmitter, while open transporters still can.",
    representativeExample: {
      mechanismLabel: "A representative SSRI that blocks serotonin reuptake transporters.",
      name: "Lexapro (escitalopram)"
    }
  },
  releaser: {
    id: "releaser",
    name: "Releaser",
    shortName: "Releaser",
    subtitle: "Extra transmitter leaks into the cleft",
    mechanism:
      "Drug molecules bind transporter sites and push them into a reverse-transport-like state, leaking extra transmitter back into the cleft.",
    representativeExample: {
      mechanismLabel: "A representative monoamine releaser with strong serotonergic transporter effects.",
      name: "MDMA"
    }
  },
  agonist: {
    id: "agonist",
    name: "Agonist",
    shortName: "Agonist",
    subtitle: "Direct receptor activation",
    mechanism:
      "Drug molecules bind receptor pockets directly. When an agonist docks, the receptor activates and emits a signal note.",
    representativeExample: {
      mechanismLabel: "A representative serotonergic psychedelic whose active metabolite activates 5-HT receptors.",
      name: "Psilocybin (psilocin)"
    }
  },
  antagonist: {
    id: "antagonist",
    name: "Antagonist",
    shortName: "Antagonist",
    subtitle: "Receptor response is blocked",
    mechanism:
      "Drug molecules plug receptor pockets without activating them. While a receptor is occupied, transmitter cannot lock there.",
    representativeExample: {
      mechanismLabel: "A representative 5-HT2A antagonist that blocks serotonin receptor activation.",
      name: "Ketanserin"
    }
  },
  pam: {
    id: "pam",
    name: "Positive allosteric modulator",
    shortName: "PAM",
    subtitle: "Pulse-linked gain boost",
    mechanism:
      "Drug molecules bind an allosteric side site. They do not signal alone, but transmitter locks on PAM-bound receptors emit larger notes.",
    representativeExample: {
      mechanismLabel: "A representative endogenous lipid amide reported to potentiate 5-HT2A and 5-HT2C signaling.",
      name: "Oleamide"
    }
  }
};
