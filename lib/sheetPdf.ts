'use client';

// Turn printed sheets on screen (invoice copies, challan, the paperwork photos after an invoice)
// into an A4 PDF in the browser, so the file looks exactly like the print. The libraries load
// only when someone actually makes a PDF.

const PAGE_W = 210; // A4, mm
const PAGE_H = 297;
const MARGIN = 6;

async function snapshot(el: HTMLElement, width: number): Promise<string> {
  const { toPng } = await import('html-to-image');
  // Laid out at the print width while captured, so a phone screen does not squeeze it.
  const before = el.style.width;
  el.style.width = `${width}px`;
  const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false };
  try {
    return await toPng(el, opts);
  } catch {
    // A web font that cannot be read should not stop the PDF; the system font is used instead.
    return toPng(el, { ...opts, skipFonts: true });
  } finally {
    el.style.width = before;
  }
}

async function size(png: string) {
  const img = new Image();
  img.src = png;
  await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight };
}

/**
 * A4 PDF with each element on its own page (an invoice copy, a challan photo…). An element
 * taller than a page continues on the next pages; a photo page is shrunk to fit one page.
 */
export async function sheetsToPdf(els: HTMLElement[], width = 800): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const usableW = PAGE_W - MARGIN * 2;
  const usableH = PAGE_H - MARGIN * 2;
  let first = true;
  for (const el of els) {
    const png = await snapshot(el, width);
    const px = await size(png);
    let w = usableW;
    let h = (px.h * w) / px.w;
    const isPhoto = el.dataset.pdfFit === 'page';
    if (isPhoto && h > usableH) {
      w = (w * usableH) / h;
      h = usableH;
    }
    const x = MARGIN + (usableW - w) / 2;
    for (let offset = 0; offset < h; offset += usableH) {
      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(png, 'PNG', x, MARGIN - offset, w, h, undefined, 'FAST');
    }
  }
  return pdf.output('blob');
}

/** A4 PDF of one sheet. */
export const sheetToPdf = (el: HTMLElement, width = 800) => sheetsToPdf([el], width);
