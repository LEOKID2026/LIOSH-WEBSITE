import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import AdminShell from "../../components/admin/AdminShell";
import { adminAuthFetch, useAdminSession } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_ANALYTICS_TITLE,
  ADMIN_LOADING,
  ADMIN_LOAD_ERROR,
  adminGradeLabelHe,
  apiErrorMessageHe,
} from "../../lib/admin-portal/admin-ui.he.js";
import {
  formatAnalyticsGradeHe,
  formatAnalyticsLabelHe,
  formatAnalyticsSourceHe,
  formatAnalyticsTableHe,
  formatAnalyticsUnitHe,
} from "../../lib/admin-portal/admin-analytics-labels.he.js";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";

const PRESETS = [
  { value: "today", label: "היום" },
  { value: "last7", label: "7 ימים" },
  { value: "last30", label: "30 ימים" },
  { value: "currentMonth", label: "החודש" },
  { value: "custom", label: "טווח מותאם" },
];

const GRADES = [
  { value: "all", label: "כל הכיתות" },
  { value: "grade_1", label: "כיתה א׳" },
  { value: "grade_2", label: "כיתה ב׳" },
  { value: "grade_3", label: "כיתה ג׳" },
  { value: "grade_4", label: "כיתה ד׳" },
  { value: "grade_5", label: "כיתה ה׳" },
  { value: "grade_6", label: "כיתה ו׳" },
  { value: "g1", label: adminGradeLabelHe("g1") },
  { value: "g2", label: adminGradeLabelHe("g2") },
  { value: "g3", label: adminGradeLabelHe("g3") },
  { value: "g4", label: adminGradeLabelHe("g4") },
  { value: "g5", label: adminGradeLabelHe("g5") },
  { value: "g6", label: adminGradeLabelHe("g6") },
];

const SUBJECTS = [
  { value: "all", label: "כל המקצועות" },
  { value: "math", label: "חשבון" },
  { value: "geometry", label: "גיאומטריה" },
  { value: "hebrew", label: "עברית" },
  { value: "english", label: "אנגלית" },
  { value: "science", label: "מדעים" },
  { value: "moledet_geography", label: "מולדת וגיאוגרפיה" },
];

const CHILD_STATUSES = [
  { value: "all", label: "כל הילדים" },
  { value: "active", label: "ילדים פעילים" },
  { value: "inactive", label: "ילדים לא פעילים" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 29);
  return d.toISOString().slice(0, 10);
}

function valueText(metric) {
  if (!metric) return "—";
  if (metric.status === "not_tracked") return "עדיין לא נמדד";
  if (metric.status === "requires_events") return "דורש איסוף אירועים";
  if (metric.status === "empty") return "אין נתונים עדיין";
  if (metric.status === "not_enough_data") return "אין מספיק נתונים עדיין";
  if (metric.status === "unavailable") return "מקור נתונים לא זמין";
  if (metric.value === null || metric.value === undefined) return metric.note || "עדיין לא נמדד";
  if (typeof metric.value === "number") {
    return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(metric.value);
  }
  return String(metric.value);
}

function statusClass(status) {
  if (status === "available") return "border-emerald-400/20 bg-emerald-400/5";
  if (status === "partial") return "border-amber-400/30 bg-amber-400/10";
  if (status === "empty" || status === "not_enough_data") return "border-white/15 bg-white/[0.03]";
  if (status === "not_tracked" || status === "requires_events") return "border-cyan-400/25 bg-cyan-400/10";
  return "border-red-400/25 bg-red-400/10";
}

function MetricCard({ item }) {
  return (
    <div className={`rounded-2xl border p-4 min-h-[7rem] ${statusClass(item.status)}`}>
      <p className="text-xs text-white/55 mb-2">{formatAnalyticsLabelHe(item.label)}</p>
      <p className="text-2xl font-bold text-white leading-tight">{valueText(item)}</p>
      {item.unit ? <p className="text-xs text-white/45 mt-1">{formatAnalyticsUnitHe(item.unit)}</p> : null}
      <p className="text-[11px] text-white/40 mt-2 break-words">מקור: {formatAnalyticsSourceHe(item.source)}</p>
      {item.note && item.status !== "available" ? (
        <p className="text-[11px] text-amber-100/80 mt-1">{formatAnalyticsLabelHe(item.note)}</p>
      ) : null}
    </div>
  );
}

function MetricGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {(items || []).map((item, idx) => (
        <MetricCard key={`${item.label}-${idx}`} item={item} />
      ))}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 md:p-5 shadow-xl shadow-black/10">
      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        {subtitle ? <p className="text-sm text-white/55 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SimpleTable({ rows, columns, empty = "אין נתונים בטווח" }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p className="text-sm text-white/50">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5 text-white/65">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, idx) => (
            <tr key={row.key || row.date || `${idx}`}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-right whitespace-nowrap text-white/80">
                  {col.render ? col.render(row) : formatAnalyticsLabelHe(row[col.key]) ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopList({ title, rows }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <h3 className="font-semibold mb-3 text-white/85">{title}</h3>
      <SimpleTable
        rows={rows}
        columns={[
          { key: "label", label: "שם", render: (row) => formatAnalyticsLabelHe(row.label || row.key) },
          { key: "value", label: "כמות" },
        ]}
      />
    </div>
  );
}

function FunnelList({ funnels }) {
  if (!Array.isArray(funnels) || !funnels.length) {
    return <p className="text-sm text-white/50">אין נתונים עדיין</p>;
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {funnels.map((funnel) => (
        <div key={funnel.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-white/90">{formatAnalyticsLabelHe(funnel.name)}</h3>
            {funnel.note ? <span className="text-xs text-white/45">{formatAnalyticsLabelHe(funnel.note)}</span> : null}
          </div>
          <SimpleTable
            rows={funnel.steps}
            columns={[
              { key: "label", label: "שלב", render: (row) => formatAnalyticsLabelHe(row.label) },
              { key: "value", label: "כמות", render: (row) => row.value == null ? valueText(row) : row.value },
              { key: "conversionFromPrevious", label: "המרה", render: (row) => row.conversionFromPrevious == null ? "—" : `${row.conversionFromPrevious}%` },
              { key: "source", label: "מקור", render: (row) => formatAnalyticsSourceHe(row.source) },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { state, accessToken } = useAdminSession();
  const [preset, setPreset] = useState("last30");
  const [from, setFrom] = useState(thirtyDaysAgoIso());
  const [to, setTo] = useState(todayIso());
  const [grade, setGrade] = useState("all");
  const [subject, setSubject] = useState("all");
  const [childStatus, setChildStatus] = useState("all");
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const trackedOpenKeyRef = useRef("");

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("preset", preset);
    if (preset === "custom") {
      qs.set("from", from);
      qs.set("to", to);
    }
    qs.set("grade", grade);
    qs.set("subject", subject);
    qs.set("childStatus", childStatus);
    return qs.toString();
  }, [childStatus, from, grade, preset, subject, to]);

  const load = useCallback(async (token) => {
    setLoading(true);
    setLoadError("");
    const res = await adminAuthFetch(token, `/api/admin/analytics?${queryString}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.data?.sections) {
      setDashboard(null);
      setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
      setLoading(false);
      return;
    }
    setDashboard(body.data);
    if (trackedOpenKeyRef.current !== queryString) {
      trackedOpenKeyRef.current = queryString;
      void trackProductEvent({
        eventName: "admin_analytics_opened",
        actorType: "admin",
        metadata: { preset, grade, subject, childStatus },
      });
    }
    setLoading(false);
  }, [childStatus, grade, preset, queryString, subject]);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    void load(accessToken);
  }, [state, accessToken, load]);

  const sections = dashboard?.sections || {};
  const sourceErrors = dashboard?.sourceErrors || [];

  return (
    <Layout>
      <AdminShell
        title={ADMIN_ANALYTICS_TITLE}
        showLogout
        header={
          <div>
            <p className="text-xs text-white/50 mb-1">ניהול מערכת</p>
            <h1 className="text-xl md:text-2xl font-bold text-right">{ADMIN_ANALYTICS_TITLE}</h1>
            <p className="text-sm text-white/55 mt-2">
              מספרים ממקורות מאגר נתונים קיימים בלבד. מדדים שאינם נמדדים מסומנים בגלוי.
            </p>
          </div>
        }
      >
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label className="text-sm text-white/70">
                טווח
                <select value={preset} onChange={(e) => setPreset(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-white">
                  {PRESETS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/70">
                מתאריך
                <input type="date" value={from} disabled={preset !== "custom"} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-white disabled:opacity-50" />
              </label>
              <label className="text-sm text-white/70">
                עד תאריך
                <input type="date" value={to} disabled={preset !== "custom"} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-white disabled:opacity-50" />
              </label>
              <label className="text-sm text-white/70">
                כיתה
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-white">
                  {GRADES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/70">
                מקצוע
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-white">
                  {SUBJECTS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/70">
                סטטוס ילד
                <select value={childStatus} onChange={(e) => setChildStatus(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-white">
                  {CHILD_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button type="button" onClick={() => accessToken && load(accessToken)} className="w-full rounded-xl bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2">
                  רענון נתונים
                </button>
              </div>
            </div>
            {dashboard?.filters?.range?.label ? (
              <p className="text-xs text-white/45 mt-3">טווח מחושב: {dashboard.filters.range.label}</p>
            ) : null}
          </section>

          {state === "loading" || loading ? (
            <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
          ) : loadError ? (
            <p className="text-red-300 text-sm text-right">{loadError}</p>
          ) : dashboard ? (
            <>
              {sourceErrors.length ? (
                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
                  חלק ממקורות הנתונים חסרים או לא זמינים: {sourceErrors.map((e) => formatAnalyticsTableHe(e.table)).join(", ")}
                </div>
              ) : null}

              <Section title="סקירה כללית" subtitle="מדדי שימוש מרכזיים ממקורות מאגר הנתונים הקיימים">
                <MetricGrid items={sections.overview} />
              </Section>

              <Section title="חשבונות והרשמות" subtitle="חשבונות אימות, פרסונות, תפקידים, חשבונות לא משויכים והרשמות לאורך זמן">
                <MetricGrid items={sections.accounts?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                  <TopList title="חשבונות לפי פרסונה" rows={sections.accounts?.byPersona} />
                  <TopList title="חשבונות לפי תפקיד באימות" rows={sections.accounts?.byAuthRole} />
                  <TopList title="סטטוסי הרשאות" rows={sections.accounts?.byStatus} />
                  <TopList title="חשבונות לפי יום הצטרפות" rows={sections.accounts?.joinedByDay} />
                  <TopList title="חשבונות לפי שבוע הצטרפות" rows={sections.accounts?.joinedByWeek} />
                  <TopList title="חשבונות לפי חודש הצטרפות" rows={sections.accounts?.joinedByMonth} />
                </div>
              </Section>

              <Section title="הצטרפות הורים ותחילת שימוש" subtitle="מתי הורים הצטרפו, האם יצרו ילדים וכמה מהר הגיעו ללמידה">
                <MetricGrid items={sections.parentJoin?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                  <TopList title="הורים לפי יום הצטרפות" rows={sections.parentJoin?.byDay} />
                  <TopList title="הורים לפי שבוע הצטרפות" rows={sections.parentJoin?.byWeek} />
                  <TopList title="הורים לפי חודש הצטרפות" rows={sections.parentJoin?.byMonth} />
                </div>
                <div className="mt-4">
                  <FunnelList funnels={sections.parentJoin?.onboardingFunnel ? [sections.parentJoin.onboardingFunnel] : []} />
                </div>
              </Section>

              <Section title="הצטרפות ילדים ולמידה ראשונה" subtitle="מתי ילדים נוספו, מי התחיל ללמוד וכמה זמן עבר עד למידה ראשונה">
                <MetricGrid items={sections.childJoin?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                  <TopList title="ילדים לפי יום הוספה" rows={sections.childJoin?.byDay} />
                  <TopList title="ילדים לפי שבוע הוספה" rows={sections.childJoin?.byWeek} />
                  <TopList title="ילדים לפי חודש הוספה" rows={sections.childJoin?.byMonth} />
                </div>
              </Section>

              <Section title="נתוני מורים פרטיים" subtitle="מורים פרטיים בלבד: הצטרפות, פעילות, דוחות, פעילויות ודפי עבודה">
                <MetricGrid items={sections.teachers?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  <TopList title="מורים לפי יום הצטרפות" rows={sections.teachers?.byDay} />
                  <TopList title="מורים לפי שבוע הצטרפות" rows={sections.teachers?.byWeek} />
                  <TopList title="מורים לפי חודש הצטרפות" rows={sections.teachers?.byMonth} />
                  <TopList title="פעילות מורים לפי יום" rows={sections.teachers?.activityByDay} />
                </div>
              </Section>

              <Section title="ילדים ושימוש בפועל" subtitle="האם הילדים באמת לומדים, ולא רק רשומים">
                <MetricGrid items={sections.children?.cards} />
                <div className="mt-4">
                  <SimpleTable
                    rows={sections.children?.byGrade}
                    columns={[
                      { key: "grade", label: "כיתה", render: (row) => formatAnalyticsGradeHe(row.grade) },
                      { key: "children", label: "ילדים" },
                      { key: "activeChildren", label: "פעילים" },
                      { key: "minutes", label: "דקות" },
                      { key: "avgMinutes", label: "דקות ממוצעות" },
                      { key: "answers", label: "תשובות" },
                      { key: "accuracy", label: "דיוק %" },
                    ]}
                  />
                </div>
              </Section>

              <Section title="למידה, מקצועות ונושאים" subtitle="מפגשים, דקות, תשובות, דיוק ונושאים חזקים/חלשים">
                <MetricGrid items={sections.learning?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  <TopList title="מקצועות מובילים" rows={sections.learning?.usage?.topSubjects} />
                  <TopList title="נושאים מובילים" rows={sections.learning?.usage?.topTopics} />
                  <TopList title="שימוש מקצוע לפי כיתה" rows={sections.learning?.usage?.subjectByGrade} />
                  <TopList title="שימוש נושא לפי כיתה" rows={sections.learning?.usage?.topicByGrade} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                  <SimpleTable title="ימים" rows={sections.learning?.daily} columns={[
                    { key: "date", label: "יום" },
                    { key: "sessions", label: "מפגשים" },
                    { key: "minutes", label: "דקות" },
                    { key: "questions", label: "שאלות" },
                    { key: "accuracy", label: "דיוק %" },
                  ]} />
                  <SimpleTable rows={sections.learning?.usage?.highWrongTopics} columns={[
                    { key: "topic", label: "שיעור טעויות גבוה", render: (row) => formatAnalyticsLabelHe(row.topic) },
                    { key: "answers", label: "תשובות" },
                    { key: "wrongRate", label: "טעויות %" },
                  ]} />
                  <SimpleTable rows={sections.learning?.usage?.highSuccessTopics} columns={[
                    { key: "topic", label: "הצלחה גבוהה", render: (row) => formatAnalyticsLabelHe(row.topic) },
                    { key: "answers", label: "תשובות" },
                    { key: "accuracy", label: "דיוק %" },
                  ]} />
                </div>
              </Section>

              <Section title="פעילות הורים" subtitle="האם הורים יוצרים ילדים ומגיעים לשימוש משמעותי">
                <MetricGrid items={sections.parents} />
              </Section>

              <Section title="פעילויות אישיות של הורה" subtitle="יצירה, התחלה, השלמה וציון לפי מקור אמת קיים">
                <MetricGrid items={sections.parentActivities?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                  <TopList title="לפי מקצוע" rows={sections.parentActivities?.bySubject} />
                  <TopList title="לפי נושא" rows={sections.parentActivities?.byTopic} />
                  <TopList title="לפי כיתת ילד" rows={sections.parentActivities?.byChildGrade} />
                </div>
              </Section>

              <Section title="דוחות הורים / PDF / בדיקת אמת" subtitle="בדיקות מקור גולמיות וחשדות לפערים ללא שינוי התנהגות הדוח">
                <MetricGrid items={sections.reportTruth?.cards} />
                <div className="mt-4">
                  <h3 className="font-semibold mb-3">חשדות לפערים</h3>
                  <MetricGrid items={sections.reportTruth?.suspicious} />
                </div>
              </Section>

              <Section title="ספרים, שמע, הסברים ודפי עבודה" subtitle="מה שנמדד היום מול מה שדורש איסוף אירועים">
                <MetricGrid items={sections.booksAudioWorksheets} />
                <div className="mt-4">
                  <TopList title="עמודי ספר מובילים" rows={sections.topBookPages} />
                </div>
              </Section>

              <Section title="פרסים ומטבעות" subtitle="מקור אמת: עסקאות מטבעות ויתרות ילדים">
                <MetricGrid items={sections.rewards} />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  <TopList title="מטבעות לפי יום" rows={sections.rewardsByDay} />
                  <TopList title="מטבעות לפי סיבה" rows={sections.rewardsByReason} />
                </div>
              </Section>

              <Section title="משפכי שימוש" subtitle="מסלולי שימוש קבועים: הורה, ילד, דוחות, פעילויות, ספרים ושמע">
                <FunnelList funnels={sections.funnels} />
              </Section>

              <Section title="חזרה לשימוש" subtitle="שימור יום 1 / 7 / 30 מוצג רק אחרי מספיק זמן ונתונים אמיתיים">
                <MetricGrid items={sections.retention} />
              </Section>

              <Section title="נטישה ומועמדי נטישה" subtitle="אירועי נטישה מפורשים לצד מועמדים מוסקים ממפגשים וסטטוסים">
                <MetricGrid items={sections.abandonment} />
              </Section>

              <Section title="שימוש בפיצ׳רים" subtitle="מה משתמשים באמת פותחים, ומה כמעט לא מקבל שימוש">
                <MetricGrid items={sections.featureUsage?.cards} />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  <TopList title="התכונות הכי בשימוש" rows={sections.featureUsage?.mostUsed} />
                  <TopList title="התכונות הכי פחות בשימוש" rows={sections.featureUsage?.leastUsed} />
                  <TopList title="שימוש לפי כיתה" rows={sections.featureUsage?.byGrade} />
                  <TopList title="שימוש לפי מקצוע" rows={sections.featureUsage?.bySubject} />
                </div>
              </Section>
            </>
          ) : null}
        </div>
      </AdminShell>
    </Layout>
  );
}
