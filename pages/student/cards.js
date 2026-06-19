import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import StudentRewardCard, {
  StudentCardsGrid,
  StudentCardsTabPanel,
  StudentSeriesProgressCard,
} from "../../components/student/rewards/StudentRewardCard";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { isCardRewardsEnabledClient } from "../../lib/rewards/reward-feature-flags.client.js";
import { formatCoinAmountHe } from "../../lib/rewards/rewards-ui.he.js";

const CARDS_PATH = "/api/student/rewards/cards";
const PURCHASE_PATH = "/api/student/rewards/shop/purchase";
const CONVERT_PATH = "/api/student/rewards/cards/convert-duplicates";

const TABS = [
  { id: "collection", label: "האוסף שלי", shortLabel: "אוסף" },
  { id: "shop", label: "חנות קלפים", shortLabel: "חנות" },
  { id: "locked", label: "קלפים נעולים", shortLabel: "נעולים" },
  { id: "series", label: "סדרות", shortLabel: "סדרות" },
];

const TAB_STYLES = {
  collection: {
    idle: "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100 dark:bg-sky-950/35 dark:border-sky-700/45 dark:text-sky-100 dark:hover:bg-sky-900/45",
    active: "bg-sky-500 border-sky-600 text-white shadow-sm dark:bg-sky-600 dark:border-sky-500",
  },
  shop: {
    idle: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:border-emerald-700/45 dark:text-emerald-100 dark:hover:bg-emerald-900/45",
    active: "bg-emerald-500 border-emerald-600 text-white shadow-sm dark:bg-emerald-600 dark:border-emerald-500",
  },
  locked: {
    idle: "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/35 dark:border-amber-700/45 dark:text-amber-100 dark:hover:bg-amber-900/45",
    active: "bg-amber-500 border-amber-600 text-white shadow-sm dark:bg-amber-600 dark:border-amber-500",
  },
  series: {
    idle: "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 dark:bg-violet-950/35 dark:border-violet-700/45 dark:text-violet-100 dark:hover:bg-violet-900/45",
    active: "bg-violet-500 border-violet-600 text-white shadow-sm dark:bg-violet-600 dark:border-violet-500",
  },
};

function tabButtonClass(tabId, active) {
  const base =
    "min-w-0 w-full rounded-lg border text-center leading-tight transition-colors " +
    "px-0.5 py-2 text-[11px] sm:text-sm sm:px-2 sm:py-2.5 font-semibold";
  const palette = TAB_STYLES[tabId] || TAB_STYLES.collection;
  return `${base} ${active ? palette.active : palette.idle}`;
}

function coinBalanceBadgeClass(theme) {
  const shell =
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl font-bold px-4 sm:px-5 py-3 text-sm sm:text-base md:text-lg tabular-nums shadow-sm shrink min-w-0 max-w-[10.5rem] sm:max-w-[14rem] md:max-w-none";
  if (theme === "classic") {
    return `${shell} border border-amber-400/35 bg-amber-500/15 text-amber-100`;
  }
  return `${shell} border border-amber-400/50 bg-amber-500/15 text-amber-900`;
}

export default function StudentCardsPage() {
  const router = useRouter();
  const { tokens: T, theme } = useStudentTheme();
  const [authPhase, setAuthPhase] = useState("checking");
  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState("collection");
  const [cardsPhase, setCardsPhase] = useState("idle");
  const [cardsError, setCardsError] = useState("");
  const [payload, setPayload] = useState(null);
  const [actionBusy, setActionBusy] = useState("");
  const [messageHe, setMessageHe] = useState("");

  const rewardsEnabled = isCardRewardsEnabledClient();

  const loadCards = useCallback(async () => {
    setCardsPhase("loading");
    setCardsError("");
    try {
      const res = await fetch(CARDS_PATH, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setCardsError("לא הצלחנו לטעון את הקלפים.");
        setCardsPhase("error");
        return;
      }
      setPayload(json);
      setCardsPhase("ok");
    } catch {
      setCardsError("שגיאת רשת בטעינת הקלפים.");
      setCardsPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    setAuthPhase("checking");

    fetch("/api/student/me", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || !data?.student?.id) {
          setAuthPhase("anon");
          router.replace("/student/login");
          return;
        }
        syncStudentLocalStorageIdentity(data.student, "student/cards after /me");
        setStudent(data.student);
        setAuthPhase("authed");
        if (rewardsEnabled) void loadCards();
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/student/login");
      });

    return () => {
      mounted = false;
    };
  }, [router.isReady, router, loadCards, rewardsEnabled]);

  const convertibleCards = useMemo(
    () => (payload?.collection || []).filter((c) => c.canConvert),
    [payload]
  );

  const coinBalanceAmount = useMemo(() => {
    if (student?.coin_balance == null) return null;
    const n = Number(student.coin_balance);
    if (!Number.isFinite(n)) return null;
    return Math.floor(n);
  }, [student?.coin_balance]);

  const handlePurchase = async (cardId) => {
    const shopCard = payload?.shop?.find((c) => c.id === cardId);
    if (shopCard?.alreadyOwned || shopCard?.canAfford === false) return;

    setActionBusy(cardId);
    setMessageHe("");
    try {
      const res = await fetch(PURCHASE_PATH, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setMessageHe(json?.code === "insufficient_coins" ? "אין מספיק מטבעות לרכישה." : "הרכישה לא הצליחה — נסו שוב.");
        return;
      }
      setMessageHe(`קניתם את «${json.card?.name_he || json.card?.nameHe || "הקלף"}»!`);
      if (json.balanceAfter != null) {
        setStudent((prev) => (prev ? { ...prev, coin_balance: json.balanceAfter } : prev));
      }
      await loadCards();
    } catch {
      setMessageHe("שגיאת רשת ברכישה.");
    } finally {
      setActionBusy("");
    }
  };

  const handleConvert = async (cardId) => {
    setActionBusy(`convert:${cardId}`);
    setMessageHe("");
    try {
      const res = await fetch(CONVERT_PATH, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setMessageHe("המרת הכפילויות לא הצליחה.");
        return;
      }
      setMessageHe(`המרתם כפילויות וקיבלתם ${formatCoinAmountHe(json.coinsReceived || json.coinsAwarded || 0)}!`);
      await loadCards();
    } catch {
      setMessageHe("שגיאת רשת בהמרה.");
    } finally {
      setActionBusy("");
    }
  };

  if (authPhase === "checking" || authPhase === "anon") {
    return (
      <Layout studentTheme={theme} studentShell="home">
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className={T.loadingSpinner} aria-hidden />
          <p className={T.loadingText}>טוען...</p>
        </div>
      </Layout>
    );
  }

  if (!rewardsEnabled) {
    return (
      <Layout studentTheme={theme} studentShell="home">
        <div className={`max-w-6xl mx-auto px-3 sm:px-4 py-8 text-right overflow-x-hidden ${T.pageWrap}`}>
          <p className={T.emptyText}>אוסף הקלפים עדיין לא זמין.</p>
          <div dir="ltr" className="mt-4 inline-flex max-w-full min-w-0 items-center gap-2 self-end">
            <Link href="/student/home" className={`${T.ctaPrimary} shrink-0`}>
              חזרה לעולם הילד
            </Link>
            {coinBalanceAmount != null ? (
              <span
                className={coinBalanceBadgeClass(theme)}
                aria-label={formatCoinAmountHe(coinBalanceAmount)}
              >
                <span className="truncate">{formatCoinAmountHe(coinBalanceAmount)}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Layout>
    );
  }

  const studentDisplayName = student?.full_name ?? "";

  const renderTabContent = () => {
    if (cardsPhase === "loading") {
      return (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className={T.loadingSpinner} aria-hidden />
          <p className={T.loadingText}>טוען קלפים...</p>
        </div>
      );
    }

    if (cardsPhase === "error") {
      return (
        <div className={T.errorBox}>
          <p className={T.errorTitle}>{cardsError}</p>
          <button type="button" onClick={() => void loadCards()} className={T.errorBtn}>
            נסו שוב
          </button>
        </div>
      );
    }

    if (cardsPhase !== "ok") return null;

    if (activeTab === "collection") {
      return (
        <StudentCardsGrid emptyMessage="עדיין אין קלפים באוסף — פתחו קופסת הפתעה בעולם הילד או קנו בחנות!" T={T}>
          {(payload?.collection || []).map((card) => (
            <StudentRewardCard
              key={card.id}
              card={card}
              T={T}
              allowDownload
              studentFullName={studentDisplayName}
              footer={
                card.canConvert ? (
                  <button
                    type="button"
                    disabled={actionBusy === `convert:${card.id}`}
                    onClick={() => void handleConvert(card.id)}
                    className={`${T.recommendCta} text-xs w-full`}
                  >
                    {actionBusy === `convert:${card.id}` ? "ממיר..." : "המר כפילויות"}
                  </button>
                ) : null
              }
            />
          ))}
        </StudentCardsGrid>
      );
    }

    if (activeTab === "shop") {
      return (
        <StudentCardsGrid emptyMessage="אין קלפים זמינים לרכישה כרגע." T={T}>
          {(payload?.shop || []).map((card) => {
            const canBuy = card.canAfford === true && !card.alreadyOwned;
            const priceLabel = Math.floor(Number(card.priceCoins) || 0).toLocaleString("he-IL");
            return (
              <StudentRewardCard
                key={card.id}
                card={card}
                T={T}
                showLockedStamp={!card.alreadyOwned}
                footer={
                  card.alreadyOwned ? (
                    <p className={`text-xs font-semibold ${T.tileSub}`}>כבר באוסף שלך</p>
                  ) : (
                    <>
                      <p className={`text-sm font-semibold ${T.statValue}`}>
                        {formatCoinAmountHe(card.priceCoins)}
                      </p>
                      {!canBuy ? (
                        <p className={`text-xs ${T.tileSub}`}>
                          {card.missingCoins > 0
                            ? `חסרים לך ${formatCoinAmountHe(card.missingCoins)}`
                            : "אין מספיק מטבעות"}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={actionBusy === card.id || !canBuy}
                        onClick={() => void handlePurchase(card.id)}
                        className={`${T.ctaPrimary} text-xs w-full disabled:opacity-50 disabled:pointer-events-none`}
                      >
                        {actionBusy === card.id ? "קונה..." : `קנה ב־${priceLabel}`}
                      </button>
                    </>
                  )
                }
              />
            );
          })}
        </StudentCardsGrid>
      );
    }

    if (activeTab === "locked") {
      return (
        <StudentCardsGrid emptyMessage="אין קלפים נעולים — כל הכבוד!" T={T}>
          {(payload?.locked || []).map((card) => (
            <StudentRewardCard
              key={card.id}
              card={card}
              T={T}
              showLockedStamp
              footer={
                card.lockMessageHe ? (
                  <p className={`text-xs leading-snug ${T.tileSub}`}>{card.lockMessageHe}</p>
                ) : null
              }
            />
          ))}
        </StudentCardsGrid>
      );
    }

    if (activeTab === "series") {
      const series = payload?.seriesProgress || [];
      if (!series.length) {
        return <p className={`text-right py-6 ${T.emptyText}`}>עדיין אין סדרות קלפים.</p>;
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 w-full min-w-0">
          {series.map((s) => (
            <StudentSeriesProgressCard
              key={s.seriesId}
              series={s}
              T={T}
              studentFullName={studentDisplayName}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <Layout studentTheme={theme} studentShell="home">
      <div className={`w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 pb-8 overflow-x-hidden ${T.pageWrap}`}>
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 text-right min-w-0">
          <div className="min-w-0">
            <h1 className={T.heroTitle}>הקלפים שלי</h1>
            <p className={T.heroSub}>אוסף, חנות, קלפים נעולים וסדרות</p>
          </div>
          <div dir="ltr" className="flex flex-row items-center gap-2 shrink-0 self-end sm:self-auto min-w-0 max-w-full">
            <Link href="/student/home" className={`${T.ctaGames} shrink-0`}>
              חזרה לעולם הילד
            </Link>
            {coinBalanceAmount != null ? (
              <span
                className={coinBalanceBadgeClass(theme)}
                aria-label={formatCoinAmountHe(coinBalanceAmount)}
              >
                <span className="truncate">{formatCoinAmountHe(coinBalanceAmount)}</span>
              </span>
            ) : null}
          </div>
        </header>

        {messageHe ? (
          <p className="mb-3 text-sm text-emerald-700 dark:text-emerald-300 text-right">{messageHe}</p>
        ) : null}

        {convertibleCards.length > 0 ? (
          <section className={`mb-4 rounded-xl border p-3 sm:p-4 min-w-0 overflow-hidden ${T.statCard}`}>
            <p className={`font-semibold ${T.tileTitle}`}>יש לכם כפילויות להמרה!</p>
            <p className={`text-sm mt-1 ${T.tileSub}`}>
              {convertibleCards.length} קלפים מוכנים להמרה למטבעות.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-end">
              {convertibleCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={actionBusy === `convert:${c.id}`}
                  onClick={() => void handleConvert(c.id)}
                  className={T.ctaPrimary}
                >
                  {actionBusy === `convert:${c.id}` ? "ממיר..." : `המר «${c.nameHe}»`}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <nav
          className="grid grid-cols-4 gap-1 sm:gap-2 w-full min-w-0 mb-4"
          aria-label="לשוניות קלפים"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={tabButtonClass(tab.id, activeTab === tab.id)}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </nav>

        <StudentCardsTabPanel T={T}>{renderTabContent()}</StudentCardsTabPanel>
      </div>
    </Layout>
  );
}
