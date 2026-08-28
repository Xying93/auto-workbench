/* 自动化工作台 Service Worker —— 离线可用 + 同步数据实时拉取 */
const CACHE = 'auto-workbench-v1';
const CORE = [
  './',
  './workbench-desktop.html',
  './manifest.json',
  './assets/greet-banner.jpg',
  './assets/avatar.jpg',
  './assets/app-icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // auto-sync.json：network-first，保证拿到自动化最新同步内容
  if (url.pathname.endsWith('auto-sync.json')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
  // 其余资源：stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
