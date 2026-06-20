import { useState } from "react";
import AdminModal, { AdminModalButton } from "./AdminModal.jsx";
import AdminSchoolStaffLifecycleCompact from "./AdminSchoolStaffLifecycleCompact.jsx";
import {
  ADMIN_SCHOOL_ASSIGN_MANAGER,
  ADMIN_SCHOOL_ASSIGN_TEACHER,
  ADMIN_SCHOOL_FORCE_REASSIGN,
  apiErrorMessageHe,
} from "../../lib/admin-portal/admin-ui.he.js";

const inputClass =
  "mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2 text-sm";

export function SchoolCreateFormFields({ draft, setDraft }) {
  return (
    <div className="space-y-3 text-sm text-right">
      <label className="block">
        <span className="text-white/70">שם בית הספר</span>
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          required
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-white/70">עיר</span>
        <input
          value={draft.city}
          onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-white/70">דוא״ל ליצירת קשר</span>
        <input
          type="email"
          value={draft.contactEmail}
          onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
          className={inputClass}
        />
      </label>
    </div>
  );
}

/** @deprecated Use SchoolCreateFormFields inside AdminModal on schools index */
export function SchoolCreateForm({ onCreate, busy }) {
  const [draft, setDraft] = useState({ name: "", city: "", contactEmail: "" });
  return (
    <form
      className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3 text-right"
      onSubmit={(e) => {
        e.preventDefault();
        void onCreate(draft);
      }}
    >
      <h2 className="font-semibold text-base">יצירת בית ספר חדש</h2>
      <SchoolCreateFormFields draft={draft} setDraft={setDraft} />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
      >
        {busy ? "שומר…" : "יצירה"}
      </button>
    </form>
  );
}

export function SchoolTeacherAssignFormFields({ draft, setDraft, showForce = false }) {
  return (
    <div className="space-y-3 text-sm text-right">
      <label className="block">
        <span className="text-white/70">מזהה מורה</span>
        <input
          value={draft.teacherId}
          onChange={(e) => setDraft((d) => ({ ...d, teacherId: e.target.value }))}
          placeholder="מזהה מורה"
          required
          className={inputClass}
        />
      </label>
      {showForce ? (
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={draft.force}
            onChange={(e) => setDraft((d) => ({ ...d, force: e.target.checked }))}
          />
          {ADMIN_SCHOOL_FORCE_REASSIGN}
        </label>
      ) : null}
    </div>
  );
}

export function SchoolTeacherAssignForm({ label, onAssign, busy, showForce = false }) {
  const [teacherId, setTeacherId] = useState("");
  const [force, setForce] = useState(false);

  return (
    <form
      className="space-y-2 text-right"
      onSubmit={(e) => {
        e.preventDefault();
        void onAssign({ teacherId: teacherId.trim(), force });
      }}
    >
      <p className="text-sm font-medium text-white/80">{label}</p>
      <SchoolTeacherAssignFormFields
        draft={{ teacherId, force }}
        setDraft={(updater) => {
          const next = typeof updater === "function" ? updater({ teacherId, force }) : updater;
          setTeacherId(next.teacherId);
          setForce(next.force);
        }}
        showForce={showForce}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "מבצע…" : "שיוך"}
      </button>
    </form>
  );
}

export function SchoolTeacherAssignPanel({ accessToken, schoolId, onReload }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [assignKind, setAssignKind] = useState(null);
  const [draft, setDraft] = useState({ teacherId: "", force: false });

  const closeAssign = () => {
    if (busy) return;
    setAssignKind(null);
    setDraft({ teacherId: "", force: false });
    setError("");
  };

  const openAssign = (kind) => {
    setAssignKind(kind);
    setDraft({ teacherId: "", force: false });
    setError("");
  };

  const post = async (path, body, kind) => {
    setError("");
    setBusy(kind);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(data?.error, "שגיאה"));
        return false;
      }
      onReload?.();
      closeAssign();
      return true;
    } finally {
      setBusy("");
    }
  };

  const saveAssign = async () => {
    const teacherId = draft.teacherId.trim();
    if (!teacherId) return;
    if (assignKind === "teacher") {
      await post(`/api/admin/schools/${schoolId}/assign-teacher`, {
        teacherId,
        force: draft.force,
      }, "teacher");
    } else if (assignKind === "manager") {
      await post(`/api/admin/schools/${schoolId}/assign-manager`, { teacherId }, "manager");
    }
  };

  const assignTitle =
    assignKind === "manager" ? ADMIN_SCHOOL_ASSIGN_MANAGER : ADMIN_SCHOOL_ASSIGN_TEACHER;
  const assignBusy =
    assignKind === "teacher" ? busy === "teacher" : assignKind === "manager" ? busy === "manager" : false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={() => openAssign("teacher")}
          className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold"
        >
          {ADMIN_SCHOOL_ASSIGN_TEACHER}
        </button>
        <button
          type="button"
          onClick={() => openAssign("manager")}
          className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold"
        >
          {ADMIN_SCHOOL_ASSIGN_MANAGER}
        </button>
      </div>
      {error && !assignKind ? (
        <p className="text-red-300 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <AdminModal
        open={!!assignKind}
        onClose={closeAssign}
        title={assignTitle}
        size="md"
        footer={
          <>
            <AdminModalButton onClick={closeAssign} disabled={!!busy}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant="primary"
              onClick={() => void saveAssign()}
              disabled={!!busy || !draft.teacherId.trim()}
              busy={assignBusy}
              busyLabel="מבצע…"
            >
              שיוך
            </AdminModalButton>
          </>
        }
      >
        {error && assignKind ? <p className="text-red-300 text-sm mb-3">{error}</p> : null}
        <SchoolTeacherAssignFormFields
          draft={draft}
          setDraft={setDraft}
          showForce={assignKind === "teacher"}
        />
      </AdminModal>
    </div>
  );
}

export function SchoolTeachersList({ teachers, accessToken, onReload }) {
  if (!teachers?.length) {
    return <p className="text-white/60 text-sm">אין מורים משויכים.</p>;
  }

  return (
    <ul className="space-y-2">
      {teachers.map((t) => (
        <li
          key={t.membershipId}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
        >
          <div className="text-right min-w-0 flex-1">
            <p className="font-medium">{t.displayName || t.teacherId}</p>
            <p className="text-xs text-white/50">
              {t.role === "school_admin"
                ? "מנהל/ת"
                : t.role === "school_operator"
                  ? "מזכיר/ות"
                  : "מורה"}
            </p>
            {accessToken ? (
              <AdminSchoolStaffLifecycleCompact
                accessToken={accessToken}
                teacherId={t.teacherId}
                role={t.role}
                onChanged={onReload}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
