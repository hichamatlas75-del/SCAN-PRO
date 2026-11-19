// =========================================================
// Point d'entrée PWA — routeur par hash + initialisation
// =========================================================
import { $$, show, hydrateIcons } from './core/dom.js';
import { applyTranslations } from './core/i18n.js';
import { Ads } from './core/ads.js';
import { initHome } from './views/home.js';
import { initDocuments, loadDocuments } from './views/documents.js';
import { initEditor } from './views/editor.js';
import { initSettings } from './views/settings.js';

const VALID_ROUTES = new Set(['documents', 'editor', 'settings']);

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  return VALID_ROUTES.has(r) ? r : '';
}

function renderRoute() {
  const route = currentRoute();
  $$('.view[data-route]').forEach((v) => show(v, v.dataset.route === route));
  if (route === 'documents') loadDocuments();
  if (route === '') window.dispatchEvent(new CustomEvent('scanpro:homevisible'));
}

export function navigate(route) {
  const valid = VALID_ROUTES.has(route) ? route : '';
  if (currentRoute() === valid) {
    renderRoute();
    return;
  }
  const url = valid ? `#${valid}` : location.pathname + location.search;
  history.pushState({ inApp: true }, '', url);
  renderRoute();
}

function goBack() {
  if (history.state?.inApp) {
    history.back();
  } else {
    history.replaceState(null, '', location.pathname + location.search);
    renderRoute();
  }
}

function boot() {
  hydrateIcons();
  applyTranslations();
  Ads.init();

  initHome(navigate);
  initDocuments();
  initEditor();
  initSettings();

  $$('.js-back').forEach((btn) => { btn.onclick = goBack; });
  window.addEventListener('popstate', renderRoute);
  window.addEventListener('hashchange', renderRoute);
  renderRoute();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
