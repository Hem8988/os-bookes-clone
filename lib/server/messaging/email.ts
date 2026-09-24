import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '@/lib/db';

let transporter: Transporter | null = null;

export const emailConfigured = () => !!process.env.SMTP_HOST;

function getTransporter(): Transporter | null {
  if (!emailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(tenantId: string, to: string, subject: string, text: string, templateKey?: string) {
  const mailer = getTransporter();
  let status = 'SIMULATED';
  let error: string | undefined;
  let providerId: string | undefined;
  if (mailer) {
    try {
      const info = await mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
      status = 'SENT';
      providerId = info.messageId;
    } catch (e) {
      status = 'FAILED';
      error = e instanceof Error ? e.message : String(e);
    }
  }
  await prisma.messageLog.create({
    data: { tenantId, channel: 'EMAIL', direction: 'OUT', recipient: to, subject, body: text, templateKey, status, error, providerId },
  });
  return status !== 'FAILED';
}
