// Service Worker for LEO K PWA - Full Offline Support
const CACHE_NAME = 'leo-k-v5';
const STATIC_CACHE = 'leo-k-static-v5';
const DYNAMIC_CACHE = 'leo-k-dynamic-v5';

// רק קבצים סטטיים אמיתיים (לא דפי Next.js שנוצרים דינמית)
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline',
  '/styles/globals.css',
  // Essential images
  '/images/leo-intro.png',
  '/images/leo-icons/icon-192.png',
  '/images/leo-icons/icon-512.png',
  '/images/leo-icons/icon-192-maskable.png',
  '/images/leo-icons/icon-512-maskable.png',
  // Game images
  '/images/dog.png',
  '/images/leo2.png',
  '/images/leo.png',
  '/images/coin.png',
  '/images/leo-logo.png',
  '/images/diamond.png',
  '/images/magnet.png',
  '/images/coin2.png',
  '/images/obstacle.png',
  '/images/obstacle1.png',
  '/images/ball.png',
  '/images/leo-keeper.png',
  '/images/penalty-bg.png',
  '/images/game-day.png',
  '/images/game-evening.png',
  '/images/game-night.png',
  '/images/game-space.png',
  '/images/game-park.png',
  '/images/game1.png',
  '/images/game2.png',
  '/images/game3.png',
  '/images/game4.png',
  '/images/game10.png',
  // Card images for memory game (first 10, rest will be cached dynamically)
  '/images/card/shiba1.png',
  '/images/card/shiba2.png',
  '/images/card/shiba3.png',
  '/images/card/shiba4.png',
  '/images/card/shiba5.png',
  // Candy images for puzzle
  '/images/candy/heart.png',
  '/images/candy/circle.png',
  '/images/candy/square.png',
  '/images/candy/drop.png',
  '/images/candy/diamond.png',
  '/images/candy/star.png',
  // Essential sounds
  '/sounds/bg-music.mp3',
  '/sounds/jump.mp3',
  '/sounds/coin.mp3',
  '/sounds/game-over.mp3',
  '/sounds/flap2.mp3',
  '/sounds/win.mp3',
  '/sounds/lose.mp3',
  '/sounds/bomb.mp3',
  '/sounds/flap.mp3',
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
                  '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - LEO K</title><style>body{font-family:system-ui;text-align:center;padding:50px;background:#0a0f1d;color:#fff;margin:0}h1{font-size:2rem;margin-bottom:1rem}p{font-size:1.1rem;margin-bottom:2rem;color:#aaa}button{padding:12px 24px;margin-top:20px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem}button:hover{background:#059669}</style></head><body><h1>🔌 אתה במצב Offline</h1><p>אנא התחבר לאינטרנט כדי להמשיך.</p><button onclick="location.reload()">נסה שוב</button></body></html>',
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
    icon: '/images/leo-icons/android-chrome-192x192.png',
    badge: '/images/leo-icons/android-chrome-192x192.png',
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
