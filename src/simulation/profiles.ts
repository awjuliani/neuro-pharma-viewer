import type { InterventionId, InterventionProfile } from "./types";

export const interventionProfiles: Record<InterventionId, InterventionProfile> = {
  baseline: {
    id: "baseline",
    name: "Baseline transmission",
    shortName: "Baseline",
    subtitle: "Fast pulse, fast cleanup",
    mechanism:
      "A presynaptic pulse releases transmitter into the cleft. Transmitter can bind a GPCR-like receptor, then unbound transmitter can be cleared by reuptake transporters or MAO-like enzymes."
  },
  reuptake_inhibitor: {
    id: "reuptake_inhibitor",
    name: "Reuptake inhibitor",
    shortName: "Reuptake",
    subtitle: "Transporter blockade",
    mechanism:
      "Drug molecules bind transporter sites on the axon. Occupied transporters cannot absorb transmitter, while open transporters still can."
  },
  releaser: {
    id: "releaser",
    name: "Releaser",
    shortName: "Releaser",
    subtitle: "Extra transmitter leaks into the cleft",
    mechanism:
      "Drug molecules bind transporter sites and make occupied transporters leak extra transmitter back into the cleft."
  },
  maoi: {
    id: "maoi",
    name: "MAO inhibitor",
    shortName: "MAOI",
    subtitle: "Enzymatic cleanup blocked",
    mechanism:
      "Drug molecules bind MAO-like clearing enzymes in the cleft. Occupied enzymes cannot bind and remove free transmitter."
  },
  agonist: {
    id: "agonist",
    name: "Agonist",
    shortName: "Agonist",
    subtitle: "Direct receptor activation",
    mechanism:
      "Drug molecules bind receptor pockets directly. When an agonist docks, the receptor activates and emits a signal note."
  },
  antagonist: {
    id: "antagonist",
    name: "Antagonist",
    shortName: "Antagonist",
    subtitle: "Receptor response is blocked",
    mechanism:
      "Drug molecules plug receptor pockets without activating them. While a receptor is occupied, transmitter cannot lock there."
  },
  pam: {
    id: "pam",
    name: "Positive allosteric modulator",
    shortName: "PAM",
    subtitle: "Pulse-linked gain boost",
    mechanism:
      "Drug molecules bind an allosteric side site. They do not signal alone, but transmitter locks on PAM-bound receptors emit larger notes."
  }
};
