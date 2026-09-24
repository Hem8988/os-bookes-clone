'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ShieldAlert, Smartphone, UserPlus } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { ROLE_LABELS, ROLES, Role } from '../lib/permissions';
import { Badge, Button, Card, Empty, Field, inputClass, Modal, StatusBadge, cx, dateTime, useToast } from './ui';

// Users & roles, device binding and the audit trail (Super Admin).

interface UserRow { id: string; name: string; email: string; mobile: string | null; role: Role; status: string; twoFactorEnabled: boolean; lastLoginAt: string | null; lastLoginIp: string | null; customerId: string | null }
interface DeviceRow { id: string; deviceId: string; label: string | null; status: string; hasBiometric: boolean; approvedBy: string | null; lastSeenAt: string | null; createdAt: string; user: { name: string; role: string; mobile: string | null } }
interface AuditRow { id: string; createdAt: string; actorName: string; actorRole: string | null; action: string; entityType: string | null; reference: string | null; details: string | null; reason: string | null; oldValue: unknown; newValue: unknown; ipAddress: string | null; userAgent: string | null; isSensitive: boolean }

type Tab = 'users' | 'devices' | 'audit';

export function AdminModule({ initialTab = 'users' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([['users', 'Users & roles'], ['devices', 'Devices'], ['audit', 'Audit log']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersPanel />}
      {tab === 'devices' && <DevicesPanel />}
      {tab === 'audit' && <AuditPanel />}
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      setUsers(await api<UserRow[]>('/api/users/roles'));
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card title="Users & roles" actions={<Button size="sm" onClick={() => setCreating(true)}><UserPlus className="h-3.5 w-3.5" /> Add user</Button>}>
      {toast}
      <table className="w-full text-xs">
        <thead className="text-slate-500 text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Role</th>
            <th className="p-2">Status</th>
            <th className="p-2">2FA</th>
            <th className="p-2">Last login</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="p-2"><strong>{u.name}</strong><div className="text-[10px] text-slate-400">{u.email}{u.mobile ? ` · ${u.mobile}` : ''}</div></td>
              <td className="p-2">{ROLE_LABELS[u.role] || u.role}</td>
              <td className="p-2"><StatusBadge status={u.status} /></td>
              <td className="p-2">{u.twoFactorEnabled ? <Badge tone="green">On</Badge> : <span className="text-slate-400">—</span>}</td>
              <td className="p-2">{dateTime(u.lastLoginAt)}<div className="text-[10px] text-slate-400">{u.lastLoginIp}</div></td>
              <td className="p-2 text-right"><Button size="sm" tone="ghost" onClick={() => setEditing(u)}>Manage</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {creating && <CreateUserModal onClose={() => setCreating(false)} onDone={(m) => { showToast(m); setCreating(false); void load(); }} onError={(m) => showToast(m, 'error')} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onDone={(m) => { showToast(m); setEditing(null); void load(); }} onError={(m) => showToast(m, 'error')} />}
    </Card>
  );
}

function CreateUserModal({ onClose, onDone, onError }: { onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', role: 'DELIVERY_BOY' as Role, password: '', customerId: '', twoFactorEnabled: false });
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (form.role === 'CUSTOMER' && customers.length === 0) api<{ id: string; name: string }[]>('/api/customers?status=ACTIVE').then(setCustomers).catch(() => {});
  }, [form.role, customers.length]);
  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/users/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onDone(json.message);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Add user" onClose={onClose} footer={<Button busy={busy} onClick={submit}>Create</Button>}>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Email (login)"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></Field>
        <Field label="Mobile"><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className={inputClass} /></Field>
      </div>
      <Field label="Role">
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </Field>
      {form.role === 'CUSTOMER' && (
        <Field label="Customer account">
          <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className={inputClass}>
            <option value="">Select…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Initial password" hint="At least 8 characters with letters and numbers. Ask the user to change it.">
        <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.twoFactorEnabled} onChange={(e) => setForm({ ...form, twoFactorEnabled: e.target.checked })} /> Require OTP at login</label>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onDone, onError }: { user: UserRow; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ name: user.name, mobile: user.mobile || '', role: user.role, status: user.status, twoFactorEnabled: user.twoFactorEnabled, password: '' });
  const [busy, setBusy] = useState(false);
  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onDone(json.message);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title={`Manage ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <Button tone="secondary" busy={busy} onClick={() => patch({ revokeSessions: true, unlock: true })}>Sign out everywhere</Button>
          <Button busy={busy} onClick={() => patch({ name: form.name, mobile: form.mobile, role: form.role, status: form.status, twoFactorEnabled: form.twoFactorEnabled, ...(form.password ? { password: form.password } : {}) })}>Save</Button>
        </>
      }
    >
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
      <Field label="Mobile"><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Role">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {['ACTIVE', 'INACTIVE', 'BLOCKED'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.twoFactorEnabled} onChange={(e) => setForm({ ...form, twoFactorEnabled: e.target.checked })} /> Require OTP at login</label>
      <Field label="Reset password (optional)"><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="Leave empty to keep" /></Field>
    </Modal>
  );
}

function DevicesPanel() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [toast, showToast] = useToast();
  const load = useCallback(async () => {
    try {
      setDevices(await api<DeviceRow[]>('/api/users/devices'));
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (deviceId: string, action: string) => {
    try {
      await api('/api/users/devices', { body: { deviceId, action } });
      showToast('Device updated.');
      await load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };
  return (
    <Card title={<span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Bound devices</span>} actions={<Button size="sm" tone="ghost" onClick={() => void load()}><RefreshCw className="h-3.5 w-3.5" /></Button>}>
      {toast}
      {devices.length === 0 ? (
        <Empty>No devices yet. A delivery boy&apos;s first login creates a pending device here.</Empty>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-slate-500 text-left">
            <tr>
              <th className="p-2">User</th>
              <th className="p-2">Device</th>
              <th className="p-2">Status</th>
              <th className="p-2">Biometric</th>
              <th className="p-2">Last seen</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="p-2 font-bold">{d.user.name}<div className="text-[10px] text-slate-400">{d.user.mobile}</div></td>
                <td className="p-2">{d.label}<div className="text-[10px] text-slate-400 font-mono">{d.deviceId.slice(0, 13)}…</div></td>
                <td className="p-2"><StatusBadge status={d.status === 'PENDING' ? 'PENDING' : d.status === 'APPROVED' ? 'ACTIVE' : 'REVOKED'} /></td>
                <td className="p-2">{d.hasBiometric ? <Badge tone="green">Enrolled</Badge> : <span className="text-slate-400">—</span>}</td>
                <td className="p-2">{dateTime(d.lastSeenAt)}</td>
                <td className="p-2 text-right space-x-1">
                  {d.status !== 'APPROVED' && <Button size="sm" onClick={() => act(d.id, 'APPROVE')}>Approve</Button>}
                  {d.status !== 'REVOKED' && <Button size="sm" tone="danger" onClick={() => act(d.id, 'REVOKE')}>Block</Button>}
                  {d.hasBiometric && <Button size="sm" tone="secondary" onClick={() => act(d.id, 'RESET_BIOMETRIC')}><KeyRound className="h-3 w-3" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function AuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [sensitive, setSensitive] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<AuditRow | null>(null);
  const [toast, showToast] = useToast();
  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (sensitive) qs.set('sensitive', '1');
      if (search.trim()) qs.set('search', search.trim());
      setRows(await api<AuditRow[]>(`/api/audit?${qs}`));
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [sensitive, search, showToast]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
  }, [load]);
  return (
    <Card
      title="Audit log"
      actions={
        <>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="User / reference" className={cx(inputClass, 'py-1.5 w-48')} />
          <label className="flex items-center gap-1 text-[11px] font-bold text-rose-700"><input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} /> <ShieldAlert className="h-3.5 w-3.5" /> Flagged only</label>
        </>
      }
    >
      {toast}
      <table className="w-full text-xs">
        <thead className="text-slate-500 text-left">
          <tr>
            <th className="p-2">When</th>
            <th className="p-2">User</th>
            <th className="p-2">Action</th>
            <th className="p-2">Reference</th>
            <th className="p-2">IP / device</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => setOpen(r)} className={cx('border-t border-slate-100 cursor-pointer hover:bg-slate-50', r.isSensitive && 'bg-rose-50/50')}>
              <td className="p-2 whitespace-nowrap">{dateTime(r.createdAt)}</td>
              <td className="p-2">{r.actorName}<div className="text-[10px] text-slate-400">{r.actorRole}</div></td>
              <td className="p-2 font-bold">{r.isSensitive && '⚑ '}{r.action.replace(/_/g, ' ')}</td>
              <td className="p-2">{r.reference || r.entityType}{r.reason && <div className="text-[10px] text-slate-500">“{r.reason}”</div>}</td>
              <td className="p-2 text-[10px] text-slate-500">{r.ipAddress}<div className="truncate max-w-40">{r.userAgent}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={!!open} title={open?.action.replace(/_/g, ' ') || ''} onClose={() => setOpen(null)} wide>
        {open && (
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-black mb-1">Old value</div>
              <pre className="bg-slate-50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(open.oldValue, null, 2) || '—'}</pre>
            </div>
            <div>
              <div className="font-black mb-1">New value</div>
              <pre className="bg-slate-50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(open.newValue, null, 2) || '—'}</pre>
            </div>
            {open.details && <div className="sm:col-span-2 text-slate-600">{open.details}</div>}
          </div>
        )}
      </Modal>
    </Card>
  );
}
