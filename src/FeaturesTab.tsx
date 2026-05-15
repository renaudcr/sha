import React, { useState } from "react";
import type { ConfigState } from "./useShapeDiver";
import type { ParamChoices } from "./useShapeDiver";

interface Props {
  config: ConfigState;
  onChange: (key: keyof ConfigState, value: number) => void;
  paramChoices: ParamChoices;
}

/* ── Custom number stepper with click-to-edit ── */
function Stepper({
  value, min, max, unit, onChange,
}: {
  value: number; min: number; max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

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
          <>{value}</>
        )}
      </div>
      {unit && <span className="stepper-unit">{unit}</span>}
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

/* ── Dynamic select: renders choices from ShapeDiver when available, fallback otherwise ── */
function DynSel({
  configKey, value, onChange, paramChoices, fallback,
}: {
  configKey: keyof ConfigState;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  paramChoices: ParamChoices;
  fallback: { value: number; label: string }[];
}) {
  const choices = paramChoices[configKey];
  return (
    <Sel value={value} onChange={onChange}>
      {choices
        ? choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)
        : fallback.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)
      }
    </Sel>
  );
}

export default function FeaturesTab({ config, onChange, paramChoices }: Props) {
  const sel = (key: keyof ConfigState) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange(key, Number(e.target.value));
  const num = (key: keyof ConfigState) => (v: number) => onChange(key, v);

  const gap = calcGap(config.diameter, config.balusters);
  const nfViolation = gap > 110;

  return (
    <div className="tab-content">
      <div className="fields-grid">

        <Field label="Hauteur à monter">
          <Stepper value={config.height} min={1800} max={4500} unit="mm" onChange={num("height")} />
        </Field>

        <Field label="Diamètre colimaçon">
          <Stepper value={config.diameter} min={1000} max={2000} unit="mm" onChange={num("diameter")} />
        </Field>

        <Field label="Type de trémie">
          <DynSel configKey="openingType" value={config.openingType} onChange={sel("openingType")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Carrée" }, { value: 1, label: "Ronde" }]} />
        </Field>

        <Field label="Sens de rotation">
          <DynSel configKey="rotation" value={config.rotation} onChange={sel("rotation")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Horaire" }, { value: 1, label: "Anti-horaire" }]} />
        </Field>

        <div className="field field--full">
          <label className="field-label">Rotation de l'escalier</label>
          <div className="slider-row">
            <input
              type="range"
              className="slider"
              min={0}
              max={12}
              step={0.01}
              value={config.stairRotation}
              onChange={(e) => onChange("stairRotation", parseFloat(e.target.value))}
            />
            <Stepper value={parseFloat(config.stairRotation.toFixed(2))} min={0} max={12} onChange={num("stairRotation")} />
          </div>
          <div className="slider-labels">
            <span>0</span>
            <span>12</span>
          </div>
        </div>

        <Field label="Dessus de marches">
          <DynSel configKey="treadTop" value={config.treadTop} onChange={sel("treadTop")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Pleine" }, { value: 1, label: "Dentelle" }]} />
        </Field>

        <Field label="Contre-marches">
          <DynSel configKey="risers" value={config.risers} onChange={sel("risers")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Plein" }, { value: 1, label: "Ouvert" }]} />
        </Field>

        <Field label="Main courante">
          <DynSel configKey="handrail" value={config.handrail} onChange={sel("handrail")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Plate" }, { value: 1, label: "Ronde" }]} />
        </Field>

        <Field label="Garde-corps étage">
          <DynSel configKey="floorRailing" value={config.floorRailing} onChange={sel("floorRailing")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Marche palière" }, { value: 1, label: "Tour de trémie" }]} />
        </Field>

        <Field label="Poteau de départ">
          <DynSel configKey="startPost" value={config.startPost} onChange={sel("startPost")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Avec" }]} />
        </Field>

        <Field label="Poteau d'arrivée">
          <DynSel configKey="endPost" value={config.endPost} onChange={sel("endPost")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Avec" }]} />
        </Field>

        <Field label="Crosse au départ">
          <DynSel configKey="startNewel" value={config.startNewel} onChange={sel("startNewel")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Courte" }, { value: 2, label: "Longue" }]} />
        </Field>

        <Field label="Crosse à l'arrivée">
          <DynSel configKey="endNewel" value={config.endNewel} onChange={sel("endNewel")} paramChoices={paramChoices}
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

        {/* Full-width: balusters */}
        <div className="field field--full">
          <label className="field-label">Balustres intermédiaires</label>
          <DynSel configKey="balusters" value={config.balusters} onChange={sel("balusters")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" }]} />
          {nfViolation && (
            <div className="warning-box">
              <span className="warning-icon">⚠</span>
              Aucun balustre intermédiaire signifie un écart de {gap} mm
              <span className="warning-icon">⚠</span>
              <br />
              <span className="warning-icon">⚠</span>
              La norme publique NF P01-012 n'est pas respectée (max 110 mm)
              <span className="warning-icon">⚠</span>
            </div>
          )}
        </div>

        <div className="field field--full">
          <label className="field-label">Plaque de répartition de charge</label>
          <DynSel configKey="distributionPlate" value={config.distributionPlate} onChange={sel("distributionPlate")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Sans" }, { value: 1, label: "Avec" }]} />
        </div>

        <div className="field field--full">
          <label className="field-label">Marches sans garde-corps</label>
          <DynSel configKey="treadsNoRail" value={config.treadsNoRail} onChange={sel("treadsNoRail")} paramChoices={paramChoices}
            fallback={[{ value: 0, label: "Aucune" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }]} />
        </div>

      </div>
    </div>
  );
}
