import { useCallback, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";

const PARENT_NOT_FOUND_HE = "לא נמצא הורה עם כתובת המייל הזו";

/**
 * Parent email → children list → grant card to selected student.
 */
export default function AdminCardGrantByParent({ accessToken, cardId, onMessage }) {
  const [parentEmailInput, setParentEmailInput] = useState("");
  const [children, setChildren] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadPhase, setLoadPhase] = useState("idle");
  const [loadError, setLoadError] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);

  const loadChildren = useCallback(async () => {
    const email = parentEmailInput.trim();
    if (!email) {
      setLoadError("יש להזין כתובת מייל של הורה");
      return;
    }
    setLoadPhase("loading");
    setLoadError("");
    setSelectedStudentId("");
    setChildren([]);
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
      const list = Array.isArray(body.data?.students) ? body.data.students : [];
      setChildren(list);
      setLoadPhase("ok");
      if (list.length === 1) setSelectedStudentId(list[0].studentId);
    } catch {
      setLoadPhase("error");
      setLoadError(ADMIN_LOAD_ERROR);
    }
  }, [accessToken, parentEmailInput]);

  const grantCard = async () => {
    if (!cardId) return;
    if (!selectedStudentId) {
      onMessage?.("בחרו ילד מהרשימה.");
      return;
    }
    setGrantBusy(true);
    try {
      const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${cardId}/grant`, {
        method: "POST",
        body: JSON.stringify({ student_id: selectedStudentId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage?.(apiErrorMessageHe(body?.error, "הענקה נכשלה"));
        return;
      }
      onMessage?.(body.alreadyOwned ? "הילד כבר מחזיק בקלף." : "קלף הוענק לילד.");
    } finally {
      setGrantBusy(false);
    }
  };

  return (
    <div className="border-t border-white/10 pt-3 mt-3 space-y-3">
      <h4 className="text-xs font-bold text-white/80">הענקת קלף לילד</h4>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs flex-1 min-w-[200px]">
          מייל הורה
          <input
            type="email"
            dir="ltr"
            className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-sm"
            value={parentEmailInput}
            onChange={(e) => setParentEmailInput(e.target.value)}
            placeholder="parent@example.com"
          />
        </label>
        <button
          type="button"
          disabled={loadPhase === "loading"}
          onClick={() => void loadChildren()}
          className="rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {loadPhase === "loading" ? "מחפש..." : "חיפוש ילדים"}
        </button>
      </div>

      {loadError ? <p className="text-xs text-red-300">{loadError}</p> : null}

      {loadPhase === "ok" && children.length === 0 ? (
        <p className="text-xs text-white/50">לא נמצאו ילדים תחת הורה זה.</p>
      ) : null}

      {children.length > 0 ? (
        <ul className="space-y-2 text-xs">
          {children.map((child) => {
            const selected = selectedStudentId === child.studentId;
            const gradeLabel =
              child.gradeLevel != null && child.gradeLevel !== ""
                ? `כיתה ${child.gradeLevel}`
                : null;
            return (
              <li key={child.studentId}>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId(child.studentId)}
                  className={`w-full text-right rounded-lg border px-3 py-2 transition ${
                    selected
                      ? "border-sky-400/50 bg-sky-500/15"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                >
                  <span className="font-semibold">{child.fullName || "ילד"}</span>
                  {gradeLabel ? (
                    <span className="text-white/60 mr-2"> · {gradeLabel}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedStudentId ? (
        <button
          type="button"
          disabled={grantBusy}
          onClick={() => void grantCard()}
          className="rounded border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {grantBusy ? "מעניק..." : "הענק קלף לילד"}
        </button>
      ) : null}
    </div>
  );
}
