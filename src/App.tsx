import { useRef, useState, useEffect, useCallback } from "react";
import { useShapeDiver, DEFAULT_CONFIG } from "./useShapeDiver";
import type { ConfigState } from "./useShapeDiver";
import FeaturesTab from "./FeaturesTab";
import ContactTab from "./ContactTab";
import "./App.css";

type Tab = "features" | "contact";
const TABS: Tab[] = ["features", "contact"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ready, error, updateParam, submitContact, zoomIn, resetCamera, toggleFullscreen, getScreenshot } = useShapeDiver(canvasRef);
  const [tab, setTab] = useState<Tab>("features");
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Undo/redo history
  const [history, setHistory] = useState<ConfigState[]>([DEFAULT_CONFIG]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Apply a full config state to ShapeDiver
  const applyConfig = useCallback((cfg: ConfigState) => {
    Object.entries(cfg).forEach(([key, val]) => {
      updateParam(key as keyof ConfigState, val);
    });
  }, [updateParam]);

  // Sync param changes to ShapeDiver
  const handleConfigChange = (key: keyof ConfigState, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updateParam(key, value);

    // Push to history, discarding any future states after current index
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newConfig]);
    setHistoryIndex((prev) => prev + 1);
  };

  const undo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    const prevConfig = history[newIndex];
    setHistoryIndex(newIndex);
    setConfig(prevConfig);
    applyConfig(prevConfig);
  }, [canUndo, historyIndex, history, applyConfig]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    const nextConfig = history[newIndex];
    setHistoryIndex(newIndex);
    setConfig(nextConfig);
    applyConfig(nextConfig);
  }, [canRedo, historyIndex, history, applyConfig]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // Close more menu when clicking outside
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreMenuOpen]);

  // Export parameter values as JSON file
  const exportParams = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "parametres-escalier.json";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setMoreMenuOpen(false);
  }, [config]);

  // Import parameter values from JSON file
  const importParams = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string) as ConfigState;
          setConfig(imported);
          applyConfig(imported);
          setHistory((prev) => [...prev.slice(0, historyIndex + 1), imported]);
          setHistoryIndex((prev) => prev + 1);
        } catch { /* ignore invalid files */ }
      };
      reader.readAsText(file);
    };
    input.click();
    setMoreMenuOpen(false);
  }, [applyConfig, historyIndex]);

  // Create model state — snapshot with timestamp
  const createModelState = useCallback(() => {
    const state = { config, timestamp: new Date().toISOString() };
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `etat-modele-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setMoreMenuOpen(false);
  }, [config]);

  // Import model state from JSON file
  const importModelState = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          const imported = (parsed.config ?? parsed) as ConfigState;
          setConfig(imported);
          applyConfig(imported);
          setHistory((prev) => [...prev.slice(0, historyIndex + 1), imported]);
          setHistoryIndex((prev) => prev + 1);
        } catch { /* ignore invalid files */ }
      };
      reader.readAsText(file);
    };
    input.click();
    setMoreMenuOpen(false);
  }, [applyConfig, historyIndex]);

  // On ready, push all defaults to the model
  useEffect(() => {
    if (!ready) return;
    Object.entries(config).forEach(([key, val]) => {
      updateParam(key as keyof ConfigState, val);
    });
  }, [ready]);

  const tabIndex = TABS.indexOf(tab);

  const goNext = () => {
    if (tabIndex < TABS.length - 1) setTab(TABS[tabIndex + 1]);
  };
  const goPrev = () => {
    if (tabIndex > 0) setTab(TABS[tabIndex - 1]);
  };

  return (
    <div className="app">
      {/* 3D Viewer */}
      <div className="viewer-wrapper">
        <canvas ref={canvasRef} className="viewer-canvas" />
        {ready && (
          <div className="viewer-toolbar">
            {/* AR / 3D view */}
            <button onClick={resetCamera} title="Vue 3D">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </button>
            {/* Zoom */}
            <button onClick={zoomIn} title="Zoom +">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
            </button>
            {/* Screenshot / camera */}
            <button onClick={getScreenshot} title="Capture d'écran">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            {/* Fullscreen */}
            <button onClick={toggleFullscreen} title="Plein écran">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </button>
            <span className="toolbar-divider" />
            {/* Undo */}
            <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            {/* Redo */}
            <button onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Y)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
            </button>
            {/* Reset camera */}
            <button onClick={resetCamera} title="Réinitialiser la vue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
            </button>
            {/* More menu */}
            <div className="toolbar-more" ref={moreMenuRef}>
              <button onClick={() => setMoreMenuOpen((v) => !v)} title="Plus d'options">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
              {moreMenuOpen && (
                <div className="toolbar-dropdown">
                  <button onClick={importParams}>Import parameter values</button>
                  <button onClick={exportParams}>Export parameter values</button>
                  <hr />
                  <button onClick={createModelState}>Create model state</button>
                  <button onClick={importModelState}>Import model state</button>
                </div>
              )}
            </div>
          </div>
        )}
        {!ready && !error && (
          <div className="viewer-overlay">
            <span className="loader-text">Loading 3D model...</span>
          </div>
        )}
        {error && (
          <div className="viewer-overlay viewer-error">
            <span>3D viewer unavailable</span>
            <small>{error}</small>
          </div>
        )}
      </div>

      {/* Configurator panel */}
      <div className="panel">
        {/* Tab bar */}
        <div className="tab-bar">
          <button
            className={`tab-btn${tab === "features" ? " tab-btn--active" : ""}`}
            onClick={() => setTab("features")}
          >
            Caractéristiques
          </button>
          <span className="tab-separator">|</span>
          <button
            className={`tab-btn${tab === "contact" ? " tab-btn--active" : ""}`}
            onClick={() => setTab("contact")}
          >
            Contact
          </button>
        </div>

        {/* Tab content */}
        <div className="panel-body">
          {tab === "features" && (
            <FeaturesTab config={config} onChange={handleConfigChange} />
          )}
          {tab === "contact" && (
            <ContactTab onSubmit={(data) => submitContact(data as unknown as Record<string, string>)} onBack={goPrev} />
          )}
        </div>

        {/* Navigation — only shown on Features tab; Contact has its own buttons */}
        {tab === "features" && (
          <div className="nav-bar">
            <button
              className="nav-btn nav-btn--circle"
              onClick={goPrev}
              disabled={tabIndex === 0}
              aria-label="Précédent"
            >
              &#8249;
            </button>
            <button
              className="nav-btn nav-btn--circle"
              onClick={goNext}
              disabled={tabIndex === TABS.length - 1}
              aria-label="Suivant"
            >
              &#8250;
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="panel-footer">
          Dessin non-contractuel. En effet, certains éléments techniques comme la visserie, entre autres, n'apparaissent pas.
        </footer>
      </div>
    </div>
  );
}
