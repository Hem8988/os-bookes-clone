'use client';

import { useState } from 'react';
import { INQUIRY_NEEDS } from '@/lib/inquiries';
import styles from './site.module.css';

// Public inquiry form on the home page. Saved as an inquiry and sent to the team on WhatsApp.

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; number: string | null } | { kind: 'error'; message: string };

/** compact: the short version in the hero (name, mobile, need, cylinder); the full one is in #inquiry. */
export function InquiryForm({ sizes, compact = false }: { sizes: string[]; compact?: boolean }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || 'Could not send. Please call or WhatsApp us.');
      form.reset();
      setState({ kind: 'done', number: json.data?.inquiryNumber ?? null });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message });
    }
  };

  if (state.kind === 'done') {
    return (
      <div className={styles.formCard} role="status">
        <h3 className={`${styles.display} ${styles.formDoneTitle}`}>Thank you!</h3>
        <p className={styles.formNote}>
          We got your inquiry{state.number ? ` (${state.number})` : ''}. Our team will call you shortly.
        </p>
        <button type="button" className={`${styles.btn} ${styles.btnWhatsapp}`} onClick={() => setState({ kind: 'idle' })}>
          Send another inquiry
        </button>
      </div>
    );
  }

  const sending = state.kind === 'sending';

  if (compact) {
    return (
      <form className={`${styles.formCard} ${styles.formCompact}`} onSubmit={submit} aria-labelledby="quick-inquiry-title">
        <h2 id="quick-inquiry-title" className={`${styles.display} ${styles.formCompactTitle}`}>
          New customer? Get a quote
        </h2>
        <p className={styles.formNote}>Leave your number — we call back with rates for your area.</p>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Your name *</span>
            <input name="name" required maxLength={80} autoComplete="name" className={styles.input} />
          </label>
          <label className={styles.field}>
            <span>Mobile number *</span>
            <input name="phone" required inputMode="tel" pattern="[0-9 +\-]{10,15}" maxLength={15} autoComplete="tel" placeholder="98xxxxxxxx" className={styles.input} />
          </label>
          <label className={styles.field}>
            <span>What do you need?</span>
            <select name="need" defaultValue="NEW_CONNECTION" className={styles.input}>
              {Object.entries(INQUIRY_NEEDS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Cylinder</span>
            <select name="cylinderSize" defaultValue="" className={styles.input}>
              <option value="">Not sure</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.honeypot} />
        </div>
        {state.kind === 'error' && (
          <p className={styles.formError} role="alert">
            {state.message}
          </p>
        )}
        <div className={styles.formActions}>
          <button type="submit" disabled={sending} className={`${styles.btn} ${styles.btnPrimary}`}>
            {sending ? 'Sending…' : 'Get a call back'}
          </button>
          <a href="#inquiry" className={styles.contactLink}>
            Add more details
          </a>
        </div>
      </form>
    );
  }

  return (
    <form className={styles.formCard} onSubmit={submit} aria-label="Inquiry form">
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Your name *</span>
          <input name="name" required maxLength={80} autoComplete="name" className={styles.input} />
        </label>
        <label className={styles.field}>
          <span>Mobile number *</span>
          <input name="phone" required inputMode="tel" pattern="[0-9 +\-]{10,15}" maxLength={15} autoComplete="tel" placeholder="98xxxxxxxx" className={styles.input} />
        </label>
        <label className={styles.field}>
          <span>Business name</span>
          <input name="businessName" maxLength={120} autoComplete="organization" placeholder="Hotel, restaurant, factory…" className={styles.input} />
        </label>
        <label className={styles.field}>
          <span>City / area</span>
          <input name="city" maxLength={80} autoComplete="address-level2" className={styles.input} />
        </label>
        <label className={styles.field}>
          <span>What do you need?</span>
          <select name="need" defaultValue="NEW_CONNECTION" className={styles.input}>
            {Object.entries(INQUIRY_NEEDS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.fieldPair}>
          <label className={styles.field}>
            <span>Cylinder</span>
            <select name="cylinderSize" defaultValue="" className={styles.input}>
              <option value="">Not sure</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Cylinders / month</span>
            <input name="monthlyQty" type="number" min={1} max={99999} inputMode="numeric" className={styles.input} />
          </label>
        </div>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Message</span>
          <textarea name="message" rows={3} maxLength={1000} className={styles.input} placeholder="Anything we should know" />
        </label>
        {/* Bots fill every field; people never see this one. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.honeypot} />
      </div>
      {state.kind === 'error' && (
        <p className={styles.formError} role="alert">
          {state.message}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="submit" disabled={sending} className={`${styles.btn} ${styles.btnPrimary}`}>
          {sending ? 'Sending…' : 'Send inquiry'}
        </button>
        <p className={styles.formNote}>We reply on call or WhatsApp, usually within an hour in working time.</p>
      </div>
    </form>
  );
}
