'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { ROLE_LABELS, Role } from '../lib/permissions';
import { CompanyProfile, OperationsPolicy, SecurityPolicy } from '../lib/settings';
import { refreshCompany } from '../lib/useCompany';
import { Button, Card, Field, inputClass, Modal, StatusBadge, cx, dateTime, useToast } from './ui';

type Tab = 'company' | 'security' | 'operations' | 'ip';

export function SettingsModule() {
  const [tab, setTab] = useState<Tab>('company');
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-slate-900">Settings</h2>
      <div className="flex flex-wrap gap-2">
        {([['company', 'Company'], ['security', 'Security policy'], ['operations', 'Operations'], ['ip', 'Accountant IP allow-list']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold', tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'company' && <SettingForm<CompanyProfile> settingKey="company" render={(v, set) => <CompanyFields value={v} onChange={set} />} />}
      {tab === 'security' && <SettingForm<SecurityPolicy> settingKey="security" render={(v, set) => <SecurityFields value={v} onChange={set} />} />}
      {tab === 'operations' && <SettingForm<OperationsPolicy> settingKey="operations" render={(v, set) => <OperationsFields value={v} onChange={set} />} />}
      {tab === 'ip' && <IpRules />}
    </div>
  );
}

function SettingForm<T>({ settingKey, render }: { settingKey: string; render: (value: T, set: (v: T) => void) => React.ReactNode }) {
  const [value, setValue] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  useEffect(() => {
    api<T>(`/api/settings/${settingKey}`).then(setValue).catch((e) => showToast(errorMessage(e), 'error'));
  }, [settingKey, showToast]);
  const save = async () => {
    setBusy(true);
    try {
      setValue(await api<T>(`/api/settings/${settingKey}`, { method: 'PUT', body: value }));
      if (settingKey === 'company') refreshCompany();
      showToast('Settings saved.');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  if (!value) return null;
  return (
    <Card actions={<Button size="sm" busy={busy} onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>}>
      {toast}
      <div className="space-y-4">{render(value, setValue)}</div>
    </Card>
  );
}

function CompanyFields({ value, onChange }: { value: CompanyProfile; onChange: (v: CompanyProfile) => void }) {
  const f = (key: keyof CompanyProfile, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} className={inputClass} />
    </Field>
  );
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {f('name', 'Business name (shown everywhere)')}
      {f('legalName', 'Legal name on invoices')}
      {f('gstin', 'GSTIN')}
      {f('stateCode', 'State code', 'Two digits, e.g. 07 — decides CGST/SGST vs IGST')}
      {f('address', 'Address')}
      {f('phone', 'Phone')}
      {f('supportPhone', 'Support number (sent to customers)')}
      {f('email', 'Email')}
      {f('upiId', 'UPI ID', 'Used for pay-by-QR on invoices')}
      {f('invoicePrefix', 'Invoice prefix', 'Invoice numbers look like INV/26-27/00001')}
    </div>
  );
}

const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) => (
  <label className="flex items-start gap-2 text-xs">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
    <span>
      <span className="font-bold text-slate-800">{label}</span>
      {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
    </span>
  </label>
);

function SecurityFields({ value, onChange }: { value: SecurityPolicy; onChange: (v: SecurityPolicy) => void }) {
  const hours = value.workingHours;
  const overrideActive = !!hours.overrideUntil && new Date(hours.overrideUntil) > new Date();
  const toggleRole = (list: string[], role: string) => (list.includes(role) ? list.filter((r) => r !== role) : [...list, role]);
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Idle timeout (minutes)"><input type="number" min={5} value={value.sessionIdleMinutes} onChange={(e) => onChange({ ...value, sessionIdleMinutes: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Max session (hours)"><input type="number" min={1} value={value.sessionMaxHours} onChange={(e) => onChange({ ...value, sessionMaxHours: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Wrong passwords before lock"><input type="number" min={3} value={value.maxFailedLogins} onChange={(e) => onChange({ ...value, maxFailedLogins: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Lock duration (minutes)"><input type="number" min={1} value={value.lockoutMinutes} onChange={(e) => onChange({ ...value, lockoutMinutes: Number(e.target.value) })} className={inputClass} /></Field>
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">OTP (2FA) at login for</div>
        <div className="flex flex-wrap gap-3">
          {(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_BOY'] as Role[]).map((r) => (
            <Toggle key={r} label={ROLE_LABELS[r]} checked={value.otpRequiredRoles.includes(r)} onChange={() => onChange({ ...value, otpRequiredRoles: toggleRole(value.otpRequiredRoles, r) })} />
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">OTP goes to the user&apos;s mobile on WhatsApp (SMS fallback). Make sure WhatsApp is configured first.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Toggle label="Delivery boy device binding" hint="Login only from a phone approved by the admin." checked={value.deviceBindingRequired} onChange={(v) => onChange({ ...value, deviceBindingRequired: v })} />
        <Toggle label="Fingerprint / face at delivery-boy login" hint="Needs device binding; uses the phone's biometric." checked={value.biometricRequired} onChange={(v) => onChange({ ...value, biometricRequired: v })} />
        <Toggle label="Location required at login / start day" checked={value.loginLocationRequired} onChange={(v) => onChange({ ...value, loginLocationRequired: v })} />
        <Toggle label="Location required on each delivery" checked={value.deliveryLocationRequired} onChange={(v) => onChange({ ...value, deliveryLocationRequired: v })} />
        <Toggle label="Admin override: skip location checks" hint="Use temporarily, e.g. GPS problems." checked={value.locationOverride} onChange={(v) => onChange({ ...value, locationOverride: v })} />
        <Toggle label="Accountant IP restriction" hint="Accountants can log in only from allowed IPs." checked={value.accountantIpRestriction} onChange={(v) => onChange({ ...value, accountantIpRestriction: v })} />
      </div>
      <div className="p-3 rounded-xl border border-slate-200 space-y-3">
        <Toggle label="Working hours restriction" hint="New entries outside this window are blocked." checked={hours.enabled} onChange={(v) => onChange({ ...value, workingHours: { ...hours, enabled: v } })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input type="time" value={hours.start} onChange={(e) => onChange({ ...value, workingHours: { ...hours, start: e.target.value } })} className={inputClass} /></Field>
          <Field label="To"><input type="time" value={hours.end} onChange={(e) => onChange({ ...value, workingHours: { ...hours, end: e.target.value } })} className={inputClass} /></Field>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['DELIVERY_BOY', 'ACCOUNTANT', 'MANAGER'] as Role[]).map((r) => (
            <Toggle key={r} label={ROLE_LABELS[r]} checked={hours.roles.includes(r)} onChange={() => onChange({ ...value, workingHours: { ...hours, roles: toggleRole(hours.roles, r) } })} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold">Emergency override:</span>
          {overrideActive ? (
            <>
              <span>active until {dateTime(hours.overrideUntil)}</span>
              <Button size="sm" tone="secondary" onClick={() => onChange({ ...value, workingHours: { ...hours, overrideUntil: null } })}>End now</Button>
            </>
          ) : (
            [2, 6, 12].map((h) => (
              <Button key={h} size="sm" tone="secondary" onClick={() => onChange({ ...value, workingHours: { ...hours, overrideUntil: new Date(Date.now() + h * 3_600_000).toISOString() } })}>
                Allow for {h}h
              </Button>
            ))
          )}
          <span className="text-[10px] text-slate-500">(save to apply)</span>
        </div>
      </div>
    </div>
  );
}

function OperationsFields({ value, onChange }: { value: OperationsPolicy; onChange: (v: OperationsPolicy) => void }) {
  return (
    <div className="space-y-4">
      <Toggle label="Auto-assign the customer's default delivery boy on approval" checked={value.autoAssignDefaultDeliveryBoy} onChange={(v) => onChange({ ...value, autoAssignDefaultDeliveryBoy: v })} />
      <Toggle label="Block day lock while verifications are pending" checked={value.blockLockWithPendingItems} onChange={(v) => onChange({ ...value, blockLockWithPendingItems: v })} />
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Quantity variance flag (%)"><input type="number" min={0} step={0.5} value={value.varianceTolerancePercent} onChange={(e) => onChange({ ...value, varianceTolerancePercent: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="WhatsApp session timeout (min)"><input type="number" min={2} value={value.whatsappSessionTimeoutMinutes} onChange={(e) => onChange({ ...value, whatsappSessionTimeoutMinutes: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Outstanding reminder day">
          <select value={value.outstandingReminderWeekday} onChange={(e) => onChange({ ...value, outstandingReminderWeekday: Number(e.target.value) })} className={inputClass}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

interface IpRule { id: string; ipAddress: string; label: string; kind: string; expiresAt: string | null; active: boolean; createdBy: string; createdAt: string }

function IpRules() {
  const [rules, setRules] = useState<IpRule[]>([]);
  const [yourIp, setYourIp] = useState('');
  const [form, setForm] = useState<{ ipAddress: string; label: string; kind: 'OFFICE' | 'HOME'; validDays: number } | null>(null);
  const [toast, showToast] = useToast();
  const load = useCallback(async () => {
    try {
      const data = await api<{ rules: IpRule[]; yourIp: string }>('/api/settings/ip-rules');
      setRules(data.rules);
      setYourIp(data.yourIp);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    try {
      await api('/api/settings/ip-rules', { body: form });
      setForm(null);
      await load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };
  const disable = async (id: string) => {
    await api('/api/settings/ip-rules', { body: { id, action: 'DISABLE' } }).catch((e) => showToast(errorMessage(e), 'error'));
    await load();
  };
  return (
    <Card title="Accountant IP allow-list" actions={<Button size="sm" onClick={() => setForm({ ipAddress: yourIp, label: '', kind: 'OFFICE', validDays: 7 })}><Plus className="h-3.5 w-3.5" /> Allow IP</Button>}>
      {toast}
      <p className="text-[11px] text-slate-500 mb-3">Your current IP: <strong className="font-mono">{yourIp}</strong>. Turn on “Accountant IP restriction” in Security policy to enforce this list.</p>
      <table className="w-full text-xs">
        <thead className="text-slate-500 text-left">
          <tr>
            <th className="p-2">IP</th>
            <th className="p-2">Label</th>
            <th className="p-2">Type</th>
            <th className="p-2">Valid till</th>
            <th className="p-2">Status</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => {
            const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
            return (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-2 font-mono font-bold">{r.ipAddress}</td>
                <td className="p-2">{r.label}</td>
                <td className="p-2">{r.kind}</td>
                <td className="p-2">{r.expiresAt ? dateTime(r.expiresAt) : 'Always'}</td>
                <td className="p-2"><StatusBadge status={!r.active ? 'INACTIVE' : expired ? 'CLOSED' : 'ACTIVE'} /></td>
                <td className="p-2 text-right">{r.active && <Button size="sm" tone="ghost" onClick={() => disable(r.id)}>Disable</Button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Modal open={!!form} title="Allow IP" onClose={() => setForm(null)} footer={<Button onClick={save}>Save</Button>}>
        {form && (
          <>
            <Field label="IP address"><input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} className={inputClass} /></Field>
            <Field label="Label"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Office broadband" className={inputClass} /></Field>
            <Field label="Type">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'OFFICE' | 'HOME' })} className={inputClass}>
                <option value="OFFICE">Office (always allowed)</option>
                <option value="HOME">Home / WFH (time-boxed)</option>
              </select>
            </Field>
            {form.kind === 'HOME' && <Field label="Valid for (days)"><input type="number" min={1} max={90} value={form.validDays} onChange={(e) => setForm({ ...form, validDays: Number(e.target.value) })} className={inputClass} /></Field>}
          </>
        )}
      </Modal>
    </Card>
  );
}
