import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { activeReceptorColor, inactiveReceptorColor } from "./components/synapseVisualModel";

describe("App", () => {
  it("renders the intervention selector and core visualizer", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /receptor-level neuropharmacology/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /baseline/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /reuptake/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /pam/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/molecules per pulse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/animated transmitter molecules/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/receptor note timeline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/intervention strength/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/information readout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/signal traces/i)).not.toBeInTheDocument();
  });

  it("updates explanatory copy when an intervention is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /reuptake/i }));

    expect(screen.getByText(/Drug molecules bind transporter sites/i)).toBeInTheDocument();
    expect(screen.queryByText(/Information effect/i)).not.toBeInTheDocument();
  });

  it("shows releaser as a grounded reuptake-site leak", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /releaser/i }));

    expect(screen.getByLabelText(/intervention strength/i)).toBeInTheDocument();
    expect(screen.getByText(/occupied transporters leak extra transmitter/i)).toBeInTheDocument();
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
