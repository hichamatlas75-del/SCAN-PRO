// =========================================================
// FreemiumManager — 10 crédits OCR / jour (port de FreemiumManager.kt)
// =========================================================
import { t } from './i18n.js';

const KEY_CREDITS = 'freemium.ocr_credits';
const KEY_LAST_RESET = 'freemium.last_reset_date';
export const DAILY_CREDITS = 10;
const AD_REWARD_CREDITS = 10;
const FREE_CREDIT = 1; // crédit offert quand la pub n'est pas disponible

const today = () => new Date().toLocaleDateString('sv-SE'); // yyyy-MM-dd local
const read = () => parseInt(localStorage.getItem(KEY_CREDITS) ?? DAILY_CREDITS, 10);
const write = (n) => localStorage.setItem(KEY_CREDITS, String(n));

function resetDailyIfNeeded() {
  const d = today();
  if (localStorage.getItem(KEY_LAST_RESET) !== d) {
    write(DAILY_CREDITS);
    localStorage.setItem(KEY_LAST_RESET, d);
  }
}

export const Freemium = {
  getCredits() { resetDailyIfNeeded(); return read(); },

  useOcrCredit() {
    resetDailyIfNeeded();
    const c = read();
    if (c > 0) { write(c - 1); return true; }
    return false;
  },

  addAdRewardCredits() { write(this.getCredits() + AD_REWARD_CREDITS); },
  addFreeCredit() { write(this.getCredits() + FREE_CREDIT); },

  getStatusText() { return `${t('credits')} ${this.getCredits()}/${DAILY_CREDITS}`; },
};
