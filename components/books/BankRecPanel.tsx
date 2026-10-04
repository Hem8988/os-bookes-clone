'use client';

import React, { useState } from 'react';
import { CheckCircle2, FileUp, Landmark, Link2, Plus, RefreshCw, Unlink, EyeOff, Trash2 } from 'lucide-react';
import { api, apiWithMessage, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, cx, today, useToast } from '../ui';
import { BooksHeader, Kpi, LedgerOption, money, plain } from './shared';

interface StatementLine { id: string; date: string; description: string; reference: string | null; debit: number; credit: number; balance: number | null; status: 'UNMATCHED' | 'MATCHED' | 'IGNORED'; matchedTo: string; matchedBy: string | null; receiptNumber: string | null }
interface BookPick { id: string; voucherNumber: string; date: string; party: string }
interface Preview {
  account: string;
  lines: { index: number; date: string; description: string; reference: string | null; debit: number; credit: number; balance: number | null; exists: boolean; match: BookPick | null; options: BookPick[]; party: { customerId: string; name: string } | null }[];
  from: string;
  to: string;
  total: number;
  newCount: number;
  willMatch: number;
  existingCount: number;
  deposits: number;
  withdrawals: number;
  closingBalance: number | null;
}
interface BookLine { id: string; date: string; voucherNumber: string; voucherType: string; party: string | null; narration: string | null; debit: number; credit: number }
interface Rec {
  account: { id: string; name: string };
  bookBalance: number;
  bankBalance: number | null;
  bankBalanceDate: string | null;
  computedBankBalance: number;
  depositsNotCredited: number;
  chequesNotPresented: number;
  bankOnlyIn: number;
  bankOnlyOut: number;
  statement: StatementLine[];
  unreconciledBook: BookLine[];
  counts: { total: number; matched: number; unmatched: number; ignored: number };
}

export default function BankRecPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const ledgersQ = useApiData<LedgerOption[]>('/api/books/accounts', onError);
  // Real bank accounts (from Masters → Banks) first; the generic system 'Bank Account' last.
  const banks = (ledgersQ.data ?? []).filter((l) => l.groupName === 'Bank Accounts').sort((a, b) => Number(a.name === 'Bank Account') - Number(b.name === 'Bank Account'));
  const [accountId, setAccountId] = useState('');
  const bank = accountId || banks[0]?.id || '';
  const [asOf, setAsOf] = useState(today());
  const [filter, setFilter] = useState<'UNMATCHED' | 'ALL'>('ALL');
  const [busy, setBusy] = useState<string | null>(null);
  const [matching, setMatching] = useState<StatementLine | null>(null);
  // Lines to book against a customer / ledger: one (row ➕) or many (ticked).
  const [linking, setLinking] = useState<StatementLine[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const recQ = useApiData<Rec>(bank ? `/api/books/bank-rec?accountId=${bank}&asOf=${asOf}` : null, onError);
  const rec = recQ.data;

  const act = async (label: string, body: object, message?: string) => {
    setBusy(label);
    try {
      await api('/api/books/bank-rec', { method: 'PATCH', body });
      if (message) showToast(message);
      recQ.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const send = async (file: File, preview: boolean, chosen?: Record<number, string>) => {
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', bank);
    if (preview) form.append('preview', '1');
    // 'pick-…' = "choose a customer / ledger" opened but nothing chosen yet → not linked.
    if (chosen) form.append('links', JSON.stringify(Object.fromEntries(Object.entries(chosen).map(([i, id]) => [i, id && !id.startsWith('pick-') ? id : null]))));
    const res = await fetch('/api/books/bank-rec', { method: 'POST', body: form, credentials: 'same-origin' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed.');
    return json;
  };
  // Step 1: read the file and show what would come in. Nothing is saved yet.
  const [pending, setPending] = useState<{ file: File; preview: Preview } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'MATCH' | 'NOMATCH'>('ALL');
  // Row index → book entry id ('' = leave unmatched). Starts with the auto-match; change it per line.
  const [links, setLinks] = useState<Record<number, string>>({});
  // Preview rows ticked for one customer / ledger in one go.
  const [bulkPick, setBulkPick] = useState<Set<number>>(new Set());
  const [bulkTarget, setBulkTarget] = useState('');
  const upload = async (file: File | undefined) => {
    if (!file || !bank) return;
    setBusy('upload');
    try {
      const preview = (await send(file, true)).data as Preview;
      setPending({ file, preview });
      // Default: the book entry found; else, when the narration names a customer, a new receipt from them.
      setLinks(Object.fromEntries(preview.lines.filter((l) => !l.exists).map((l) => [l.index, l.match?.id || (l.party ? `pay:${l.party.customerId}` : '')])));
      setPreviewFilter('ALL');
      setBulkPick(new Set());
      setBulkTarget('');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  // Step 2: approved in the preview → import.
  const confirmImport = async () => {
    if (!pending) return;
    setBusy('import');
    try {
      const json = await send(pending.file, false, links);
      showToast(json.message || 'Statement imported.');
      setPending(null);
      recQ.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const lines = (rec?.statement ?? []).filter((l) => filter === 'ALL' || l.status === 'UNMATCHED');
  // Lines that can be ticked for bulk booking: unmatched, no receipt booked yet.
  const pickable = lines.filter((l) => l.status === 'UNMATCHED' && !l.receiptNumber);
  const tone = (s: string) => (s === 'MATCHED' ? 'green' : s === 'IGNORED' ? 'slate' : 'amber');

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader
        icon={Landmark}
        title="Bank reconciliation"
        subtitle="Upload the bank statement (Excel or CSV from any bank). Entries are matched with the books automatically; add what the books are missing in one click."
        actions={
          <label className={cx('inline-flex items-center gap-1.5 rounded-xl font-bold px-3.5 py-2 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white', (!bank || busy === 'upload') && 'opacity-50 pointer-events-none')}>
            <FileUp className="h-4 w-4" /> {busy === 'upload' ? 'Reading…' : 'Upload statement'}
            <input type="file" accept=".xlsx,.csv,text/csv" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Bank ledger">
          <select value={bank} onChange={(e) => setAccountId(e.target.value)} className={cx(inputClass, 'w-64')}>
            {!banks.length && <option value="">No bank yet — add one in Masters → Banks</option>}
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="As on"><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={cx(inputClass, 'w-44')} /></Field>
        <Button tone="secondary" busy={busy === 'auto'} disabled={!bank} onClick={() => act('auto', { action: 'auto', accountId: bank }, 'Auto-match done.')}><RefreshCw className="h-4 w-4" /> Auto-match</Button>
        {!!rec?.counts.unmatched && (
          <Button tone="secondary" busy={busy === 'clear'} onClick={() => { if (window.confirm('Remove all unmatched / ignored statement lines of this bank? Matched lines stay. Use this to upload a statement again.')) void act('clear', { action: 'clear', accountId: bank }, 'Unmatched lines removed — upload the statement again.'); }} title="Remove unmatched lines (wrong upload) and upload again">
            <Trash2 className="h-4 w-4" /> Clear unmatched
          </Button>
        )}
      </div>

      {!bank ? (
        <Empty>Add your bank account in Masters → Banks to start.</Empty>
      ) : !rec ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Balance as per books" value={money(rec.bookBalance)} />
            <Kpi label="Balance as per bank" value={rec.bankBalance === null ? '—' : money(rec.bankBalance)} hint={rec.bankBalanceDate ? `statement ${rec.bankBalanceDate}` : 'upload a statement'} />
            <Kpi label="Matched" value={`${rec.counts.matched} / ${rec.counts.total}`} tone="green" />
            <Kpi label="To reconcile" value={String(rec.counts.unmatched + rec.unreconciledBook.length)} tone={rec.counts.unmatched + rec.unreconciledBook.length ? 'amber' : 'green'} />
          </div>

          <Card title="Bank reconciliation statement (BRS)">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr><td className="p-2 font-sans">Balance as per books</td><td className="p-2 text-right">{plain(rec.bookBalance)}</td></tr>
                <tr><td className="p-2 font-sans">Less: deposits entered in books, not yet in the bank</td><td className="p-2 text-right">− {plain(rec.depositsNotCredited)}</td></tr>
                <tr><td className="p-2 font-sans">Add: cheques / payments entered in books, not yet cleared</td><td className="p-2 text-right">+ {plain(rec.chequesNotPresented)}</td></tr>
                <tr><td className="p-2 font-sans">Add: credits in bank, not in books</td><td className="p-2 text-right">+ {plain(rec.bankOnlyIn)}</td></tr>
                <tr><td className="p-2 font-sans">Less: debits in bank, not in books (charges …)</td><td className="p-2 text-right">− {plain(rec.bankOnlyOut)}</td></tr>
                <tr className="font-black bg-slate-50"><td className="p-2 font-sans">Balance as per bank (computed)</td><td className="p-2 text-right">{plain(rec.computedBankBalance)}</td></tr>
              </tbody>
            </table>
            {rec.bankBalance !== null && Math.abs(rec.bankBalance - rec.computedBankBalance) > 0.5 && (
              <p className="mt-2 text-[11px] font-semibold text-amber-700">Differs from the statement balance by {money(Math.abs(rec.bankBalance - rec.computedBankBalance))} — check the opening balance of the bank ledger or statement lines before the first upload.</p>
            )}
            {rec.bankBalance !== null && Math.abs(rec.bankBalance - rec.computedBankBalance) <= 0.5 && <p className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Books and bank agree.</p>}
          </Card>

          <div className="grid xl:grid-cols-5 gap-4">
            <Card className="xl:col-span-3" title="Bank statement" actions={<div className="flex gap-1">{(['ALL', 'UNMATCHED'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={cx('px-2 py-1 rounded-lg text-[11px] font-bold', filter === f ? 'bg-slate-900 text-white' : 'text-slate-500')}>{f === 'ALL' ? 'All' : 'To match'}</button>)}</div>}>
              {lines.length === 0 ? (
                <Empty>{rec.counts.total ? 'Everything is matched. 🎉' : 'Upload a statement to begin.'}</Empty>
              ) : (
                <div className="overflow-x-auto">
                  {picked.size > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white">
                      <span className="font-bold">{picked.size} selected</span>
                      <span className="font-mono opacity-70">net {money(pickable.filter((l) => picked.has(l.id)).reduce((s, l) => s + l.credit - l.debit, 0))}</span>
                      <span className="flex-1" />
                      <Button size="sm" onClick={() => setLinking(pickable.filter((l) => picked.has(l.id)))}><Plus className="h-3.5 w-3.5" /> Book to customer / ledger</Button>
                      <Button size="sm" tone="secondary" busy={busy === 'ignore-many'} onClick={() => void act('ignore-many', { action: 'ignore-many', accountId: bank, lineIds: [...picked] }, `${picked.size} line(s) ignored.`).then(() => setPicked(new Set()))}><EyeOff className="h-3.5 w-3.5" /> Ignore</Button>
                      <button onClick={() => setPicked(new Set())} className="px-2 font-bold opacity-70 hover:opacity-100">Clear</button>
                    </div>
                  )}
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-6">
                          <input type="checkbox" title="Select all lines to match" checked={pickable.length > 0 && pickable.every((l) => picked.has(l.id))} onChange={(e) => setPicked(e.target.checked ? new Set(pickable.map((l) => l.id)) : new Set())} />
                        </th>
                        <th className="p-2 text-left">Date</th><th className="p-2 text-left">Narration</th><th className="p-2 text-right">Withdrawal</th><th className="p-2 text-right">Deposit</th><th className="p-2 text-left">Status</th><th className="p-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((l) => (
                        <tr key={l.id} className={cx(picked.has(l.id) && 'bg-emerald-50')}>
                          <td className="p-2">
                            {l.status === 'UNMATCHED' && !l.receiptNumber && (
                              <input type="checkbox" checked={picked.has(l.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} />
                            )}
                          </td>
                          <td className="p-2 whitespace-nowrap">{l.date}</td>
                          <td className="p-2"><div className="font-semibold">{l.description}</div>{l.reference && <div className="text-[10px] text-slate-400">{l.reference}</div>}</td>
                          <td className="p-2 text-right font-mono text-rose-700">{l.debit ? plain(l.debit) : ''}</td>
                          <td className="p-2 text-right font-mono text-emerald-700">{l.credit ? plain(l.credit) : ''}</td>
                          <td className="p-2">
                            <Badge tone={tone(l.status)}>{l.status === 'MATCHED' ? `✓ ${l.matchedTo}` : l.status.toLowerCase()}</Badge>
                            {l.status === 'UNMATCHED' && l.receiptNumber && <div className="mt-0.5 text-[10px] font-bold text-sky-700">{l.receiptNumber} awaiting approval</div>}
                          </td>
                          <td className="p-2 whitespace-nowrap text-right">
                            {l.status === 'UNMATCHED' && l.receiptNumber ? null : l.status === 'UNMATCHED' ? (
                              <div className="flex justify-end gap-1">
                                <button title="Match with a book entry" onClick={() => setMatching(l)} className="p-1 text-sky-700"><Link2 className="h-4 w-4" /></button>
                                <button title="Book to a customer / ledger" onClick={() => setLinking([l])} className="p-1 text-emerald-700"><Plus className="h-4 w-4" /></button>
                                <button title="Ignore" onClick={() => act(l.id, { action: 'ignore', lineId: l.id })} className="p-1 text-slate-400"><EyeOff className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <button title="Undo" onClick={() => act(l.id, { action: 'unmatch', lineId: l.id })} className="p-1 text-slate-400"><Unlink className="h-4 w-4" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card className="xl:col-span-2" title="In books, not in the bank yet">
              {rec.unreconciledBook.length === 0 ? (
                <Empty>Nothing pending.</Empty>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rec.unreconciledBook.map((b) => (
                    <div key={b.id} className="py-2 text-xs flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{b.party || b.narration}</div>
                        <div className="text-[10px] text-slate-400">{b.date} · {b.voucherNumber}</div>
                      </div>
                      <div className={cx('font-mono font-bold', b.debit ? 'text-emerald-700' : 'text-rose-700')}>{b.debit ? `+${plain(b.debit)}` : `−${plain(b.credit)}`}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {pending && (
        <Modal
          open
          full
          title={`Check before import · ${pending.file.name}`}
          onClose={() => setPending(null)}
          footer={
            <>
              <Button tone="secondary" onClick={() => setPending(null)}>Cancel</Button>
              <Button busy={busy === 'import'} disabled={!pending.preview.newCount} onClick={confirmImport}>
                <CheckCircle2 className="h-4 w-4" /> Import {pending.preview.newCount} line{pending.preview.newCount === 1 ? '' : 's'}
              </Button>
            </>
          }
        >
          {(() => {
            const p = pending.preview;
            // Counts follow what is chosen in the dropdowns.
            const isLinked = (v?: string) => !!v && !v.startsWith('pick-');
            const linked = Object.values(links).filter(isLinked).length;
            const usedBy = new Map(Object.entries(links).filter(([, id]) => isLinked(id)).map(([i, id]) => [id, Number(i)]));
            // Pick lists for lines the books don't have: customers (→ their receipt) and every other ledger (→ voucher).
            const all = ledgersQ.data ?? [];
            const customers = all.filter((a) => a.groupName === 'Sundry Debtors' && a.partyId).sort((a, b) => a.name.localeCompare(b.name));
            const others = all.filter((a) => a.id !== bank && !(a.groupName === 'Sundry Debtors' && a.partyId)).sort((a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name));
            const visible = p.lines.filter((l) => previewFilter === 'ALL' || (previewFilter === 'MATCH' ? isLinked(links[l.index]) : !l.exists && !isLinked(links[l.index])));
            const tickable = visible.filter((l) => !l.exists);
            const ticked = p.lines.filter((l) => bulkPick.has(l.index));
            const tickedIn = ticked.every((l) => l.credit > 0);
            // Apply one choice to every ticked line ('none' = leave unmatched). A customer receipt only fits money in.
            const applyBulk = () => {
              const next = { ...links };
              let skipped = 0;
              for (const l of ticked) {
                if (bulkTarget.startsWith('pay:') && !l.credit) skipped++;
                else next[l.index] = bulkTarget === 'none' ? '' : bulkTarget;
              }
              setLinks(next);
              setBulkPick(new Set());
              setBulkTarget('');
              showToast(`${ticked.length - skipped} line(s) set${skipped ? ` · ${skipped} withdrawal(s) skipped (a customer receipt needs money in)` : ''}.`);
            };
            const groups = [...new Set(others.map((a) => a.groupName))];
            return (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Into <strong>{p.account}</strong> · {p.from === p.to ? p.from : `${p.from} to ${p.to}`}. Check the dates, narration and amounts against your statement — nothing is saved until you import.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Kpi label="New lines" value={`${p.newCount} / ${p.total}`} tone="green" />
                  <Kpi label="Will match" value={`${linked} / ${p.newCount}`} tone={linked ? 'green' : 'amber'} hint={`${p.newCount - linked} not in books — create vouchers after import`} />
                  <Kpi label="Deposits" value={money(p.deposits)} />
                  <Kpi label="Withdrawals" value={money(p.withdrawals)} />
                  <Kpi label="Closing balance" value={p.closingBalance === null ? '—' : money(p.closingBalance)} hint={p.closingBalance === null ? 'no balance column found' : 'as per statement'} />
                </div>
                {p.existingCount > 0 && (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">
                    {p.existingCount} line(s) are already imported and will be skipped (shown faded).
                  </p>
                )}
                <div className="flex gap-1">
                  {([['ALL', 'All'], ['MATCH', 'Will match'], ['NOMATCH', 'No match']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setPreviewFilter(k)} className={cx('px-2.5 py-1 rounded-lg text-[11px] font-bold', previewFilter === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>
                      {label} ({k === 'ALL' ? p.total : k === 'MATCH' ? linked : p.newCount - linked})
                    </button>
                  ))}
                </div>
                {bulkPick.size > 0 && (
                  <div className="sticky -top-5 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white">
                    <span className="font-bold">{bulkPick.size} selected</span>
                    <span className="font-mono opacity-70">net {money(ticked.reduce((s, l) => s + l.credit - l.debit, 0))}</span>
                    <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className={cx(inputClass, 'w-80 py-1 text-[11px] text-slate-900')}>
                      <option value="">Set all to…</option>
                      <option value="none">No match — leave for later</option>
                      {tickedIn && (
                        <optgroup label="Customer (new receipt)">
                          {customers.map((c) => <option key={c.id} value={`pay:${c.partyId}`}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {groups.map((g) => (
                        <optgroup key={g} label={`${g} (new voucher)`}>
                          {others.filter((a) => a.groupName === g).map((a) => <option key={a.id} value={`led:${a.id}`}>{a.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <Button size="sm" disabled={!bulkTarget} onClick={applyBulk}>Apply</Button>
                    <span className="flex-1" />
                    <button onClick={() => setBulkPick(new Set())} className="px-2 font-bold opacity-70 hover:opacity-100">Clear</button>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky -top-5 z-10 bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="p-2 w-6">
                          <input type="checkbox" title="Select all shown" checked={tickable.length > 0 && tickable.every((l) => bulkPick.has(l.index))} onChange={(e) => setBulkPick(e.target.checked ? new Set(tickable.map((l) => l.index)) : new Set())} />
                        </th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Narration</th>
                        <th className="p-2 text-right">Withdrawal</th>
                        <th className="p-2 text-right">Deposit</th>
                        <th className="p-2 text-right">Balance</th>
                        <th className="p-2 text-left">Match in books</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map((l) => {
                        const v = links[l.index] || '';
                        const detected = l.party ? `pay:${l.party.customerId}` : '';
                        const mode = v === 'pick-cust' || (v.startsWith('pay:') && v !== detected) ? 'cust' : v === 'pick-led' || v.startsWith('led:') ? 'led' : 'main';
                        const set = (value: string) => setLinks({ ...links, [l.index]: value });
                        return (
                        <tr key={l.index} className={cx(l.exists && 'opacity-40', bulkPick.has(l.index) && 'bg-emerald-50')}>
                          <td className="p-2">
                            {!l.exists && <input type="checkbox" checked={bulkPick.has(l.index)} onChange={() => setBulkPick((s) => { const n = new Set(s); if (n.has(l.index)) n.delete(l.index); else n.add(l.index); return n; })} />}
                          </td>
                          <td className="p-2 whitespace-nowrap">{l.date}</td>
                          <td className="p-2">
                            <div className="break-all">{l.description}</div>
                            {l.reference && <div className="text-[10px] text-slate-400 font-mono">{l.reference}</div>}
                            {l.exists && <Badge tone="slate">Already imported</Badge>}
                          </td>
                          <td className="p-2 text-right font-mono text-rose-700">{l.debit ? plain(l.debit) : ''}</td>
                          <td className="p-2 text-right font-mono text-emerald-700">{l.credit ? plain(l.credit) : ''}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{l.balance === null ? '' : plain(l.balance)}</td>
                          <td className="p-2 w-64">
                            {l.exists ? null : (
                              <div className="space-y-1">
                                <select
                                  value={mode === 'cust' ? 'pick-cust' : mode === 'led' ? 'pick-led' : v}
                                  onChange={(e) => set(e.target.value)}
                                  className={cx(inputClass, 'py-1 text-[11px]', isLinked(v) ? 'border-emerald-400 bg-emerald-50' : 'border-amber-300')}
                                >
                                  <option value="">No match — leave for later</option>
                                  {l.party && <option value={detected}>New receipt from {l.party.name} (customer payment)</option>}
                                  {l.options.map((o) => {
                                    const other = usedBy.get(o.id);
                                    const taken = other !== undefined && other !== l.index;
                                    return (
                                      <option key={o.id} value={o.id} disabled={taken}>
                                        {o.voucherNumber} · {o.date} · {o.party}{taken ? ' (used on another line)' : ''}
                                      </option>
                                    );
                                  })}
                                  {!!l.credit && <option value="pick-cust">Choose customer… (new receipt)</option>}
                                  <option value="pick-led">Choose other ledger… (new {l.credit ? 'receipt' : 'payment'})</option>
                                </select>
                                {mode === 'cust' && (
                                  <select value={v.startsWith('pay:') ? v : ''} onChange={(e) => set(e.target.value || 'pick-cust')} className={cx(inputClass, 'py-1 text-[11px]', v.startsWith('pay:') ? 'border-emerald-400' : 'border-amber-300')}>
                                    <option value="">Select customer…</option>
                                    {customers.map((c) => <option key={c.id} value={`pay:${c.partyId}`}>{c.name}</option>)}
                                  </select>
                                )}
                                {mode === 'led' && (
                                  <select value={v.startsWith('led:') ? v : ''} onChange={(e) => set(e.target.value || 'pick-led')} className={cx(inputClass, 'py-1 text-[11px]', v.startsWith('led:') ? 'border-emerald-400' : 'border-amber-300')}>
                                    <option value="">Select ledger…</option>
                                    {others.map((a) => <option key={a.id} value={`led:${a.id}`}>{a.name} · {a.groupName}</option>)}
                                  </select>
                                )}
                                {v === detected && l.party && <div className="text-[10px] font-bold text-emerald-700">Customer found in narration · receipt goes to their ledger</div>}
                                {v.startsWith('pay:') && v !== detected && <div className="text-[10px] text-slate-500">Customer payment — their outstanding goes down</div>}
                                {v !== (l.match?.id || detected) && isLinked(v) && <div className="text-[10px] font-bold text-sky-700">Changed by you{l.match ? ` (auto: ${l.match.voucherNumber})` : ''}</div>}
                              </div>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {matching && rec && (
        <Modal open title="Match with a book entry" onClose={() => setMatching(null)}>
          <p className="text-xs text-slate-600">{matching.date} · {matching.description} · <strong>{money(matching.debit || matching.credit)}</strong> {matching.credit ? 'deposit' : 'withdrawal'}</p>
          {(() => {
            const options = rec.unreconciledBook.filter((b) => (matching.credit ? Math.abs(b.debit - matching.credit) < 0.01 : Math.abs(b.credit - matching.debit) < 0.01));
            return options.length ? (
              <div className="divide-y divide-slate-100">
                {options.map((b) => (
                  <button key={b.id} onClick={async () => { await act('match', { action: 'match', lineId: matching.id, voucherLineId: b.id }, 'Matched.'); setMatching(null); }} className="w-full text-left py-2 text-xs hover:bg-slate-50 flex justify-between">
                    <span><strong>{b.voucherNumber}</strong> · {b.date} · {b.party || b.narration}</span>
                    <span className="font-mono">{plain(b.debit || b.credit)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Empty>No unmatched book entry has this amount. Use “create voucher” instead.</Empty>
            );
          })()}
        </Modal>
      )}
      {linking && (
        <LinkModal
          lines={linking}
          bank={bank}
          ledgers={ledgersQ.data ?? []}
          onClose={() => setLinking(null)}
          onDone={(m) => {
            showToast(m);
            setLinking(null);
            setPicked(new Set());
            recQ.reload();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

/** Book one or many bank lines to a customer (their receipt) or any other ledger (receipt / payment voucher). */
function LinkModal({ lines, bank, ledgers, onClose, onDone, onError }: { lines: StatementLine[]; bank: string; ledgers: LedgerOption[]; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const allIn = lines.every((l) => l.credit > 0);
  const allOut = lines.every((l) => l.debit > 0);
  const [kind, setKind] = useState<'customer' | 'ledger'>(allIn ? 'customer' : 'ledger');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const customers = ledgers.filter((a) => a.groupName === 'Sundry Debtors' && a.partyId).sort((a, b) => a.name.localeCompare(b.name));
  const others = ledgers.filter((a) => a.id !== bank && !(a.groupName === 'Sundry Debtors' && a.partyId));
  const groups = [...new Set(others.map((l) => l.groupName))].sort();
  const total = lines.reduce((s, l) => s + l.credit - l.debit, 0);
  const save = async () => {
    setBusy(true);
    try {
      const link = kind === 'customer' ? `pay:${target}` : `led:${target}`;
      const r = await apiWithMessage('/api/books/bank-rec', { action: 'link', accountId: bank, lineIds: lines.map((l) => l.id), link }, 'PATCH');
      onDone(r.message || 'Done.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title={lines.length === 1 ? (lines[0].credit ? 'Book money received' : 'Book money paid') : `Book ${lines.length} lines`}
      onClose={onClose}
      footer={<Button busy={busy} disabled={!target} onClick={save}>{kind === 'customer' ? `Create ${lines.length} receipt${lines.length === 1 ? '' : 's'}` : `Create ${lines.length} voucher${lines.length === 1 ? '' : 's'}`}</Button>}
    >
      {lines.length === 1 ? (
        <p className="text-xs text-slate-600">{lines[0].date} · <strong>{money(lines[0].debit || lines[0].credit)}</strong> {lines[0].credit ? 'came into' : 'went out of'} the bank · <span className="break-all">{lines[0].description}</span></p>
      ) : (
        <p className="text-xs text-slate-600"><strong>{lines.length}</strong> lines · net <strong>{money(total)}</strong> {total >= 0 ? 'in' : 'out'}. Each line gets its own entry.</p>
      )}
      {!allIn && !allOut && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-semibold text-amber-800">Money in and money out are mixed — only a ledger can take both.</p>}
      <div className="flex gap-1">
        {allIn && <button onClick={() => { setKind('customer'); setTarget(''); }} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', kind === 'customer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>Customer (receipt)</button>}
        <button onClick={() => { setKind('ledger'); setTarget(''); }} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', kind === 'ledger' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>Other ledger</button>
      </div>
      {kind === 'customer' ? (
        <Field label="Customer" hint="A payment is entered for the customer and their outstanding goes down. Super Admin: verified at once; others: goes to the Approval queue.">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
            <option value="">Choose customer…</option>
            {customers.map((c) => <option key={c.id} value={c.partyId!}>{c.name}</option>)}
          </select>
        </Field>
      ) : (
        <Field label={allIn ? 'Received from / for (ledger)' : allOut ? 'Paid to / for (ledger)' : 'Ledger'}>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
            <option value="">Choose ledger…</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {others.filter((l) => l.groupName === g).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}
