import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '@/lib/db';
import { open } from '../secretBox';
import { getSetting } from '../settings';

// Outgoing email. SMTP comes from Settings → Email (per tenant, password sealed
// in the database); the SMTP_* environment variables are the fallback.

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

const envConfig = (): SmtpConfig | null =>
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
      }
    : null;

export async function smtpConfig(tenantId: string): Promise<SmtpConfig | null> {
  const s = await getSetting(tenantId, 'email');
  if (s.host) return { host: s.host, port: Number(s.port) || 587, secure: !!s.secure, user: s.user, pass: open(s.passwordSealed) || '', from: s.from || s.user };
  return envConfig();
}

/** Whether real email can go out for this tenant (otherwise sends are only logged). */
export async function emailReady(tenantId: string): Promise<boolean> {
  return !!(await smtpConfig(tenantId));
}

const transporters = new Map<string, Transporter>();

function transporterFor(c: SmtpConfig): Transporter {
  const cacheKey = `${c.host}|${c.port}|${c.secure}|${c.user}|${c.pass}`;
  let t = transporters.get(cacheKey);
  if (!t) {
    t = nodemailer.createTransport({ host: c.host, port: c.port, secure: c.secure, auth: c.user ? { user: c.user, pass: c.pass } : undefined });
    transporters.set(cacheKey, t);
  }
  return t;
}

/** Connect and log in to the SMTP server without sending anything. */
export async function verifySmtp(tenantId: string): Promise<void> {
  const c = await smtpConfig(tenantId);
  if (!c) throw new Error('Email is not configured.');
  await transporterFor(c).verify();
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendEmail(tenantId: string, to: string, subject: string, text: string, templateKey?: string, attachments?: EmailAttachment[]) {
  const config = await smtpConfig(tenantId);
  let status = 'SIMULATED';
  let error: string | undefined;
  let providerId: string | undefined;
  if (config) {
    try {
      const info = await transporterFor(config).sendMail({ from: config.from || config.user, to, subject, text, attachments });
      status = 'SENT';
      providerId = info.messageId;
    } catch (e) {
      status = 'FAILED';
      error = e instanceof Error ? e.message : String(e);
    }
  }
  const body = attachments?.length ? `${text}\n\n[Attached: ${attachments.map((a) => a.filename).join(', ')}]` : text;
  await prisma.messageLog.create({ data: { tenantId, channel: 'EMAIL', direction: 'OUT', recipient: to, subject, body, templateKey, status, error, providerId } });
  // Never throws: notifications must not break the flow that sent them.
  return { status: status as 'SENT' | 'SIMULATED' | 'FAILED', error };
}
