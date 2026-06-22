/** @param {string} tag @param {Record<string, unknown>} [data] */
export function logPwaInstallEvent(tag, data = {}) {
  if (typeof window === "undefined") return;

  const manifestLink = document.querySelector('link[rel="manifest"]');
  const entry = {
    tag,
    timestamp: new Date().toISOString(),
    pathname: window.location.pathname,
    manifestHref: manifestLink?.getAttribute("href") ?? null,
    ...data,
  };

  console.info("[PWA install]", entry);
}
