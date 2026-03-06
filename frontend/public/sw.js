// DIANA Service Worker - PWA Baseline Implementation
// Version: 1.0.0

const CACHE_VERSION = 'diana-v1';
const CACHE_NAME = `${CACHE_VERSION}-app-shell`;
const OFFLINE_URL = '/offline.html';

// App shell: critical assets for offline functionality
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo.png',
  '/manifest.webmanifest',
];

// Install event: cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    }).then(() => {
      console.log('[SW] App shell cached successfully');
      return self.skipWaiting(); // Activate immediately
    }).catch((error) => {
      console.error('[SW] Failed to cache app shell:', error);
    })
  );
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event: cache-first strategy for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except same-origin assets)
  if (url.origin !== location.origin) {
    return;
  }

  // API requests: network-first (always try fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // API unavailable offline - could return cached error page
          return new Response(
            JSON.stringify({ error: 'Offline - API unavailable' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Static assets: cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      }

      // Not in cache - fetch from network and cache for future
      return fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone response (can only be consumed once)
          const responseToCache = response.clone();

          // Cache static assets (JS, CSS, images, fonts)
          if (
            url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/i)
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              console.log('[SW] Caching new asset:', request.url);
              cache.put(request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // Network failed - serve offline fallback for navigation requests
          if (request.destination === 'document') {
            console.log('[SW] Network failed - serving offline page');
            return caches.match(OFFLINE_URL);
          }

          // For other assets, no fallback
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Message event: listen for commands from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING command');
    self.skipWaiting();
  }
});

// Push notification placeholder (not implemented in baseline)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received (not implemented)');
  // Future: implement push notifications
});

// Background sync placeholder (not implemented in baseline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered (not implemented)');
  // Future: implement background data sync
});

console.log('[SW] Service worker script loaded');
