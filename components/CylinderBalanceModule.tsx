'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileBadge, Search } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { useSession } from '../lib/auth';
import { Button, Card, Empty, Field, inputClass, Modal, PartyName, StatusBadge, cx, dateTime, partyLabel, today, useToast } from './ui';

// Customer cylinder holdings (Opening + Delivered − Empty ± Adjustment) and
// caution-deposit vouchers (SV / TV).

interface HoldingRow { id: string; productName: string; currentBalance: number; deliveredQtyTotal: number; emptyReceivedTotal: number; customer: { name: string; shortName: string | null; customerCode: string; phone: string; area: string | null }; customerId: string }
interface HistoryRow { id: string; date: string; type: string; productName: string; change: number; balance: number; reference: string | null; reason: string | null; by: string }
interface Voucher { id: string; voucherNumber: string; voucherType: string; customerId: string; customer: { name: string; shortName: string | null; customerCode: string }; productName: string | null; cylinderQty: number; regulatorQty: number; depositAmount: number; issueDate: string; status: string; notes: string | null }

export default function CylinderBalanceModule({ initialSubTab = 'customer' }: { initialSubTab?: string }) {
  const { can } = useSession();
  const [tab, setTab] = useState(initialSubTab === 'voucher' ? 'voucher' : 'customer');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<{ customerName: string; rows: HistoryRow[] } | null>(null);
  const [voucherForm, setVoucherForm] = useState<Partial<Voucher> & { productId?: string } | null>(null);
  const [toast, showToast] = useToast();
  const rowsQ = useApiData<HoldingRow[]>('/api/reports?type=cylinder-balance', (m) => showToast(m, 'error'));
  const vouchersQ = useApiData<Voucher[]>('/api/cylinder/vouchers', (m) => showToast(m, 'error'));
  const rows = useMemo(() => rowsQ.data ?? [], [rowsQ.data]);
  const vouchers = vouchersQ.data ?? [];
  const load = () => {
    rowsQ.reload();
    vouchersQ.reload();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? rows.filter((r) => r.customer.name.toLowerCase().includes(q) || (r.customer.shortName || '').toLowerCase().includes(q) || r.customer.phone.includes(q) || r.customer.customerCode.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const openHistory = async (customerId: string, customerName: string) => {
    try {
      const data = await api<{ history: HistoryRow[] }>(`/api/cylinder/ledger?customerId=${customerId}`);
      setHistory({ customerName, rows: data.history });
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Customer Cylinders</h2>
        <div className="flex gap-2">
          {(['customer', 'voucher'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
              {t === 'customer' ? 'Holdings' : 'SV / TV vouchers'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'customer' ? (
        <Card
          title="Cylinders with customers"
          actions={
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={cx(inputClass, 'pl-8 py-1.5 w-56')} />
            </div>
          }
        >
          {filtered.length === 0 ? (
            <Empty>No cylinders with customers.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Delivered</th>
                  <th className="p-2 text-right">Empty received</th>
                  <th className="p-2 text-right">Holding now</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2"><PartyName short={r.customer.shortName} legal={r.customer.name} /><div className="text-[10px] text-slate-400">{r.customer.customerCode} · {r.customer.area || r.customer.phone}</div></td>
                    <td className="p-2">{r.productName}</td>
                    <td className="p-2 text-right">{r.deliveredQtyTotal}</td>
                    <td className="p-2 text-right">{r.emptyReceivedTotal}</td>
                    <td className="p-2 text-right font-black">{r.currentBalance}</td>
                    <td className="p-2 text-right"><Button size="sm" tone="ghost" onClick={() => openHistory(r.customerId, partyLabel(r.customer.shortName, r.customer.name))}>History</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <Card title="Deposit vouchers" actions={can('customers.manage') && <Button size="sm" onClick={() => setVoucherForm({ voucherType: 'SV', cylinderQty: 1, regulatorQty: 1, depositAmount: 0, issueDate: today(), status: 'ACTIVE' })}><FileBadge className="h-3.5 w-3.5" /> Issue voucher</Button>}>
          {vouchers.length === 0 ? (
            <Empty>No vouchers issued.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="p-2">Voucher</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Cyl / Reg</th>
                  <th className="p-2 text-right">Deposit</th>
                  <th className="p-2">Status</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="p-2 font-mono font-bold">{v.voucherNumber}<div className="text-[10px] text-slate-400">{v.issueDate}</div></td>
                    <td className="p-2"><PartyName short={v.customer.shortName} legal={v.customer.name} /></td>
                    <td className="p-2">{v.productName || '—'}</td>
                    <td className="p-2 text-right">{v.cylinderQty} / {v.regulatorQty}</td>
                    <td className="p-2 text-right font-mono">{inr(v.depositAmount)}</td>
                    <td className="p-2"><StatusBadge status={v.status} /></td>
                    <td className="p-2 text-right">{can('customers.manage') && <Button size="sm" tone="ghost" onClick={() => setVoucherForm(v)}>Edit</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={!!history} title={`Cylinder ledger — ${history?.customerName}`} onClose={() => setHistory(null)} wide>
        {history && (
          <table className="w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Type</th>
                <th className="p-2">Product</th>
                <th className="p-2 text-right">Change</th>
                <th className="p-2 text-right">Balance</th>
                <th className="p-2">Ref</th>
              </tr>
            </thead>
            <tbody>
              {history.rows.map((h) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="p-2">{dateTime(h.date)}</td>
                  <td className="p-2 font-bold">{h.type.replace(/_/g, ' ')}</td>
                  <td className="p-2">{h.productName}</td>
                  <td className={cx('p-2 text-right font-bold', h.change < 0 ? 'text-emerald-700' : 'text-slate-900')}>{h.change > 0 ? '+' : ''}{h.change}</td>
                  <td className="p-2 text-right font-black">{h.balance}</td>
                  <td className="p-2">{h.reference}<div className="text-[10px] text-slate-400">{h.reason} · {h.by}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {voucherForm && <VoucherModal initial={voucherForm} onClose={() => setVoucherForm(null)} onSaved={() => { setVoucherForm(null); showToast('Voucher saved.'); void load(); }} onError={(m) => showToast(m, 'error')} />}
    </div>
  );
}

function VoucherModal({ initial, onClose, onSaved, onError }: { initial: Partial<Voucher> & { productId?: string }; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [form, setForm] = useState(initial);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ id: string; name: string }[]>('/api/customers?status=ACTIVE').then(setCustomers).catch(() => {});
    api<{ id: string; name: string }[]>('/api/products').then(setProducts).catch(() => {});
  }, []);
  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/cylinder/vouchers', { body: form });
      onSaved();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={form.id ? `Edit ${form.voucherNumber}` : 'Issue voucher'} onClose={onClose} footer={<Button busy={busy} disabled={!form.customerId} onClick={submit}>Save</Button>}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select value={form.voucherType} onChange={(e) => setForm({ ...form, voucherType: e.target.value })} className={inputClass}>
            <option value="SV">SV — Subscription</option>
            <option value="TV">TV — Transfer</option>
          </select>
        </Field>
        <Field label="Issue date"><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputClass} /></Field>
      </div>
      <Field label="Customer">
        <select value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className={inputClass} disabled={!!form.id}>
          <option value="">Select…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Product">
        <select value={form.productId || ''} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={inputClass}>
          <option value="">—</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Cylinders"><input type="number" min={1} value={form.cylinderQty} onChange={(e) => setForm({ ...form, cylinderQty: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Regulators"><input type="number" min={0} value={form.regulatorQty} onChange={(e) => setForm({ ...form, regulatorQty: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Deposit ₹"><input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })} className={inputClass} /></Field>
      </div>
      <Field label="Status">
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
          {['ACTIVE', 'TRANSFERRED', 'REFUNDED', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Notes"><input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} /></Field>
    </Modal>
  );
}
