import React, { useState } from "react";

interface ContactData {
  name: string;
  email: string;
  phone: string;
  postalCity: string;
  message: string;
  postalAddress: string;
}

interface Props {
  onSubmit: (data: ContactData) => Promise<void>;
  onBack: () => void;
}

function validate(data: ContactData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) errors.name = "Champ obligatoire";
  if (!data.email.trim()) {
    errors.email = "Champ obligatoire";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Format invalide";
  }
  if (!data.phone.trim()) {
    errors.phone = "Champ obligatoire";
  } else if (!/^[\d\s\+\-\(\)]{6,20}$/.test(data.phone)) {
    errors.phone = "Numéro invalide";
  }
  if (!data.postalCity.trim()) errors.postalCity = "Champ obligatoire";
  if (!data.message.trim()) errors.message = "Champ obligatoire";
  return errors;
}

export default function ContactTab({ onSubmit, onBack }: Props) {
  const [data, setData] = useState<ContactData>({
    name: "", email: "", phone: "",
    postalCity: "", message: "", postalAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (key: keyof ContactData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setData(prev => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSending(true);
    try {
      await onSubmit(data);
      setSubmitted(true);
    } catch (_) {
      setErrors({ form: "Échec de l'envoi. Veuillez réessayer." });
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="tab-content">
        <div className="success-box">
          <p>Votre demande a été envoyée avec succès.</p>
          <p>Nous vous contacterons dans les plus brefs délais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <form onSubmit={handleSubmit} noValidate>
        <div className="fields-grid">

          <div className="field">
            <label className="field-label">NOM Prénom*</label>
            <input className={`input${errors.name ? " input-error" : ""}`}
              type="text" value={data.name} onChange={set("name")} />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="field">
            <label className="field-label">Adresse mail*</label>
            <input className={`input${errors.email ? " input-error" : ""}`}
              type="email" value={data.email} onChange={set("email")} />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className="field">
            <label className="field-label">N° de téléphone*</label>
            <input className={`input${errors.phone ? " input-error" : ""}`}
              type="tel" value={data.phone} onChange={set("phone")} />
            {errors.phone && <span className="error-msg">{errors.phone}</span>}
          </div>

          <div className="field">
            <label className="field-label">CP – Ville*</label>
            <input className={`input${errors.postalCity ? " input-error" : ""}`}
              type="text" value={data.postalCity} onChange={set("postalCity")} />
            {errors.postalCity && <span className="error-msg">{errors.postalCity}</span>}
          </div>

          <div className="field">
            <label className="field-label">Adresse du chantier</label>
            <input className="input" type="text"
              value={data.postalAddress} onChange={set("postalAddress")} />
          </div>

          <div className="field field--full">
            <label className="field-label">Message*</label>
            <textarea className={`textarea${errors.message ? " input-error" : ""}`}
              rows={7} value={data.message} onChange={set("message")} />
            {errors.message && <span className="error-msg">{errors.message}</span>}
          </div>

        </div>

        <p className="required-note">*Champs obligatoires</p>
        {errors.form && <span className="error-msg">{errors.form}</span>}

        <div className="contact-actions">
          <button type="button" className="nav-btn nav-btn--circle nav-btn--prev" onClick={onBack} aria-label="Retour" />
          <button type="submit" className="send-btn" disabled={sending}>
            {sending ? "Envoi..." : "ENVOYER"}
          </button>
        </div>

      </form>
    </div>
  );
}
