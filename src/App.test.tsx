import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { getSignalNotePlaybackId, SynapseScene } from "./components/SynapseScene";
import {
  activeReceptorColor,
  buildVisualState,
  inactiveReceptorColor,
  interventionAccentColors,
  ligandColors,
  receptorSlots,
  reuptakeActiveColor,
  reuptakeBaseColor,
  synapseVisualTiming,
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
    expect(screen.getByText(/select drug intervention/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/molecules per pulse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/animated transmitter molecules/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/receptor note timeline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();
    expect(document.querySelector(".intervention-strength-placeholder")).not.toBeNull();
    expect(screen.queryByText(/information readout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/signal traces/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conceptual educational model only/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modeled signal/i)).not.toBeInTheDocument();
    expect(document.querySelector(".signal-note")).toBeNull();
    expect(document.querySelector(".mechanism-strip")).toBeNull();

    const pulseRate = screen.getByText(/pulse rate/i);
    const selectorLabel = screen.getByText(/select drug intervention/i);
    expect(Boolean(pulseRate.compareDocumentPosition(selectorLabel) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("uses cycle-aware audio playback ids for repeated visual notes", () => {
    const note = { age: 0.2, id: "pulse-transmitter-1.200-4-lock-0" };

    expect(getSignalNotePlaybackId(note, 3.4, 12)).toBe("0:pulse-transmitter-1.200-4-lock-0");
    expect(getSignalNotePlaybackId(note, 15.4, 12)).toBe("1:pulse-transmitter-1.200-4-lock-0");
  });

  it("draws subtle transmitter molecules inside release vesicles", () => {
    const frame = simulateTransmission(defaultParams, 12);
    const { container, rerender } = render(
      <SynapseScene
        currentTime={frame.eventMarkers[0] + 0.16}
        drugStrength={0}
        frame={frame}
        moleculesPerPulse={defaultParams.moleculesPerPulse}
        onToggleTheme={() => undefined}
        selected="baseline"
        themeMode="light"
      />
    );
    const vesicleTransmitters = container.querySelectorAll(".vesicle-transmitter");

    expect(vesicleTransmitters.length).toBeGreaterThanOrEqual(3);
    vesicleTransmitters.forEach((transmitter) => {
      expect(transmitter).toHaveAttribute("fill", ligandColors.transmitter);
    });

    const byVesicleId = new Map<string, Element[]>();
    vesicleTransmitters.forEach((transmitter) => {
      const vesicleId = transmitter.getAttribute("data-vesicle-id");
      if (!vesicleId) {
        return;
      }

      byVesicleId.set(vesicleId, [...(byVesicleId.get(vesicleId) ?? []), transmitter]);
    });
    byVesicleId.forEach((transmitters) => {
      transmitters.forEach((left, leftIndex) => {
        transmitters.slice(leftIndex + 1).forEach((right) => {
          const leftX = Number(left.getAttribute("cx"));
          const leftY = Number(left.getAttribute("cy"));
          const rightX = Number(right.getAttribute("cx"));
          const rightY = Number(right.getAttribute("cy"));
          const leftRadius = Number(left.getAttribute("r"));
          const rightRadius = Number(right.getAttribute("r"));

          expect(Math.hypot(leftX - rightX, leftY - rightY)).toBeGreaterThan(
            (leftRadius + rightRadius) * 0.72
          );
        });
      });
    });

    rerender(
      <SynapseScene
        currentTime={frame.eventMarkers[0] + synapseVisualTiming.releaseDelaySeconds + 0.04}
        drugStrength={0}
        frame={frame}
        moleculesPerPulse={defaultParams.moleculesPerPulse}
        onToggleTheme={() => undefined}
        selected="baseline"
        themeMode="light"
      />
    );

    expect(container.querySelectorAll(".vesicle-core").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".vesicle-transmitter")).toHaveLength(0);
  });

  it("toggles the app between light and dark themes", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const appShell = container.querySelector(".app-shell");

    expect(appShell).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await user.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(appShell).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(appShell).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
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

    const allostericSiteOutlines = container.querySelectorAll(".allosteric-site-outline");
    expect(allostericSiteOutlines).toHaveLength(5);
    allostericSiteOutlines.forEach((outline, index) => {
      const slot = receptorSlots[index];

      expect(outline.tagName.toLowerCase()).toBe("rect");
      expect(outline).toHaveAttribute("fill", "none");
      expect(outline).toHaveAttribute("stroke", ligandColors.pam);
      expect(outline).toHaveAttribute("transform", `translate(${slot.allosteric.x} ${slot.allosteric.y}) rotate(45)`);
    });

    const releaserTab = screen.getByRole("tab", { name: /releaser/i });
    expect(releaserTab.style.getPropertyValue("--accent")).toBe(interventionAccentColors.releaser);
  });

  it("updates explanatory copy when an intervention is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /reuptake/i }));
    await user.hover(screen.getByRole("tab", { name: /reuptake/i }));

    const tooltip = screen.getByRole("tooltip");

    expect(screen.getByRole("tab", { name: /reuptake/i })).toHaveTextContent(/Transporter blockade/i);
    expect(tooltip).toHaveTextContent(/transporter blockade signal/i);
    expect(tooltip).toHaveTextContent(/blocked transporters cannot absorb returning transmitter/i);
    expect(tooltip).toHaveTextContent(/Lexapro \(escitalopram\)/i);
    expect(tooltip.querySelector("span")?.textContent).not.toMatch(/serotonin|5-HT/i);
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
    expect(screen.queryByText("Serotonin (5-HT)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();

    await user.hover(screen.getByRole("tab", { name: /baseline/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Serotonin \(5-HT\)/i);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/released by the modeled presynaptic neuron/i);

    await user.hover(screen.getByRole("tab", { name: /reuptake/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Lexapro \(escitalopram\)/i);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/blocks serotonin reuptake transporters/i);

    await user.hover(screen.getByRole("tab", { name: /releaser/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/MDMA/i);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/strong serotonergic transporter effects/i);

    await user.hover(screen.getByRole("tab", { name: /^agonist\b/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Psilocybin \(psilocin\)/i);

    await user.hover(screen.getByRole("tab", { name: /antagonist/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Ketanserin/i);

    await user.hover(screen.getByRole("tab", { name: /pam/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Oleamide/i);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/potentiate 5-HT2A and 5-HT2C signaling/i);
  });

  it("animates transporter conformation states for releaser and reuptake inhibitor", () => {
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

    const outwardGlyph = container.querySelector(".transporter-glyph[data-conformation='out']");
    expect(outwardGlyph).not.toBeNull();
    expect(outwardGlyph?.querySelector("[data-rail='upper']")).toHaveStyle({
      transform: "translate(0px, -13px) rotate(12deg)"
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

    expect(container.querySelector(".transporter-glyph[data-conformation='out']")).toBeNull();
    const blockedGlyph = container.querySelector(".transporter-glyph[data-conformation='blocked']");
    expect(blockedGlyph).not.toBeNull();
    expect(blockedGlyph?.querySelector("[data-rail='upper']")).toHaveStyle({
      transform: "translate(0px, -5px) rotate(0deg)"
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
    expect(document.querySelector(".intervention-strength-placeholder")).toBeNull();
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
