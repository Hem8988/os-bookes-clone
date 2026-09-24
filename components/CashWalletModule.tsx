'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, errorMessage, inr } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { Button, Card, Empty, Modal, Stat, StatusBadge, dateTime, useToast } from './ui';

// Cash wallets (SRS §9.5): each delivery boy's cash in hand, the company
// cash wallet and the hand-over (submission) history.

interface WalletRow { id: string; ownerType: string; ownerName: string; balance: number; pendingSubmission: number; updatedAt: string }
interface WalletTxn { id: string; type: string; amount: number; balanceAfter: number; notes: string | null; performedBy: string; createdAt: string }
interface Submission { id: string; submissionNumber: string; deliveryBoyName: string; receiverName: string; amount: number; date: string; status: string; verifiedBy: string | null; rejectionReason: string | null; proofUrl: string | null }

export default function CashWalletModule() {
  const [history, setHistory] = useState<{ wallet: WalletRow; rows: WalletTxn[] } | null>(null);
  const [toast, showToast] = useToast();
  const walletsQ = useApiData<WalletRow[]>('/api/financial/wallets', (m) => showToast(m, 'error'));
  const submissionsQ = useApiData<Submission[]>('/api/financial/cash-submission', (m) => showToast(m, 'error'));
  const wallets = walletsQ.data ?? [];
  const submissions = submissionsQ.data ?? [];
  const load = () => {
    walletsQ.reload();
    submissionsQ.reload();
  };

  const openHistory = async (wallet: WalletRow) => {
    try {
      setHistory({ wallet, rows: await api<WalletTxn[]>(`/api/financial/wallets?walletId=${wallet.id}`) });
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const company = wallets.filter((w) => w.ownerType === 'COMPANY');
  const boys = wallets.filter((w) => w.ownerType === 'DELIVERY_BOY');
  return (
    <div className="space-y-4">
      {toast}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Cash Wallets</h2>
        <Button tone="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {company.map((w) => <Stat key={w.id} label="Company cash" value={inr(w.balance)} />)}
        <Stat label="With delivery boys" value={inr(boys.reduce((s, w) => s + w.balance, 0))} />
        <Stat label="Pending hand-overs" value={inr(boys.reduce((s, w) => s + w.pendingSubmission, 0))} tone="text-amber-600" />
      </div>
      <Card title="Delivery boy wallets">
        {boys.length === 0 ? (
          <Empty>No wallets yet.</Empty>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-2">Delivery boy</th>
                <th className="p-2 text-right">Cash in hand</th>
                <th className="p-2 text-right">Pending submission</th>
                <th className="p-2">Updated</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {[...company, ...boys].map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold">{w.ownerName}</td>
                  <td className="p-2 text-right font-mono font-black">{inr(w.balance)}</td>
                  <td className="p-2 text-right font-mono">{w.ownerType === 'COMPANY' ? '—' : inr(w.pendingSubmission)}</td>
                  <td className="p-2">{dateTime(w.updatedAt)}</td>
                  <td className="p-2 text-right"><Button size="sm" tone="ghost" onClick={() => openHistory(w)}>History</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Cash submissions (approve in the Approval Queue)">
        {submissions.length === 0 ? (
          <Empty>No submissions.</Empty>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-2">No.</th>
                <th className="p-2">From → To</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono font-bold">{s.submissionNumber}<div className="text-[10px] text-slate-400">{s.date}</div></td>
                  <td className="p-2">{s.deliveryBoyName} → {s.receiverName}</td>
                  <td className="p-2 text-right font-mono font-bold">{inr(s.amount)}</td>
                  <td className="p-2"><StatusBadge status={s.status} />{s.rejectionReason && <div className="text-[10px] text-rose-600">{s.rejectionReason}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={!!history} title={`Wallet — ${history?.wallet.ownerName}`} onClose={() => setHistory(null)} wide>
        {history && (
          <table className="w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Type</th>
                <th className="p-2">Details</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.rows.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="p-2">{dateTime(t.createdAt)}</td>
                  <td className="p-2 font-bold">{t.type}</td>
                  <td className="p-2">{t.notes}<div className="text-[10px] text-slate-400">{t.performedBy}</div></td>
                  <td className={`p-2 text-right font-mono ${t.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{inr(t.amount)}</td>
                  <td className="p-2 text-right font-mono font-bold">{inr(t.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
