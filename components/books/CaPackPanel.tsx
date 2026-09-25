'use client';

import React, { useState } from 'react';
import { CheckCircle2, Download, FileCode2, FileSpreadsheet, Mail, Save, Send } from 'lucide-react';
import { monthRange } from '../../lib/books';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Empty, Field, inputClass, cx, dateTime, today, useToast } from '../ui';
import { BooksHeader, Kpi, money, useBooksReport } from './shared';

interface Settings { caName: string; caEmail: string; ccEmails: string; autoSendDay: number; fyStartMonth: number }
interface PackInfo { settings: Settings; emailConfigured: boolean; log: { id: string; recipient: string; subject: string | null; status: string; error: string | null; createdAt: string }[] }
interface Overview { sales: number; purchases: number; expenses: number; receipts: number; netProfit: number; gstPayable: number; receivables: number; payables: number; cashInHand: number; bank: number }

const CONTENTS = [
  ['Summary', 'Month at a glance, balances, GST payable'],
  ['Sales Register', 'Every invoice with GSTIN, place of supply, CGST/SGST/IGST'],
  ['GSTR-1', 'B2B (4A), B2C (5/7), credit notes (9B), HSN summary (12), documents issued'],
  ['GSTR-2 · rate-wise GST', 'Inward supplies & ITC; sales and purchase GST by rate'],
  ['Credit / debit notes', 'Sales returns, refunds and purchase returns'],
  ['GSTR-3B', 'Output tax, eligible ITC, tax payable in cash after set-off'],
  ['Purchase Register', 'Plant & supplier bills with ITC'],
  ['Expense Register', 'Head-wise expenses with GST'],
  ['Receipts', 'Customer payments by mode'],
  ['Cash Book · Bank Book', 'Each cash wallet and bank with running balance'],
  ['Day Book', 'All vouchers with Dr / Cr ledgers'],
  ['Outstanding & Ageing', 'Customer dues 0–30 / 31–60 / 61–90 / 90+ days'],
  ['Party Ledgers · Payables', 'Opening, debit, credit, closing of every party; open supplier bills'],
  ['Stock Summary', 'Full & empty cylinders: opening, received, sold, closing, value'],
  ['Cylinder Holding', 'Cylinders with customers and SV/TV deposits'],
  ['Trial Balance · P&L · Balance Sheet', 'Final accounts (month and FY to date)'],
  ['Tally files', 'Ledger masters + the month’s vouchers, ready to import'],
  ['Day Closings', 'Locked / re-opened days'],
];

const previousMonth = () => {
  const [y, m] = today().split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

export default function CaPackPanel() {
  const [toast, showToast] = useToast();
  const [month, setMonth] = useState(previousMonth());
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const onError = (m: string) => showToast(m, 'error');
  const infoQ = useApiData<PackInfo>('/api/books/ca-pack', onError);
  const period = monthRange(month);
  const overview = useBooksReport<Overview>('overview', period, '', onError).data;
  const info = infoQ.data;
  const settings = draft ?? info?.settings ?? null;

  const download = async (format: 'xlsx' | 'tally-masters' | 'tally-vouchers') => {
    setDownloading(format);
    try {
      const res = await fetch(`/api/books/ca-pack?month=${month}&format=${format}`, { credentials: 'same-origin' });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Download failed.');
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || `accounts-${month}.${format === 'xlsx' ? 'xlsx' : 'xml'}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setDownloading(null);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const r = await api<{ sentTo: string[]; status: string }>('/api/books/ca-pack', { body: { month } });
      showToast(r.status === 'SENT' ? `Sent to ${r.sentTo.join(', ')}.` : 'SMTP is not set up — the email was only logged. Download the files and send them yourself for now.', r.status === 'SENT' ? 'ok' : 'error');
      infoQ.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api('/api/books/ca-pack', { method: 'PUT', body: settings });
      showToast('CA settings saved.');
      setDraft(null);
      infoQ.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Settings>) => settings && setDraft({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      {toast}
      <BooksHeader icon={FileSpreadsheet} title="CA pack — monthly accounts" subtitle="Everything your CA / accountant needs for the month in one Excel workbook, plus a Tally import file. Download it or email it straight to the CA." />

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Field label="Month">
                <input type="month" value={month} max={today().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} className={cx(inputClass, 'w-48')} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button busy={downloading === 'xlsx'} onClick={() => download('xlsx')}><Download className="h-4 w-4" /> Excel workbook</Button>
                <Button tone="secondary" busy={downloading === 'tally-masters'} onClick={() => download('tally-masters')}><FileCode2 className="h-4 w-4" /> Tally ledgers</Button>
                <Button tone="secondary" busy={downloading === 'tally-vouchers'} onClick={() => download('tally-vouchers')}><FileCode2 className="h-4 w-4" /> Tally vouchers</Button>
                <Button tone="secondary" busy={sending} disabled={!info?.settings.caEmail} onClick={send}><Send className="h-4 w-4" /> Email to CA</Button>
              </div>
            </div>
            {!info?.settings.caEmail && info && <p className="mt-2 text-[11px] text-amber-700 font-semibold">Add the CA&apos;s email on the right to send the pack by email.</p>}
          </Card>

          {!overview ? (
            <Empty>Loading the month…</Empty>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Kpi label="Sales (taxable)" value={money(overview.sales)} tone="green" />
              <Kpi label="Purchases (taxable)" value={money(overview.purchases)} tone="blue" />
              <Kpi label="Expenses" value={money(overview.expenses)} tone="amber" />
              <Kpi label="Receipts" value={money(overview.receipts)} />
              <Kpi label="Net profit" value={money(overview.netProfit)} tone={overview.netProfit < 0 ? 'red' : 'green'} />
              <Kpi label="GST payable (cash)" value={money(overview.gstPayable)} tone="red" />
              <Kpi label="Receivables" value={money(overview.receivables)} />
              <Kpi label="Payables" value={money(overview.payables)} />
              <Kpi label="Cash + bank" value={money(overview.cashInHand + overview.bank)} />
            </div>
          )}

          <Card title="What's inside the workbook">
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              {CONTENTS.map(([name, desc]) => (
                <div key={name} className="flex gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">{name}</div>
                    <div className="text-slate-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600">
              <strong>Tally import:</strong> 1) Gateway of Tally → Import → <em>Masters</em> → choose the “Tally ledgers” file (creates every ledger under the same Tally groups with opening balances and GSTIN). 2) Gateway of Tally → Import → <em>Transactions</em> → choose the “Tally vouchers” file. Try it once in a test company and check the ledger names match yours.
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card title="CA / accountant" actions={<Button size="sm" busy={saving} disabled={!draft} onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>}>
            {!settings ? (
              <Empty>Loading…</Empty>
            ) : (
              <div className="space-y-3">
                <Field label="CA / firm name"><input value={settings.caName} onChange={(e) => set({ caName: e.target.value })} placeholder="e.g. CA R. Sharma & Associates" className={inputClass} /></Field>
                <Field label="CA email"><input type="email" value={settings.caEmail} onChange={(e) => set({ caEmail: e.target.value })} placeholder="ca@example.com" className={inputClass} /></Field>
                <Field label="Also send a copy to" hint="Comma separated, e.g. your own email."><input value={settings.ccEmails} onChange={(e) => set({ ccEmails: e.target.value })} className={inputClass} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Auto-send on day" hint="0 = only by hand. Sends last month's pack.">
                    <input type="number" min={0} max={28} value={settings.autoSendDay} onChange={(e) => set({ autoSendDay: Number(e.target.value) })} className={inputClass} />
                  </Field>
                  <Field label="Financial year starts">
                    <select value={settings.fyStartMonth} onChange={(e) => set({ fyStartMonth: Number(e.target.value) })} className={inputClass}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{new Date(2026, m - 1, 1).toLocaleString('en-IN', { month: 'long' })}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {info && !info.emailConfigured && (
                  <p className="text-[11px] text-amber-700 font-semibold flex gap-1"><Mail className="h-3.5 w-3.5 shrink-0" /> Email is not set up yet — the Super Admin can add it in Admin → Settings → Email. Until then use the download buttons.</p>
                )}
                {settings.autoSendDay > 0 && <p className="text-[11px] text-slate-500">Sent automatically on that day (after 9 AM) by the server — no extra setup needed.</p>}
              </div>
            )}
          </Card>

          <Card title="Sent packs">
            {!info?.log.length ? (
              <p className="text-xs text-slate-400">Nothing sent yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {info.log.map((l) => (
                  <div key={l.id} className="py-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold truncate">{l.subject}</span>
                      <Badge tone={l.status === 'SENT' ? 'green' : l.status === 'FAILED' ? 'red' : 'amber'}>{l.status}</Badge>
                    </div>
                    <div className="text-[10px] text-slate-400">{l.recipient} · {dateTime(l.createdAt)}{l.error ? ` · ${l.error}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
