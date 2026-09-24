'use client';

import React from 'react';
import { setLang, useT } from '../lib/i18n';

/** EN / हिं switch; the choice is remembered on this device. */
export const LanguageToggle: React.FC<{ tone?: 'light' | 'dark' }> = ({ tone = 'dark' }) => {
  const { lang } = useT();
  const base = tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600';
  return (
    <div className={`flex rounded-full p-0.5 text-[10px] font-black ${base}`}>
      {(['en', 'hi'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={`px-2 py-0.5 rounded-full ${lang === l ? 'bg-emerald-600 text-white' : ''}`}>
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
};
