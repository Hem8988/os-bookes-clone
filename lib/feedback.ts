'use client';

import { useEffect, useState } from 'react';

// POS-style tap feedback: short tones made by the browser (no sound files, works
// offline) plus a vibration on phones. One switch turns both off, per device.

export type Cue = 'tap' | 'remove' | 'success' | 'error';

const KEY = 'deskshark.sound';
const EVENT = 'deskshark:sound';

export function soundOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked — the switch just lasts for this page */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Sound on/off, kept in step across every screen using it. */
export function useSound(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(soundOn());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return [on, setSound];
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** [frequency Hz, start s, length s] notes for each cue. */
const NOTES: Record<Cue, [number, number, number][]> = {
  tap: [[1200, 0, 0.04]],
  remove: [[600, 0, 0.05]],
  success: [[880, 0, 0.09], [1320, 0.09, 0.16]],
  error: [[220, 0, 0.12], [180, 0.13, 0.18]],
};
const VIBRATE: Record<Cue, number | number[]> = { tap: 10, remove: 10, success: [20, 40, 30], error: [60, 50, 60] };

/** Play a cue (and vibrate) unless the user switched sound off. */
export function cue(kind: Cue) {
  if (typeof window === 'undefined' || !soundOn()) return;
  try {
    navigator.vibrate?.(VIBRATE[kind]);
  } catch {
    /* no vibration motor */
  }
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const [freq, start, len] of NOTES[kind]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = kind === 'error' ? 'square' : 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(kind === 'error' ? 0.08 : 0.15, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + len);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + start);
    osc.stop(now + start + len + 0.02);
  }
}
