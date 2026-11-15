/* Service Worker — מאפשר פתיחה כאפליקציה והצגה מהירה */
const CACHE = 'family-dashboard-v2';   /* v2 (10.11.2026): נוספו daily, points והאייקונים שלהם */
const SHELL = ['./', './index.html', './control.html', './daily.html', './points.html',
               './manifest.json', './points.webmanifest',
               './icon-192.png', './icon-512.png', './medal-180.png', './medal-192.png', './medal-512.png',
               './fonts/rubik-var.woff2', './fonts/assistant-var.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* נתונים תמיד מהרשת; קבצי המעטפת מהמטמון כגיבוי */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('supabase') || url.hostname.includes('open-meteo')) return;

  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok && url.origin === location.origin) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
