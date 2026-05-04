// Houdini Locksmith & Security — Service Worker
// Strategy:
//   • Static assets (JS/CSS/fonts/images): cache-first, update in background
//   • API calls (/api/*): network-first, no caching
//   • Navigation requests: network-first, fallback to cached /index.html

const CACHE_VERSION = 'houdini-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = '/offline.html';

// Core shell assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Offline.html may not exist yet — ignore gracefully
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('houdini-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API calls — network-first, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'You appear to be offline. Please reconnect.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images) — cache-first, stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|svg|ico|webp)$/) ||
    url.hostname !== self.location.hostname
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Navigation requests — network-first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Try cached index.html for SPA routing
          const cached = await caches.match('/') || await caches.match('/index.html');
          if (cached) return cached;
          // Last resort: offline page
          return caches.match(OFFLINE_URL) ||
            new Response('<h1>Offline</h1><p>Please reconnect to use Houdini Locksmith.</p>', {
              headers: { 'Content-Type': 'text/html' },
            });
        })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: '/favicon-192x192.png',
      badge: '/favicon-192x192.png',
      tag: data.tag || 'houdini-notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Houdini Locksmith', options)
    );
  } catch (err) {
    console.error('Push notification error:', err);
  }
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if the app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
