import React from "react";
import {
  OFFLINE_HUB_ROUTE,
  OFFLINE_SOLO_HUB_ROUTE,
  OFFLINE_EDUCATIONAL_HUB_ROUTE,
} from "../../lib/offline/offline-game-catalog.js";

export default class OfflineGameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { caught: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError() {
    return { caught: true };
  }

  handleRetry() {
    this.setState({ caught: false });
  }

  render() {
    if (!this.state.caught) return this.props.children;

    const { gameType } = this.props;
    const backHref =
      gameType === "educational" ? OFFLINE_EDUCATIONAL_HUB_ROUTE : OFFLINE_SOLO_HUB_ROUTE;

    const btnBase = {
      border: "none",
      borderRadius: 12,
      padding: "12px 20px",
      fontWeight: 700,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      fontSize: 15,
    };

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#050816",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          textAlign: "center",
        }}
        dir="rtl"
      >
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>אופס! משהו השתבש</div>
        <div style={{ fontSize: 15, color: "#94a3b8", maxWidth: 280 }}>
          לא הצלחנו לטעון את המשחק. אפשר לנסות שוב.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260 }}>
          <button
            onClick={this.handleRetry}
            style={{ ...btnBase, background: "#2563eb", color: "#fff", justifyContent: "center" }}
          >
            נסה שוב
          </button>
          <a
            href={backHref}
            style={{ ...btnBase, background: "#1e293b", color: "#94a3b8", justifyContent: "center" }}
          >
            חזרה לרשימת המשחקים
          </a>
          <a
            href={OFFLINE_HUB_ROUTE}
            style={{ ...btnBase, background: "#0f172a", color: "#475569", justifyContent: "center" }}
          >
            אזור משחקים ללא אינטרנט
          </a>
        </div>
      </div>
    );
  }
}
