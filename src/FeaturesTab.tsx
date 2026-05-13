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

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

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
      <div className="stepper-val" onClick={!editing ? startEdit : undefined} title="Click to type a value">
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
          <>
            {value}
          </>
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

export default function FeaturesTab({ config, onChange }: Props) {
  const sel = (key: keyof ConfigState) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange(key, Number(e.target.value));
  const num = (key: keyof ConfigState) => (v: number) => onChange(key, v);

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
            <option value={0}>Square</option>
            <option value={1}>Round</option>
          </Sel>
        </Field>

        <Field label="Sens de rotation">
          <Sel value={config.rotation} onChange={sel("rotation")}>
            <option value={0}>Clockwise</option>
            <option value={1}>Counter-clockwise</option>
          </Sel>
        </Field>

        <Field label="Dessus de marches">
          <Sel value={config.treadTop} onChange={sel("treadTop")}>
            <option value={0}>Solid</option>
            <option value={1}>Wood – raw oak</option>
            <option value={2}>Wood – vitrified oak</option>
            <option value={3}>Wood – raw teak</option>
            <option value={4}>Wood – oiled teak</option>
            <option value={5}>Lace</option>
          </Sel>
        </Field>

        <Field label="Contre-marches">
          <Sel value={config.risers} onChange={sel("risers")}>
            <option value={4}>Lace</option>
            <option value={0}>Deep Forest</option>
            <option value={1}>Solid</option>
            <option value={2}>Open</option>
          </Sel>
        </Field>

        <Field label="Main courante">
          <Sel value={config.handrail} onChange={sel("handrail")}>
            <option value={0}>Braided steel</option>
            <option value={1}>Hemp</option>
            <option value={2}>Flat</option>
            <option value={3}>Round</option>
            <option value={4}>Molded</option>
          </Sel>
        </Field>

        <Field label="Garde-corps étage">
          <Sel value={config.floorRailing} onChange={sel("floorRailing")}>
            <option value={0}>Landing tread</option>
            <option value={1}>Well opening surround</option>
          </Sel>
        </Field>

        <Field label="Poteau de départ">
          <Sel value={config.startPost} onChange={sel("startPost")}>
            <option value={0}>Without</option>
            <option value={1}>With</option>
          </Sel>
        </Field>

        <Field label="Poteau d'arrivée">
          <Sel value={config.endPost} onChange={sel("endPost")}>
            <option value={0}>Without</option>
            <option value={1}>With</option>
          </Sel>
        </Field>

        <Field label="Crosse au départ">
          <Sel value={config.startNewel} onChange={sel("startNewel")}>
            <option value={0}>Without</option>
            <option value={1}>Short</option>
            <option value={2}>Long</option>
          </Sel>
        </Field>

        <Field label="Crosse à l'arrivée">
          <Sel value={config.endNewel} onChange={sel("endNewel")}>
            <option value={0}>Without</option>
            <option value={1}>Short</option>
            <option value={2}>Long</option>
          </Sel>
        </Field>

        <Field label="Boule au départ">
          <Sel value={config.startBall} onChange={sel("startBall")}>
            <option value={0}>Without</option>
            <option value={1}>Steel</option>
            <option value={2}>Glass</option>
          </Sel>
        </Field>

        <Field label="Boule à l'arrivée">
          <Sel value={config.endBall} onChange={sel("endBall")}>
            <option value={0}>Without</option>
            <option value={1}>Steel</option>
            <option value={2}>Glass</option>
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
          {config.balusters === 0 && (
            <div className="warning-box">
              <span className="warn-icon">⚠️</span> Aucun balustres intermédiaire signifie un écart de ... mm <span className="warn-icon">⚠️</span><br />
              <span className="warn-icon">⚠️</span> La norme NF P01-012 du 6 Juin 2024 n'est pas respectée <span className="warn-icon">⚠️</span>
            </div>
          )}
        </div>

        <div className="field field--full">
          <label className="field-label">Plaque de répartition de charge</label>
          <Sel value={config.distributionPlate} onChange={sel("distributionPlate")}>
            <option value={0}>Without</option>
            <option value={1}>With</option>
          </Sel>
        </div>

        <div className="field field--full">
          <label className="field-label">Marches sans garde-corps</label>
          <Sel value={config.treadsNoRail} onChange={sel("treadsNoRail")}>
            <option value={0}>None</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </Sel>
        </div>

      </div>
    </div>
  );
}
