// =========================================================
// Texte enrichi — modèle commun pour l'export DOCX et PDF
// (équivalent des Spans Android : StyleSpan, UnderlineSpan,
//  AbsoluteSizeSpan, ForegroundColorSpan, AlignmentSpan)
//
// Paragraph = { align: 'left'|'center'|'right', runs: Run[] }
// Run       = { text, bold, italic, underline, size (px|null), color ('#RRGGBB'|null) }
// =========================================================
import { createCanvas } from './image.js';

const BLOCKS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'SECTION']);

function rgbToHex(rgb) {
  const m = rgb.match(/\d+(\.\d+)?/g); if (!m) return null;
  return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function alignOf(el) {
  const cs = getComputedStyle(el);
  const a = cs.textAlign, rtl = cs.direction === 'rtl';
  if (a === 'center' || a === '-webkit-center') return 'center';
  if (a === 'right' || a === '-webkit-right' || (a === 'end' && !rtl) || (a === 'start' && rtl)) return 'right';
  return 'left';
}

/** Analyse le contenu d'un contenteditable → Paragraph[] */
export function parseRichText(root, { baseSize = 15, baseColor = '#1E293B' } = {}) {
  const paras = [];
  let cur = null;
  const open = (el) => { cur = { align: alignOf(el), runs: [] }; paras.push(cur); return cur; };

  const runFor = (textNode, text) => {
    const el = textNode.parentElement;
    const cs = getComputedStyle(el);
    let underline = false;
    for (let a = el; a && a !== root.parentElement; a = a.parentElement) {
      if (getComputedStyle(a).textDecorationLine.includes('underline')) { underline = true; break; }
    }
    const size = parseFloat(cs.fontSize);
    const color = rgbToHex(cs.color);
    return {
      text,
      bold: parseInt(cs.fontWeight, 10) >= 600,
      italic: cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique'),
      underline,
      size: Math.abs(size - baseSize) < 0.5 ? null : size,
      color: color === baseColor.toUpperCase() ? null : color,
    };
  };

  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.data.split('\n');
        parts.forEach((part, i) => {
          if (i > 0) { if (!cur) open(child.parentElement); cur = null; }
          if (part) (cur || open(child.parentElement)).runs.push(runFor(child, part));
        });
      } else if (child.nodeName === 'BR') {
        if (!cur) open(child.parentElement);
        cur = null;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (BLOCKS.has(child.nodeName)) {
          cur = null; walk(child);
          if (!child.textContent && !child.querySelector('br')) open(child); // bloc vide
          cur = null;
        } else walk(child);
      }
    }
  };
  walk(root);
  return paras.length ? paras : [{ align: 'left', runs: [] }];
}

/** Texte brut (pour le compteur de caractères). */
export const plainText = (paras) => paras.map((p) => p.runs.map((r) => r.text).join('')).join('\n');

// ---------------------------------------------------------
// Rendu PDF (canvas) — reprend buildPdf()/drawSpannedLine() de WordEditorActivity
// ---------------------------------------------------------
const PAGE_W = 595, PAGE_H = 842, MARGIN = 56, LINE_H = 22, PDF_BASE = 15;
const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_RE = /[A-Za-z\u00C0-\u024F]/;

const fontOf = (r, scale) =>
  `${r.italic ? 'italic ' : ''}${r.bold ? 'bold ' : ''}${(r.size ?? PDF_BASE) * scale}px Roboto, "Segoe UI", Arial, "Noto Sans Arabic", sans-serif`;

function isRtlText(text) {
  for (const ch of text) { if (RTL_RE.test(ch)) return true; if (LTR_RE.test(ch)) return false; }
  return false;
}

/** Découpe les paragraphes en lignes (retour à la ligne par mots). */
function layout(paras, ctx, maxW) {
  const lines = [];
  for (const p of paras) {
    const rtl = isRtlText(p.runs.map((r) => r.text).join(''));
    if (!p.runs.length) { lines.push({ align: p.align, rtl, pieces: [], height: LINE_H }); continue; }
    // Jetons : mots + espaces, chacun avec son style
    const tokens = [];
    for (const r of p.runs) for (const tk of r.text.split(/(\s+)/)) if (tk) tokens.push({ ...r, text: tk });
    let line = { align: p.align, rtl, pieces: [], width: 0, height: LINE_H };
    const flush = () => {
      while (line.pieces.length && /^\s+$/.test(line.pieces.at(-1).text)) line.width -= line.pieces.pop().w;
      lines.push(line); line = { align: p.align, rtl, pieces: [], width: 0, height: LINE_H };
    };
    for (const tk of tokens) {
      ctx.font = fontOf(tk, 1);
      let w = ctx.measureText(tk.text).width;
      if (line.width + w > maxW && line.pieces.length) {
        flush(); if (/^\s+$/.test(tk.text)) continue;
      }
      // Mot plus long que la ligne : coupe caractère par caractère
      if (w > maxW) {
        let chunk = '';
        for (const ch of tk.text) {
          const cw = ctx.measureText(chunk + ch).width;
          if (cw > maxW && chunk) { line.pieces.push({ ...tk, text: chunk, w: ctx.measureText(chunk).width }); flush(); chunk = ''; }
          chunk += ch;
        }
        tk.text = chunk; w = ctx.measureText(chunk).width;
      }
      line.pieces.push({ ...tk, w }); line.width += w;
      line.height = Math.max(line.height, (tk.size ?? PDF_BASE) * 1.47);
    }
    flush();
  }
  return lines;
}

/** Paragraph[] → canvases A4 (1 par page), échelle `scale` (qualité). */
export function renderTextPages(paras, scale = 2.5) {
  const measure = createCanvas(10, 10).getContext('2d');
  const usableW = PAGE_W - 2 * MARGIN;
  const lines = layout(paras, measure, usableW);
  // Pagination
  const pages = [[]]; let y = 0;
  const maxY = PAGE_H - 2 * MARGIN;
  for (const l of lines) {
    if (y + l.height > maxY && pages.at(-1).length) { pages.push([]); y = 0; }
    pages.at(-1).push(l); y += l.height;
  }
  return pages.map((pageLines, idx) => {
    const c = createCanvas(PAGE_W * scale, PAGE_H * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.textBaseline = 'alphabetic';
    let y = MARGIN;
    for (const l of pageLines) {
      y += l.height * 0.75; // ligne de base
      const startX = l.align === 'center' ? MARGIN + (usableW - l.width) / 2
        : l.align === 'right' ? MARGIN + usableW - l.width
        : (l.rtl ? MARGIN + usableW - l.width : MARGIN);
      const pieces = l.rtl ? [...l.pieces].reverse() : l.pieces;
      let x = startX;
      for (const pc of pieces) {
        ctx.font = fontOf(pc, scale);
        ctx.direction = l.rtl ? 'rtl' : 'ltr';
        ctx.textAlign = l.rtl ? 'right' : 'left';
        ctx.fillStyle = pc.color || '#000000';
        const drawX = l.rtl ? (x + pc.w) * scale : x * scale;
        ctx.fillText(pc.text, drawX, y * scale);
        if (pc.underline) {
          const th = Math.max(1, (pc.size ?? PDF_BASE) * 0.07) * scale;
          ctx.fillRect(x * scale, y * scale + th * 1.5, pc.w * scale, th);
        }
        x += pc.w;
      }
      y += l.height * 0.25;
    }
    // Pied de page « n / N »
    ctx.font = `${10 * scale}px Roboto, Arial, sans-serif`;
    ctx.fillStyle = '#808080'; ctx.textAlign = 'center'; ctx.direction = 'ltr';
    ctx.fillText(`${idx + 1} / ${pages.length}`, (PAGE_W / 2) * scale, (PAGE_H - MARGIN / 2) * scale);
    return c;
  });
}
