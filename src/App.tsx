import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { KeyConcepts } from "./components/KeyConcepts";
import { SynapseScene } from "./components/SynapseScene";
import { VisualGlossary } from "./components/VisualGlossary";
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
  const controlsPanelRef = useRef<HTMLDivElement | null>(null);
  const [controlsPanelHeight, setControlsPanelHeight] = useState<number | null>(null);

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

  useLayoutEffect(() => {
    const controlsPanel = controlsPanelRef.current;
    if (!controlsPanel) {
      return undefined;
    }

    const updateControlsPanelHeight = () => {
      const nextHeight = controlsPanel.getBoundingClientRect().height;

      setControlsPanelHeight((previousHeight) =>
        previousHeight !== null && Math.abs(previousHeight - nextHeight) < 0.5
          ? previousHeight
          : nextHeight
      );
    };

    updateControlsPanelHeight();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(updateControlsPanelHeight);
    observer.observe(controlsPanel);

    return () => observer.disconnect();
  }, []);

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

  const workspaceStyle =
    controlsPanelHeight === null
      ? undefined
      : ({
          "--scene-shell-target-height": `${controlsPanelHeight}px`
        } as CSSProperties);

  return (
    <main className="app-shell" data-theme={themeMode}>
      <div className="app-grid">
        <aside className="left-rail">
          <div ref={controlsPanelRef}>
            <ControlsPanel
              onChange={setParams}
              onSelectIntervention={handleSelectIntervention}
              params={params}
              selected={selected}
            />
          </div>
          <KeyConcepts />
        </aside>
        <section className="workspace" style={workspaceStyle}>
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
          <VisualGlossary />
        </section>
      </div>
    </main>
  );
}

export default App;
