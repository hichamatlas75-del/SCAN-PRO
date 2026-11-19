// =========================================================
// Paramètres — port de SettingsActivity.kt
// =========================================================
import { $, h, show, hide } from '../core/dom.js';
import { LANGUAGES, getStoredLang, setLang, t } from '../core/i18n.js';
import { Ads } from '../core/ads.js';

const PRIVACY_POLICY_URL = 'https://sites.google.com/view/scanpro-privacypolicy/accueil';

let deferredInstallPrompt = null;

function fillLanguageSelect() {
  const sel = $('#selLanguage');
  const opts = [
    h('option', { value: '' }, t('language_auto')),
    ...Object.entries(LANGUAGES).map(([code, label]) => h('option', { value: code }, label)),
  ];
  sel.replaceChildren(...opts);
  sel.value = getStoredLang();
}

export function initSettings() {
  $('#btnPrivacyPolicy').onclick = () => {
    window.open(PRIVACY_POLICY_URL, '_blank', 'noopener');
  };

  const btnPrivacy = $('#btnManagePrivacy');
  show(btnPrivacy, Ads.isPrivacyOptionsRequired());
  btnPrivacy.onclick = () => Ads.showPrivacyOptionsForm();

  fillLanguageSelect();
  $('#selLanguage').onchange = (e) => {
    setLang(e.target.value);
    fillLanguageSelect();
    window.dispatchEvent(new CustomEvent('scanpro:langchange'));
  };

  const btnInstall = $('#btnInstall');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    show(btnInstall);
  });
  btnInstall.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hide(btnInstall);
  };
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hide(btnInstall);
  });
}
