// BillByteKOT Service Worker - Offline Support & Caching
const CACHE_NAME = 'billbytekot-v1.7.0';
const STATIC_CACHE = 'billbytekot-static-v1.7.0';
const DYNAMIC_CACHE = 'billbytekot-dynamic-v1.7.0';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/menu',
  '/api/tables',
  '/api/categories'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // For navigation requests (HTML pages), always go network first, branded offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static files - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request));
});

// Navigation strategy - network first, offline.html fallback (branded)
async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Try cached app shell (index.html for PWA / TWA)
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;

    // Serve branded offline page
    const offline = await caches.match('/offline.html');
    if (offline) return offline;

    // Last resort
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title><style>body{font-family:system-ui;background:#0b0f1a;color:#f5f7fb;display:grid;place-items:center;height:100vh;margin:0}</style><h1>You are offline</h1>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// Cache first strategy (for static files)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // For images, return a transparent fallback
    if (request.destination === 'image') {
      return new Response('', { status: 504 });
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network first strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful GET responses for certain endpoints
    if (networkResponse.ok && shouldCacheApiResponse(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Try to return cached response
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', request.url);
      return cachedResponse;
    }

    // Return error response
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Check if API response should be cached
function shouldCacheApiResponse(url) {
  return API_CACHE_URLS.some(endpoint => url.includes(endpoint));
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
});

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

async function syncOfflineOrders() {
  // This will be handled by the app when it comes online
  console.log('[SW] Background sync triggered');

  // Notify all clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_ORDERS' });
  });
}

// Push notification support - Marketing & Updates
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'BillByteKOT',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'billbytekot-notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || payload.message || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        image: payload.image || null,
        data: {
          url: payload.url || payload.action_url || '/',
          type: payload.type || 'info',
          notificationId: payload.notification_id || null
        },
        actions: payload.actions || [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: payload.priority === 'high',
        vibrate: payload.priority === 'high' ? [200, 100, 200, 100, 200] : [100, 50, 100]
      };
    } catch (e) {
      console.log('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    image: data.image,
    data: data.data,
    actions: data.actions,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Try to focus existing window
      for (const client of clients) {
        if (client.url.includes('billbytekot') && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Notification close handler (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

console.log('[SW] Service worker loaded');
