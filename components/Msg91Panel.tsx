'use client';

import React, { useState } from 'react';
import { Copy, Link2, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { api, apiWithMessage, errorMessage } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Button, Card, Field, inputClass, Modal, cx } from './ui';

// MSG91 (docs.msg91.com): account settings, and each message's WhatsApp / SMS template
// on MSG91 — made from here, linked if made in the MSG91 panel, status, test send.

interface Link { smsTemplateId?: string; smsDltId?: string; smsStatus?: string; waTemplateName?: string; waLanguage?: string; waStatus?: string; waParams?: string[] }
interface Row { key: string; name: string; hasCard: boolean; button: string | null; link: Link; waText: string; waParams: string[]; smsText: string; dltText: string }
interface Settings { hasKey: boolean; source: 'settings' | 'env' | 'none'; senderId: string; smsEnabled: boolean; smsKeys: string[]; whatsappEnabled: boolean; whatsappNumber: string; smsReady: boolean; whatsappReady: boolean; appUrl: string; webhookUrl: string }
interface Data { settings: Settings; templates: Row[] }

const statusTone = (s?: string): 'slate' | 'green' | 'red' | 'amber' => (!s ? 'slate' : /approved|active/i.test(s) ? 'green' : /reject|not found|fail/i.test(s) ? 'red' : 'amber');

export default function Msg91Panel({ toast }: { toast: (m: string, tone?: 'ok' | 'error') => void }) {
  const q = useApiData<Data>('/api/settings/msg91', (m) => toast(m, 'error'));
  const d = q.data;
  const [busy, setBusy] = useState<string | null>(null);
  const [dltFor, setDltFor] = useState<Row | null>(null);
  const [linkFor, setLinkFor] = useState<Row | null>(null);
  const [testFor, setTestFor] = useState<Row | null>(null);

  const run = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      const res = await apiWithMessage('/api/settings/msg91', body);
      toast(res.message || 'Done.');
      q.reload();
      return true;
    } catch (e) {
      toast(errorMessage(e), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (!d) return <div className="text-xs text-slate-500">Loading…</div>;
  const httpsApp = /^https:\/\//.test(d.settings.appUrl);

  return (
    <div className="space-y-4">
      <SettingsForm s={d.settings} onSaved={() => q.reload()} toast={toast} />

      {!httpsApp && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold">
          APP_URL is {d.settings.appUrl ? `"${d.settings.appUrl}"` : 'not set'}. WhatsApp can show the card image and the link buttons only when APP_URL is your public https:// address.
        </div>
      )}

      <Card
        title="Webhook (incoming messages and read receipts)"
        actions={
          <Button size="sm" tone="ghost" busy={busy === 'token'} onClick={() => window.confirm('Make a new webhook URL? The old one stops working.') && run('token', { action: 'newWebhookToken' })}>
            <RefreshCw className="h-3.5 w-3.5" /> New URL
          </Button>
        }
      >
        <p className="text-xs text-slate-500 mb-2">
          MSG91 panel → WhatsApp → Webhook (New) → Create: events <strong>On Inbound Request Received</strong> and the delivery report events, Content-Type <strong>JSON</strong>, and this URL. Customers&apos; messages then show in WhatsApp → Chats.
        </p>
        <CopyBox label="Webhook URL" value={d.settings.webhookUrl} onCopied={() => toast('Copied.')} />
      </Card>

      <Card
        title="Templates on MSG91"
        actions={
          <Button size="sm" tone="secondary" busy={busy === 'refresh'} onClick={() => run('refresh', { action: 'refresh' })}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh status
          </Button>
        }
      >
        <p className="text-xs text-slate-500 mb-3">
          <strong>WhatsApp:</strong> &quot;Create&quot; sends the template (card image, text and button) to Meta through MSG91; it can be used once it shows Approved. <strong>SMS:</strong> first register the DLT text on your DLT portal, then &quot;Create SMS&quot; with its DLT template ID. Made them in the MSG91 panel already? Use &quot;Link&quot;.
        </p>
        <div className="divide-y divide-slate-100">
          {d.templates.map((t) => {
            const smsOn = d.settings.smsKeys.includes(t.key);
            return (
              <div key={t.key} className="py-3 grid gap-2 md:grid-cols-[1fr_auto] items-start">
                <div className="min-w-0 space-y-1.5">
                  <div className="text-sm font-black text-slate-900">{t.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-500 w-20">WhatsApp</span>
                    {t.link.waTemplateName ? (
                      <>
                        <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{t.link.waTemplateName}</code>
                        <Badge tone={statusTone(t.link.waStatus)}>{t.link.waStatus || 'unknown'}</Badge>
                      </>
                    ) : (
                      <Badge tone="slate">not made yet</Badge>
                    )}
                    {t.hasCard && <Badge tone="slate">card image</Badge>}
                    {t.button && <Badge tone="slate">button: {t.button}</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-500 w-20">SMS</span>
                    {t.link.smsTemplateId ? (
                      <>
                        <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{t.link.smsTemplateId}</code>
                        <Badge tone={statusTone(t.link.smsStatus)}>{t.link.smsStatus || 'unknown'}</Badge>
                      </>
                    ) : (
                      <Badge tone="slate">not made yet</Badge>
                    )}
                    <label className="flex items-center gap-1 font-semibold text-slate-600 ml-1">
                      <input
                        type="checkbox"
                        checked={smsOn}
                        onChange={async (e) => {
                          const smsKeys = e.target.checked ? [...d.settings.smsKeys, t.key] : d.settings.smsKeys.filter((k) => k !== t.key);
                          try {
                            await api('/api/settings/msg91', { method: 'PUT', body: { ...d.settings, smsKeys } });
                            q.reload();
                          } catch (err) {
                            toast(errorMessage(err), 'error');
                          }
                        }}
                      />
                      also send by SMS
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {t.key !== 'OTP' && (
                    <Button size="sm" busy={busy === `wa:${t.key}`} onClick={() => run(`wa:${t.key}`, { action: 'createWhatsApp', key: t.key })}>
                      <Plus className="h-3.5 w-3.5" /> {t.link.waTemplateName ? 'Create again' : 'Create WhatsApp'}
                    </Button>
                  )}
                  {t.link.waTemplateName && (
                    <Button size="sm" tone="ghost" busy={busy === `del:${t.key}`} onClick={() => window.confirm(`Delete ${t.link.waTemplateName} on MSG91?`) && run(`del:${t.key}`, { action: 'deleteWhatsApp', key: t.key })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" tone="secondary" onClick={() => setDltFor(t)}>
                    <Plus className="h-3.5 w-3.5" /> {t.link.smsTemplateId ? 'SMS again' : 'Create SMS'}
                  </Button>
                  <Button size="sm" tone="ghost" onClick={() => setLinkFor(t)}>
                    <Link2 className="h-3.5 w-3.5" /> Link
                  </Button>
                  <Button size="sm" tone="ghost" onClick={() => setTestFor(t)}>
                    <Send className="h-3.5 w-3.5" /> Test
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {dltFor && <SmsModal row={dltFor} busy={busy === 'sms'} onClose={() => setDltFor(null)} onCreate={async (dltId) => (await run('sms', { action: 'createSms', key: dltFor.key, dltId })) && setDltFor(null)} toast={toast} />}
      {linkFor && <LinkModal row={linkFor} busy={busy === 'link'} onClose={() => setLinkFor(null)} onSave={async (body) => (await run('link', { action: 'link', key: linkFor.key, ...body })) && setLinkFor(null)} />}
      {testFor && <TestModal row={testFor} busy={busy === 'test'} onClose={() => setTestFor(null)} onSend={async (phone, channel) => (await run('test', { action: 'test', key: testFor.key, phone, channel })) && setTestFor(null)} />}
    </div>
  );
}

function SettingsForm({ s, onSaved, toast }: { s: Settings; onSaved: () => void; toast: (m: string, tone?: 'ok' | 'error') => void }) {
  const [x, setX] = useState({ authKey: '', senderId: s.senderId, smsEnabled: s.smsEnabled, whatsappEnabled: s.whatsappEnabled, whatsappNumber: s.whatsappNumber });
  const [busy, setBusy] = useState(false);
  const [numbers, setNumbers] = useState<string[] | null>(null);
  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await api('/api/settings/msg91', { method: 'PUT', body: { ...x, smsKeys: s.smsKeys, ...extra } });
      toast('MSG91 settings saved.');
      setX({ ...x, authKey: '' });
      onSaved();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const fetchNumbers = async () => {
    try {
      const r = await api<{ numbers: string[] }>('/api/settings/msg91', { body: { action: 'numbers' } });
      setNumbers(r.numbers);
      if (r.numbers.length === 1) setX({ ...x, whatsappNumber: r.numbers[0] });
      if (!r.numbers.length) toast('No WhatsApp number found on this MSG91 account.', 'error');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          MSG91 account <Badge tone={s.smsReady ? 'green' : 'amber'}>SMS {s.smsReady ? 'on' : 'off'}</Badge> <Badge tone={s.whatsappReady ? 'green' : 'amber'}>WhatsApp {s.whatsappReady ? 'on' : 'off'}</Badge>
        </span>
      }
      actions={<Button busy={busy} onClick={() => save()}>Save</Button>}
    >
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Auth key" hint={s.source === 'env' ? 'Now taken from .env (MSG91_AUTH_KEY). Save one here to use it instead.' : s.hasKey ? 'Saved (hidden). Type a new one only to change it.' : 'MSG91 panel → Authkey.'}>
          <div className="flex gap-2">
            <input type="password" autoComplete="off" value={x.authKey} onChange={(e) => setX({ ...x, authKey: e.target.value })} className={inputClass} placeholder={s.hasKey ? '•••••••• saved' : 'Paste auth key'} />
            {s.source === 'settings' && (
              <Button tone="ghost" onClick={() => window.confirm('Remove the saved MSG91 auth key?') && save({ clearKey: true })}>
                Remove
              </Button>
            )}
          </div>
        </Field>
        <Field label="SMS sender ID" hint="Your 6-letter DLT header, e.g. NEHRAG.">
          <input value={x.senderId} maxLength={6} onChange={(e) => setX({ ...x, senderId: e.target.value.toUpperCase() })} className={inputClass} />
        </Field>
        <Field label="WhatsApp number on MSG91" hint="With country code, e.g. 919876543210.">
          <div className="flex gap-2">
            {numbers && numbers.length > 1 ? (
              <select value={x.whatsappNumber} onChange={(e) => setX({ ...x, whatsappNumber: e.target.value })} className={inputClass}>
                <option value="">Choose…</option>
                {numbers.map((n) => <option key={n}>{n}</option>)}
              </select>
            ) : (
              <input value={x.whatsappNumber} onChange={(e) => setX({ ...x, whatsappNumber: e.target.value })} className={inputClass} />
            )}
            <Button tone="secondary" disabled={!s.hasKey} onClick={fetchNumbers}>Fetch</Button>
          </div>
        </Field>
        <div className="space-y-2 pt-5">
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={x.smsEnabled} onChange={(e) => setX({ ...x, smsEnabled: e.target.checked })} /> Send SMS through MSG91</label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={x.whatsappEnabled} onChange={(e) => setX({ ...x, whatsappEnabled: e.target.checked })} /> Send WhatsApp through MSG91 (instead of Meta Cloud API)</label>
        </div>
      </div>
    </Card>
  );
}

function CopyBox({ label, value, onCopied }: { label: string; value: string; onCopied?: () => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2 items-start">
        <pre className={cx(inputClass, 'whitespace-pre-wrap font-mono text-[11px] min-h-[3rem]')}>{value}</pre>
        <Button
          tone="ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            onCopied?.();
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Field>
  );
}

function SmsModal({ row, busy, onClose, onCreate, toast }: { row: Row; busy: boolean; onClose: () => void; onCreate: (dltId: string) => void; toast: (m: string) => void }) {
  const [dltId, setDltId] = useState(row.link.smsDltId || '');
  return (
    <Modal open wide title={`SMS template: ${row.name}`} onClose={onClose} footer={<Button busy={busy} disabled={!/^\d{10,25}$/.test(dltId.replace(/\D/g, ''))} onClick={() => onCreate(dltId)}>Create on MSG91</Button>}>
      <ol className="text-xs text-slate-600 list-decimal pl-4 space-y-1">
        <li>Register this exact text as a Service-Implicit template on your DLT portal (Jio / Vodafone / Airtel…).</li>
        <li>When DLT approves it, paste its DLT template ID below and create it on MSG91.</li>
      </ol>
      <CopyBox label="Text for the DLT portal" value={row.dltText} onCopied={() => toast('Copied.')} />
      <CopyBox label="Same text on MSG91 (variables by name)" value={row.smsText} />
      <Field label="DLT template ID">
        <input value={dltId} onChange={(e) => setDltId(e.target.value)} className={inputClass} placeholder="e.g. 1107170000000000000" />
      </Field>
    </Modal>
  );
}

function LinkModal({ row, busy, onClose, onSave }: { row: Row; busy: boolean; onClose: () => void; onSave: (body: Record<string, unknown>) => void }) {
  const [x, setX] = useState({
    waTemplateName: row.link.waTemplateName || '',
    waLanguage: row.link.waLanguage || 'en',
    waParams: (row.link.waParams ?? row.waParams).join(', '),
    smsTemplateId: row.link.smsTemplateId || '',
    smsDltId: row.link.smsDltId || '',
  });
  return (
    <Modal open wide title={`Link MSG91 templates: ${row.name}`} onClose={onClose} footer={<Button busy={busy} onClick={() => onSave({ ...x, waParams: x.waParams.split(',').map((p) => p.trim()).filter(Boolean) })}>Save</Button>}>
      <p className="text-xs text-slate-600">For templates you made yourself in the MSG91 panel. Leave a box empty to unlink.</p>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="WhatsApp template name"><input value={x.waTemplateName} onChange={(e) => setX({ ...x, waTemplateName: e.target.value })} className={inputClass} /></Field>
        <Field label="Language"><input value={x.waLanguage} onChange={(e) => setX({ ...x, waLanguage: e.target.value })} className={inputClass} /></Field>
        <Field label="Variables {{1}}, {{2}}… are" hint={`Our names, comma separated. Available: ${row.waParams.join(', ') || '—'}`}>
          <input value={x.waParams} onChange={(e) => setX({ ...x, waParams: e.target.value })} className={inputClass} />
        </Field>
        <Field label="SMS template ID (MSG91)"><input value={x.smsTemplateId} onChange={(e) => setX({ ...x, smsTemplateId: e.target.value })} className={inputClass} /></Field>
        <Field label="DLT template ID"><input value={x.smsDltId} onChange={(e) => setX({ ...x, smsDltId: e.target.value })} className={inputClass} /></Field>
      </div>
      <CopyBox label="WhatsApp body to use in the MSG91 panel" value={row.waText} />
    </Modal>
  );
}

function TestModal({ row, busy, onClose, onSend }: { row: Row; busy: boolean; onClose: () => void; onSend: (phone: string, channel: 'whatsapp' | 'sms') => void }) {
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  return (
    <Modal open title={`Test: ${row.name}`} onClose={onClose} footer={<Button busy={busy} disabled={phone.replace(/\D/g, '').length < 10} onClick={() => onSend(phone, channel)}><Send className="h-4 w-4" /> Send test</Button>}>
      <p className="text-xs text-slate-600">Sends this message with example values to one number. The result shows in the Message log.</p>
      <Field label="Mobile number"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputClass} placeholder="98765 43210" /></Field>
      <div className="flex gap-2">
        {(['whatsapp', 'sms'] as const).map((c) => (
          <button key={c} type="button" onClick={() => setChannel(c)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', channel === c ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {c === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </button>
        ))}
      </div>
    </Modal>
  );
}
