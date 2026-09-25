'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Library, Pencil, Plus, Printer, Search } from 'lucide-react';
import { GROUPS } from '../../lib/books';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Button, Card, Empty, Field, inputClass, Modal, cx, useToast } from '../ui';
import { BooksHeader, drCr, PeriodBar, plain, useBooksReport, usePeriod, VoucherBadge } from './shared';
import { VOUCHER_TYPES, VoucherType } from '../../lib/books';

interface Account { id: string; code: string; name: string; groupName: string; nature: string; systemKey: string | null; partyId: string | null; opening: number; debit: number; credit: number; closing: number }
interface Statement {
  account: { id: string; name: string; code: string; groupName: string; gstin: string | null };
  from: string;
  to: string;
  opening: number;
  rows: { date: string; voucherId: string; voucherNumber: string; voucherType: VoucherType; particulars: string; narration: string | null; debit: number; credit: number; balance: number }[];
  totalDebit: number;
  totalCredit: number;
  closing: number;
}

export default function LedgersPanel() {
  const [toast, showToast] = useToast();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [selected, setSelected] = useState<Account | null>(null);
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const q = useApiData<Account[]>('/api/books/accounts', (m) => showToast(m, 'error'));
  const accounts = q.data ?? [];
  const filtered = accounts.filter((a) => (!group || a.groupName === group) && (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())));
  const groups = useMemo(() => GROUPS.map((g) => ({ ...g, accounts: filtered.filter((a) => a.groupName === g.name) })).filter((g) => g.accounts.length), [filtered]);

  if (selected) return <LedgerStatement account={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={Library} title="Ledgers (chart of accounts)" subtitle="Every ledger with its balance for the financial year to date. Customers, suppliers, cash wallets, banks and expense heads get their ledgers automatically." actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New ledger</Button>} />
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ledger" className={cx(inputClass, 'pl-9 py-1.5 w-64')} />
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={cx(inputClass, 'w-56 py-1.5 text-xs')}>
          <option value="">All groups</option>
          {GROUPS.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      {q.loading && !q.data ? (
        <Empty>Loading ledgers…</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {groups.map((g) => {
            const total = g.accounts.reduce((s, a) => s + a.closing, 0);
            return (
              <Card key={g.name} title={<span className="flex items-center gap-2">{g.name} <span className="text-[10px] font-bold text-slate-400 uppercase">{g.nature.toLowerCase()}</span></span>} actions={<span className="text-xs font-mono font-black">{drCr(Math.round(total * 100) / 100)}</span>}>
                <div className="divide-y divide-slate-100">
                  {g.accounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 text-xs group">
                      <button onClick={() => setSelected(a)} className="min-w-0 text-left">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 truncate">{a.name}</div>
                        <div className="text-[10px] text-slate-400">{a.code}{a.opening ? ` · opening ${drCr(a.opening)}` : ''}</div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={cx('font-mono font-bold', a.closing < 0 ? 'text-rose-700' : 'text-slate-900')}>{drCr(a.closing)}</span>
                        {!a.partyId && (
                          <button onClick={() => setEditing(a)} className="text-slate-300 hover:text-slate-700" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <LedgerForm
          account={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            showToast(m);
            setEditing(null);
            q.reload();
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}
    </div>
  );
}

function LedgerForm({ account, onClose, onSaved, onError }: { account: Account | null; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const system = !!account?.systemKey;
  const [name, setName] = useState(account?.name || '');
  const [groupName, setGroupName] = useState(account?.groupName || 'Indirect Expenses');
  const [opening, setOpening] = useState(account ? String(Math.abs(account.opening)) : '');
  const [side, setSide] = useState<'Dr' | 'Cr'>(account && account.opening < 0 ? 'Cr' : 'Dr');
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/books/accounts', { body: { id: account?.id, name, groupName, openingBalance: (Number(opening) || 0) * (side === 'Dr' ? 1 : -1), gstin } });
      onSaved('Ledger saved.');
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={account ? `Edit ${account.name}` : 'New ledger'} onClose={onClose} footer={<Button busy={busy} disabled={!name.trim()} onClick={save}>Save ledger</Button>}>
      {system && <p className="text-[11px] text-amber-700 font-semibold">This ledger is kept by the system — only its opening balance can be changed.</p>}
      <Field label="Ledger name"><input value={name} disabled={system} onChange={(e) => setName(e.target.value)} placeholder="e.g. Capital - Hem Singh, HDFC OD, Vehicle (Tata Ace)" className={inputClass} /></Field>
      <Field label="Group (as in Tally)">
        <select value={groupName} disabled={system} onChange={(e) => setGroupName(e.target.value)} className={inputClass}>
          {GROUPS.map((g) => <option key={g.name} value={g.name}>{g.name} — {g.nature.toLowerCase()}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Opening balance" className="col-span-2" hint="As on the day you start the books (e.g. 1 April)."><input type="number" min={0} step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} className={inputClass} /></Field>
        <Field label="Dr / Cr">
          <select value={side} onChange={(e) => setSide(e.target.value as 'Dr' | 'Cr')} className={inputClass}>
            <option>Dr</option>
            <option>Cr</option>
          </select>
        </Field>
      </div>
      {!system && <Field label="GSTIN (optional)"><input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className={inputClass} /></Field>}
      <p className="text-[11px] text-slate-500">Tip: capital, loans and assets are usually Cr / Dr respectively — e.g. Capital Cr, Bank Dr, Vehicle Dr, Loan Cr.</p>
    </Modal>
  );
}

function LedgerStatement({ account, onBack }: { account: Account; onBack: () => void }) {
  const [toast, showToast] = useToast();
  const [period, setPeriod] = usePeriod('fy');
  const q = useBooksReport<Statement>('ledger', period, `&accountId=${account.id}`, (m) => showToast(m, 'error'));
  const s = q.data;
  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button tone="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All ledgers</Button>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodBar value={period} onChange={setPeriod} />
          <Button tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Ledger account</div>
            <h2 className="text-lg font-black text-slate-900">{account.name}</h2>
            <div className="text-xs text-slate-500">{account.groupName} · {account.code}{s?.account.gstin ? ` · GSTIN ${s.account.gstin}` : ''}</div>
          </div>
          <div className="text-right text-xs">
            <div className="text-slate-500">{period.from} to {period.to}</div>
            <div className="text-lg font-black font-mono">{s ? drCr(s.closing) : '…'}</div>
            <div className="text-[10px] text-slate-400">closing balance</div>
          </div>
        </div>
        {!s ? (
          <Empty>Loading…</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Particulars</th>
                  <th className="p-2 text-left">Voucher</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2">{period.from}</td>
                  <td className="p-2">Opening balance</td>
                  <td />
                  <td className="p-2 text-right font-mono">{s.opening > 0 ? plain(s.opening) : ''}</td>
                  <td className="p-2 text-right font-mono">{s.opening < 0 ? plain(-s.opening) : ''}</td>
                  <td className="p-2 text-right font-mono">{drCr(s.opening)}</td>
                </tr>
                {s.rows.map((r, i) => (
                  <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
                    <td className="p-2 whitespace-nowrap">{r.date}</td>
                    <td className="p-2">
                      <div className="font-bold">{r.particulars}</div>
                      {r.narration && <div className="text-[10px] text-slate-400">{r.narration}</div>}
                    </td>
                    <td className="p-2 whitespace-nowrap"><VoucherBadge type={r.voucherType} label={VOUCHER_TYPES[r.voucherType]?.label || r.voucherType} /> <span className="font-mono text-[10px] text-slate-500">{r.voucherNumber}</span></td>
                    <td className="p-2 text-right font-mono">{r.debit ? plain(r.debit) : ''}</td>
                    <td className="p-2 text-right font-mono">{r.credit ? plain(r.credit) : ''}</td>
                    <td className="p-2 text-right font-mono font-bold">{drCr(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                <tr>
                  <td className="p-2" colSpan={3}>Totals · closing balance</td>
                  <td className="p-2 text-right font-mono">{plain(s.totalDebit)}</td>
                  <td className="p-2 text-right font-mono">{plain(s.totalCredit)}</td>
                  <td className="p-2 text-right font-mono">{drCr(s.closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
