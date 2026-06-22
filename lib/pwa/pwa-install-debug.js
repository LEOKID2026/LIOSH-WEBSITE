/** @param {string} tag @param {Record<string, unknown>} [data] */
export function logPwaInstallEvent(tag, data = {}) {
  if (typeof window === "undefined") return;

  const manifestLink = document.querySelector('link[rel="manifest"]');
  const entry = {
    tag,
    timestamp: new Date().toISOString(),
    pathname: window.location.pathname,
    manifestHref: manifestLink?.getAttribute("href") ?? null,
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    ...data,
  };

  console.info("[PWA install]", entry);
}

/** One-shot diagnostics for parent install debugging. */
export async function logPwaInstallDiagnostics(app = "parent") {
  if (typeof window === "undefined") return;

  const manifestLink = document.querySelector('link[rel="manifest"]');
  let swController = null;
  let swRegistrations = [];

  if ("serviceWorker" in navigator) {
    swController = navigator.serviceWorker.controller?.scriptURL ?? null;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      swRegistrations = regs.map((r) => ({ scope: r.scope, script: r.active?.scriptURL ?? r.installing?.scriptURL ?? null }));
    } catch (error) {
      swRegistrations = [{ error: String(error) }];
    }
  }

  let relatedApps = null;
  if (typeof navigator.getInstalledRelatedApps === "function") {
    try {
      relatedApps = await navigator.getInstalledRelatedApps();
    } catch (error) {
      relatedApps = [{ error: String(error) }];
    }
  }

  logPwaInstallEvent(`${app}:diagnostics`, {
    manifestHref: manifestLink?.getAttribute("href") ?? null,
    swController,
    swRegistrations,
    relatedApps,
    sessionStorageKeys: Object.keys(sessionStorage).filter((k) => /pwa|install/i.test(k)),
    localStorageKeys: Object.keys(localStorage).filter((k) => /pwa|install/i.test(k)),
  });
}
