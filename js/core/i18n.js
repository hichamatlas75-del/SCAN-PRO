// =========================================================
// i18n — équivalent de getString(R.string.xxx) + values-xx/
// =========================================================
import { STRINGS } from './strings.js';

/** Chaînes propres à la PWA (absentes de l'app Android). */
const EXTRA = {
  en: { done: 'Done', capture: 'Capture', import_gallery: 'Import from gallery', crop_image: 'Crop image',
        camera_unavailable: 'Camera unavailable — import images from the gallery', install_app: 'Install the app',
        open_with: 'Open with', language_auto: 'Automatic', page: 'Page' },
  fr: { done: 'Terminer', capture: 'Capturer', camera_unavailable: 'Caméra indisponible — importez des images depuis la galerie',
        install_app: "Installer l'application", language_auto: 'Automatique', page: 'Page' },
  ar: { done: 'تم', capture: 'التقاط', import_gallery: 'استيراد من المعرض', crop_image: 'قص الصورة',
        camera_unavailable: 'الكاميرا غير متاحة — استورد الصور من المعرض', install_app: 'تثبيت التطبيق',
        open_with: 'فتح باستخدام', language_auto: 'تلقائي', page: 'صفحة' },
  es: { done: 'Listo', capture: 'Capturar', import_gallery: 'Importar de la galería', crop_image: 'Recortar imagen',
        camera_unavailable: 'Cámara no disponible — importe imágenes de la galería', install_app: 'Instalar la aplicación',
        open_with: 'Abrir con', language_auto: 'Automático', page: 'Página' },
  de: { done: 'Fertig', capture: 'Aufnehmen', import_gallery: 'Aus Galerie importieren', crop_image: 'Bild zuschneiden',
        camera_unavailable: 'Kamera nicht verfügbar — Bilder aus der Galerie importieren', install_app: 'App installieren',
        open_with: 'Öffnen mit', language_auto: 'Automatisch', page: 'Seite' },
};

export const LANGUAGES = { en: 'English', fr: 'Français', ar: 'العربية', es: 'Español', de: 'Deutsch' };
const LANG_KEY = 'scanpro.lang';

function detect() {
  const forced = new URLSearchParams(location.search).get('lang') || localStorage.getItem(LANG_KEY);
  if (forced && STRINGS[forced]) return forced;
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const code = l.slice(0, 2).toLowerCase();
    if (STRINGS[code]) return code;
  }
  return 'en';
}

let lang = detect();

export const getLang = () => lang;
export const getStoredLang = () => localStorage.getItem(LANG_KEY) || '';
export const isRtl = () => lang === 'ar';

/** getString(R.string.key) avec repli : langue → anglais → clé. */
export function t(key) {
  return STRINGS[lang]?.[key] ?? EXTRA[lang]?.[key] ?? STRINGS.en[key] ?? EXTRA.en[key] ?? key;
}

export function setLang(code) {
  if (code) localStorage.setItem(LANG_KEY, code); else localStorage.removeItem(LANG_KEY);
  lang = detect();
  applyTranslations();
}

/** Traduit le DOM : data-i18n (texte), data-i18n-title, data-i18n-placeholder. */
export function applyTranslations(root = document) {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const label = el.querySelector(':scope > span.lbl');
    if (label) label.textContent = t(el.dataset.i18n);
    else if (el.querySelector(':scope > svg')) {
      const s = document.createElement('span'); s.className = 'lbl'; s.textContent = t(el.dataset.i18n); el.append(s);
    } else el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const v = t(el.dataset.i18nPlaceholder);
    if ('placeholder' in el) el.placeholder = v; else el.dataset.placeholder = v;
  });
}
