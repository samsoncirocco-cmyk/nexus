// Second Brain Service Worker
const CACHE_NAME = 'second-brain-v3';
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

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
  '/api/activity',
  '/api/tasks',
  '/api/vault',
  '/api/memory',
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

// Fetch event - intelligent caching based on resource type
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isAPI = API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern));
  const isStaticAsset = event.request.destination === 'script' || 
                        event.request.destination === 'style' || 
                        event.request.destination === 'image' ||
                        event.request.destination === 'font';
  const isCriticalRoute = CRITICAL_ROUTES.some(route => url.pathname === route || url.pathname.startsWith(route + '/'));

  // Cache-first strategy for static assets (CSS, JS, images, fonts)
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Cache hit (static):', url.pathname);
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for API calls and pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response and cache it
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Always cache API responses and critical routes
            if (isAPI || isCriticalRoute || event.request.destination === 'document') {
              cache.put(event.request, responseClone);
              console.log('[SW] Cached (network-first):', url.pathname);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', url.pathname);
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
