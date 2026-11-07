import fs from 'node:fs';
import { invoiceViewPath } from './payPage';

// The invoice as a PDF on the server, for the automatic WhatsApp invoice message: headless
// Chromium opens the public invoice page (/i/<token>) on this server and prints it with the
// same print styles as the Print button. Without Chromium this returns null and the message
// goes out as before (card + link).
//
// Install on AlmaLinux / RHEL: dnf install chromium-headless   (or set CHROMIUM_PATH)

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/usr/lib64/chromium-browser/headless_shell',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean) as string[];

export function chromiumPath(): string | null {
  return CANDIDATES.find((p) => fs.existsSync(p)) ?? null;
}

const TIMEOUT_MS = 30_000;

/** For notifyCustomer(…, makePdf): the invoice PDF and its file name, or null without Chromium. */
export const invoicePdfMaker = (invoiceId: string, invoiceNumber: string) => async () => {
  const data = await renderInvoicePdf(invoiceId);
  return data ? { data, filename: `Invoice-${invoiceNumber.replace(/[^\w-]+/g, '-')}.pdf` } : null;
};

export async function renderInvoicePdf(invoiceId: string): Promise<Buffer | null> {
  const executablePath = chromiumPath();
  const path = invoiceViewPath(invoiceId);
  if (!executablePath || !path) return null;
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--no-zygote'],
    timeout: TIMEOUT_MS,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200 });
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle0', timeout: TIMEOUT_MS });
    // The sheet appears once the invoice data and the company profile have loaded.
    await page.waitForSelector('.printable-invoice', { timeout: TIMEOUT_MS });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, timeout: TIMEOUT_MS });
    return Buffer.from(pdf);
  } catch (e) {
    console.error('[invoice pdf] failed:', (e as Error).message);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}
