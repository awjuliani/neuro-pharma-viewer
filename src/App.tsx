import { useEffect, useMemo, useState } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { SynapseScene } from "./components/SynapseScene";
import { defaultParams, simulateTransmission } from "./simulation/model";
import type { InterventionId, SimulationParams } from "./simulation/types";

const SIMULATION_DURATION_SECONDS = 12;

function App() {
  const [selected, setSelected] = useState<InterventionId>("baseline");
  const [params, setParams] = useState<SimulationParams>(defaultParams);
  const [currentTime, setCurrentTime] = useState(0);

  const frame = useMemo(
    () => simulateTransmission(params, SIMULATION_DURATION_SECONDS),
    [params]
  );

  useEffect(() => {
    let animationId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setCurrentTime((time) => (time + delta * 0.72) % SIMULATION_DURATION_SECONDS);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <main className="app-shell">
      <div className="app-grid">
        <aside className="left-rail">
          <ControlsPanel
            onChange={setParams}
            onSelectIntervention={setSelected}
            params={params}
            selected={selected}
          />
        </aside>
        <section className="workspace">
          <SynapseScene
            currentTime={currentTime}
            drugStrength={params.drugStrength}
            frame={frame}
            moleculesPerPulse={params.moleculesPerPulse}
            selected={selected}
          />
          <p className="disclaimer">
            Conceptual educational model only. It is not medical advice and is not a
            quantitative pharmacokinetic or pharmacodynamic simulation.
          </p>
        </section>
      </div>
    </main>
  );
}

export default App;
