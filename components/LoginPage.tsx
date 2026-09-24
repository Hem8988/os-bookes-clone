'use client';

import React, { useState } from 'react';
import { ArrowRight, Fingerprint, KeyRound, Loader2, Lock, MapPin, ShieldCheck, Smartphone } from 'lucide-react';
import { biometricSupported, deviceLabel, getDeviceId, getLocation, runBiometricStep } from '../lib/security';
import { useCompany } from '../lib/useCompany';

type Step = 'PASSWORD' | 'OTP' | 'BIOMETRIC_REGISTER' | 'BIOMETRIC_VERIFY';

interface LoginResult {
  next?: Step;
  done?: boolean;
  redirectPath?: string;
  maskedMobile?: string | null;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw Object.assign(new Error(json.error || 'Login failed.'), { code: json.code as string | undefined });
  return json.data as LoginResult;
}

/**
 * Login: password → (OTP for sensitive roles) → (fingerprint / face for
 * delivery boys on an approved phone). Location and device id are sent so
 * the server can apply the delivery-boy security policy.
 */
export const LoginPage: React.FC = () => {
  const company = useCompany();
  const [step, setStep] = useState<Step>('PASSWORD');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const go = (result: LoginResult) => {
    if (result.done && result.redirectPath) {
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.startsWith(result.redirectPath) ? next : result.redirectPath;
      return;
    }
    if (result.maskedMobile) setMaskedMobile(result.maskedMobile);
    if (result.next) setStep(result.next);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    const body: Record<string, unknown> = { identifier, password, deviceId: getDeviceId(), deviceLabel: deviceLabel() };
    try {
      go(await post('/api/auth/login', body));
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'LOCATION_REQUIRED') {
        setInfo('Location check… please allow location access.');
        const position = await getLocation();
        if (!position) {
          setError('Location permission is required for delivery staff. Turn on GPS and allow location for this app.');
        } else {
          try {
            go(await post('/api/auth/login', { ...body, latitude: position.latitude, longitude: position.longitude }));
            setInfo('');
          } catch (retryErr) {
            setError((retryErr as Error).message);
          }
        }
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      go(await post('/api/auth/otp', { code: otp }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    try {
      await post('/api/auth/otp', { resend: true });
      setInfo('A new OTP has been sent.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runBiometric = async () => {
    setBusy(true);
    setError('');
    try {
      go(await runBiometricStep());
    } catch (err) {
      setError((err as Error).message || 'Fingerprint / face check was cancelled.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-6 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight">{company.name}</h1>
              <p className="text-[11px] text-emerald-300 font-semibold">DeskShark · Cylinder Distribution ERP</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 'PASSWORD' && (
            <form onSubmit={submitPassword} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Email or mobile</span>
                <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </label>
              <button disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Log in
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={submitOtp} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Smartphone className="h-5 w-5 text-emerald-600" /> Enter the OTP sent on WhatsApp{maskedMobile ? ` to ${maskedMobile}` : ''}
              </div>
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus required className="w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button disabled={busy || otp.length !== 6} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Verify
              </button>
              <button type="button" onClick={resendOtp} className="w-full text-xs font-bold text-slate-500">
                Resend OTP
              </button>
            </form>
          )}

          {(step === 'BIOMETRIC_REGISTER' || step === 'BIOMETRIC_VERIFY') && (
            <div className="space-y-4 text-center">
              <Fingerprint className="h-14 w-14 mx-auto text-emerald-600" />
              <p className="text-sm font-bold text-slate-800">
                {step === 'BIOMETRIC_REGISTER' ? 'Set up fingerprint / face unlock for this phone.' : 'Confirm it is you with fingerprint / face.'}
              </p>
              {!biometricSupported() && <p className="text-xs text-rose-600 font-semibold">This browser does not support biometric login. Use the DeskShark delivery app on your Android phone.</p>}
              <button onClick={runBiometric} disabled={busy || !biometricSupported()} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
              </button>
            </div>
          )}

          {info && <div className="p-3 rounded-xl bg-sky-50 text-sky-800 text-xs font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" />{info}</div>}
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{error}</div>}
          {step !== 'PASSWORD' && (
            <button onClick={() => { setStep('PASSWORD'); setError(''); setOtp(''); }} className="w-full text-[11px] font-bold text-slate-400">
              ← Start again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
