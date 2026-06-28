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
import { formatGradeLevelHe } from "../../lib/learning-student-defaults";
import { STUDENT_TRUTH_LABELS_HE } from "../../lib/learning-shared/student-display-truth.js";
import StudentAvatarPickerModal from "../../components/student/StudentAvatarPickerModal";
import StudentHomeModal from "../../components/student/StudentHomeModal";
import StudentDailyMissionsPanel from "../../components/student/StudentDailyMissionsPanel";
import StudentMonthlyPersistencePanel from "../../components/student/StudentMonthlyPersistencePanel";
import StudentClassroomActivitiesPanel from "../../components/student/StudentClassroomActivitiesPanel";
import StudentWorksheetsPanel from "../../components/worksheet-activities/StudentWorksheetsPanel";
import { isClassroomActivitiesEnabled } from "../../lib/classroom-activities/classroom-activities-labels.client.js";
import { normalizeStudentActivityScope } from "../../lib/classroom-activities/student-activity-scope-labels.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentSurpriseBoxWidget from "../../components/student/rewards/StudentSurpriseBoxWidget";
import StudentSurpriseBoxOpenModal from "../../components/student/rewards/StudentSurpriseBoxOpenModal";
import StudentShareFriendsButton from "../../components/student/StudentShareFriendsButton";
import { isCardRewardsEnabledClient } from "../../lib/rewards/reward-feature-flags.client.js";
import { GUEST_LOCK_MESSAGE_HE, GUEST_LOCKED_HOME_PANELS, LIOSH_GUEST_RESUME_TOKEN_KEY } from "../../lib/guest/constants.js";
import StudentLoadingPanel from "../../components/ui/StudentLoadingPanel.jsx";

import { syncMonthlyProgressCacheFromServer } from "../../utils/progress-storage.js";

const HOME_SUMMARY_PATH = "/api/student/home-profile/summary";
const HOME_ANALYTICS_PATH = "/api/student/home-profile/analytics";
const HOME_ACHIEVEMENT_GRANTS_PATH = "/api/student/home-profile/achievement-grants";

function mapApiErrorToHebrew(raw) {
  const s = String(raw || "").trim();
  if (!s) return "טעינת נתוני הלמידה מהשרת נכשלה.";
  if (s === "Student session expired") return "פג תוקף החיבור — התחברו שוב.";
  if (s === "Server error") return "שגיאת שרת בטעינת נתוני הלמידה.";
  return s;
}

function LoadingScreen({ message }) {
  const { theme } = useStudentTheme();
  return (
    <Layout studentTheme={theme} studentShell="home">
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

function getTileVariant(T) {
  return {
    stats: { accent: T.tileAccentStats, iconWrap: T.tileIconWrapStats, hover: T.tileHoverStats },
    progress: { accent: T.tileAccentProgress, iconWrap: T.tileIconWrapProgress, hover: T.tileHoverProgress },
    missions: { accent: T.tileAccentMissions, iconWrap: T.tileIconWrapMissions, hover: T.tileHoverMissions },
    subjects: { accent: T.tileAccentSubjects, iconWrap: T.tileIconWrapSubjects, hover: T.tileHoverSubjects },
    classroom: { accent: T.tileAccentClassroom, iconWrap: T.tileIconWrapClassroom, hover: T.tileHoverClassroom },
    worksheets: { accent: T.tileAccentWorksheets, iconWrap: T.tileIconWrapWorksheets, hover: T.tileHoverWorksheets },
    badges: { accent: T.tileAccentBadges, iconWrap: T.tileIconWrapBadges, hover: T.tileHoverBadges },
    recommendations: {
      accent: T.tileAccentRecommendations,
      iconWrap: T.tileIconWrapRecommendations,
      hover: T.tileHoverRecommendations,
    },
    default: { accent: T.tileAccentDefault, iconWrap: T.tileIconWrapDefault, hover: T.tileHoverDefault },
  };
}

function DashboardTile({ id, emoji, title, subtitle, onClick, variant = "default", locked = false, lockMessage = GUEST_LOCK_MESSAGE_HE }) {
  const { tokens: T } = useStudentTheme();
  const tileVariant = getTileVariant(T);
  const v = tileVariant[variant] || tileVariant.default;
  return (
    <button
      type="button"
      data-testid={id ? `student-home-tile-${id}` : undefined}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      aria-disabled={locked || undefined}
      className={`${T.tile} ${locked ? "opacity-75 cursor-not-allowed" : v.hover}`}
    >
      <span className={v.accent} aria-hidden />
      <div className="flex items-start gap-3 md:gap-3.5">
        <span className={v.iconWrap} aria-hidden>
          {locked ? "🔒" : emoji}
        </span>
        <div className={T.tileBody}>
          <p className={T.tileTitle}>{title}</p>
          <p className={T.tileSub}>{locked ? lockMessage : (subtitle ?? "0")}</p>
        </div>
      </div>
    </button>
  );
}

function StatsSection({ dashboardView, accLabel }) {
  const { tokens: T } = useStudentTheme();
  const { accountStats: s } = dashboardView;
  return (
    <>
      <p className={T.panelIntro}>
        סיכום ההתקדמות שלך בכל הנושאים — רמה, כוכבים, דיוק ודקות למידה.
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
            <p className={T.statsSummaryValue}>{dashboardView.identity.coinBalanceDisplayHe ?? dashboardView.identity.coinBalance ?? "—"}</p>
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

function MonthlyJourneySection({ monthlyJourney, className = "" }) {
  const { tokens: T } = useStudentTheme();
  return (
    <section className={`${T.monthlySection} ${className}`}>
      <h3 className={T.monthlyTitle}>מסע חודשי</h3>
      <div className="space-y-3 text-right">
        <p className={T.monthlyText}>
          דקות החודש:{" "}
          <span className={T.monthlyHighlight}>
            {monthlyJourney.minutesDisplayHe ?? monthlyJourney.minutesThisMonth ?? STUDENT_TRUTH_LABELS_HE.noData}
          </span>{" "}
          / <span className="tabular-nums">{monthlyJourney.goalMinutes}</span>
        </p>
        {monthlyJourney.filterNoteHe ? (
          <p className="text-xs text-slate-500 text-right">{monthlyJourney.filterNoteHe}</p>
        ) : null}
        {monthlyJourney.progressPct != null ? (
          <div className={T.progressTrack}>
            <div className={T.progressFill} style={{ width: `${monthlyJourney.progressPct}%` }} />
          </div>
        ) : null}
        <p className={T.monthlyEncouragement}>{monthlyJourney.encouragementHe}</p>
      </div>
    </section>
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
    moledet_geography: subjectAccentBar["moledet-geography-master"],
  };
  return (
    <>
      <p className={T.panelIntro}>
        התקדמות לפי מקצוע — דיוק, שאלות, רמה וכוכבים. לחצו על «כניסה לנושא» כדי להתחיל לתרגל.
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
                <span className={T.subjectStatValue}>{s.accuracyDisplayHe ?? "—"}</span>
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
                  {s.levelDisplayHe ?? s.level ?? "—"} · {s.stars ?? "—"}
                  {s.starsScopeHe ? ` (${s.starsScopeHe})` : ""}
                </span>
              </div>
              <div className={T.subjectStatRow}>
                <span className={T.subjectStatLabel}>דקות למידה</span>
                <span className={T.subjectStatValue}>
                  {s.sessionMinutesDisplayHe ?? s.sessionMinutesRounded ?? "—"}
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
        עדיין אין תגים — אפשר להתחיל ללמוד ולצבור הישגים בכל נושא.
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

export default function StudentHomePage() {
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
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [guestPolicy, setGuestPolicy] = useState(null);
  const cardRewardsEnabled = isCardRewardsEnabledClient();
  const isGuestHome = Boolean(guestPolicy || student?.account_kind === "guest" || student?.accountKind === "guest");
  const guestLockedPanelSet = useMemo(() => {
    const ids = guestPolicy?.lockedHomePanels || GUEST_LOCKED_HOME_PANELS;
    return new Set(ids);
  }, [guestPolicy]);

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

  const accLabel = (pct) => (pct == null ? "עדיין אין נתונים" : `${pct}%`);

  const dashboardSubtitles = useMemo(() => {
    if (!dashboardView) return {};
    const missions = dashboardView.dailyMissions;
    const missionTotal = missions?.missions?.length ?? 0;
    const missionCompleted = missions?.totalCompleted ?? 0;

    return {
      stats: `רמה ${dashboardView.accountStats.summaryLevel}`,
      progress: `${
        dashboardView.monthlyPersistence?.currentMinutesDisplayHe ??
        dashboardView.monthlyJourney.minutesDisplayHe ??
        dashboardView.monthlyJourney.minutesThisMonth ??
        STUDENT_TRUTH_LABELS_HE.noData
      } דק׳ החודש`,
      missions:
        missionTotal > 0
          ? `${missionCompleted}/${missionTotal} הושלמו`
          : STUDENT_TRUTH_LABELS_HE.noData,
      classroom: `${personalActivityCount} פעילויות`,
      worksheets: "0 דפי עבודה",
      subjects: `${dashboardView.subjects.length} נושאים`,
      badges: `${dashboardView.badges.length} תגים`,
      recommendations: `${dashboardView.recommendations.length} המלצות`,
    };
  }, [dashboardView, personalActivityCount]);

  const closeHomePanel = useCallback(() => setActivePanel(null), []);

  const onLogout = async () => {
    setLogoutMessage("");
    const sid = student?.id;
    setLogoutBusy(true);
    try {
      await fetch("/api/student/logout", { method: "POST", credentials: "include" });
      if (typeof window !== "undefined") {
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
  const heroLeoLabel = String(student.leoNumberLabelHe || "").trim();
  const heroGrade =
    student.grade_level != null && student.grade_level !== "" ? formatGradeLevelHe(student.grade_level) : "";
  const heroCoinsDisplay =
    student.coin_balance != null
      ? String(Number(student.coin_balance) || 0)
      : dashboardView?.identity?.coinBalanceDisplayHe ?? STUDENT_TRUTH_LABELS_HE.unavailable;
  const heroTagline =
    dashboardView?.identity?.friendlyLineHe ?? "כאן מוצגים הנתונים מהשרת אחרי התחברות.";

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
                אין פעילויות אישיות כרגע. כשהמורה או ההורה ישלחו משימה — היא תופיע כאן.
              </p>
            }
          />
        );
      case "worksheets":
        return (
          <StudentWorksheetsPanel
            emptyFallback={
              <p className={T.panelEmpty}>
                אין דפי עבודה פתוחים כרגע. כשיוקצו דפי עבודה — הם יופיעו כאן.
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
      <div key={student.id} className={`max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-8 pb-6 overflow-x-hidden ${T.pageWrap}`}>
        <section className={T.hero}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start justify-between gap-2 w-full md:flex-1 md:min-w-0 md:justify-start">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className={T.heroAvatarBtn}
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
                  <h1 className={T.heroTitle}>{isGuestHome ? heroGreeting : `שלום ${heroName}`}</h1>
                  {isGuestHome && heroLeoLabel ? (
                    <p className={`text-sm mt-1 ${isBright ? "text-slate-600" : "text-white/70"}`}>{heroLeoLabel}</p>
                  ) : null}
                  <p className={T.heroSub}>
                    {heroGrade ? heroGrade : "עדיין אין נתונים"}
                  </p>
                  <p className={T.heroCoins}>מטבעות: {heroCoinsDisplay}</p>
                  <p className={T.heroTagline}>{heroTagline}</p>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-1 shrink-0 md:hidden">
                <button
                  type="button"
                  disabled={logoutBusy}
                  onClick={() => void onLogout()}
                  className={`${T.ctaLogout} !inline-flex shrink-0 !min-h-[2.75rem] !px-3 !py-2 !text-sm`}
                >
                  {logoutBusy ? "יוצאים..." : "התנתקות"}
                </button>
                <StudentShareFriendsButton />
              </div>
            </div>
            <div className="flex flex-col gap-2 md:gap-3 shrink-0 w-full md:w-auto">
              <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:gap-3">
                <Link
                  href="/learning"
                  className={`${T.ctaPrimary} w-full !px-2 !py-2.5 !text-sm md:!px-5 md:!py-3 md:!text-lg md:w-auto`}
                >
                  התחל ללמוד
                </Link>
                <Link
                  href="/games"
                  className={`${T.ctaGames} w-full !px-2 !py-2.5 !text-sm md:!px-5 md:!py-3 md:!text-lg md:w-auto`}
                >
                  משחקים
                </Link>
                <button
                  type="button"
                  disabled={logoutBusy}
                  onClick={() => void onLogout()}
                  className={`${T.ctaLogout} !hidden md:!inline-flex`}
                >
                  {logoutBusy ? "יוצאים..." : "התנתקות"}
                </button>
              </div>
            </div>
          </div>
          {logoutMessage ? (
            <p className={`text-sm mt-4 text-right ${isBright ? "text-rose-600" : "text-rose-200"}`}>
              {logoutMessage}
            </p>
          ) : null}
        </section>

        {cardRewardsEnabled ? (
          <StudentSurpriseBoxWidget onOpen={() => setBoxModalOpen(true)} />
        ) : null}

        {profilePending ? (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={T.skeleton} />
            ))}
          </div>
        ) : null}

        {profilePhase === "error" && !profilePending ? (
          <div className={T.errorBox}>
            <p className={T.errorTitle}>לא הצלחנו לטעון את נתוני ההתקדמות מהשרת</p>
            <p className={T.errorBody}>
              פרטי החשבון (שם, כיתה, מטבעות) עדיין מההתחברות. נתוני רמה, כוכבים, שאלות ודקות למידה לא הוצגו כדי
              שלא יופיעו אפסים מטעים.
            </p>
            <p className={T.errorBody}>{profileError}</p>
            <button
              type="button"
              onClick={() => student && void loadHomeDashboard(student)}
              className={T.errorBtn}
            >
              נסו שוב
            </button>
          </div>
        ) : null}

        {buildFailed ? (
          <div className={T.buildErrorBox}>
            <p className={T.buildErrorTitle}>שגיאה בעיבוד הנתונים</p>
            <p className={T.buildErrorBody}>השרת החזיר תשובה תקינה אבל לא ניתן היה לבנות את לוח הבקרה.</p>
            <button
              type="button"
              onClick={() => student && void loadHomeDashboard(student)}
              className={T.buildErrorBtn}
            >
              נסו שוב
            </button>
          </div>
        ) : null}

        {dashboardView ? (
          <section className="mt-4 md:mt-5" aria-label="לוח בקרה">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {Object.entries(HOME_PANELS).map(([id, panel]) => (
                <DashboardTile
                  key={id}
                  id={id}
                  emoji={panel.emoji}
                  title={panel.title}
                  subtitle={dashboardSubtitles[id] || null}
                  variant={panel.variant}
                  locked={isGuestHome && guestLockedPanelSet.has(id)}
                  lockMessage={guestPolicy?.lockMessageHe || GUEST_LOCK_MESSAGE_HE}
                  onClick={() => setActivePanel(id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {analyticsPhase === "error" && dashboardView && profilePhase === "ok" ? (
          <div className={`mt-4 ${T.errorBox}`}>
            <p className={T.errorTitle}>עדכון נתונים מתקדמים נכשל</p>
            <p className={T.errorBody}>
              הנתונים הבסיסיים (רמה, משימות, מטבעות וכו׳) כבר מוצגים. רק דיוק מדויק, דקות חודשיות מחושבות ופרסי
              התמדה לא התעדכנו.
            </p>
            <button
              type="button"
              onClick={() => homePayload && student?.id && void loadHomeAnalytics(student.id, homePayload)}
              className={T.errorBtn}
            >
              נסו שוב לטעון נתונים
            </button>
          </div>
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
