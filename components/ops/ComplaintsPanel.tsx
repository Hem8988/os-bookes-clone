'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquareWarning, Plus, UserCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { Badge, Button, Field, inputClass, Modal, cx, dateTime, useToast } from '../ui';
import { BooksHeader, Kpi, Tabs } from '../books/shared';

interface Complaint { id: string; complaintNumber: string; customerId: string | null; customerName: string; phone: string | null; category: string; priority: string; description: string; orderNumber: string | null; status: string; assignedToName: string | null; resolution: string | null; source: string; createdBy: string; createdAt: string; resolvedAt: string | null }
interface Staff { id: string; name: string; role: string }
interface Party { id: string; name: string; shortName?: string | null }

export const COMPLAINT_TYPES: [string, string][] = [
  ['LEAK', 'Gas leak'],
  ['SHORT_WEIGHT', 'Short weight'],
  ['DELAY', 'Late delivery'],
  ['DAMAGED_CYLINDER', 'Damaged cylinder / valve'],
  ['BILLING', 'Billing'],
  ['STAFF', 'Staff behaviour'],
  ['OTHER', 'Other'],
];
const typeLabel = (k: string) => COMPLAINT_TYPES.find(([x]) => x === k)?.[1] || k;
const PRIORITY_TONE: Record<string, 'red' | 'amber' | 'blue' | 'slate'> = { URGENT: 'red', HIGH: 'amber', NORMAL: 'blue', LOW: 'slate' };
const STATUS_TONE: Record<string, 'red' | 'amber' | 'green' | 'slate'> = { OPEN: 'red', ASSIGNED: 'amber', RESOLVED: 'green', CLOSED: 'slate' };

export default function ComplaintsPanel() {
  const [toast, showToast] = useToast();
  const onError = (m: string) => showToast(m, 'error');
  const [tab, setTab] = useState<'open' | 'all'>('open');
  const q = useApiData<{ rows: Complaint[]; staff: Staff[] }>(`/api/ops/complaints${tab === 'open' ? '?status=OPEN,ASSIGNED' : ''}`, onError);
  const rows = useMemo(() => q.data?.rows ?? [], [q.data]);
  const [creating, setCreating] = useState(false);
  // Open complaints show their age as of when the screen was opened.
  const [now] = useState(() => Date.now());
  const [acting, setActing] = useState<{ c: Complaint; action: 'assign' | 'resolve' } | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (body: object, msg: string) => {
    setBusy(true);
    try {
      await api('/api/ops/complaints', { method: 'PATCH', body });
      showToast(msg);
      setActing(null);
      q.reload();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const hours = (c: Complaint) => Math.round(((c.resolvedAt ? new Date(c.resolvedAt).getTime() : now) - new Date(c.createdAt).getTime()) / 3_600_000);

  return (
    <div className="space-y-4">
      {toast}
      <BooksHeader icon={MessageSquareWarning} title="Complaints" subtitle="Leaks, short weight, late delivery, billing — who is handling it and how fast it was solved. Gas leaks are always urgent." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New complaint</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Open" value={String(rows.filter((r) => r.status === 'OPEN').length)} tone="red" />
        <Kpi label="Being handled" value={String(rows.filter((r) => r.status === 'ASSIGNED').length)} tone="amber" />
        <Kpi label="Urgent / leak" value={String(rows.filter((r) => r.priority === 'URGENT' && r.status !== 'CLOSED' && r.status !== 'RESOLVED').length)} tone="red" />
        <Kpi label="Avg. hours to resolve" value={(() => { const done = rows.filter((r) => r.resolvedAt); return done.length ? String(Math.round(done.reduce((s, r) => s + hours(r), 0) / done.length)) : '—'; })()} />
      </div>
      <Tabs value={tab} onChange={setTab} items={[['open', 'Open & assigned'], ['all', 'All']]} />
      <div className="space-y-2">
        {rows.length === 0 && <div className="py-10 text-center text-xs text-slate-400 font-semibold">No complaints. 🎉</div>}
        {rows.map((c) => (
          <div key={c.id} className={cx('rounded-2xl border bg-white p-4 flex flex-wrap items-start justify-between gap-3', c.priority === 'URGENT' && c.status !== 'RESOLVED' && c.status !== 'CLOSED' ? 'border-rose-300' : 'border-slate-200')}>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold">{c.complaintNumber}</span>
                <Badge tone={PRIORITY_TONE[c.priority] || 'slate'}>{c.priority}</Badge>
                <Badge tone={STATUS_TONE[c.status] || 'slate'}>{c.status}</Badge>
                <span className="text-xs font-bold text-slate-700">{typeLabel(c.category)}</span>
                {c.source !== 'STAFF' && <Badge tone="blue">{c.source.replace('_', ' ').toLowerCase()}</Badge>}
              </div>
              <div className="text-sm font-black text-slate-900">{c.customerName}{c.phone ? <span className="font-normal text-slate-400 text-xs"> · {c.phone}</span> : null}</div>
              <p className="text-xs text-slate-600">{c.description}</p>
              {c.resolution && <p className="text-xs text-emerald-700"><strong>Resolved:</strong> {c.resolution}</p>}
              <div className="text-[10px] text-slate-400">{dateTime(c.createdAt)} · by {c.createdBy}{c.assignedToName ? ` · with ${c.assignedToName}` : ''}{c.orderNumber ? ` · order ${c.orderNumber}` : ''} · {hours(c)} h</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(c.status === 'OPEN' || c.status === 'ASSIGNED') && <Button size="sm" tone="secondary" onClick={() => setActing({ c, action: 'assign' })}><UserCheck className="h-3.5 w-3.5" /> {c.status === 'ASSIGNED' ? 'Reassign' : 'Assign'}</Button>}
              {(c.status === 'OPEN' || c.status === 'ASSIGNED') && <Button size="sm" onClick={() => setActing({ c, action: 'resolve' })}><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</Button>}
              {c.status === 'RESOLVED' && <Button size="sm" tone="ghost" busy={busy} onClick={() => act({ id: c.id, action: 'close' }, 'Closed.')}>Close</Button>}
              {(c.status === 'RESOLVED' || c.status === 'CLOSED') && <Button size="sm" tone="ghost" busy={busy} onClick={() => act({ id: c.id, action: 'reopen' }, 'Re-opened.')}>Re-open</Button>}
            </div>
          </div>
        ))}
      </div>

      {creating && <NewComplaint onClose={() => setCreating(false)} onSaved={(m) => { showToast(m); setCreating(false); q.reload(); }} onError={onError} />}
      {acting && <Act c={acting.c} action={acting.action} staff={q.data?.staff ?? []} busy={busy} onClose={() => setActing(null)} onSubmit={(body) => act({ id: acting.c.id, action: acting.action, ...body }, acting.action === 'assign' ? 'Assigned.' : 'Resolved — the customer is informed on WhatsApp.')} />}
    </div>
  );
}

function NewComplaint({ onClose, onSaved, onError }: { onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const customers = useApiData<Party[]>('/api/customers', onError).data ?? [];
  const [v, setV] = useState({ customerId: '', category: 'LEAK', priority: 'NORMAL', description: '', orderNumber: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const c = await api<{ complaintNumber: string }>('/api/ops/complaints', { body: v });
      onSaved(`Complaint ${c.complaintNumber} registered.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="New complaint" onClose={onClose} footer={<Button busy={busy} disabled={!v.customerId || v.description.trim().length < 3} onClick={save}>Register</Button>}>
      <Field label="Customer"><select value={v.customerId} onChange={(e) => setV({ ...v, customerId: e.target.value })} className={inputClass}><option value="">Choose customer…</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.shortName || c.name}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} className={inputClass}>{COMPLAINT_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Priority" hint={v.category === 'LEAK' ? 'Leaks are always urgent.' : undefined}><select value={v.category === 'LEAK' ? 'URGENT' : v.priority} disabled={v.category === 'LEAK'} onChange={(e) => setV({ ...v, priority: e.target.value })} className={inputClass}>{['URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => <option key={p}>{p}</option>)}</select></Field>
      </div>
      <Field label="What happened"><textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={inputClass} /></Field>
      <Field label="Order no. (optional)"><input value={v.orderNumber} onChange={(e) => setV({ ...v, orderNumber: e.target.value })} className={inputClass} /></Field>
    </Modal>
  );
}

function Act({ c, action, staff, busy, onClose, onSubmit }: { c: Complaint; action: 'assign' | 'resolve'; staff: Staff[]; busy: boolean; onClose: () => void; onSubmit: (b: object) => void }) {
  const [assignedToId, setAssigned] = useState('');
  const [resolution, setResolution] = useState('');
  return (
    <Modal open title={`${action === 'assign' ? 'Assign' : 'Resolve'} ${c.complaintNumber}`} onClose={onClose} footer={<Button busy={busy} disabled={action === 'assign' ? !assignedToId : !resolution.trim()} onClick={() => onSubmit(action === 'assign' ? { assignedToId } : { resolution })}>{action === 'assign' ? 'Assign' : 'Mark resolved'}</Button>}>
      <p className="text-xs text-slate-600">{c.customerName} — {c.description}</p>
      {action === 'assign' ? (
        <Field label="Who handles it"><select value={assignedToId} onChange={(e) => setAssigned(e.target.value)} className={inputClass}><option value="">Choose…</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_', ' ').toLowerCase()})</option>)}</select></Field>
      ) : (
        <Field label="What was done" hint="Sent to the customer on WhatsApp."><textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} className={inputClass} placeholder="e.g. Valve replaced, cylinder swapped" /></Field>
      )}
    </Modal>
  );
}
