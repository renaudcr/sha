import React, { useState } from "react";
import type { ConfigState } from "./useShapeDiver";

interface Props {
  config: ConfigState;
  onChange: (key: keyof ConfigState, value: number) => void;
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
    const n = parseInt(draft, 10);
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

export default function FeaturesTab({ config, onChange }: Props) {
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
          <Sel value={config.openingType} onChange={sel("openingType")}>
            <option value={0}>Carré</option>
            <option value={1}>Rond</option>
          </Sel>
        </Field>

        <Field label="Sens de rotation">
          <Sel value={config.rotation} onChange={sel("rotation")}>
            <option value={0}>Horaire</option>
            <option value={1}>Anti-horaire</option>
          </Sel>
        </Field>

        <Field label="Dessus de marches">
          <Sel value={config.treadTop} onChange={sel("treadTop")}>
            <option value={0}>Plein</option>
            <option value={1}>Bois – chêne brut</option>
            <option value={2}>Bois – chêne vitrifié</option>
            <option value={3}>Bois – teck brut</option>
            <option value={4}>Bois – teck huilé</option>
            <option value={5}>Dentelle</option>
          </Sel>
        </Field>

        <Field label="Contre-marches">
          <Sel value={config.risers} onChange={sel("risers")}>
            <option value={4}>Dentelle</option>
            <option value={0}>Deep Forest</option>
            <option value={1}>Plein</option>
            <option value={2}>Ouvert</option>
          </Sel>
        </Field>

        <Field label="Main courante">
          <Sel value={config.handrail} onChange={sel("handrail")}>
            <option value={0}>Câble tressé acier</option>
            <option value={1}>Chanvre</option>
            <option value={2}>Plate</option>
            <option value={3}>Ronde</option>
            <option value={4}>Moulurée</option>
          </Sel>
        </Field>

        <Field label="Garde-corps étage">
          <Sel value={config.floorRailing} onChange={sel("floorRailing")}>
            <option value={0}>Marche palière</option>
            <option value={1}>Tour de trémie</option>
          </Sel>
        </Field>

        <Field label="Poteau de départ">
          <Sel value={config.startPost} onChange={sel("startPost")}>
            <option value={0}>Sans</option>
            <option value={1}>Avec</option>
          </Sel>
        </Field>

        <Field label="Poteau d'arrivée">
          <Sel value={config.endPost} onChange={sel("endPost")}>
            <option value={0}>Sans</option>
            <option value={1}>Avec</option>
          </Sel>
        </Field>

        <Field label="Crosse au départ">
          <Sel value={config.startNewel} onChange={sel("startNewel")}>
            <option value={0}>Sans</option>
            <option value={1}>Courte</option>
            <option value={2}>Longue</option>
          </Sel>
        </Field>

        <Field label="Crosse à l'arrivée">
          <Sel value={config.endNewel} onChange={sel("endNewel")}>
            <option value={0}>Sans</option>
            <option value={1}>Courte</option>
            <option value={2}>Longue</option>
          </Sel>
        </Field>

        <Field label="Boule au départ">
          <Sel value={config.startBall} onChange={sel("startBall")}>
            <option value={0}>Sans</option>
            <option value={1}>Acier</option>
            <option value={2}>Verre</option>
          </Sel>
        </Field>

        <Field label="Boule à l'arrivée">
          <Sel value={config.endBall} onChange={sel("endBall")}>
            <option value={0}>Sans</option>
            <option value={1}>Acier</option>
            <option value={2}>Verre</option>
          </Sel>
        </Field>

        {/* Full-width: balusters */}
        <div className="field field--full">
          <label className="field-label">Balustres intermédiaires</label>
          <Sel value={config.balusters} onChange={sel("balusters")}>
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </Sel>
          {nfViolation && (
            <div className="warning-box">
              ⚠️ Écart entre balustres : {gap} mm — norme NF P01-012 non respectée (max 110 mm) ⚠️
            </div>
          )}
        </div>

        <div className="field field--full">
          <label className="field-label">Plaque de répartition de charge</label>
          <Sel value={config.distributionPlate} onChange={sel("distributionPlate")}>
            <option value={0}>Sans</option>
            <option value={1}>Avec</option>
          </Sel>
        </div>

        <div className="field field--full">
          <label className="field-label">Marches sans garde-corps</label>
          <Sel value={config.treadsNoRail} onChange={sel("treadsNoRail")}>
            <option value={0}>Aucune</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </Sel>
        </div>

      </div>
    </div>
  );
}
