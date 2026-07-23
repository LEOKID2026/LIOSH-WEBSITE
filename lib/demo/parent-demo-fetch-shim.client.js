import { isParentDemoMode, PARENT_DEMO_SYNTHETIC_BEARER } from "./parent-demo-mode.client.js";

const SHIM_FLAG = "__leokidsParentDemoFetchShim";

/**
 * Mount global fetch shim: /api/parent/* → /api/demo/parent/*
 * Blocks mutating methods except copilot-turn.
 */
export function installParentDemoFetchShim() {
  if (typeof window === "undefined") return () => {};
  if (window[SHIM_FLAG]) return window[SHIM_FLAG];

  const nativeFetch = window.fetch.bind(window);

  /** @type {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} */
  const shimmedFetch = async (input, init) => {
    if (!isParentDemoMode()) {
      return nativeFetch(input, init);
    }

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

    if (url.includes("/api/parent/") && !url.includes("/api/demo/parent/")) {
      const demoUrl = url.replace("/api/parent/", "/api/demo/parent/");
      const isCopilot = demoUrl.includes("/api/demo/parent/copilot-turn");
      if (method !== "GET" && method !== "HEAD" && !isCopilot) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: false,
              demo: true,
              error: "מצב הדגמה - צפייה בלבד.",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${PARENT_DEMO_SYNTHETIC_BEARER}`);
      }
      return nativeFetch(demoUrl, { ...init, headers });
    }

    return nativeFetch(input, init);
  };

  window.fetch = shimmedFetch;
  const uninstall = () => {
    window.fetch = nativeFetch;
    delete window[SHIM_FLAG];
  };
  window[SHIM_FLAG] = uninstall;
  return uninstall;
}

export function uninstallParentDemoFetchShim() {
  if (typeof window === "undefined") return;
  if (typeof window[SHIM_FLAG] === "function") {
    window[SHIM_FLAG]();
  }
}
