import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import PageSeo from "../../components/seo/PageSeo";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he";
import Link from "next/link";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import LearningHubSubjectCard from "../../components/learning/LearningHubSubjectCard.jsx";
import StudentHomeModal from "../../components/student/StudentHomeModal";
import StudentMonthlyPersistencePanel from "../../components/student/StudentMonthlyPersistencePanel";
import { buildStudentHomeView } from "../../lib/learning-client/studentHomeDashboardClient";
import {
  getCachedStudentHomePayload,
  mergeStudentHomePayloads,
  setCachedStudentHomePayload,
} from "../../lib/learning-client/studentHomeProfileClient";
import { getCachedStudentMe, setCachedStudentMe } from "../../lib/learning-client/studentMeClient";
import { STUDENT_TRUTH_LABELS_HE } from "../../lib/learning-shared/student-display-truth.js";
import { GUEST_LOCK_MESSAGE_HE, GUEST_LOCKED_HOME_PANELS } from "../../lib/guest/constants.js";
import { isGuestStudent } from "../../lib/guest/guest-display.js";

const HOME_SUMMARY_PATH = "/api/student/home-profile/summary";
const PROGRESS_PANEL = {
  title: "ההתקדמות שלי",
  emoji: "📈",
  size: "2xl",
  variant: "progress",
};

const LEARNING_GAMES = [
  {
    slug: "math-master",
    permissionKey: "math",
    title: "מתמטיקה",
    emoji: "🧮",
    blurb: "תרגול חיבור, חיסור, כפל, חילוק ועוד.",
  },
  {
    slug: "geometry-master",
    permissionKey: "geometry",
    title: "גאומטריה",
    emoji: "📐",
    blurb: "שטחים, היקפים, נפח, זוויות, פיתגורס וצורות ועוד.",
  },
  {
    slug: "english-master",
    permissionKey: "english",
    title: "אנגלית",
    emoji: "🇬🇧",
    blurb: "אוצר מילים, דקדוק, תרגום ובניית משפטים ועוד.",
  },
  {
    slug: "science-master",
    permissionKey: "science",
    title: "מדעים",
    emoji: "🔬",
    blurb: "גוף, בעלי חיים, צמחים, חלל, חומר, מזג אוויר, כוחות ועוד.",
  },
  {
    slug: "hebrew-master",
    permissionKey: "hebrew",
    title: "עברית",
    emoji: "📚",
    blurb: "תרגול שפה, אוצר מילים, דקדוק, הבנת הנקרא ועוד.",
  },
  {
    slug: "moledet-master",
    permissionKey: "moledet",
    title: "מולדת",
    emoji: "🏠",
    blurb: "מולדת, חברה, אזרחות וערכים.",
  },
  {
    slug: "geography-master",
    permissionKey: "geography",
    title: "גאוגרפיה",
    emoji: "🗺️",
    blurb: "גאוגרפיה, מפות, נוף ויישובים.",
  },
  {
    slug: "history-master",
    permissionKey: "history",
    title: "היסטוריה",
    emoji: "📜",
    blurb: "יוון, הלניזם, החשמונאים, רומא והיהודים.",
  },
];

const DEFAULT_SUBJECT_CARD = {
  card: "border-slate-100 hover:border-sky-100 bg-white",
  bar: "bg-sky-300",
  emoji: "bg-slate-50 border-slate-100",
};

const learningSeo = getPublicPageSeo("learning");

export async function getServerSideProps() {
  return {
    props: {
      showDevStudentSimulator:
        String(process.env.ENABLE_DEV_STUDENT_SIMULATOR || "").trim().toLowerCase() === "true",
    },
  };
}

export default function LearningHub({ showDevStudentSimulator }) {
  useIOSViewportFix();
  const { tokens: T, theme, subjectHubCard } = useStudentTheme();
  const [progressOpen, setProgressOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const [homePayload, setHomePayload] = useState(null);
  const [progressLoadPhase, setProgressLoadPhase] = useState("idle");
  const [guestPolicy, setGuestPolicy] = useState(null);
  const [lockToast, setLockToast] = useState("");
  const lockToastTimerRef = useRef(null);

  const dashboardView = useMemo(() => {
    if (!student?.id || !homePayload) return null;
    try {
      return buildStudentHomeView({ student, homePayload });
    } catch {
      return null;
    }
  }, [student, homePayload]);

  const showLockToast = useCallback((message) => {
    const text = message || GUEST_LOCK_MESSAGE_HE;
    setLockToast(text);
    if (typeof window !== "undefined") {
      if (lockToastTimerRef.current) window.clearTimeout(lockToastTimerRef.current);
      lockToastTimerRef.current = window.setTimeout(() => setLockToast(""), 2200);
    }
  }, []);

  const loadProgressData = useCallback(async () => {
    setProgressLoadPhase("loading");
    try {
      const cachedMe = getCachedStudentMe();
      let mePayload = cachedMe;
      if (!mePayload?.student?.id) {
        const meRes = await fetch("/api/student/me", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        mePayload = await meRes.json().catch(() => ({}));
        if (meRes.ok && mePayload?.student?.id) {
          setCachedStudentMe(mePayload);
        }
      }

      const nextStudent = mePayload?.student;
      if (!nextStudent?.id) {
        setProgressLoadPhase("error");
        return;
      }

      setStudent(nextStudent);
      setGuestPolicy(mePayload?.guestPolicy || null);

      const cachedHome = getCachedStudentHomePayload(nextStudent.id);
      if (cachedHome?.merged) {
        setHomePayload(cachedHome.merged);
        setProgressLoadPhase("ok");
      }

      const summaryRes = await fetch(HOME_SUMMARY_PATH, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const summaryText = await summaryRes.text();
      let summaryJson = {};
      try {
        summaryJson = summaryText ? JSON.parse(summaryText) : {};
      } catch {
        if (!cachedHome?.merged) setProgressLoadPhase("error");
        return;
      }

      if (!summaryRes.ok || summaryJson?.ok !== true || !summaryJson?.accountSnapshot) {
        if (!cachedHome?.merged) setProgressLoadPhase("error");
        return;
      }

      setCachedStudentHomePayload(nextStudent.id, { summary: summaryJson });
      const merged = mergeStudentHomePayloads(summaryJson, cachedHome?.analytics);
      setHomePayload(merged);
      setProgressLoadPhase("ok");
    } catch {
      setProgressLoadPhase("error");
    }
  }, []);

  const openProgressModal = useCallback(() => {
    const cachedMe = getCachedStudentMe();
    const cachedGuestPolicy = guestPolicy || cachedMe?.guestPolicy || null;
    const cachedStudent = student || cachedMe?.student || null;
    const guestLocked =
      Boolean(cachedGuestPolicy || isGuestStudent(cachedStudent)) &&
      new Set(cachedGuestPolicy?.lockedHomePanels || GUEST_LOCKED_HOME_PANELS).has("progress");
    if (guestLocked) {
      showLockToast(cachedGuestPolicy?.lockMessageHe || GUEST_LOCK_MESSAGE_HE);
      return;
    }

    setProgressOpen(true);
    if (!homePayload || !student) {
      void loadProgressData();
    } else {
      setProgressLoadPhase("ok");
    }
  }, [guestPolicy, homePayload, loadProgressData, showLockToast, student]);

  const closeProgressModal = useCallback(() => setProgressOpen(false), []);

  const renderProgressPanelContent = () => {
    if (progressLoadPhase === "loading" || (progressOpen && !dashboardView && progressLoadPhase !== "error")) {
      return <p className={T.emptyText}>טוען...</p>;
    }
    if (progressLoadPhase === "error" || !dashboardView) {
      return <p className={T.emptyText}>{STUDENT_TRUTH_LABELS_HE.unavailable}</p>;
    }
    if (dashboardView.monthlyPersistence?.loadError) {
      return <p className={T.emptyText}>{STUDENT_TRUTH_LABELS_HE.unavailable}</p>;
    }
    if (dashboardView.monthlyPersistence?.tiers?.length) {
      return <StudentMonthlyPersistencePanel monthlyPersistence={dashboardView.monthlyPersistence} />;
    }
    return <p className={T.emptyText}>{STUDENT_TRUTH_LABELS_HE.noData}</p>;
  };

  useEffect(() => {
    if (!isStudentIdentityDiagnosticsEnabled()) return undefined;
    console.log("[learning/index] localStorage on mount", {
      liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
      mleo_player_name: localStorage.getItem("mleo_player_name"),
    });
    fetch("/api/student/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((payload) => {
        console.log("[learning/index] GET /api/student/me", {
          ok: payload?.ok === true,
          id: payload.student?.id,
          fullName: payload.student?.full_name,
          gradeLevel: payload.student?.grade_level,
          debug: payload.debugStudentIdentity,
        });
        console.log("[learning/index] localStorage after /me response", {
          liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
          mleo_player_name: localStorage.getItem("mleo_player_name"),
        });
      })
      .catch((err) => {
        console.log("[learning/index] GET /api/student/me failed", String(err?.message || err));
      });
    return undefined;
  }, []);

  useEffect(
    () => () => {
      if (lockToastTimerRef.current) window.clearTimeout(lockToastTimerRef.current);
    },
    []
  );

  return (
    <Layout studentTheme={theme} studentShell="learning">
      <PageSeo
        title={learningSeo.title}
        description={learningSeo.description}
        canonicalPath={learningSeo.canonicalPath}
      />
      <div className={`max-w-5xl mx-auto px-3 sm:px-4 py-3 md:py-6 pb-4 overflow-x-hidden ${T.learningPageWrap}`} dir="rtl">
        {lockToast ? (
          <p
            className="fixed left-1/2 top-3 z-40 -translate-x-1/2 rounded-lg bg-slate-800/90 px-3 py-1.5 text-center text-xs font-semibold text-white"
            role="status"
          >
            {lockToast}
          </p>
        ) : null}

        <div className={T.hubTopBar}>
          <div className={T.hubTopBarBack}>
            <Link
              href="/student/home"
              className={`${T.hubBackLink} whitespace-nowrap max-md:text-xs max-md:px-2 max-md:py-1 max-md:min-h-8`}
            >
              חזרה
            </Link>
          </div>
          <p
            className={`${T.hubBadge} max-w-[min(100%,14rem)] sm:max-w-none text-center leading-tight max-md:min-h-8 max-md:py-1 max-md:leading-none`}
          >
            📚 תרגול · חזרה · שיפור
          </p>
          <div className={T.hubTopBarTheme}>
            <button
              type="button"
              className={`${T.hubBackLink} whitespace-nowrap max-md:text-xs max-md:px-2 max-md:py-1 max-md:min-h-8`}
              onClick={openProgressModal}
              aria-haspopup="dialog"
            >
              ההתקדמות שלי
            </button>
          </div>
        </div>

        <header className={T.hubHeaderCard}>
          <h1 className={T.hubTitle}>מרכז משחקי האתגר</h1>
          <p className={`${T.hubDesc} mt-2 line-clamp-2 md:line-clamp-none`}>
            כאן ההתמדה משתלמת - ככל שמשחקים יותר, צוברים יותר מטבעות.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" aria-label="בחירת מקצוע">
          {LEARNING_GAMES.map((g) => {
            const subject = subjectHubCard[g.slug] || DEFAULT_SUBJECT_CARD;
            return (
              <LearningHubSubjectCard
                key={g.slug}
                slug={g.slug}
                permissionKey={g.permissionKey}
                title={g.title}
                emoji={g.emoji}
                blurb={g.blurb}
                subjectCard={subject}
                hubCardTokens={T}
              />
            );
          })}
        </section>

        {false && showDevStudentSimulator ? (
          <section className="mt-4">
            <Link
              href="/learning/dev-student-simulator"
              className="block rounded-2xl border border-indigo-300/40 bg-indigo-500/10 hover:bg-indigo-500/20 transition p-4 text-center"
            >
              <h2 className="font-bold text-lg">סימולטור ילדים (פיתוח)</h2>
              <p className="text-sm text-white/70">סימולטור ילדים לפיתוח</p>
            </Link>
          </section>
        ) : null}
      </div>

      <StudentHomeModal
        open={progressOpen}
        title={PROGRESS_PANEL.title}
        emoji={PROGRESS_PANEL.emoji}
        variant={PROGRESS_PANEL.variant}
        size={PROGRESS_PANEL.size}
        onClose={closeProgressModal}
      >
        {renderProgressPanelContent()}
      </StudentHomeModal>
    </Layout>
  );
}
