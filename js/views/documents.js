// =========================================================
// Mes Documents — port de DocumentsActivity.kt
// =========================================================
import { $, h, icon, show, hide } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { toast, confirmDialog, promptDialog, popupMenu } from '../core/ui.js';
import { DocumentStore } from '../core/storage.js';
import {
  extOf, baseName, safeFileName, formatFileSize, formatShortDate, openBlob, shareFile,
} from '../core/files.js';

const ALLOWED_EXTS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt']);
const TYPE_COLORS = { pdf: '#0ea5e9', docx: '#2563eb', txt: '#64748b' };

let files = [];
let comparator = (a, b) => b.modified - a.modified;
let objectUrls = [];

function clearUrls() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = [];
}

function renderGrid() {
  clearUrls();
  const grid = $('#docGrid');
  const empty = $('#emptyState');

  $('#tvDocCount').textContent = `${files.length} ${t('documents_title').toLowerCase()}`;

  if (!files.length) {
    grid.innerHTML = '';
    hide(grid);
    show(empty);
    return;
  }

  hide(empty);
  show(grid);
  files.sort(comparator);

  const cards = files.map((rec) => {
    const ext = extOf(rec.name);
    let thumbNode;

    if (rec.thumb) {
      thumbNode = h('img', { src: rec.thumb, alt: rec.name });
    } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      const url = URL.createObjectURL(rec.blob);
      objectUrls.push(url);
      thumbNode = h('img', { src: url, alt: rec.name });
    } else {
      const svg = icon('file', TYPE_COLORS[ext] || '#64748b');
      svg.classList.add('type-ico');
      thumbNode = svg;
    }

    const badge = TYPE_COLORS[ext] ? h('span', { class: 'doc-badge' }, ext.toUpperCase()) : null;
    const btnMore = h('button', {
      class: 'icon-btn more',
      'aria-label': t('sort'),
      onclick: (e) => {
        e.stopPropagation();
        showFileMenu(rec, btnMore);
      },
    }, icon('more'));

    const thumbBox = h('div', { class: 'doc-thumb' }, thumbNode, badge, btnMore);
    const infoBox = h('div', { class: 'doc-info' },
      h('div', { class: 'doc-name', title: rec.name }, rec.name),
      h('div', { class: 'doc-meta' },
        formatShortDate(rec.modified),
        h('i', {}, ' - '),
        formatFileSize(rec.size)),
    );

    return h('div', { class: 'doc-card', onclick: () => openBlob(rec.blob, rec.name) }, thumbBox, infoBox);
  });

  grid.replaceChildren(...cards);
}

async function showFileMenu(rec, anchor) {
  const idx = await popupMenu(anchor, [t('rename'), t('share'), t('delete')]);
  if (idx === 0) {
    const input = await promptDialog(t('rename'), baseName(rec.name), t('rename'));
    if (input === null) return;
    const clean = safeFileName(input);
    if (!clean) return;
    try {
      const ok = await DocumentStore.rename(rec.id, `${clean}.${extOf(rec.name)}`);
      toast(ok ? t('rename') : t('error_documents'));
      if (ok) await loadDocuments();
    } catch {
      toast(t('error_documents'));
    }
  } else if (idx === 1) {
    await shareFile(rec.blob, rec.name);
  } else if (idx === 2) {
    const ok = await confirmDialog(t('delete'), t('delete_confirm'), t('delete'));
    if (!ok) return;
    try {
      await DocumentStore.remove(rec.id);
      toast(t('delete'));
      await loadDocuments();
    } catch {
      toast(t('error_documents'));
    }
  }
}

async function showSortMenu() {
  const idx = await popupMenu($('#btnSort'), [
    t('sort_recent'),
    t('sort_oldest'),
    t('sort_name_az'),
    t('sort_name_za'),
  ]);
  if (idx === null) return;
  const sorters = [
    (a, b) => b.modified - a.modified,
    (a, b) => a.modified - b.modified,
    (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    (a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()),
  ];
  comparator = sorters[idx];
  renderGrid();
}

export async function loadDocuments() {
  try {
    const all = await DocumentStore.list();
    files = all.filter((rec) => ALLOWED_EXTS.has(extOf(rec.name)));
    renderGrid();
  } catch {
    files = [];
    renderGrid();
    toast(t('error_documents'));
  }
}

export function initDocuments() {
  $('#btnSort').onclick = showSortMenu;
  window.addEventListener('scanpro:langchange', () => {
    if (!$('#view-documents').classList.contains('hidden')) renderGrid();
  });
}
