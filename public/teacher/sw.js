// Minimal service worker for T LEO K teacher PWA (scope /teacher/ only).

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.endsWith(".webmanifest") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/manifest-teacher.webmanifest"
  ) {
    return;
  }
});
