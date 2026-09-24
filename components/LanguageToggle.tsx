'use client';

import React from 'react';
import { LANGS, setLang, useT } from '../lib/i18n';

/** EN / हिं / मर switch; the choice is remembered on this device. */
export const LanguageToggle: React.FC<{ tone?: 'light' | 'dark' }> = ({ tone = 'dark' }) => {
  const { lang } = useT();
  const base = tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600';
  return (
    <div className={`flex rounded-full p-0.5 text-[10px] font-black ${base}`}>
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)} className={`px-2 py-0.5 rounded-full ${lang === l.code ? 'bg-emerald-600 text-white' : ''}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
};
