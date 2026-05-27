import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  getDendriteActivationGlowSpec,
  getReceptorRenderColors,
  getSignalNotePlaybackId,
  getSignalSustainPlaybackId,
  getSignalToneAudioSpec,
  resizeMoleculeCanvasForDisplay,
  SynapseScene
} from "./components/SynapseScene";
import { VisualGlossary } from "./components/VisualGlossary";
import {
  activeReceptorColor,
  activeReceptorFill,
  antagonistBoundReceptorColor,
  antagonistBoundReceptorFill,
  buildVisualState,
  inactiveReceptorColor,
  interventionAccentColors,
  ligandColors,
  pamEnhancedReceptorColor,
  pamEnhancedReceptorFill,
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
    expect(screen.getByRole("tab", { name: /^reuptake\b/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /maoi/i })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /pam/i })).toBeInTheDocument();
    expect(screen.getByText(/select drug intervention/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/molecules per pulse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/molecules per pulse/i)).toHaveAttribute("max", "12");
    expect(screen.getByLabelText(/molecules per pulse/i)).toHaveValue("6");
    expect(screen.getByLabelText(/pulse rate/i)).toHaveAttribute("max", "1.2");
    expect(screen.getByLabelText(/pulse rate/i)).toHaveValue("0.6");
    expect(screen.getByLabelText(/animated transmitter molecules/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postsynaptic signal timeline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pause simulation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to half speed/i })).toBeInTheDocument();
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

  it("renders a visual glossary below the simulator", () => {
    render(<App />);

    const timeline = screen.getByLabelText(/postsynaptic signal timeline/i);
    const glossaryHeading = screen.getByRole("heading", { name: /visual glossary/i });

    expect(glossaryHeading).toBeInTheDocument();
    expect(screen.getByText("Transmitter")).toBeInTheDocument();
    expect(screen.getByText("Active receptor")).toBeInTheDocument();
    expect(screen.getByText("Blocked transporter")).toBeInTheDocument();
    expect(screen.getByText("Synaptic vesicle")).toBeInTheDocument();
    expect(screen.queryByText("Release vesicle")).not.toBeInTheDocument();
    expect(screen.queryByText("Signal output")).not.toBeInTheDocument();
    expect(screen.queryByText("Receptor note")).not.toBeInTheDocument();
    expect(screen.getAllByText(/orthosteric binding site/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/transporter-mediated transmitter efflux/i).length).toBeGreaterThan(0);
    expect(Boolean(timeline.compareDocumentPosition(glossaryHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(
      Boolean(
        screen
          .getByRole("heading", { name: "Receptors" })
          .compareDocumentPosition(screen.getByRole("heading", { name: "Transporters" })) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
    expect(
      Boolean(
        screen
          .getByRole("heading", { name: "Transporters" })
          .compareDocumentPosition(screen.getByRole("heading", { name: "Molecules" })) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
  });

  it("uses shared palette constants in visual glossary glyphs", () => {
    const { container } = render(<VisualGlossary />);
    const transmitter = container.querySelector("[data-glossary-entry='molecule-transmitter'] [data-ligand-kind='transmitter']");
    const activeReceptor = container.querySelector("[data-glossary-entry='active-receptor'] .glossary-receptor path");
    const blockedDrug = container.querySelector("[data-glossary-entry='blocked-transporter'] .glossary-transporter > rect");
    const dendriteReceptors = container.querySelectorAll("[data-glossary-entry='dendrite'] .glossary-dendrite-receptor");

    expect(transmitter).toHaveAttribute("fill", ligandColors.transmitter);
    expect(transmitter).toHaveAttribute("stroke", "rgba(255,255,255,0.88)");
    expect(activeReceptor).toHaveAttribute("stroke", activeReceptorColor);
    expect(blockedDrug).toHaveAttribute("fill", ligandColors.reuptake_inhibitor);
    expect(dendriteReceptors).toHaveLength(2);
    expect([...dendriteReceptors].every((receptor) => receptor.getAttribute("transform")?.includes("scale(0.34)"))).toBe(
      true
    );
  });

  it("uses cycle-aware audio playback ids for repeated postsynaptic signal events", () => {
    const note = { age: 0.2, id: "pulse-transmitter-1.200-4-lock-0" };

    expect(getSignalNotePlaybackId(note, 3.4, 12)).toBe("0:pulse-transmitter-1.200-4-lock-0");
    expect(getSignalNotePlaybackId(note, 15.4, 12)).toBe("1:pulse-transmitter-1.200-4-lock-0");
  });

  it("sizes the molecule canvas backing store to displayed pixels", () => {
    const canvas = document.createElement("canvas");
    const setTransform = vi.fn();
    const context = { setTransform } as unknown as CanvasRenderingContext2D;

    canvas.width = 960;
    canvas.height = 560;
    canvas.getBoundingClientRect = () =>
      ({
        bottom: 280,
        height: 280,
        left: 0,
        right: 480,
        top: 0,
        width: 480,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }) as DOMRect;

    expect(resizeMoleculeCanvasForDisplay(canvas, context, 2)).toEqual({ height: 560, width: 960 });
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(560);
    expect(setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);

    canvas.getBoundingClientRect = () =>
      ({
        bottom: 560,
        height: 560,
        left: 0,
        right: 1120,
        top: 0,
        width: 1120,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }) as DOMRect;

    resizeMoleculeCanvasForDisplay(canvas, context, 2);
    expect(canvas.width).toBe(2240);
    expect(canvas.height).toBe(1120);
    expect(setTransform).toHaveBeenLastCalledWith(2240 / 960, 0, 0, 2, 0, 0);
  });

  it("uses explicit signal timestamps for playback ids when present", () => {
    const note = {
      age: 0.02,
      emittedAt: 11.95,
      id: "pulse-transmitter-explicit-lock-0"
    };
    const sustain = {
      age: 0.02,
      id: "ambient-agonist-explicit-sustain",
      startedAt: 11.95
    };

    expect(getSignalNotePlaybackId(note, 12.3, 12)).toBe("0:pulse-transmitter-explicit-lock-0");
    expect(getSignalSustainPlaybackId(sustain, 12.3, 12)).toBe("0:ambient-agonist-explicit-sustain");
  });

  it("uses cycle-aware audio playback ids for sustained agonist signals", () => {
    const sustain = { age: 0.4, id: "ambient-agonist-1.200-2-sustain" };

    expect(getSignalSustainPlaybackId(sustain, 3.4, 12)).toBe("0:ambient-agonist-1.200-2-sustain");
    expect(getSignalSustainPlaybackId(sustain, 15.4, 12)).toBe("1:ambient-agonist-1.200-2-sustain");
  });

  it("makes PAM-enhanced transmitter signal events louder and longer than normal events", () => {
    const normal = getSignalToneAudioSpec({ intensity: 1 });
    const pamEnhanced = getSignalToneAudioSpec({ intensity: 2.2 });

    expect(normal).toEqual({ duration: 0.2, peakGain: 0.06 });
    expect(pamEnhanced).toEqual({ duration: 0.3, peakGain: 0.09 });
    expect(pamEnhanced.peakGain / normal.peakGain).toBeCloseTo(1.5);
  });

  it("animates dendrite activation glow as stacking receptor pulses", () => {
    const inactive = getDendriteActivationGlowSpec([]);
    const single = getDendriteActivationGlowSpec([
      { age: 0.16, alpha: 0.9, id: "normal-note", intensity: 1, slotIndex: 2 }
    ]);
    const fading = getDendriteActivationGlowSpec([
      { age: 1.1, alpha: 0.2, id: "fading-note", intensity: 1, slotIndex: 2 }
    ]);
    const multiple = getDendriteActivationGlowSpec([
      { age: 0.16, alpha: 0.9, id: "normal-note-a", intensity: 1, slotIndex: 1 },
      { age: 0.16, alpha: 0.9, id: "normal-note-b", intensity: 1, slotIndex: 3 }
    ]);
    const pamEnhanced = getDendriteActivationGlowSpec([
      { age: 0.16, alpha: 0.9, id: "pam-note", intensity: 2.2, slotIndex: 2 }
    ]);
    const agonistSustain = getDendriteActivationGlowSpec([], [
      { age: 0.24, alpha: 0.72, id: "agonist-sustain", intensity: 1, slotIndex: 2 }
    ]);

    expect(inactive).toEqual({ baseOpacity: 0, enhancedOpacity: 0, intensity: 0, pulses: [] });
    expect(single.pulses).toHaveLength(1);
    expect(single.baseOpacity).toBeGreaterThan(0);
    expect(fading.pulses[0].opacity).toBeLessThan(single.pulses[0].opacity);
    expect(multiple.pulses).toHaveLength(2);
    expect(multiple.baseOpacity).toBeGreaterThan(single.baseOpacity);
    expect(pamEnhanced.pulses[0].enhanced).toBe(true);
    expect(pamEnhanced.pulses[0].opacity).toBeGreaterThan(single.pulses[0].opacity);
    expect(pamEnhanced.pulses[0].radius).toBeGreaterThan(single.pulses[0].radius);
    expect(pamEnhanced.enhancedOpacity).toBeGreaterThan(0);
    expect(agonistSustain.pulses[0].opacity).toBeGreaterThanOrEqual(single.pulses[0].opacity);
    expect(agonistSustain.pulses[0].radius).toBeGreaterThan(single.pulses[0].radius);
  });

  it("uses teal receptor colors for PAM-enhanced transmitter docking", () => {
    expect(getReceptorRenderColors({ active: true, noteIntensity: 2.2 })).toEqual({
      fill: pamEnhancedReceptorFill,
      stroke: pamEnhancedReceptorColor
    });
    expect(getReceptorRenderColors({ active: true, noteIntensity: 1 })).toEqual({
      fill: activeReceptorFill,
      stroke: activeReceptorColor
    });
    expect(getReceptorRenderColors({ active: false, noteIntensity: 2.2 })).toEqual({
      fill: "rgba(255,255,255,0.36)",
      stroke: inactiveReceptorColor
    });
  });

  it("uses orange receptor colors when an antagonist is bound", () => {
    expect(
      getReceptorRenderColors({
        active: false,
        noteIntensity: 1,
        orthosteric: {
          age: 0.2,
          alpha: 1,
          id: "ambient-antagonist-test",
          ligandKind: "antagonist",
          position: { x: 0, y: 0 },
          target: { kind: "receptor_orthosteric", slotIndex: 0 }
        }
      })
    ).toEqual({
      fill: antagonistBoundReceptorFill,
      stroke: antagonistBoundReceptorColor
    });
  });

  it("toggles simulation pause and half-speed playback controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /pause simulation/i }));
    expect(screen.getByRole("button", { name: /play simulation/i })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /play simulation/i }));
    expect(screen.getByRole("button", { name: /pause simulation/i })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: /switch to half speed/i }));
    expect(screen.getByRole("button", { name: /switch to regular speed/i })).toHaveTextContent("0.5x");
    expect(screen.getByRole("button", { name: /switch to regular speed/i })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /switch to regular speed/i }));
    expect(screen.getByRole("button", { name: /switch to half speed/i })).toHaveTextContent("1x");
  });

  it("draws subtle transmitter molecules inside synaptic vesicles", () => {
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
    expect(axon?.getAttribute("d")).toContain("C");
    expect(dendrite?.getAttribute("d")).toContain("C");
    expect(fadeStop).toHaveAttribute("stop-color", "var(--timeline-fade-color)");

    expect(ligandColors.transmitter).toBe("#6f5bd6");
    expect(ligandColors.transmitter).not.toBe(inactiveReceptorColor);
    expect(ligandColors.transmitter).not.toBe(ligandColors.antagonist);
    expect(activeReceptorColor).toBe(visualPalette.receptor.active);
    expect(antagonistBoundReceptorColor).toBe(visualPalette.receptor.antagonistBound);
    expect(antagonistBoundReceptorFill).toBe(visualPalette.receptor.antagonistFill);
    expect(pamEnhancedReceptorColor).toBe(visualPalette.receptor.pamActive);
    expect(pamEnhancedReceptorFill).toBe(visualPalette.receptor.pamFill);
    expect(antagonistBoundReceptorColor).toBe("#d56b2e");
    expect(antagonistBoundReceptorFill).toBe("#ffe4d6");
    expect(reuptakeBaseColor).toBe(visualPalette.transporter.base);
    expect(reuptakeActiveColor).toBe(visualPalette.transporter.active);
    expect(reuptakeBaseColor).toBe("#b34a6b");
    expect(reuptakeActiveColor).toBe("#f04f72");
    expect(ligandColors.agonist).toBe(activeReceptorColor);
    expect(ligandColors.antagonist).toBe("#be6649");
    expect(ligandColors.antagonist).not.toBe(reuptakeBaseColor);
    expect(ligandColors.releaser).toBe(reuptakeBaseColor);
    expect(ligandColors.reuptake_inhibitor).toBe("#8c514f");
    expect(ligandColors.releaser).not.toBe(ligandColors.reuptake_inhibitor);
    expect(ligandColors.releaser).not.toBe(antagonistBoundReceptorColor);

    const allostericSiteOutlines = container.querySelectorAll(".synapse-stage .allosteric-site-outline");
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

    await user.click(screen.getByRole("tab", { name: /^reuptake\b/i }));
    await user.hover(screen.getByRole("tab", { name: /^reuptake\b/i }));

    const tooltip = screen.getByRole("tooltip");

    expect(screen.getByRole("tab", { name: /^reuptake\b/i })).toHaveTextContent(/Transporter blockade/i);
    expect(tooltip).toHaveTextContent(/reuptake blockade/i);
    expect(tooltip).toHaveTextContent(/blocked transporters cannot reuptake returning transmitter/i);
    expect(tooltip).not.toHaveTextContent(/Lexapro \(escitalopram\)/i);
    expect(tooltip).not.toHaveTextContent(/Example:/i);
    expect(tooltip.querySelector(".tooltip-example")).toBeNull();
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

    const allostericSite = receptorSlots[2].allosteric;
    fireEvent.mouseMove(stage, {
      clientX: allostericSite.x,
      clientY: ((allostericSite.y - 45) / 470) * 560
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(/allosteric site/i);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/PAM molecules can bind here/i);

    fireEvent.mouseLeave(stage);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows releaser as grounded transporter-mediated efflux", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /releaser/i }));

    expect(screen.getByLabelText(/intervention strength/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /releaser/i })).toHaveTextContent(/Transporter-mediated efflux/i);
    expect(screen.queryByText(/reverse-transport-like state/i)).not.toBeInTheDocument();
  });

  it("shows representative examples in glossary entries while intervention tooltips stay concise", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(
      Object.values(interventionProfiles).every(
        (profile) =>
          profile.representativeExample.name &&
          profile.representativeExample.mechanismLabel &&
          profile.representativeExample.mechanismLabel.endsWith(".") &&
          !Object.prototype.hasOwnProperty.call(profile.representativeExample, "caveat")
      )
    ).toBe(true);
    expect(container.querySelector("[data-glossary-entry='molecule-transmitter']")).toHaveTextContent(/Serotonin \(5-HT\)/i);
    expect(container.querySelector("[data-glossary-entry='molecule-transmitter']")).toHaveTextContent(
      /released by the modeled presynaptic neuron/i
    );
    expect(container.querySelector("[data-glossary-entry='molecule-reuptake_inhibitor']")).toHaveTextContent(
      /Lexapro \(escitalopram\)/i
    );
    expect(container.querySelector("[data-glossary-entry='molecule-reuptake_inhibitor']")).toHaveTextContent(
      /blocks serotonin reuptake transporters/i
    );
    expect(container.querySelector("[data-glossary-entry='molecule-releaser']")).toHaveTextContent(/MDMA/i);
    expect(container.querySelector("[data-glossary-entry='molecule-releaser']")).toHaveTextContent(
      /strong serotonergic transporter effects/i
    );
    expect(container.querySelector("[data-glossary-entry='molecule-agonist']")).toHaveTextContent(
      /Psilocybin \(psilocin\)/i
    );
    expect(container.querySelector("[data-glossary-entry='molecule-antagonist']")).toHaveTextContent(/Ketanserin/i);
    expect(container.querySelector("[data-glossary-entry='molecule-pam']")).toHaveTextContent(/Oleamide/i);
    expect(container.querySelector("[data-glossary-entry='molecule-pam']")).toHaveTextContent(
      /potentiate 5-HT2A and 5-HT2C signaling/i
    );
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();

    await user.hover(screen.getByRole("tab", { name: /baseline/i }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Serotonin \(5-HT\)/i);

    await user.hover(screen.getByRole("tab", { name: /^reuptake\b/i }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Lexapro \(escitalopram\)/i);

    await user.hover(screen.getByRole("tab", { name: /releaser/i }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/MDMA/i);

    await user.hover(screen.getByRole("tab", { name: /^agonist\b/i }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Psilocybin \(psilocin\)/i);

    await user.hover(screen.getByRole("tab", { name: /antagonist/i }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Ketanserin/i);

    await user.hover(screen.getByRole("tab", { name: /pam/i }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Oleamide/i);
    expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Example:/i);
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

    await user.click(screen.getByRole("tab", { name: /^reuptake\b/i }));

    const receptorStrokes = Array.from(container.querySelectorAll(".receptors path")).map(
      (path) => path.getAttribute("stroke")
    );

    expect(receptorStrokes).not.toContain("#0c9b8a");
    receptorStrokes.forEach((stroke) => {
      expect([activeReceptorColor, inactiveReceptorColor]).toContain(stroke);
    });
  });
});
