import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatRuleTypeHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";

const inputClass =
  "block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-xs";

export default function AdminCardRulesPanel({ accessToken, cardId, cardName, embedded = false }) {
  const [rules, setRules] = useState([]);
  const [ruleTypes, setRuleTypes] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRule, setNewRule] = useState({
    rule_type: "total_questions",
    min_questions: 20,
    grant_enabled: true,
    is_active: true,
    display_order: 0,
  });

  const load = useCallback(async () => {
    if (!accessToken || !cardId) return;
    setPhase("loading");
    const [rulesRes, typesRes] = await Promise.all([
      adminAuthFetch(accessToken, `/api/admin/rewards/cards/${cardId}/rules`),
      adminAuthFetch(accessToken, "/api/admin/rewards/rule-types"),
    ]);
    const rulesBody = await rulesRes.json().catch(() => ({}));
    const typesBody = await typesRes.json().catch(() => ({}));
    if (!rulesRes.ok) {
      setMessage(apiErrorMessageHe(rulesBody?.error, "טעינת חוקים נכשלה"));
      setPhase("error");
      return;
    }
    setRules(Array.isArray(rulesBody.rules) ? rulesBody.rules : []);
    setRuleTypes(Array.isArray(typesBody.ruleTypes) ? typesBody.ruleTypes : []);
    setPhase("ok");
  }, [accessToken, cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (rule) => {
    setEditId(rule.id);
    setDraft({
      rule_type: rule.rule_type,
      min_questions: rule.min_questions,
      min_accuracy: rule.min_accuracy,
      min_streak_days: rule.min_streak_days,
      min_completed_activities: rule.min_completed_activities,
      min_learning_minutes_monthly: rule.min_learning_minutes_monthly,
      subject: rule.subject || "",
      topic: rule.topic || "",
      grade_band: rule.grade_band || "",
      requirement_text_he: rule.requirement_text_he || "",
      grant_enabled: rule.grant_enabled !== false,
      is_active: rule.is_active !== false,
      display_order: rule.display_order ?? 0,
      starts_at: rule.starts_at ? rule.starts_at.slice(0, 16) : "",
      ends_at: rule.ends_at ? rule.ends_at.slice(0, 16) : "",
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(editId);
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${cardId}/rules/${editId}`, {
      method: "PUT",
      body: JSON.stringify(draft),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירת חוק נכשלה"));
      return;
    }
    setMessage("חוק נשמר.");
    setEditId(null);
    void load();
  };

  const createRule = async () => {
    setBusy("new");
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${cardId}/rules`, {
      method: "POST",
      body: JSON.stringify(newRule),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "יצירת חוק נכשלה"));
      return;
    }
    setMessage("חוק חדש נוצר.");
    void load();
  };

  const removeRule = async (ruleId) => {
    if (!window.confirm("למחוק את החוק?")) return;
    setBusy(ruleId);
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${cardId}/rules/${ruleId}`, {
      method: "DELETE",
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "מחיקה נכשלה"));
      return;
    }
    setMessage("חוק נמחק.");
    void load();
  };

  if (phase === "loading") {
    return <p className="text-white/50 text-xs text-right">טוען חוקי קבלה...</p>;
  }

  const shellClass = embedded
    ? "space-y-3 text-right"
    : "mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3 text-right";

  return (
    <div className={shellClass}>
      {!embedded ? <h4 className="font-bold text-sm">חוקי קבלה - {cardName || "קלף"}</h4> : null}
      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}

      {rules.length === 0 ? (
        <p className="text-xs text-white/50">אין חוקים לקלף זה.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {rules.map((rule) => (
            <li key={rule.id} className="rounded border border-white/10 p-2">
              {editId === rule.id ? (
                <RuleForm draft={draft} setDraft={setDraft} ruleTypes={ruleTypes} />
              ) : (
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {formatRuleTypeHe(rule.rule_type)}
                    {rule.grant_enabled === false ? " · ללא הענקה" : ""}
                    {rule.is_active === false ? " · לא פעיל" : ""}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" className="rounded border border-white/15 px-2 py-0.5" onClick={() => startEdit(rule)}>
                      עריכה
                    </button>
                    <button
                      type="button"
                      disabled={busy === rule.id}
                      className="rounded border border-red-400/30 px-2 py-0.5 text-red-300"
                      onClick={() => void removeRule(rule.id)}
                    >
                      מחק
                    </button>
                  </div>
                </div>
              )}
              {editId === rule.id ? (
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={() => setEditId(null)} className="rounded border border-white/15 px-2 py-1">
                    ביטול
                  </button>
                  <button
                    type="button"
                    disabled={busy === editId}
                    onClick={() => void saveEdit()}
                    className="rounded bg-amber-500/30 border border-amber-400/40 px-2 py-1 font-semibold"
                  >
                    שמירה
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-xs font-semibold">הוספת חוק</p>
        <RuleForm draft={newRule} setDraft={setNewRule} ruleTypes={ruleTypes} />
        <button
          type="button"
          disabled={busy === "new"}
          onClick={() => void createRule()}
          className="rounded bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold"
        >
          {busy === "new" ? "יוצר..." : "הוסף חוק"}
        </button>
      </div>
    </div>
  );
}

function RuleForm({ draft, setDraft, ruleTypes }) {
  const rt = draft.rule_type;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <label>
        סוג חוק
        <select
          className={inputClass}
          value={draft.rule_type}
          onChange={(e) => setDraft((d) => ({ ...d, rule_type: e.target.value }))}
        >
          {(ruleTypes.length ? ruleTypes : [{ value: "total_questions", labelHe: "סה״כ שאלות" }]).map((t) => (
            <option key={t.value} value={t.value}>
              {t.labelHe}
            </option>
          ))}
        </select>
      </label>
      {(rt === "total_questions" || rt === "weekly_questions" || rt === "subject_questions" || rt === "subject_accuracy") && (
        <label>
          מינימום שאלות
          <input
            type="number"
            className={inputClass}
            value={draft.min_questions ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, min_questions: e.target.value }))}
          />
        </label>
      )}
      {rt === "subject_accuracy" && (
        <label>
          דיוק מינימלי (%)
          <input
            type="number"
            className={inputClass}
            value={draft.min_accuracy ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, min_accuracy: e.target.value }))}
          />
        </label>
      )}
      {(rt === "learning_streak_days" || rt === "active_days_streak") && (
        <label>
          ימים ברצף
          <input
            type="number"
            className={inputClass}
            value={draft.min_streak_days ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, min_streak_days: e.target.value }))}
          />
        </label>
      )}
      {rt === "parent_activity_complete" && (
        <label>
          פעילויות הורה
          <input
            type="number"
            className={inputClass}
            value={draft.min_completed_activities ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, min_completed_activities: e.target.value }))}
          />
        </label>
      )}
      {rt === "monthly_learning_minutes" && (
        <label>
          דקות בחודש
          <input
            type="number"
            className={inputClass}
            value={draft.min_learning_minutes_monthly ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, min_learning_minutes_monthly: e.target.value }))}
          />
        </label>
      )}
      {(rt === "subject_questions" || rt === "subject_accuracy") && (
        <>
          <label>
            מקצוע
            <input
              className={inputClass}
              value={draft.subject || ""}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
            />
          </label>
          <label>
            נושא
            <input
              className={inputClass}
              value={draft.topic || ""}
              onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
            />
          </label>
        </>
      )}
      {(rt === "grade_band_only" || rt === "event_window") && (
        <label>
          כיתה
          <select
            className={inputClass}
            value={draft.grade_band || ""}
            onChange={(e) => setDraft((d) => ({ ...d, grade_band: e.target.value || null }))}
          >
            <option value="">כל הכיתות</option>
            <option value="g12">א׳–ב׳</option>
            <option value="g34">ג׳–ד׳</option>
            <option value="g56">ה׳–ו׳</option>
          </select>
        </label>
      )}
      <label className="sm:col-span-2">
        טקסט דרישה לילד (אופציונלי)
        <input
          className={inputClass}
          value={draft.requirement_text_he || ""}
          onChange={(e) => setDraft((d) => ({ ...d, requirement_text_he: e.target.value }))}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.grant_enabled !== false}
          onChange={(e) => setDraft((d) => ({ ...d, grant_enabled: e.target.checked }))}
        />
        מעניק קלף
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.is_active !== false}
          onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
        />
        פעיל
      </label>
    </div>
  );
}
