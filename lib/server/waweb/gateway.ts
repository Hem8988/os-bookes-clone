import fs from 'node:fs';
import path from 'node:path';
import type { WAMessage, WASocket, AnyMessageContent } from '@whiskeysockets/baileys';
import { prisma } from '@/lib/db';

/**
 * Built-in WhatsApp Web gateway (QR login through the open-source Baileys library, no paid API).
 *
 * Every staff member the admin allows can link one number (WaSession). The sockets live in this
 * Node.js server process; the login of each number is kept under storage/wa-sessions/<sessionId>
 * so a restart reconnects without a new QR. The company number (isCompany) carries the automatic
 * messages and the ordering bot ("main" channel); the others are personal chats ("u:<userId>").
 *
 * State is kept on globalThis: Next.js loads this file in more than one bundle (instrumentation,
 * each route), and all of them must see the same sockets.
 *
 * It is not the official WhatsApp API: WhatsApp can block a number that sends many messages to
 * people who did not save it, so automatic messages go out with a gap between them.
 */

export type WaStatus = 'NEW' | 'CONNECTING' | 'QR' | 'CONNECTED' | 'RECONNECTING' | 'QR_EXPIRED' | 'LOGGED_OUT' | 'STOPPED';

type Live = {
  id: string;
  tenantId: string;
  sock: WASocket | null;
  status: WaStatus;
  qr: string;
  number: string;
  name: string;
  retry: number;
  stopping: boolean;
  /** Sends are serialized per number; automatic ones keep a gap. */
  chain: Promise<unknown>;
  lastAutoSendAt: number;
};

type State = {
  sessions: Map<string, Live>;
  /** Numbered choices sent as text (WhatsApp Web has no buttons): "<channel>|<phone>" → option ids. */
  choices: Map<string, { ids: string[]; at: number }>;
  booted: boolean;
};

const g = globalThis as unknown as { __deskWa?: State };
const state: State = (g.__deskWa ??= { sessions: new Map(), choices: new Map(), booted: false });

// Logins outlive deploys when WA_SESSION_DIR points outside the app folder. Do not symlink
// <app>/storage out of the project instead: the build traces this folder and rejects such links.
const SESS_DIR = process.env.WA_SESSION_DIR || path.join(process.cwd(), 'storage', 'wa-sessions');
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const AUTO_GAP_MS: [number, number] = [2000, 5000];
const CHOICE_TTL_MS = 60 * 60_000;

export const channelOf = (s: { isCompany: boolean; userId: string }) => (s.isCompany ? 'main' : `u:${s.userId}`);
const phoneOf = (jid: string | null | undefined) => String(jid || '').split('@')[0].split(':')[0];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const validId = (id: string) => /^[a-z0-9]{8,40}$/i.test(id);
const authDir = (id: string) => path.join(SESS_DIR, id);
const hasLogin = (id: string) => fs.existsSync(path.join(authDir(id), 'creds.json'));

function log(id: string, ...parts: unknown[]) {
  console.info(`[whatsapp ${id.slice(-6)}]`, ...parts);
}

async function baileys() {
  return import('@whiskeysockets/baileys');
}

let quietLogger: unknown;
/** Baileys' own log: warnings and errors only (WA_LOG=debug for everything while troubleshooting). */
async function logger() {
  if (!quietLogger) {
    const pino = (await import('pino')).default;
    quietLogger = pino({ level: process.env.WA_LOG || 'warn', base: { app: 'whatsapp' } });
  }
  return quietLogger as never;
}

async function setStatus(s: Live, status: WaStatus, extra: { qr?: string; number?: string; name?: string; error?: string | null } = {}) {
  s.status = status;
  if (extra.qr !== undefined) s.qr = extra.qr;
  if (extra.number !== undefined) s.number = extra.number;
  if (extra.name !== undefined) s.name = extra.name;
  // The QR changes every ~20 s and stays in memory only.
  if (status === 'QR') return;
  await prisma.waSession
    .update({
      where: { id: s.id },
      data: {
        status,
        ...(extra.number !== undefined ? { number: extra.number || null } : {}),
        ...(extra.name !== undefined ? { name: extra.name || null } : {}),
        ...(status === 'CONNECTED' ? { connectedAt: new Date(), lastError: null } : {}),
        ...(extra.error !== undefined ? { lastError: extra.error } : {}),
      },
    })
    .catch(() => {});
}

/** Start (or keep) the socket of one number. A number that was never linked shows a QR. */
export async function startSession(sessionId: string): Promise<void> {
  if (!validId(sessionId)) throw new Error('Invalid WhatsApp session.');
  let s = state.sessions.get(sessionId);
  if (s && ['CONNECTING', 'QR', 'CONNECTED', 'RECONNECTING'].includes(s.status) && s.sock) return;
  const row = await prisma.waSession.findUnique({ where: { id: sessionId } });
  if (!row) throw new Error('WhatsApp number not found.');
  if (!s) {
    s = { id: sessionId, tenantId: row.tenantId, sock: null, status: 'CONNECTING', qr: '', number: row.number || '', name: row.name || '', retry: 0, stopping: false, chain: Promise.resolve(), lastAutoSendAt: 0 };
    state.sessions.set(sessionId, s);
  }
  s.stopping = false;
  await setStatus(s, s.retry ? 'RECONNECTING' : 'CONNECTING');

  const { default: makeWASocket, useMultiFileAuthState: multiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, fetchLatestWaWebVersion, Browsers } = await baileys();
  fs.mkdirSync(authDir(sessionId), { recursive: true });
  const { state: auth, saveCreds } = await multiFileAuthState(authDir(sessionId));
  // The current WhatsApp Web version: with an older one the phone scans the QR but WhatsApp refuses the link.
  let version: [number, number, number] | undefined;
  try {
    ({ version } = await fetchLatestWaWebVersion({}));
  } catch {
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = undefined;
    }
  }
  log(sessionId, `starting with WhatsApp Web ${version?.join('.') || 'default'}`);
  const sock = makeWASocket({
    version,
    auth,
    logger: await logger(),
    // A standard browser name: WhatsApp may refuse to link an unknown one ("Couldn't link device").
    browser: Browsers.windows('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });
  const live = s;
  live.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    if (u.qr) {
      const QRCode = (await import('qrcode')).default;
      // SVG stays sharp at any size: a scaled-down PNG blurs the tiny squares and phones cannot read it.
      const svg = await QRCode.toString(u.qr, { type: 'svg', margin: 3, errorCorrectionLevel: 'L', color: { dark: '#000000', light: '#ffffff' } });
      await setStatus(live, 'QR', { qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` });
      log(sessionId, 'new QR ready');
    }
    if (u.isNewLogin) log(sessionId, 'QR scanned — finishing the link');
    if (u.connection === 'open') {
      live.retry = 0;
      const me = sock.user;
      await setStatus(live, 'CONNECTED', { qr: '', number: phoneOf(me?.id), name: me?.name || me?.verifiedName || '' });
      log(sessionId, `connected as ${live.number}`);
    }
    if (u.connection === 'close') {
      const err = u.lastDisconnect?.error as { message?: string; output?: { statusCode?: number } } | undefined;
      const code = err?.output?.statusCode;
      log(sessionId, `connection closed: ${code ?? '?'} ${err?.message || ''}`.trim());
      if (live.sock === sock) live.sock = null;
      // Right after a QR scan WhatsApp asks for a fresh connection (515): reconnect at once with the new login.
      if (code === DisconnectReason.restartRequired) {
        live.retry = 0;
        await setStatus(live, 'CONNECTING');
        setTimeout(() => {
          if (state.sessions.get(sessionId) === live && !live.stopping) startSession(sessionId).catch((e) => log(sessionId, 'restart failed:', (e as Error).message));
        }, 1000);
        return;
      }
      if (code === DisconnectReason.loggedOut || code === DisconnectReason.forbidden) {
        fs.rmSync(authDir(sessionId), { recursive: true, force: true });
        await setStatus(live, 'LOGGED_OUT', { qr: '', error: 'Logged out from the phone.' });
        log(sessionId, 'logged out; scan the QR again to link it');
        return;
      }
      if (live.stopping) return;
      // Never linked and nobody scanned the QR in time: stop until someone opens the QR again.
      if (!auth.creds?.registered && (code === DisconnectReason.timedOut || code === DisconnectReason.connectionClosed)) {
        await setStatus(live, 'QR_EXPIRED', { qr: '' });
        return;
      }
      live.retry = Math.min(live.retry + 1, 8);
      const wait = Math.min(60, 2 ** live.retry) * 1000;
      await setStatus(live, 'RECONNECTING', { error: `Connection closed (${code ?? 'unknown'}).` });
      setTimeout(() => {
        if (state.sessions.get(sessionId) === live && !live.stopping) startSession(sessionId).catch((e) => log(sessionId, 'restart failed:', (e as Error).message));
      }, wait);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    for (const m of messages) {
      try {
        await passMessage(live, sock, m);
      } catch (e) {
        log(sessionId, 'incoming message failed:', (e as Error).message);
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    const { updateWhatsAppStatus } = await import('../whatsappInbox');
    for (const u of updates) {
      const st = u.update?.status;
      if (!u.key?.fromMe || st === undefined || st === null) continue;
      const status = st >= 4 ? 'read' : st >= 3 ? 'delivered' : st >= 2 ? 'sent' : null;
      if (status && u.key.id) await updateWhatsAppStatus([u.key.id], status).catch(() => {});
    }
  });
}

function textOf(m: WAMessage) {
  const msg = m.message || {};
  const inner = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg.viewOnceMessageV2?.message || msg;
  const kind = (['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'] as const).find((k) => inner[k]);
  const text =
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.buttonsResponseMessage?.selectedButtonId ||
    inner.listResponseMessage?.singleSelectReply?.selectedRowId ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    (inner.locationMessage ? `Location: ${inner.locationMessage.degreesLatitude},${inner.locationMessage.degreesLongitude}` : '') ||
    (inner.contactMessage ? `Contact: ${inner.contactMessage.displayName}` : '') ||
    '';
  return { kind, text: String(text), inner };
}

async function passMessage(s: Live, sock: WASocket, m: WAMessage) {
  const jid = m.key?.remoteJid || '';
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@newsletter') || jid.endsWith('@broadcast')) return;
  if (!m.message || m.message.protocolMessage || m.message.reactionMessage) return;
  // A contact may come as an anonymous "LID"; its phone number is then in remoteJidAlt.
  const { jidNormalizedUser, downloadMediaMessage } = await baileys();
  const alt = (m.key as { remoteJidAlt?: string }).remoteJidAlt;
  const pnJid = jid.endsWith('@lid') ? alt || '' : jid;
  const phone = phoneOf(jidNormalizedUser(pnJid));
  if (!/^\d{10,15}$/.test(phone)) return;

  const row = await prisma.waSession.findUnique({ where: { id: s.id } });
  if (!row) return;
  const channel = channelOf(row);
  const { kind, text, inner } = textOf(m);
  const inbox = await import('../whatsappInbox');

  if (m.key.fromMe) {
    // Typed on the phone itself. Messages the app sends come back here too, before the app has
    // logged them, so wait a moment: an id the app logged meanwhile is skipped.
    const id = m.key.id;
    if (id) {
      const body = text || (kind ? `[${kind.replace('Message', '')}]` : '');
      setTimeout(() => inbox.recordOwnMessage(row.tenantId, channel, phone, body, id).catch(() => {}), 5000);
    }
    return;
  }

  const mediaPart = kind ? (inner[kind] as { fileLength?: number | { low?: number }; mimetype?: string } | null | undefined) : null;
  const size = mediaPart ? Number(typeof mediaPart.fileLength === 'object' ? mediaPart.fileLength?.low : mediaPart.fileLength) || 0 : 0;
  const media = kind
    ? {
        kind: kind.replace('Message', '') as 'image' | 'document' | 'video' | 'audio' | 'sticker',
        caption: text,
        download: async () => {
          if (size > MAX_MEDIA_BYTES) return null;
          const data = await downloadMediaMessage(m, 'buffer', {}, { logger: await logger(), reuploadRequest: sock.updateMediaMessage });
          return Buffer.isBuffer(data) ? data : null;
        },
      }
    : null;

  // "1", "2"… answers a numbered list we sent as text: hand the option id to the bot.
  const picked = channel === 'main' ? resolveChoice(channel, phone, text) : null;
  await inbox.receiveWhatsApp(row.tenantId, {
    phone,
    text: picked || text,
    providerId: m.key.id,
    name: m.pushName || null,
    media,
    channel,
  });
}

/** Stop a number; with logout the phone's "Linked devices" entry is removed too. */
export async function stopSession(sessionId: string, logout: boolean) {
  const s = state.sessions.get(sessionId);
  if (s) {
    s.stopping = true;
    try {
      if (logout && s.sock) await s.sock.logout();
      else s.sock?.end(undefined);
    } catch {
      // already closed
    }
    state.sessions.delete(sessionId);
  }
  if (logout) fs.rmSync(authDir(sessionId), { recursive: true, force: true });
  await prisma.waSession.update({ where: { id: sessionId }, data: { status: logout ? 'LOGGED_OUT' : 'STOPPED' } }).catch(() => {});
}

/**
 * Link without scanning: WhatsApp → Linked devices → Link a device → "Link with phone number instead",
 * then type the 8-character code shown here. Works while the number is waiting for its QR.
 */
export async function requestPairingCode(sessionId: string, phone: string): Promise<string> {
  const digits = phone.replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits;
  if (number.length < 11 || number.length > 15) throw new Error('Enter the WhatsApp mobile number of this phone.');
  let s = state.sessions.get(sessionId);
  if (!s || !s.sock || !['QR', 'CONNECTING'].includes(s.status)) {
    await startSession(sessionId);
    s = state.sessions.get(sessionId);
  }
  // The code can only be asked for once the connection is up (the first QR has arrived).
  for (let i = 0; i < 30 && s && s.status !== 'QR'; i++) await sleep(500);
  if (!s?.sock || s.status !== 'QR') throw new Error('WhatsApp did not get ready. Try again in a moment.');
  const code = await s.sock.requestPairingCode(number);
  log(sessionId, `pairing code requested for ${number.slice(0, 4)}…${number.slice(-2)}`);
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Live state for the numbers screen (QR while linking). */
export function liveStatus(sessionId: string) {
  const s = state.sessions.get(sessionId);
  return s ? { status: s.status, qr: s.status === 'QR' ? s.qr : '', number: s.number, name: s.name } : null;
}

export const isConnected = (sessionId: string) => {
  const s = state.sessions.get(sessionId);
  return !!s && s.status === 'CONNECTED' && !!s.sock;
};

export type WaContent =
  | { text: string }
  | { image: { data?: Buffer; url?: string }; caption?: string; mimetype?: string }
  | { document: { data?: Buffer; url?: string }; fileName: string; mimetype: string; caption?: string };

function toBaileys(c: WaContent): AnyMessageContent {
  if ('text' in c) return { text: c.text };
  if ('image' in c) return { image: c.image.data ?? { url: c.image.url! }, caption: c.caption || undefined, ...(c.mimetype ? { mimetype: c.mimetype } : {}) };
  return { document: c.document.data ?? { url: c.document.url! }, fileName: c.fileName, mimetype: c.mimetype, caption: c.caption || undefined };
}

/**
 * Send from one linked number. Sends of a number go one after another; automatic messages
 * (priority false) keep a few seconds' gap so the number looks less like a robot.
 */
export function sendViaSession(sessionId: string, phone: string, content: WaContent, opts: { priority?: boolean } = {}): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const s = state.sessions.get(sessionId);
  if (!s || s.status !== 'CONNECTED' || !s.sock) return Promise.resolve({ ok: false, error: 'This WhatsApp number is not connected. Open WhatsApp → Numbers and scan the QR again.' });
  const to = phone.replace(/\D/g, '');
  if (to.length < 11 || to.length > 15) return Promise.resolve({ ok: false, error: `Invalid mobile number "${phone}".` });

  const run = async () => {
    const sock = s.sock;
    if (!sock || s.status !== 'CONNECTED') return { ok: false, error: 'This WhatsApp number got disconnected.' };
    if (!opts.priority) {
      const [a, b] = AUTO_GAP_MS;
      const wait = s.lastAutoSendAt + a + Math.random() * (b - a) - Date.now();
      if (wait > 0) await sleep(wait);
    }
    try {
      const [check] = (await sock.onWhatsApp(to)) || [];
      if (!check?.exists) return { ok: false, error: `+${to} is not on WhatsApp.` };
      if (!opts.priority) {
        await sock.sendPresenceUpdate('composing', check.jid).catch(() => {});
        await sleep(600 + Math.min(2500, ('text' in content ? content.text.length : 40) * 15));
      }
      const sent = await sock.sendMessage(check.jid, toBaileys(content));
      return { ok: true, providerId: sent?.key?.id || undefined };
    } catch (e) {
      return { ok: false, error: (e as Error).message || 'WhatsApp did not take the message.' };
    } finally {
      if (!opts.priority) s.lastAutoSendAt = Date.now();
    }
  };
  const next = s.chain.then(run, run);
  s.chain = next.catch(() => {});
  return next;
}

/** Remember the option ids of a numbered list sent as text. */
export function rememberChoices(channel: string, phone: string, ids: string[]) {
  state.choices.set(`${channel}|${phone}`, { ids, at: Date.now() });
}

/** Any other message to this chat replaces the last numbered list: "4" then means 4, not option 4. */
export function clearChoices(channel: string, phone: string) {
  state.choices.delete(`${channel}|${phone}`);
}

export function resolveChoice(channel: string, phone: string, text: string): string | null {
  const n = text.trim().match(/^(\d{1,2})\.?$/)?.[1];
  if (!n) return null;
  const entry = state.choices.get(`${channel}|${phone}`);
  if (!entry || Date.now() - entry.at > CHOICE_TTL_MS) return null;
  return entry.ids[Number(n) - 1] ?? null;
}

/** The linked number that serves a chat channel ("main" = the company number). */
export async function sessionForChannel(tenantId: string, channel: string) {
  return channel === 'main'
    ? prisma.waSession.findFirst({ where: { tenantId, isCompany: true } })
    : channel.startsWith('u:')
      ? prisma.waSession.findFirst({ where: { tenantId, userId: channel.slice(2) } })
      : null;
}

/** On server start: reconnect every number that was linked (its login is on disk). */
export async function bootGateway() {
  if (state.booted || process.env.WA_GATEWAY === 'off') return;
  state.booted = true;
  try {
    const rows = await prisma.waSession.findMany({ where: { status: { notIn: ['LOGGED_OUT', 'STOPPED', 'NEW'] } }, select: { id: true } });
    for (const r of rows) {
      if (!hasLogin(r.id)) {
        await prisma.waSession.update({ where: { id: r.id }, data: { status: 'LOGGED_OUT' } }).catch(() => {});
        continue;
      }
      startSession(r.id).catch((e) => log(r.id, 'start failed:', (e as Error).message));
      await sleep(1500);
    }
  } catch (e) {
    console.error('[whatsapp] gateway boot failed:', (e as Error).message);
  }
}
