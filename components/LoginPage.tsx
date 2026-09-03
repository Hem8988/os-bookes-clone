'use client';

import React, { useState } from 'react';
import { ShieldCheck, Truck, Users, Lock, Key, UserCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: (user: any, redirectPath: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'ACCOUNTANT' | 'DELIVERY_BOY' | 'CUSTOMER'>('ADMIN');
  const [email, setEmail] = useState('admin@deskshark.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Quick Role Credentials Fill for Dev Testing
  const handleRoleSelect = (role: 'ADMIN' | 'ACCOUNTANT' | 'DELIVERY_BOY' | 'CUSTOMER') => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'ADMIN') {
      setEmail('admin@deskshark.com');
      setPassword('admin123');
    } else if (role === 'ACCOUNTANT') {
      setEmail('accountant@deskshark.com');
      setPassword('acc123');
    } else if (role === 'DELIVERY_BOY') {
      setEmail('driver@deskshark.com');
      setPassword('driver123');
    } else if (role === 'CUSTOMER') {
      setEmail('customer@deskshark.com');
      setPassword('cust123');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, roleChoice: selectedRole }),
      });

      const json = await res.json();
      if (json.success) {
        if (onLoginSuccess) {
          onLoginSuccess(json.user, json.redirectPath);
        } else {
          window.location.href = json.redirectPath;
        }
      } else {
        setErrorMsg(json.error || 'Authentication failed');
      }
    } catch (err: any) {
      setErrorMsg('Login network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/30 to-slate-100 flex flex-col justify-center items-center p-4 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-600/30">
            PI
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
            Pramukh Indane ERP
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </h1>
          <p className="text-xs text-slate-500 font-medium">Database Authentication & Role-Based Access Portal</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => handleRoleSelect('ADMIN')}
            className={`py-2 rounded-xl transition cursor-pointer ${selectedRole === 'ADMIN' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'}`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('ACCOUNTANT')}
            className={`py-2 rounded-xl transition cursor-pointer ${selectedRole === 'ACCOUNTANT' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'}`}
          >
            Accountant
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('DELIVERY_BOY')}
            className={`py-2 rounded-xl transition cursor-pointer ${selectedRole === 'DELIVERY_BOY' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'}`}
          >
            Driver
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('CUSTOMER')}
            className={`py-2 rounded-xl transition cursor-pointer ${selectedRole === 'CUSTOMER' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'}`}
          >
            Customer
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">Email / Mobile Number</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="e.g. admin@deskshark.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {loading ? 'Authenticating...' : `Sign In as ${selectedRole}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Database Test Credentials Card */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-[11px] space-y-1 text-slate-700">
          <div className="font-bold text-emerald-900 uppercase text-[10px] flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-emerald-600" /> Pre-Configured Database Credentials
          </div>
          <div>• <strong>ADMIN</strong>: admin@deskshark.com / admin123</div>
          <div>• <strong>ACCOUNTANT</strong>: accountant@deskshark.com / acc123</div>
          <div>• <strong>DELIVERY BOY</strong>: driver@deskshark.com / driver123</div>
          <div>• <strong>CUSTOMER</strong>: customer@deskshark.com / cust123</div>
        </div>

      </div>
    </div>
  );
};
