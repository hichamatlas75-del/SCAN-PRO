// =========================================================
// Éditeur Word — port de WordEditorActivity.kt
// =========================================================
import { $, $$ } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { toast, progress, dialog } from '../core/ui.js';
import { DocumentStore } from '../core/storage.js';
import { download, sendViaWhatsApp as shareWhatsApp, safeFileName } from '../core/files.js';
import { scaledCopy } from '../core/image.js';
import { canvasesToPdf } from '../core/pdf.js';
import { parseRichText, renderTextPages } from '../core/richtext.js';
import { buildDocx } from '../core/docx.js';

const COLORS = [
  ['#1e293b', 'Noir'],
  ['#ef4444', 'Rouge'],
  ['#2563eb', 'Bleu'],
  ['#16a34a', 'Vert'],
  ['#d97706', 'Orange'],
  ['#7c3aed', 'Violet'],
  ['#0ea5e9', 'Bleu ciel'],
];

let currentFontSize = 15;
let savedRange = null;

function isSelectionInEditor(range) {
  const et = $('#etContent');
  return Boolean(range && et.contains(range.commonAncestorContainer));
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (isSelectionInEditor(r)) savedRange = r.cloneRange();
  }
}

function restoreSelection() {
  const et = $('#etContent');
  et.focus();
  if (savedRange && isSelectionInEditor(savedRange)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

function getActiveRange() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (isSelectionInEditor(r)) return r;
  }
  return isSelectionInEditor(savedRange) ? savedRange : null;
}

function updateCharCount() {
  const txt = $('#etContent').innerText;
  const len = txt === '\n' ? 0 : txt.replace(/\n$/, '').length;
  $('#tvCharCount').textContent = String(len);
}

function updateToolbarState() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !isSelectionInEditor(sel.getRangeAt(0))) return;

  $('#btnBold').classList.toggle('on', document.queryCommandState('bold'));
  $('#btnItalic').classList.toggle('on', document.queryCommandState('italic'));
  $('#btnUnderline').classList.toggle('on', document.queryCommandState('underline'));

  const alignMap = [
    [$('#btnAlignLeft'), document.queryCommandState('justifyLeft')],
    [$('#btnAlignCenter'), document.queryCommandState('justifyCenter')],
    [$('#btnAlignRight'), document.queryCommandState('justifyRight')],
  ];
  if (alignMap.some(([, active]) => active)) {
    alignMap.forEach(([btn, active]) => btn.classList.toggle('active', active));
  }
}

function toggleStyle(cmd) {
  restoreSelection();
  const range = getActiveRange();
  if (!range || range.collapsed) {
    toast(t('select_text_first'));
    return;
  }
  document.execCommand(cmd, false, null);
  saveSelection();
  updateToolbarState();
}

function applyFontSize(delta) {
  currentFontSize = Math.max(8, Math.min(72, currentFontSize + delta));
  $('#tvFontSize').textContent = String(currentFontSize);

  restoreSelection();
  const range = getActiveRange();
  if (!range || range.collapsed) return;

  try { document.execCommand('styleWithCSS', false, false); } catch { /* ignore */ }
  document.execCommand('fontSize', false, '7');

  const et = $('#etContent');
  const created = [];
  et.querySelectorAll('font[size="7"], span[style*="xxx-large"]').forEach((node) => {
    const span = document.createElement('span');
    span.style.fontSize = `${currentFontSize}px`;
    while (node.firstChild) span.appendChild(node.firstChild);
    node.replaceWith(span);
    created.push(span);
  });

  if (created.length) {
    const sel = window.getSelection();
    const r = document.createRange();
    r.setStartBefore(created[0]);
    r.setEndAfter(created[created.length - 1]);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  saveSelection();
}

function setAlignment(cmd, activeBtn) {
  restoreSelection();
  document.execCommand(cmd, false, null);
  $$('.toolbar .tb-btn.align').forEach((b) => b.classList.toggle('active', b === activeBtn));
  saveSelection();
}

async function showColorPicker() {
  saveSelection();
  const range = getActiveRange();
  if (!range || range.collapsed) {
    toast(t('select_text_first'));
    return;
  }
  savedRange = range.cloneRange();

  const idx = await dialog({
    title: t('text_color'),
    items: COLORS.map(([color, label]) => ({ color, label })),
  });
  if (idx === null) return;

  const color = COLORS[idx][0];
  restoreSelection();
  document.execCommand('foreColor', false, color);
  $('#btnColor').style.color = color;
  saveSelection();
}

function getFileName() {
  return safeFileName($('#etFileName').value) || 'Document';
}

function getParas() {
  const et = $('#etContent');
  if (!et.innerText.trim()) {
    toast(t('text_empty'));
    return null;
  }
  return parseRichText(et);
}

async function saveDocx() {
  const paras = getParas();
  if (!paras) return;
  await progress.run(async () => {
    try {
      const name = getFileName();
      const blob = buildDocx(paras);
      const rec = await DocumentStore.save(`${name}.docx`, blob);
      download(blob, rec.name);
      toast(`${t('docx_saved')} ${rec.name}`);
    } catch {
      toast(t('error_pdf'));
    }
  });
}

async function savePdf() {
  const paras = getParas();
  if (!paras) return;
  await progress.run(async () => {
    try {
      const name = getFileName();
      const pages = renderTextPages(paras);
      const blob = await canvasesToPdf(pages, 'full');
      const thumb = scaledCopy(pages[0], 400).toDataURL('image/jpeg', 0.75);
      const rec = await DocumentStore.save(`${name}.pdf`, blob, thumb);
      download(blob, rec.name);
      toast(t('pdf_saved'));
    } catch {
      toast(t('error_pdf'));
    }
  });
}

async function sendWhatsApp() {
  const paras = getParas();
  if (!paras) return;
  await progress.run(async () => {
    try {
      const name = getFileName();
      const pages = renderTextPages(paras);
      const blob = await canvasesToPdf(pages, 'full');
      await shareWhatsApp(blob, `${name}.pdf`);
    } catch {
      toast(t('error_drive'));
    }
  });
}

export function initEditor() {
  const et = $('#etContent');
  $('#etFileName').value = '';
  $('#tvFontSize').textContent = String(currentFontSize);
  updateCharCount();

  // Empêche les boutons de la barre d'outils de voler le focus / perdre la sélection
  $$('.toolbar .tb-btn').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      saveSelection();
      e.preventDefault();
    });
  });

  et.addEventListener('input', () => {
    if (!et.textContent && et.innerHTML === '<br>') et.innerHTML = '';
    updateCharCount();
  });
  et.addEventListener('keyup', () => { saveSelection(); updateToolbarState(); });
  et.addEventListener('mouseup', () => { saveSelection(); updateToolbarState(); });
  document.addEventListener('selectionchange', () => {
    if (!$('#view-editor').classList.contains('hidden')) {
      saveSelection();
      updateToolbarState();
    }
  });

  $('#btnBold').onclick = () => toggleStyle('bold');
  $('#btnItalic').onclick = () => toggleStyle('italic');
  $('#btnUnderline').onclick = () => toggleStyle('underline');

  $('#btnSizeUp').onclick = () => applyFontSize(2);
  $('#btnSizeDown').onclick = () => applyFontSize(-2);

  $('#btnAlignLeft').onclick = () => setAlignment('justifyLeft', $('#btnAlignLeft'));
  $('#btnAlignCenter').onclick = () => setAlignment('justifyCenter', $('#btnAlignCenter'));
  $('#btnAlignRight').onclick = () => setAlignment('justifyRight', $('#btnAlignRight'));

  $('#btnColor').onclick = showColorPicker;
  $('#btnUndo').onclick = () => { et.focus(); document.execCommand('undo'); saveSelection(); updateToolbarState(); updateCharCount(); };
  $('#btnRedo').onclick = () => { et.focus(); document.execCommand('redo'); saveSelection(); updateToolbarState(); updateCharCount(); };

  $('#btnSaveDocx').onclick = saveDocx;
  $('#btnSavePdf').onclick = savePdf;
  $('#btnSendWhatsapp').onclick = sendWhatsApp;
}
