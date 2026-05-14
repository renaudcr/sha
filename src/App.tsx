import { useRef, useState, useEffect } from "react";
import { useShapeDiver, DEFAULT_CONFIG } from "./useShapeDiver";
import type { ConfigState } from "./useShapeDiver";
import FeaturesTab from "./FeaturesTab";
import ContactTab from "./ContactTab";
import "./App.css";

type Tab = "features" | "contact";
const TABS: Tab[] = ["features", "contact"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ready, error, updateParam, submitContact, zoomIn, zoomOut, resetCamera, toggleFullscreen, getScreenshot } = useShapeDiver(canvasRef);
  const [tab, setTab] = useState<Tab>("features");
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);

  // Sync param changes to ShapeDiver
  const handleConfigChange = (key: keyof ConfigState, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    updateParam(key, value);
  };

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
            <button onClick={zoomIn} title="Zoom +">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
            </button>
            <button onClick={zoomOut} title="Zoom −">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button onClick={resetCamera} title="Réinitialiser la vue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 1 3 6.9"/><polyline points="3 22 3 16 9 16"/></svg>
            </button>
            <button onClick={toggleFullscreen} title="Plein écran">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </button>
            <button onClick={getScreenshot} title="Capture d'écran">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
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
