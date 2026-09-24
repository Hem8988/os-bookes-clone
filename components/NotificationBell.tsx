'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { api } from '../lib/api';

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

/** In-app notifications (approvals waiting, deliveries sent back, …). */
export const NotificationBell: React.FC<{ onNavigate?: (link: string) => void; tone?: 'light' | 'dark' }> = ({ onNavigate, tone = 'light' }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushState, setPushState] = useState<'unknown' | 'on' | 'off'>('unknown');

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: NotificationItem[]; unread: number }>('/api/notifications', { redirectOn401: false });
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* offline — keep last state */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 60_000);
    if (typeof Notification !== 'undefined') setPushState(Notification.permission === 'granted' ? 'on' : 'off');
    return () => window.clearInterval(timer);
  }, [load]);

  const markAll = async () => {
    await api('/api/notifications', { body: {} });
    await load();
  };

  const iconClass = tone === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`relative p-2 rounded-full transition-colors cursor-pointer ${iconClass}`} title="Notifications">
        {unread > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50 text-slate-900">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-black">Notifications</span>
            <div className="flex gap-2">
              {pushState === 'off' && VAPID_KEY && (
                <button onClick={async () => setPushState((await enablePush()) ? 'on' : 'off')} className="text-[11px] font-bold text-emerald-700">
                  Enable push
                </button>
              )}
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] font-bold text-slate-500">
                  Mark all read
                </button>
              )}
            </div>
          </div>
          {items.length === 0 && <div className="p-4 text-xs text-slate-400 text-center">No notifications.</div>}
          {items.map((n) => (
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
              <div className="text-xs font-bold">{n.title}</div>
              <div className="text-[11px] text-slate-600">{n.body}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
