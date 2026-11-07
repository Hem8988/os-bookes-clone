'use client';

import React, { useState } from 'react';
import { Inbox, MessageCircle, Phone, Search } from 'lucide-react';
import { apiWithMessage, errorMessage } from '../lib/api';
import { INQUIRY_STATUSES, type InquiryStatus } from '../lib/inquiries';
import { useApiData } from '../lib/useApiData';
import { Badge, Button, Card, Empty, inputClass, cx, useToast } from './ui';

// Website inquiries (home page form). New ones also reach the admin and managers on WhatsApp.

interface Inquiry {
  id: string;
  inquiryNumber: string;
  name: string;
  phone: string;
  email: string | null;
  businessName: string | null;
  city: string | null;
  need: string;
  cylinderSize: string | null;
  monthlyQty: number | null;
  message: string | null;
  status: InquiryStatus;
  notes: string | null;
  handledByName: string | null;
  source: 'WEBSITE' | 'WHATSAPP' | string;
  createdAt: string;
}
interface Data { inquiries: Inquiry[]; counts: Record<string, number>; needs: Record<string, string> }

const TONE: Record<InquiryStatus, 'blue' | 'amber' | 'green' | 'slate'> = { NEW: 'blue', CONTACTED: 'amber', CONVERTED: 'green', CLOSED: 'slate' };
const LABEL: Record<InquiryStatus, string> = { NEW: 'New', CONTACTED: 'Contacted', CONVERTED: 'Converted', CLOSED: 'Closed' };
const when = (v: string) => new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Row({ q, needs, onSaved, toast, open }: { q: Inquiry; needs: Record<string, string>; onSaved: () => void; toast: (m: string, t?: 'ok' | 'error') => void; open: boolean }) {
  const [notes, setNotes] = useState(q.notes || '');
  const [busy, setBusy] = useState<string | null>(null);
  const save = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const r = await apiWithMessage(`/api/inquiries/${q.id}`, body, 'PATCH');
      if (r.message) toast(r.message);
      onSaved();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  // Came in on the company WhatsApp: reply in our own chat screen (from the company number).
  const fromWhatsApp = q.source === 'WHATSAPP';
  const wa = fromWhatsApp
    ? `/admin?tab=whatsapp&sub=chats&channel=main&chat=91${q.phone}`
    : `https://wa.me/91${q.phone}?text=${encodeURIComponent(`Namaste ${q.name}, thank you for your inquiry (${q.inquiryNumber}).`)}`;

  return (
    <li id={`inq-${q.id}`} className={cx('rounded-2xl border bg-white p-4 space-y-3', open ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-slate-900">{q.name}</span>
            {q.businessName && <span className="text-sm text-slate-600">· {q.businessName}</span>}
            <Badge tone={TONE[q.status]}>{LABEL[q.status]}</Badge>
            <Badge tone={fromWhatsApp ? 'green' : 'violet'}>{fromWhatsApp ? 'WhatsApp' : 'Website'}</Badge>
          </div>
          <div className="text-xs text-slate-500">
            {q.inquiryNumber} · {when(q.createdAt)}
            {q.city ? ` · ${q.city}` : ''}
            {q.handledByName ? ` · by ${q.handledByName}` : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`tel:+91${q.phone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <Phone className="h-3.5 w-3.5" /> +91 {q.phone}
          </a>
          <a href={wa} {...(fromWhatsApp ? {} : { target: '_blank', rel: 'noreferrer' })} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">
            <MessageCircle className="h-3.5 w-3.5" /> {fromWhatsApp ? 'Open chat' : 'WhatsApp'}
          </a>
        </div>
      </div>

      <div className="text-sm text-slate-700">
        <b>{needs[q.need] || q.need}</b>
        {q.cylinderSize ? ` · ${q.cylinderSize}` : ''}
        {q.monthlyQty ? ` · ${q.monthlyQty} cylinders/month` : ''}
        {q.email ? ` · ${q.email}` : ''}
      </div>
      {q.message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">{q.message}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-500 mr-1">Mark:</span>
        {INQUIRY_STATUSES.map((s) => (
          <Button key={s} size="sm" tone={q.status === s ? 'primary' : 'secondary'} busy={busy === s} disabled={q.status === s} onClick={() => save({ status: s }, s)}>
            {LABEL[s]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`notes-${q.id}`} className="sr-only">
          Notes for {q.inquiryNumber}
        </label>
        <textarea id={`notes-${q.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes: rate offered, next call…" className={cx(inputClass, 'flex-1 min-w-[14rem]')} />
        <Button size="sm" tone="secondary" busy={busy === 'notes'} disabled={notes === (q.notes || '')} onClick={() => save({ notes }, 'notes')}>
          Save notes
        </Button>
      </div>
    </li>
  );
}

export default function InquiriesModule() {
  const [toast, showToast] = useToast();
  const [status, setStatus] = useState<'ALL' | InquiryStatus>('NEW');
  const [q, setQ] = useState('');
  // Opened from the WhatsApp / notification link: …&id=<inquiry>.
  const [openId] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('id')));
  const data = useApiData<Data>(`/api/inquiries?${new URLSearchParams({ status: openId ? 'ALL' : status, q: q.trim() })}`, (m) => showToast(m, 'error'));
  const d = data.data;
  const total = d ? Object.values(d.counts).reduce((s, n) => s + n, 0) : 0;

  return (
    <div className="space-y-4">
      {toast}
      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
        <Inbox className="h-5 w-5 text-emerald-600" /> Website inquiries
        {!!d?.counts.NEW && <Badge tone="blue">{d.counts.NEW} new</Badge>}
      </h2>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={cx('rounded-full px-3 py-1.5 text-xs font-bold', status === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >
              {s === 'ALL' ? `All (${total})` : `${LABEL[s]} (${d?.counts[s] || 0})`}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, city" aria-label="Search inquiries" className={cx(inputClass, 'pl-8')} />
          </div>
        </div>
      </Card>
      {!d ? (
        <Empty>Loading…</Empty>
      ) : d.inquiries.length === 0 ? (
        <Empty>{q || status !== 'ALL' ? 'No inquiries here.' : 'No inquiries yet. They come from the form on your website’s home page.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {d.inquiries.map((row) => (
            <Row key={`${row.id}-${row.status}-${row.notes}`} q={row} needs={d.needs} onSaved={data.reload} toast={showToast} open={row.id === openId} />
          ))}
        </ul>
      )}
    </div>
  );
}
