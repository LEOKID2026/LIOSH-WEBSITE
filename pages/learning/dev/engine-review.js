import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";

const TOKEN_SESSION_KEY = "engine_review_admin_token_v1";
const COPY_EXPERT = "npm run qa:learning-simulator:expert-review-pack";
const COPY_CLOSURE = `npm run qa:learning-simulator:engine-final
npm run qa:learning-simulator:release
npm run build`;

/** Same output on server and client (avoids hydration mismatch from locale-specific toLocaleString). */
function formatAdminDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

/** Keeps first occurrence per scenario id — guards duplicate API rows and stabilizes React keys. */
function dedupeScenariosById(scenarios) {
  if (!Array.isArray(scenarios)) return { unique: [], duplicateCount: 0 };
  const seen = new Set();
  const unique = [];
  let duplicateCount = 0;
  for (const s of scenarios) {
    const id = s?.scenarioId ?? s?.id ?? "";
    if (!id) continue;
    if (seen.has(id)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(id);
    unique.push(s);
  }
  return { unique, duplicateCount };
}

export async function getServerSideProps() {
  if (process.env.NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN !== "true") {
    return { notFound: true };
  }

  const { emptyEngineReviewPageProps } = await import(
    "../../../lib/admin-server/admin-page-auth.server.js"
  );

  // No report JSON in page props — data loads via token-authenticated API after client admin gate.
  return { props: emptyEngineReviewPageProps() };
}

const card = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "20px 22px",
  color: "#e2e8f0",
  boxSizing: "border-box",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "clamp(1.05rem, 2.4vw, 1.2rem)",
  fontWeight: 700,
  color: "#f8fafc",
  letterSpacing: "0.02em",
};

const muted = { color: "#94a3b8", fontSize: "clamp(0.95rem, 2vw, 1rem)" };
const labelStrong = { color: "#f1f5f9", fontWeight: 600 };

const packDownloadBtn = {
  padding: "10px 16px",
  fontSize: "0.95rem",
  fontWeight: 600,
  borderRadius: 8,
  border: "1px solid #64748b",
  background: "#1e293b",
  color: "#f1f5f9",
  cursor: "pointer",
};

const packDownloadBtnSmall = {
  padding: "6px 12px",
  fontSize: "0.88rem",
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid #64748b",
  background: "#1e293b",
  color: "#f1f5f9",
  cursor: "pointer",
};

export default function EngineExpertReviewAdminPage({ packMeta: initialPack, engineFinal: initialFinal, profVal: initialProf, hasPack: initialHasPack, ssrDeployment }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [packMeta, setPackMeta] = useState(initialPack);
  const [engineFinal, setEngineFinal] = useState(initialFinal);
  const [profVal, setProfVal] = useState(initialProf);
  const [hasPack, setHasPack] = useState(initialHasPack);
  const [deployment, setDeployment] = useState(null);
  /** Last inline snapshot from POST /generate-expert-review-pack (not persisted under reports/) */
  const [inlinePack, setInlinePack] = useState(null);

  const { unique: uniqueSnapshotScenarios, duplicateCount: snapshotDuplicateCount } = useMemo(
    () => dedupeScenariosById(inlinePack?.scenarios),
    [inlinePack?.scenarios]
  );

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(TOKEN_SESSION_KEY);
      if (s) setToken(s);
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      if (token) sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    } catch {
      /* ignore */
    }
  }, [token]);

  const applyStatusPayload = useCallback((data) => {
    if (data?.deployment) setDeployment(data.deployment);
    setPackMeta(data?.packMeta ?? null);
    setEngineFinal(data?.engineFinal ?? null);
    setProfVal(data?.profVal ?? null);
    setHasPack(Boolean(data?.packMeta?.generatedAt));
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setRefreshBusy(true);
    try {
      const res = await fetch("/api/learning-simulator/engine-review-pack-status", {
        headers: {
          "x-engine-review-token": token,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      applyStatusPayload(data);
    } catch {
      /* keep existing client state */
    } finally {
      setRefreshBusy(false);
    }
  }, [applyStatusPayload, token]);

  useEffect(() => {
    if (!token) return;
    fetchStatus();
  }, [token, fetchStatus]);

  const downloadTextFile = (filename, content, mime = "text/plain;charset=utf-8") => {
    if (typeof window === "undefined") return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    setBusy(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/learning-simulator/generate-expert-review-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-engine-review-token": token,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (data.deployment) setDeployment(data.deployment);

      if (res.ok && data.ok === false && data.code === "generation_not_supported_in_serverless") {
        setGenResult({
          level: "warning",
          code: data.code,
          text:
            data.message ||
            "Remote generation is not supported on this deployment. Use CLI/CI to create a durable Expert Review Pack.",
          cliFallback: data.cliFallback || "npm run qa:learning-simulator:expert-review-pack",
        });
        return;
      }

      if (!res.ok) {
        const code = data.code || "error";
        const baseMsg = data.message || data.error || `HTTP ${res.status}`;
        const text =
          code === "generation_not_supported_in_this_runtime"
            ? `Server generation is not supported in this runtime. Run the CLI command below.\n\n${baseMsg}`
            : baseMsg;
        setGenResult({
          level: "error",
          code,
          text,
          cliFallback: data.cliFallback || null,
        });
        return;
      }

      setGenResult({
        level: "success",
        code: data.code || "ok",
        text: data.persistenceMessage || "Snapshot built from artifacts; returned inline only (not saved under reports/).",
        scenarioCount: data.scenarioCount,
        generatedAt: data.generatedAt,
        requiresHumanExpertReview: data.requiresHumanExpertReview,
        cliFallback: data.cliFallback || null,
        generationMode: data.generationMode || null,
        delivery: data.delivery || null,
      });
      if (data.manifestJson && data.scenarios?.length) {
        setInlinePack({
          generatedAt: data.generatedAt,
          manifest: data.manifest,
          summary: data.summary,
          indexMarkdown: data.indexMarkdown,
          summaryMarkdown: data.summaryMarkdown,
          manifestJson: data.manifestJson,
          summaryJson: data.summaryJson,
          scenarios: data.scenarios,
        });
      } else {
        setInlinePack(null);
      }
      await fetchStatus();
    } catch (e) {
      setGenResult({ level: "error", code: "generation_failed", text: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (t) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(t);
    }
  };

  const repoRelativeIndex = "reports/learning-simulator/engine-professionalization/expert-review-pack/index.md";

  let depLabel = "unknown";
  if (deployment?.kind) depLabel = deployment.kind;
  else if (ssrDeployment?.vercel) depLabel = "serverless (Vercel env at SSR)";
  else if (ssrDeployment?.nodeEnv) depLabel = ssrDeployment.nodeEnv;

  const ephemeral =
    deployment?.filesystemEphemeral != null ? deployment.filesystemEphemeral : Boolean(ssrDeployment?.vercel);

  const listStyle = {
    margin: 0,
    paddingLeft: 22,
    fontSize: "clamp(0.95rem, 2vw, 1.05rem)",
    lineHeight: 1.65,
    color: "#e2e8f0",
  };

  return (
    <Layout>
      <Head>
        <title>Engine Expert Review Pack (internal)</title>
      </Head>
      <main
        style={{
          maxWidth: 1040,
          width: "100%",
          margin: "0 auto",
          padding: "16px clamp(14px, 3vw, 28px) 48px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          lineHeight: 1.55,
          color: "#e2e8f0",
          boxSizing: "border-box",
        }}
      >
        <p style={{ ...muted, marginBottom: 10 }}>
          <Link href="/learning/dev-student-simulator" style={{ color: "#93c5fd" }}>
            ← Dev tools
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(1.35rem, 3.2vw, 1.85rem)", fontWeight: 800, margin: "0 0 12px", color: "#f8fafc" }}>
          Professional engine - Expert Review Pack
        </h1>
        <p style={{ ...muted, marginBottom: 20, maxWidth: "62ch" }}>
          Internal educational diagnostic support only. Not parent-facing. Not a clinical assessment. This page is shown when{" "}
          <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#cbd5e1", fontSize: "0.9em" }}>
            NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true
          </code>{" "}
          (any environment, including production).
        </p>

        {/* Sticky admin actions: token + refresh + generate */}
        <div
          style={{
            position: "sticky",
            top: "clamp(56px, 10vw, 72px)",
            zIndex: 40,
            marginBottom: 28,
            padding: "18px 20px",
            borderRadius: 12,
            border: "2px solid #3b82f6",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: "clamp(0.8rem, 1.8vw, 0.9rem)", fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Admin actions
          </p>
          <label htmlFor="engine-review-admin-token" style={{ display: "block", ...labelStrong, fontSize: "clamp(1rem, 2.2vw, 1.1rem)", marginBottom: 8 }}>
            Admin token
          </label>
          <input
            id="engine-review-admin-token"
            type="password"
            autoComplete="off"
            placeholder="Enter ENGINE_REVIEW_ADMIN_TOKEN value"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={busy}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              marginBottom: 16,
              padding: "14px 16px",
              fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
              boxSizing: "border-box",
              background: "#1e293b",
              border: "2px solid #475569",
              borderRadius: 8,
              color: "#f1f5f9",
            }}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              onClick={fetchStatus}
              disabled={refreshBusy}
              style={{
                padding: "14px 22px",
                fontSize: "clamp(1rem, 2.2vw, 1.1rem)",
                fontWeight: 600,
                cursor: refreshBusy ? "wait" : "pointer",
                borderRadius: 10,
                border: "2px solid #64748b",
                background: "transparent",
                color: "#f1f5f9",
                flex: "1 1 160px",
                minWidth: "min(100%, 200px)",
              }}
            >
              {refreshBusy ? "Refreshing…" : "Refresh Status"}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              style={{
                padding: "16px 26px",
                fontSize: "clamp(1.05rem, 2.5vw, 1.2rem)",
                fontWeight: 800,
                cursor: busy ? "wait" : "pointer",
                borderRadius: 10,
                border: "none",
                background: busy ? "#1d4ed8" : "#2563eb",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.45)",
                flex: "2 1 280px",
                minWidth: "min(100%, 260px)",
                minHeight: 52,
              }}
            >
              {busy ? "Generating…" : "Generate Expert Review Pack"}
            </button>
          </div>
          <p style={{ ...muted, margin: "14px 0 0", fontSize: "clamp(0.88rem, 2vw, 0.95rem)" }}>
            Generate builds a snapshot from existing validation JSON in memory and returns it to the browser - nothing is written under <code style={{ color: "#cbd5e1" }}>reports/</code>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section style={card} aria-labelledby="sec-engine">
            <h2 id="sec-engine" style={sectionTitle}>
              Engine status
            </h2>
            <p style={{ ...muted, marginTop: 0 }}>
              <strong style={labelStrong}>Engine final:</strong>{" "}
              <span style={{ color: "#f8fafc" }}>{engineFinal?.engineFinalStatus ?? "not generated yet"}</span>
              {engineFinal?.generatedAt ? ` (${formatAdminDate(engineFinal.generatedAt)})` : ""}
            </p>
            {engineFinal?.knownLimitations?.length ? (
              <div style={{ marginTop: 14 }}>
                <strong style={{ ...labelStrong, fontSize: "1rem" }}>Known limitations</strong>
                <ul style={{ ...listStyle, marginTop: 8 }}>
                  {engineFinal.knownLimitations.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section style={card} aria-labelledby="sec-validation">
            <h2 id="sec-validation" style={sectionTitle}>
              Validation status
            </h2>
            <p style={{ margin: 0, fontSize: "clamp(0.95rem, 2vw, 1.05rem)", color: "#e2e8f0" }}>
              <strong style={labelStrong}>Professional validation:</strong>{" "}
              <span style={{ color: "#f8fafc" }}>{profVal?.status ?? "not generated yet"}</span>{" "}
              {profVal?.scenarioCount != null ? `(${profVal.scenarioCount} scenarios)` : ""}
            </p>
          </section>

          <section style={card} aria-labelledby="sec-pack">
            <h2 id="sec-pack" style={sectionTitle}>
              Expert review pack status
            </h2>
            <ul style={listStyle}>
              <li>
                <strong style={labelStrong}>requiresHumanExpertReview:</strong>{" "}
                {packMeta?.requiresHumanExpertReview !== false ? "true" : "false"} (automation ≠ educator sign-off)
              </li>
              <li>
                <strong style={labelStrong}>Expert pack:</strong>{" "}
                {hasPack && packMeta?.generatedAt
                  ? `${packMeta.scenarioCount ?? "?"} scenarios - ${formatAdminDate(packMeta.generatedAt)}`
                  : "not generated yet"}
              </li>
              {packMeta?.generationMode ? (
                <li>
                  <strong style={labelStrong}>Pack generation mode:</strong> {String(packMeta.generationMode)} (full engine JSON: use CLI)
                </li>
              ) : null}
            </ul>
          </section>

          <section style={card} aria-labelledby="sec-admin-result">
            <h2 id="sec-admin-result" style={sectionTitle}>
              Last generation result
            </h2>
            <p style={{ ...muted, marginTop: 0, marginBottom: genResult ? 12 : 0 }}>
              Uses <code style={{ color: "#cbd5e1" }}>x-engine-review-token</code> with the Admin token above. Token is kept in{" "}
              <strong style={{ color: "#e2e8f0" }}>sessionStorage</strong> for this tab only.
            </p>
            {genResult ? (
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 10,
                  fontSize: "clamp(0.95rem, 2vw, 1.05rem)",
                  background:
                    genResult.level === "error" ? "#450a0a" : genResult.level === "warning" ? "#422006" : "#052e16",
                  border: `2px solid ${
                    genResult.level === "error" ? "#f87171" : genResult.level === "warning" ? "#fbbf24" : "#4ade80"
                  }`,
                  color: "#f8fafc",
                }}
              >
                <div>
                  <strong style={{ color: "#fff" }}>Result:</strong> {genResult.code}{" "}
                  {genResult.level === "success"
                    ? genResult.delivery === "inline_json"
                      ? "- snapshot ready (inline, no disk)"
                      : "- generated successfully"
                    : genResult.level === "warning"
                      ? genResult.code === "generation_not_supported_in_serverless"
                        ? "- remote generation not supported (use CLI/CI)"
                        : "- generated; persistence may be ephemeral on this host"
                      : genResult.level === "error"
                        ? "- failed"
                        : ""}
                </div>
                {genResult.text ? <p style={{ margin: "10px 0 0" }}>{genResult.text}</p> : null}
                {genResult.scenarioCount != null ? (
                  <p style={{ margin: "10px 0 0" }}>
                    <strong>scenarioCount:</strong> {genResult.scenarioCount}
                  </p>
                ) : null}
                {genResult.generatedAt ? (
                  <p style={{ margin: "6px 0 0" }}>
                    <strong>generatedAt:</strong> {genResult.generatedAt}
                  </p>
                ) : null}
                {genResult.requiresHumanExpertReview != null ? (
                  <p style={{ margin: "6px 0 0" }}>
                    <strong>requiresHumanExpertReview:</strong> {String(genResult.requiresHumanExpertReview)}
                  </p>
                ) : null}
                {genResult.generationMode ? (
                  <p style={{ margin: "6px 0 0" }}>
                    <strong>generationMode:</strong> {genResult.generationMode}
                  </p>
                ) : null}
                {genResult.cliFallback ? (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.25)" }}>
                    <strong style={{ color: "#e2e8f0" }}>CLI fallback</strong>
                    <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: "0.95em" }}>
                      {genResult.cliFallback}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p style={{ ...muted, margin: 0 }}>No generation run in this session yet.</p>
            )}
          </section>

          {inlinePack ? (
            <section style={card} aria-labelledby="sec-inline-snapshot">
              <h2 id="sec-inline-snapshot" style={sectionTitle}>
                Snapshot (this session)
              </h2>
              <p style={{ ...muted, marginTop: 0 }}>
                Generated <strong style={{ color: "#e2e8f0" }}>{formatAdminDate(inlinePack.generatedAt)}</strong> - download JSON/Markdown bundles. Same content as an on-disk pack layout, without saving files on the server.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() => downloadTextFile("manifest.json", inlinePack.manifestJson, "application/json;charset=utf-8")}
                  style={packDownloadBtn}
                >
                  manifest.json
                </button>
                <button
                  type="button"
                  onClick={() => downloadTextFile("summary.json", inlinePack.summaryJson, "application/json;charset=utf-8")}
                  style={packDownloadBtn}
                >
                  summary.json
                </button>
                <button type="button" onClick={() => downloadTextFile("summary.md", inlinePack.summaryMarkdown, "text/markdown;charset=utf-8")} style={packDownloadBtn}>
                  summary.md
                </button>
                <button type="button" onClick={() => downloadTextFile("index.md", inlinePack.indexMarkdown, "text/markdown;charset=utf-8")} style={packDownloadBtn}>
                  index.md
                </button>
              </div>
              <p style={{ margin: "0 0 12px", color: "#cbd5e1", fontSize: "clamp(0.9rem, 2vw, 1rem)" }}>
                Showing <strong style={{ color: "#f8fafc" }}>{uniqueSnapshotScenarios.length}</strong> unique scenarios
                {uniqueSnapshotScenarios.length !== 22 ? (
                  <span style={{ color: "#fbbf24" }}> (expected 22 when validation pack is complete)</span>
                ) : null}
              </p>
              {isDev && snapshotDuplicateCount > 0 ? (
                <p
                  style={{
                    margin: "0 0 14px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #fbbf24",
                    background: "#422006",
                    color: "#fef3c7",
                    fontSize: "0.9rem",
                  }}
                >
                  <strong>Dev:</strong> stripped {snapshotDuplicateCount} duplicate scenario entr
                  {snapshotDuplicateCount === 1 ? "y" : "ies"} from the API response before rendering.
                </p>
              ) : null}
              <style jsx>{`
                .engine-review-snapshot-desktop {
                  display: none;
                }
                .engine-review-snapshot-mobile {
                  display: block;
                }
                @media (min-width: 768px) {
                  .engine-review-snapshot-desktop {
                    display: block;
                  }
                  .engine-review-snapshot-mobile {
                    display: none;
                  }
                }
              `}</style>
              {/* Desktop: full table (no horizontal scroll trap on narrow viewports). */}
              <div className="engine-review-snapshot-desktop">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(0.9rem, 2vw, 1rem)", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "42%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "45%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #334155", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px", color: "#f8fafc" }}>Scenario</th>
                      <th style={{ padding: "10px 8px", color: "#f8fafc" }}>Status</th>
                      <th style={{ padding: "10px 8px", color: "#f8fafc" }}>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueSnapshotScenarios.map((s) => (
                      <tr key={s.scenarioId} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td
                          style={{
                            padding: "10px 8px",
                            fontFamily: "ui-monospace, monospace",
                            color: "#e2e8f0",
                            wordBreak: "break-word",
                          }}
                        >
                          {s.scenarioId}
                        </td>
                        <td style={{ padding: "10px 8px", color: s.pass ? "#86efac" : "#fca5a5", whiteSpace: "nowrap" }}>
                          {s.pass ? "PASS" : "FAIL"}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <button
                            type="button"
                            onClick={() =>
                              downloadTextFile(`scenarios/${s.scenarioId}.json`, s.json, "application/json;charset=utf-8")
                            }
                            style={packDownloadBtnSmall}
                          >
                            JSON
                          </button>{" "}
                          <button
                            type="button"
                            onClick={() =>
                              downloadTextFile(`scenarios/${s.scenarioId}.md`, s.markdown, "text/markdown;charset=utf-8")
                            }
                            style={packDownloadBtnSmall}
                          >
                            MD
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile: stacked cards - avoids overflow-x compositor glitches that looked like duplicate rows while scrolling. */}
              <div className="engine-review-snapshot-mobile">
                {uniqueSnapshotScenarios.map((s) => (
                  <div
                    key={s.scenarioId}
                    style={{
                      marginBottom: 12,
                      padding: "14px 14px",
                      borderRadius: 10,
                      border: "1px solid #334155",
                      background: "#1e293b",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "clamp(0.82rem, 3.5vw, 0.95rem)",
                        color: "#f1f5f9",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      {s.scenarioId}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: s.pass ? "#86efac" : "#fca5a5",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {s.pass ? "PASS" : "FAIL"}
                      </span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() =>
                            downloadTextFile(`scenarios/${s.scenarioId}.json`, s.json, "application/json;charset=utf-8")
                          }
                          style={packDownloadBtnSmall}
                        >
                          JSON
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadTextFile(`scenarios/${s.scenarioId}.md`, s.markdown, "text/markdown;charset=utf-8")
                          }
                          style={packDownloadBtnSmall}
                        >
                          MD
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section style={card} aria-labelledby="sec-cli">
            <h2 id="sec-cli" style={sectionTitle}>
              CLI commands
            </h2>
            <label style={{ display: "block", ...labelStrong, marginBottom: 6 }}>Expert review pack</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "stretch" }}>
              <textarea
                readOnly
                rows={2}
                style={{
                  flex: "1 1 220px",
                  minWidth: 0,
                  fontSize: "clamp(0.85rem, 1.8vw, 0.95rem)",
                  fontFamily: "ui-monospace, monospace",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #475569",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
                value={COPY_EXPERT}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(COPY_EXPERT)}
                style={{
                  padding: "12px 18px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  alignSelf: "flex-start",
                  borderRadius: 8,
                  border: "1px solid #64748b",
                  background: "#1e293b",
                  color: "#f1f5f9",
                  cursor: "pointer",
                }}
              >
                Copy
              </button>
            </div>
            <label style={{ display: "block", ...labelStrong, marginBottom: 6 }}>Full closure (release + build)</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "stretch" }}>
              <textarea
                readOnly
                rows={4}
                style={{
                  flex: "1 1 220px",
                  minWidth: 0,
                  fontSize: "clamp(0.85rem, 1.8vw, 0.95rem)",
                  fontFamily: "ui-monospace, monospace",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #475569",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
                value={COPY_CLOSURE}
              />
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    "npm run qa:learning-simulator:engine-final && npm run qa:learning-simulator:release && npm run build"
                  )
                }
                style={{
                  padding: "12px 18px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  alignSelf: "flex-start",
                  borderRadius: 8,
                  border: "1px solid #64748b",
                  background: "#1e293b",
                  color: "#f1f5f9",
                  cursor: "pointer",
                }}
              >
                Copy (one line)
              </button>
            </div>
            <p style={{ ...muted, margin: 0 }}>
              Requires prior <code style={{ color: "#cbd5e1" }}>npm run qa:learning-simulator:professional-engine</code> (PASS) before generating the pack.
            </p>
          </section>

          <section style={card} aria-labelledby="sec-env">
            <h2 id="sec-env" style={sectionTitle}>
              Environment setup
            </h2>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid #0ea5e9",
                background: "#082f49",
                marginBottom: 18,
                fontSize: "clamp(0.95rem, 2vw, 1.05rem)",
                lineHeight: 1.65,
                color: "#e0f2fe",
              }}
            >
              <strong style={{ color: "#7dd3fc" }}>Remote / Vercel</strong>
              <ul style={{ margin: "10px 0 0", paddingLeft: 22 }}>
                <li>
                  <code style={{ fontSize: "0.9em" }}>NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true</code> - enables this page and APIs (build-time public).
                </li>
                <li>
                  <code style={{ fontSize: "0.9em" }}>ENGINE_REVIEW_ADMIN_TOKEN=&lt;secret&gt;</code> - server only; never embedded in the client bundle. Enter the same value in Admin token (stored in{" "}
                  <strong>sessionStorage</strong> only).
                </li>
              </ul>
            </div>
            <h3 style={{ ...sectionTitle, fontSize: "1.05rem", marginBottom: 10 }}>Runtime / filesystem</h3>
            <ul style={listStyle}>
              <li>
                <strong style={labelStrong}>Deployment (best-effort):</strong> {depLabel}
              </li>
              <li>
                <strong style={labelStrong}>Filesystem ephemeral risk:</strong>{" "}
                {ephemeral ? "yes - serverless-style host; writes may not persist" : "lower - typical long-running or local Node"}
              </li>
              <li>
                <strong style={labelStrong}>Last known artifact path:</strong>{" "}
                <code style={{ fontSize: "0.92em", color: "#bae6fd" }}>{repoRelativeIndex}</code>
              </li>
            </ul>
            <p style={{ ...muted, marginTop: 16, marginBottom: 0 }}>
              Artifacts are written under the repo / deploy workspace (not public URLs). On remote serverless, they may not survive the next cold start - use CLI from a machine with a persistent checkout when you need a stable copy.
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
