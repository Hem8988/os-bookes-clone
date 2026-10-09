'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Bot, Check, CheckCheck, Clock, FileText, LayoutTemplate, MessageSquare, Paperclip, Plus, Search, Send, UserRound } from 'lucide-react';
import { apiWithMessage, errorMessage, inr, uploadFile } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Badge, Button, Empty, Field, inputClass, Modal, StatusBadge, cx, useToast } from './ui';

// WhatsApp → Chats: the team inbox. Customers' messages come in through the Meta or MSG91
// webhook; the ordering bot answers until someone takes the chat over (any reply does).

interface ChatRow { phone: string; name: string | null; customerId: string | null; lastPreview: string | null; lastActivityAt: string; lastInboundAt: string | null; unread: number; botPaused: boolean; assignedToName: string | null; assignedToId: string | null }
interface TemplateOption { key: string; name: string; fields: string[] }
interface ListData { chats: ChatRow[]; unreadChats: number; connected: boolean; templates: TemplateOption[] }
interface Message { id: string; direction: 'IN' | 'OUT'; body: string; status: string; error: string | null; mediaUrl: string | null; mediaType: string | null; sentBy: string | null; templateKey: string | null; createdAt: string }
interface CustomerInfo {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  area: string | null;
  balance: number;
  creditLimit: number;
  paymentTerms: string;
  status: string;
  orders: { id: string; orderNumber: string; status: string; totalAmount: number; requestedDeliveryDate: string }[];
  invoices: { id: string; invoiceNumber: string; date: string; grandTotal: number; paidAmount: number; status: string }[];
}
interface ThreadData { chat: ChatRow; messages: Message[]; windowOpen: boolean; windowEndsAt: string | null; connected: boolean; customer: CustomerInfo | null }

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['mine', 'Mine'],
  ['human', 'With team'],
] as const;

const time = (v: string) => new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const day = (v: string) => {
  const d = new Date(v);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};
const listTime = (v: string) => (new Date(v).toDateString() === new Date().toDateString() ? time(v) : day(v));
const showPhone = (p: string) => (p.length === 12 && p.startsWith('91') ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);

/** Poll an API while the screen is open (no websockets here). */
function usePoll(reload: () => unknown, ms: number, active = true) {
  const ref = useRef(reload);
  useEffect(() => {
    ref.current = reload;
  });
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
}

export default function WhatsAppChats() {
  const [toast, showToast] = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [q, setQ] = useState('');
  // Opened from a notification link: …&chat=<number>.
  const [selected, setSelected] = useState<string | null>(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('chat')));
  const [starting, setStarting] = useState(false);
  const listQ = useApiData<ListData>(`/api/whatsapp/chats?${new URLSearchParams({ filter, q: q.trim() })}`, (m) => showToast(m, 'error'));
  usePoll(listQ.reload, 8000);
  const list = listQ.data;

  return (
    <div className="space-y-3">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-600" /> WhatsApp Chats
          {!!list?.unreadChats && <Badge tone="green">{list.unreadChats} unread</Badge>}
        </h2>
        <Button onClick={() => setStarting(true)}>
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>
      {list && !list.connected && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold">
          WhatsApp is not connected yet, so replies are only saved here (not sent). An admin can connect MSG91 in WhatsApp → Bot, templates &amp; log → MSG91.
        </div>
      )}

      <div className="grid md:grid-cols-[19rem_1fr] xl:grid-cols-[19rem_1fr_17rem] h-[calc(100dvh-11rem)] min-h-[28rem] rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <aside className={cx('flex flex-col min-h-0 border-r border-slate-200', selected && 'hidden md:flex')}>
          <div className="p-2 space-y-2 border-b border-slate-100">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" className={cx(inputClass, 'pl-8')} />
            </div>
            <div className="flex gap-1">
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setFilter(key)} className={cx('px-2.5 py-1 rounded-full text-[11px] font-bold', filter === key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!list ? (
              <Empty>Loading…</Empty>
            ) : list.chats.length === 0 ? (
              <Empty>{q || filter !== 'all' ? 'No chats match.' : 'No chats yet. Customers’ WhatsApp messages show here.'}</Empty>
            ) : (
              list.chats.map((c) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => setSelected(c.phone)}
                  className={cx('w-full text-left px-3 py-2.5 flex gap-2.5 border-b border-slate-50 hover:bg-slate-50', selected === c.phone && 'bg-emerald-50 hover:bg-emerald-50')}
                >
                  <span className="h-9 w-9 shrink-0 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-black">{(c.name || '#').slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx('truncate text-sm', c.unread ? 'font-black text-slate-900' : 'font-bold text-slate-800')}>{c.name || showPhone(c.phone)}</span>
                      <span className={cx('shrink-0 text-[10px]', c.unread ? 'text-emerald-700 font-bold' : 'text-slate-400')}>{listTime(c.lastActivityAt)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500">{c.lastPreview || '—'}</span>
                      {c.unread > 0 && <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">{c.unread}</span>}
                    </span>
                    <span className="flex gap-1 mt-0.5">
                      {c.botPaused ? <span className="text-[10px] font-bold text-sky-700">● {c.assignedToName || 'Team'}</span> : <span className="text-[10px] font-bold text-slate-400">● Bot</span>}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {selected ? (
          <Thread key={selected} phone={selected} templates={list?.templates ?? []} onBack={() => setSelected(null)} onChanged={() => listQ.reload()} toast={showToast} />
        ) : (
          <div className="hidden md:flex xl:col-span-2 items-center justify-center bg-[#efeae2] text-sm text-slate-500">Choose a chat on the left.</div>
        )}
      </div>

      {starting && (
        <NewChatModal
          onClose={() => setStarting(false)}
          onOpened={(phone) => {
            setStarting(false);
            setSelected(phone);
            listQ.reload();
          }}
          toast={showToast}
        />
      )}
    </div>
  );
}

function Ticks({ m }: { m: Message }) {
  if (m.direction === 'IN') return null;
  if (m.status === 'FAILED') return <span title={m.error || 'Not sent'}><AlertCircle className="h-3.5 w-3.5 text-rose-600" /></span>;
  if (m.status === 'SIMULATED') return <span title="Not sent — WhatsApp is not connected"><Clock className="h-3.5 w-3.5 text-slate-400" /></span>;
  if (m.status === 'READ') return <span title="Read"><CheckCheck className="h-3.5 w-3.5 text-sky-500" /></span>;
  if (m.status === 'DELIVERED') return <span title="Delivered"><CheckCheck className="h-3.5 w-3.5 text-slate-400" /></span>;
  return <span title="Sent"><Check className="h-3.5 w-3.5 text-slate-400" /></span>;
}

function Bubble({ m }: { m: Message }) {
  const out = m.direction === 'OUT';
  // Our own notes in the log ("[Card image]", "[View Invoice → …]") are not part of what the customer reads.
  const text = m.body.replace(/^\[Card image\]\n?/, '');
  return (
    <div className={cx('flex', out ? 'justify-end' : 'justify-start')}>
      <div className={cx('max-w-[80%] rounded-lg px-2.5 py-1.5 shadow-sm text-[13px] leading-snug', out ? 'bg-[#d9fdd3]' : 'bg-white', m.status === 'FAILED' && 'ring-1 ring-rose-300')}>
        {m.mediaUrl && m.mediaType === 'image' && (
          <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="block mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.mediaUrl} alt="Photo" className="rounded-md max-h-64 object-cover" />
          </a>
        )}
        {m.mediaUrl && m.mediaType !== 'image' && (
          <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 font-semibold text-slate-700">
            <FileText className="h-4 w-4" /> Open file
          </a>
        )}
        {m.templateKey && <div className="text-[10px] font-bold text-emerald-700 mb-0.5">Template · {m.templateKey.toLowerCase().replace(/_/g, ' ')}</div>}
        {text && <div className="whitespace-pre-wrap break-words text-slate-900">{text}</div>}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          {out && m.sentBy && <span>{m.sentBy} ·</span>}
          {out && !m.sentBy && !m.templateKey && <span>Bot ·</span>}
          <span>{time(m.createdAt)}</span>
          <Ticks m={m} />
        </div>
        {m.status === 'FAILED' && m.error && <div className="mt-0.5 text-[10px] font-semibold text-rose-700">{m.error}</div>}
      </div>
    </div>
  );
}

function Thread({ phone, templates, onBack, onChanged, toast }: { phone: string; templates: TemplateOption[]; onBack: () => void; onChanged: () => void; toast: (m: string, tone?: 'ok' | 'error') => void }) {
  const q = useApiData<ThreadData>(`/api/whatsapp/chats/${phone}`, (m) => toast(m, 'error'));
  usePoll(q.reload, 5000);
  const d = q.data;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const count = d?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);
  // The list's unread badge clears once the chat is open (once — onChanged is a new function every render).
  const opened = !!d;
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  });
  useEffect(() => {
    if (opened) onChangedRef.current();
  }, [opened]);

  const act = async (body: Record<string, unknown>, quiet = false) => {
    setBusy(true);
    try {
      const r = await apiWithMessage(`/api/whatsapp/chats/${phone}`, body);
      if (!quiet && r.message) toast(r.message);
      q.reload();
      onChanged();
      return true;
    } catch (e) {
      toast(errorMessage(e), 'error');
      q.reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    if (await act({ action: 'send', text: text.trim() }, true)) setText('');
  };

  const attach = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const fileUrl = await uploadFile(file);
      if (await act({ action: 'media', fileUrl, caption: text.trim(), filename: file.name }, true)) setText('');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const grouped = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of d?.messages ?? []) {
      const label = day(m.createdAt);
      if (out.at(-1)?.day !== label) out.push({ day: label, items: [] });
      out.at(-1)!.items.push(m);
    }
    return out;
  }, [d?.messages]);

  if (!d) return <div className="flex items-center justify-center text-sm text-slate-500 xl:col-span-2">Loading…</div>;
  const c = d.chat;
  const locked = d.connected && !d.windowOpen;

  return (
    <>
      <section className="flex flex-col min-h-0 min-w-0">
        <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50">
          <button type="button" onClick={onBack} className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-slate-200" aria-label="Back to chats">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-900">{c.name || showPhone(c.phone)}</div>
            <div className="text-[11px] text-slate-500">{showPhone(c.phone)}{c.assignedToName ? ` · with ${c.assignedToName}` : ''}</div>
          </div>
          <Button size="sm" tone={c.botPaused ? 'secondary' : 'ghost'} busy={busy} onClick={() => act({ action: c.botPaused ? 'resumeBot' : 'pauseBot' })} title={c.botPaused ? 'Let the ordering bot answer again' : 'Stop the bot and handle the chat yourself'}>
            {c.botPaused ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            {c.botPaused ? 'Give back to bot' : 'Take over'}
          </Button>
          {!c.assignedToId && (
            <Button size="sm" tone="ghost" busy={busy} onClick={() => act({ action: 'assign' })}>
              Assign to me
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-2 space-y-1.5">
          {grouped.length === 0 && <div className="text-center text-xs text-slate-500 py-8">No messages yet.</div>}
          {grouped.map((g) => (
            <React.Fragment key={g.day}>
              <div className="flex justify-center py-1">
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">{g.day}</span>
              </div>
              {g.items.map((m) => <Bubble key={m.id} m={m} />)}
            </React.Fragment>
          ))}
          <div ref={endRef} />
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 p-2 space-y-2">
          {!c.botPaused && <div className="text-[11px] text-slate-500 px-1">The bot is answering this chat. Sending a reply takes it over.</div>}
          {locked ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="flex-1 min-w-[12rem] font-semibold">The customer hasn&apos;t written in 24 hours, so WhatsApp only allows an approved template now.</span>
              <Button size="sm" onClick={() => setTemplateOpen(true)}>
                <LayoutTemplate className="h-3.5 w-3.5" /> Send template
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-1.5">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => void attach(e.target.files?.[0])} />
              <Button tone="ghost" disabled={busy} onClick={() => fileRef.current?.click()} title="Photo or PDF (up to 5 MB). Text in the box goes as its caption." aria-label="Attach photo or PDF">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button tone="ghost" disabled={busy} onClick={() => setTemplateOpen(true)} title="Send a ready message (invoice, reminder…)" aria-label="Send template">
                <LayoutTemplate className="h-4 w-4" />
              </Button>
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Type a message (Enter to send, Shift+Enter for a new line)"
                className={cx(inputClass, 'resize-none max-h-32 min-h-[2.5rem]')}
              />
              <Button busy={busy} disabled={!text.trim()} onClick={() => void send()} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </footer>
      </section>

      <CustomerPanel customer={d.customer} chat={c} />

      {templateOpen && (
        <TemplateModal
          templates={templates}
          customerName={d.customer?.name || c.name || ''}
          busy={busy}
          onClose={() => setTemplateOpen(false)}
          onSend={async (key, vars) => {
            if (await act({ action: 'template', key, vars })) setTemplateOpen(false);
          }}
        />
      )}
    </>
  );
}

function CustomerPanel({ customer, chat }: { customer: CustomerInfo | null; chat: ChatRow }) {
  return (
    <aside className="hidden xl:flex flex-col min-h-0 overflow-y-auto border-l border-slate-200 p-3 space-y-3 text-xs">
      {!customer ? (
        <div className="text-slate-500">
          <div className="font-black text-slate-800 text-sm mb-1">{chat.name || showPhone(chat.phone)}</div>
          This number is not a customer in DeskShark yet.
        </div>
      ) : (
        <>
          <div>
            <div className="font-black text-slate-900 text-sm">{customer.name}</div>
            <div className="text-slate-500">{[customer.contactPerson, customer.area].filter(Boolean).join(' · ') || customer.phone}</div>
            {customer.status !== 'ACTIVE' && <div className="mt-1"><Badge tone="red">{customer.status.toLowerCase()}</Badge></div>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Outstanding</div>
              <div className={cx('font-black', customer.balance > 0 ? 'text-rose-700' : 'text-slate-900')}>{inr(customer.balance)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Credit limit</div>
              <div className="font-black text-slate-900">{customer.creditLimit ? inr(customer.creditLimit) : '—'}</div>
            </div>
          </div>
          <div>
            <div className="font-black text-slate-700 mb-1">Recent orders</div>
            {customer.orders.length === 0 ? (
              <div className="text-slate-400">None</div>
            ) : (
              customer.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50">
                  <span className="font-semibold">{o.orderNumber}</span>
                  <span className="flex items-center gap-1.5">{inr(o.totalAmount)} <StatusBadge status={o.status} /></span>
                </div>
              ))
            )}
          </div>
          <div>
            <div className="font-black text-slate-700 mb-1">Recent invoices</div>
            {customer.invoices.length === 0 ? (
              <div className="text-slate-400">None</div>
            ) : (
              customer.invoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50">
                  <span className="font-semibold">{i.invoiceNumber}</span>
                  <span>{inr(i.grandTotal)} <span className={cx('font-bold', i.status === 'Paid' ? 'text-emerald-700' : 'text-amber-700')}>{i.status}</span></span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function TemplateModal({ templates, customerName, busy, onClose, onSend }: { templates: TemplateOption[]; customerName: string; busy: boolean; onClose: () => void; onSend: (key: string, vars: Record<string, string>) => void }) {
  const [key, setKey] = useState(templates[0]?.key ?? '');
  const [vars, setVars] = useState<Record<string, string>>({});
  const t = templates.find((x) => x.key === key);
  const missing = t?.fields.some((f) => !vars[f]?.trim());
  return (
    <Modal
      open
      title="Send a template"
      onClose={onClose}
      footer={
        <Button busy={busy} disabled={!t || missing} onClick={() => t && onSend(t.key, vars)}>
          <Send className="h-4 w-4" /> Send
        </Button>
      }
    >
      <p className="text-xs text-slate-600">
        Templates can be sent any time once approved on WhatsApp (MSG91 / Meta). Customer name, company and support number fill in by themselves{customerName ? ` (${customerName})` : ''}.
      </p>
      <Field label="Template">
        <select value={key} onChange={(e) => { setKey(e.target.value); setVars({}); }} className={inputClass}>
          {templates.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}
        </select>
      </Field>
      {t && t.fields.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {t.fields.map((f) => (
            <Field key={f} label={f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}>
              <input value={vars[f] ?? ''} onChange={(e) => setVars({ ...vars, [f]: e.target.value })} className={inputClass} />
            </Field>
          ))}
        </div>
      )}
    </Modal>
  );
}

function NewChatModal({ onClose, onOpened, toast }: { onClose: () => void; onOpened: (phone: string) => void; toast: (m: string, tone?: 'ok' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const results = useApiData<{ id: string; name: string; phone: string; whatsappNumber: string | null; area: string | null }[]>(`/api/whatsapp/chats?customers=${encodeURIComponent(search.trim())}`, (m) => toast(m, 'error'));
  const [busy, setBusy] = useState(false);
  const digits = search.replace(/\D/g, '');
  const open = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await apiWithMessage<{ phone: string }>('/api/whatsapp/chats', body);
      onOpened(r.data.phone);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="New chat" onClose={onClose}>
      <Field label="Customer name or mobile number">
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} placeholder="e.g. Pramukh or 98765 43210" />
      </Field>
      {digits.length === 10 && (
        <Button tone="secondary" className="w-full" busy={busy} onClick={() => open({ phone: digits })}>
          Chat with +91 {digits}
        </Button>
      )}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {(results.data ?? []).map((c) => (
          <button key={c.id} type="button" disabled={busy} onClick={() => open({ customerId: c.id })} className="w-full text-left py-2 px-1 hover:bg-slate-50">
            <div className="text-sm font-bold text-slate-900">{c.name}</div>
            <div className="text-[11px] text-slate-500">{[c.whatsappNumber || c.phone, c.area].filter(Boolean).join(' · ')}</div>
          </button>
        ))}
        {results.data && results.data.length === 0 && <div className="py-3 text-xs text-slate-400">No customer found.</div>}
      </div>
    </Modal>
  );
}
