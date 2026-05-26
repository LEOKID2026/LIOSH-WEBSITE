import { useState } from "react";
import {
  ADMIN_SCHOOL_ASSIGN_MANAGER,
  ADMIN_SCHOOL_ASSIGN_TEACHER,
  ADMIN_SCHOOL_FORCE_REASSIGN,
  ADMIN_SCHOOL_REMOVE_TEACHER,
} from "../../lib/admin-portal/admin-ui.he.js";

export function SchoolCreateForm({ onCreate, busy }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  return (
    <form
      className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3 text-right"
      onSubmit={(e) => {
        e.preventDefault();
        void onCreate({ name, city, contactEmail });
      }}
    >
      <h2 className="font-semibold text-base">יצירת בית ספר חדש</h2>
      <label className="block text-sm">
        <span className="text-white/70">שם בית הספר</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-white/70">עיר</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-white/70">דוא״ל ליצירת קשר</span>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
        />
      </label>
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
      <input
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        placeholder="מזהה מורה (UUID)"
        required
        className="w-full rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
      />
      {showForce ? (
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          {ADMIN_SCHOOL_FORCE_REASSIGN}
        </label>
      ) : null}
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

  const post = async (path, body) => {
    setError("");
    setBusy(path);
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
        setError(data?.error?.message || data?.error?.code || "שגיאה");
        return;
      }
      onReload?.();
    } finally {
      setBusy("");
    }
  };

  const remove = async (teacherId) => {
    setError("");
    setBusy("remove");
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}/teachers/${teacherId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || data?.error?.code || "שגיאה");
        return;
      }
      onReload?.();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SchoolTeacherAssignForm
        label={ADMIN_SCHOOL_ASSIGN_TEACHER}
        showForce
        busy={busy === "teacher"}
        onAssign={({ teacherId, force }) =>
          post(`/api/admin/schools/${schoolId}/assign-teacher`, { teacherId, force })
        }
      />
      <SchoolTeacherAssignForm
        label={ADMIN_SCHOOL_ASSIGN_MANAGER}
        busy={busy === "manager"}
        onAssign={({ teacherId }) =>
          post(`/api/admin/schools/${schoolId}/assign-manager`, { teacherId })
        }
      />
      {error ? (
        <p className="md:col-span-2 text-red-300 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <p className="md:col-span-2 text-xs text-white/50">
        {ADMIN_SCHOOL_REMOVE_TEACHER}: הסרה מדף פרטי בית הספר (ליד כל מורה).
      </p>
    </div>
  );
}

export function SchoolTeachersList({ teachers, schoolId, accessToken, onReload }) {
  const [busyId, setBusyId] = useState("");

  const remove = async (teacherId) => {
    setBusyId(teacherId);
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}/teachers/${teacherId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "same-origin",
      });
      if (res.ok) onReload?.();
    } finally {
      setBusyId("");
    }
  };

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
          <div className="text-right min-w-0">
            <p className="font-medium">{t.displayName || t.teacherId}</p>
            <p className="text-xs text-white/50">
              {t.role === "school_admin" ? "מנהל/ת" : "מורה"} · {t.teacherId}
            </p>
          </div>
          <button
            type="button"
            disabled={busyId === t.teacherId}
            onClick={() => void remove(t.teacherId)}
            className="text-xs text-red-300 hover:underline disabled:opacity-50"
          >
            {busyId === t.teacherId ? "מסיר…" : "הסרה"}
          </button>
        </li>
      ))}
    </ul>
  );
}
