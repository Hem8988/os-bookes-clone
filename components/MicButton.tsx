'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cue } from '../lib/feedback';
import { useT } from '../lib/i18n';
import { cx } from './ui';

// Browser speech-to-text (Chrome / Android WebView expose it as webkitSpeechRecognition).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/** Tap to speak: the spoken words are appended to `value` (in the app's language). Hidden where the browser can't do it. */
export function MicButton({ value, onChange, onError, className }: { value: string; onChange: (v: string) => void; onError?: (message: string) => void; className?: string }) {
  const { t, locale } = useT();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  // Text before this session started, so interim results replace (not repeat) themselves.
  const base = useRef('');

  useEffect(() => {
    setSupported(!!recognitionCtor());
    return () => rec.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = locale;
    r.interimResults = true;
    r.continuous = false;
    base.current = value.trim();
    r.onresult = (e) => {
      let spoken = '';
      for (let i = 0; i < e.results.length; i++) spoken += e.results[i][0].transcript;
      onChange([base.current, spoken.trim()].filter(Boolean).join(' '));
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') onError?.(t('Allow microphone access to speak.'));
      else if (e.error !== 'no-speech' && e.error !== 'aborted') onError?.(t('Could not hear you — try again.'));
    };
    r.onend = () => setListening(false);
    rec.current = r;
    cue('tap');
    setListening(true);
    r.start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? t('Stop') : t('Speak')}
      aria-label={listening ? t('Stop') : t('Speak')}
      className={cx('shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition active:scale-95', listening ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', className)}
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}
