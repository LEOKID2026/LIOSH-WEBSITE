import { useCallback, useId, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";

const CATEGORIES = [
  { value: "compensation", label: "פיצוי" },
  { value: "bonus", label: "בונוס" },
  { value: "bugfix", label: "תיקון תקלה" },
  { value: "other", label: "אחר" },
];

function formatBalance(n) {
  const v = Math.floor(Number(n) || 0);
  return v.toLocaleString("he-IL");
}

function newClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminManualCoinsTab({ accessToken }) {
  const formId = useId();
  const [studentIdInput, setStudentIdInput] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [loadPhase, setLoadPhase] = useState("idle");
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [clientRequestId, setClientRequestId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("compensation");
  const [note, setNote] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);

  const loadStudent = useCallback(async () => {
    const sid = studentIdInput.trim();
    if (!sid) {
      setLoadError("יש להזין מזהה ילד");
      return;
    }
    setLoadPhase("loading");
    setLoadError("");
    setSuccess(null);
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/students/${encodeURIComponent(sid)}/coin-info`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStudentInfo(null);
        setLoadPhase("error");
        setLoadError(apiErrorMessageHe(body?.error?.message || body?.error?.code, ADMIN_LOAD_ERROR));
        return;
      }
      setStudentInfo(body.data || null);
      setLoadPhase("ok");
    } catch {
      setStudentInfo(null);
      setLoadPhase("error");
      setLoadError(ADMIN_LOAD_ERROR);
    }
  }, [accessToken, studentIdInput]);

  const openModal = () => {
    if (!studentInfo?.studentId) return;
    setClientRequestId(newClientRequestId());
    setAmount("");
    setCategory("compensation");
    setNote("");
    setSubmitError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitBusy) return;
    setModalOpen(false);
  };

  const submitCredit = async () => {
    if (!studentInfo?.studentId || !clientRequestId) return;
    setSubmitBusy(true);
    setSubmitError("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/students/${encodeURIComponent(studentInfo.studentId)}/coin-credit`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: amount.trim() === "" ? amount : Number(amount),
            category,
            note,
            clientRequestId,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(apiErrorMessageHe(body?.error?.message || body?.error?.code, ADMIN_LOAD_ERROR));
        return;
      }
      const data = body.data || {};
      setSuccess({
        duplicate: body.duplicate === true,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
        amountCredited: data.amountCredited,
      });
      setStudentInfo((prev) =>
        prev
          ? {
              ...prev,
              balance: data.balanceAfter ?? prev.balance,
            }
          : prev
      );
      setModalOpen(false);
    } catch {
      setSubmitError(ADMIN_LOAD_ERROR);
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <div className="text-right w-full max-w-full overflow-x-hidden">
      <p className="text-xs text-white/60 mb-4">
        הוספת מטבעות ישירות לילד — לפיצוי, בונוס או תיקון תקלה. הפעולה נרשמת ביומן המטבעות.
      </p>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4 w-full max-w-xl">
        <label htmlFor={`${formId}-student-id`} className="block text-sm font-semibold mb-2">
          מזהה ילד
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={`${formId}-student-id`}
            type="text"
            dir="ltr"
            className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-white font-mono"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={studentIdInput}
            onChange={(e) => setStudentIdInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void loadStudent()}
            disabled={loadPhase === "loading"}
            className="shrink-0 rounded-lg bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loadPhase === "loading" ? ADMIN_LOADING : "טען פרטי ילד"}
          </button>
        </div>
        {loadError ? <p className="text-red-300 text-sm mt-2">{loadError}</p> : null}
      </section>

      {studentInfo ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4 w-full max-w-xl">
          <p className="text-sm text-white/50 mb-1">שם הילד</p>
          <p className="text-base font-semibold mb-3">{studentInfo.studentName || "—"}</p>
          <p className="text-sm text-white/50 mb-1">יתרה נוכחית</p>
          <p className="text-lg font-bold text-amber-200 mb-4">{formatBalance(studentInfo.balance)} מטבעות</p>
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg bg-emerald-600/40 border border-emerald-400/50 px-4 py-2 text-sm font-semibold hover:bg-emerald-600/50"
          >
            הוסף מטבעות
          </button>
        </section>
      ) : null}

      {success ? (
        <div
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 mb-4 w-full max-w-xl"
          role="status"
        >
          <p className="text-emerald-100 font-semibold mb-2">
            {success.duplicate ? "הפעולה כבר בוצעה (ללא כפילות)" : "המטבעות נוספו בהצלחה"}
          </p>
          <p className="text-sm text-white/80">
            יתרה לפני: {formatBalance(success.balanceBefore)} · אחרי:{" "}
            {formatBalance(success.balanceAfter)}
            {success.amountCredited != null && !success.duplicate ? (
              <>
                {" "}
                · נוספו: {formatBalance(success.amountCredited)}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {modalOpen && studentInfo ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-modal-title`}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/15 bg-[#1a1f2e] p-4 sm:p-5 shadow-xl overflow-x-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`${formId}-modal-title`} className="text-lg font-bold mb-4">
              הוספת מטבעות לילד
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white/50 mb-1">שם הילד</p>
                <p className="font-semibold">{studentInfo.studentName || "—"}</p>
              </div>
              <div>
                <p className="text-white/50 mb-1">יתרה נוכחית</p>
                <p className="font-semibold text-amber-200">{formatBalance(studentInfo.balance)} מטבעות</p>
              </div>

              <div>
                <label htmlFor={`${formId}-amount`} className="block font-semibold mb-1">
                  כמות מטבעות
                </label>
                <input
                  id={`${formId}-amount`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  className="w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor={`${formId}-category`} className="block font-semibold mb-1">
                  סיבה
                </label>
                <select
                  id={`${formId}-category`}
                  className="w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${formId}-note`} className="block font-semibold mb-1">
                  הערה פנימית
                </label>
                <textarea
                  id={`${formId}-note`}
                  rows={3}
                  className="w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-white resize-y min-h-[4rem]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="אופציונלי — לתיעוד פנימי"
                />
              </div>
            </div>

            {submitError ? <p className="text-red-300 text-sm mt-3">{submitError}</p> : null}

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5 justify-end">
              <button
                type="button"
                disabled={submitBusy}
                onClick={closeModal}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={submitBusy || !amount}
                onClick={() => void submitCredit()}
                className="rounded-lg bg-emerald-600/50 border border-emerald-400/50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {submitBusy ? "מוסיף..." : "הוסף מטבעות לילד"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
