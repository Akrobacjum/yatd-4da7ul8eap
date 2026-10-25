// You are the dungeon (web): network first, so a new version always wins; the cache only helps when the network is gone.
const C = 'yatd-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin && !/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  // 1.27.2: same-origin files are revalidated with the server (GitHub Pages lets the browser keep them 10 minutes, so a
  // fresh release did not show up right away)
  const net = u.origin === location.origin ? fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(r);
  e.respondWith(net.then(res => { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)).catch(() => {}); return res; }).catch(() => caches.match(r)));
});
