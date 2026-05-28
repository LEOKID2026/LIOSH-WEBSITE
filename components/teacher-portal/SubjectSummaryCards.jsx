import {
  REPORT_SUBJECTS,
  formatPercent,
  subjectLabelHe,
  topicLabelHe,
} from "../../lib/teacher-portal/teacher-ui.he.js";

export default function SubjectSummaryCards({ subjects, showTopics = false }) {
  if (!subjects || typeof subjects !== "object") {
    return <p className="text-white/60 text-sm">אין מספיק נתונים</p>;
  }

  const cards = REPORT_SUBJECTS.map((sid) => {
    const subj = subjects[sid];
    if (!subj || (Number(subj.answers) || 0) === 0) return null;
    const label = subjectLabelHe(sid) || sid;
    return (
      <div
        key={sid}
        className="rounded-xl border border-white/15 bg-black/30 p-4 min-w-[140px] flex-shrink-0"
      >
        <h3 className="font-semibold text-amber-200 mb-2">{label}</h3>
        <dl className="text-sm space-y-1 text-white/80">
          <div className="flex justify-between gap-2">
            <dt>מפגשים</dt>
            <dd>{subj.sessions ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>תשובות</dt>
            <dd>{subj.answers ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>הצלחה</dt>
            <dd>{formatPercent(subj.accuracy)}</dd>
          </div>
        </dl>
        {showTopics ? (
          <ul className="mt-2 text-xs text-white/70 space-y-0.5 border-t border-white/10 pt-2">
            {Object.entries(subj.topics || {})
              .map(([topicKey, topicData]) => ({
                topicKey,
                answers: Number(topicData?.answers) || 0,
                accuracy: Number(topicData?.accuracy) || 0,
                wrong: Number(topicData?.wrong) || 0,
              }))
              .filter((t) => {
                const tk = String(t.topicKey || "").trim().toLowerCase();
                if (!tk || tk === "general") return false;
                return t.answers >= 3 && t.accuracy < 60 && topicLabelHe(sid, t.topicKey);
              })
              .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong)
              .slice(0, 3)
              .map((t) => (
                <li key={t.topicKey} className="flex justify-between gap-2">
                  <span>{topicLabelHe(sid, t.topicKey)}</span>
                  <span>{formatPercent(t.accuracy)}</span>
                </li>
              ))}
          </ul>
        ) : null}
      </div>
    );
  }).filter(Boolean);

  if (!cards.length) {
    return <p className="text-white/60 text-sm">אין מספיק נתונים לפי מקצוע</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">{cards}</div>
  );
}
