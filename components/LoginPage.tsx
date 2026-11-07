'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Fingerprint, KeyRound, Loader2, Lock, MapPin, RotateCcw, ShieldCheck, Smartphone, User } from 'lucide-react';
import { biometricSupported, deviceLabel, getDeviceId, getLocation, runBiometricStep } from '../lib/security';
import { useCompany } from '../lib/useCompany';
import { useT } from '../lib/i18n';
import { LanguageToggle } from './LanguageToggle';

type Step = 'PASSWORD' | 'OTP' | 'BIOMETRIC_REGISTER' | 'BIOMETRIC_VERIFY' | 'FORGOT' | 'RESET';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';
const primaryButton =
  'w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition disabled:opacity-60';

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
  const { t } = useT();
  const company = useCompany();
  const [step, setStep] = useState<Step>('PASSWORD');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [success, setSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMessages = () => {
    setError('');
    setInfo('');
    setSuccess('');
  };

  const openForgot = () => {
    resetMessages();
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('FORGOT');
  };

  const requestReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    resetMessages();
    try {
      const data = await post('/api/auth/forgot', { identifier });
      setMaskedMobile(data.maskedMobile ?? null);
      setOtp('');
      setStep('RESET');
      setSuccess(t('If this account exists, a reset code has been sent to its registered WhatsApp / mobile.'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await post('/api/auth/forgot', { identifier, code: otp, newPassword });
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('PASSWORD');
      setSuccess(t('Password reset. You can now log in with the new password.'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

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
    resetMessages();
    const body: Record<string, unknown> = { identifier, password, deviceId: getDeviceId(), deviceLabel: deviceLabel() };
    try {
      go(await post('/api/auth/login', body));
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'LOCATION_REQUIRED') {
        setInfo(t('Location check… please allow location access.'));
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
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt="" className="h-11 w-11 rounded-2xl object-contain" />
            ) : (
              <div className="h-11 w-11 rounded-2xl bg-emerald-600 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="font-black text-lg leading-tight">{company.name}</h1>
              <p className="text-[11px] text-emerald-300 font-semibold">Indane LPG Distributor · Office &amp; Delivery</p>
            </div>
            <div className="ml-auto"><LanguageToggle /></div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 'PASSWORD' && (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-identifier" className="block text-xs font-semibold text-slate-700">{t('Email or mobile')}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-identifier"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); if (error) setError(''); }}
                    autoComplete="username"
                    autoFocus
                    required
                    placeholder="name@company.com / 98xxxxxxxx"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">{t('Password')}</label>
                  <button type="button" onClick={openForgot} className="text-xs font-semibold text-emerald-700 hover:text-emerald-600 hover:underline focus:outline-none focus-visible:underline">
                    {t('Forgot password?')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-12 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    aria-pressed={showPassword}
                    title={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {t('Log in')}
              </button>
            </form>
          )}

          {step === 'FORGOT' && (
            <form onSubmit={requestReset} className="space-y-4">
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <RotateCcw className="h-5 w-5 text-emerald-600" /> {t('Reset password')}
                </h2>
                <p className="text-xs text-slate-500">{t('Enter your email or mobile. We will send a 6-digit code to your registered WhatsApp / mobile.')}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="forgot-identifier" className="block text-xs font-semibold text-slate-700">{t('Email or mobile')}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="forgot-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required placeholder="name@company.com / 98xxxxxxxx" className={`${inputClass} pr-3`} />
                </div>
              </div>
              <button disabled={busy || !identifier.trim()} className={primaryButton}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('Send reset code')}
              </button>
            </form>
          )}

          {step === 'RESET' && (
            <form onSubmit={submitReset} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-otp" className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Smartphone className="h-4 w-4 text-emerald-600" /> {t('Reset code')}{maskedMobile ? ` (${maskedMobile})` : ''}
                </label>
                <input id="reset-otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus required placeholder="••••••" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono transition focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reset-new" className="block text-xs font-semibold text-slate-700">{t('New password')}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="reset-new" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={8} className={`${inputClass} pr-12`} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    aria-pressed={showPassword}
                    title={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{t('At least 8 characters, with letters and numbers.')}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reset-confirm" className="block text-xs font-semibold text-slate-700">{t('Confirm new password')}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="reset-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required className={`${inputClass} pr-3`} />
                </div>
              </div>
              <button disabled={busy || otp.length !== 6} className={primaryButton}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {t('Set new password')}
              </button>
              <button type="button" onClick={() => requestReset()} disabled={busy} className="w-full text-xs font-bold text-slate-500 hover:text-slate-700">{t('Resend code')}</button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={submitOtp} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Smartphone className="h-5 w-5 text-emerald-600" /> {t('Enter the OTP sent on WhatsApp')}{maskedMobile ? ` to ${maskedMobile}` : ''}
              </div>
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus required className="w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button disabled={busy || otp.length !== 6} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {t('Verify')}
              </button>
              <button type="button" onClick={resendOtp} className="w-full text-xs font-bold text-slate-500">{t('Resend OTP')}</button>
            </form>
          )}

          {(step === 'BIOMETRIC_REGISTER' || step === 'BIOMETRIC_VERIFY') && (
            <div className="space-y-4 text-center">
              <Fingerprint className="h-14 w-14 mx-auto text-emerald-600" />
              <p className="text-sm font-bold text-slate-800">
                {step === 'BIOMETRIC_REGISTER' ? 'Set up fingerprint / face unlock for this phone.' : 'Confirm it is you with fingerprint / face.'}
              </p>
              {!biometricSupported() && <p className="text-xs text-rose-600 font-semibold">This browser does not support biometric login. Use the Pramukh Indane delivery app on your Android phone.</p>}
              <button onClick={runBiometric} disabled={busy || !biometricSupported()} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('Continue')}
              </button>
            </div>
          )}

          {info && <div className="p-3 rounded-xl bg-sky-50 text-sky-800 text-xs font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" />{info}</div>}
          {success && (
            <div role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t(error)}</span>
            </div>
          )}
          {step !== 'PASSWORD' && (
            <button onClick={() => { setStep('PASSWORD'); resetMessages(); setOtp(''); }} className="w-full text-[11px] font-bold text-slate-400 hover:text-slate-600">
              {step === 'FORGOT' || step === 'RESET' ? t('← Back to login') : t('← Start again')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
