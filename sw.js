// Service worker : l'app fonctionne hors ligne une fois chargée.
const VERSION = 'atelier-v7';
const SHELL = [
  './', './index.html', './styles.css', './manifest.json',
  './js/app.js', './js/core.js', './js/sessions.js', './js/biases.js', './js/lab.js', './js/quiz.js', './js/programs.js', './js/affirmations.js', './js/introspection.js',
  './js/voice.js', './js/visuals.js', './js/ambient.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('atelier-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'api.elevenlabs.io') return; // jamais intercepté
  const isFont = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');
  if (url.origin !== location.origin && !isFont) return;

  // Polices : cache d'abord. Fichiers de l'app : réseau d'abord, cache hors ligne.
  if (isFont) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return r;
    })));
    return;
  }
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request.mode === 'navigate' ? './index.html' : e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
