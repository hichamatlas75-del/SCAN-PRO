// =========================================================
// DOM & icônes — vecteurs repris des drawables Android (res/drawable/*.xml)
// =========================================================
const ICONS = {
  back: 'M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z',
  rotate: 'M12,6v3l4,-4 -4,-4v3c-4.42,0 -8,3.58 -8,8 0,1.57 0.46,3.03 1.24,4.26L6.7,14.8c-0.45,-0.83 -0.7,-1.79 -0.7,-2.8 0,-3.31 2.69,-6 6,-6zM18.76,7.74L17.3,9.2c0.44,0.84 0.7,1.79 0.7,2.8 0,3.31 -2.69,6 -6,6v-3l-4,4 4,4v-3c4.42,0 8,-3.58 8,-8 0,-1.570 -0.46,-3.03 -1.24,-4.26z',
  settings: 'M19.14,12.94c0.04,-0.3 0.06,-0.61 0.06,-0.94c0,-0.32 -0.02,-0.64 -0.07,-0.94l2.03,-1.58c0.18,-0.14 0.23,-0.41 0.12,-0.61l-1.92,-3.32c-0.12,-0.22 -0.37,-0.29 -0.59,-0.22l-2.39,0.96c-0.5,-0.38 -1.03,-0.7 -1.62,-0.94L14.4,2.81c-0.04,-0.24 -0.24,-0.41 -0.48,-0.41h-3.84c-0.24,0 -0.43,0.17 -0.47,0.41L9.25,5.35C8.66,5.59 8.12,5.92 7.63,6.29L5.24,5.33c-0.22,-0.08 -0.47,0 -0.59,0.22L2.74,8.87C2.62,9.08 2.66,9.34 2.86,9.49l2.03,1.58C4.84,11.36 4.8,11.69 4.8,12s0.02,0.64 0.07,0.94l-2.03,1.58c-0.18,0.14 -0.23,0.41 -0.12,0.61l1.92,3.32c0.12,0.22 0.37,0.29 0.59,0.22l2.39,-0.96c0.5,0.38 1.03,0.7 1.62,0.94l0.36,2.54c0.05,0.24 0.24,0.41 0.48,0.41h3.84c0.24,0 0.44,-0.17 0.47,-0.41l0.36,-2.54c0.59,-0.24 1.13,-0.56 1.62,-0.94l2.39,0.96c0.22,0.08 0.47,0 0.59,-0.22l1.92,-3.32c0.12,-0.22 0.07,-0.47 -0.12,-0.61L19.14,12.94zM12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6s3.6,1.62 3.6,3.6S13.98,15.6 12,15.6z',
  gallery: { vb: '0 0 960 960', d: 'M320,640L800,640L800,520L698,520Q677,557 640,578.5Q603,600 560,600Q518,600 481,578.5Q444,557 422,520L320,520L320,640ZM560,520Q594,520 617,496.5Q640,473 640,440L800,440L800,160L320,160L320,440L480,440Q480,473 503.5,496.5Q527,520 560,520ZM320,720Q287,720 263.5,696.5Q240,673 240,640L240,160Q240,127 263.5,103.5Q287,80 320,80L800,80Q833,80 856.5,103.5Q880,127 880,160L880,640Q880,673 856.5,696.5Q833,720 800,720L320,720ZM160,880Q127,880 103.5,856.5Q80,833 80,800L80,240L160,240L160,800L720,800L720,880L160,880Z' },
  edit: 'M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z',
  share: 'M18,16.08c-0.76,0 -1.44,0.3 -1.96,0.77L8.91,12.7c0.05,-0.23 0.09,-0.46 0.09,-0.7s-0.04,-0.47 -0.09,-0.7l7.05,-4.11c0.54,0.5 1.25,0.81 2.04,0.81 1.66,0 3,-1.34 3,-3s-1.34,-3 -3,-3 -3,1.34 -3,3c0,0.24 0.04,0.47 0.09,0.7L8.04,9.81C7.5,9.31 6.79,9 6,9c-1.66,0 -3,1.34 -3,3s1.34,3 3,3c0.79,0 1.5,-0.31 2.04,-0.81l7.12,4.16c-0.05,0.21 -0.08,0.43 -0.08,0.65 0,1.61 1.31,2.92 2.92,2.92 1.61,0 2.92,-1.31 2.92,-2.92s-1.31,-2.92 -2.92,-2.92z',
  pdf: 'M14,2H6C4.9,2 4,2.9 4,4v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V8L14,2zM14,3.5L18.5,8H14V3.5zM12,18H6v-2h6v2zM18,14H6v-2h12v2zM18,10H6V8h12v2z',
  image: 'M21,19V5c0,-1.1 -0.9,-2 -2,-2H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2zM8.5,13.5l2.5,3.01L14.5,12l4.5,6H5l3.5,-4.5z',
  camera: 'M9.4,10.5l4.77,-8.26C13.47,2.09 12.75,2 12,2c-2.4,0 -4.6,0.85 -6.32,2.25l3.66,6.35 0.06,-0.1zM21.54,9c-0.92,-2.920 -3.15,-5.26 -6,-6.34L11.88,9h9.66zM21.8,10h-7.49l0.29,0.5 4.76,8.25C21,16.97 22,14.61 22,12c0,-0.69 -0.07,-1.35 -0.2,-2zM8.54,12l-3.9,-6.75C3.01,7.03 2,9.39 2,12c0,0.69 0.07,1.35 0.2,2h7.49l-1.15,-2zM2.46,15c0.92,2.92 3.15,5.26 6,6.34L12.12,15L2.46,15zM13.73,15l-3.9,6.76c0.7,0.15 1.42,0.24 2.17,0.24 2.4,0 4.6,-0.85 6.32,-2.25l-3.66,-6.35 -0.93,1.6z',
  sort: 'M3,18h6v-2H3v2zM3,6v2h18V6H3zM3,13h12v-2H3v2z',
  more: 'M12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,10c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2zM12,16c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2z',
  close: 'M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z',
  fullscreen: 'M7,14H5v5h5v-2H7v-3zM5,10h2V7h3V5H5v5zM17,17h-3v2h5v-5h-2v3zM14,5v2h3v3h2V5h-5z',
  align_left: 'M15,15H3v2h12v-2zM15,7H3v2h12V7zM3,13h18v-2H3v2zM3,21h18v-2H3v2zM3,3v2h18V3H3z',
  align_center: 'M7,15v2h10v-2H7zM3,21h18v-2H3v2zM3,13h18v-2H3v2zM7,7v2h10V7H7zM3,3v2h18V3H3z',
  align_right: 'M3,21h18v-2H3v2zM9,17h12v-2H9v2zM3,13h18v-2H3v2zM9,9h12V7H9v2zM3,3v2h18V3H3z',
  file: 'M14,2H6C4.9,2 4,2.9 4,4v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V8L14,2zM14,3.5L18.5,8H14V3.5z',
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Crée un SVG d'icône. */
export function icon(name, color) {
  const def = ICONS[name]; if (!def) return document.createComment(name);
  const { vb = '0 0 24 24', d } = typeof def === 'string' ? { d: def } : def;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', vb); svg.setAttribute('class', 'ico'); svg.setAttribute('aria-hidden', 'true');
  if (color) svg.style.color = color;
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d);
  svg.append(p); return svg;
}

/** Injecte les icônes déclarées par data-icon / data-icon-color. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.querySelector(':scope > svg.ico')) return;
    el.prepend(icon(el.dataset.icon, el.dataset.iconColor));
  });
}

/** Petit créateur d'éléments : h('div', {class:'x', onclick}, ...enfants). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export const show = (el, visible = true) => el.classList.toggle('hidden', !visible);
export const hide = (el) => show(el, false);
