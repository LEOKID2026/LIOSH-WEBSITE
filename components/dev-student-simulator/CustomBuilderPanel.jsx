import { useMemo, useState } from "react";
import {
  SUBJECT_BUCKETS,
  CUSTOM_BUILDER_UI_SUBJECT_ORDER,
  hebrewSubjectLabel,
  hebrewTopicPrimary,
  CUSTOM_APPLY_MODE,
  DEFAULT_TOPIC_ROW,
  resolveCustomSpecTopicSettings,
} from "../../utils/dev-student-simulator/index.js";

const LABEL = {
  student: "\u05E9\u05DD \u05EA\u05DC\u05DE\u05D9\u05D3",
  grade: "\u05DB\u05D9\u05EA\u05D4",
  period: "\u05EA\u05E7\u05D5\u05E4\u05EA \u05DC\u05D9\u05DE\u05D5\u05D3",
  spanDays: "\u05D9\u05DE\u05D9\u05DD \u05D1\u05EA\u05E7\u05D5\u05E4\u05D4 \u05DB\u05D5\u05DC\u05DC\u05D9\u05EA",
  activeDays: "\u05D9\u05DE\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD",
  sessions: "\u05DE\u05E1\u05E4\u05E8 \u05E4\u05D2\u05D9\u05E9\u05D5\u05EA \u2014 \u05DE\u05D7\u05D5\u05E9\u05D1",
  questions: "\u05E1\u05D4\u05DB \u05E9\u05D0\u05DC\u05D5\u05EA \u2014 \u05DE\u05D7\u05D5\u05E9\u05D1",
  anchor: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05E2\u05D5\u05D2\u05DF (\u05E1\u05D5\u05E3 \u05D9\u05D5\u05DD)",
  useNow: "\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05E2\u05D4 \u05E0\u05D5\u05DB\u05D7\u05D9\u05EA \u05DB\u05E2\u05D5\u05D2\u05DF",
  subjects: "\u05DE\u05E7\u05E6\u05D5\u05E2\u05D5\u05EA",
  weight: "\u05DE\u05E9\u05E7\u05DC (legacy)",
  acc: "\u05D3\u05D9\u05D5\u05E7 \u05D9\u05E2\u05D3 (% \u05E0\u05DB\u05D5\u05DF)",
  sessionAvgMin: "משך סשן ממוצע (דקות)",
  level: "\u05E8\u05DE\u05D4",
  mode: "\u05DE\u05E6\u05D1",
  trend: "\u05DE\u05D2\u05DE\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA",
  mistakes: "\u05E9\u05D2\u05D9\u05D0\u05D5\u05EA \u05D5\u05E7\u05E6\u05D1",
  mistakeRate: "\u05E9\u05D9\u05E2\u05D5\u05E8 \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA (% \u05DE\u05D4\u05E9\u05D0\u05DC\u05D5\u05EA)",
  repeatStr: "\u05D7\u05D6\u05E7\u05EA \u05D7\u05D6\u05E8\u05D5\u05EA \u05D7\u05D5\u05D6\u05E8\u05EA (% \u05DE\u05D4\u05E0\u05D5\u05E9\u05D0)",
  pace: "\u05D3\u05E4\u05D5\u05E1 \u05D6\u05DE\u05DF \u05EA\u05D2\u05D5\u05D1\u05D4",
  debug: "\u05DE\u05E6\u05D1 \u05D1\u05D3\u05D9\u05E7\u05D4 \u05E7\u05E6\u05E8\u05D4",
  showInternalKeys: "\u05D4\u05E6\u05D2 \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05E4\u05E0\u05D9\u05DE\u05D9\u05D9\u05DD",
  applyMode: "מצב יישום (Apply)",
  applyReplaceSelected: "עדכון הנושאים שנבחרו בלבד",
  applyAppend: "הוספה לנתונים קיימים",
  applyFull: "החלפת כל הסימולציה",
  fullReplaceWarn: "אזהרה: מצב זה מוחק ומייצר מחדש את כל נתוני הסימולטור. לא מומלץ.",
  active: "פעיל",
  nQuestions: "שאלות",
  perTopicTopicTrend: "מגמה (נושא)",
  computedTotals: "מחושב אוטומטית",
  topicsDisabledHint: "לחצו לפתיחת הטבלה. עדכון (Apply) רק מסומני פעיל עם שאלות > 0 - לא מחייב בחירה בכל מקצוע.",
  applySourceHint: "רק שורות נושא: פעיל + שאלות קובעות מה ייכלל ב Apply.",
};

const FALLBACK_SUBJECT_ROW = {
  enabled: false,
  weight: 1,
  targetAccuracyPct: 76,
  avgSessionDurationSec: 900,
  level: "medium",
  mode: "learning",
  topics: [],
};

const TREND_OPTS = [
  { v: "stable", l: "\u05D9\u05E6\u05D9\u05D1" },
  { v: "improving", l: "\u05DE\u05E9\u05EA\u05E4\u05E8" },
  { v: "declining", l: "\u05D1\u05D9\u05E8\u05D9\u05D3\u05D4" },
  { v: "jump_decline", l: "\u05E7\u05E4\u05D9\u05E6\u05EA \u05E7\u05D5\u05E9\u05D9 \u05D5\u05D0\u05D7\u05E8 \u05D9\u05E8\u05D9\u05D3\u05D4" },
  { v: "fast_inattentive", l: "\u05DE\u05D4\u05D9\u05E8 \u05D5\u05D7\u05E1\u05E8 \u05EA\u05E9\u05D5\u05DE\u05EA \u05DC\u05D1" },
  { v: "slow_accurate", l: "\u05D0\u05D9\u05D8\u05D9 \u05D0\u05D1\u05DC \u05DE\u05D3\u05D5\u05D9\u05E7" },
];

const PACE_OPTS = [
  { v: "fast_wrong", l: "\u05DE\u05D4\u05D9\u05E8 \u05D5\u05E9\u05D2\u05D5\u05D9" },
  { v: "slow_accurate", l: "\u05D0\u05D9\u05D8\u05D9 \u05D5\u05DE\u05D3\u05D5\u05D9\u05E7" },
  { v: "slow_wrong", l: "\u05D0\u05D9\u05D8\u05D9 \u05D5\u05E9\u05D2\u05D5\u05D9" },
  { v: "balanced", l: "\u05DE\u05D0\u05D5\u05D6\u05DF" },
];

const LEVEL_OPTS = [
  { v: "easy", l: "\u05E7\u05DC" },
  { v: "medium", l: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9" },
  { v: "hard", l: "\u05E7\u05E9\u05D4" },
];

const MODE_OPTS = [
  { v: "learning", l: "\u05DC\u05DE\u05D9\u05D3\u05D4" },
  { v: "practice", l: "\u05EA\u05E8\u05D2\u05D5\u05DC" },
  { v: "challenge", l: "\u05D0\u05EA\u05D2\u05E8" },
  { v: "speed", l: "\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA" },
];

const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

const fieldStyle = { display: "block", marginBottom: 10, fontSize: 14 };
const inputStyle = { width: "100%", maxWidth: 360, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 };
const tableInput = { width: 52, padding: 4, fontSize: 11, borderRadius: 4, border: "1px solid #e2e8f0" };
const tableSelect = { maxWidth: 100, padding: 4, fontSize: 11, borderRadius: 4, border: "1px solid #e2e8f0" };

function durationMinFromSec(sec) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return 15;
  return Math.max(1, Math.min(120, Math.round(s / 60)));
}
function durationSecFromMin(min) {
  const m = Math.max(1, Math.min(120, Math.round(Number(min) || 15)));
  return m * 60;
}

function topicRowValue(value, sid, topic) {
  return { ...DEFAULT_TOPIC_ROW, enabled: false, targetQuestions: 0, ...value?.topicSettings?.[sid]?.[topic] };
}

/** @returns {string[]} topic keys that are active and have questions > 0 (same rule as listAffectedTopicUnits) */
function activeTopicKeysFromSettings(ts, sid) {
  const m = ts?.[sid];
  if (!m || typeof m !== "object") return [];
  return (SUBJECT_BUCKETS[sid] || []).filter((k) => {
    const r = m[k];
    if (!r || !r.enabled) return false;
    return Math.max(0, Math.floor(Number(r.targetQuestions) || 0)) > 0;
  });
}

/**
 * Clones the whole topicSettings object and ensures `sid` is a new object
 * with every canonical bucket key present (preserves existing rows).
 * Prevents React updates from dropping sibling topic rows when a subject map was {} or missing keys.
 */
function ensureSubjectTopicMapShape(baseSpec, topicSettingsRoot, sid) {
  const prev =
    topicSettingsRoot?.[sid] && typeof topicSettingsRoot[sid] === "object" ? { ...topicSettingsRoot[sid] } : {};
  for (const tk of SUBJECT_BUCKETS[sid] || []) {
    if (prev[tk] == null || typeof prev[tk] !== "object") {
      prev[tk] = { ...topicRowValue(baseSpec, sid, tk) };
    }
  }
  return prev;
}

export default function CustomBuilderPanel({ value, setValue, disabled }) {
  const [showInternalTopicKeys, setShowInternalTopicKeys] = useState(false);

  const computed = useMemo(() => {
    try {
      const c = JSON.parse(JSON.stringify(value || {}));
      resolveCustomSpecTopicSettings(c);
      return { totalQuestions: c.totalQuestions, sessionsCount: c.sessionsCount };
    } catch {
      return { totalQuestions: 0, sessionsCount: 0 };
    }
  }, [value]);

  const setField = (k, v) => setValue((s) => ({ ...s, [k]: v }));

  const setSubject = (sid, patch) =>
    setValue((s) => {
      const prevSubjects = s.subjects && typeof s.subjects === "object" ? s.subjects : {};
      const prevRow = prevSubjects[sid] && typeof prevSubjects[sid] === "object" ? prevSubjects[sid] : {};
      return {
        ...s,
        subjects: { ...prevSubjects, [sid]: { ...FALLBACK_SUBJECT_ROW, ...prevRow, ...patch } },
      };
    });

  const setTopicField = (sid, topic, patch) => {
    setValue((s) => {
      const baseTS = s.topicSettings && typeof s.topicSettings === "object" ? s.topicSettings : {};
      const nextSid = ensureSubjectTopicMapShape(s, baseTS, sid);
      const prevRow = { ...nextSid[topic] };
      const nextRow = { ...prevRow, ...patch };
      if (nextRow.targetQuestions != null) {
        nextRow.targetQuestions = Math.max(0, Math.floor(Number(nextRow.targetQuestions) || 0));
      }
      nextSid[topic] = nextRow;
      const topicListFromSettings = activeTopicKeysFromSettings({ ...baseTS, [sid]: nextSid }, sid);
      const prevSub =
        s.subjects?.[sid] && typeof s.subjects[sid] === "object" ? { ...s.subjects[sid] } : { ...FALLBACK_SUBJECT_ROW };
      return {
        ...s,
        topicSettings: { ...baseTS, [sid]: nextSid },
        subjects: {
          ...(s.subjects && typeof s.subjects === "object" ? s.subjects : {}),
          [sid]: { ...prevSub, topics: topicListFromSettings },
        },
      };
    });
  };

  const toggleSubjectEnabled = (sid, on) => {
    const buckets = SUBJECT_BUCKETS[sid] || [];
    setValue((s) => {
      const baseTS = s.topicSettings && typeof s.topicSettings === "object" ? s.topicSettings : {};
      const nextSid = ensureSubjectTopicMapShape(s, baseTS, sid);
      const prevSub =
        s.subjects?.[sid] && typeof s.subjects[sid] === "object" ? { ...s.subjects[sid] } : { ...FALLBACK_SUBJECT_ROW };
      const nextSubject = { ...prevSub, enabled: on, topics: on ? [] : [] };
      for (const t of buckets) {
        if (!on) {
          const cur = { ...nextSid[t] };
          nextSid[t] = { ...cur, enabled: false, targetQuestions: 0 };
        } else {
          if (!nextSid[t] || typeof nextSid[t] !== "object") {
            nextSid[t] = {
              ...DEFAULT_TOPIC_ROW,
              enabled: false,
              targetQuestions: 0,
              targetAccuracyPct: nextSubject.targetAccuracyPct || 76,
              avgSessionDurationSec: nextSubject.avgSessionDurationSec || 900,
              level: nextSubject.level || "medium",
              mode: nextSubject.mode || "learning",
              topicTrend: s.customTrend || "stable",
              repeatedMistakeStrengthPct: s.repeatedMistakeStrengthPct || 40,
              responseMsBehavior: s.responseMsBehavior || "balanced",
            };
          }
        }
      }
      if (on) {
        for (const t of buckets) {
          const r = nextSid[t];
          if (r?.enabled && Math.max(0, Math.floor(Number(r?.targetQuestions) || 0)) < 1) {
            nextSid[t] = { ...r, targetQuestions: 20 };
          }
        }
      }
      nextSubject.topics = on ? activeTopicKeysFromSettings({ [sid]: nextSid }, sid) : [];
      return {
        ...s,
        topicSettings: { ...baseTS, [sid]: nextSid },
        subjects: { ...(s.subjects && typeof s.subjects === "object" ? s.subjects : {}), [sid]: nextSubject },
      };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>ילד/ה</h3>
        <label style={fieldStyle}>
          {LABEL.student}
          <input
            type="text"
            dir="ltr"
            style={{ ...inputStyle, marginTop: 4 }}
            value={value.studentName}
            onChange={(e) => setField("studentName", e.target.value)}
            disabled={disabled}
          />
        </label>
        <label style={fieldStyle}>
          {LABEL.grade}
          <select
            style={{ ...inputStyle, marginTop: 4 }}
            value={value.grade}
            onChange={(e) => setField("grade", e.target.value)}
            disabled={disabled}
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          border: "1px solid #1e3a5f",
          borderRadius: 12,
          padding: 12,
          background: "#f0f6ff",
        }}
      >
        <label style={{ ...fieldStyle, fontWeight: 700, marginBottom: 6 }}>{LABEL.applyMode}</label>
        <select
          style={{ ...inputStyle, maxWidth: "100%" }}
          value={value.customApplyMode || CUSTOM_APPLY_MODE.replaceSelectedTopics}
          onChange={(e) => setField("customApplyMode", e.target.value)}
          disabled={disabled}
        >
          <option value={CUSTOM_APPLY_MODE.replaceSelectedTopics}>{LABEL.applyReplaceSelected}</option>
          <option value={CUSTOM_APPLY_MODE.append}>{LABEL.applyAppend}</option>
          <option value={CUSTOM_APPLY_MODE.fullSimulationReplace}>{LABEL.applyFull}</option>
        </select>
        {value.customApplyMode === CUSTOM_APPLY_MODE.fullSimulationReplace ? (
          <p
            style={{
              margin: "8px 0 0",
              textAlign: "right",
              fontSize: 13,
              color: "#b91c1c",
              fontWeight: 600,
            }}
          >
            {LABEL.fullReplaceWarn}
          </p>
        ) : null}
      </div>

      <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{LABEL.period}</h3>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label style={fieldStyle}>
            {LABEL.spanDays}
            <input
              type="number"
              min={1}
              style={{ ...inputStyle, marginTop: 4 }}
              value={value.spanDays}
              onChange={(e) => setField("spanDays", Number(e.target.value))}
              disabled={disabled}
            />
          </label>
          <label style={fieldStyle}>
            {LABEL.activeDays}
            <input
              type="number"
              min={1}
              style={{ ...inputStyle, marginTop: 4 }}
              value={value.activeDays}
              onChange={(e) => setField("activeDays", Number(e.target.value))}
              disabled={disabled}
            />
          </label>
          <label style={fieldStyle}>
            {LABEL.questions} ({LABEL.computedTotals})
            <input
              type="number"
              readOnly
              style={{ ...inputStyle, marginTop: 4, background: "#e2e8f0" }}
              value={computed.totalQuestions}
              disabled
            />
          </label>
          <label style={fieldStyle}>
            {LABEL.sessions} ({LABEL.computedTotals})
            <input
              type="number"
              readOnly
              style={{ ...inputStyle, marginTop: 4, background: "#e2e8f0" }}
              value={computed.sessionsCount}
              disabled
            />
          </label>
        </div>
        <label style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <input type="checkbox" checked={value.useNowAsAnchor} onChange={(e) => setField("useNowAsAnchor", e.target.checked)} disabled={disabled} />
          {LABEL.useNow}
        </label>
        {!value.useNowAsAnchor ? (
          <label style={fieldStyle}>
            {LABEL.anchor}
            <input
              type="date"
              dir="ltr"
              style={{ ...inputStyle, marginTop: 4 }}
              value={value.anchorDate}
              onChange={(e) => setField("anchorDate", e.target.value)}
              disabled={disabled}
            />
          </label>
        ) : null}
        <label style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            data-testid="dev-sim-debug-short"
            checked={value.debugShortMode}
            onChange={(e) => setField("debugShortMode", e.target.checked)}
            disabled={disabled}
          />
          {LABEL.debug}
        </label>
      </div>

      <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{LABEL.subjects}</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", textAlign: "right" }}>{LABEL.applySourceHint}</p>
        <label
          dir="rtl"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 6,
            marginBottom: 10,
            fontSize: 12,
            color: "#475569",
            cursor: disabled ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showInternalTopicKeys}
            onChange={(e) => setShowInternalTopicKeys(e.target.checked)}
            disabled={disabled}
            style={{ width: 14, height: 14, flexShrink: 0 }}
          />
          <span style={{ textAlign: "right" }}>{LABEL.showInternalKeys}</span>
        </label>
        {CUSTOM_BUILDER_UI_SUBJECT_ORDER.map((sid) => {
          const row = value.subjects?.[sid] ? { ...FALLBACK_SUBJECT_ROW, ...value.subjects[sid] } : { ...FALLBACK_SUBJECT_ROW };
          const buckets = SUBJECT_BUCKETS[sid] || [];
          return (
            <div
              key={sid}
              style={{
                marginBottom: 14,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: row.enabled ? "#fff" : "#f1f5f9",
              }}
            >
              <label
                dir="rtl"
                title={`${hebrewSubjectLabel(sid)} · ${sid}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 8,
                  marginBottom: 6,
                  cursor: disabled ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  data-testid={`dev-sim-subject-enable-${sid}`}
                  checked={row.enabled}
                  onChange={(e) => toggleSubjectEnabled(sid, e.target.checked)}
                  disabled={disabled}
                />
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, textAlign: "right" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{hebrewSubjectLabel(sid)}</span>
                  {showInternalTopicKeys ? (
                    <code dir="ltr" style={{ fontSize: 10, color: "#94a3b8", unicodeBidi: "embed" }}>
                      {sid}
                    </code>
                  ) : null}
                </span>
              </label>
              {!row.enabled ? <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", textAlign: "right" }}>{LABEL.topicsDisabledHint}</p> : null}
              {row.enabled ? (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", marginBottom: 8 }}>
                  <label style={fieldStyle}>
                    {LABEL.weight}
                    <input
                      type="number"
                      min={0.01}
                      step={0.05}
                      style={{ ...inputStyle, marginTop: 4 }}
                      value={row.weight}
                      onChange={(e) => setSubject(sid, { weight: Number(e.target.value) })}
                      disabled={disabled}
                    />
                  </label>
                </div>
              ) : null}
              {row.enabled ? (
                <div style={{ width: "100%", overflowX: "auto" }} dir="rtl">
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 11,
                      minWidth: 720,
                      textAlign: "right",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.active}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>נושא</th>
                        {showInternalTopicKeys ? (
                          <th style={{ padding: 4, border: "1px solid #e2e8f0" }} dir="ltr">
                            key
                          </th>
                        ) : null}
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.nQuestions}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.acc}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.level}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.mode}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.sessionAvgMin}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.perTopicTopicTrend}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.repeatStr}</th>
                        <th style={{ padding: 4, border: "1px solid #e2e8f0" }}>{LABEL.pace}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.map((topic) => {
                        const tr = topicRowValue(value, sid, topic);
                        return (
                          <tr key={`${sid}:${topic}`}>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <input
                                type="checkbox"
                                data-testid={`dev-sim-topic-active-${sid}-${topic}`}
                                checked={tr.enabled}
                                onChange={(e) => setTopicField(sid, topic, { enabled: e.target.checked, targetQuestions: e.target.checked && tr.targetQuestions < 1 ? 20 : tr.targetQuestions })}
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>{hebrewTopicPrimary(topic)}</td>
                            {showInternalTopicKeys ? (
                              <td style={{ padding: 4, border: "1px solid #e2e8f0" }} dir="ltr">
                                <code style={{ fontSize: 10 }}>{topic}</code>
                              </td>
                            ) : null}
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <input
                                type="number"
                                min={0}
                                data-testid={`dev-sim-topic-questions-${sid}-${topic}`}
                                style={tableInput}
                                value={tr.targetQuestions}
                                onChange={(e) => setTopicField(sid, topic, { targetQuestions: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                style={tableInput}
                                value={tr.targetAccuracyPct}
                                onChange={(e) => setTopicField(sid, topic, { targetAccuracyPct: Number(e.target.value) })}
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <select
                                style={tableSelect}
                                value={tr.level}
                                onChange={(e) => setTopicField(sid, topic, { level: e.target.value })}
                                disabled={disabled}
                              >
                                {LEVEL_OPTS.map((o) => (
                                  <option key={o.v} value={o.v}>
                                    {o.l}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <select
                                style={tableSelect}
                                value={tr.mode}
                                onChange={(e) => setTopicField(sid, topic, { mode: e.target.value })}
                                disabled={disabled}
                              >
                                {MODE_OPTS.map((o) => (
                                  <option key={o.v} value={o.v}>
                                    {o.l}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <input
                                type="number"
                                min={1}
                                max={120}
                                style={tableInput}
                                value={durationMinFromSec(tr.avgSessionDurationSec)}
                                onChange={(e) => setTopicField(sid, topic, { avgSessionDurationSec: durationSecFromMin(e.target.value) })}
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <select
                                style={tableSelect}
                                value={tr.topicTrend || "stable"}
                                onChange={(e) => setTopicField(sid, topic, { topicTrend: e.target.value })}
                                disabled={disabled}
                              >
                                {TREND_OPTS.map((o) => (
                                  <option key={o.v} value={o.v}>
                                    {o.l}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                style={tableInput}
                                value={tr.repeatedMistakeStrengthPct}
                                onChange={(e) => setTopicField(sid, topic, { repeatedMistakeStrengthPct: Number(e.target.value) })}
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: 4, border: "1px solid #e2e8f0" }}>
                              <select
                                style={tableSelect}
                                value={tr.responseMsBehavior || "balanced"}
                                onChange={(e) => setTopicField(sid, topic, { responseMsBehavior: e.target.value })}
                                disabled={disabled}
                              >
                                {PACE_OPTS.map((o) => (
                                  <option key={o.v} value={o.v}>
                                    {o.l}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{LABEL.trend}</h3>
        <select
          style={{ ...inputStyle, maxWidth: "100%" }}
          value={value.customTrend}
          onChange={(e) => setField("customTrend", e.target.value)}
          disabled={disabled}
        >
          {TREND_OPTS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>

      <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{LABEL.mistakes}</h3>
        <label style={fieldStyle}>
          {LABEL.mistakeRate}
          <input
            type="number"
            min={0}
            max={100}
            style={{ ...inputStyle, marginTop: 4 }}
            value={value.mistakeRatePct}
            onChange={(e) => setField("mistakeRatePct", Number(e.target.value))}
            disabled={disabled}
          />
        </label>
        <label style={fieldStyle}>
          {LABEL.repeatStr} (global)
          <input
            type="number"
            min={0}
            max={100}
            style={{ ...inputStyle, marginTop: 4 }}
            value={value.repeatedMistakeStrengthPct}
            onChange={(e) => setField("repeatedMistakeStrengthPct", Number(e.target.value))}
            disabled={disabled}
          />
        </label>
        <label style={fieldStyle}>
          {LABEL.pace} (default)
          <select
            style={{ ...inputStyle, marginTop: 4 }}
            value={value.responseMsBehavior}
            onChange={(e) => setField("responseMsBehavior", e.target.value)}
            disabled={disabled}
          >
            {PACE_OPTS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
