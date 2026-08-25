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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/20">
            PI
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Pramukh Indane ERP
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400">Database Authentication & Role-Based Access Portal</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => handleRoleSelect('ADMIN')}
            className={`py-2 rounded-xl transition ${selectedRole === 'ADMIN' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('ACCOUNTANT')}
            className={`py-2 rounded-xl transition ${selectedRole === 'ACCOUNTANT' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Accountant
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('DELIVERY_BOY')}
            className={`py-2 rounded-xl transition ${selectedRole === 'DELIVERY_BOY' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Driver
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('CUSTOMER')}
            className={`py-2 rounded-xl transition ${selectedRole === 'CUSTOMER' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Customer
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1">Email / Mobile Number</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. admin@deskshark.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : `Sign In as ${selectedRole}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Database Test Credentials Card */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-[11px] space-y-1 text-slate-400">
          <div className="font-bold text-slate-300 uppercase text-[10px] flex items-center gap-1">
            <Key className="w-3 h-3 text-emerald-400" /> Pre-Configured Database Credentials
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
