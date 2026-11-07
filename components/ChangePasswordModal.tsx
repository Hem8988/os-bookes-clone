'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiWithMessage, errorMessage } from '../lib/api';
import { Button, Field, inputClass, Modal } from './ui';

// Change a password.
// - Own password (no `user`): asks for the current one; other devices are signed out, this one stays.
// - Someone else's (Super Admin, `user` given): sets a new one; that person is signed out everywhere.

const RULE = 'Kam se kam 8 characters, letters aur numbers dono.';

function weakness(p: string): string | null {
  if (p.length < 8) return 'Password kam se kam 8 characters ka hona chahiye.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Password mein letters aur numbers dono hone chahiye.';
  return null;
}

export function ChangePasswordModal({ user, onClose, onDone }: { user?: { id: string; name: string }; onClose: () => void; onDone: (message: string) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!user && !current) return setError('Current password daaliye.');
    const weak = weakness(next);
    if (weak) return setError(weak);
    if (next !== confirm) return setError('Dono naye password match nahi kar rahe.');
    setBusy(true);
    setError('');
    try {
      const { message } = user
        ? await apiWithMessage(`/api/users/${user.id}`, { password: next }, 'PATCH')
        : await apiWithMessage('/api/auth/password', { currentPassword: current, newPassword: next });
      onDone(user ? `${user.name} ka password badal diya. Unhe naye password se login karna hoga.` : message || 'Password changed.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const type = show ? 'text' : 'password';
  return (
    <Modal open title={user ? `Change password · ${user.name}` : 'Change my password'} onClose={onClose} footer={<Button busy={busy} onClick={submit}>Change password</Button>}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!user && (
          <Field label="Current password">
            <input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} autoComplete="current-password" autoFocus />
          </Field>
        )}
        <Field label="New password" hint={RULE}>
          <input type={type} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} autoComplete="new-password" autoFocus={!!user} />
        </Field>
        <Field label="Confirm new password">
          <input type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" />
        </Field>
        <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? 'Password chhupayein' : 'Password dikhayein'}
        </button>
        <p className="text-[11px] text-slate-500">
          {user ? 'Is user ke saare devices se logout ho jayega.' : 'Doosre devices se logout ho jayega, yeh device login rahega.'}
        </p>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
