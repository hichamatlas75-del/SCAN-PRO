// =========================================================
// Fichiers & partage — Intent.ACTION_SEND / ACTION_VIEW / MediaStore (web)
// =========================================================
import { t } from './i18n.js';

export const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export const extOf = (name) => (name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
export const baseName = (name) => name.replace(/\.[^.]+$/, '');
export const mimeOf = (name) => MIME[extOf(name)] || 'image/jpeg';

/** Caractères sûrs (même regex que l'app Android). */
export const safeFileName = (s) => s.trim().replace(/[^a-zA-Z0-9_. -]/g, '_');

export function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.floor(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const pad = (n) => String(n).padStart(2, '0');
/** dd/MM/yy */
export const formatShortDate = (ms) => { const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`; };
/** dd-MM-yyyy */
export const formatDashDate = (d = new Date()) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

/** Téléchargement local (équivalent « Documents/ScanPro » public). */
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Ouvre un fichier (ACTION_VIEW). PDF/images dans un onglet ; sinon téléchargement. */
export function openBlob(blob, name) {
  const type = blob.type || mimeOf(name);
  if (/^(image\/|application\/pdf|text\/plain)/.test(type)) {
    const url = URL.createObjectURL(new Blob([blob], { type }));
    const w = window.open(url, '_blank');
    if (!w) download(blob, name);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else download(blob, name);
}

/**
 * Partage natif (ACTION_SEND) avec repli téléchargement.
 * @returns 'shared' | 'cancelled' | 'downloaded'
 */
export async function shareFile(blob, name, { text = t('share_text'), title = 'ScanPro - Document' } = {}) {
  const file = new File([blob], name, { type: blob.type || mimeOf(name) });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  download(blob, name);
  return 'downloaded';
}

/** Envoi WhatsApp : partage natif (choisir WhatsApp) sinon téléchargement + wa.me. */
export async function sendViaWhatsApp(blob, name) {
  const res = await shareFile(blob, name);
  if (res === 'downloaded') window.open(`https://wa.me/?text=${encodeURIComponent(t('share_text'))}`, '_blank');
  return res;
}
