import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import {
  SCHOOL_STAFF_CODE_LABEL,
  SCHOOL_STAFF_LOGIN_BUSY,
  SCHOOL_STAFF_LOGIN_FAILED,
  SCHOOL_STAFF_LOGIN_LOCKED,
  SCHOOL_STAFF_LOGIN_SUBMIT,
  SCHOOL_STAFF_LOGIN_SUBTITLE,
  SCHOOL_STAFF_LOGIN_SUSPENDED,
  SCHOOL_STAFF_LOGIN_TITLE,
  SCHOOL_STAFF_PIN_LABEL,
} from "../../../lib/school-portal/school-ui.he";

async function postStaffLogin(payload) {
  const res = await fetch("/api/school/staff/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function staffLoginErrorHe(code) {
  if (code === "account_locked") return SCHOOL_STAFF_LOGIN_LOCKED;
  if (code === "not_authorized" || code === "suspended") return SCHOOL_STAFF_LOGIN_SUSPENDED;
  return SCHOOL_STAFF_LOGIN_FAILED;
}

export default function SchoolStaffLoginPage() {
  const router = useRouter();
  const [staffCode, setStaffCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    fetch("/api/teacher/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 403) {
          const json = await res.json().catch(() => ({}));
          if (json?.error?.code === "pin_change_required") {
            router.replace("/school/staff/change-pin");
            return;
          }
        }
        if (res.status !== 200) return;
        const json = await res.json().catch(() => ({}));
        const redirect =
          json?.data?.schoolMembership?.portalRole === "school_operator"
            ? "/school/operator/dashboard"
            : "/teacher/dashboard";
        router.replace(redirect);
      })
      .catch(() => {});
  }, [router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    const result = await postStaffLogin({ staffCode, pin });
    setBusy(false);
    if (result.status === 200) {
      const redirect = result.body?.data?.redirectPath || "/teacher/dashboard";
      router.replace(redirect);
      return;
    }
    setErrorMsg(staffLoginErrorHe(result.body?.error?.code));
  };

  return (
    <Layout>
      <TeacherPortalShell title={SCHOOL_STAFF_LOGIN_TITLE}>
        <div data-testid="school-staff-login-root" dir="rtl" lang="he">
          <p className="text-white/70 text-sm mb-6">{SCHOOL_STAFF_LOGIN_SUBTITLE}</p>
          <form onSubmit={(e) => void onSubmit(e)} className="max-w-md space-y-4">
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SCHOOL_STAFF_CODE_LABEL}</span>
              <input
                type="text"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 font-mono"
                dir="ltr"
                autoComplete="off"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SCHOOL_STAFF_PIN_LABEL}</span>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 font-mono"
                dir="ltr"
                autoComplete="off"
                maxLength={4}
                required
              />
            </label>
            {errorMsg ? (
              <p className="text-red-300 text-sm" role="alert">
                {errorMsg}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 disabled:opacity-60"
            >
              {busy ? SCHOOL_STAFF_LOGIN_BUSY : SCHOOL_STAFF_LOGIN_SUBMIT}
            </button>
          </form>
        </div>
      </TeacherPortalShell>
    </Layout>
  );
}
