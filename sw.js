const CACHE = 'scanpro-pwa-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './js/app.js',
  './js/core/ads.js',
  './js/core/docx.js',
  './js/core/dom.js',
  './js/core/files.js',
  './js/core/freemium.js',
  './js/core/i18n.js',
  './js/core/image.js',
  './js/core/ocr.js',
  './js/core/pdf.js',
  './js/core/richtext.js',
  './js/core/storage.js',
  './js/core/strings.js',
  './js/core/ui.js',
  './js/core/zip.js',
  './js/views/documents.js',
  './js/views/editor.js',
  './js/views/home.js',
  './js/views/scanner.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      });
    }),
  );
});
