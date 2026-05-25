import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { SynapseScene } from "./components/SynapseScene";
import {
  activeReceptorColor,
  buildVisualState,
  inactiveReceptorColor,
  interventionAccentColors,
  ligandColors,
  reuptakeActiveColor,
  reuptakeBaseColor,
  visualPalette
} from "./components/synapseVisualModel";
import { defaultParams, simulateTransmission } from "./simulation/model";
import { interventionProfiles } from "./simulation/profiles";
import type { InterventionId } from "./simulation/types";

describe("App", () => {
  it("renders the intervention selector and core visualizer", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /receptor-level neuropharmacology/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /baseline/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /reuptake/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /maoi/i })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /pam/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/molecules per pulse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/animated transmitter molecules/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/receptor note timeline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/information readout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/signal traces/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conceptual educational model only/i)).not.toBeInTheDocument();
    expect(document.querySelector(".signal-note")).toBeNull();
    expect(document.querySelector(".mechanism-strip")).toBeNull();
  });

  it("toggles the app between light and dark themes", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const appShell = container.querySelector(".app-shell");

    expect(appShell).toHaveAttribute("data-theme", "light");

    await user.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(appShell).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(appShell).toHaveAttribute("data-theme", "light");
  });

  it("uses theme-aware neutral anatomy colors and target-family palette accents", () => {
    const { container } = render(<App />);
    const axon = container.querySelector(".axon");
    const dendrite = container.querySelector(".dendrite");
    const fadeStop = container.querySelector("#timeline-left-fade stop");

    expect(axon).toHaveAttribute("fill", "var(--anatomy-axon-fill)");
    expect(axon).toHaveAttribute("stroke", "var(--anatomy-axon-stroke)");
    expect(dendrite).toHaveAttribute("fill", "var(--anatomy-dendrite-fill)");
    expect(dendrite).toHaveAttribute("stroke", "var(--anatomy-dendrite-stroke)");
    expect(axon).not.toHaveAttribute("fill", "url(#axon-gradient)");
    expect(dendrite).not.toHaveAttribute("fill", "url(#dendrite-gradient)");
    expect(fadeStop).toHaveAttribute("stop-color", "var(--timeline-fade-color)");

    expect(ligandColors.transmitter).toBe(inactiveReceptorColor);
    expect(activeReceptorColor).toBe(visualPalette.receptor.active);
    expect(reuptakeBaseColor).toBe(visualPalette.transporter.base);
    expect(reuptakeActiveColor).toBe(visualPalette.transporter.active);
    expect(ligandColors.agonist).toBe(activeReceptorColor);
    expect(ligandColors.releaser).toBe("#d56b2e");
    expect(ligandColors.reuptake_inhibitor).toBe("#8c514f");
    expect(ligandColors.releaser).not.toBe(ligandColors.reuptake_inhibitor);

    const releaserTab = screen.getByRole("tab", { name: /releaser/i });
    expect(releaserTab.style.getPropertyValue("--accent")).toBe(interventionAccentColors.releaser);
  });

  it("updates explanatory copy when an intervention is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /reuptake/i }));

    expect(screen.getByRole("tab", { name: /reuptake/i })).toHaveTextContent(/Transporter blockade/i);
    expect(screen.queryByText(/Drug molecules bind transporter sites/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Information effect/i)).not.toBeInTheDocument();
  });

  it("shows contextual scene tooltips instead of a single generic tooltip", () => {
    const { container } = render(<App />);
    const stage = container.querySelector(".synapse-stage") as HTMLElement;

    stage.getBoundingClientRect = () =>
      ({
        bottom: 560,
        height: 560,
        left: 0,
        right: 960,
        top: 0,
        width: 960,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }) as DOMRect;

    fireEvent.mouseMove(stage, { clientX: 110, clientY: 280 });
    expect(screen.getByRole("tooltip")).toHaveTextContent(/axon bouton/i);

    fireEvent.mouseMove(stage, { clientX: 712, clientY: 280 });
    expect(screen.getByRole("tooltip")).toHaveTextContent(/receptor site/i);

    fireEvent.mouseLeave(stage);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows releaser as a grounded reuptake-site leak", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /releaser/i }));

    expect(screen.getByLabelText(/intervention strength/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /releaser/i })).toHaveTextContent(/Extra transmitter leaks/i);
    expect(screen.queryByText(/reverse-transport-like state/i)).not.toBeInTheDocument();
  });

  it("shows representative examples for the mostly serotonergic drug set", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      Object.values(interventionProfiles).every(
        (profile) =>
          profile.representativeExample.name &&
          profile.representativeExample.mechanismLabel &&
          profile.representativeExample.mechanismLabel.endsWith(".") &&
          !Object.prototype.hasOwnProperty.call(profile.representativeExample, "caveat")
      )
    ).toBe(true);
    expect(screen.getByText("Serotonin (5-HT)")).toBeInTheDocument();
    expect(screen.getByText(/released by the modeled presynaptic neuron/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /reuptake/i }));
    expect(screen.getByText("Lexapro (escitalopram)")).toBeInTheDocument();
    expect(screen.getByText(/blocks serotonin reuptake transporters/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /releaser/i }));
    expect(screen.getByText("MDMA")).toBeInTheDocument();
    expect(screen.getByText(/strong serotonergic transporter effects/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^agonist\b/i }));
    expect(screen.getByText("Psilocybin (psilocin)")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /antagonist/i }));
    expect(screen.getByText("Ketanserin")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /pam/i }));
    expect(screen.getByText("Oleamide")).toBeInTheDocument();
    expect(screen.getByText(/potentiate 5-HT2A and 5-HT2C signaling/i)).toBeInTheDocument();
  });

  it("animates transporter arrow states for releaser and reuptake inhibitor", () => {
    const frame = simulateTransmission(defaultParams, 12);
    const findBoundTime = (id: InterventionId) => {
      for (let time = 0; time <= frame.duration; time += 0.04) {
        const state = buildVisualState(frame, time, defaultParams.moleculesPerPulse, {
          id,
          strength: 1
        });

        if (state.transporterOccupancies.some((occupancy) => occupancy.ligand?.ligandKind === id)) {
          return time;
        }
      }

      throw new Error(`No bound transporter state found for ${id}`);
    };

    const releaserTime = findBoundTime("releaser");
    const inhibitorTime = findBoundTime("reuptake_inhibitor");
    const { container, rerender } = render(
      <SynapseScene
        currentTime={releaserTime}
        drugStrength={1}
        frame={frame}
        moleculesPerPulse={defaultParams.moleculesPerPulse}
        onToggleTheme={() => undefined}
        selected="releaser"
        themeMode="light"
      />
    );

    const outwardArrow = container.querySelector(".transporter-arrow[data-direction='out']");
    expect(outwardArrow).not.toBeNull();
    expect(outwardArrow?.querySelector(".transporter-arrow-chevron")).toHaveStyle({
      transform: "rotate(180deg)"
    });

    rerender(
      <SynapseScene
        currentTime={inhibitorTime}
        drugStrength={1}
        frame={frame}
        moleculesPerPulse={defaultParams.moleculesPerPulse}
        onToggleTheme={() => undefined}
        selected="reuptake_inhibitor"
        themeMode="light"
      />
    );

    expect(container.querySelector(".transporter-arrow[data-direction='out']")).toBeNull();
    const blockedArrow = container.querySelector(".transporter-arrow[data-direction='blocked']");
    expect(blockedArrow).not.toBeNull();
    expect(blockedArrow?.querySelector(".transporter-arrow-line")).toHaveStyle({
      opacity: "1",
      transform: "scaleY(1)"
    });
  });

  it("does not render removed MAO/MAOI elements or copy", () => {
    render(<App />);

    expect(screen.queryByRole("tab", { name: /maoi/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/MAO/i)).not.toBeInTheDocument();
    expect(document.querySelector(".mao-enzyme")).toBeNull();
  });

  it("updates control values from intervention sliders", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /pam/i }));

    const strength = screen.getByLabelText(/intervention strength/i);
    fireEvent.change(strength, { target: { value: "0.9" } });

    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.queryByLabelText(/release amount/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/background noise/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/clearance/i)).not.toBeInTheDocument();
  });

  it("does not recolor receptor sites when an intervention is selected", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("tab", { name: /reuptake/i }));

    const receptorStrokes = Array.from(container.querySelectorAll(".receptors path")).map(
      (path) => path.getAttribute("stroke")
    );

    expect(receptorStrokes).not.toContain("#0c9b8a");
    receptorStrokes.forEach((stroke) => {
      expect([activeReceptorColor, inactiveReceptorColor]).toContain(stroke);
    });
  });
});
