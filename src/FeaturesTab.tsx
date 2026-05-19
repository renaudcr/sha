import React, { useRef, useCallback, useEffect } from "react";
import type { ConfigState } from "./useShapeDiver";
import type { ParamChoices } from "./useShapeDiver";
import PreviewSelect from "./PreviewSelect";

interface Props {
  config: ConfigState;
  onChange: (key: keyof ConfigState, value: number) => void;
  paramChoices: ParamChoices;
  onPreview: (node: React.ReactNode) => void;
}

/* ── Custom number stepper (click value to edit, arrows are decorative) ── */
function Stepper({
  value, min, max, unit, onChange,
}: {
  value: number; min: number; max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const startEdit = () => { setDraft(String(value)); setEditing(true); };
  const commitEdit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="stepper">
      <div className="stepper-val" onClick={!editing ? startEdit : undefined} title="Cliquer pour saisir une valeur">
        {editing ? (
          <input
            className="stepper-input"
            type="number"
            value={draft}
            min={min}
            max={max}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKey}
          />
        ) : (
          <>{value}{unit ? ` ${unit}` : ""}</>
        )}
      </div>
    </div>
  );
}

/* ── Styled select wrapper ── */
function Sel({
  value, onChange, children,
}: {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="select-wrap">
      <select className="select" value={String(value)} onChange={onChange}>
        {children}
      </select>
    </div>
  );
}

/* ── Field label + control ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

/* ── Clean section divider ── */
function Section({ title }: { title: string }) {
  return (
    <div className="section-divider field--full">
      <span className="section-title">{title}</span>
    </div>
  );
}

/* ── Clock-style rotation dial ── */
function RotationDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVal = useRef(value);

  // Debounced commit to ShapeDiver (avoids lag from frequent customize calls)
  const commit = useCallback((v: number) => {
    pendingVal.current = v;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 200);
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const angleFromValue = (v: number) => (v / 12) * 360 - 90; // 0=top(12 o'clock), clockwise
  const valueFromAngle = (deg: number) => {
    let norm = (deg + 90) % 360;
    if (norm < 0) norm += 360;
    return Math.round((norm / 360) * 12 * 100) / 100;
  };

  const getAngleFromEvent = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    const angle = getAngleFromEvent(e);
    commit(valueFromAngle(angle));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const angle = getAngleFromEvent(e);
    commit(valueFromAngle(angle));
  };

  const handlePointerUp = () => {
    dragging.current = false;
    // Final commit immediately
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange(pendingVal.current);
  };

  const displayVal = pendingVal.current !== value && dragging.current ? pendingVal.current : value;
  const handAngle = angleFromValue(displayVal);
  const r = 44; // hand length
  const cx = 50, cy = 50;
  const hx = cx + r * Math.cos((handAngle * Math.PI) / 180);
  const hy = cy + r * Math.sin((handAngle * Math.PI) / 180);

  // Hour tick marks (1-12)
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360 - 90;
    const rad = (a * Math.PI) / 180;
    const outerR = 46;
    const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
    const innerR = isCardinal ? 37 : 40;
    const labelR = isCardinal ? 28 : 34;
    return {
      x1: cx + innerR * Math.cos(rad), y1: cy + innerR * Math.sin(rad),
      x2: cx + outerR * Math.cos(rad), y2: cy + outerR * Math.sin(rad),
      lx: cx + labelR * Math.cos(rad), ly: cy + labelR * Math.sin(rad),
      label: i === 0 ? "12" : String(i),
      isCardinal,
    };
  });

  return (
    <div className="rotation-dial">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="dial-svg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Clock face */}
        <circle cx={cx} cy={cy} r="47" fill="var(--input-bg)" stroke="var(--border)" strokeWidth="1.5" />
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--ink-light)" strokeWidth={t.isCardinal ? "1.5" : "1"} />
            <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="central"
              fontSize={t.isCardinal ? "9" : "5"} fill="var(--ink-mid)" fontFamily="var(--font)" fontWeight={t.isCardinal ? "bold" : "normal"}>{t.label}</text>
          </g>
        ))}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill="var(--border)" />
        {/* Hand */}
        <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#8b4513" strokeWidth="2" strokeLinecap="round" />
        {/* Hand tip */}
        <circle cx={hx} cy={hy} r="2.5" fill="#8b4513" />
      </svg>
    </div>
  );
}

/* ── NF P01-012 gap calculation ──
   Circumference of stair ≈ π × diameter
   Sections between balusters = balusters + 1
   Gap ≈ circumference / (sections × number_of_steps)
   We approximate with: gap = (π × diameter) / ((balusters + 1) × 12)
   Standard requires gap ≤ 110 mm
*/
function calcGap(diameter: number, balusters: number): number {
  const circumference = Math.PI * diameter;
  const sections = (balusters + 1) * 12;
  return Math.round(circumference / sections);
}

/* Keys that have preview thumbnails */
const PREVIEW_KEYS = new Set<string>([
  "treadTop", "risers", "handrail", "floorRailing",
  "startPost", "endPost", "startNewel", "endNewel",
  "startBall", "endBall",
]);

/* ── Dynamic select: renders choices from ShapeDiver when available, fallback otherwise ── */
function DynSel({
  configKey, value, onChange, paramChoices, fallback, onPreview,
}: {
  configKey: keyof ConfigState;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  paramChoices: ParamChoices;
  fallback: { value: number; label: string }[];
  onPreview?: (node: React.ReactNode) => void;
}) {
  const choices = paramChoices[configKey];
  const options: { value: number | string; label: string }[] = choices
    ? choices.map(c => ({ value: c.value, label: c.label }))
    : fallback;

  if (PREVIEW_KEYS.has(configKey)) {
    return (
      <PreviewSelect
        configKey={configKey}
        value={value}
        onChange={onChange}
        options={options}
        onPreview={onPreview}
      />
    );
  }

  return (
    <Sel value={value} onChange={onChange}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Sel>
  );
}

export default function FeaturesTab({ config, onChange, paramChoices, onPreview }: Props) {
  const sel = (key: keyof ConfigState) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange(key, Number(e.target.value));
  const num = (key: keyof ConfigState) => (v: number) => onChange(key, v);

  const gap = calcGap(config.diameter, config.balusters);
  const nfViolation = gap > 110;

  return (
    <div className="tab-content">
      <div className="fields-grid">

        {/* ── Dimensions ── */}
        <Section title="Dimensions" />

        <Field label="Hauteur à monter">
          <Stepper value={config.height} min={1800} max={4500}  onChange={num("height")} />
        </Field>

        <Field label="Diamètre colimaçon">
          <Stepper value={config.diameter} min={1000} max={2000}  onChange={num("diameter")} />
        </Field>

        <Field label="Type de trémie">
          <DynSel configKey="openingType" value={config.openingType} onChange={sel("openingType")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Carrée" }, { value: 1, label: "Ronde" }]} />
        </Field>

        <Field label="Sens de rotation">
          <DynSel configKey="rotation" value={config.rotation} onChange={sel("rotation")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Horaire" }, { value: 1, label: "Anti-horaire" }]} />
        </Field>

        <div className="field field--full" style={{ textAlign: "center" }}>
          <label className="field-label" style={{ textAlign: "center" }}>Rotation de l'escalier</label>
          <RotationDial value={config.stairRotation} onChange={num("stairRotation")} />
        </div>

        {/* ── Marches ── */}
        <Section title="Marches" />

        <Field label="Dessus de marches">
          <DynSel configKey="treadTop" value={config.treadTop} onChange={sel("treadTop")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Pleine" }, { value: 1, label: "Dentelle" }]} />
        </Field>

        <Field label="Contre-marches">
          <DynSel configKey="risers" value={config.risers} onChange={sel("risers")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Plein" }, { value: 1, label: "Ouvert" }]} />
        </Field>

        {/* ── Garde-corps ── */}
        <Section title="Garde-corps" />

        <Field label="Main courante">
          <DynSel configKey="handrail" value={config.handrail} onChange={sel("handrail")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Plate" }, { value: 1, label: "Ronde" }]} />
        </Field>

        <Field label="Garde-corps étage">
          <DynSel configKey="floorRailing" value={config.floorRailing} onChange={sel("floorRailing")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Marche palière" }, { value: 1, label: "Tour de trémie" }]} />
        </Field>

        <Field label="Poteau de départ">
          <DynSel configKey="startPost" value={config.startPost} onChange={sel("startPost")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Avec" }]} />
        </Field>

        <Field label="Poteau d'arrivée">
          <DynSel configKey="endPost" value={config.endPost} onChange={sel("endPost")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Avec" }]} />
        </Field>

        <Field label="Crosse au départ">
          <DynSel configKey="startNewel" value={config.startNewel} onChange={sel("startNewel")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Courte" }, { value: 2, label: "Longue" }]} />
        </Field>

        <Field label="Crosse à l'arrivée">
          <DynSel configKey="endNewel" value={config.endNewel} onChange={sel("endNewel")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Courte" }, { value: 2, label: "Longue" }]} />
        </Field>

        {config.startPost === 1 && (
          <Field label="Boule au départ">
            <DynSel configKey="startBall" value={config.startBall} onChange={sel("startBall")} paramChoices={paramChoices}
              fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Acier" }, { value: 2, label: "Verre" }]} />
          </Field>
        )}

        {config.endPost === 1 && (
          <Field label="Boule à l'arrivée">
            <DynSel configKey="endBall" value={config.endBall} onChange={sel("endBall")} paramChoices={paramChoices}
              fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Acier" }, { value: 2, label: "Verre" }]} />
          </Field>
        )}

        {/* ── Sécurité & Options ── */}
        <Section title="Sécurité & Options" />

        <Field label="Balustres intermédiaires">
          <DynSel configKey="balusters" value={config.balusters} onChange={sel("balusters")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" }]} />
        </Field>

        <Field label="Plaque de répartition">
          <DynSel configKey="distributionPlate" value={config.distributionPlate} onChange={sel("distributionPlate")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Avec" }]} />
        </Field>

        {(() => {
          const countLabel = ["Aucun", "Un", "Deux", "Trois", "Quatre"][config.balusters] ?? String(config.balusters);
          const verb = config.balusters <= 1 ? "signifie" : "signifient";
          return (
            <div className={`field--full warning-box${nfViolation ? "" : " warning-box--ok"}`}>
              {nfViolation && <span className="warning-icon">⚠ </span>}
              {countLabel} balustre{config.balusters > 1 ? "s" : ""} intermédiaire{config.balusters > 1 ? "s" : ""} {verb} un écart de {gap} mm
              {nfViolation && <span className="warning-icon"> ⚠</span>}
              <br />
              {nfViolation
                ? <><span className="warning-icon">⚠ </span>La norme NF P01-012 du 6 Juin 2024 n'est pas respectée<span className="warning-icon"> ⚠</span></>
                : <>↳ La norme NF P01-012 du 6 Juin 2024 est respectée</>
              }
            </div>
          );
        })()}

        <Field label="Marches sans garde-corps">
          <DynSel configKey="treadsNoRail" value={config.treadsNoRail} onChange={sel("treadsNoRail")} paramChoices={paramChoices} onPreview={onPreview}
            fallback={[{ value: 0, label: "Aucune" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }]} />
        </Field>

      </div>
    </div>
  );
}
