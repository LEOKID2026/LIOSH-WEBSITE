// Service Worker for LEO K PWA - Full Offline Support
const CACHE_NAME = 'leo-k-v7';
const STATIC_CACHE = 'leo-k-static-v7';
const DYNAMIC_CACHE = 'leo-k-dynamic-v7';
const REWARD_CARD_PATH_PREFIX = '/rewards/cards/';

// Install-time precache: public chrome only. Game/solo assets cache on first request
// (see fetch handler) or via /student/sw.js offline precache — not every site visitor.
const STATIC_ASSETS = [
  '/manifest.json',
  '/manifest-student.webmanifest',
  '/icons/child/pwa-192x192.png',
  '/icons/child/pwa-512x512.png',
  '/icons/child/maskable-192x192.png',
  '/icons/child/maskable-512x512.png',
  '/images/coin.png',
];

// Patterns for dynamic caching
const IMAGE_PATTERNS = [
  /^\/images\/.*\.(png|jpg|jpeg|gif|webp|svg)$/i,
  /^\/images\/card\/.*\.png$/i,
  /^\/images\/candy\/.*\.png$/i,
];

const SOUND_PATTERNS = [
  /^\/sounds\/.*\.(mp3|wav|ogg)$/i,
];

function isRewardCardImageRequest(url, request) {
  if (!url.pathname.startsWith(REWARD_CARD_PATH_PREFIX)) {
    return false;
  }
  return (
    request.destination === 'image' ||
    /\.(webp|png|jpg|jpeg|gif|svg)$/i.test(url.pathname)
  );
}

/** Network First for reward card art — same filename can be replaced server-side. */
function networkFirstRewardCardImage(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        const urlWithoutParams = request.url.split('?')[0];
        return caches.match(urlWithoutParams);
      }).then((cachedResponse) => cachedResponse || new Response('', { status: 404 }))
    );
}

/** Drop stale reward card blobs from any open cache (safe: path-scoped only). */
async function purgeRewardCardImageEntries() {
  const cacheNames = await caches.keys();
  let removed = 0;

  await Promise.all(
    cacheNames.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      await Promise.all(
        requests.map(async (req) => {
          try {
            const pathname = new URL(req.url).pathname;
            if (pathname.startsWith(REWARD_CARD_PATH_PREFIX)) {
              removed += 1;
              await cache.delete(req);
            }
          } catch (_err) {
            // ignore malformed cache keys
          }
        })
      );
    })
  );

  if (removed > 0) {
    console.log('[SW] Purged stale reward card image entries:', removed);
  }
}

// Pre-cache essential pages after first visit
const ESSENTIAL_PAGES = [
  '/',
  '/game',
  '/learning',
  '/learning/index',
  '/learning/parent-report',
  '/learning/parent-report-detailed',
  '/parent/login',
  '/parent/child-report',
  '/offline',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Cache רק קבצים סטטיים אמיתיים
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.log('[SW] Some assets failed to cache:', err);
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => purgeRewardCardImageEntries())
    .then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Helper function to check if request should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Don't cache external resources
  if (url.origin !== self.location.origin) {
    return false;
  }
  
  // Check patterns
  const pathname = url.pathname;
  const isImage = IMAGE_PATTERNS.some(pattern => pattern.test(pathname));
  const isSound = SOUND_PATTERNS.some(pattern => pattern.test(pathname));
  
  // Cache images, sounds, CSS, JS, and HTML
  return (
    request.method === 'GET' &&
    (
      request.destination === 'image' ||
      request.destination === 'audio' ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'document' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/_next/static') ||
      url.pathname.startsWith('/images/') ||
      url.pathname.startsWith('/sounds/') ||
      url.pathname.startsWith('/styles/') ||
      isImage ||
      isSound
    )
  );
}

// Fetch event - Network First for pages, Cache First for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept web manifests — each PWA page must fetch its own manifest from network.
  if (
    url.pathname.endsWith('.webmanifest') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/manifest-student.webmanifest' ||
    url.pathname === '/manifest-parent.webmanifest' ||
    url.pathname === '/manifest-teacher.webmanifest'
  ) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle Next.js pages with Network First, fallback to cache
  // This works for both browser and PWA mode
  if (request.destination === 'document' && !url.pathname.startsWith('/_next')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed - try cache with multiple fallback strategies
          // Strategy 1: Try exact match
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Strategy 2: Try URL without query params
            const urlWithoutParams = request.url.split('?')[0];
            return caches.match(urlWithoutParams).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Strategy 3: Try parent route (for nested pages)
              if (url.pathname.startsWith('/learning/')) {
                return caches.match('/learning').then((cachedResponse) => {
                  if (cachedResponse) {
                    return cachedResponse;
                  }
                });
              }
              
              // Strategy 4: Try home page as ultimate fallback
              if (url.pathname !== '/') {
                return caches.match('/').then((cachedResponse) => {
                  if (cachedResponse) {
                    return cachedResponse;
                  }
                });
              }
              
              // Strategy 5: Return offline page
              return caches.match('/offline').then((offlinePage) => {
                if (offlinePage) {
                  return offlinePage;
                }
                
                // Final fallback - generate basic HTML response inline
                return new Response(
                  '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>אופליין - LEO KIDS</title><style>body{font-family:system-ui;text-align:center;padding:50px;background:#0a0f1d;color:#fff;margin:0}h1{font-size:2rem;margin-bottom:1rem}p{font-size:1.1rem;margin-bottom:2rem;color:#aaa}button{padding:12px 24px;margin-top:20px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem}button:hover{background:#059669}</style></head><body><h1>🔌 אתה במצב אופליין</h1><p>אנא התחבר לאינטרנט כדי להמשיך.</p><button onclick="location.reload()">נסה שוב</button></body></html>',
                  { 
                    status: 503,
                    headers: { 
                      'Content-Type': 'text/html; charset=utf-8',
                      'Cache-Control': 'no-cache'
                    }
                  }
                );
              });
            });
          });
        })
    );
    return;
  }

  // Handle Next.js static chunks and scripts - Cache First
  // These are critical for the app to work offline
  if (
    url.pathname.startsWith('/_next/static') ||
    (request.destination === 'script' && url.pathname.startsWith('/_next'))
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          }).catch(() => {
            // Don't fail completely - return empty response
            return new Response('', { status: 404 });
          });
        })
    );
    return;
  }

  // Skip API routes and scripts
  if (
    url.pathname.startsWith('/api/') ||
    request.destination === 'script'
  ) {
    return;
  }

  // Reward card images — Network First so replaced files at the same URL refresh.
  if (isRewardCardImageRequest(url, request)) {
    event.respondWith(networkFirstRewardCardImage(request));
    return;
  }

  // Handle static assets (images, sounds, CSS) - Cache First
  if (
    request.destination === 'image' ||
    request.destination === 'audio' ||
    (request.destination === 'style' && url.pathname.startsWith('/styles/')) ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/sounds/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              const responseToCache = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // If fetch fails, return 404 for images/sounds
              return new Response('', { status: 404 });
            });
        })
    );
    return;
  }
});

// Background sync for offline actions (optional, for future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

function syncScores() {
  // Future: sync scores to server when back online
  return Promise.resolve();
}

// Handle push notifications (optional, for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/icons/child/android-chrome-192x192.png',
    badge: '/icons/child/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'leo-k-notification'
  };

  event.waitUntil(
    self.registration.showNotification('LEO K', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Message handler - לקבל הודעות מהדף כדי לעשות pre-cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRE_CACHE_PAGES') {
    const pages = event.data.pages || ESSENTIAL_PAGES;
    console.log('[SW] Pre-caching pages:', pages);
    event.waitUntil(
      Promise.all(
        pages.map((url) => {
          // יצירת Request object עבור ה-URL
          const request = new Request(url, { credentials: 'same-origin' });
          return fetch(request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, responseToCache);
                  console.log(`[SW] Pre-cached: ${url}`);
                });
              }
            })
            .catch((err) => {
              console.log(`[SW] Failed to pre-cache ${url}:`, err);
            });
        })
      ).then(() => {
        console.log('[SW] Pre-caching completed');
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
