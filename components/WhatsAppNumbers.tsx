'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Loader2, LogOut, QrCode, Send, Smartphone } from 'lucide-react';
import { apiWithMessage, errorMessage } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Button, Card, Empty, inputClass, Modal, cx, useToast } from './ui';

// WhatsApp → Numbers: each staff member the admin allows links ONE WhatsApp number by QR
// (built-in WhatsApp Web gateway). The company number sends the automatic messages and runs the bot.

interface SessionView { id: string; status: string; qr: string; number: string | null; name: string | null; isCompany: boolean; connectedAt: string | null; lastError: string | null }
interface Person { userId: string; name: string; allowed: boolean; session: SessionView | null; mobile?: string | null }
interface StaffRow extends Person { role: string }
interface NumbersData { isAdmin: boolean; me: Person; staff: StaffRow[] }

type Toast = (m: string, tone?: 'ok' | 'error') => void;

const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'slate' | 'blue' }> = {
  CONNECTED: { label: 'Connected', tone: 'green' },
  QR: { label: 'Waiting for QR scan', tone: 'blue' },
  CONNECTING: { label: 'Connecting…', tone: 'amber' },
  RECONNECTING: { label: 'Reconnecting…', tone: 'amber' },
  QR_EXPIRED: { label: 'QR expired', tone: 'slate' },
  LOGGED_OUT: { label: 'Logged out', tone: 'red' },
  STOPPED: { label: 'Stopped', tone: 'slate' },
  NEW: { label: 'Not linked', tone: 'slate' },
};
const statusOf = (s: SessionView | null) => STATUS[s?.status || 'NEW'] || STATUS.NEW;
const busyStatus = (s: SessionView | null) => !!s && ['QR', 'CONNECTING', 'RECONNECTING'].includes(s.status);
const showPhone = (p: string | null) => (!p ? '' : p.length === 12 && p.startsWith('91') ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);
const ROLE: Record<string, string> = { SUPER_ADMIN: 'Super Admin', MANAGER: 'Manager', ACCOUNTANT: 'Accountant' };

/** Poll while the screen is visible; faster while a QR is being scanned. */
function usePoll(reload: () => unknown, ms: number) {
  const ref = useRef(reload);
  useEffect(() => {
    ref.current = reload;
  });
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

async function act(body: Record<string, unknown>, toast: Toast, done: () => void) {
  try {
    const r = await apiWithMessage('/api/whatsapp/numbers', body);
    if (r.message) toast(r.message);
    return true;
  } catch (e) {
    toast(errorMessage(e), 'error');
    return false;
  } finally {
    done();
  }
}

/** Link without the camera: WhatsApp shows "Link with phone number instead" under the QR scanner. */
function PairByCode({ userId, defaultPhone, toast }: { userId: string; defaultPhone: string; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const getCode = async () => {
    setBusy(true);
    try {
      const r = await apiWithMessage<{ code: string }>('/api/whatsapp/numbers', { action: 'pairCode', userId, phone });
      setCode(r.data.code);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-emerald-700 hover:underline">
        QR not scanning? Link with phone number instead →
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-sm font-bold text-slate-800">Link with phone number</p>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (phone.trim()) getCode();
        }}
      >
        <label htmlFor={`pair-${userId}`} className="sr-only">
          WhatsApp number of this phone
        </label>
        <input id={`pair-${userId}`} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp number of the phone" className={cx(inputClass, 'max-w-60')} />
        <Button type="submit" busy={busy} disabled={!phone.trim()}>
          Get code
        </Button>
      </form>
      {code && (
        <div className="space-y-2">
          <p className="font-mono text-3xl font-black tracking-[0.2em] text-slate-900" aria-live="polite">
            {code}
          </p>
          <ol className="text-sm text-slate-700 space-y-1 list-decimal pl-5">
            <li>
              On the phone: <b>Linked devices → Link a device</b>.
            </li>
            <li>
              Tap <b>Link with phone number instead</b> (under the scanner).
            </li>
            <li>Type this code within a minute.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

/** Status, QR and actions of one person's number (my own card and the admin's QR window). */
function SessionPanel({ person, toast, reload, self }: { person: Person; toast: Toast; reload: () => void; self: boolean }) {
  const s = person.session;
  const [busy, setBusy] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    await act({ action, userId: person.userId, ...extra }, toast, () => {
      setBusy(null);
      reload();
    });
  };

  if (!person.allowed) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {self ? 'The admin has not allowed WhatsApp for you yet. Ask the admin to turn it on in WhatsApp → Numbers.' : `${person.name} is not allowed to use WhatsApp.`}
      </div>
    );
  }

  const st = statusOf(s);
  const linked = s?.status === 'CONNECTED';
  const needsLink = !s || ['NEW', 'LOGGED_OUT', 'STOPPED', 'QR_EXPIRED'].includes(s.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        {s?.isCompany && (
          <Badge tone="violet">
            <Building2 className="h-3 w-3 mr-1" /> Company number
          </Badge>
        )}
        {s?.number && <span className="text-sm font-bold text-slate-800">{showPhone(s.number)}</span>}
        {s?.name && <span className="text-xs text-slate-500">({s.name})</span>}
      </div>

      {s?.status === 'QR' && s.qr && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* SVG: stays sharp at this size so the phone camera can read it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.qr} alt="WhatsApp QR code" width={288} height={288} className="h-72 w-72 rounded-xl border border-slate-200 bg-white" />
            <ol className="text-sm text-slate-700 space-y-1.5 list-decimal pl-5">
              <li>Open WhatsApp on {self ? 'your' : `${person.name}’s`} phone.</li>
              <li>
                Tap <b>⋮ / Settings → Linked devices → Link a device</b>.
              </li>
              <li>Point the phone at this QR. It refreshes by itself every ~20 seconds.</li>
            </ol>
          </div>
          <PairByCode userId={person.userId} defaultPhone={person.mobile || ''} toast={toast} />
        </div>
      )}

      {s && ['CONNECTING', 'RECONNECTING'].includes(s.status) && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> {s.status === 'CONNECTING' ? 'Starting… the QR shows in a few seconds.' : 'Connection dropped, reconnecting…'}
        </div>
      )}

      {s?.lastError && !linked && s.status !== 'QR' && <p className="text-xs text-rose-700">{s.lastError}</p>}

      <div className="flex flex-wrap gap-2">
        {needsLink && (
          <Button busy={busy === 'link'} onClick={() => run('link')}>
            <QrCode className="h-4 w-4" /> {s ? 'Link again (show QR)' : 'Link WhatsApp (show QR)'}
          </Button>
        )}
        {s && (s.status === 'QR' || s.status === 'CONNECTING') && (
          // Still linking: stop showing the QR (nothing is logged in yet).
          <Button tone="ghost" busy={busy === 'logout'} onClick={() => run('logout')}>
            Cancel
          </Button>
        )}
        {s && (s.status === 'CONNECTED' || s.status === 'RECONNECTING') && (
          <Button
            tone="secondary"
            busy={busy === 'logout'}
            onClick={() => {
              if (window.confirm(`Log out ${s.number ? showPhone(s.number) : 'this WhatsApp'}? You will need to scan the QR again.`)) run('logout');
            }}
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        )}
      </div>

      {linked && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (to.trim()) run('test', { to: to.trim() });
          }}
        >
          <label htmlFor={`test-${person.userId}`} className="sr-only">
            Mobile number for a test message
          </label>
          <input id={`test-${person.userId}`} value={to} onChange={(e) => setTo(e.target.value)} inputMode="tel" placeholder="Mobile for test message" className={cx(inputClass, 'max-w-56')} />
          <Button type="submit" tone="secondary" busy={busy === 'test'} disabled={!to.trim()}>
            <Send className="h-4 w-4" /> Send test
          </Button>
        </form>
      )}
    </div>
  );
}

export default function WhatsAppNumbers() {
  const [toast, showToast] = useToast();
  const q = useApiData<NumbersData>('/api/whatsapp/numbers', (m) => showToast(m, 'error'));
  const d = q.data;
  const [qrFor, setQrFor] = useState<StaffRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const scanning = busyStatus(d?.me.session ?? null) || !!d?.staff.some((s) => busyStatus(s.session));
  usePoll(q.reload, scanning || qrFor ? 3000 : 15000);

  const staffAct = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    await act(body, showToast, () => {
      setBusy(null);
      q.reload();
    });
  };

  if (!d) return <Empty>Loading…</Empty>;
  const live = qrFor ? d.staff.find((s) => s.userId === qrFor.userId) ?? qrFor : null;

  return (
    <div className="space-y-4">
      {toast}
      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-emerald-600" /> WhatsApp numbers
      </h2>

      <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          This links WhatsApp like WhatsApp Web (no paid API). WhatsApp can block a number that sends many messages to people who did not save it — message your own customers and staff, and use a separate number for the company.
        </p>
      </div>

      <Card title="My WhatsApp">
        <SessionPanel person={d.me} toast={showToast} reload={q.reload} self />
      </Card>

      {d.isAdmin && (
        <Card title="Staff WhatsApp (admin)">
          <p className="text-xs text-slate-500 mb-3">
            Turn on <b>Allowed</b> for the people who may link their own number (one number each). The <b>company number</b> sends the automatic messages (OTP, orders, payments) and answers customers with the ordering bot; the other numbers are for personal chats.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Allowed</th>
                  <th className="py-2 pr-3">WhatsApp</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {d.staff.map((u) => {
                  const st = statusOf(u.session);
                  const superAdmin = u.role === 'SUPER_ADMIN';
                  return (
                    <tr key={u.userId} className="border-b border-slate-100 align-middle">
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{ROLE[u.role] || u.role}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-emerald-600"
                            checked={u.allowed}
                            disabled={superAdmin || busy === `allow-${u.userId}`}
                            onChange={(e) => staffAct(`allow-${u.userId}`, { action: 'allow', userId: u.userId, allowed: e.target.checked })}
                            aria-label={`Allow WhatsApp for ${u.name}`}
                          />
                          <span className="text-xs text-slate-600">{superAdmin ? 'Always' : u.allowed ? 'Yes' : 'No'}</span>
                        </label>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-col gap-0.5">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {u.session?.number && <span className="text-xs text-slate-700">{showPhone(u.session.number)}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {u.session?.isCompany ? (
                          <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline" disabled={busy === `co-${u.userId}`} onClick={() => staffAct(`co-${u.userId}`, { action: 'unsetCompany', userId: u.userId })} title="Remove as company number">
                            <CheckCircle2 className="h-4 w-4" /> Company
                          </button>
                        ) : u.session ? (
                          <Button size="sm" tone="ghost" busy={busy === `co-${u.userId}`} onClick={() => staffAct(`co-${u.userId}`, { action: 'setCompany', userId: u.userId })}>
                            Make company
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {u.allowed && (
                          <Button size="sm" tone="secondary" onClick={() => setQrFor(u)}>
                            <QrCode className="h-3.5 w-3.5" /> {u.session?.status === 'CONNECTED' ? 'Manage' : 'QR / link'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {live && (
        <Modal open title={`WhatsApp · ${live.name}`} onClose={() => setQrFor(null)}>
          <SessionPanel person={live} toast={showToast} reload={q.reload} self={live.userId === d.me.userId} />
        </Modal>
      )}
    </div>
  );
}
