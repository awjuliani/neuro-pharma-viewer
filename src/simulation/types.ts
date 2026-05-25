export type InterventionId =
  | "baseline"
  | "reuptake_inhibitor"
  | "releaser"
  | "agonist"
  | "antagonist"
  | "pam";

export interface SimulationParams {
  drugStrength: number;
  pulseRate: number;
  moleculesPerPulse: number;
}

export interface InterventionProfile {
  id: InterventionId;
  name: string;
  shortName: string;
  subtitle: string;
  mechanism: string;
}

export interface SimulationFrame {
  duration: number;
  dt: number;
  eventMarkers: number[];
}
