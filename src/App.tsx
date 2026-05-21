import { useRef, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useShapeDiver, DEFAULT_CONFIG } from "./useShapeDiver";
import type { ConfigState } from "./useShapeDiver";

const CONFIG_LABELS: Record<keyof ConfigState, string> = {
  height: "Hauteur à monter",
  diameter: "Diamètre colimaçon",
  openingType: "Type de trémie",
  rotation: "Sens de rotation",
  treadTop: "Dessus de marches",
  risers: "Contre-marches",
  handrail: "Main courante",
  floorRailing: "Garde-corps étage",
  startPost: "Poteau de départ",
  endPost: "Poteau d'arrivée",
  startNewel: "Crosse au départ",
  endNewel: "Crosse à l'arrivée",
  startBall: "Boule au départ",
  endBall: "Boule à l'arrivée",
  stairRotation: "Rotation escalier",
  balusters: "Balustres intermédiaires",
  treadsNoRail: "Marches sans garde-corps",
  distributionPlate: "Plaque de répartition",
  finition: "Finition",
  patineColor: "Patine sur-mesure",
  wallTop: "Murs trémie (haut)",
  wallTopMidi: "↑ Midi",
  wallTop3h: "↑ 3h",
  wallTop6h: "↑ 6h",
  wallTop9h: "↑ 9h",
  wallBottom: "Murs trémie (bas)",
  wallBottomMidi: "↓ Midi",
  wallBottom3h: "↓ 3h",
  wallBottom6h: "↓ 6h",
  wallBottom9h: "↓ 9h",
};
import FeaturesTab from "./FeaturesTab";
import ContactTab from "./ContactTab";
import "./App.css";
import input1Url from "./assets/input1.png";
import input2Url from "./assets/input2.png";
import contactFormUrl from "./assets/contactform.png";
import messageFormUrl from "./assets/messageform.png";
import envoyerUrl from "./assets/envolyeer.png";
import primaryBgUrl from "./assets/primary-background.png";
import nextUrl from "./assets/next.png";
import previousUrl from "./assets/previous.png";
import logoUrl from "./assets/logo.png";

type Tab = "features" | "contact";
const TABS: Tab[] = ["features", "contact"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ready, error, paramChoices, updateParam, submitContact, zoomIn, resetCamera, toggleFullscreen, getScreenshot, captureScreenshot, setViewerBackground, setCameraView, startAR } = useShapeDiver(canvasRef);
  const [tab, setTab] = useState<Tab>("features");
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const [previewOverlay, setPreviewOverlay] = useState<ReactNode>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "1");

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode ? "1" : "0");
    setViewerBackground(darkMode ? "#1a0a00" : "#f5f0e0");
  }, [darkMode, setViewerBackground]);

  // Comparison view
  const [configA, setConfigA] = useState<ConfigState | null>(null);
  const [configB, setConfigB] = useState<ConfigState | null>(null);
  const [screenshotA, setScreenshotA] = useState<string | null>(null);
  const [screenshotB, setScreenshotB] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [capturing, setCapturing] = useState<"A" | "B" | null>(null);

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

  // Load a config then capture screenshot after model updates
  const captureConfig = useCallback(async (cfg: ConfigState, slot: "A" | "B") => {
    setCapturing(slot);
    applyConfig(cfg);
    if (slot === "A") setConfigA({ ...cfg }); else setConfigB({ ...cfg });
    // Wait for ShapeDiver to finish rendering
    await new Promise(r => setTimeout(r, 2500));
    const url = captureScreenshot();
    if (slot === "A") setScreenshotA(url); else setScreenshotB(url);
    setCapturing(null);
  }, [applyConfig, captureScreenshot]);

  // Sync param changes to ShapeDiver
  const handleConfigChange = (key: keyof ConfigState, value: number | string) => {
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

  // Close camera menu when clicking outside
  useEffect(() => {
    if (!cameraMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target as Node)) {
        setCameraMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cameraMenuOpen]);

  // On ready, push all defaults to the model — skip wall/environment params
  // (those are Bool params with meaningful model defaults we don't want to override)
  const SKIP_ON_INIT = new Set(["patineColor", "wallTop", "wallTopMidi", "wallTop3h", "wallTop6h", "wallTop9h", "wallBottom", "wallBottomMidi", "wallBottom3h", "wallBottom6h", "wallBottom9h"]);
  useEffect(() => {
    if (!ready) return;
    Object.entries(config).forEach(([key, val]) => {
      if (SKIP_ON_INIT.has(key)) return;
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
    <div className={`app${darkMode ? " dark-mode" : ""}`} style={{ "--img-input1": `url(${input1Url})`, "--img-input2": `url(${input2Url})`, "--img-contactform": `url(${contactFormUrl})`, "--img-messageform": `url(${messageFormUrl})`, "--img-envoyer": `url(${envoyerUrl})`, "--img-primary-bg": `url(${primaryBgUrl})`, "--img-next": `url(${nextUrl})`, "--img-previous": `url(${previousUrl})` } as React.CSSProperties}>
      {/* 3D Viewer */}
      <div className="viewer-wrapper">
        <canvas ref={canvasRef} className="viewer-canvas" />
        {ready && (
          <div className="viewer-toolbar">
            {/* Camera presets dropdown */}
            <div className="toolbar-more" ref={cameraMenuRef}>
              <button onClick={() => setCameraMenuOpen((v) => !v)} title="Vues caméra">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              {cameraMenuOpen && (
                <div className="toolbar-dropdown">
                  <button onClick={() => { setCameraView("perspective"); setCameraMenuOpen(false); }}>Perspective</button>
                  <button onClick={() => { setCameraView("top"); setCameraMenuOpen(false); }}>Top (Plan)</button>
                  <button onClick={() => { setCameraView("left"); setCameraMenuOpen(false); }}>Left</button>
                  <button onClick={() => { setCameraView("right"); setCameraMenuOpen(false); }}>Right</button>
                  <button onClick={() => { setCameraView("front"); setCameraMenuOpen(false); }}>Front</button>
                  <button onClick={() => { setCameraView("back"); setCameraMenuOpen(false); }}>Back</button>
                </div>
              )}
            </div>
            {/* AR button */}
            <button onClick={startAR} title="Réalité augmentée">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>
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
            {/* Reset camera — crosshair/target icon */}
            <button onClick={resetCamera} title="Recentrer la vue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
            </button>
            <span className="toolbar-divider" />
            {/* Dark mode toggle */}
            <button onClick={() => setDarkMode(v => !v)} title={darkMode ? "Mode clair" : "Mode sombre"}>
              {darkMode
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            {/* Comparison view */}
            <button onClick={() => setCompareOpen(v => !v)} title="Comparer deux configurations">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/></svg>
            </button>
          </div>
        )}
        {previewOverlay && (
          <div className="viewer-preview-overlay">
            {previewOverlay}
          </div>
        )}
        {!ready && !error && (
          <div className="viewer-overlay">
            <img src={logoUrl} alt="Renaud Créations" className="loader-logo" />
            <span className="loader-text">Chargement en cours...</span>
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
            <FeaturesTab config={config} onChange={handleConfigChange} paramChoices={paramChoices} onPreview={setPreviewOverlay} />
          )}
          {tab === "contact" && (
            <ContactTab onSubmit={(data) => submitContact(data as unknown as Record<string, string>)} onBack={goPrev} />
          )}
        </div>

        {/* Navigation — only shown on Features tab; Contact has its own buttons */}
        {tab === "features" && (
          <div className="nav-bar">
            <button
              className="nav-btn nav-btn--circle nav-btn--prev"
              onClick={goPrev}
              disabled={tabIndex === 0}
              aria-label="Précédent"
            />
            <button
              className="nav-btn nav-btn--circle nav-btn--next"
              onClick={goNext}
              disabled={tabIndex === TABS.length - 1}
              aria-label="Suivant"
            />
          </div>
        )}

        {/* Footer */}
        <footer className="panel-footer">
          Dessin non-contractuel. En effet, certains éléments techniques comme la visserie, entre autres, n'apparaissent pas.
        </footer>
      </div>

      {/* Comparison modal */}
      {compareOpen && (
        <div className="compare-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCompareOpen(false); }}>
          <div className="compare-modal">
            <div className="compare-header">
              <span>Comparaison</span>
              <button className="compare-close" onClick={() => setCompareOpen(false)}>×</button>
            </div>

            {/* Screenshot panels */}
            <div className="compare-screenshots">
              {(["A", "B"] as const).map(slot => {
                const cfg = slot === "A" ? configA : configB;
                const shot = slot === "A" ? screenshotA : screenshotB;
                const isCapturing = capturing === slot;
                return (
                  <div key={slot} className="compare-shot-panel">
                    <div className="compare-shot-label">Config {slot}</div>
                    <div className="compare-shot-img">
                      {shot
                        ? <img src={shot} alt={`Config ${slot}`} />
                        : <span className="compare-shot-empty">{isCapturing ? "Capture en cours…" : "Aucune capture"}</span>
                      }
                      {isCapturing && <div className="compare-shot-spinner" />}
                    </div>
                    <div className="compare-shot-actions">
                      <button className="compare-save-btn" onClick={() => captureConfig({ ...config }, slot)} disabled={!!capturing}>
                        {isCapturing ? "…" : `Capturer config ${slot} (état actuel)`}
                      </button>
                      {cfg && (
                        <button className="compare-load-btn" onClick={() => { setConfig(cfg); applyConfig(cfg); setCompareOpen(false); }}>
                          ← Charger Config {slot}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Diff table */}
            {configA && configB && (
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr><th>Paramètre</th><th>Config A</th><th>Config B</th></tr>
                  </thead>
                  <tbody>
                    {(Object.keys(configA) as (keyof ConfigState)[])
                      .filter(key => configA[key] !== configB![key])
                      .map(key => (
                        <tr key={key} className="compare-diff">
                          <td>{CONFIG_LABELS[key] ?? key}</td>
                          <td>{String(configA[key])}</td>
                          <td>{String(configB![key])}</td>
                        </tr>
                      ))}
                    {(Object.keys(configA) as (keyof ConfigState)[])
                      .filter(key => configA[key] === configB![key])
                      .map(key => (
                        <tr key={key}>
                          <td>{CONFIG_LABELS[key] ?? key}</td>
                          <td>{String(configA[key])}</td>
                          <td>{String(configB![key])}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {(!configA || !configB) && (
              <p className="compare-hint">Capturez deux configurations pour les comparer.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
