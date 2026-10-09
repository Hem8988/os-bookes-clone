import { createHmac, timingSafeEqual } from 'crypto';
import path from 'path';

/**
 * Image header for WhatsApp messages: a white card on green with the company name,
 * a label, a big value and a status pill (like a billing-app invoice message).
 * WhatsApp fetches it from a public, signed URL, so nobody can make cards with our name.
 */
export type CardData = { company: string; label: string; value: string; badge: string; note: string };

const signature = (payload: string) => createHmac('sha256', process.env.SESSION_SECRET || 'deskshark-dev').update(`wa-card:${payload}`).digest('base64url').slice(0, 32);

/** Public link to the card image, or null when APP_URL is not set (WhatsApp needs a full URL). */
export function cardUrl(data: CardData) {
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  if (!appUrl) return null;
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${appUrl}/api/wa/card?d=${payload}&s=${signature(payload)}`;
}

export function readCard(payload: string | null, sig: string | null): CardData | null {
  if (!payload || !sig || payload.length > 2000) return null;
  const expected = Buffer.from(signature(payload));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<CardData>;
    return { company: String(d.company || ''), label: String(d.label || ''), value: String(d.value || ''), badge: String(d.badge || ''), note: String(d.note || '') };
  } catch {
    return null;
  }
}

const FONT = 'DeskSharkCard';
const W = 800;
const H = 420;

export async function renderCardPng(card: CardData): Promise<Buffer> {
  const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas');
  // Bundled font: servers often have no fonts, and it has the ₹ sign (OFL, Vercel Geist).
  if (!GlobalFonts.has(FONT)) GlobalFonts.registerFromPath(path.join(process.cwd(), 'assets', 'fonts', 'Geist-Regular.ttf'), FONT);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#6fbf7e');
  bg.addColorStop(1, '#a9dca0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // The white card.
  const x = 56, y = 40, w = W - 112, h = H - 80;
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 22);
  ctx.fill();
  ctx.restore();

  const fit = (text: string, max: number, font: (size: number) => string, size: number) => {
    let s = size;
    ctx.font = font(s);
    while (s > 12 && ctx.measureText(text).width > max) ctx.font = font(--s);
  };
  const center = W / 2;
  const maxText = w - 64;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#1e2a46';
  fit(card.company.toUpperCase(), maxText, (s) => `${s}px ${FONT}`, 34);
  ctx.fillText(card.company.toUpperCase(), center, y + 62);
  // Thin rule under the name.
  ctx.strokeStyle = '#c9a85a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(center - 60, y + 92);
  ctx.lineTo(center + 60, y + 92);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  fit(card.label, maxText, (s) => `${s}px ${FONT}`, 24);
  ctx.fillText(card.label, center, y + 132);

  ctx.fillStyle = '#0f172a';
  fit(card.value, maxText, (s) => `bold ${s}px ${FONT}`, 56);
  ctx.fillText(card.value, center, y + 184);

  if (card.badge) {
    ctx.font = `bold 18px ${FONT}`;
    const bw = Math.min(maxText, ctx.measureText(card.badge).width + 48);
    ctx.fillStyle = '#1f9d55';
    ctx.beginPath();
    ctx.roundRect(center - bw / 2, y + 230, bw, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(card.badge, center, y + 249);
  }

  if (card.note) {
    ctx.fillStyle = '#475569';
    fit(card.note, maxText, (s) => `${s}px ${FONT}`, 19);
    ctx.fillText(card.note, center, y + 300);
  }

  return canvas.toBuffer('image/png');
}
