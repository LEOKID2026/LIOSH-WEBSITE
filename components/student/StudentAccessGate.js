import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { setCachedStudentMe, invalidateStudentMeClientCache } from "../../lib/learning-client/studentMeClient";
import { StudentSessionProvider } from "./StudentSessionContext";

/** מותר לשמור ב־next= אחרי login — ללא open redirect */
function isSafeNextPath(path) {
  return (
    typeof path === "string" &&
    !path.startsWith("//") &&
    !path.includes("://") &&
    (path.startsWith("/learning") || path.startsWith("/student/"))
  );
}

export default function StudentAccessGate({ children }) {
  const router = useRouter();
  /** @type {[{ status: "loading" | "ok" | "blocked", student: object | null }, function]: any} */
  const [session, setSession] = useState({ status: "loading", student: null });

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    const pathForNext = router.asPath || "/learning";
    invalidateStudentMeClientCache();
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (res.ok && payload?.student?.id) {
          if (isStudentIdentityDiagnosticsEnabled()) {
            console.log("[StudentAccessGate] /me student", {
              id: payload.student?.id,
              fullName: payload.student?.full_name,
              gradeLevel: payload.student?.grade_level,
              debug: payload.debugStudentIdentity,
            });
          }
          setCachedStudentMe(payload);
          syncStudentLocalStorageIdentity(payload.student, "StudentAccessGate after /me");
          if (isStudentIdentityDiagnosticsEnabled()) {
            console.log("[StudentAccessGate] localStorage after sync", {
              liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
              mleo_player_name: localStorage.getItem("mleo_player_name"),
            });
          }
          setSession({ status: "ok", student: payload.student });
          return;
        }
        setSession({ status: "blocked", student: null });
        const target = isSafeNextPath(pathForNext) ? pathForNext : "/learning";
        router.replace(`/student/login?next=${encodeURIComponent(target)}`);
      })
      .catch(() => {
        if (!mounted) return;
        setSession({ status: "blocked", student: null });
      });
    return () => {
      mounted = false;
    };
    // רק isReady — לא router.asPath (משתנה בתדירות גבוהה בהידרציה/broadcast ומפעיל לולאת replace → שגיאת ריצה).
  }, [router.isReady]);

  const providerValue = useMemo(
    () => ({
      status: session.status,
      student: session.student,
    }),
    [session.status, session.student]
  );

  return (
    <StudentSessionProvider value={providerValue}>
      {session.status === "loading" ? (
        <div className="max-w-3xl mx-auto px-4 py-10">בודק התחברות תלמיד...</div>
      ) : session.status !== "ok" ? (
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
          <p>יש להתחבר כתלמיד כדי להמשיך</p>
          <Link
            href="/student/login"
            className="inline-block rounded bg-amber-500 text-black px-3 py-2 font-semibold"
          >
            כניסת תלמיד
          </Link>
        </div>
      ) : (
        children
      )}
    </StudentSessionProvider>
  );
}
