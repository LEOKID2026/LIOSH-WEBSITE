import { useEffect, useState } from "react";
import { getOfflineGameErrors } from "../../components/offline/OfflineGameErrorBoundary.jsx";

const SW_FILES = [
  "/student/sw.js",
  "/student/offline.html",
  "/student/offline-precache-generated.js",
];

const CACHE_NAME = "student-offline-v4-full";

const SOLO_ROUTES = [
  "/student/offline/solo/catcher",
  "/student/offline/solo/puzzle",
  "/student/offline/solo/memory",
  "/student/offline/solo/flyer",
  "/student/offline/solo/leo-jump",
  "/student/offline/solo/balloons",
  "/student/offline/solo/maze",
  "/student/offline/solo/picture-puzzle",
  "/student/offline/solo/target-tap",
  "/student/offline/solo/sort-shapes",
  "/student/offline/solo/smart-blocks",
  "/student/offline/solo/fruit-slice",
];

const EDUCATIONAL_ROUTES = [
  "/student/offline/educational/recycling-factory",
  "/student/offline/educational/leo-supermarket",
  "/student/offline/educational/leo-lab",
  "/student/offline/educational/leo-gifts",
  "/student/offline/educational/leo-bakery",
  "/student/offline/educational/leo-number-path",
];

const BASE_NAV_ROUTES = [
  "/student/offline",
  "/student/offline/solo",
  "/student/offline/educational",
  "/student/offline/tic-tac-toe",
  "/student/offline/rock-paper-scissors",
  "/student/offline/tap-battle",
  "/student/offline/memory-match",
];

function Row({ label, value, ok }) {
  const color =
    ok === true ? "#4ade80" : ok === false ? "#f87171" : "#facc15";
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <span style={{ color: "#94a3b8", minWidth: 200, fontSize: 12, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color, fontSize: 12, wordBreak: "break-all" }}>{String(value)}</span>
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <h2
      style={{
        fontSize: 12,
        color: "#64748b",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 0,
      }}
    >
      {title}
    </h2>
  );
}

export default function PwaDebug() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [gameErrors, setGameErrors] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGameErrors(getOfflineGameErrors());

    async function gather() {
      const isCapacitorNative = window.Capacitor?.isNativePlatform?.() ?? false;

      const displayMode = window.matchMedia("(display-mode: standalone)").matches
        ? "standalone"
        : window.matchMedia("(display-mode: fullscreen)").matches
        ? "fullscreen"
        : "browser";

      const userAgent = navigator.userAgent;
      const href = location.href;
      const controller = navigator.serviceWorker?.controller?.scriptURL ?? null;

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

      let cacheNames = [];
      try {
        cacheNames = await caches.keys();
      } catch (e) {
        cacheNames = ["error: " + e];
      }

      // Open the student offline cache and inspect entries
      let allEntries = [];
      let hasOfflineHtml = false;
      try {
        const c = await caches.open(CACHE_NAME);
        const keys = await c.keys();
        allEntries = keys.map((r) => new URL(r.url).pathname);
        hasOfflineHtml = allEntries.includes("/student/offline.html");
      } catch {}

      const staticEntries = allEntries.filter((p) => p.startsWith("/_next/static/"));
      const soloChunkEntries = staticEntries.filter((p) => p.includes("offline/solo"));
      const eduChunkEntries = staticEntries.filter((p) => p.includes("offline/educational"));
      const pageChunkEntries = staticEntries.filter((p) => p.includes("/chunks/pages/"));
      const allChunkEntries = staticEntries.filter((p) => p.includes("/_next/static/chunks/") && !p.includes("/chunks/pages/"));
      const cssEntries = staticEntries.filter((p) => p.includes("/_next/static/css/"));

      // Per-route cache check
      const checkRoute = async (route) => {
        try {
          const c = await caches.open(CACHE_NAME);
          const m = await c.match(route);
          return Boolean(m);
        } catch {
          return false;
        }
      };

      const soloCache = {};
      for (const r of SOLO_ROUTES) {
        soloCache[r] = await checkRoute(r);
      }

      const eduCache = {};
      for (const r of EDUCATIONAL_ROUTES) {
        eduCache[r] = await checkRoute(r);
      }

      const baseCache = {};
      for (const r of BASE_NAV_ROUTES) {
        baseCache[r] = await checkRoute(r);
      }

      // SW file fetch checks (network only — skip if offline)
      const fetchResults = {};
      for (const url of SW_FILES) {
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
        totalEntries: allEntries.length,
        staticEntries: staticEntries.length,
        soloChunkEntries: soloChunkEntries.length,
        eduChunkEntries: eduChunkEntries.length,
        pageChunkEntries: pageChunkEntries.length,
        pageChunkList: pageChunkEntries.sort(),
        allChunkList: allChunkEntries.sort(),
        cssList: cssEntries.sort(),
        soloCache,
        eduCache,
        baseCache,
        fetchResults,
        userAgent,
      });
    }

    gather();
  }, []);

  function buildReport(d) {
    if (!d) return "";
    const soloRows = Object.entries(d.soloCache || {})
      .map(([r, v]) => `  ${v ? "✓" : "✗"} ${r}`)
      .join("\n");
    const eduRows = Object.entries(d.eduCache || {})
      .map(([r, v]) => `  ${v ? "✓" : "✗"} ${r}`)
      .join("\n");
    const baseRows = Object.entries(d.baseCache || {})
      .map(([r, v]) => `  ${v ? "✓" : "✗"} ${r}`)
      .join("\n");
    const errRows = gameErrors
      .map((e) => {
        const header = e.source
          ? `[${new Date(e.ts).toISOString()}] [${e.source}] ${e.route || ""} online=${e.online}${e.filename ? ` file=${e.filename}` : ""}`
          : `[${new Date(e.ts).toISOString()}] ${e.gameType}/${e.gameKey} online=${e.online} cacheHit=${e.cacheHit}`;
        return `  ${header}\n  msg: ${e.msg}\n  stack: ${e.stack?.slice(0, 300) || ""}`;
      })
      .join("\n\n");

    return [
      "=== PWA DEBUG REPORT ===",
      `href: ${d.href}`,
      `displayMode: ${d.displayMode}`,
      `isCapacitorNative: ${d.isCapacitorNative}`,
      `controller: ${d.controller}`,
      `registrations: ${JSON.stringify(d.regs, null, 2)}`,
      `cacheNames: ${JSON.stringify(d.cacheNames)}`,
      `hasOfflineHtml: ${d.hasOfflineHtml}`,
      `cache total entries: ${d.totalEntries}`,
      `cache /_next/static/ entries: ${d.staticEntries}`,
      `cache /chunks/pages/ entries: ${d.pageChunkEntries}`,
      `cache solo-related chunks: ${d.soloChunkEntries}`,
      `cache edu-related chunks: ${d.eduChunkEntries}`,
      `shared chunk files (${(d.allChunkList || []).length}):\n${(d.allChunkList || []).map((p) => "  " + p).join("\n")}`,
      `page chunk files (${(d.pageChunkList || []).length}):\n${(d.pageChunkList || []).map((p) => "  " + p).join("\n")}`,
      `css files (${(d.cssList || []).length}):\n${(d.cssList || []).map((p) => "  " + p).join("\n")}`,
      `base nav routes:\n${baseRows}`,
      `solo game routes:\n${soloRows}`,
      `educational game routes:\n${eduRows}`,
      `fetchResults: ${JSON.stringify(d.fetchResults, null, 2)}`,
      `userAgent: ${d.userAgent}`,
      `\n=== GAME ERROR LOG (last ${gameErrors.length}) ===\n${errRows || "(none)"}`,
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
        maxWidth: 660,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2, color: "#c9f4ff" }}>
        PWA Debug
      </h1>
      <p style={{ fontSize: 11, color: "#475569", marginBottom: 20 }}>
        /student/pwa-debug
      </p>

      {!data ? (
        <p style={{ color: "#94a3b8" }}>טוען...</p>
      ) : (
        <>
          {/* General */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="General" />
            <Row label="href" value={data.href} />
            <Row
              label="display-mode"
              value={data.displayMode}
              ok={data.displayMode === "standalone"}
            />
            <Row
              label="isCapacitorNative"
              value={String(data.isCapacitorNative)}
              ok={!data.isCapacitorNative}
            />
          </section>

          {/* Service Worker */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="Service Worker" />
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
                  <Row
                    label={`reg[${i}].scope`}
                    value={r.scope ?? "?"}
                    ok={r.scope?.includes("/student/")}
                  />
                  <Row
                    label={`reg[${i}].active`}
                    value={r.active ?? "null"}
                    ok={r.active !== null}
                  />
                  <Row label={`reg[${i}].waiting`} value={r.waiting ?? "null"} />
                  <Row label={`reg[${i}].installing`} value={r.installing ?? "null"} />
                </div>
              ))
            )}
          </section>

          {/* Cache Summary */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="Cache Summary" />
            <Row
              label="cache names"
              value={data.cacheNames.length ? data.cacheNames.join(", ") : "empty"}
              ok={data.cacheNames.some((n) => n.startsWith("student-"))}
            />
            <Row
              label="student-offline-v4-full"
              value={data.cacheNames.includes(CACHE_NAME) ? "exists" : "MISSING"}
              ok={data.cacheNames.includes(CACHE_NAME)}
            />
            <Row
              label="/student/offline.html in cache"
              value={String(data.hasOfflineHtml)}
              ok={data.hasOfflineHtml}
            />
            <Row label="total cache entries" value={data.totalEntries} />
            <Row label="/_next/static/ entries" value={data.staticEntries} />
            <Row label="/chunks/pages/ entries" value={data.pageChunkEntries} />
            <Row label="offline/solo chunk entries" value={data.soloChunkEntries} />
            <Row label="offline/educational chunk entries" value={data.eduChunkEntries} />
          </section>

          {/* Base Nav Routes */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="Base Nav Routes (in cache)" />
            {BASE_NAV_ROUTES.map((r) => (
              <Row
                key={r}
                label={r.replace("/student/offline", "")}
                value={data.baseCache[r] ? "✓ cached" : "✗ MISSING"}
                ok={data.baseCache[r]}
              />
            ))}
          </section>

          {/* Solo Game Routes */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="Solo Game Routes (in cache)" />
            {SOLO_ROUTES.map((r) => (
              <Row
                key={r}
                label={r.replace("/student/offline/solo/", "")}
                value={data.soloCache[r] ? "✓ cached" : "✗ MISSING"}
                ok={data.soloCache[r]}
              />
            ))}
          </section>

          {/* Educational Game Routes */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="Educational Game Routes (in cache)" />
            {EDUCATIONAL_ROUTES.map((r) => (
              <Row
                key={r}
                label={r.replace("/student/offline/educational/", "")}
                value={data.eduCache[r] ? "✓ cached" : "✗ MISSING"}
                ok={data.eduCache[r]}
              />
            ))}
          </section>

          {/* Shared Chunks */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title={`Shared Chunks in Cache (${data.allChunkList?.length ?? 0})`} />
            {!data.allChunkList?.length ? (
              <div style={{ fontSize: 12, color: "#f87171" }}>NONE — shared chunks missing!</div>
            ) : (
              data.allChunkList.map((p) => (
                <div
                  key={p}
                  style={{ fontSize: 10, color: "#64748b", padding: "2px 0", wordBreak: "break-all" }}
                >
                  {p.replace("/_next/static/chunks/", "")}
                </div>
              ))
            )}
          </section>

          {/* Page Chunks */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title={`Page Chunk Files in Cache (${data.pageChunkList?.length ?? 0})`} />
            {!data.pageChunkList?.length ? (
              <div style={{ fontSize: 12, color: "#f87171" }}>NONE — page chunks missing!</div>
            ) : (
              data.pageChunkList.map((p) => (
                <div
                  key={p}
                  style={{ fontSize: 10, color: "#475569", padding: "2px 0", wordBreak: "break-all" }}
                >
                  {p.replace("/_next/static/chunks/pages/", "")}
                </div>
              ))
            )}
          </section>

          {/* CSS */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title={`CSS Files in Cache (${data.cssList?.length ?? 0})`} />
            {(data.cssList || []).map((p) => (
              <div
                key={p}
                style={{ fontSize: 10, color: "#475569", padding: "2px 0", wordBreak: "break-all" }}
              >
                {p.replace("/_next/static/css/", "")}
              </div>
            ))}
          </section>

          {/* SW File Fetch */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title="SW File Fetch (network)" />
            {Object.entries(data.fetchResults).map(([url, status]) => (
              <Row key={url} label={url} value={String(status)} ok={status === 200} />
            ))}
          </section>

          {/* Game Error Log */}
          <section style={{ marginBottom: 20 }}>
            <SectionHead title={`Game Error Log (last ${gameErrors.length})`} />
            {gameErrors.length === 0 ? (
              <div style={{ fontSize: 12, color: "#4ade80" }}>אין שגיאות שמורות</div>
            ) : (
              gameErrors.map((e, i) => (
                <div
                  key={i}
                  style={{
                    background: "#1a0a0a",
                    borderRadius: 6,
                    padding: "8px",
                    marginBottom: 8,
                    fontSize: 11,
                  }}
                >
                  <div style={{ color: "#f87171", fontWeight: 700 }}>
                    [{new Date(e.ts).toLocaleTimeString()}]{" "}
                    {e.source ? `[${e.source}] ` : ""}
                    {e.gameType && e.gameKey ? `${e.gameType}/${e.gameKey}` : (e.route || "")}
                  </div>
                  <div style={{ color: "#94a3b8" }}>
                    online={String(e.online)}
                    {e.cacheHit != null ? ` | cacheHit=${String(e.cacheHit)}` : ""}
                    {e.filename ? ` | file=${e.filename.split("/").pop()}` : ""}
                  </div>
                  <div style={{ color: "#fca5a5", wordBreak: "break-all", marginTop: 3 }}>
                    {e.msg}
                  </div>
                  {e.stack && (
                    <details style={{ marginTop: 3 }}>
                      <summary style={{ color: "#475569", cursor: "pointer" }}>stack</summary>
                      <pre
                        style={{
                          color: "#334155",
                          fontSize: 10,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {e.stack.slice(0, 600)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </section>

          {/* User Agent */}
          <section style={{ marginBottom: 24 }}>
            <SectionHead title="User Agent" />
            <div style={{ fontSize: 10, color: "#94a3b8", wordBreak: "break-all", lineHeight: 1.6 }}>
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
