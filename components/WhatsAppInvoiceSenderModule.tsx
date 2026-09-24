'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Send } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Badge, Button, Card, Field, inputClass, Modal, cx, dateTime, useToast } from './ui';

// WhatsApp centre (SRS §13): channel status, notification templates, a bot
// simulator for testing the ordering flow, and the message log.

interface Template { key: string; name: string; trigger: string; body: string; variables: string[]; metaTemplateName: string | null; language: string; active: boolean; customised: boolean }
interface LogRow { id: string; channel: string; direction: string; recipient: string; subject: string | null; body: string; templateKey: string | null; status: string; error: string | null; createdAt: string }

type Tab = 'templates' | 'simulator' | 'log';

export default function WhatsAppCenter() {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [channels, setChannels] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Template | null>(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      const data = await api<{ templates: Template[]; channels: Record<string, boolean> }>('/api/settings/templates');
      setTemplates(data.templates);
      setChannels(data.channels);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    try {
      await api('/api/settings/templates', { method: 'PUT', body: editing });
      showToast('Template saved.');
      setEditing(null);
      await load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> WhatsApp & Notifications</h2>
        <div className="flex gap-2">
          {Object.entries(channels).map(([name, on]) => (
            <Badge key={name} tone={on ? 'green' : 'amber'}>{name}: {on ? 'connected' : 'not configured'}</Badge>
          ))}
        </div>
      </div>
      {!channels.whatsapp && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold">
          WhatsApp Cloud API is not configured yet (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN). Messages are logged as SIMULATED until then.
        </div>
      )}
      <div className="flex gap-2">
        {([['templates', 'Templates'], ['simulator', 'Bot simulator'], ['log', 'Message log']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="grid lg:grid-cols-2 gap-3">
          {templates.map((t) => (
            <Card key={t.key} title={<span className="flex items-center gap-2">{t.name} {!t.active && <Badge tone="slate">Off</Badge>} {t.metaTemplateName && <Badge tone="green">Meta: {t.metaTemplateName}</Badge>}</span>} actions={<Button size="sm" tone="ghost" onClick={() => setEditing(t)}>Edit</Button>}>
              <div className="text-[10px] font-bold text-slate-400 uppercase">{t.trigger}</div>
              <pre className="mt-1 text-xs whitespace-pre-wrap font-sans text-slate-700">{t.body}</pre>
            </Card>
          ))}
        </div>
      )}
      {tab === 'simulator' && <Simulator />}
      {tab === 'log' && <MessageLog />}

      <Modal open={!!editing} title={`Template: ${editing?.name}`} onClose={() => setEditing(null)} footer={<Button onClick={save}>Save</Button>} wide>
        {editing && (
          <>
            <Field label="Message" hint={`Placeholders: ${editing.variables.map((v) => `{{${v}}}`).join(' ')}`}>
              <textarea rows={6} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Meta template name" hint="Pre-approved template for messages outside the 24h window. Parameters are sent in the placeholder order above.">
                <input value={editing.metaTemplateName || ''} onChange={(e) => setEditing({ ...editing, metaTemplateName: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Language code"><input value={editing.language} onChange={(e) => setEditing({ ...editing, language: e.target.value })} className={inputClass} /></Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Send this notification</label>
          </>
        )}
      </Modal>
    </div>
  );
}

function Simulator() {
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('Hi');
  const [chat, setChat] = useState<{ from: 'me' | 'bot'; body: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async (message = text) => {
    if (!phone || !message) return;
    setBusy(true);
    setError('');
    setChat((c) => [...c, { from: 'me', body: message }]);
    try {
      const replies = await api<{ body: string }[]>('/api/whatsapp/simulate', { body: { phone, text: message } });
      setChat((c) => [...c, ...replies.map((r) => ({ from: 'bot' as const, body: r.body }))]);
      setText('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Chat with the bot as a registered customer">
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        <Field label="Customer mobile"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit registered number" className={inputClass} /></Field>
        <p className="sm:col-span-2 text-[11px] text-slate-500 self-end">Real orders are created. Buttons appear as text in brackets — type the button id shown (e.g. M1, P:BOTH, D:TODAY, C:YES) or the option number.</p>
      </div>
      <div className="h-80 overflow-y-auto rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 space-y-2">
        {chat.map((m, i) => (
          <div key={i} className={cx('max-w-[80%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap', m.from === 'me' ? 'ml-auto bg-emerald-600 text-white' : 'bg-white border border-slate-200')}>
            {m.body}
          </div>
        ))}
      </div>
      {error && <div className="mt-2 text-xs text-rose-600 font-bold">{error}</div>}
      <div className="flex gap-2 mt-3">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} className={inputClass} placeholder="Type a message" />
        <Button busy={busy} onClick={() => send()}><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function MessageLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const load = useCallback(() => api<LogRow[]>('/api/whatsapp/simulate').then(setRows).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Card title="Latest 200 messages" actions={<Button size="sm" tone="ghost" onClick={() => void load()}><RefreshCw className="h-3.5 w-3.5" /></Button>}>
      <table className="w-full text-xs">
        <thead className="text-slate-500 text-left">
          <tr>
            <th className="p-2">When</th>
            <th className="p-2">Channel</th>
            <th className="p-2">To / from</th>
            <th className="p-2">Message</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100 align-top">
              <td className="p-2 whitespace-nowrap">{dateTime(r.createdAt)}</td>
              <td className="p-2">{r.channel} {r.direction === 'IN' ? '⬅' : '➡'}</td>
              <td className="p-2 font-mono">{r.recipient}</td>
              <td className="p-2 whitespace-pre-wrap max-w-md">{r.subject && <strong>{r.subject}: </strong>}{r.body}</td>
              <td className="p-2"><Badge tone={r.status === 'FAILED' ? 'red' : r.status === 'SENT' || r.status === 'RECEIVED' ? 'green' : 'amber'}>{r.status}</Badge>{r.error && <div className="text-[10px] text-rose-600">{r.error}</div>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
