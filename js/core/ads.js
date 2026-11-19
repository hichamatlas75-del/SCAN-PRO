// =========================================================
// AdsManager (web) — même interface que AdsManager.kt.
// AdMob n'existe pas sur le web : on garde la logique (compteur de scans,
// cooldown, bannière, récompense) avec des points d'extension.
// Pour brancher un fournisseur (AdSense / Google Ad Manager / H5 Games Ads),
// implémenter `provider` ci-dessous.
// =========================================================
const KEY_SCANS = 'ads.scan_count';
const KEY_LAST_INTERSTITIAL = 'ads.last_interstitial';
const SCANS_BEFORE_INTERSTITIAL = 3;
const INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000;

/** Fournisseur publicitaire (aucun par défaut). */
const provider = {
  loadBanner: null,      // (container) => void
  showInterstitial: null, // () => Promise<void>
  showRewarded: null,     // () => Promise<boolean>
};

export const Ads = {
  init() { /* SDK web à initialiser ici si besoin */ },

  loadBanner(container) { provider.loadBanner?.(container); },

  incrementScanCount() {
    localStorage.setItem(KEY_SCANS, String(+(localStorage.getItem(KEY_SCANS) || 0) + 1));
  },

  isRewardedLoaded() { return typeof provider.showRewarded === 'function'; },

  async showRewarded() { return provider.showRewarded ? provider.showRewarded() : false; },

  /** Affiche un interstitiel seulement après X scans et hors cooldown, puis exécute `then`. */
  async showInterstitialIfReady(then) {
    const scans = +(localStorage.getItem(KEY_SCANS) || 0);
    const last = +(localStorage.getItem(KEY_LAST_INTERSTITIAL) || 0);
    if (provider.showInterstitial && scans >= SCANS_BEFORE_INTERSTITIAL && Date.now() - last > INTERSTITIAL_COOLDOWN_MS) {
      try { await provider.showInterstitial(); } catch { /* ignore */ }
      localStorage.setItem(KEY_SCANS, '0');
      localStorage.setItem(KEY_LAST_INTERSTITIAL, String(Date.now()));
    }
    then?.();
  },

  isPrivacyOptionsRequired() { return false; },
  showPrivacyOptionsForm() {},
};
