'use client';

import React, { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Card, Empty, Field, inputClass, Modal } from '../ui';
import { COMPLAINT_TYPES } from './ComplaintsPanel';

interface Row { id: string; complaintNumber: string; category: string; description: string; status: string; resolution: string | null; createdAt: string }

/** Customer portal: raise a complaint and follow its status. */
export default function CustomerComplaints({ onToast }: { onToast: (m: string, tone?: 'error') => void }) {
  const { t } = useT();
  const q = useApiData<{ rows: Row[] }>('/api/ops/complaints', (m) => onToast(m, 'error'));
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ category: 'DELAY', description: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const c = await api<{ complaintNumber: string }>('/api/ops/complaints', { body: v });
      onToast(t('Complaint {n} registered. We will call you soon.', { n: c.complaintNumber }));
      setOpen(false);
      setV({ category: 'DELAY', description: '' });
      q.reload();
    } catch (e) {
      onToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const rows = q.data?.rows ?? [];
  return (
    <Card title={t('Complaints')} actions={<Button size="sm" onClick={() => setOpen(true)}><MessageSquareWarning className="h-3.5 w-3.5" /> {t('Raise complaint')}</Button>}>
      {rows.length === 0 ? <Empty>{t('No complaints.')}</Empty> : rows.map((c) => (
        <div key={c.id} className="py-2 border-b border-slate-50 text-xs">
          <div className="flex justify-between gap-2"><span><strong className="font-mono">{c.complaintNumber}</strong> · {t(COMPLAINT_TYPES.find(([k]) => k === c.category)?.[1] || c.category)}</span><Badge tone={c.status === 'OPEN' ? 'red' : c.status === 'ASSIGNED' ? 'amber' : 'green'}>{t(c.status === 'ASSIGNED' ? 'In progress' : c.status === 'OPEN' ? 'Open' : 'Resolved')}</Badge></div>
          <div className="text-slate-500">{c.description}</div>
          {c.resolution && <div className="text-emerald-700">{c.resolution}</div>}
        </div>
      ))}
      {open && (
        <Modal open title={t('Raise complaint')} onClose={() => setOpen(false)} footer={<Button busy={busy} disabled={v.description.trim().length < 3} onClick={save}>{t('Submit')}</Button>}>
          {v.category === 'LEAK' && <p className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{t('Gas leak: close the regulator, open doors and windows, do not switch on lights. Call us right away.')}</p>}
          <Field label={t('Type')}><select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} className={inputClass}>{COMPLAINT_TYPES.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></Field>
          <Field label={t('What happened')}><textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={inputClass} /></Field>
        </Modal>
      )}
    </Card>
  );
}
