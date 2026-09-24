'use client';

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

// Device-side security helpers for the delivery app (SRS §15): a stable
// device id for device binding, current GPS position, and the biometric
// (fingerprint / face) prompt through WebAuthn.

const DEVICE_KEY = 'deskshark.deviceId';

export function getDeviceId(): string {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const model = ua.match(/\(([^)]+)\)/)?.[1]?.split(';').slice(0, 3).join(' ').trim();
  return `${model || 'Unknown device'} · ${/Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Browser'}`;
}

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function getLocation(timeoutMs = 15_000): Promise<Position | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

export const biometricSupported = () => typeof window !== 'undefined' && 'PublicKeyCredential' in window;

/** Runs the pending biometric login step (register on first use, then verify). */
export async function runBiometricStep() {
  const optionsRes = await fetch('/api/auth/biometric', { cache: 'no-store' });
  const optionsJson = await optionsRes.json();
  if (!optionsRes.ok) throw new Error(optionsJson.error || 'Biometric check unavailable.');
  const { mode, options } = optionsJson.data;
  const response = mode === 'register' ? await startRegistration({ optionsJSON: options }) : await startAuthentication({ optionsJSON: options });
  const verifyRes = await fetch('/api/auth/biometric', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response }) });
  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyJson.error || 'Biometric verification failed.');
  return verifyJson.data as { next?: 'OTP' | 'BIOMETRIC_REGISTER' | 'BIOMETRIC_VERIFY'; done?: boolean; redirectPath?: string };
}
