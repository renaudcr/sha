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
            <button onClick={zoomIn} title="Zoom +">🔍+</button>
            <button onClick={zoomOut} title="Zoom −">🔍−</button>
            <button onClick={resetCamera} title="Réinitialiser la vue">↺</button>
            <button onClick={toggleFullscreen} title="Plein écran">⛶</button>
            <button onClick={getScreenshot} title="Capture d'écran">📷</button>
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
