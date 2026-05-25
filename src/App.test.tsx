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
  maoActiveColor,
  maoBaseColor,
  reuptakeActiveColor,
  reuptakeBaseColor,
  visualPalette
} from "./components/synapseVisualModel";
import { defaultParams, simulateTransmission } from "./simulation/model";
import type { InterventionId } from "./simulation/types";

describe("App", () => {
  it("renders the intervention selector and core visualizer", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /receptor-level neuropharmacology/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /baseline/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /reuptake/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /maoi/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /pam/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/molecules per pulse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/animated transmitter molecules/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/receptor note timeline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/information readout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/signal traces/i)).not.toBeInTheDocument();
  });

  it("uses neutral anatomy colors and target-family palette accents", () => {
    const { container } = render(<App />);
    const axon = container.querySelector(".axon");
    const dendrite = container.querySelector(".dendrite");

    expect(axon).toHaveAttribute("fill", visualPalette.anatomy.axonFill);
    expect(axon).toHaveAttribute("stroke", visualPalette.anatomy.axonStroke);
    expect(dendrite).toHaveAttribute("fill", visualPalette.anatomy.dendriteFill);
    expect(dendrite).toHaveAttribute("stroke", visualPalette.anatomy.dendriteStroke);
    expect(axon).not.toHaveAttribute("fill", "url(#axon-gradient)");
    expect(dendrite).not.toHaveAttribute("fill", "url(#dendrite-gradient)");

    expect(ligandColors.transmitter).toBe(inactiveReceptorColor);
    expect(activeReceptorColor).toBe(visualPalette.receptor.active);
    expect(reuptakeBaseColor).toBe(visualPalette.transporter.base);
    expect(reuptakeActiveColor).toBe(visualPalette.transporter.active);
    expect(ligandColors.agonist).toBe(activeReceptorColor);
    expect(ligandColors.releaser).toBe("#d56b2e");
    expect(ligandColors.reuptake_inhibitor).toBe("#8c514f");
    expect(ligandColors.releaser).not.toBe(ligandColors.reuptake_inhibitor);
    expect(maoBaseColor).toBe(visualPalette.mao.base);
    expect(maoActiveColor).toBe(visualPalette.mao.active);
    expect(ligandColors.maoi).toBe(maoBaseColor);

    const releaserTab = screen.getByRole("tab", { name: /releaser/i });
    expect(releaserTab.style.getPropertyValue("--accent")).toBe(interventionAccentColors.releaser);
  });

  it("updates explanatory copy when an intervention is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /reuptake/i }));

    expect(screen.getByText(/Drug molecules bind transporter sites/i)).toBeInTheDocument();
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
    expect(screen.getByText(/occupied transporters leak extra transmitter/i)).toBeInTheDocument();
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
        selected="releaser"
      />
    );

    expect(container.querySelector(".transporter-arrow[data-direction='out']")).not.toBeNull();
    expect(container.querySelector(".transporter-arrow-chevron")).toHaveStyle({
      transform: "rotate(180deg)"
    });

    rerender(
      <SynapseScene
        currentTime={inhibitorTime}
        drugStrength={1}
        frame={frame}
        moleculesPerPulse={defaultParams.moleculesPerPulse}
        selected="reuptake_inhibitor"
      />
    );

    expect(container.querySelector(".transporter-arrow[data-direction='out']")).toBeNull();
    expect(container.querySelector(".transporter-arrow[data-direction='blocked']")).not.toBeNull();
    expect(container.querySelector(".transporter-arrow-line")).toHaveStyle({
      opacity: "1",
      transform: "scaleY(1)"
    });
  });

  it("shows MAOI as grounded MAO enzyme blockade", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /maoi/i }));

    expect(screen.getByLabelText(/intervention strength/i)).toBeInTheDocument();
    expect(screen.getByText(/MAO-like clearing enzymes/i)).toBeInTheDocument();
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
