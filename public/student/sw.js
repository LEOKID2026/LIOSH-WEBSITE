// Service worker for LEO K student PWA (scope /student/ only).
// Sync STUDENT_OFFLINE_FULL_SW_ENABLED with lib/offline/offline-flags.js.

try {
  importScripts("./offline-precache-generated.js");
} catch (err) {
  console.warn("[SW student] offline-precache-generated.js not loaded:", err);
}

const STUDENT_OFFLINE_FULL_SW_ENABLED = true;

const GENERATED = self.__STUDENT_OFFLINE_PRECACHE__ || {
  chunkUrls: [],
  navUrls: [],
  dataUrls: [],
  assetUrls: [],
};

const CACHE_NAME = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? "student-offline-v4-full"
  : "student-offline-v1";
const CACHE_PREFIX = "student-";

const OFFLINE_HTML = "/student/offline.html";
const OFFLINE_HUB = "/student/offline";

const INSTALL_PRECACHE = [OFFLINE_HTML, "/icons/child/pwa-192x192.png"];

const BASELINE_OFFLINE_GAME_URLS = [
  OFFLINE_HUB,
  "/student/offline/tic-tac-toe",
  "/student/offline/rock-paper-scissors",
  "/student/offline/tap-battle",
  "/student/offline/memory-match",
];

const FULL_OFFLINE_NAV_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? GENERATED.navUrls.filter((url) => !BASELINE_OFFLINE_GAME_URLS.includes(url))
  : [];

const OFFLINE_GAME_URLS = [...BASELINE_OFFLINE_GAME_URLS, ...FULL_OFFLINE_NAV_URLS];

const FULL_CHUNK_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED ? GENERATED.chunkUrls || [] : [];
const FULL_DATA_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED ? GENERATED.dataUrls || [] : [];
const FULL_ASSET_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? GENERATED.assetUrls || []
  : [];

const OFFLINE_CHUNK_SET = new Set(FULL_CHUNK_URLS);
const OFFLINE_DATA_SET = new Set(FULL_DATA_URLS);
const OFFLINE_ASSET_SET = new Set(FULL_ASSET_URLS);

const OFFLINE_HTML_FALLBACK = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>אין חיבור — LEO K</title>
<style>
body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#050816;color:#fff;font-family:system-ui,sans-serif;padding:1.5rem}
.card{max-width:22rem;text-align:center}
.btn{display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2dd4bf,#0ea5e9);color:#050816;font-weight:700;text-decoration:none;border-radius:1rem;padding:.85rem 2rem;width:100%}
</style>
</head>
<body>
<div class="card">
<h1>אין חיבור לאינטרנט</h1>
<p>ניתן לשחק במשחקים הבאים גם בלי אינטרנט</p>
<a href="/student/offline" class="btn">🎮 משחקים ללא אינטרנט</a>
</div>
</body>
</html>`;

const IMAGE_PATTERNS = [
  /^\/images\/.*\.(png|jpg|jpeg|gif|webp|svg)$/i,
  /^\/images\/card\/.*\.png$/i,
  /^\/images\/candy\/.*\.png$/i,
  /^\/images\/puzzle\/.*\.png$/i,
  /^\/images\/grocery-items\/.*\.svg$/i,
  /^\/images\/recycling-items\/.*\.svg$/i,
  /^\/images\/leo-supermarket\/.*\.(png|jpg|webp)$/i,
];

const SOUND_PATTERNS = [/^\/sounds\/.*\.(mp3|wav|ogg)$/i];
const REWARD_CARD_PATH_PREFIX = "/rewards/cards/";

/** Navigation documents allowed offline — only /student/offline/** */
function isAllowedOfflineDocumentPath(pathname) {
  if (pathname === OFFLINE_HTML) return true;
  if (pathname === OFFLINE_HUB) return true;
  return pathname.startsWith(`${OFFLINE_HUB}/`);
}

function isBlockedStudentDocumentPath(pathname) {
  if (!pathname.startsWith("/student/")) return false;
  return !isAllowedOfflineDocumentPath(pathname);
}

function isStudentNavigation(request, url) {
  return (
    url.pathname.startsWith("/student/") &&
    (request.mode === "navigate" || request.destination === "document")
  );
}

function isStudentDataRequest(url) {
  return url.pathname.startsWith("/_next/data/") && url.pathname.endsWith(".json");
}

function isAllowedOfflineDataPath(pathname) {
  return pathname.includes("/student/offline");
}

function isOfflineStaticChunk(pathname) {
  if (!pathname.startsWith("/_next/static/")) return false;
  if (!STUDENT_OFFLINE_FULL_SW_ENABLED) return true;
  return OFFLINE_CHUNK_SET.has(pathname);
}

function isOfflinePrecachedAsset(pathname) {
  if (OFFLINE_ASSET_SET.has(pathname)) return true;
  if (!STUDENT_OFFLINE_FULL_SW_ENABLED) return false;
  if (pathname.startsWith(REWARD_CARD_PATH_PREFIX)) return true;
  return (
    IMAGE_PATTERNS.some((pattern) => pattern.test(pathname)) ||
    SOUND_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

/** @param {Request} request @param {boolean} allowRuntimeCache */
async function cacheFirstAllowlisted(request, allowRuntimeCache) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && allowRuntimeCache) {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
  }
  return response;
}

async function serveOfflineHtmlFallback() {
  const cache = await caches.open(CACHE_NAME);
  const candidates = [
    OFFLINE_HTML,
    new Request(OFFLINE_HTML, { mode: "navigate" }),
  ];

  for (const candidate of candidates) {
    const match = await cache.match(candidate, { ignoreSearch: true });
    if (match) return match;
  }

  return new Response(OFFLINE_HTML_FALLBACK, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** @param {Request} request */
async function handleStudentNavigation(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (isBlockedStudentDocumentPath(pathname)) {
    try {
      return await fetch(request);
    } catch (_err) {
      return serveOfflineHtmlFallback();
    }
  }

  if (!isAllowedOfflineDocumentPath(pathname)) {
    return serveOfflineHtmlFallback();
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (_err) {
    const cached =
      (await caches.match(request)) ||
      (await caches.match(pathname, { ignoreSearch: true }));
    if (cached) return cached;
    return serveOfflineHtmlFallback();
  }
}

/** Remove cached login/home/register and other non-offline student pages. */
async function purgeNonOfflineEntries() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(async (cacheName) => {
      if (!cacheName.startsWith(CACHE_PREFIX)) return;
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      await Promise.all(
        requests.map(async (req) => {
          const pathname = new URL(req.url).pathname;

          if (isBlockedStudentDocumentPath(pathname)) {
            await cache.delete(req);
            return;
          }

          if (
            isStudentDataRequest(new URL(req.url)) &&
            !isAllowedOfflineDataPath(pathname)
          ) {
            await cache.delete(req);
            return;
          }

          if (
            pathname.startsWith("/_next/static/") &&
            STUDENT_OFFLINE_FULL_SW_ENABLED &&
            !OFFLINE_CHUNK_SET.has(pathname)
          ) {
            await cache.delete(req);
          }
        }),
      );
    }),
  );
}

/** @param {string[]} urls */
async function precacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    urls.map(async (url) => {
      const request = new Request(url, { credentials: "same-origin", cache: "reload" });
      const existing = await cache.match(request, { ignoreSearch: true });
      if (existing) return;
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response);
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        INSTALL_PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );

      await Promise.allSettled(
        OFFLINE_GAME_URLS.map((url) =>
          cache.add(new Request(url, { credentials: "same-origin", cache: "reload" })),
        ),
      );

      if (STUDENT_OFFLINE_FULL_SW_ENABLED) {
        const fullUrls = [
          ...FULL_CHUNK_URLS,
          ...FULL_DATA_URLS,
          ...FULL_ASSET_URLS,
        ];
        await Promise.allSettled(
          fullUrls.map(async (url) => {
            const request = new Request(url, {
              credentials: "same-origin",
              cache: "reload",
            });
            try {
              const response = await fetch(request);
              if (response.ok) {
                await cache.put(request, response);
              }
            } catch (_err) {
              // Warm-up from hub retries while online.
            }
          }),
        );
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => purgeNonOfflineEntries())
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (!STUDENT_OFFLINE_FULL_SW_ENABLED) return;

  if (event.data?.type === "PRE_CACHE_STUDENT_OFFLINE") {
    const buildId = event.data.buildId || GENERATED.buildId;
    const extraDataUrls = buildId
      ? OFFLINE_GAME_URLS.map((navUrl) => {
          const suffix = navUrl === "/" ? "/index" : navUrl;
          return `/_next/data/${buildId}${suffix}.json`;
        })
      : [];

    const urls = [
      ...OFFLINE_GAME_URLS,
      ...FULL_CHUNK_URLS,
      ...FULL_DATA_URLS,
      ...extraDataUrls,
      ...FULL_ASSET_URLS,
    ];

    event.waitUntil(
      precacheUrls([...new Set(urls)]).then(() => {
        if (event.source) {
          event.source.postMessage({ type: "PRE_CACHE_STUDENT_OFFLINE_DONE" });
        }
      }),
    );
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.endsWith(".webmanifest") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/manifest-student.webmanifest"
  ) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    if (!isOfflineStaticChunk(url.pathname)) return;
    event.respondWith(
      cacheFirstAllowlisted(event.request, false).catch(() => fetch(event.request)),
    );
    return;
  }

  if (isStudentDataRequest(url)) {
    if (!isAllowedOfflineDataPath(url.pathname)) {
      event.respondWith(
        fetch(event.request).catch(
          () =>
            new Response("{}", {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }),
        ),
      );
      return;
    }

    const allowCache =
      OFFLINE_DATA_SET.has(url.pathname) ||
      url.pathname.includes("/student/offline");
    event.respondWith(
      cacheFirstAllowlisted(event.request, allowCache).catch(() =>
        fetch(event.request),
      ),
    );
    return;
  }

  if (STUDENT_OFFLINE_FULL_SW_ENABLED && isOfflinePrecachedAsset(url.pathname)) {
    event.respondWith(
      cacheFirstAllowlisted(event.request, true).catch(() => fetch(event.request)),
    );
    return;
  }

  if (isStudentNavigation(event.request, url)) {
    event.respondWith(handleStudentNavigation(event.request));
  }
});
