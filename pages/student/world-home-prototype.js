import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import PageSeo from "../../components/seo/PageSeo";
import {
  clearAllStudentScopedBrowserStorage,
  syncStudentLocalStorageIdentity,
} from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { buildStudentHomeView } from "../../lib/learning-client/studentHomeDashboardClient";
import {
  invalidateStudentLearningProfileClientCache,
} from "../../lib/learning-client/studentLearningProfileClient";
import {
  getCachedStudentHomePayload,
  mergeStudentHomePayloads,
  setCachedStudentHomePayload,
  invalidateStudentHomeProfileClientCache,
  shouldSkipClientAchievementGrants,
  markClientAchievementGrantsCompleted,
  getClientAchievementGrantsInFlight,
  setClientAchievementGrantsInFlight,
  clearClientAchievementGrantsInFlight,
} from "../../lib/learning-client/studentHomeProfileClient";
import { invalidateStudentMeClientCache, getCachedStudentMe, setCachedStudentMe } from "../../lib/learning-client/studentMeClient";
import { STUDENT_TRUTH_LABELS_HE } from "../../lib/learning-shared/student-display-truth.js";
import StudentAvatarPickerModal from "../../components/student/StudentAvatarPickerModal";
import {
  readProfileBackgroundFromLocalStorage,
  resolveProfileBackgroundKey,
} from "../../lib/student-ui/profile-background.client.js";
import StudentHomeModal from "../../components/student/StudentHomeModal";
import StudentDailyMissionsPanel from "../../components/student/StudentDailyMissionsPanel";
import StudentMonthlyPersistencePanel from "../../components/student/StudentMonthlyPersistencePanel";
import StudentClassroomActivitiesPanel from "../../components/student/StudentClassroomActivitiesPanel";
import StudentWorksheetsPanel from "../../components/worksheet-activities/StudentWorksheetsPanel";
import { isClassroomActivitiesEnabled } from "../../lib/classroom-activities/classroom-activities-labels.client.js";
import { normalizeStudentActivityScope } from "../../lib/classroom-activities/student-activity-scope-labels.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentSurpriseBoxOpenModal from "../../components/student/rewards/StudentSurpriseBoxOpenModal";
import { isCardRewardsEnabledClient } from "../../lib/rewards/reward-feature-flags.client.js";
import { patchSurpriseBoxStatusFromOpenResult } from "../../lib/rewards/surprise-box-status-patch.client.js";
import StudentWorldTitleScreen from "../../components/student-world-hub/StudentWorldTitleScreen.jsx";
import { GUEST_LOCK_MESSAGE_HE, GUEST_LOCKED_HOME_PANELS, LIOSH_GUEST_RESUME_TOKEN_KEY } from "../../lib/guest/constants.js";
import { isGuestStudent } from "../../lib/guest/guest-display.js";
import { shouldClearGuestResumeTokenOnLogout } from "../../lib/guest/guest-resume-token.client.js";
import StudentLoadingPanel from "../../components/ui/StudentLoadingPanel.jsx";

import { syncMonthlyProgressCacheFromServer } from "../../utils/progress-storage.js";

const HOME_SUMMARY_PATH = "/api/student/home-profile/summary";
const HOME_ANALYTICS_PATH = "/api/student/home-profile/analytics";
const HOME_ACHIEVEMENT_GRANTS_PATH = "/api/student/home-profile/achievement-grants";

const PROTOTYPE_PATH = "/student/world-home-prototype";

const studentHomeSeo = {
  title: "עולם הילדים - אב טיפוס",
  description: "אב טיפוס למסך פתיחת עולם הילדים בליאו",
  canonicalPath: PROTOTYPE_PATH,
  noindex: true,
};

function mapApiErrorToHebrew(raw) {
  const s = String(raw || "").trim();
  if (!s) return "טעינת נתוני הלמידה מהשרת נכשלה.";
  if (s === "Student session expired") return "פג תוקף החיבור - התחברו שוב.";
  if (s === "Server error") return "שגיאת שרת בטעינת נתוני הלמידה.";
  if (/[A-Za-z]{4,}/.test(s)) return "טעינת נתוני הלמידה מהשרת נכשלה.";
  return s;
}

function LoadingScreen({ message }) {
  const { theme } = useStudentTheme();
  return (
    <Layout studentTheme={theme} studentShell="home">
      <PageSeo
        title={studentHomeSeo.title}
        description={studentHomeSeo.description}
        canonicalPath={studentHomeSeo.canonicalPath}
        noindex={studentHomeSeo.noindex}
      />
      <StudentLoadingPanel message={message} reportPage />
    </Layout>
  );
}

function StatCard({ label, value, sub }) {
  const { tokens: T } = useStudentTheme();
  return (
    <div className={T.statCard}>
      <p className={T.statLabel}>{label}</p>
      <p className={T.statValue}>{value}</p>
      {sub ? <p className={T.statSub}>{sub}</p> : null}
    </div>
  );
}

const HOME_PANELS = {
  stats: { title: "הנתונים שלי", emoji: "📊", size: "6xl", variant: "stats" },
  progress: { title: "ההתקדמות שלי", emoji: "📈", size: "2xl", variant: "progress" },
  missions: { title: "המשימות שלי", emoji: "✅", size: "2xl", variant: "missions" },
  classroom: { title: "פעילויות אישיות", emoji: "📋", size: "4xl", variant: "classroom" },
  worksheets: { title: "דפי עבודה", emoji: "📄", size: "4xl", variant: "worksheets" },
  subjects: { title: "הנושאים שלי", emoji: "📚", size: "6xl", variant: "subjects" },
  badges: { title: "תגים והישגים", emoji: "🏅", size: "2xl", variant: "badges" },
  recommendations: { title: "המלצות להמשך", emoji: "💡", size: "4xl", variant: "recommendations" },
};

function StatsSection({ dashboardView, accLabel }) {
  const { tokens: T } = useStudentTheme();
  const { accountStats: s } = dashboardView;
  return (
    <>
      <p className={T.panelIntro}>
        סיכום ההתקדמות שלך בכל הנושאים - רמה, כוכבים, דיוק ודקות למידה.
      </p>
      <div className={T.statsSummaryCard}>
        <p className={T.statsSummaryTitle}>במבט מהיר</p>
        <div className={T.statsSummaryGrid}>
          <div className={T.statsSummaryItem}>
            <p className={T.statsSummaryLabel}>רמה</p>
            <p className={T.statsSummaryValue}>{s.summaryLevel}</p>
          </div>
          <div className={T.statsSummaryItem}>
            <p className={T.statsSummaryLabel}>כוכבים</p>
            <p className={T.statsSummaryValue}>{s.summaryStars}</p>
            <p className="text-[10px] text-slate-500">{s.summaryStarsScopeHe}</p>
          </div>
          <div className={T.statsSummaryItem}>
            <p className={T.statsSummaryLabel}>דיוק</p>
            <p className={T.statsSummaryValue}>{accLabel(s.overallAccuracyPct)}</p>
          </div>
          <div className={T.statsSummaryItem}>
            <p className={T.statsSummaryLabel}>מטבעות</p>
            <p className={T.statsSummaryValue}>{dashboardView.identity.coinBalanceDisplayHe ?? dashboardView.identity.coinBalance ?? "-"}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3">
        <StatCard label="ניקוד שיא" value={s.bestScoreOverall} />
        <StatCard label="שיא רצף" value={s.bestStreakOverall} />
        <StatCard label="שאלות שנענו" value={s.questionsAnswered} />
        <StatCard label="תשובות נכונות" value={s.correctAnswers} />
        <StatCard
          label="דקות למידה החודש"
          value={s.learningMinutesThisMonthDisplayHe ?? s.learningMinutesThisMonth ?? STUDENT_TRUTH_LABELS_HE.noData}
          sub={`יעד: ${s.monthlyGoalMinutes} דק׳ · ${s.learningMinutesFilterNoteHe || STUDENT_TRUTH_LABELS_HE.periodThisMonth}`}
        />
        <StatCard
          label="דקות מצטברות"
          value={s.learningMinutesLifetimeDisplayHe ?? s.learningMinutesLifetimeRounded}
          sub={s.learningMinutesLifetimeScopeHe || "מפי סיכומי פגישות"}
        />
      </div>
    </>
  );
}

function SubjectsSection({ subjects }) {
  const { tokens: T, subjectAccentBar } = useStudentTheme();
  const subjectKeyAccent = {
    math: subjectAccentBar["math-master"],
    geometry: subjectAccentBar["geometry-master"],
    english: subjectAccentBar["english-master"],
    science: subjectAccentBar["science-master"],
    hebrew: subjectAccentBar["hebrew-master"],
    moledet_visual: subjectAccentBar["moledet-master"],
    geography_visual: subjectAccentBar["geography-master"],
    history: subjectAccentBar["history-master"],
  };
  return (
    <>
      <p className={T.panelIntro}>
        התקדמות לפי מקצוע - דיוק, שאלות, רמה וכוכבים. לחצו על "כניסה לנושא" כדי להתחיל לתרגל.
      </p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {subjects.map((s) => (
          <div key={s.key} className={T.subjectCard}>
            <span
              className={`${T.subjectAccentBar} ${subjectKeyAccent[s.key] || "bg-sky-400"}`}
              aria-hidden
            />
            <h3 className={T.subjectTitle}>{s.labelHe}</h3>
            <div className={`${T.subjectBody} flex-1`}>
              <div className={T.subjectStatRow}>
                <span className={T.subjectStatLabel}>דיוק</span>
                <span className={T.subjectStatValue}>{s.accuracyDisplayHe ?? "-"}</span>
              </div>
              <div className={T.subjectStatRow}>
                <span className={T.subjectStatLabel}>שאלות / נכונות</span>
                <span className={T.subjectStatValue}>
                  {s.answersDisplayHe ?? s.answersTotal} / {s.correctTotal}
                </span>
              </div>
              <div className={T.subjectStatRow}>
                <span className={T.subjectStatLabel}>רמה · כוכבים</span>
                <span className={T.subjectStatValue}>
                  {s.levelDisplayHe ?? s.level ?? "-"} · {s.stars ?? "-"}
                  {s.starsScopeHe ? ` (${s.starsScopeHe})` : ""}
                </span>
              </div>
              <div className={T.subjectStatRow}>
                <span className={T.subjectStatLabel}>דקות למידה</span>
                <span className={T.subjectStatValue}>
                  {s.sessionMinutesDisplayHe ?? s.sessionMinutesRounded ?? "-"}
                </span>
              </div>
            </div>
            {s.progressIndicatorPct != null ? (
              <div className={T.subjectProgressTrack}>
                <div
                  className={T.subjectProgressFill}
                  style={{ width: `${s.progressIndicatorPct}%` }}
                />
              </div>
            ) : null}
            <Link href={s.href} className={T.subjectLink}>
              כניסה לנושא
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

function BadgesSection({ badges }) {
  const { tokens: T } = useStudentTheme();
  if (badges.length === 0) {
    return (
      <p className={T.emptyText}>
        עדיין אין תגים - אפשר להתחיל ללמוד ולצבור הישגים בכל נושא.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2 justify-end">
      {badges.map((b, i) => (
        <li
          key={`${b.label}-${i}`}
          className={T.badgePill}
        >
          {b.label}
          <span className={T.badgeSubject}>({b.subjectLabelHe})</span>
        </li>
      ))}
    </ul>
  );
}

function RecommendationsSection({ recommendations }) {
  const { tokens: T } = useStudentTheme();
  return (
    <div className="grid md:grid-cols-2 gap-3 md:gap-4">
      {recommendations.map((r) => (
        <div
          key={r.id}
          className={T.recommendCard}
        >
          <h3 className={T.recommendTitle}>{r.titleHe}</h3>
          {r.hintHe ? <p className="text-xs text-slate-500 mb-1">{r.hintHe}</p> : null}
          <p className={T.recommendBody}>{r.descriptionHe}</p>
          <Link
            href={r.href}
            className={T.recommendCta}
          >
            {r.ctaHe}
          </Link>
        </div>
      ))}
    </div>
  );
}

/** Admin-only prototype — student world title screen (not production /student/home). */
export default function WorldHomePrototypePage() {
  const router = useRouter();
  const { tokens: T, theme, isBright } = useStudentTheme();
  const [authPhase, setAuthPhase] = useState("checking");
  const [student, setStudent] = useState(null);
  const [homePayload, setHomePayload] = useState(null);
  const [profilePhase, setProfilePhase] = useState("idle");
  const [analyticsPhase, setAnalyticsPhase] = useState("idle");
  const [profileError, setProfileError] = useState("");
  const [logoutMessage, setLogoutMessage] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [personalActivityCount, setPersonalActivityCount] = useState(0);
  const [personalActivities, setPersonalActivities] = useState([]);
  const [personalActivitiesPhase, setPersonalActivitiesPhase] = useState("idle");
  const [heroAvatarImage, setHeroAvatarImage] = useState(null);
  const [heroAvatarEmoji, setHeroAvatarEmoji] = useState("👤");
  const [heroAvatarBackground, setHeroAvatarBackground] = useState("sky");
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [boxRefreshToken, setBoxRefreshToken] = useState(0);
  const [surpriseBoxStatus, setSurpriseBoxStatus] = useState(null);
  const [diamondBalance, setDiamondBalance] = useState(null);
  const [guestPolicy, setGuestPolicy] = useState(null);
  const [lockToast, setLockToast] = useState("");
  const lockToastTimerRef = useRef(null);
  const cardRewardsEnabled = isCardRewardsEnabledClient();
  const handleSurpriseBoxOpened = useCallback((json) => {
    const patch = patchSurpriseBoxStatusFromOpenResult(json);
    if (patch) setSurpriseBoxStatus(patch);
    setBoxRefreshToken((token) => token + 1);
  }, []);
  const isGuestHome = Boolean(guestPolicy || student?.account_kind === "guest" || student?.accountKind === "guest");

  const guestLockedPanelSet = useMemo(() => {
    if (!isGuestHome) return new Set();
    const ids = guestPolicy?.lockedHomePanels || GUEST_LOCKED_HOME_PANELS;
    return new Set(ids);
  }, [guestPolicy, isGuestHome]);

  const loadDiamondBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/student/diamonds/balance", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok === true) {
        setDiamondBalance(json.balance);
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadHomeAchievementGrants = useCallback(async (studentId) => {
    const sid = String(studentId || "").trim();
    if (!sid) return;
    if (shouldSkipClientAchievementGrants(sid)) return;

    const inFlight = getClientAchievementGrantsInFlight();
    if (inFlight) return inFlight;

    const flight = (async () => {
      try {
        const res = await fetch(HOME_ACHIEVEMENT_GRANTS_PATH, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.ok === true) {
          markClientAchievementGrantsCompleted(sid);
        }
      } catch {
        /* non-fatal — grants retried after cooldown */
      } finally {
        clearClientAchievementGrantsInFlight();
      }
    })();

    setClientAchievementGrantsInFlight(flight);
    return flight;
  }, []);

  const loadHomeAnalytics = useCallback(async (studentId, summaryPayload) => {
    setAnalyticsPhase("loading");
    try {
      const res = await fetch(HOME_ANALYTICS_PATH, {
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
        setAnalyticsPhase("error");
        return;
      }

      if (!res.ok || json?.ok !== true) {
        setAnalyticsPhase("error");
        return;
      }

      if (json?.derived && studentId) {
        syncMonthlyProgressCacheFromServer(studentId, json.derived);
      }

      setCachedStudentHomePayload(studentId, { analytics: json });
      setHomePayload((prev) => mergeStudentHomePayloads(prev || summaryPayload, json));
      setAnalyticsPhase("ok");
    } catch {
      setAnalyticsPhase("error");
    }
  }, []);

  const loadHomeDashboard = useCallback(
    async (studentRecord) => {
      const studentId = studentRecord?.id;
      if (!studentId) return;

      const cached = getCachedStudentHomePayload(studentId);
      if (cached?.merged) {
        setHomePayload(cached.merged);
        setProfilePhase("ok");
        setAnalyticsPhase(cached.analytics ? "ok" : "idle");
      } else {
        setProfilePhase("loading");
        setHomePayload(null);
        setAnalyticsPhase("idle");
      }
      setProfileError("");

      try {
        const res = await fetch(HOME_SUMMARY_PATH, {
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
          if (!cached?.merged) {
            setProfileError(`תגובת השרת לא בפורמט תקין (קוד ${res.status}).`);
            setProfilePhase("error");
          }
          return;
        }

        if (isStudentIdentityDiagnosticsEnabled()) {
          console.info("[student/home] home-profile summary response", {
            httpStatus: res.status,
            okFlag: json?.ok,
            hasAccountSnapshot: !!json?.accountSnapshot,
            hasChallenges: !!json?.challenges,
          });
        }

        if (!res.ok || json?.ok !== true || !json?.studentId || !json?.accountSnapshot) {
          if (!cached?.merged) {
            const errRaw = json?.error != null ? String(json.error) : "";
            const detail = json?.detail != null ? String(json.detail) : "";
            const combined = [
              mapApiErrorToHebrew(errRaw),
              detail && isStudentIdentityDiagnosticsEnabled() ? `(${detail})` : "",
            ]
              .filter(Boolean)
              .join(" ");
            setProfileError(combined || mapApiErrorToHebrew(""));
            setProfilePhase("error");
          }
          return;
        }

        setCachedStudentHomePayload(studentId, { summary: json });
        const merged = mergeStudentHomePayloads(json, cached?.analytics);
        setHomePayload(merged);
        setProfilePhase("ok");

        void loadHomeAnalytics(studentId, json);
        void loadHomeAchievementGrants(studentId);
      } catch (e) {
        if (!cached?.merged) {
          setProfileError("שגיאת רשת");
          setProfilePhase("error");
        }
        if (isStudentIdentityDiagnosticsEnabled()) {
          console.warn("[student/home] home-profile summary fetch threw", e);
        }
      }
    },
    [loadHomeAnalytics, loadHomeAchievementGrants]
  );

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    setProfileError("");
    setPersonalActivities([]);
    setPersonalActivityCount(0);
    setPersonalActivitiesPhase("idle");

    const cachedMe = getCachedStudentMe();
    if (cachedMe?.student?.id) {
      setStudent(cachedMe.student);
      setAuthPhase("authed");
      const cachedHome = getCachedStudentHomePayload(cachedMe.student.id);
      if (cachedHome?.merged) {
        setHomePayload(cachedHome.merged);
        setProfilePhase("ok");
        setAnalyticsPhase(cachedHome.analytics ? "ok" : "idle");
      } else {
        setProfilePhase("idle");
        setHomePayload(null);
      }
    } else {
      setAuthPhase("checking");
      setStudent(null);
      setHomePayload(null);
      setProfilePhase("idle");
      setAnalyticsPhase("idle");
    }

    (async () => {
      try {
        const [meRes, summaryRes] = await Promise.all([
          fetch("/api/student/me", {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
          fetch(HOME_SUMMARY_PATH, {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
        ]);

        if (!mounted) return;

        const payload = await meRes.json().catch(() => ({}));
        if (isStudentIdentityDiagnosticsEnabled()) {
          console.info("[student/home] /api/student/me", {
            httpStatus: meRes.status,
            hasStudent: !!payload?.student?.id,
          });
        }
        if (!meRes.ok || !payload?.student?.id) {
          setAuthPhase("anon");
          router.replace("/student/login");
          return;
        }

        setCachedStudentMe(payload);
        syncStudentLocalStorageIdentity(payload.student, "student/home after /me");
        setStudent(payload.student);
        setGuestPolicy(payload.guestPolicy || null);
        setAuthPhase("authed");

        const summaryText = await summaryRes.text();
        let summaryJson = {};
        try {
          summaryJson = summaryText ? JSON.parse(summaryText) : {};
        } catch {
          if (!getCachedStudentHomePayload(payload.student.id)?.merged) {
            setProfileError(`תגובת השרת לא בפורמט תקין (קוד ${summaryRes.status}).`);
            setProfilePhase("error");
          }
          return;
        }

        if (summaryRes.ok && summaryJson?.ok === true && summaryJson?.accountSnapshot) {
          setCachedStudentHomePayload(payload.student.id, { summary: summaryJson });
          const cached = getCachedStudentHomePayload(payload.student.id);
          setHomePayload(mergeStudentHomePayloads(summaryJson, cached?.analytics));
          setProfilePhase("ok");
          void loadHomeAnalytics(payload.student.id, summaryJson);
          void loadHomeAchievementGrants(payload.student.id);
          return;
        }

        void loadHomeDashboard(payload.student);
      } catch {
        if (!mounted) return;
        setAuthPhase("anon");
        router.replace("/student/login");
      }
    })();

    return () => {
      mounted = false;
    };
    // רק isReady + loadHomeDashboard — לא router (משתנה בהידרציה ומבטל fetch באמצע → stuck על "טוען את דף הבית...").
  }, [router.isReady, loadHomeDashboard]);

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

  useEffect(() => {
    if (authPhase !== "authed" || !student?.id) {
      setPersonalActivities([]);
      setPersonalActivityCount(0);
      setPersonalActivitiesPhase("idle");
      return undefined;
    }
    if (!isClassroomActivitiesEnabled()) {
      setPersonalActivities([]);
      setPersonalActivityCount(0);
      setPersonalActivitiesPhase("idle");
      return undefined;
    }

    let cancelled = false;
    setPersonalActivitiesPhase("loading");

    (async () => {
      try {
        const res = await fetch("/api/student/activities", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || json?.ok !== true) {
          setPersonalActivities([]);
          setPersonalActivityCount(0);
          setPersonalActivitiesPhase("error");
          return;
        }
        const activities = Array.isArray(json.activities) ? json.activities : [];
        const count = activities.filter((a) => {
          const scope = normalizeStudentActivityScope(a.scope);
          return scope === "student" || scope === "parent";
        }).length;
        setPersonalActivities(activities);
        setPersonalActivityCount(count);
        setPersonalActivitiesPhase("ok");
      } catch {
        if (cancelled) return;
        setPersonalActivities([]);
        setPersonalActivityCount(0);
        setPersonalActivitiesPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authPhase, student?.id]);

  useEffect(() => {
    if (authPhase !== "authed" || !student?.id) {
      setDiamondBalance(null);
      return undefined;
    }
    void loadDiamondBalance();
  }, [authPhase, student?.id, boxRefreshToken, loadDiamondBalance]);

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
    const fromDashBg = dashboardView?.identity?.avatarBackgroundKey;
    const profBg = rowProf?.avatarBackgroundKey;
    const localBg =
      typeof window !== "undefined" ? localStorage.getItem("mleo_player_avatar_background") : null;
    const resolvedBg = resolveProfileBackgroundKey(
      profBg || fromDashBg || localBg || readProfileBackgroundFromLocalStorage(),
    );

    if (serverCustom || (typeof fromDashCustom === "string" && fromDashCustom.trim().startsWith("data:image/"))) {
      const url = serverCustom || String(fromDashCustom).trim();
      setHeroAvatarImage(url);
      setHeroAvatarEmoji("👤");
      setHeroAvatarBackground(resolvedBg);
      return;
    }
    if (img) {
      setHeroAvatarImage(img);
      setHeroAvatarEmoji("👤");
      setHeroAvatarBackground(resolvedBg);
      return;
    }
    setHeroAvatarImage(null);
    const pick =
      (em && String(em).trim()) ||
      (profEmoji != null && String(profEmoji).trim() !== "" ? String(profEmoji).trim() : "") ||
      (fromDashEmoji && String(fromDashEmoji).trim()) ||
      "👤";
    setHeroAvatarEmoji(pick.slice(0, 8));
    setHeroAvatarBackground(resolvedBg);
  }, [
    homePayload?.profile,
    dashboardView?.identity?.avatarEmoji,
    dashboardView?.identity?.avatarCustomDataUrl,
    dashboardView?.identity?.avatarBackgroundKey,
  ]);

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
        if (Object.prototype.hasOwnProperty.call(partial, "backgroundKey")) {
          if (partial.backgroundKey != null && String(partial.backgroundKey).trim() !== "") {
            profile.avatarBackgroundKey = resolveProfileBackgroundKey(partial.backgroundKey);
          } else {
            delete profile.avatarBackgroundKey;
          }
        }
      }
      return { ...prev, profile };
    });
  }, []);
  const profilePending = profilePhase === "idle" || profilePhase === "loading";
  const buildFailed = profilePhase === "ok" && !dashboardView;

  const accLabel = (pct) => (pct == null ? "עדיין אין נתונים" : `${pct}%`);

  const openHomePanel = useCallback(
    (panelId) => {
      if (!panelId) return;
      if (isGuestHome && guestLockedPanelSet.has(panelId)) return;
      setActivePanel(panelId);
    },
    [isGuestHome, guestLockedPanelSet]
  );

  const showLockToast = useCallback((message) => {
    const text = message || GUEST_LOCK_MESSAGE_HE;
    setLockToast(text);
    if (typeof window !== "undefined") {
      if (lockToastTimerRef.current) window.clearTimeout(lockToastTimerRef.current);
      lockToastTimerRef.current = window.setTimeout(() => setLockToast(""), 2200);
    }
  }, []);

  const closeHomePanel = useCallback(() => setActivePanel(null), []);

  const onLogout = async () => {
    setLogoutMessage("");
    const sid = student?.id;
    setLogoutBusy(true);
    try {
      await fetch("/api/student/logout", { method: "POST", credentials: "include" });
      if (
        typeof window !== "undefined" &&
        shouldClearGuestResumeTokenOnLogout(student, isGuestStudent(student))
      ) {
        localStorage.removeItem(LIOSH_GUEST_RESUME_TOKEN_KEY);
      }
      clearAllStudentScopedBrowserStorage(sid);
      invalidateStudentLearningProfileClientCache();
      invalidateStudentHomeProfileClientCache(sid);
      invalidateStudentMeClientCache();
      setStudent(null);
      setHomePayload(null);
      setProfilePhase("idle");
    setAnalyticsPhase("idle");
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

  const heroName = String(student.displayNameHe || student.full_name || "").trim() || "ילד/ה";
  const heroGreeting = String(student.greetingHe || "").trim() || `שלום ${heroName}`;
  const heroLeoNumber = String(student.leoNumber ?? student.leo_number ?? "").trim();
  const heroLeoLabel = String(student.leoNumberLabelHe || "").trim();
  const heroCoinsDisplay =
    student.coin_balance != null
      ? String(Number(student.coin_balance) || 0)
      : dashboardView?.identity?.coinBalanceDisplayHe ?? STUDENT_TRUTH_LABELS_HE.unavailable;
  const heroDiamondsDisplay =
    diamondBalance === null || diamondBalance === undefined
      ? STUDENT_TRUTH_LABELS_HE.unavailable
      : String(Number(diamondBalance) || 0);

  const renderActivePanelContent = () => {
    if (!dashboardView || !activePanel) return null;
    switch (activePanel) {
      case "stats":
        return <StatsSection dashboardView={dashboardView} accLabel={accLabel} />;
      case "missions":
        return dashboardView.dailyMissions?.missions?.length ? (
          <StudentDailyMissionsPanel dailyMissions={dashboardView.dailyMissions} />
        ) : (
          <p className={T.emptyText}>עדיין אין נתונים</p>
        );
      case "progress":
        return dashboardView.monthlyPersistence?.loadError ? (
          <p className={T.emptyText}>{STUDENT_TRUTH_LABELS_HE.unavailable}</p>
        ) : dashboardView.monthlyPersistence?.tiers?.length ? (
          <StudentMonthlyPersistencePanel monthlyPersistence={dashboardView.monthlyPersistence} />
        ) : (
          <p className={T.emptyText}>{STUDENT_TRUTH_LABELS_HE.noData}</p>
        );
      case "classroom":
        return personalActivitiesPhase === "loading" ? (
          <p className={T.emptyText}>טוען פעילויות...</p>
        ) : (
          <StudentClassroomActivitiesPanel
            activities={personalActivities}
            activitiesLoaded={personalActivitiesPhase === "ok" || personalActivitiesPhase === "error"}
            emptyFallback={
              <p className={T.panelEmpty}>
                אין פעילויות אישיות כרגע. כשהמורה או ההורה ישלחו משימה - היא תופיע כאן.
              </p>
            }
          />
        );
      case "worksheets":
        return (
          <StudentWorksheetsPanel
            emptyFallback={
              <p className={T.panelEmpty}>
                אין דפי עבודה פתוחים כרגע. כשיוקצו דפי עבודה - הם יופיעו כאן.
              </p>
            }
          />
        );
      case "subjects":
        return <SubjectsSection subjects={dashboardView.subjects} />;
      case "badges":
        return <BadgesSection badges={dashboardView.badges} />;
      case "recommendations":
        return <RecommendationsSection recommendations={dashboardView.recommendations} />;
      default:
        return null;
    }
  };

  return (
    <Layout studentTheme={theme} studentShell="home">
      <PageSeo
        title={studentHomeSeo.title}
        description={studentHomeSeo.description}
        canonicalPath={studentHomeSeo.canonicalPath}
        noindex={studentHomeSeo.noindex}
      />
      <div key={student.id} className="relative flex min-h-0 w-full flex-1 flex-col">
        <p
          className="pointer-events-none absolute left-1/2 top-1 z-30 -translate-x-1/2 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 backdrop-blur-sm"
          role="note"
        >
          🧪 אב טיפוס
        </p>

        {lockToast ? (
          <p
            className="absolute left-1/2 top-8 z-30 -translate-x-1/2 rounded-lg bg-slate-800/90 px-3 py-1.5 text-center text-xs font-semibold text-white"
            role="status"
          >
            {lockToast}
          </p>
        ) : null}

        <StudentWorldTitleScreen
          greetingHe={
            (isGuestHome ? heroGreeting : `שלום ${heroName}`).replace(/!+\s*$/, "")
          }
          coinsDisplay={heroCoinsDisplay}
          diamondsDisplay={heroDiamondsDisplay}
          leoNumber={heroLeoNumber}
          leoNumberLabelHe={heroLeoLabel}
          avatarEmoji={heroAvatarEmoji}
          avatarImage={heroAvatarImage}
          avatarBackgroundKey={heroAvatarBackground}
          guestLockedPanelSet={guestLockedPanelSet}
          lockMessage={guestPolicy?.lockMessageHe || GUEST_LOCK_MESSAGE_HE}
          logoutBusy={logoutBusy}
          onOpenPanel={openHomePanel}
          onOpenAvatar={() => setShowAvatarModal(true)}
          onLogout={() => void onLogout()}
          onLockedTap={showLockToast}
          onSurpriseOpen={cardRewardsEnabled ? () => setBoxModalOpen(true) : undefined}
          surpriseOpeningLocked={boxModalOpen}
          surpriseRefreshToken={boxRefreshToken}
          surpriseStatusOverride={surpriseBoxStatus}
        />

        {profilePhase === "error" && !profilePending ? (
          <p
            className={`absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-white/80 px-3 py-1 text-center text-xs backdrop-blur-sm ${isBright ? "text-rose-600" : "text-rose-200"}`}
          >
            לא הצלחנו לטעון נתוני התקדמות.{" "}
            <button type="button" className="underline" onClick={() => student && void loadHomeDashboard(student)}>
              נסו שוב
            </button>
          </p>
        ) : null}

        {logoutMessage ? (
          <p
            className={`absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-white/80 px-3 py-1 text-center text-xs backdrop-blur-sm ${isBright ? "text-rose-600" : "text-rose-200"}`}
          >
            {logoutMessage}
          </p>
        ) : null}
      </div>
      <StudentHomeModal
        open={Boolean(activePanel && dashboardView)}
        title={activePanel ? HOME_PANELS[activePanel]?.title ?? "" : ""}
        emoji={activePanel ? HOME_PANELS[activePanel]?.emoji ?? "" : ""}
        variant={activePanel ? HOME_PANELS[activePanel]?.variant ?? "default" : "default"}
        size={activePanel ? HOME_PANELS[activePanel]?.size ?? "2xl" : "2xl"}
        onClose={closeHomePanel}
      >
        {renderActivePanelContent()}
      </StudentHomeModal>
      <StudentSurpriseBoxOpenModal
        open={boxModalOpen}
        onClose={() => setBoxModalOpen(false)}
        onOpened={handleSurpriseBoxOpened}
      />
      <StudentAvatarPickerModal
        open={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        playerName={heroName}
        serverAvatarEmoji={
          homePayload?.profile && typeof homePayload.profile === "object" && !Array.isArray(homePayload.profile)
            ? homePayload.profile.avatarEmoji
            : dashboardView?.identity?.avatarEmoji
        }
        serverAvatarBackgroundKey={
          homePayload?.profile && typeof homePayload.profile === "object" && !Array.isArray(homePayload.profile)
            ? homePayload.profile.avatarBackgroundKey
            : dashboardView?.identity?.avatarBackgroundKey
        }
        onAvatarEmojiPersisted={(emoji) => {
          mergeHomeLearningProfileAvatar({ emoji });
        }}
        onAvatarCustomDataUrlPersisted={(customDataUrl) => {
          mergeHomeLearningProfileAvatar({ customDataUrl });
        }}
        onAvatarBackgroundPersisted={(backgroundKey) => {
          mergeHomeLearningProfileAvatar({ backgroundKey });
          setHeroAvatarBackground(resolveProfileBackgroundKey(backgroundKey));
        }}
        onAvatarChanged={() => {
          refreshHeroAvatarFromBrowser();
        }}
      />
    </Layout>
  );
}
