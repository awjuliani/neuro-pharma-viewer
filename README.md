# Neuropharmacology Synapse Visualizer

A client-only educational web app for building intuition about receptor-level neuropharmacology. The app shows a simplified monoaminergic-style synapse with an axon bouton, dendrite, transmitter molecules, receptor sites, transporter/reuptake sites, vesicle release, receptor locking, signal notes, and an audible note layer.

The simulation is intentionally qualitative. It is meant to visualize mechanism and information flow, not to model pharmacokinetics, pharmacodynamics, clinical effects, dose response, or medical guidance.

## Current Scope

- Generic monoaminergic-style synapse and generic GPCR-like receptors.
- Five dendrite receptor sites.
- Two axon transporter/reuptake sites.
- Pulse-coupled vesicle release followed by transmitter diffusion.
- Receptor locking with visual receptor activation.
- A moving musical staff timeline with one lane per receptor.
- Optional Web Audio tones triggered by real receptor signal events.
- Grounded intervention classes:
  - Baseline transmission
  - Reuptake inhibitor
  - Releaser
  - Agonist
  - Antagonist
  - Positive allosteric modulator

## Mechanism Model

The app uses a deterministic toy visual model. Molecules are generated from pulse events, transporter leaks, or ambient drug entry. Signal notes are caused by actual receptor activation events, not by a separate fake readout.

Interventions are represented as visible ligand/site interactions:

- Reuptake inhibitors bind transporter sites and block uptake at occupied transporters.
- Releasers bind transporter sites and shift them into a conceptual reverse-transport-like state that leaks endogenous transmitter into the cleft.
- Agonists bind receptor orthosteric sites and directly activate receptors.
- Antagonists bind receptor orthosteric sites and block activation.
- PAMs bind receptor allosteric sites and amplify later transmitter-driven receptor notes.

This is not a quantitative biological model. Parameter values and paths are chosen for visual clarity and conceptual accuracy.

## Tech Stack

- Vite
- React
- TypeScript
- SVG for fixed biological structures and signal notes
- Canvas for moving molecule particles
- Vitest and Testing Library for unit/component tests
- Playwright for smoke tests
- `lucide-react` for UI icons

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Build for the GitHub Pages project URL:

```bash
npm run build:pages
```

Run unit and component tests:

```bash
npm test
```

Run Playwright smoke tests:

```bash
npm run test:e2e
```

## Project Map

- `src/components/SynapseScene.tsx`: main visualization, canvas drawing, SVG scene, staff timeline, and optional audio.
- `src/components/synapseVisualModel.ts`: deterministic visual simulation and ligand/site model.
- `src/components/signalTimelineModel.ts`: pure helper for deriving timeline note history from receptor note events.
- `src/components/ControlsPanel.tsx`: intervention selector and visual controls.
- `src/simulation/model.ts`: pulse schedule generation.
- `src/simulation/profiles.ts`: intervention names and explanatory copy.
- `e2e/smoke.spec.ts`: browser smoke coverage for desktop and mobile layouts.

## GitHub Pages Deployment

This is a Vite app, so GitHub Pages should serve the built `dist` output, not the source files in the repository root.

For the project page at `https://awjuliani.github.io/neuro-pharma-viewer/`, use:

```bash
npm run build:pages
```

The Pages-specific build sets Vite's asset base path to `/neuro-pharma-viewer/`. Without that base path, the hosted page can load `index.html` but fail to find the JavaScript and CSS assets.

If you add a Pages workflow at `.github/workflows/deploy-pages.yml`, have it run `npm run build:pages` and deploy the `dist` directory. In GitHub, set Pages to deploy from GitHub Actions.

## Development Notes

- Keep new visual effects causal where possible. If a receptor glows, a note appears, or audio plays, it should come from a modeled binding/activation event.
- Avoid adding fake metric panels or quantitative claims unless the model is explicitly extended to support them.
- Keep the first screen as the working visualizer rather than a landing page.
- The app is fully local and stores no user data.
