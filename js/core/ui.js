// =========================================================
// UI — Toast, ProgressBar, AlertDialog, PopupMenu (équivalents Android)
// =========================================================
import { $, h } from './dom.js';
import { t } from './i18n.js';

// ---------- Toast ----------
export function toast(message, long = false) {
  const el = h('div', { class: 'toast', role: 'status' }, message);
  $('#toastHost').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, long ? 3500 : 2000);
}

// ---------- ProgressBar (compteur de tâches) ----------
let busy = 0;
export const progress = {
  show() { busy++; $('#progressBar').classList.remove('hidden'); },
  hide() { busy = Math.max(0, busy - 1); if (!busy) $('#progressBar').classList.add('hidden'); },
  /** Exécute fn en affichant le spinner. */
  async run(fn) { this.show(); try { return await fn(); } finally { this.hide(); } },
};

// ---------- AlertDialog ----------
/**
 * dialog({ title, message, body, items, buttons:[{label, value, primary}] }) → Promise<valeur>
 * Fermeture par le fond ou Échap → null.
 */
export function dialog({ title, message, body, items, buttons = [] }) {
  return new Promise((resolve) => {
    const close = (v) => { backdrop.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter') { const p = buttons.find((b) => b.primary); if (p) close(p.value); }
    };
    const box = h('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true' },
      title && h('h3', {}, title),
      message && h('p', {}, message),
      body,
      items && h('div', { class: 'dlg-items' }, items.map((it, i) =>
        h('button', { class: 'dlg-item', onclick: () => close(i) },
          it.color && h('span', { class: 'swatch', style: { background: it.color } }), it.label ?? it))),
      buttons.length && h('div', { class: 'dlg-actions' },
        buttons.map((b) => h('button', { onclick: () => close(b.value) }, b.label))),
    );
    const backdrop = h('div', { class: 'dlg-backdrop', onclick: (e) => e.target === backdrop && close(null) }, box);
    document.addEventListener('keydown', onKey);
    $('#dialogHost').append(backdrop);
    box.querySelector('input')?.focus();
  });
}

export const alertDialog = (title, message) =>
  dialog({ title, message, buttons: [{ label: t('ok'), value: true, primary: true }] });

export const confirmDialog = (title, message, okLabel) =>
  dialog({ title, message, buttons: [
    { label: t('cancel'), value: false }, { label: okLabel || t('ok'), value: true, primary: true }] })
    .then(Boolean);

/** Boîte de saisie (EditText dans AlertDialog). Retourne la chaîne ou null. */
export async function promptDialog(title, value = '', okLabel = t('ok'), hint = '') {
  const input = h('input', { type: 'text', value, placeholder: hint });
  setTimeout(() => input.select(), 50);
  const ok = await dialog({ title, body: input, buttons: [
    { label: t('cancel'), value: false }, { label: okLabel, value: true, primary: true }] });
  return ok ? input.value : null;
}

// ---------- PopupMenu ----------
/** popupMenu(anchor, ['A','B']) → Promise<index | null> */
export function popupMenu(anchor, labels) {
  return new Promise((resolve) => {
    const close = (v) => { bd.remove(); resolve(v); };
    const menu = h('div', { class: 'menu', role: 'menu' },
      labels.map((l, i) => h('button', { role: 'menuitem', onclick: () => close(i) }, l)));
    const bd = h('div', { class: 'menu-backdrop', onclick: (e) => e.target === bd && close(null) }, menu);
    document.body.append(bd);
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const rtl = document.dir === 'rtl';
    let left = rtl ? r.left : r.right - mw;
    left = Math.min(Math.max(8, left), innerWidth - mw - 8);
    let top = r.bottom;
    if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh);
    Object.assign(menu.style, { left: `${left}px`, top: `${top}px` });
  });
}
