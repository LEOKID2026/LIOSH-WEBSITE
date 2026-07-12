import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import PortalLoginHeading from "../../../components/auth/PortalLoginHeading";
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
      <div className="max-w-md mx-auto px-3 md:px-4 py-3 md:py-8" dir="rtl" lang="he">
        <PortalLoginHeading
          title={SCHOOL_STAFF_LOGIN_TITLE}
          subtitle={SCHOOL_STAFF_LOGIN_SUBTITLE}
          className="!mb-3 md:!mb-4"
          homeHref="/teachers"
        />
        <div data-testid="school-staff-login-root">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            <label className="block text-sm">
              <span className="text-white/80">{SCHOOL_STAFF_CODE_LABEL}</span>
              <input
                type="text"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2 font-mono"
                dir="ltr"
                autoComplete="off"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">{SCHOOL_STAFF_PIN_LABEL}</span>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2 font-mono"
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
              className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
            >
              {busy ? SCHOOL_STAFF_LOGIN_BUSY : SCHOOL_STAFF_LOGIN_SUBMIT}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
