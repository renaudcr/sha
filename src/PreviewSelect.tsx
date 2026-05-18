import React, { useState, useRef, useEffect } from "react";

/* ── Inline SVG preview thumbnails for staircase options ──
   Keys match the actual ShapeDiver parameter choice labels.
   When client provides real images, replace SVG with <img>.
── */

// Generic "solid steel tread" icon
const steelTread = (
  <svg viewBox="0 0 60 40"><rect x="5" y="10" width="50" height="20" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/><line x1="5" y1="20" x2="55" y2="20" stroke="#8a6018" strokeWidth="0.5" opacity="0.4"/></svg>
);
// Generic "wood tread" icon
const woodTread = (
  <svg viewBox="0 0 60 40"><rect x="5" y="10" width="50" height="20" rx="1" fill="#c9a86c" stroke="#3a2000" strokeWidth="1.5"/><path d="M10 15 Q20 25 30 15 Q40 25 50 15" fill="none" stroke="#8a6018" strokeWidth="0.6" opacity="0.5"/></svg>
);
// Generic "decorative pattern" icon
const decorPattern = (label: string) => (
  <svg viewBox="0 0 60 40">
    <rect x="5" y="5" width="50" height="30" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/>
    <text x="30" y="23" textAnchor="middle" fontSize="6" fill="#3a2000" fontFamily="serif" opacity="0.7">{label.substring(0, 8)}</text>
  </svg>
);
// "Lace/dentelle" pattern
const laceTread = (
  <svg viewBox="0 0 60 40"><rect x="5" y="10" width="50" height="20" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/><circle cx="15" cy="20" r="3" fill="none" stroke="#3a2000" strokeWidth="0.8"/><circle cx="30" cy="20" r="3" fill="none" stroke="#3a2000" strokeWidth="0.8"/><circle cx="45" cy="20" r="3" fill="none" stroke="#3a2000" strokeWidth="0.8"/></svg>
);

const PREVIEWS: Record<string, Record<string, React.ReactNode>> = {
  // Dessus de marches (Type de marches)
  treadTop: {
    "Pleine": steelTread,
    "Chêne": woodTread,
    "Bois - autre": (
      <svg viewBox="0 0 60 40"><rect x="5" y="10" width="50" height="20" rx="1" fill="#8b6914" stroke="#3a2000" strokeWidth="1.5"/><path d="M10 15 Q20 25 30 15 Q40 25 50 15" fill="none" stroke="#5a4010" strokeWidth="0.6" opacity="0.5"/></svg>
    ),
    "Bois - non fourni": (
      <svg viewBox="0 0 60 40"><rect x="5" y="10" width="50" height="20" rx="1" fill="#ddd" stroke="#999" strokeWidth="1.5" strokeDasharray="3,3"/><text x="30" y="23" textAnchor="middle" fontSize="5" fill="#999">Non fourni</text></svg>
    ),
    "Alice": decorPattern("Alice"),
    "Belle époque": decorPattern("Belle ép."),
    "Champêtre": decorPattern("Champêtre"),
    "Dentelle": laceTread,
    "Eiffel losanges": decorPattern("Eiffel"),
    "Fabrique chevrons": decorPattern("Chevrons"),
  },
  // Contre-marches (Type de contre-marches)
  risers: {
    "Alice": decorPattern("Alice"),
    "Art Déco": decorPattern("Art Déco"),
    "Belle époque": decorPattern("Belle ép."),
    "Biomorphismes": decorPattern("Biomorp."),
    "Cabaret": decorPattern("Cabaret"),
    "Champêtre": decorPattern("Champêtre"),
    "Croisillon": (
      <svg viewBox="0 0 60 40"><rect x="5" y="5" width="50" height="30" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/><line x1="10" y1="8" x2="50" y2="32" stroke="#3a2000" strokeWidth="0.8"/><line x1="50" y1="8" x2="10" y2="32" stroke="#3a2000" strokeWidth="0.8"/><line x1="30" y1="8" x2="30" y2="32" stroke="#3a2000" strokeWidth="0.5"/></svg>
    ),
    "Deep forest": (
      <svg viewBox="0 0 60 40"><rect x="5" y="5" width="50" height="30" rx="1" fill="#3a5a30" stroke="#3a2000" strokeWidth="1.5"/><line x1="15" y1="35" x2="15" y2="12" stroke="#2a4020" strokeWidth="2"/><line x1="30" y1="35" x2="30" y2="8" stroke="#2a4020" strokeWidth="2"/><line x1="45" y1="35" x2="45" y2="15" stroke="#2a4020" strokeWidth="2"/></svg>
    ),
    "Dentelle": laceTread,
    "Dryades": decorPattern("Dryades"),
    "Eurydice": decorPattern("Eurydice"),
    "Less is More": (
      <svg viewBox="0 0 60 40"><rect x="5" y="5" width="50" height="30" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/><line x1="20" y1="20" x2="40" y2="20" stroke="#3a2000" strokeWidth="1"/></svg>
    ),
    "Losange": (
      <svg viewBox="0 0 60 40"><rect x="5" y="5" width="50" height="30" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/><polygon points="30,8 45,20 30,32 15,20" fill="none" stroke="#3a2000" strokeWidth="1"/></svg>
    ),
    "Maori": decorPattern("Maori"),
    "Mistinguette": decorPattern("Misting."),
    "Naïades": decorPattern("Naïades"),
    "New York": decorPattern("New York"),
  },
  // Main courante (Type de main-courante)
  handrail: {
    "Ronde": (
      <svg viewBox="0 0 60 40"><line x1="5" y1="20" x2="55" y2="20" stroke="#b88530" strokeWidth="6" strokeLinecap="round"/><line x1="5" y1="18" x2="55" y2="18" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/></svg>
    ),
    "Plate": (
      <svg viewBox="0 0 60 40"><rect x="5" y="16" width="50" height="8" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/></svg>
    ),
    "Moulurée": (
      <svg viewBox="0 0 60 40"><rect x="5" y="14" width="50" height="12" rx="2" fill="#b88530" stroke="#3a2000" strokeWidth="1.5"/><line x1="5" y1="17" x2="55" y2="17" stroke="#8a6018" strokeWidth="0.8"/><line x1="5" y1="23" x2="55" y2="23" stroke="#8a6018" strokeWidth="0.8"/></svg>
    ),
    "Chêne": (
      <svg viewBox="0 0 60 40"><rect x="5" y="15" width="50" height="10" rx="2" fill="#c9a86c" stroke="#3a2000" strokeWidth="1.5"/><path d="M10 18 Q20 22 30 18 Q40 22 50 18" fill="none" stroke="#8a6018" strokeWidth="0.5" opacity="0.5"/></svg>
    ),
    "Câble": (
      <svg viewBox="0 0 60 40"><line x1="5" y1="20" x2="55" y2="20" stroke="#888" strokeWidth="3"/><path d="M8 18 Q15 14 22 18 Q29 22 36 18 Q43 14 50 18" fill="none" stroke="#aaa" strokeWidth="1.5"/><path d="M8 22 Q15 26 22 22 Q29 18 36 22 Q43 26 50 22" fill="none" stroke="#aaa" strokeWidth="1.5"/></svg>
    ),
    "Chanvre": (
      <svg viewBox="0 0 60 40"><line x1="5" y1="20" x2="55" y2="20" stroke="#c4a060" strokeWidth="4" strokeLinecap="round"/><path d="M8 18 Q18 15 28 18 Q38 21 48 18" fill="none" stroke="#a88040" strokeWidth="1" opacity="0.6"/></svg>
    ),
  },
  // Garde-corps étage
  floorRailing: {
    "Marche palière": (
      <svg viewBox="0 0 60 40"><rect x="5" y="25" width="50" height="8" rx="1" fill="#b88530" stroke="#3a2000" strokeWidth="1"/><line x1="10" y1="25" x2="10" y2="8" stroke="#3a2000" strokeWidth="2"/><line x1="10" y1="8" x2="50" y2="8" stroke="#3a2000" strokeWidth="1.5"/><line x1="50" y1="25" x2="50" y2="8" stroke="#3a2000" strokeWidth="2"/></svg>
    ),
    "Tour de trémie": (
      <svg viewBox="0 0 60 40"><rect x="15" y="10" width="30" height="25" rx="1" fill="none" stroke="#3a2000" strokeWidth="1.5" strokeDasharray="2,2"/><line x1="15" y1="10" x2="15" y2="35" stroke="#3a2000" strokeWidth="2"/><line x1="45" y1="10" x2="45" y2="35" stroke="#3a2000" strokeWidth="2"/><line x1="15" y1="12" x2="45" y2="12" stroke="#3a2000" strokeWidth="1.5"/></svg>
    ),
  },
  // Poteau de départ / arrivée
  startPost: {
    "Sans": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="5" x2="30" y2="35" stroke="#b88530" strokeWidth="2" strokeDasharray="3,3" opacity="0.4"/></svg>
    ),
    "Fonte classique": (
      <svg viewBox="0 0 60 40"><rect x="26" y="5" width="8" height="30" rx="1" fill="#888" stroke="#555" strokeWidth="1"/><rect x="24" y="3" width="12" height="4" rx="1" fill="#999" stroke="#555" strokeWidth="0.8"/></svg>
    ),
  },
  // Crosse (newel)
  startNewel: {
    "Sans": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="5" x2="30" y2="35" stroke="#b88530" strokeWidth="3"/></svg>
    ),
    "Crosse courte": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="5" x2="30" y2="35" stroke="#b88530" strokeWidth="3"/><path d="M30 5 Q20 5 20 12 Q20 18 30 18" fill="none" stroke="#b88530" strokeWidth="2.5"/></svg>
    ),
    "Crosse longue": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="5" x2="30" y2="35" stroke="#b88530" strokeWidth="3"/><path d="M30 5 Q12 5 12 15 Q12 25 30 25" fill="none" stroke="#b88530" strokeWidth="2.5"/></svg>
    ),
  },
  // Boule
  startBall: {
    "Sans": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="10" x2="30" y2="35" stroke="#b88530" strokeWidth="3"/></svg>
    ),
    "Boule acier": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="22" x2="30" y2="35" stroke="#b88530" strokeWidth="3"/><circle cx="30" cy="15" r="8" fill="#999" stroke="#666" strokeWidth="1"/><ellipse cx="27" cy="12" rx="2" ry="3" fill="rgba(255,255,255,0.3)"/></svg>
    ),
    "Boule en verre \u00e0 facettes": (
      <svg viewBox="0 0 60 40"><line x1="30" y1="22" x2="30" y2="35" stroke="#b88530" strokeWidth="3"/><circle cx="30" cy="15" r="8" fill="rgba(180,220,255,0.5)" stroke="#8ab" strokeWidth="1"/><polygon points="30,8 36,13 34,20 26,20 24,13" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/></svg>
    ),
  },
};

// Reuse same previews for end variants
PREVIEWS.endNewel = PREVIEWS.startNewel;
PREVIEWS.endBall = PREVIEWS.startBall;
PREVIEWS.endPost = PREVIEWS.startPost;

// Default "no preview" placeholder
const noPreview = (
  <svg viewBox="0 0 60 40">
    <rect x="5" y="5" width="50" height="30" rx="2" fill="none" stroke="#aaa" strokeWidth="1" strokeDasharray="3,2"/>
    <text x="30" y="22" textAnchor="middle" fontSize="5" fill="#999">Aperçu</text>
  </svg>
);

interface Option { value: number | string; label: string }

interface Props {
  configKey: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  onPreview?: (node: React.ReactNode) => void;
}

export default function PreviewSelect({ configKey, value, onChange, options, onPreview }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onPreview?.(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onPreview]);

  // Clear viewer overlay when dropdown closes
  useEffect(() => {
    if (!open) onPreview?.(null);
  }, [open, onPreview]);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || "";
  const previews = PREVIEWS[configKey];

  return (
    <div className="preview-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="preview-select-btn"
        onClick={() => setOpen(v => !v)}
      >
        <span className="preview-select-label">{selectedLabel}</span>
        <span className="preview-select-arrows">{"▲\n▼"}</span>
      </button>

      {open && (
        <div className="preview-select-dropdown">
          <div className="preview-select-options">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`preview-select-option${String(opt.value) === String(value) ? " preview-select-option--active" : ""}`}
                onMouseEnter={() => {
                  const svg = previews?.[opt.label] ?? noPreview;
                  onPreview?.(svg);
                }}
                onMouseLeave={() => {
                  onPreview?.(null);
                }}
                onClick={() => {
                  const fakeEvent = { target: { value: String(opt.value) } } as React.ChangeEvent<HTMLSelectElement>;
                  onChange(fakeEvent);
                  setOpen(false);
                  onPreview?.(null);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
