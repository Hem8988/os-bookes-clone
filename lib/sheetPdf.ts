'use client';

// Turn a printed sheet on screen (invoice, challan) into an A4 PDF in the browser, so the file
// looks exactly like the print. The libraries load only when someone actually makes a PDF.

const PAGE_W = 210; // A4, mm
const PAGE_H = 297;
const MARGIN = 6;

async function snapshot(el: HTMLElement): Promise<string> {
  const { toPng } = await import('html-to-image');
  const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false };
  try {
    return await toPng(el, opts);
  } catch {
    // A web font that cannot be read should not stop the PDF; the system font is used instead.
    return toPng(el, { ...opts, skipFonts: true });
  }
}

/**
 * A4 PDF of the element; a sheet taller than one page continues on the next pages.
 * `width`: the sheet is laid out at this width while it is captured, so a phone screen
 * does not squeeze it.
 */
export async function sheetToPdf(el: HTMLElement, width = 800): Promise<Blob> {
  const before = el.style.width;
  el.style.width = `${width}px`;
  let png: string;
  try {
    png = await snapshot(el);
  } finally {
    el.style.width = before;
  }
  const { jsPDF } = await import('jspdf');
  const img = new Image();
  img.src = png;
  await img.decode();

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const w = PAGE_W - MARGIN * 2;
  const h = (img.naturalHeight * w) / img.naturalWidth;
  const usable = PAGE_H - MARGIN * 2;
  for (let offset = 0; offset < h; offset += usable) {
    if (offset > 0) pdf.addPage();
    pdf.addImage(png, 'PNG', MARGIN, MARGIN - offset, w, h, undefined, 'FAST');
  }
  return pdf.output('blob');
}
