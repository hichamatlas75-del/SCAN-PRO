// =========================================================
// Traitement d'image — chargement, rotation, détection des bords,
// correction de perspective (remplace ML Kit Document Scanner)
// =========================================================

const MAX_DIM = 2480; // ≈ A4 à 300 dpi

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

/** Charge un File/Blob en canvas (orientation EXIF respectée), réduit à MAX_DIM. */
export async function fileToCanvas(file, maxDim = MAX_DIM) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(async () => {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode(); return img;
    } finally { URL.revokeObjectURL(url); }
  });
  return drawableToCanvas(bmp, maxDim);
}

/** Copie une source (vidéo, image, bitmap) dans un canvas réduit à maxDim. */
export function drawableToCanvas(src, maxDim = MAX_DIM) {
  const w = src.videoWidth || src.naturalWidth || src.width;
  const h = src.videoHeight || src.naturalHeight || src.height;
  const k = Math.min(1, maxDim / Math.max(w, h));
  const c = createCanvas(w * k, h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  src.close?.();
  return c;
}

/** Rotation de 90° horaire (Matrix.postRotate(90f)). */
export function rotate90(src) {
  const c = createCanvas(src.height, src.width);
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

export function scaledCopy(src, maxDim) {
  const k = Math.min(1, maxDim / Math.max(src.width, src.height));
  const c = createCanvas(src.width * k, src.height * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export const canvasToBlob = (c, type = 'image/png', q = 0.92) =>
  new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), type, q));

export async function canvasToJpegBytes(c, q = 0.9) {
  return new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', q)).arrayBuffer());
}

/** Rectangle « fitCenter » d'une image dans une boîte. */
export function fitRect(srcW, srcH, boxW, boxH) {
  const r = srcW / srcH;
  if (r > boxW / boxH) { const h = boxW / r; return { x: 0, y: (boxH - h) / 2, w: boxW, h }; }
  const w = boxH * r; return { x: (boxW - w) / 2, y: 0, w, h: boxH };
}

/** Dessine `src` en fitCenter dans un canvas d'affichage (ImageView scaleType=fitCenter). */
export function drawFitCenter(target, src, bg = '#000') {
  const dpr = devicePixelRatio || 1;
  const W = Math.round(target.clientWidth * dpr), H = Math.round(target.clientHeight * dpr);
  if (target.width !== W || target.height !== H) { target.width = W; target.height = H; }
  const ctx = target.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (!src) return;
  const r = fitRect(src.width, src.height, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, r.x, r.y, r.w, r.h);
}

// ---------------------------------------------------------
// Détection automatique des bords (heuristique légère)
// Seuillage d'Otsu → plus grande composante claire → 4 coins extrêmes.
// ---------------------------------------------------------
export function detectDocumentCorners(src) {
  const S = 256;
  const small = scaledCopy(src, S);
  const w = small.width, h = small.height;
  const data = small.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    const g = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
    gray[i] = g; hist[g]++;
  }
  // Otsu
  const total = gray.length; let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = i; }
  }
  // Plus grande composante connexe au-dessus du seuil
  const label = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  let bestArea = 0, bestId = -1, id = 0;
  for (let p = 0; p < gray.length; p++) {
    if (gray[p] <= thr || label[p] !== -1) continue;
    let top = 0, area = 0; stack[top++] = p; label[p] = id;
    while (top) {
      const q = stack[--top]; area++;
      const x = q % w, y = (q / w) | 0;
      if (x > 0 && label[q - 1] === -1 && gray[q - 1] > thr) { label[q - 1] = id; stack[top++] = q - 1; }
      if (x < w - 1 && label[q + 1] === -1 && gray[q + 1] > thr) { label[q + 1] = id; stack[top++] = q + 1; }
      if (y > 0 && label[q - w] === -1 && gray[q - w] > thr) { label[q - w] = id; stack[top++] = q - w; }
      if (y < h - 1 && label[q + w] === -1 && gray[q + w] > thr) { label[q + w] = id; stack[top++] = q + w; }
    }
    if (area > bestArea) { bestArea = area; bestId = id; }
    id++;
  }
  const k = src.width / w;
  const fallback = () => {
    const m = 0.04;
    return [
      { x: src.width * m, y: src.height * m }, { x: src.width * (1 - m), y: src.height * m },
      { x: src.width * (1 - m), y: src.height * (1 - m) }, { x: src.width * m, y: src.height * (1 - m) },
    ];
  };
  const ratio = bestArea / total;
  if (bestId < 0 || ratio < 0.15 || ratio > 0.97) return fallback();

  let tl, tr, br, bl, sMin = Infinity, sMax = -Infinity, dMin = Infinity, dMax = -Infinity;
  for (let p = 0; p < label.length; p++) {
    if (label[p] !== bestId) continue;
    const x = p % w, y = (p / w) | 0, s = x + y, d = x - y;
    if (s < sMin) { sMin = s; tl = { x, y }; }
    if (s > sMax) { sMax = s; br = { x, y }; }
    if (d > dMax) { dMax = d; tr = { x, y }; }
    if (d < dMin) { dMin = d; bl = { x, y }; }
  }
  const quad = [tl, tr, br, bl].map((p) => ({ x: Math.min(src.width, (p.x + 0.5) * k), y: Math.min(src.height, (p.y + 0.5) * k) }));
  return polygonArea(quad) / (src.width * src.height) < 0.12 ? fallback() : quad;
}

export function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a) / 2;
}

// ---------------------------------------------------------
// Correction de perspective (homographie + interpolation bilinéaire)
// corners : [tl, tr, br, bl] dans le repère de src
// ---------------------------------------------------------
export function warpPerspective(src, corners) {
  const [tl, tr, br, bl] = corners;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let W = Math.max(dist(tl, tr), dist(bl, br));
  let H = Math.max(dist(tl, bl), dist(tr, br));
  const k = Math.min(1, MAX_DIM / Math.max(W, H));
  W = Math.max(1, Math.round(W * k)); H = Math.max(1, Math.round(H * k));

  // Homographie : (u,v) ∈ [0,W]×[0,H]  →  (x,y) source
  const M = homography(
    [[0, 0], [W, 0], [W, H], [0, H]],
    corners.map((p) => [p.x, p.y]),
  );
  const sw = src.width, sh = src.height;
  const sdata = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const out = createCanvas(W, H);
  const octx = out.getContext('2d');
  const img = octx.createImageData(W, H);
  const d = img.data;
  for (let v = 0, o = 0; v < H; v++) {
    for (let u = 0; u < W; u++, o += 4) {
      const den = M[6] * u + M[7] * v + 1;
      let x = (M[0] * u + M[1] * v + M[2]) / den;
      let y = (M[3] * u + M[4] * v + M[5]) / den;
      x = Math.min(sw - 1.001, Math.max(0, x)); y = Math.min(sh - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let c = 0; c < 3; c++) {
        const top = sdata[i00 + c] + (sdata[i10 + c] - sdata[i00 + c]) * fx;
        const bot = sdata[i01 + c] + (sdata[i11 + c] - sdata[i01 + c]) * fx;
        d[o + c] = top + (bot - top) * fy;
      }
      d[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/** Résout l'homographie 3×3 (h33 = 1) envoyant from[i] → to[i]. */
function homography(from, to) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = from[i], [x, y] = to[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  return gaussSolve(A, b);
}

function gaussSolve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) A[i].push(b[i]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}
