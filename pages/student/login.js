import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";

function resolveNextTarget(router) {
  const raw = router.query?.next;
  if (typeof raw !== "string") return "/student/home";
  const decoded = decodeURIComponent(raw);
  if (
    decoded.startsWith("/student") &&
    !decoded.startsWith("//") &&
    !decoded.includes("://")
  ) {
    return decoded;
  }
  if (
    decoded.startsWith("/learning") &&
    !decoded.startsWith("//") &&
    !decoded.includes("://")
  ) {
    return decoded;
  }
  return "/student/home";
}

export function redirectAfterStudentLogin(router) {
  if (typeof window === "undefined") return;
  window.location.assign(resolveNextTarget(router));
}

export default function StudentLoginPage() {
  const router = useRouter();
  const [authView, setAuthView] = useState("default");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionCheck, setSessionCheck] = useState("pending");

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) {
          redirectAfterStudentLogin(router);
          return;
        }
        setSessionCheck("none");
      })
      .catch(() => {
        if (mounted) setSessionCheck("none");
      });
    return () => {
      mounted = false;
    };
  }, [router.isReady, router]);

  if (sessionCheck === "pending") {
    return (
      <Layout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
          <div className="h-10 w-10 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin mb-3" aria-hidden />
          <p className="text-white/85">בודקים חיבור...</p>
        </div>
      </Layout>
    );
  }

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (isStudentIdentityDiagnosticsEnabled()) {
        console.log("[student-login-page] submitting username", username);
      }

      const res = await fetch("/api/student/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(
          authView === "teacher_code"
            ? "שם המשתמש או הקוד שגויים."
            : payload.error || "כניסה נכשלה"
        );
        return;
      }

      if (payload?.student?.id) {
        syncStudentLocalStorageIdentity(payload.student, "student-login-page after login");
      }

      redirectAfterStudentLogin(router);
    } catch (_e) {
      setMessage("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">כניסת תלמיד</h1>

        {authView === "default" ? (
          <>
            <form onSubmit={submitLogin} className="space-y-3">
              <div>
                <label className="text-sm text-white/80">שם משתמש</label>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="שם משתמש"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-sm text-white/80">PIN</label>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN"
                  required
                  inputMode="numeric"
                  autoComplete="current-password"
                />
              </div>
              <button
                className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                {busy ? "מבצע פעולה..." : "כניסה"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthView("teacher_code");
                  setMessage("");
                }}
                className="w-full rounded border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                קיבלתי קוד מהמורה
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setAuthView("default");
                setMessage("");
              }}
              className="mb-4 text-sm text-amber-300 hover:underline"
            >
              ← חזרה לכניסה רגילה
            </button>

            <form onSubmit={submitLogin} className="space-y-3 rounded-xl border border-white/15 bg-black/30 p-4">
              <label className="block text-sm">
                <span className="text-white/80">שם משתמש</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="שם המשתמש שקיבלתם מהמורה"
                  required
                  autoComplete="username"
                />
              </label>
              <label className="block text-sm">
                <span className="text-white/80">קוד כניסה</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="הקוד שקיבלתם מהמורה"
                  required
                  inputMode="numeric"
                  autoComplete="current-password"
                />
              </label>
              <button
                className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                {busy ? "מתחבר…" : "כניסה ללמידה"}
              </button>
            </form>
          </>
        )}

        {message ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {message}
          </p>
        ) : null}

        <p className="mt-6 text-sm text-white/70">
          <Link href="/learning" className="underline text-amber-300">
            חזרה ללמידה
          </Link>
        </p>
      </div>
    </Layout>
  );
}
