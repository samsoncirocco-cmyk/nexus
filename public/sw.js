// Second Brain Service Worker
const CACHE_NAME = 'second-brain-v2';
const OFFLINE_URL = '/offline.html';

// Critical pages to cache for offline access
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Critical routes to cache when visited (runtime caching)
const CRITICAL_ROUTES = [
  '/',
  '/memory',
  '/vault',
  '/tasks',
  '/dashboard',
  '/deals',
  '/activity',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isCriticalRoute = CRITICAL_ROUTES.some(route => url.pathname === route || url.pathname.startsWith(route + '/'));

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response and cache it
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Always cache critical routes
            if (isCriticalRoute || event.request.destination === 'document') {
              cache.put(event.request, responseClone);
              console.log('[SW] Cached critical page:', url.pathname);
            } else {
              // Cache other successful requests too
              cache.put(event.request, responseClone);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', url.pathname);
            return cachedResponse;
          }
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            console.log('[SW] Navigation offline, showing offline page');
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
