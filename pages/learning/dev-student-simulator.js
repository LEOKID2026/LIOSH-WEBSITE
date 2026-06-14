import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Layout from "../../components/Layout";

const DevStudentSimulatorClient = dynamic(
  () => import("../../components/dev-student-simulator/DevStudentSimulatorClient"),
  { ssr: false, loading: () => <p style={{ padding: 24 }}>טוען סימולטור…</p> }
);

export async function getServerSideProps(ctx) {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true };
  }

  const mod = await import("../../utils/server/dev-student-simulator-auth");
  if (!mod.isDevStudentSimulatorEnabled()) {
    return { notFound: true };
  }
  const raw = mod.getDevStudentSimulatorCookieRaw(ctx.req.headers.cookie);
  const session = mod.verifySessionToken(raw);
  return { props: { authorized: Boolean(session) } };
}

export default function DevStudentSimulatorPage({ authorized }) {
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const res = await fetch("/api/dev-student-simulator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setLoginError("סיסמה שגויה.");
        } else if (res.status === 503) {
          setLoginError("השרת לא מוגדר להפעלת הסימולטור.");
        } else {
          setLoginError(`ההתחברות נכשלה (${res.status}).`);
        }
        return;
      }
      window.location.reload();
    } catch (err) {
      setLoginError(String(err?.message || err));
    } finally {
      setLoginBusy(false);
    }
  };

  if (!authorized) {
    return (
      <Layout>
        <Head>
          <title>סימולטור ילדים לפיתוח</title>
        </Head>
        <main
          dir="rtl"
          lang="he"
          style={{ minHeight: "50vh", padding: 24, maxWidth: 480, margin: "0 auto" }}
        >
          <h1 style={{ fontSize: 22 }}>סימולטור ילדים לפיתוח</h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            התחברות עם סיסמת הפיתוח שהוגדרה בשרת. האזור הזה מוסתר כאשר הדגל כבוי.
          </p>
          <form onSubmit={handleLogin} style={{ marginTop: 20 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
              סיסמה
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={loginBusy}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 10, fontSize: 15, boxSizing: "border-box" }}
              />
            </label>
            {loginError ? (
              <p style={{ color: "#b91c1c", fontSize: 14, marginTop: 8 }} role="alert">
                {loginError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loginBusy || !password}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                fontSize: 15,
                borderRadius: 6,
                border: "1px solid #1d4ed8",
                background: "#1d4ed8",
                color: "#fff",
                cursor: loginBusy || !password ? "not-allowed" : "pointer",
              }}
            >
              {loginBusy ? "מתחבר…" : "כניסה"}
            </button>
          </form>
          <p style={{ marginTop: 28, fontSize: 14 }}>
            <Link href="/learning">חזרה למרכז הלמידה</Link>
          </p>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>סימולטור ילדים לפיתוח</title>
      </Head>
      <main dir="rtl" lang="he" style={{ padding: "24px 12px 56px", background: "#020617", minHeight: "100vh" }}>
        <DevStudentSimulatorClient />
      </main>
    </Layout>
  );
}
