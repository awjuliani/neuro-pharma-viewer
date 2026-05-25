import { useEffect, useMemo, useState } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { SynapseScene } from "./components/SynapseScene";
import { defaultParams, simulateTransmission } from "./simulation/model";
import type { InterventionId, SimulationParams } from "./simulation/types";

const SIMULATION_DURATION_SECONDS = 12;
type ThemeMode = "light" | "dark";

function App() {
  const [selected, setSelected] = useState<InterventionId>("baseline");
  const [params, setParams] = useState<SimulationParams>(defaultParams);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  const frame = useMemo(
    () => simulateTransmission(params, SIMULATION_DURATION_SECONDS),
    [params]
  );

  const handleSelectIntervention = (nextIntervention: InterventionId) => {
    setSelected(nextIntervention);
    setCurrentTime(0);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [themeMode]);

  useEffect(() => {
    let animationId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      if (!isPaused) {
        setCurrentTime((time) => time + delta * 0.72 * playbackRate);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, playbackRate]);

  return (
    <main className="app-shell" data-theme={themeMode}>
      <div className="app-grid">
        <aside className="left-rail">
          <ControlsPanel
            onChange={setParams}
            onSelectIntervention={handleSelectIntervention}
            params={params}
            selected={selected}
          />
        </aside>
        <section className="workspace">
          <SynapseScene
            currentTime={currentTime}
            drugStrength={params.drugStrength}
            frame={frame}
            isPaused={isPaused}
            moleculesPerPulse={params.moleculesPerPulse}
            onTogglePaused={() => setIsPaused((paused) => !paused)}
            onTogglePlaybackRate={() => setPlaybackRate((rate) => (rate === 1 ? 0.5 : 1))}
            onToggleTheme={() => setThemeMode((mode) => (mode === "dark" ? "light" : "dark"))}
            playbackRate={playbackRate}
            selected={selected}
            themeMode={themeMode}
          />
        </section>
      </div>
    </main>
  );
}

export default App;
