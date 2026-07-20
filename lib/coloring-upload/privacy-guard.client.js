/**
 * Privacy guard — blocks network during user-image processing window.
 */

let processingActive = false;
/** @type {typeof fetch | null} */
let originalFetch = null;

const BLOCKED_METHODS = ["POST", "PUT", "PATCH"];
const ALLOWED_UPLOAD_POST_PATHS = [
  "/api/coloring-upload/line-art",
  "/api/coloring-upload/style-transfer",
];

/**
 * @param {() => void | Promise<void>} fn
 */
export async function withPrivacyGuard(fn) {
  if (typeof window === "undefined") return fn();
  enablePrivacyGuard();
  try {
    return await fn();
  } finally {
    disablePrivacyGuard();
  }
}

function enablePrivacyGuard() {
  if (processingActive || typeof window === "undefined") return;
  processingActive = true;
  if (!originalFetch) originalFetch = window.fetch.bind(window);
  window.fetch = privacyFetch;
}

function disablePrivacyGuard() {
  if (!processingActive) return;
  processingActive = false;
  if (originalFetch) window.fetch = originalFetch;
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 */
function privacyFetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isAllowedColoringUploadPost =
    method === "POST" &&
    ALLOWED_UPLOAD_POST_PATHS.some((path) => {
      try {
        const parsed = new URL(url, window.location.origin);
        return parsed.pathname === path;
      } catch {
        return url.includes(path);
      }
    });

  if (BLOCKED_METHODS.includes(method) && !isAllowedColoringUploadPost) {
    throw new Error(`[coloring-upload privacy] Blocked ${method} during local processing`);
  }

  if (
    !isAllowedColoringUploadPost &&
    (init?.body instanceof FormData || init?.body instanceof Blob || init?.body instanceof ArrayBuffer)
  ) {
    throw new Error("[coloring-upload privacy] Blocked body upload during local processing");
  }

  const allowedStatic =
    url.includes("/wasm/opencv/") ||
    url.includes("/_next/static/") ||
    url.endsWith(".js") ||
    url.endsWith(".wasm");

  if (!allowedStatic && !isAllowedColoringUploadPost && method !== "GET" && method !== "HEAD") {
    throw new Error(`[coloring-upload privacy] Blocked request during processing: ${url}`);
  }

  return originalFetch(input, init);
}

export function isPrivacyProcessingActive() {
  return processingActive;
}
