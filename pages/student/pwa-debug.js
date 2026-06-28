import { useEffect, useState } from "react";

const CHECKS = [
  "/student/sw.js",
  "/student/offline.html",
  "/student/offline-precache-generated.js",
];

function Row({ label, value, ok }) {
  const color =
    ok === true ? "#4ade80" : ok === false ? "#f87171" : "#facc15";
  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#94a3b8", minWidth: 220, fontSize: 13 }}>{label}</span>
      <span style={{ color, fontSize: 13, wordBreak: "break-all" }}>{String(value)}</span>
    </div>
  );
}

export default function PwaDebug() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function gather() {
      const isCapacitorNative =
        window.Capacitor?.isNativePlatform?.() ?? false;

      const displayMode = window.matchMedia("(display-mode: standalone)").matches
        ? "standalone"
        : window.matchMedia("(display-mode: fullscreen)").matches
        ? "fullscreen"
        : "browser";

      const userAgent = navigator.userAgent;
      const href = location.href;

      // SW controller
      const controller = navigator.serviceWorker?.controller?.scriptURL ?? null;

      // Registrations
      let regs = [];
      try {
        const raw = await navigator.serviceWorker.getRegistrations();
        regs = raw.map((r) => ({
          scope: r.scope,
          active: r.active?.scriptURL ?? null,
          waiting: r.waiting?.scriptURL ?? null,
          installing: r.installing?.scriptURL ?? null,
        }));
      } catch (e) {
        regs = [{ error: String(e) }];
      }

      // Cache names
      let cacheNames = [];
      try {
        cacheNames = await caches.keys();
      } catch (e) {
        cacheNames = ["error: " + e];
      }

      // Cache entries for student-offline-v4-full
      let studentCacheEntries = [];
      try {
        const c = await caches.open("student-offline-v4-full");
        const keys = await c.keys();
        studentCacheEntries = keys.map((r) => new URL(r.url).pathname);
      } catch (_) {}

      const hasOfflineHtml = studentCacheEntries.includes("/student/offline.html");

      // Fetch checks
      const fetchResults = {};
      for (const url of CHECKS) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          fetchResults[url] = r.status;
        } catch (e) {
          fetchResults[url] = "FAILED: " + e.message;
        }
      }

      setData({
        isCapacitorNative,
        displayMode,
        href,
        controller,
        regs,
        cacheNames,
        hasOfflineHtml,
        studentCacheEntries: studentCacheEntries.slice(0, 10),
        fetchResults,
        userAgent,
      });
    }

    gather();
  }, []);

  function buildReport(d) {
    if (!d) return "";
    return [
      "=== PWA DEBUG REPORT ===",
      `href: ${d.href}`,
      `displayMode: ${d.displayMode}`,
      `isCapacitorNative: ${d.isCapacitorNative}`,
      `controller: ${d.controller}`,
      `registrations: ${JSON.stringify(d.regs, null, 2)}`,
      `cacheNames: ${JSON.stringify(d.cacheNames)}`,
      `hasOfflineHtml: ${d.hasOfflineHtml}`,
      `studentCacheEntries (first 10): ${JSON.stringify(d.studentCacheEntries)}`,
      `fetchResults: ${JSON.stringify(d.fetchResults, null, 2)}`,
      `userAgent: ${d.userAgent}`,
    ].join("\n");
  }

  function handleCopy() {
    const text = buildReport(data);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      style={{
        background: "#050816",
        minHeight: "100dvh",
        color: "#fff",
        fontFamily: "monospace",
        padding: "1.5rem 1rem",
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#c9f4ff" }}>
        PWA Debug
      </h1>
      <p style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>
        /student/pwa-debug — diagnostic only
      </p>

      {!data ? (
        <p style={{ color: "#94a3b8" }}>טוען...</p>
      ) : (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              General
            </h2>
            <Row label="href" value={data.href} />
            <Row label="display-mode" value={data.displayMode} ok={data.displayMode === "standalone"} />
            <Row
              label="isCapacitorNative"
              value={String(data.isCapacitorNative)}
              ok={!data.isCapacitorNative}
            />
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Service Worker
            </h2>
            <Row
              label="controller"
              value={data.controller ?? "null (no controller)"}
              ok={data.controller !== null}
            />
            {data.regs.length === 0 ? (
              <Row label="registrations" value="none" ok={false} />
            ) : (
              data.regs.map((r, i) => (
                <div key={i}>
                  <Row label={`reg[${i}].scope`} value={r.scope ?? "?"} ok={r.scope?.includes("/student/")} />
                  <Row label={`reg[${i}].active`} value={r.active ?? "null"} ok={r.active !== null} />
                  <Row label={`reg[${i}].waiting`} value={r.waiting ?? "null"} />
                  <Row label={`reg[${i}].installing`} value={r.installing ?? "null"} />
                </div>
              ))
            )}
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Cache
            </h2>
            <Row
              label="cache names"
              value={data.cacheNames.length ? data.cacheNames.join(", ") : "empty"}
              ok={data.cacheNames.some((n) => n.startsWith("student-"))}
            />
            <Row
              label="student-offline-v4-full"
              value={data.cacheNames.includes("student-offline-v4-full") ? "exists" : "MISSING"}
              ok={data.cacheNames.includes("student-offline-v4-full")}
            />
            <Row
              label="/student/offline.html in cache"
              value={String(data.hasOfflineHtml)}
              ok={data.hasOfflineHtml}
            />
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Fetch checks (network)
            </h2>
            {Object.entries(data.fetchResults).map(([url, status]) => (
              <Row
                key={url}
                label={url}
                value={String(status)}
                ok={status === 200}
              />
            ))}
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              User Agent
            </h2>
            <div style={{ fontSize: 11, color: "#94a3b8", wordBreak: "break-all", lineHeight: 1.6 }}>
              {data.userAgent}
            </div>
          </section>

          <button
            onClick={handleCopy}
            style={{
              background: "linear-gradient(135deg,#2dd4bf,#0ea5e9)",
              color: "#050816",
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              borderRadius: 12,
              padding: "14px 0",
              width: "100%",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ הועתק!" : "העתק דוח"}
          </button>
        </>
      )}
    </div>
  );
}
