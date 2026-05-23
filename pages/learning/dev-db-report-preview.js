import { useMemo, useState } from "react";
import Layout from "../../components/Layout";
import {
  buildReportInputFromDbData,
  REPORT_DB_SUBJECTS,
} from "../../lib/learning-supabase/report-data-adapter";

const ENABLE_DB_REPORT_PREVIEW =
  process.env.NEXT_PUBLIC_ENABLE_DB_REPORT_PREVIEW === "true";

function getSafeErrorMessage(status) {
  if (status === 401) return "Authentication failed. Check parent bearer token.";
  if (status === 403 || status === 404) return "Student not found or not owned by this parent.";
  if (status === 400) return "Invalid request. Check studentId/date parameters.";
  return "Failed to load DB report preview.";
}

function formatPct(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0%";
  return `${num.toFixed(2)}%`;
}

export default function DevDbReportPreviewPage() {
  const [token, setToken] = useState("");
  const [studentId, setStudentId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [requestMeta, setRequestMeta] = useState(null);

  const subjects = useMemo(() => {
    if (!preview?.subjects) {
      return REPORT_DB_SUBJECTS.map(subject => ({
        subject,
        total: 0,
        correct: 0,
        wrong: 0,
        accuracy: 0,
        durationSeconds: 0,
        topicCount: 0,
        mistakeCount: 0,
      }));
    }
    return REPORT_DB_SUBJECTS.map(subject => {
      const item = preview.subjects[subject] || {};
      return {
        subject,
        total: Number(item.total) || 0,
        correct: Number(item.correct) || 0,
        wrong: Number(item.wrong) || 0,
        accuracy: Number(item.accuracy) || 0,
        durationSeconds: Number(item.durationSeconds) || 0,
        topicCount: Object.keys(item.topics || {}).length,
        mistakeCount: Array.isArray(item.mistakes) ? item.mistakes.length : 0,
      };
    });
  }, [preview]);

  async function loadPreview(event) {
    event.preventDefault();
    setError("");
    setPreview(null);
    setRequestMeta(null);

    if (!studentId.trim()) {
      setError("studentId is required.");
      return;
    }
    if (!token.trim()) {
      setError("Parent bearer token is required.");
      return;
    }

    const qs = new URLSearchParams();
    if (fromDate) qs.set("from", fromDate);
    if (toDate) qs.set("to", toDate);
    const query = qs.toString();
    const url = `/api/parent/students/${encodeURIComponent(studentId.trim())}/report-data${
      query ? `?${query}` : ""
    }`;

    setLoading(true);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
        },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) {
        setError(getSafeErrorMessage(response.status));
        return;
      }

      const adapted = buildReportInputFromDbData(body, {
        period: "custom",
        timezone: "UTC",
        includeDebug: true,
      });
      setPreview(adapted);
      setRequestMeta({
        status: response.status,
        loadedAt: new Date().toISOString(),
      });
    } catch {
      setError("Network error while loading DB report preview.");
    } finally {
      setLoading(false);
    }
  }

  if (!ENABLE_DB_REPORT_PREVIEW) {
    return (
      <Layout title="DB Report Preview (Dev)">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-3">DB Report Preview (Dev Only)</h1>
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Preview is disabled. Set <code>NEXT_PUBLIC_ENABLE_DB_REPORT_PREVIEW=true</code> to
            enable this page in development.
          </p>
        </main>
      </Layout>
    );
  }

  return (
    <Layout title="DB Report Preview (Dev)">
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
          <h1 className="text-2xl font-bold">DB Report Preview (Dev Only)</h1>
          <p className="text-sm mt-2 text-gray-700 dark:text-gray-200">
            Uses parent report-data API and DB adapter only. Token is kept in memory and never
            stored.
          </p>
        </section>

        <form onSubmit={loadPreview} className="border rounded-xl p-4 space-y-3 bg-white/80 dark:bg-slate-900/70">
          <div>
            <label className="block text-sm font-semibold mb-1">Parent Bearer Token</label>
            <textarea
              data-testid="preview-token-input"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full border rounded-lg p-2 min-h-[80px] text-xs"
              placeholder="Paste Bearer token (dev only)"
            />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Student ID</label>
              <input
                data-testid="preview-student-id-input"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="student uuid"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">From (optional)</label>
              <input
                data-testid="preview-from-date-input"
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">To (optional)</label>
              <input
                data-testid="preview-to-date-input"
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>
          <button
            data-testid="preview-load-button"
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load DB Report Preview"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        {preview ? (
          <>
            <section className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold mb-2">Student / Range</h2>
              <div className="text-sm space-y-1">
                <div>Student: {preview.student?.name || "N/A"}</div>
                <div>
                  Student ID: <span data-testid="preview-student-id">{preview.student?.id || "N/A"}</span>
                </div>
                <div>Range: {preview.range?.from || "N/A"} → {preview.range?.to || "N/A"}</div>
                <div>Loaded: {requestMeta?.loadedAt || "N/A"}</div>
              </div>
            </section>

            <section className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold mb-2">Totals</h2>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div>Sessions: {preview.totals?.sessions ?? 0}</div>
                <div>Completed Sessions: {preview.totals?.completedSessions ?? 0}</div>
                <div>
                  Answers: <span data-testid="preview-totals-answers">{preview.totals?.answers ?? 0}</span>
                </div>
                <div>Correct: {preview.totals?.correct ?? 0}</div>
                <div>Wrong: {preview.totals?.wrong ?? 0}</div>
                <div>Accuracy: {formatPct(preview.totals?.accuracy)}</div>
                <div>Duration (s): {preview.totals?.durationSeconds ?? 0}</div>
              </div>
            </section>

            <section className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold mb-2">Subjects</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {subjects.map(item => (
                  <div
                    key={item.subject}
                    data-testid={`subject-card-${item.subject}`}
                    className="border rounded-lg p-3 text-sm"
                  >
                    <div className="font-semibold mb-1">{item.subject}</div>
                    <div>Total: {item.total}</div>
                    <div>Correct: {item.correct}</div>
                    <div>Wrong: {item.wrong}</div>
                    <div>Accuracy: {formatPct(item.accuracy)}</div>
                    <div>Duration (s): {item.durationSeconds}</div>
                    <div>Topics: {item.topicCount}</div>
                    <div>Mistakes: {item.mistakeCount}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold mb-2">Recent Mistakes</h2>
              {!preview.recentMistakes?.length ? (
                <p className="text-sm">No recent mistakes in selected range.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {preview.recentMistakes.map((m, idx) => (
                    <li key={`${m.subject}-${m.questionId || idx}`} className="border rounded p-2">
                      <div>{m.subject} / {m.topic || "general"}</div>
                      <div>Q: {m.questionId || "N/A"}</div>
                      <div>Expected: {m.expectedAnswer || "N/A"} | User: {m.userAnswer || "N/A"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold mb-2">Gaps</h2>
              <div className="text-sm space-y-1">
                <div>stars/xp/badges: {preview.gaps?.starsXpBadges}</div>
                <div>streak: {preview.gaps?.streak}</div>
                <div>challenge state: {preview.gaps?.challengeState}</div>
                <div>learning intel: {preview.gaps?.learningIntel}</div>
              </div>
            </section>

            <details className="border rounded-xl p-4 bg-white/80 dark:bg-slate-900/70">
              <summary className="cursor-pointer font-semibold">Debug JSON (sanitized adapter output)</summary>
              <pre className="mt-3 text-xs overflow-auto max-h-[380px]">
                {JSON.stringify(
                  {
                    source: preview.source,
                    version: preview.version,
                    student: preview.student,
                    range: preview.range,
                    totals: preview.totals,
                    subjects: preview.subjects,
                    recentMistakes: preview.recentMistakes,
                    gaps: preview.gaps,
                    debug: preview.debug || null,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </>
        ) : null}
      </main>
    </Layout>
  );
}

export async function getServerSideProps() {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true };
  }
  return { props: {} };
}
