import { useCallback, useId, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import AdminModal, { AdminModalButton } from "../AdminModal.jsx";

const CATEGORIES = [
  { value: "compensation", label: "פיצוי" },
  { value: "bonus", label: "בונוס" },
  { value: "bugfix", label: "תיקון תקלה" },
  { value: "other", label: "אחר" },
];

const PARENT_NOT_FOUND_HE = "לא נמצא הורה עם כתובת המייל הזו";

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

function lastActivityListLine(child) {
  const la = child?.lastActivity;
  if (!la?.hasActivity || !la?.atLabelHe) {
    return "פעילות אחרונה: אין פעילות";
  }
  return `פעילות אחרונה: ${la.atLabelHe}`;
}

export default function AdminManualCoinsTab({ accessToken }) {
  const formId = useId();
  const [parentEmailInput, setParentEmailInput] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [children, setChildren] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadPhase, setLoadPhase] = useState("idle");
  const [loadError, setLoadError] = useState("");

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsPhase, setEventsPhase] = useState("idle");
  const [eventsError, setEventsError] = useState("");
  const [recentEvents, setRecentEvents] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [clientRequestId, setClientRequestId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("compensation");
  const [note, setNote] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);

  const patchChild = useCallback((studentId, patch) => {
    setChildren((prev) =>
      prev.map((c) => (c.studentId === studentId ? { ...c, ...patch } : c))
    );
    setSelectedStudent((prev) =>
      prev?.studentId === studentId ? { ...prev, ...patch } : prev
    );
  }, []);

  const loadChildren = useCallback(async () => {
    const email = parentEmailInput.trim();
    if (!email) {
      setLoadError("יש להזין כתובת מייל של הורה");
      return;
    }
    setLoadPhase("loading");
    setLoadError("");
    setSuccess(null);
    setSelectedStudent(null);
    setChildren([]);
    setParentEmail("");
    setRecentEvents([]);
    setEventsOpen(false);
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/parents/by-email?email=${encodeURIComponent(email)}`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 404 && body?.error?.code === "parent_not_found") {
        setLoadPhase("error");
        setLoadError(PARENT_NOT_FOUND_HE);
        return;
      }
      if (!res.ok) {
        setLoadPhase("error");
        setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
        return;
      }
      const data = body.data || {};
      setParentEmail(data.parent?.email || email.trim().toLowerCase());
      setChildren(Array.isArray(data.students) ? data.students : []);
      setLoadPhase("ok");
    } catch {
      setLoadPhase("error");
      setLoadError(ADMIN_LOAD_ERROR);
    }
  }, [accessToken, parentEmailInput]);

  const refreshStudentActivity = useCallback(
    async (studentId) => {
      if (!studentId) return;
      try {
        const res = await adminAuthFetch(
          accessToken,
          `/api/admin/students/${encodeURIComponent(studentId)}/recent-events?limit=1`
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const events = Array.isArray(body.data?.events) ? body.data.events : [];
        const latest = events[0];
        const lastActivity = latest
          ? {
              hasActivity: true,
              atLabelHe: latest.atLabelHe,
              shortLineHe: latest.atLabelHe,
              detailLineHe: latest.detailLineHe || latest.lineHe,
            }
          : {
              hasActivity: false,
              atLabelHe: null,
              shortLineHe: "אין פעילות",
              detailLineHe: null,
            };
        patchChild(studentId, { lastActivity });
      } catch {
        /* non-blocking */
      }
    },
    [accessToken, patchChild]
  );

  const loadRecentEvents = useCallback(
    async (studentId) => {
      if (!studentId) return;
      setEventsPhase("loading");
      setEventsError("");
      try {
        const res = await adminAuthFetch(
          accessToken,
          `/api/admin/students/${encodeURIComponent(studentId)}/recent-events?limit=20`
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setEventsPhase("error");
          setEventsError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
          return;
        }
        setRecentEvents(Array.isArray(body.data?.events) ? body.data.events : []);
        setEventsPhase("ok");
      } catch {
        setEventsPhase("error");
        setEventsError(ADMIN_LOAD_ERROR);
      }
    },
    [accessToken]
  );

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSuccess(null);
    setEventsOpen(false);
    setRecentEvents([]);
    setEventsPhase("idle");
  };

  const openEvents = () => {
    if (!selectedStudent?.studentId) return;
    setEventsOpen(true);
    void loadRecentEvents(selectedStudent.studentId);
  };

  const closeEvents = () => setEventsOpen(false);

  const openModal = () => {
    if (!selectedStudent?.studentId) return;
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
    if (!selectedStudent?.studentId || !clientRequestId) return;
    setSubmitBusy(true);
    setSubmitError("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/students/${encodeURIComponent(selectedStudent.studentId)}/coin-credit`,
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
        setSubmitError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
        return;
      }
      const data = body.data || {};
      setSuccess({
        duplicate: body.duplicate === true,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
        amountCredited: data.amountCredited,
      });
      if (data.balanceAfter != null) {
        patchChild(selectedStudent.studentId, { balance: data.balanceAfter });
      }
      void refreshStudentActivity(selectedStudent.studentId);
      if (eventsOpen) {
        void loadRecentEvents(selectedStudent.studentId);
      }
      setModalOpen(false);
    } catch {
      setSubmitError(apiErrorMessageHe(null, ADMIN_LOAD_ERROR));
    } finally {
      setSubmitBusy(false);
    }
  };

  const selectedActivity = selectedStudent?.lastActivity;

  return (
    <div className="text-right w-full max-w-full overflow-x-hidden">
      <p className="text-xs text-white/60 mb-4">
        חיפוש לפי מייל הורה, בחירת ילד, מעקב פעילות והוספת מטבעות - לתמיכה ובקרה.
      </p>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4 w-full max-w-xl">
        <label htmlFor={`${formId}-parent-email`} className="block text-sm font-semibold mb-2">
          כתובת מייל של הורה
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={`${formId}-parent-email`}
            type="email"
            dir="ltr"
            autoComplete="email"
            className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
            placeholder="parent@example.com"
            value={parentEmailInput}
            onChange={(e) => setParentEmailInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void loadChildren()}
            disabled={loadPhase === "loading"}
            className="shrink-0 rounded-lg bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loadPhase === "loading" ? ADMIN_LOADING : "טען ילדים"}
          </button>
        </div>
        {loadError ? <p className="text-red-300 text-sm mt-2">{loadError}</p> : null}
      </section>

      {loadPhase === "ok" && children.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4 w-full max-w-xl">
          <p className="text-sm text-white/50 mb-3">
            ילדים של {parentEmail || "-"} ({children.length})
          </p>
          <ul className="space-y-3">
            {children.map((child) => (
              <li
                key={child.studentId}
                className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{child.fullName || "-"}</p>
                  {child.gradeLabelHe ? (
                    <p className="text-xs text-white/60 mt-0.5">{child.gradeLabelHe}</p>
                  ) : null}
                  <p className="text-sm text-amber-200 mt-1">
                    {formatBalance(child.balance)} מטבעות
                  </p>
                  <p className="text-xs text-white/50 mt-1">{lastActivityListLine(child)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => selectStudent(child)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${
                    selectedStudent?.studentId === child.studentId
                      ? "bg-emerald-600/50 border border-emerald-400/60"
                      : "bg-white/10 border border-white/20 hover:bg-white/15"
                  }`}
                >
                  בחר ילד
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loadPhase === "ok" && children.length === 0 ? (
        <p className="text-white/60 text-sm mb-4">לא נמצאו ילדים משויכים להורה זה.</p>
      ) : null}

      {selectedStudent ? (
        <section className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 mb-4 w-full max-w-xl">
          <p className="text-xs text-emerald-200/80 mb-2 font-semibold">ילד נבחר</p>
          <p className="text-sm text-white/50 mb-1">שם הילד</p>
          <p className="text-base font-semibold mb-3">{selectedStudent.fullName || "-"}</p>
          <p className="text-sm text-white/50 mb-1">מייל ההורה</p>
          <p className="text-sm mb-3 break-all" dir="ltr">
            {parentEmail || "-"}
          </p>
          <p className="text-sm text-white/50 mb-1">יתרה נוכחית</p>
          <p className="text-lg font-bold text-amber-200 mb-3">
            {formatBalance(selectedStudent.balance)} מטבעות
          </p>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3 mb-4 text-sm">
            <p className="text-white/50 text-xs mb-1">פעילות אחרונה</p>
            {selectedActivity?.hasActivity && selectedActivity?.atLabelHe ? (
              <>
                <p className="font-semibold text-white mb-1">{selectedActivity.atLabelHe}</p>
                <p className="text-white/80 text-xs leading-relaxed">
                  {selectedActivity.detailLineHe || selectedActivity.shortLineHe}
                </p>
              </>
            ) : (
              <p className="text-white/70">אין פעילות מתועדת</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={openEvents}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
            >
              אירועים אחרונים
            </button>
            <button
              type="button"
              onClick={openModal}
              className="rounded-lg bg-emerald-600/40 border border-emerald-400/50 px-4 py-2 text-sm font-semibold hover:bg-emerald-600/50"
            >
              הוסף מטבעות
            </button>
          </div>
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
              <> · נוספו: {formatBalance(success.amountCredited)}</>
            ) : null}
          </p>
        </div>
      ) : null}

      {eventsOpen && selectedStudent ? (
        <AdminModal
          open
          onClose={closeEvents}
          title="אירועים אחרונים"
          titleId={`${formId}-events-title`}
          size="lg"
          footer={
            <AdminModalButton onClick={closeEvents}>סגור</AdminModalButton>
          }
        >
          <p className="text-xs text-white/50 mb-3">
            {selectedStudent.fullName || "-"} · עד 20 אירועים
          </p>
          {eventsPhase === "loading" ? (
            <p className="text-sm text-white/60">{ADMIN_LOADING}</p>
          ) : eventsPhase === "error" ? (
            <p className="text-sm text-red-300">{eventsError}</p>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-white/60">אין אירועים מתועדים</p>
          ) : (
            <ul className="space-y-2 text-xs text-white/85">
              {recentEvents.map((ev, i) => (
                <li
                  key={`${ev.atIso}-${i}`}
                  className="rounded border border-white/10 bg-black/25 px-2 py-1.5 leading-relaxed break-words"
                >
                  {ev.displayLineHe || `${ev.atLabelHe} - ${ev.lineHe}`}
                </li>
              ))}
            </ul>
          )}
        </AdminModal>
      ) : null}

      {modalOpen && selectedStudent ? (
        <AdminModal
          open
          onClose={closeModal}
          title="הוספת מטבעות לילד"
          titleId={`${formId}-modal-title`}
          size="md"
          footer={
            <>
              <AdminModalButton onClick={closeModal} disabled={submitBusy}>
                ביטול
              </AdminModalButton>
              <AdminModalButton
                variant="primary"
                onClick={() => void submitCredit()}
                disabled={submitBusy || !amount}
                busy={submitBusy}
                busyLabel="מוסיף..."
              >
                הוסף מטבעות לילד
              </AdminModalButton>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-white/50 mb-1">שם הילד</p>
              <p className="font-semibold">{selectedStudent.fullName || "-"}</p>
            </div>
            <div>
              <p className="text-white/50 mb-1">יתרה נוכחית</p>
              <p className="font-semibold text-amber-200">
                {formatBalance(selectedStudent.balance)} מטבעות
              </p>
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
                placeholder="אופציונלי - לתיעוד פנימי"
              />
            </div>
          </div>

          {submitError ? <p className="text-red-300 text-sm mt-3">{submitError}</p> : null}
        </AdminModal>
      ) : null}
    </div>
  );
}
