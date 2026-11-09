'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound } from 'lucide-react';
import { useSession } from '../lib/auth';
import { ChangePasswordModal, type PasswordTarget } from './ChangePasswordModal';
import { useToast } from './ui';

/**
 * 🔑 on an employee / customer row: the Super Admin sets a new password for that person's
 * login. Shown only to whoever can manage users.
 */
export function ResetPasswordButton({ target, className }: { target: PasswordTarget; className?: string }) {
  const { can } = useSession();
  const [open, setOpen] = useState(false);
  const [toast, showToast] = useToast();
  if (!can('users.manage')) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Reset ${target.name}'s login password`}
        aria-label={`Reset ${target.name}'s login password`}
        className={className || 'p-1.5 rounded bg-amber-500 hover:bg-amber-400 text-white transition-all cursor-pointer'}
      >
        <KeyRound className="h-3.5 w-3.5" />
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {toast}
            {open && <ChangePasswordModal user={target} onClose={() => setOpen(false)} onDone={(m) => { showToast(m); setOpen(false); }} />}
          </>,
          document.body
        )}
    </>
  );
}
