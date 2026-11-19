// =========================================================
// OCR — Tesseract.js (chargé à la demande) + extraction du montant
// (équivalent ML Kit TextRecognition + extractAmount())
// =========================================================
import { getLang } from './i18n.js';

const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const LANGS = { en: 'eng', fr: 'fra+eng', es: 'spa+eng', de: 'deu+eng', ar: 'ara+eng' };

let workerPromise = null;
let workerLang = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const s = Object.assign(document.createElement('script'), { src, async: true, crossOrigin: 'anonymous' });
    s.onload = resolve; s.onerror = () => reject(new Error('Tesseract load failed'));
    document.head.append(s);
  });
}

async function getWorker() {
  const lang = LANGS[getLang()] || 'eng';
  if (workerPromise && workerLang === lang) return workerPromise;
  if (workerPromise) (await workerPromise).terminate();
  workerLang = lang;
  workerPromise = (async () => {
    await loadScript(TESSERACT_URL);
    return window.Tesseract.createWorker(lang);
  })();
  workerPromise.catch(() => { workerPromise = null; });
  return workerPromise;
}

/** Reconnaît le texte d'un canvas (réduit pour la vitesse). */
export async function recognize(canvas) {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);
  return data.text || '';
}

// Même expression régulière que MainActivity.extractAmount()
const CUR = '(?:€|EUR|USD|\\$|د\\.إ|ر\\.S|ج\\.M|د\\.T|د\\.J|درهم|ريال|جنيه|دينار)';
const NUM = '(\\d{1,3}(?:[\\s.,]\\d{3})*(?:[.,]\\d{2}))';
const AMOUNT_RE = new RegExp(`(?:${CUR}\\s*${NUM})|${NUM}\\s*${CUR}`, 'i');

export function extractAmount(text) {
  const m = AMOUNT_RE.exec(text);
  if (!m) return null;
  return (m[1] || m[2]).replace(/ /g, '');
}
