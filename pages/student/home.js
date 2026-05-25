import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import {
  clearAllStudentScopedBrowserStorage,
  syncStudentLocalStorageIdentity,
} from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { buildStudentHomeView } from "../../lib/learning-client/studentHomeDashboardClient";
import {
  invalidateStudentLearningProfileClientCache,
} from "../../lib/learning-client/studentLearningProfileClient";
import { formatGradeLevelHe } from "../../lib/learning-student-defaults";
import StudentAvatarPickerModal from "../../components/student/StudentAvatarPickerModal";
import StudentDailyMissionsPanel from "../../components/student/StudentDailyMissionsPanel";
import StudentMonthlyPersistencePanel from "../../components/student/StudentMonthlyPersistencePanel";
import StudentClassroomActivitiesPanel from "../../components/student/StudentClassroomActivitiesPanel";

const HOME_PROFILE_PATH = "/api/student/home-profile";

function mapApiErrorToHebrew(raw) {
  const s = String(raw || "").trim();
  if (!s) return "טעינת נתוני הלמידה מהשרת נכשלה.";
  if (s === "Student session expired") return "פג תוקף החיבור — התחברו שוב.";
  if (s === "Server error") return "שגיאת שרת בטעינת נתוני הלמידה.";
  return s;
}

function LoadingScreen({ message }) {
  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="h-12 w-12 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin mb-4" aria-hidden />
        <p className="text-white/90 text-lg font-medium">{message}</p>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 md:px-3 md:py-2.5 shadow-inner shadow-black/20 min-h-[4.25rem] flex flex-col justify-center">
      <p className="text-[11px] md:text-xs text-white/65 mb-0.5 leading-snug line-clamp-2">{label}</p>
      <p className="text-lg md:text-xl font-bold text-white tabular-nums leading-tight">{value}</p>
      {sub ? <p className="text-[10px] text-white/45 mt-0.5 leading-tight line-clamp-2">{sub}</p> : null}
    </div>
  );
}

export default function StudentHomePage() {
  const router = useRouter();
  const [authPhase, setAuthPhase] = useState("checking");
  const [student, setStudent] = useState(null);
  const [homePayload, setHomePayload] = useState(null);
  const [profilePhase, setProfilePhase] = useState("idle");
  const [profileError, setProfileError] = useState("");
  const [logoutMessage, setLogoutMessage] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [heroAvatarImage, setHeroAvatarImage] = useState(null);
  const [heroAvatarEmoji, setHeroAvatarEmoji] = useState("👤");

  const loadHomeDashboard = useCallback(async () => {
    setProfilePhase("loading");
    setProfileError("");
    setHomePayload(null);
    try {
      const res = await fetch(HOME_PROFILE_PATH, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setProfileError(`תגובת השרת לא בפורמט תקין (קוד ${res.status}).`);
        setProfilePhase("error");
        if (isStudentIdentityDiagnosticsEnabled()) {
          console.warn("[student/home] home-profile JSON parse failed", { status: res.status, textHead: text.slice(0, 200) });
        }
        return;
      }

      if (isStudentIdentityDiagnosticsEnabled()) {
        console.info("[student/home] home-profile response", {
          httpStatus: res.status,
          okFlag: json?.ok,
          hasDerived: !!json?.derived,
          hasAccountSnapshot: !!json?.accountSnapshot,
          rowKeys: json?.subjectsProgressOnly ? Object.keys(json.subjectsProgressOnly) : [],
        });
      }

      if (!res.ok || json?.ok !== true || !json?.derived || !json?.accountSnapshot) {
        const errRaw = json?.error != null ? String(json.error) : "";
        const detail = json?.detail != null ? String(json.detail) : "";
        const combined = [mapApiErrorToHebrew(errRaw), detail && isStudentIdentityDiagnosticsEnabled() ? `(${detail})` : ""]
          .filter(Boolean)
          .join(" ");
        setProfileError(combined || mapApiErrorToHebrew(""));
        setProfilePhase("error");
        return;
      }

      setHomePayload(json);
      setProfilePhase("ok");
    } catch (e) {
      setProfileError("שגיאת רשת");
      setProfilePhase("error");
      if (isStudentIdentityDiagnosticsEnabled()) {
        console.warn("[student/home] home-profile fetch threw", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    setAuthPhase("checking");
    setStudent(null);
    setHomePayload(null);
    setProfilePhase("idle");
    setProfileError("");

    fetch("/api/student/me", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (isStudentIdentityDiagnosticsEnabled()) {
          console.info("[student/home] /api/student/me", { httpStatus: res.status, hasStudent: !!payload?.student?.id });
        }
        if (!res.ok || !payload?.student?.id) {
          setAuthPhase("anon");
          router.replace("/student/login");
          return;
        }

        syncStudentLocalStorageIdentity(payload.student, "student/home after /me");
        setStudent(payload.student);
        setAuthPhase("authed");
        void loadHomeDashboard();
      })
      .catch(() => {
        if (!mounted) return;
        setAuthPhase("anon");
        router.replace("/student/login");
      });

    return () => {
      mounted = false;
    };
  }, [router.isReady, router, loadHomeDashboard]);

  const dashboardView = useMemo(() => {
    if (!student?.id || profilePhase !== "ok" || !homePayload) return null;
    try {
      const v = buildStudentHomeView({ student, homePayload });
      if (isStudentIdentityDiagnosticsEnabled() && v) {
        console.info("[student/home] dashboard view built", {
          summaryLevel: v.accountStats?.summaryLevel,
          summaryStars: v.accountStats?.summaryStars,
          bestScore: v.accountStats?.bestScoreOverall,
          questions: v.accountStats?.questionsAnswered,
        });
      }
      return v;
    } catch (e) {
      if (isStudentIdentityDiagnosticsEnabled()) {
        console.error("[student/home] buildStudentHomeView threw", e);
      }
      return null;
    }
  }, [student, homePayload, profilePhase]);

  const refreshHeroAvatarFromBrowser = useCallback(() => {
    if (typeof window === "undefined") return;
    const rowProf =
      homePayload?.profile && typeof homePayload.profile === "object" && !Array.isArray(homePayload.profile)
        ? homePayload.profile
        : null;
    const serverCustom =
      rowProf && typeof rowProf.avatarCustomDataUrl === "string" && rowProf.avatarCustomDataUrl.trim().startsWith("data:image/")
        ? rowProf.avatarCustomDataUrl.trim()
        : null;
    const img = localStorage.getItem("mleo_player_avatar_image");
    const em = localStorage.getItem("mleo_player_avatar");
    const profEmoji = rowProf?.avatarEmoji;
    const fromDashEmoji = dashboardView?.identity?.avatarEmoji;
    const fromDashCustom = dashboardView?.identity?.avatarCustomDataUrl;

    if (serverCustom || (typeof fromDashCustom === "string" && fromDashCustom.trim().startsWith("data:image/"))) {
      const url = serverCustom || String(fromDashCustom).trim();
      setHeroAvatarImage(url);
      setHeroAvatarEmoji("👤");
      return;
    }
    if (img) {
      setHeroAvatarImage(img);
      setHeroAvatarEmoji("👤");
      return;
    }
    setHeroAvatarImage(null);
    const pick =
      (em && String(em).trim()) ||
      (profEmoji != null && String(profEmoji).trim() !== "" ? String(profEmoji).trim() : "") ||
      (fromDashEmoji && String(fromDashEmoji).trim()) ||
      "👤";
    setHeroAvatarEmoji(pick.slice(0, 8));
  }, [homePayload?.profile, dashboardView?.identity?.avatarEmoji, dashboardView?.identity?.avatarCustomDataUrl]);

  useEffect(() => {
    refreshHeroAvatarFromBrowser();
  }, [refreshHeroAvatarFromBrowser]);

  const mergeHomeLearningProfileAvatar = useCallback((partial) => {
    setHomePayload((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      const profile =
        prev.profile && typeof prev.profile === "object" && !Array.isArray(prev.profile)
          ? { ...prev.profile }
          : {};
      if (partial && typeof partial === "object") {
        if (Object.prototype.hasOwnProperty.call(partial, "emoji")) {
          if (partial.emoji != null && String(partial.emoji).trim() !== "") {
            profile.avatarEmoji = String(partial.emoji).trim().slice(0, 8);
          } else {
            delete profile.avatarEmoji;
          }
        }
        if (Object.prototype.hasOwnProperty.call(partial, "customDataUrl")) {
          if (partial.customDataUrl != null && String(partial.customDataUrl).trim() !== "") {
            profile.avatarCustomDataUrl = String(partial.customDataUrl).trim();
          } else {
            delete profile.avatarCustomDataUrl;
          }
        }
      }
      return { ...prev, profile };
    });
  }, []);
  const profilePending = profilePhase === "idle" || profilePhase === "loading";
  const buildFailed = profilePhase === "ok" && !dashboardView;

  const onLogout = async () => {
    setLogoutMessage("");
    const sid = student?.id;
    setLogoutBusy(true);
    try {
      await fetch("/api/student/logout", { method: "POST", credentials: "include" });
      clearAllStudentScopedBrowserStorage(sid);
      invalidateStudentLearningProfileClientCache();
      setStudent(null);
      setHomePayload(null);
      setProfilePhase("idle");
      setAuthPhase("anon");
      await router.replace("/student/login");
    } catch {
      setLogoutMessage("שגיאת רשת בעת יציאה");
    } finally {
      setLogoutBusy(false);
    }
  };

  if (authPhase === "checking" || authPhase === "anon") {
    return <LoadingScreen message={authPhase === "anon" ? "מעבירים לכניסה..." : "טוען את דף הבית..."} />;
  }

  if (!student) {
    return <LoadingScreen message="טוען..." />;
  }

  const heroName = String(student.full_name || "").trim() || "תלמיד";
  const heroGrade =
    student.grade_level != null && student.grade_level !== "" ? formatGradeLevelHe(student.grade_level) : "";
  const heroCoins = Number(student.coin_balance) || 0;
  const heroTagline =
    dashboardView?.identity?.friendlyLineHe ?? "כאן מוצגים הנתונים מהשרת אחרי התחברות.";

  const accLabel = (pct) => (pct == null ? "עדיין אין נתונים" : `${pct}%`);

  return (
    <Layout>
      <div key={student.id} className="max-w-6xl mx-auto px-3 sm:px-4 py-6 md:py-10 pb-16 space-y-6 md:space-y-8 overflow-x-hidden">
        <section className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 via-[#0c1224] to-indigo-950/40 p-5 md:p-8 shadow-xl shadow-black/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="group shrink-0 rounded-2xl border border-white/10 bg-black/30 text-5xl md:text-6xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center cursor-pointer transition hover:border-emerald-400/50 hover:bg-black/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                title="בחירת אווטר"
                aria-label="פתח בחירת אווטר"
              >
                {heroAvatarImage ? (
                  <img
                    src={heroAvatarImage}
                    alt=""
                    className="h-[85%] w-[85%] rounded-full object-cover"
                  />
                ) : (
                  <span className="leading-none" aria-hidden>
                    {heroAvatarEmoji}
                  </span>
                )}
              </button>
              <div className="min-w-0 text-right">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">שלום {heroName}</h1>
                <p className="text-white/80 mt-1 text-sm md:text-base">
                  {heroGrade ? heroGrade : "עדיין אין נתונים"}
                </p>
                <p className="text-amber-200/95 mt-1 text-sm font-semibold tabular-nums">מטבעות: {heroCoins}</p>
                <p className="text-emerald-200/90 mt-2 text-sm md:text-base leading-relaxed">{heroTagline}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 shrink-0">
              <Link
                href="/learning"
                className="inline-flex justify-center items-center rounded-xl bg-emerald-500 text-black font-bold px-5 py-3 text-sm md:text-base hover:bg-emerald-400 transition shadow-lg shadow-emerald-900/40"
              >
                התחל ללמוד
              </Link>
              <Link
                href="/student/arcade"
                className="inline-flex justify-center items-center rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-3 text-sm md:text-base font-semibold text-amber-100 hover:bg-amber-500/25 transition"
              >
                משחקים
              </Link>
              <button
                type="button"
                disabled={logoutBusy}
                onClick={() => void onLogout()}
                className="inline-flex justify-center items-center rounded-xl border border-rose-400/40 bg-rose-500/15 px-5 py-3 text-sm md:text-base font-semibold text-rose-100 hover:bg-rose-500/25 transition disabled:opacity-50"
              >
                {logoutBusy ? "יוצאים..." : "התנתקות"}
              </button>
            </div>
          </div>
          {logoutMessage ? <p className="text-rose-200 text-sm mt-4 text-right">{logoutMessage}</p> : null}
        </section>

        {profilePending ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 animate-pulse space-y-4">
            <div className="h-4 bg-white/10 rounded w-1/3 mr-auto" />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="h-20 md:h-[4.25rem] rounded-xl bg-white/5" />
              ))}
            </div>
            <div className="h-36 rounded-2xl bg-white/5" />
            <div className="h-48 rounded-2xl bg-white/5" />
          </div>
        ) : null}

        {profilePhase === "error" && !profilePending ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 p-5 text-right space-y-3">
            <p className="text-amber-100 font-semibold">לא הצלחנו לטעון את נתוני ההתקדמות מהשרת</p>
            <p className="text-white/80 text-sm leading-relaxed">
              פרטי החשבון (שם, כיתה, מטבעות) עדיין מההתחברות. נתוני רמה, כוכבים, שאלות ודקות למידה לא הוצגו כדי
              שלא יופיעו אפסים מטעים.
            </p>
            <p className="text-white/70 text-sm">{profileError}</p>
            <button
              type="button"
              onClick={() => void loadHomeDashboard()}
              className="rounded-xl bg-amber-500 text-black font-bold px-4 py-2 text-sm hover:bg-amber-400"
            >
              נסו שוב
            </button>
          </div>
        ) : null}

        {buildFailed ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-right">
            <p className="text-rose-100 font-semibold mb-2">שגיאה בעיבוד הנתונים</p>
            <p className="text-white/75 text-sm mb-4">השרת החזיר תשובה תקינה אבל לא ניתן היה לבנות את לוח הבקרה.</p>
            <button
              type="button"
              onClick={() => void loadHomeDashboard()}
              className="rounded-xl bg-rose-500/90 text-white font-bold px-4 py-2 text-sm hover:bg-rose-400"
            >
              נסו שוב
            </button>
          </div>
        ) : null}

        {dashboardView ? (
          <>
            <section>
              <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 text-right">הנתונים שלי</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3">
                <StatCard label="מטבעות" value={dashboardView.identity.coinBalance} />
                <StatCard label="רמה" value={dashboardView.accountStats.summaryLevel} />
                <StatCard label="כוכבים (סה״כ)" value={dashboardView.accountStats.summaryStars} />
                <StatCard label="ניקוד שיא" value={dashboardView.accountStats.bestScoreOverall} />
                <StatCard label="שיא רצף" value={dashboardView.accountStats.bestStreakOverall} />
                <StatCard label="דיוק כללי" value={accLabel(dashboardView.accountStats.overallAccuracyPct)} />
                <StatCard label="שאלות שנענו" value={dashboardView.accountStats.questionsAnswered} />
                <StatCard label="תשובות נכונות" value={dashboardView.accountStats.correctAnswers} />
                <StatCard
                  label="דקות למידה החודש"
                  value={dashboardView.accountStats.learningMinutesThisMonth}
                  sub={`יעד חודשי: ${dashboardView.accountStats.monthlyGoalMinutes} דק׳`}
                />
                <StatCard
                  label="דקות למידה מצטברות"
                  value={dashboardView.accountStats.learningMinutesLifetimeRounded}
                  sub="מפי סיכומי פגישות"
                />
              </div>
            </section>

            <StudentDailyMissionsPanel dailyMissions={dashboardView.dailyMissions} />

            <StudentMonthlyPersistencePanel monthlyPersistence={dashboardView.monthlyPersistence} />

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4 text-right">מסע חודשי</h2>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="flex-1 space-y-3 text-right">
                  <p className="text-white/90">
                    דקות החודש:{" "}
                    <span className="font-bold text-emerald-300 tabular-nums">
                      {dashboardView.monthlyJourney.minutesThisMonth}
                    </span>{" "}
                    / <span className="tabular-nums">{dashboardView.monthlyJourney.goalMinutes}</span>
                  </p>
                  <div className="h-3 rounded-full bg-black/40 overflow-hidden border border-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500 transition-all duration-500"
                      style={{ width: `${dashboardView.monthlyJourney.progressPct}%` }}
                    />
                  </div>
                  <p className="text-sm text-white/75">{dashboardView.monthlyJourney.encouragementHe}</p>
                  {dashboardView.monthlyJourney.selectedRewardLabel ? (
                    <p className="text-sm text-amber-200/95">
                      פרס שנבחר לחודש:{" "}
                      <span className="font-semibold">{dashboardView.monthlyJourney.selectedRewardLabel}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-white/55">
                      עדיין לא נבחר פרס לחודש — אפשר לבחור מעמוד הנושא אחרי התקדמות.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <StudentClassroomActivitiesPanel />

            <section>
              <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">הנושאים שלי</h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {dashboardView.subjects.map((s) => (
                  <div
                    key={s.key}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-4 flex flex-col text-right shadow-lg"
                  >
                    <h3 className="text-lg font-bold text-white mb-2">{s.labelHe}</h3>
                    <div className="text-sm text-white/70 space-y-1 mb-3 flex-1">
                      <p>דיוק: {s.accuracyPct != null ? `${s.accuracyPct}%` : "עדיין אין נתונים"}</p>
                      <p>
                        שאלות / נכונות: {s.answersTotal} / {s.correctTotal}
                      </p>
                      <p>
                        רמה {s.level} · כוכבים {s.stars}
                      </p>
                      <p className="text-xs text-white/55">דקות למידה (הערכה): {s.sessionMinutesRounded}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/40 mb-3 overflow-hidden">
                      <div className="h-full bg-sky-500/80 rounded-full" style={{ width: `${s.progressIndicatorPct}%` }} />
                    </div>
                    <Link
                      href={s.href}
                      className="mt-auto inline-flex justify-center rounded-xl bg-sky-500/90 hover:bg-sky-400 text-black font-bold py-2.5 text-sm transition"
                    >
                      כניסה לנושא
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4 text-right">תגים והישגים</h2>
              {dashboardView.badges.length === 0 ? (
                <p className="text-white/70 text-right leading-relaxed">
                  עדיין אין תגים — אפשר להתחיל ללמוד ולצבור הישגים בכל נושא.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2 justify-end">
                  {dashboardView.badges.map((b, i) => (
                    <li
                      key={`${b.label}-${i}`}
                      className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-50"
                    >
                      {b.label}
                      <span className="text-white/45 text-xs mr-1">({b.subjectLabelHe})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">המשך ללמוד</h2>
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {dashboardView.recommendations.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-4 md:p-5 text-right flex flex-col"
                  >
                    <h3 className="font-bold text-violet-100 mb-2">{r.titleHe}</h3>
                    <p className="text-sm text-white/75 flex-1 mb-4">{r.descriptionHe}</p>
                    <Link
                      href={r.href}
                      className="inline-flex justify-center rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold py-2.5 text-sm transition"
                    >
                      {r.ctaHe}
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
      <StudentAvatarPickerModal
        open={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        playerName={heroName}
        serverAvatarEmoji={
          homePayload?.profile && typeof homePayload.profile === "object" && !Array.isArray(homePayload.profile)
            ? homePayload.profile.avatarEmoji
            : dashboardView?.identity?.avatarEmoji
        }
        onAvatarEmojiPersisted={(emoji) => {
          mergeHomeLearningProfileAvatar({ emoji });
        }}
        onAvatarCustomDataUrlPersisted={(customDataUrl) => {
          mergeHomeLearningProfileAvatar({ customDataUrl });
        }}
        onAvatarChanged={() => {
          refreshHeroAvatarFromBrowser();
        }}
      />
    </Layout>
  );
}
