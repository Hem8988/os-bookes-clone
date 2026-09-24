'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Volume2, VolumeX } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { useT } from '../lib/i18n';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Register the service worker and subscribe this browser for web push. */
export async function enablePush(): Promise<boolean> {
  if (!VAPID_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) }));
  await api('/api/push', { body: subscription.toJSON() });
  return true;
}

const SOUND_KEY = 'deskshark.notifySound';

// Browsers only allow audio after the user has touched the page once.
let audioCtx: AudioContext | null = null;
function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    /* no Web Audio */
  }
}

/** Short two-note "ting" — no audio file needed. */
function playChime() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const start = audioCtx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    const at = start + i * 0.13;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(at);
    osc.stop(at + 0.4);
  });
}

/** In-app notifications (approvals waiting, deliveries sent back, …). */
export const NotificationBell: React.FC<{ onNavigate?: (link: string) => void; tone?: 'light' | 'dark' }> = ({ onNavigate, tone = 'light' }) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<'unknown' | 'on' | 'off'>(() =>
    typeof Notification === 'undefined' ? 'unknown' : Notification.permission === 'granted' ? 'on' : 'off'
  );
  const [sound, setSound] = useState(() => {
    try {
      return typeof window === 'undefined' || window.localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const [ringing, setRinging] = useState(false);
  const feed = useApiData<{ items: NotificationItem[]; unread: number }>('/api/notifications');
  const items = feed.data?.items;
  const unread = feed.data?.unread ?? 0;
  const load = feed.reload;

  useEffect(() => {
    const timer = window.setInterval(load, 20_000);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [load]);

  // Newest notification already seen; the first load only sets the baseline.
  const seen = useRef<string | null>(null);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  const navigate = useRef(onNavigate);
  useEffect(() => {
    navigate.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    if (!items) return;
    const newest = items.reduce<string | null>((m, n) => (!m || n.createdAt > m ? n.createdAt : m), null);
    if (seen.current === null) {
      seen.current = newest ?? '';
      return;
    }
    const fresh = items.filter((n) => !n.readAt && n.createdAt > (seen.current as string));
    if (newest && newest > seen.current) seen.current = newest;
    if (!fresh.length) return;

    if (soundRef.current) playChime();
    setRinging(true);
    const stop = window.setTimeout(() => setRinging(false), 2500);
    // Desktop pop-up, unless web push is set up (its service worker shows one already).
    if (!VAPID_KEY && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      fresh.slice(0, 3).forEach((n) => {
        const options = { body: tRef.current(n.body), tag: n.id, icon: '/icon-192.png', data: { link: n.link || '/' } };
        try {
          const popup = new Notification(tRef.current(n.title), options);
          popup.onclick = () => {
            window.focus();
            popup.close();
            if (n.link && navigate.current) navigate.current(n.link);
            else if (n.link) window.location.href = n.link;
          };
        } catch {
          // Android Chrome only allows pop-ups through the service worker.
          void navigator.serviceWorker?.ready.then((reg) => reg.showNotification(tRef.current(n.title), options)).catch(() => {});
        }
      });
    }
    return () => window.clearTimeout(stop);
  }, [items]);

  const enableAlerts = async () => {
    unlockAudio();
    if (VAPID_KEY) return setPushState((await enablePush()) ? 'on' : 'off');
    setPushState((await Notification.requestPermission()) === 'granted' ? 'on' : 'off');
  };
  const toggleSound = () => {
    unlockAudio();
    const next = !sound;
    setSound(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* private mode */
    }
    if (next) window.setTimeout(playChime, 50);
  };

  const markAll = async () => {
    await api('/api/notifications', { body: {} });
    await load();
  };

  const iconClass = tone === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`relative p-2 rounded-full transition-colors cursor-pointer ${iconClass}`} title={t('Notifications')}>
        {unread > 0 ? <BellRing className={`h-4 w-4 ${ringing ? 'animate-bounce text-amber-400' : ''}`} /> : <Bell className="h-4 w-4" />}
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50 text-slate-900">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-black">{t('Notifications')}</span>
            <div className="flex items-center gap-2">
              <button onClick={toggleSound} className="p-0.5 text-slate-500 hover:text-slate-900" title={t(sound ? 'Sound on' : 'Sound off')}>
                {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
              {pushState === 'off' && (
                <button onClick={enableAlerts} className="text-[11px] font-bold text-emerald-700">
                  {t('Enable desktop alerts')}
                </button>
              )}
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] font-bold text-slate-500">
                  {t('Mark all read')}
                </button>
              )}
            </div>
          </div>
          {!items?.length && <div className="p-4 text-xs text-slate-400 text-center">{t('No notifications.')}</div>}
          {items?.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setOpen(false);
                if (n.link && onNavigate) onNavigate(n.link);
                else if (n.link) window.location.href = n.link;
                void api('/api/notifications', { body: { ids: [n.id] } }).then(load);
              }}
              className={`w-full text-left px-3 py-2 border-b border-slate-50 hover:bg-slate-50 ${n.readAt ? 'opacity-60' : ''}`}
            >
              <div className="text-xs font-bold">{t(n.title)}</div>
              <div className="text-[11px] text-slate-600">{t(n.body)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
