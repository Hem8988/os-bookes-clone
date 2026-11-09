'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, errorMessage, uploadFile } from '../lib/api';
import { DEFAULT_WEBSITE, type WebsiteContent, type WebsiteStep } from '../lib/website';
import { Button, cx, inputClass, useToast } from './ui';

// Admin → Website: every heading, text and photo of the public site (pramukhgas.in), section by
// section. Saved as the "website" setting; the site shows it as soon as it is saved.

type SectionKey = keyof WebsiteContent;

const SECTIONS: { key: SectionKey; title: string; about: string; canHide: boolean }[] = [
  { key: 'hero', title: 'Top of the page', about: 'Big heading, the line under it and the photo next to the inquiry form.', canHide: false },
  { key: 'products', title: 'Products', about: 'Banner and product cards (photo, name, label, text).', canHide: true },
  { key: 'cylinders', title: 'Cylinders we supply', about: 'Heading and text. The cylinder list itself comes from Masters → Products.', canHide: true },
  { key: 'ordering', title: 'How an order reaches you', about: 'The steps shown on the delivery road.', canHide: true },
  { key: 'audience', title: 'Who we deliver to', about: 'Customer types (Hotels, Restaurants…) and the moving strip under the top section.', canHide: true },
  { key: 'safety', title: 'Using LPG safely', about: 'Safety tips. The 1906 helpline box always stays.', canHide: true },
  { key: 'inquiry', title: 'Send an inquiry', about: 'Text next to the inquiry form.', canHide: true },
  { key: 'contact', title: 'Talk to us', about: 'Heading and text. Phone, email and address come from Settings → Company.', canHide: true },
  { key: 'footer', title: 'Footer (bottom of the page)', about: 'About text, working hours and the 1906 box. Phone, email and address come from Settings → Company.', canHide: false },
];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Phone photos are large: shrink to at most 1600 px wide as JPEG before uploading. */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / bitmap.width);
  if (scale === 1 && file.size < 600_000) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.85));
}

// ───────────────────────────── small form pieces ─────────────────────────────

function TextField({ label, value, onChange, max, hint, rows }: { label: string; value: string; onChange: (v: string) => void; max: number; hint?: string; rows?: number }) {
  const near = value.length > max * 0.9;
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between gap-2 text-xs font-bold text-slate-700">
        {label}
        <span className={cx('font-medium tabular-nums', near ? 'text-amber-600' : 'text-slate-400')}>
          {value.length}/{max}
        </span>
      </span>
      {rows ? (
        <textarea rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ) : (
        <input maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

const LEAD_HINT = 'Tip: {company} shows your company name and {sizes} the cylinder sizes.';

function ImageField({ label, value, original, onChange, onError }: { label: string; value: string; original: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(await shrinkImage(file)));
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="space-y-1">
      <span className="block text-xs font-bold text-slate-700">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">No photo</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <Button size="sm" tone="secondary" busy={busy} onClick={() => input.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5" /> {value ? 'Change photo' : 'Add photo'}
          </Button>
          {original && value !== original && (
            <button type="button" onClick={() => onChange(original)} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800">
              <RotateCcw className="h-3 w-3" /> Use the original photo
            </button>
          )}
          {value && (
            <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700">
              <Trash2 className="h-3 w-3" /> Remove photo
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

/** A list with move up / down, remove and add. */
function ListEditor<T>({ items, onChange, render, blank, addLabel, max, itemLabel }: { items: T[]; onChange: (v: T[]) => void; render: (item: T, set: (v: T) => void, i: number) => React.ReactNode; blank: T; addLabel: string; max: number; itemLabel: (item: T, i: number) => string }) {
  const move = (i: number, by: number) => {
    const next = [...items];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-700">
              {i + 1}. {itemLabel(item, i)}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30" title="Move up" aria-label="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30" title="Move down" aria-label="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700" title="Remove" aria-label="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-3">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
        </div>
      ))}
      {items.length < max && (
        <Button size="sm" tone="secondary" onClick={() => onChange([...items, clone(blank)])}>
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

function StepsEditor({ steps, onChange, max, addLabel, titleLabel, textLabel }: { steps: WebsiteStep[]; onChange: (v: WebsiteStep[]) => void; max: number; addLabel: string; titleLabel: string; textLabel: string }) {
  return (
    <ListEditor
      items={steps}
      onChange={onChange}
      max={max}
      addLabel={addLabel}
      blank={{ title: '', text: '' }}
      itemLabel={(s) => s.title || 'New'}
      render={(s, set) => (
        <>
          <TextField label={titleLabel} value={s.title} max={80} onChange={(title) => set({ ...s, title })} />
          <TextField label={textLabel} value={s.text} max={400} rows={2} onChange={(text) => set({ ...s, text })} />
        </>
      )}
    />
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-2 text-xs font-bold text-slate-700">
      <span className={cx('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-emerald-500' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </span>
      {label}
    </button>
  );
}

// ───────────────────────────── the editor ─────────────────────────────

export function WebsiteEditor() {
  const [saved, setSaved] = useState<WebsiteContent | null>(null);
  const [draft, setDraft] = useState<WebsiteContent | null>(null);
  const [open, setOpen] = useState<SectionKey | null>('hero');
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    api<WebsiteContent>('/api/settings/website')
      .then((w) => {
        setSaved(w);
        setDraft(clone(w));
      })
      .catch((e) => showToast(errorMessage(e), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!draft || !saved) return <div className="p-6 text-sm text-slate-500">{toast}Loading website content…</div>;

  const set = <K extends SectionKey>(key: K, patch: Partial<WebsiteContent[K]>) => setDraft({ ...draft, [key]: { ...draft[key], ...patch } });
  const onError = (m: string) => showToast(m, 'error');

  const save = async () => {
    setBusy(true);
    try {
      const w = await api<WebsiteContent>('/api/settings/website', { method: 'PUT', body: draft });
      setSaved(w);
      setDraft(clone(w));
      showToast('Saved. The website shows the changes now.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const fields = (key: SectionKey): React.ReactNode => {
    const d = DEFAULT_WEBSITE;
    switch (key) {
      case 'hero': {
        const h = draft.hero;
        return (
          <>
            <TextField label="Main heading" value={h.headline} max={90} onChange={(headline) => set('hero', { headline })} hint="The biggest line on the page. Keep it short." />
            <TextField label="Line under the heading" value={h.lead} max={400} rows={3} onChange={(lead) => set('hero', { lead })} hint={LEAD_HINT} />
            <ImageField label="Photo (next to the inquiry form)" value={h.image} original={d.hero.image} onChange={(image) => set('hero', { image })} onError={onError} />
            <TextField label="Photo description (for Google and screen readers)" value={h.imageAlt} max={200} onChange={(imageAlt) => set('hero', { imageAlt })} />
            <Switch checked={h.emergencyNote} onChange={(emergencyNote) => set('hero', { emergencyNote })} label="Show the “Gas leak? Call 1906” line" />
          </>
        );
      }
      case 'products': {
        const p = draft.products;
        return (
          <>
            <TextField label="Heading" value={p.title} max={80} onChange={(title) => set('products', { title })} />
            <TextField label="Text under the heading" value={p.lead} max={400} rows={2} onChange={(lead) => set('products', { lead })} hint={LEAD_HINT} />
            <ImageField label="Wide banner photo" value={p.banner} original={d.products.banner} onChange={(banner) => set('products', { banner })} onError={onError} />
            <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-500">Product cards</div>
            <ListEditor
              items={p.items}
              onChange={(items) => set('products', { items })}
              max={12}
              addLabel="Add product card"
              blank={{ name: '', tag: '', image: '', text: '' }}
              itemLabel={(x) => x.name || 'New product'}
              render={(x, setX) => (
                <>
                  <ImageField label="Photo" value={x.image} original="" onChange={(image) => setX({ ...x, image })} onError={onError} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Name" value={x.name} max={60} onChange={(name) => setX({ ...x, name })} />
                    <TextField label="Small label above the name" value={x.tag} max={40} onChange={(tag) => setX({ ...x, tag })} />
                  </div>
                  <TextField label="Text" value={x.text} max={400} rows={3} onChange={(text) => setX({ ...x, text })} />
                </>
              )}
            />
          </>
        );
      }
      case 'cylinders':
      case 'contact': {
        const s = draft[key];
        return (
          <>
            <TextField label="Heading" value={s.title} max={80} onChange={(title) => set(key, { title })} />
            <TextField label="Text under the heading" value={s.lead} max={400} rows={3} onChange={(lead) => set(key, { lead })} hint={LEAD_HINT} />
          </>
        );
      }
      case 'ordering': {
        const s = draft.ordering;
        return (
          <>
            <TextField label="Heading" value={s.title} max={80} onChange={(title) => set('ordering', { title })} />
            <TextField label="Text under the heading" value={s.lead} max={400} rows={2} onChange={(lead) => set('ordering', { lead })} hint={LEAD_HINT} />
            <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-500">Steps</div>
            <StepsEditor steps={s.steps} onChange={(steps) => set('ordering', { steps })} max={6} addLabel="Add step" titleLabel="Step name" textLabel="Step text" />
          </>
        );
      }
      case 'audience': {
        const s = draft.audience;
        return (
          <>
            <TextField label="Heading" value={s.title} max={80} onChange={(title) => set('audience', { title })} />
            <TextField label="Text under the heading" value={s.lead} max={400} rows={2} onChange={(lead) => set('audience', { lead })} hint={LEAD_HINT} />
            <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-500">Customer types</div>
            <TagsEditor items={s.items} onChange={(items) => set('audience', { items })} />
            <Switch checked={s.ticker} onChange={(ticker) => set('audience', { ticker })} label="Also show them as the moving strip under the top section" />
          </>
        );
      }
      case 'safety': {
        const s = draft.safety;
        return (
          <>
            <TextField label="Heading" value={s.title} max={80} onChange={(title) => set('safety', { title })} />
            <TextField label="Text under the heading" value={s.lead} max={400} rows={2} onChange={(lead) => set('safety', { lead })} hint={LEAD_HINT} />
            <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-500">Safety tips</div>
            <StepsEditor steps={s.tips} onChange={(tips) => set('safety', { tips })} max={8} addLabel="Add tip" titleLabel="Bold start" textLabel="Rest of the tip" />
          </>
        );
      }
      case 'footer': {
        const s = draft.footer;
        return (
          <>
            <TextField label="About your business (under the company name)" value={s.about} max={400} rows={3} onChange={(about) => set('footer', { about })} hint={LEAD_HINT} />
            <label className="block space-y-1">
              <span className="block text-xs font-bold text-slate-700">Working hours (one line each, up to 6)</span>
              <textarea
                rows={4}
                value={s.hours.join('\n')}
                onChange={(e) => set('footer', { hours: e.target.value.split('\n').slice(0, 6).map((l) => l.slice(0, 60)) })}
                placeholder={'Monday – Saturday: 8:00 am – 8:00 pm\nSunday: 9:00 am – 1:00 pm'}
                className={inputClass}
              />
              <span className="block text-[11px] text-slate-500">Leave empty to hide the working hours.</span>
            </label>
            <Switch checked={s.emergency} onChange={(emergency) => set('footer', { emergency })} label="Show the red “Gas leak? 1906” box" />
          </>
        );
      }
      case 'inquiry': {
        const s = draft.inquiry;
        return (
          <>
            <TextField label="Heading" value={s.title} max={80} onChange={(title) => set('inquiry', { title })} />
            <TextField label="Text under the heading" value={s.lead} max={400} rows={2} onChange={(lead) => set('inquiry', { lead })} hint={LEAD_HINT} />
            <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-500">Numbered points</div>
            <StepsEditor steps={s.steps} onChange={(steps) => set('inquiry', { steps })} max={5} addLabel="Add point" titleLabel="Bold start" textLabel="Rest of the point" />
          </>
        );
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28">
      {toast}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Website</h2>
          <p className="text-sm text-slate-600">Change the text and photos on your website. Open a section, edit it, then press Save.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <ExternalLink className="h-3.5 w-3.5" /> Open website
        </a>
      </div>

      {SECTIONS.map((s) => {
        const isOpen = open === s.key;
        const section = draft[s.key] as { show?: boolean };
        const shown = !s.canHide || section.show !== false;
        const changed = JSON.stringify(draft[s.key]) !== JSON.stringify(saved[s.key]);
        return (
          <section key={s.key} className={cx('rounded-2xl border bg-white shadow-sm', isOpen ? 'border-emerald-300' : 'border-slate-200')}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : s.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={isOpen}>
                <ChevronDown className={cx('h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-black text-slate-900">
                    {s.title}
                    {changed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Not saved</span>}
                    {!shown && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Hidden</span>}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{s.about}</span>
                </span>
              </button>
              {s.canHide && <Switch checked={shown} onChange={(show) => set(s.key, { show } as Partial<WebsiteContent[typeof s.key]>)} label="Show" />}
            </div>
            {isOpen && (
              <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                {fields(s.key)}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Put back the original text and photos of “${s.title}”?`)) setDraft({ ...draft, [s.key]: clone(DEFAULT_WEBSITE[s.key]) });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset this section to the original
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* Save bar: appears once something changed. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-3 md:bottom-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl">
            <span className="text-sm font-bold">You have unsaved changes</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDraft(clone(saved))} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white">
                Discard
              </button>
              <Button busy={busy} onClick={save}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Short words as chips: type and press Enter to add, × to remove. */
function TagsEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim().slice(0, 30);
    if (t && !items.includes(t) && items.length < 20) onChange([...items, t]);
    setText('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-1 pl-3 pr-1 text-xs font-bold text-emerald-800">
            {t}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== t))} className="rounded-full px-1.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900" aria-label={`Remove ${t}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          maxLength={30}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Banquet halls"
          className={inputClass}
        />
        <Button size="sm" tone="secondary" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
