// =========================================================
// Générateur PDF minimal (sans dépendance) — équivalent PdfDocument Android.
// Chaque page = une image JPEG placée dans un rectangle (en points PDF).
// =========================================================
import { canvasToJpegBytes, fitRect } from './image.js';

export const PDF_WIDTH = 595;  // A4 en points (comme MainActivity.PDF_WIDTH)
export const PDF_HEIGHT = 842;

const enc = new TextEncoder();

/**
 * @param {Array<{jpeg:Uint8Array, imgW:number, imgH:number, rect:{x,y,w,h}}>} pages
 * @returns {Blob} application/pdf
 */
export function buildPdf(pages, { width = PDF_WIDTH, height = PDF_HEIGHT } = {}) {
  const chunks = []; const offsets = []; let pos = 0;
  const push = (data) => { const b = typeof data === 'string' ? enc.encode(data) : data; chunks.push(b); pos += b.length; };
  const obj = (n, body) => { offsets[n] = pos; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length;
  // 1: catalogue, 2: arbre des pages, puis 3 objets par page (page, contenu, image)
  const pageIds = pages.map((_, i) => 3 + i * 3);
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${n} >>`));

  pages.forEach((p, i) => {
    const pid = pageIds[i], cid = pid + 1, iid = pid + 2;
    const { x, y, w, h } = p.rect;
    // Origine PDF en bas à gauche
    const content = `q\n1 1 1 rg 0 0 ${width} ${height} re f\n${f(w)} 0 0 ${f(h)} ${f(x)} ${f(height - y - h)} cm\n/Im0 Do\nQ\n`;
    obj(pid, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /XObject << /Im0 ${iid} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${cid} 0 R >>`));
    obj(cid, () => { push(`<< /Length ${content.length} >>\nstream\n`); push(content); push('endstream'); });
    obj(iid, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.imgW} /Height ${p.imgH} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg); push('\nendstream');
    });
  });

  const total = 3 + n * 3;
  const xref = pos;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info << /Producer (ScanPro PWA) >> >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

const f = (v) => (Math.round(v * 100) / 100).toString();

/**
 * Pages scannées → PDF : chaque image centrée « plein page » (drawBitmapFullPage).
 * @param {HTMLCanvasElement[]} canvases
 * @param {'fit'|'full'} mode  fit = centrée avec marges blanches ; full = la page occupe tout le canvas
 */
export async function canvasesToPdf(canvases, mode = 'fit') {
  const pages = [];
  for (const c of canvases) {
    const rect = mode === 'full'
      ? { x: 0, y: 0, w: PDF_WIDTH, h: PDF_HEIGHT }
      : fitRect(c.width, c.height, PDF_WIDTH, PDF_HEIGHT);
    pages.push({ jpeg: await canvasToJpegBytes(c, 0.9), imgW: c.width, imgH: c.height, rect });
  }
  return buildPdf(pages);
}
