// =========================================================
// Écran principal — port de MainActivity.kt
// =========================================================
import { $, show, hide } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { toast, progress, alertDialog, confirmDialog, promptDialog } from '../core/ui.js';
import { DocumentStore } from '../core/storage.js';
import { Freemium } from '../core/freemium.js';
import { Ads } from '../core/ads.js';
import { download, shareFile, sendViaWhatsApp as shareWhatsApp, safeFileName, formatDashDate } from '../core/files.js';
import { rotate90, scaledCopy, canvasToBlob, drawFitCenter } from '../core/image.js';
import { canvasesToPdf } from '../core/pdf.js';
import { recognize, extractAmount } from '../core/ocr.js';
import { scanDocuments } from './scanner.js';

let scannedPages = [];
let currentPageIndex = 0;
let currentRotation = 0;
let currentOcrText = '';
let lastAmount = null;
let ocrToken = 0;

function updateCreditsUI() {
  $('#tvCredits').textContent = Freemium.getStatusText();
}

function renderPreview() {
  const canvas = $('#imgPreview');
  if (!scannedPages.length || canvas.classList.contains('hidden')) return;
  drawFitCenter(canvas, scannedPages[currentPageIndex]);
}

function updatePageIndicator() {
  const el = $('#tvPageIndicator');
  if (scannedPages.length > 1) {
    el.textContent = `${currentPageIndex + 1} / ${scannedPages.length}`;
    show(el);
  } else {
    hide(el);
  }
}

function setPageIndex(idx) {
  if (!scannedPages.length) return;
  currentPageIndex = ((idx % scannedPages.length) + scannedPages.length) % scannedPages.length;
  updatePageIndicator();
  renderPreview();
}

async function runOcr(canvas) {
  const token = ++ocrToken;
  await progress.run(async () => {
    try {
      const text = await recognize(scaledCopy(canvas, 1400));
      if (token !== ocrToken) return;
      currentOcrText = text;
      lastAmount = extractAmount(currentOcrText);
      if (lastAmount !== null) {
        $('#tvAmount').textContent = `${t('amount_detected')} ${lastAmount}`;
        show($('#tvAmount'));
      } else {
        hide($('#tvAmount'));
      }
      show($('#exportActions'));
      toast(t('scan_done'));
    } catch {
      if (token !== ocrToken) return;
      show($('#exportActions'));
      toast(t('scan_done'));
    }
  });
}

function loadAllPages(pages) {
  scannedPages = pages;
  currentPageIndex = 0;
  currentRotation = 0;
  currentOcrText = '';
  lastAmount = null;

  hide($('#welcomeOverlay'));
  show($('#imgPreview'));
  show($('#btnWhatsapp'));
  show($('#btnRotate'));
  show($('#btnBack'));
  show($('#btnHome'));
  updatePageIndicator();
  show($('#exportActions'), true);

  renderPreview();
  requestAnimationFrame(renderPreview);
  runOcr(scannedPages[0]);
  Ads.incrementScanCount();
}

function rotateCurrentPage() {
  if (!scannedPages.length) return;
  currentRotation = (currentRotation + 90) % 360;
  const rotated = rotate90(scannedPages[currentPageIndex]);
  scannedPages[currentPageIndex] = rotated;
  renderPreview();
  runOcr(rotated);
}

function resetScan() {
  ocrToken++;
  show($('#welcomeOverlay'));
  hide($('#imgPreview'));
  hide($('#btnWhatsapp'));
  hide($('#btnRotate'));
  hide($('#btnBack'));
  hide($('#btnHome'));
  hide($('#tvAmount'));
  hide($('#exportActions'));
  hide($('#tvPageIndicator'));
  scannedPages = [];
  currentPageIndex = 0;
  currentOcrText = '';
  lastAmount = null;
  currentRotation = 0;
}

async function showNoCreditsWithInterstitial() {
  if (Ads.isRewardedLoaded()) {
    const ok = await confirmDialog(t('credits_empty'), t('watch_ad'), t('watch'));
    if (ok) {
      const rewarded = await Ads.showRewarded();
      if (rewarded !== false) {
        Freemium.addAdRewardCredits();
        updateCreditsUI();
        toast(t('credits_added'));
      }
    }
  } else {
    Ads.init();
    Freemium.addFreeCredit();
    updateCreditsUI();
  }
}

async function handleCaptureClick() {
  const pages = await scanDocuments();
  if (pages?.length) loadAllPages(pages);
}

async function exportMultiPagePdf() {
  if (!scannedPages.length) {
    toast(t('no_scan'));
    return;
  }
  await progress.run(async () => {
    try {
      const blob = await canvasesToPdf(scannedPages, 'fit');
      const thumb = scaledCopy(scannedPages[0], 400).toDataURL('image/jpeg', 0.75);
      const rec = await DocumentStore.save(`scan-${Date.now()}.pdf`, blob, thumb);
      download(blob, rec.name);
      toast(t('pdf_saved'), true);
      Ads.showInterstitialIfReady();
    } catch {
      toast(t('error_pdf'), true);
    }
  });
}

async function saveImageToDocuments() {
  const canvas = scannedPages[currentPageIndex];
  if (!canvas) return;
  await progress.run(async () => {
    try {
      const blob = await canvasToBlob(canvas, 'image/png');
      const thumb = scaledCopy(canvas, 400).toDataURL('image/jpeg', 0.75);
      const rec = await DocumentStore.save(`scan-${Date.now()}.png`, blob, thumb);
      download(blob, rec.name);
      toast(t('image_saved'), true);
    } catch {
      toast(t('error_image'), true);
    }
  });
}

async function uploadToDrive() {
  const canvas = scannedPages[currentPageIndex];
  if (!canvas) {
    toast(t('no_scan'));
    return;
  }
  try {
    const blob = await canvasToBlob(canvas, 'image/png');
    await shareFile(blob, `scan-share-${Date.now()}.png`, {
      title: 'ScanPro - Document',
      text: t('share_text'),
    });
  } catch {
    toast(t('error_drive'));
  }
}

async function sendViaWhatsApp() {
  if (!scannedPages.length) {
    toast(t('no_scan'));
    return;
  }
  const defaultName = `ScanPro-${formatDashDate()}`;
  const raw = await promptDialog(t('rename_before_send'), defaultName, t('send'), t('file_name_hint'));
  if (raw === null) return;

  const base = safeFileName(raw) || `ScanPro-${Date.now()}`;
  const safeName = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;

  await progress.run(async () => {
    try {
      const blob = await canvasesToPdf(scannedPages, 'fit');
      await shareWhatsApp(blob, safeName);
    } catch {
      toast(t('error_drive'));
    }
  });
}

export function initHome(navigate) {
  Ads.loadBanner($('#adContainer'));
  updateCreditsUI();

  $('#btnCapture').onclick = handleCaptureClick;
  $('#btnHome').onclick = resetScan;
  $('#btnBack').onclick = resetScan;
  $('#btnRotate').onclick = rotateCurrentPage;
  $('#btnWhatsapp').onclick = sendViaWhatsApp;
  $('#btnExportPdf').onclick = exportMultiPagePdf;
  $('#btnExportImage').onclick = saveImageToDocuments;
  $('#btnDrive').onclick = uploadToDrive;

  $('#btnMyDocuments').onclick = () => Ads.showInterstitialIfReady(() => navigate('documents'));
  $('#btnWordEditor').onclick = () => navigate('editor');
  $('#btnSettings').onclick = () => navigate('settings');

  // Navigation multi-pages (clic indicateur ou balayage horizontal)
  $('#tvPageIndicator').onclick = () => setPageIndex(currentPageIndex + 1);

  let swipeStartX = null;
  const preview = $('#imgPreview');
  preview.addEventListener('pointerdown', (e) => {
    if (scannedPages.length > 1) swipeStartX = e.clientX;
  });
  preview.addEventListener('pointerup', (e) => {
    if (swipeStartX === null) return;
    const dx = e.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(dx) > 40 && scannedPages.length > 1) {
      setPageIndex(currentPageIndex + (dx < 0 ? 1 : -1));
    }
  });
  preview.addEventListener('pointercancel', () => { swipeStartX = null; });

  window.addEventListener('resize', renderPreview);
  window.addEventListener('scanpro:homevisible', renderPreview);
  window.addEventListener('scanpro:langchange', () => {
    updateCreditsUI();
    if (lastAmount !== null && !$('#tvAmount').classList.contains('hidden')) {
      $('#tvAmount').textContent = `${t('amount_detected')} ${lastAmount}`;
    }
  });
}
