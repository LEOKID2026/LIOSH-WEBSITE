/**
 * Dev-server preflight for HTTP verification scripts.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function assertDevServerReady(
  hooks,
  baseUrl = "http://127.0.0.1:3001",
  { retries = 8, delayMs = 1500 } = {}
) {
  const { pass, fail } = hooks;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(baseUrl, { redirect: "manual" }).catch(() => null);
      if (res && res.status > 0 && res.status < 500) {
        pass(`dev server reachable (${res.status})`);
        return true;
      }
    } catch {
      /* retry */
    }
    if (attempt < retries) await sleep(delayMs);
  }
  fail("dev server reachable", `GET ${baseUrl} not ready after ${retries} attempts`);
  return false;
}
