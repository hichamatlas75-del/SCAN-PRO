// =========================================================
// Scanner de documents (remplace GmsDocumentScanning — mode FULL)
// Caméra multi-pages + import galerie + détection des bords + recadrage.
// scanDocuments() → Promise<HTMLCanvasElement[] | null>
// =========================================================
import { $, show, hide } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { toast, progress } from '../core/ui.js';
import {
  fileToCanvas, drawableToCanvas, rotate90, detectDocumentCorners, warpPerspective, fitRect, scaledCopy,
} from '../core/image.js';

let stream = null;

async function startCamera(video) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    return true;
  } catch (e) {
    console.warn('Camera', e);
    return false;
  }
}

function stopCamera(video) {
  stream?.getTracks().forEach((tr) => tr.stop());
  stream = null; video.srcObject = null;
}

/** Capture une image haute résolution si possible (ImageCapture), sinon la frame vidéo. */
async function grabFrame(video) {
  const track = stream?.getVideoTracks()[0];
  if (track && 'ImageCapture' in window) {
    try {
      const blob = await new window.ImageCapture(track).takePhoto();
      return await fileToCanvas(blob);
    } catch { /* repli frame vidéo */ }
  }
  return drawableToCanvas(video);
}

// ---------------------------------------------------------
// Recadrage : coins détectés automatiquement, ajustables au doigt
// ---------------------------------------------------------
function cropPage(source) {
  return new Promise((resolve) => {
    const view = $('#view-crop'), stage = $('#cropStage'), canvas = $('#cropCanvas'), svg = $('#cropSvg');
    let src = source;
    let corners = detectDocumentCorners(src);
    let box; // rectangle d'affichage
    show(view);

    const render = () => {
      const sw = stage.clientWidth, sh = stage.clientHeight;
      box = fitRect(src.width, src.height, sw, sh);
      const dpr = devicePixelRatio || 1;
      const preview = scaledCopy(src, Math.max(box.w, box.h) * dpr);
      canvas.width = preview.width; canvas.height = preview.height;
      canvas.getContext('2d').drawImage(preview, 0, 0);
      for (const el of [canvas, svg]) Object.assign(el.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
      svg.setAttribute('viewBox', `0 0 ${box.w} ${box.h}`);
      drawQuad();
    };
    const k = () => box.w / src.width;
    const drawQuad = () => {
      const pts = corners.map((p) => `${p.x * k()},${p.y * k()}`).join(' ');
      svg.innerHTML = `<polygon points="${pts}"/>` +
        corners.map((p, i) => `<circle data-i="${i}" cx="${p.x * k()}" cy="${p.y * k()}" r="14"/>`).join('');
    };

    let drag = -1;
    const toSrc = (e) => {
      const r = svg.getBoundingClientRect();
      return {
        x: Math.min(src.width, Math.max(0, (e.clientX - r.left) / k())),
        y: Math.min(src.height, Math.max(0, (e.clientY - r.top) / k())),
      };
    };
    const onDown = (e) => {
      const p = toSrc(e);
      // coin le plus proche (tolérance généreuse pour le tactile)
      let best = -1, bd = Infinity;
      corners.forEach((c, i) => { const d = Math.hypot(c.x - p.x, c.y - p.y) * k(); if (d < bd) { bd = d; best = i; } });
      if (bd < 48) { drag = best; stage.setPointerCapture(e.pointerId); e.preventDefault(); }
    };
    const onMove = (e) => { if (drag < 0) return; corners[drag] = toSrc(e); drawQuad(); };
    const onUp = () => { drag = -1; };

    const cleanup = (result) => {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      removeEventListener('resize', render);
      $('#cropOk').onclick = $('#cropCancel').onclick = $('#cropRotate').onclick = $('#cropFull').onclick = null;
      hide(view);
      resolve(result);
    };

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    addEventListener('resize', render);

    $('#cropRotate').onclick = () => {
      // rotation 90° horaire des coins en même temps que l'image
      const H = src.height;
      corners = corners.map((p) => ({ x: H - p.y, y: p.x }));
      corners = [corners[3], corners[0], corners[1], corners[2]];
      src = rotate90(src); render();
    };
    $('#cropFull').onclick = () => {
      corners = [{ x: 0, y: 0 }, { x: src.width, y: 0 }, { x: src.width, y: src.height }, { x: 0, y: src.height }];
      drawQuad();
    };
    $('#cropCancel').onclick = () => cleanup(null);
    $('#cropOk').onclick = async () => {
      await progress.run(() => new Promise((r) => setTimeout(r, 30)));
      progress.show();
      try { cleanup(warpPerspective(src, corners)); } finally { progress.hide(); }
    };

    requestAnimationFrame(render);
  });
}

// ---------------------------------------------------------
// Session de scan
// ---------------------------------------------------------
export function scanDocuments() {
  return new Promise(async (resolve) => {
    const view = $('#view-scanner'), video = $('#scanVideo');
    const pages = [];
    let finished = false, busy = false;

    const updateCounter = () => {
      $('#scanCount').textContent = pages.length ? `${t('page')} ${pages.length}` : '';
      show($('#scanDone'), pages.length > 0);
      const thumb = $('#scanThumb');
      if (pages.length) {
        thumb.style.backgroundImage = `url(${scaledCopy(pages.at(-1), 120).toDataURL('image/jpeg', 0.7)})`;
        thumb.innerHTML = `<b>${pages.length}</b>`;
      } else { thumb.style.backgroundImage = ''; thumb.innerHTML = ''; }
    };

    const addPage = async (canvas) => {
      stopCamera(video);
      const cropped = await cropPage(canvas);
      if (cropped) pages.push(cropped);
      updateCounter();
      if (!finished) {
        const ok = await startCamera(video);
        show($('#scanNoCamera'), !ok);
      }
    };

    const finish = (result) => {
      if (finished) return;
      finished = true;
      stopCamera(video);
      removeEventListener('popstate', onPop);
      $('#scanShutter').onclick = $('#scanGallery').onclick = $('#scanClose').onclick = $('#scanDone').onclick = null;
      $('#scanFile').onchange = null;
      hide(view);
      resolve(result);
    };
    const onPop = () => finish(null); // bouton retour du navigateur / Android
    history.pushState({ scanner: true }, '');
    addEventListener('popstate', onPop);
    const leave = (result) => { finish(result); history.back(); };

    $('#scanClose').onclick = () => leave(null);
    $('#scanDone').onclick = () => leave(pages.length ? pages : null);
    $('#scanShutter').onclick = async () => {
      if (busy || !stream) { if (!stream) $('#scanFile').click(); return; }
      busy = true;
      try { await addPage(await grabFrame(video)); } catch { toast(t('error_load')); } finally { busy = false; }
    };
    $('#scanGallery').onclick = () => $('#scanFile').click();
    $('#scanFile').onchange = async (e) => {
      const files = [...e.target.files]; e.target.value = '';
      for (const f of files) {
        try { await addPage(await progress.run(() => fileToCanvas(f))); } catch { toast(t('error_load')); }
      }
    };

    updateCounter();
    show(view);
    const ok = await startCamera(video);
    show($('#scanNoCamera'), !ok);
    if (!ok && !navigator.mediaDevices) toast(t('error_scanner_unavailable'));
  });
}
