'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Building2,
  Lock
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('shivmrfxlu@gmail.com');
  const [pin, setPin] = useState('5577');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const VALID_EMAIL = 'shivmrfxlu@gmail.com';
  const VALID_PIN = '5577';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (email.trim().toLowerCase() === VALID_EMAIL && pin.trim() === VALID_PIN) {
        onLoginSuccess(email.trim());
      } else {
        setError('Invalid email or PIN. Use the demo credentials shown above.');
      }
      setIsLoading(false);
    }, 600);
  };

  const handleFillDemo = () => {
    setEmail('shivmrfxlu@gmail.com');
    setPin('5577');
    setError('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-2xl mb-3 shadow-lg shadow-emerald-900/40">
            OS
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            OS-BOOKS
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
              ERP LIVE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cloud GST Accounting & Inventory Platform
          </p>
        </div>

        {/* User Credentials Alert Card */}
        <div className="mb-6 rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-3.5 text-xs text-emerald-200">
          <div className="flex items-center justify-between font-semibold text-emerald-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              User Credentials Configured
            </span>
            <button
              onClick={handleFillDemo}
              type="button"
              className="text-[11px] font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-2 py-0.5 rounded transition-all shadow"
            >
              Autofill
            </button>
          </div>
          <div className="space-y-0.5 text-slate-300 font-mono text-[11px]">
            <div><span className="text-slate-400">User Email:</span> shivmrfxlu@gmail.com</div>
            <div><span className="text-slate-400">Pass / PIN:</span> 5577</div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300">
              {error}
            </div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email / User ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Password / PIN field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pass / 4-Digit Security PIN
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter password or PIN"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono tracking-widest"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between text-xs text-slate-400 py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Remember firm session</span>
            </label>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-emerald-400 hover:underline">
              Forgot PIN?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-slate-900">
                <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
                Logging into OS-BOOKS...
              </span>
            ) : (
              <>
                <span>Sign In to Firm Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center text-slate-500 text-[11px] flex items-center justify-center gap-3">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-400" />
            256-Bit SSL Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-emerald-400" />
            GSTIN Compliant
          </span>
        </div>
      </div>
    </div>
  );
};
