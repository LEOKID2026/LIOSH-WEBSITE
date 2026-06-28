import React from "react";
import {
  OFFLINE_HUB_ROUTE,
  OFFLINE_SOLO_HUB_ROUTE,
  OFFLINE_EDUCATIONAL_HUB_ROUTE,
} from "../../lib/offline/offline-game-catalog.js";

const STORAGE_KEY = "offline_game_err_log";
const CACHE_NAME = "student-offline-v4-full";

export function getOfflineGameErrors() {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistError(record) {
  if (typeof localStorage === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 5)));
  } catch {}
}

function Row({ label, value, ok }) {
  const color = ok === true ? "#4ade80" : ok === false ? "#f87171" : "#facc15";
  return (
    <div style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#94a3b8", minWidth: 140, fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{ color, fontSize: 12, wordBreak: "break-all" }}>{String(value)}</span>
    </div>
  );
}

export default class OfflineGameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { caught: null, cacheHit: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { caught: error };
  }

  componentDidCatch(error, info) {
    const { gameKey, gameType, route } = this.props;
    const online = typeof navigator !== "undefined" ? navigator.onLine : null;

    const record = {
      ts: Date.now(),
      gameType: gameType || "unknown",
      gameKey: gameKey || "unknown",
      route: route || "",
      online,
      msg: error?.message || String(error),
      stack: (error?.stack || "").slice(0, 800),
      componentStack: (info?.componentStack || "").slice(0, 400),
    };

    persistError(record);

    if (typeof caches !== "undefined" && route) {
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.match(route))
        .then((m) => this.setState({ cacheHit: Boolean(m) }))
        .catch(() => this.setState({ cacheHit: false }));
    }
  }

  handleRetry() {
    this.setState({ caught: null, cacheHit: null });
  }

  render() {
    const { caught, cacheHit } = this.state;
    if (!caught) return this.props.children;

    const { gameKey, gameType, route } = this.props;
    const online = typeof navigator !== "undefined" ? navigator.onLine : null;
    const backHref =
      gameType === "educational" ? OFFLINE_EDUCATIONAL_HUB_ROUTE : OFFLINE_SOLO_HUB_ROUTE;

    const btnBase = {
      border: "none",
      borderRadius: 8,
      padding: "10px 18px",
      fontWeight: 700,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      fontSize: 14,
    };

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#050816",
          color: "#fff",
          fontFamily: "monospace",
          padding: "1.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <div style={{ color: "#f87171", fontSize: 17, fontWeight: 700 }}>
          Game Error
        </div>

        <section>
          <Row label="gameType" value={gameType || "?"} />
          <Row label="gameKey" value={gameKey || "?"} />
          {route && <Row label="route" value={route} />}
          <Row
            label="online"
            value={online === null ? "unknown" : String(online)}
            ok={online === true ? true : online === false ? false : undefined}
          />
          {cacheHit !== null && (
            <Row label="route in cache" value={String(cacheHit)} ok={cacheHit} />
          )}
        </section>

        <section
          style={{
            background: "#1e1b4b",
            borderRadius: 8,
            padding: "0.75rem",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>error.message</div>
          <div style={{ fontSize: 12, color: "#fca5a5", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
            {caught.message || String(caught)}
          </div>
        </section>

        {caught.stack ? (
          <details>
            <summary
              style={{ fontSize: 12, color: "#64748b", cursor: "pointer", userSelect: "none" }}
            >
              stack trace
            </summary>
            <pre
              style={{
                fontSize: 11,
                color: "#475569",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                marginTop: 4,
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {caught.stack.slice(0, 900)}
            </pre>
          </details>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={this.handleRetry}
            style={{ ...btnBase, background: "#2563eb", color: "#fff" }}
          >
            נסה שוב
          </button>
          <a href={backHref} style={{ ...btnBase, background: "#1e293b", color: "#94a3b8" }}>
            חזרה לרשימה
          </a>
          <a
            href={OFFLINE_HUB_ROUTE}
            style={{ ...btnBase, background: "#0f172a", color: "#64748b" }}
          >
            אופליין
          </a>
        </div>

        <div style={{ fontSize: 11, color: "#1e293b", marginTop: "auto" }}>
          שגיאה זו נשמרה ל-/student/pwa-debug
        </div>
      </div>
    );
  }
}
