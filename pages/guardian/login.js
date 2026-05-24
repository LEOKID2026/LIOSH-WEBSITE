import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";

export async function getServerSideProps(context) {
  return {
    props: {
      inviteToken: typeof context.query?.invite === "string" ? context.query.invite : null,
    },
  };
}

async function postGuardianLogin(payload, inviteToken) {
  const qs = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : "";
  const res = await fetch(`/api/guardian/login${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload || {}),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export default function GuardianLoginPage({ inviteToken }) {
  const router = useRouter();
  const [loginUsername, setLoginUsername] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const autoInviteRan = useRef(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/guardian/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        if (!mounted) return;
        if (res.status === 200) {
          router.replace("/guardian/view");
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!inviteToken || autoInviteRan.current) return;
    autoInviteRan.current = true;
    setBusy(true);
    setState("invite_loading");
    postGuardianLogin({}, inviteToken).then(({ status, body }) => {
      setBusy(false);
      if (status === 200) {
        router.replace("/guardian/view");
        return;
      }
      setState("invite_failed");
      if (body?.error?.code === "session_revoked" || body?.error?.code === "access_expired") {
        setErrorMsg("הגישה שלכם פגה תוקפה או בוטלה. פנו למורה לחידוש.");
      } else {
        setErrorMsg("הקישור לא תקף או פג תוקפו. בקשו מהמורה קישור חדש.");
      }
    });
  }, [inviteToken, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setState("idle");
    setErrorMsg("");
    const result = await postGuardianLogin({ loginUsername, pin }, null);
    setBusy(false);
    if (result.status === 200) {
      router.replace("/guardian/view");
      return;
    }
    setState("login_failed");
    if (
      result.body?.error?.code === "session_revoked" ||
      result.body?.error?.code === "access_expired"
    ) {
      setErrorMsg("הגישה שלכם פגה תוקפה או בוטלה. פנו למורה לחידוש.");
    } else {
      setErrorMsg("שם המשתמש או הקוד שגויים. פנו למורה לקבלת פרטים מעודכנים.");
    }
  };

  return (
    <Layout>
      <TeacherPortalShell title="כניסה לצפייה בדוח">
        <div data-testid="guardian-login-root" data-state={state}>
          <p className="text-white/70 text-sm mb-6">
            קיבלתם פרטי כניסה מהמורה? הכניסו אותם כאן.
          </p>

          {inviteToken ? (
            <div data-testid="guardian-login-invite" data-busy={busy ? "1" : "0"}>
              {state === "invite_loading" || busy ? (
                <p className="text-white/70">מתחבר דרך הקישור…</p>
              ) : null}
              {state === "invite_failed" && errorMsg ? (
                <p className="text-red-300 text-sm" role="alert">
                  {errorMsg}
                </p>
              ) : null}
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-4 max-w-md"
              data-testid="guardian-login-form"
            >
              <label className="block text-sm">
                <span className="text-white/80">שם משתמש</span>
                <input
                  data-testid="guardian-login-username"
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="שם המשתמש שקיבלת"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-white/80">קוד כניסה</span>
                <input
                  data-testid="guardian-login-pin"
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder="הקוד שקיבלת"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                data-testid="guardian-login-submit"
                className="rounded bg-amber-500 text-black font-semibold px-6 py-2 disabled:opacity-60"
              >
                {busy ? "מתחבר…" : "כניסה"}
              </button>
            </form>
          )}

          {errorMsg && state === "login_failed" ? (
            <p className="mt-4 text-red-300 text-sm" role="alert">
              {errorMsg}
            </p>
          ) : null}
        </div>
      </TeacherPortalShell>
    </Layout>
  );
}
