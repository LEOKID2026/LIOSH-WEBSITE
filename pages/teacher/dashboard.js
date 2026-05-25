import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
export async function getServerSideProps() {
  const { isTeacherPortalLinkEnabled: linkEnabled } = await import(
    "../../lib/teacher-server/teacher-session.server.js"
  );
  return {
    props: {
      linkEnabled: linkEnabled(),
    },
  };
}

async function fetchTeacherMe(accessToken) {
  const res = await fetch("/api/teacher/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function postTeacherOnboard(accessToken) {
  const res = await fetch("/api/teacher/onboard", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fetchTeacherStudents(accessToken) {
  const res = await fetch("/api/teacher/students", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fetchTeacherClasses(accessToken) {
  const res = await fetch("/api/teacher/classes", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export default function TeacherDashboardPage({ linkEnabled }) {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [state, setState] = useState("loading");
  const [mePayload, setMePayload] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [classError, setClassError] = useState("");
  const [classBusy, setClassBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }

    let mounted = true;

    async function load() {
      const supabase = supabaseRef.current;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        if (mounted) {
          setState("unauthenticated");
          router.replace("/teacher/login");
        }
        return;
      }

      let me = await fetchTeacherMe(token);
      if (!mounted) return;

      if (me.status === 401 || me.status === 403) {
        await supabase.auth.signOut();
        router.replace(me.status === 403 ? "/" : "/teacher/login");
        return;
      }

      if (me.status === 404 && me.body?.error?.code === "teacher_profile_missing") {
        const onboard = await postTeacherOnboard(token);
        if (!mounted) return;
        if (onboard.status === 200 || onboard.status === 201) {
          me = await fetchTeacherMe(token);
        } else if (onboard.body?.error?.code === "db_schema_not_ready") {
          setState("schema_not_ready");
          return;
        } else {
          await supabase.auth.signOut();
          router.replace("/teacher/login");
          return;
        }
      }

      if (me.status !== 200 || !me.body?.data) {
        await supabase.auth.signOut();
        router.replace(me.status === 403 ? "/" : "/teacher/login");
        return;
      }

      const [studentsRes, classesRes] = await Promise.all([
        fetchTeacherStudents(token),
        fetchTeacherClasses(token),
      ]);
      if (!mounted) return;

      if (studentsRes.status !== 200 || classesRes.status !== 200) {
        setState("data_load_error");
        return;
      }

      setAccessToken(token);
      setMePayload(me.body.data);
      setStudents(studentsRes.body.data?.students || []);
      setClasses(classesRes.body.data?.classes || []);
      setState("ready");
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const onLogout = async () => {
    const supabase = supabaseRef.current;
    if (supabase) await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  const onCreateClass = async () => {
    if (!accessToken || !newClassName.trim()) return;
    setClassBusy(true);
    setClassError("");
    const res = await fetch("/api/teacher/classes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ name: newClassName.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setClassBusy(false);
    if (res.status === 201) {
      setShowCreateClass(false);
      setNewClassName("");
      const listed = await fetchTeacherClasses(accessToken);
      if (listed.status === 200) setClasses(listed.body.data?.classes || []);
      return;
    }
    if (body?.error?.code === "class_limit_reached") {
      setClassError("הגעת למספר הכיתות המרבי בתוכנית שלך.");
    } else {
      setClassError("לא ניתן ליצור כיתה. נסה שנית.");
    }
  };

  if (state === "loading" || state === "unauthenticated") {
    return (
      <Layout>
        <TeacherPortalShell>
          <p className="text-white/60" data-testid="teacher-dashboard-root" data-state={state}>
            טוען…
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "schema_not_ready" || state === "data_load_error") {
    const msg =
      state === "schema_not_ready"
        ? "המערכת עדיין מתכוננת. נסה שנית בעוד מספר דקות."
        : "אירעה שגיאה בטעינת הנתונים. רענן את הדף ונסה שנית.";
    return (
      <Layout>
        <TeacherPortalShell title="לוח הבקרה שלי">
          <p className="text-red-300" data-testid="teacher-dashboard-root" data-state={state} role="alert">
            {msg}
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  const displayName = mePayload?.teacher?.displayName;
  const activeClasses = classes.filter((c) => !c.isArchived);

  return (
    <Layout>
      <div
        data-testid="teacher-dashboard-root"
        data-state="ready"
        data-teacher-id={mePayload?.teacher?.teacherId || ""}
        data-link-enabled={linkEnabled ? "true" : "false"}
      >
        <TeacherPortalShell title="לוח הבקרה שלי">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <p className="text-white/80">
              {displayName ? `שלום, ${displayName}` : "שלום"}
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            >
              יציאה
            </button>
          </div>

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">מנוי וגבולות</h2>
            <p className="text-sm text-white/80">תוכנית בסיסית</p>
            <p className="text-sm text-white/70 mt-2">
              תלמידים מקושרים: {mePayload?.counters?.activeStudentLinks ?? 0} מתוך{" "}
              {mePayload?.limits?.studentLimit ?? "—"}
            </p>
            <p className="text-sm text-white/70">
              כיתות פעילות: {mePayload?.counters?.activeClasses ?? 0} מתוך{" "}
              {mePayload?.limits?.classLimit ?? "—"}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">התלמידים שלי</h2>
            {students.length === 0 ? (
              <>
                <p className="text-white/70 text-sm mb-2">
                  עדיין לא קישרת תלמידים. ניתן לקשר תלמיד לאחר שהורה מאשר.
                </p>
                {linkEnabled ? (
                  <p className="text-white/60 text-xs">
                    לקישור תלמיד חדש — בקש מההורה לשלוח לך קוד הסכמה.
                  </p>
                ) : null}
              </>
            ) : (
              <ul className="space-y-2">
                {students.map((s) => (
                  <li
                    key={s.studentId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <span>{s.studentFullNameMasked || "תלמיד"}</span>
                    <Link
                      href={`/teacher/student/${s.studentId}`}
                      className="text-amber-300 text-sm font-semibold hover:underline"
                    >
                      צפה בדוח
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold">הכיתות שלי</h2>
              <button
                type="button"
                className="rounded bg-amber-500 text-black text-sm font-semibold px-3 py-1.5"
                onClick={() => setShowCreateClass(true)}
              >
                כיתה חדשה
              </button>
            </div>
            {activeClasses.length === 0 ? (
              <p className="text-white/70 text-sm">
                עדיין אין כיתות. לחץ על &quot;כיתה חדשה&quot; כדי להתחיל.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeClasses.map((c) => (
                  <li
                    key={c.classId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <span>
                      {c.name}
                      <span className="text-white/50 text-sm mr-2">
                        · {c.studentCount ?? 0} תלמידים
                      </span>
                    </span>
                    <Link
                      href={`/teacher/class/${c.classId}`}
                      className="text-amber-300 text-sm font-semibold hover:underline"
                    >
                      דוח כיתה
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {classes.some((c) => c.isArchived) ? (
              <p className="text-xs text-white/50 mt-3">
                כיתות בארכיון: {classes.filter((c) => c.isArchived).map((c) => c.name).join("، ")}
              </p>
            ) : null}
          </section>

          {showCreateClass ? (
            <div className="mt-6 p-4 rounded-xl border border-white/15 bg-black/40 space-y-3">
              <h3 className="font-semibold">כיתה חדשה</h3>
              <label className="block text-sm">
                <span className="text-white/70">שם הכיתה</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="למשל: כיתה ד׳ 2026"
                />
              </label>
              {classError ? (
                <p className="text-red-300 text-sm" role="alert">
                  {classError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded bg-amber-500 text-black font-semibold px-4 py-2 text-sm disabled:opacity-60"
                  disabled={classBusy}
                  onClick={onCreateClass}
                >
                  צור כיתה
                </button>
                <button
                  type="button"
                  className="rounded border border-white/20 px-4 py-2 text-sm"
                  onClick={() => {
                    setShowCreateClass(false);
                    setClassError("");
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : null}
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
