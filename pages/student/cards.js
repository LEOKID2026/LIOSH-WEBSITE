import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import {
  StudentCardsTabPanel,
  StudentSeriesProgressCard,
} from "../../components/student/rewards/StudentRewardCard";
import WindowedStudentCardsGrid from "../../components/student/rewards/WindowedStudentCardsGrid.jsx";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { isCardRewardsEnabledClient } from "../../lib/rewards/reward-feature-flags.client.js";
import { formatCoinAmountHe, formatCoinAmountNumberHe, SHOP_CARD_ALREADY_OWNED_HE, SHOP_CARD_SELL_DUPLICATE_HE, CATALOG_CARD_OWNED_HE } from "../../lib/rewards/rewards-ui.he.js";
import StudentLoadingPanel from "../../components/ui/StudentLoadingPanel.jsx";

const CARDS_ENDPOINTS = {
  summary: "/api/student/rewards/cards/summary",
  collection: "/api/student/rewards/cards/collection",
  shop: "/api/student/rewards/cards/shop",
  catalog: "/api/student/rewards/cards/catalog",
  series: "/api/student/rewards/cards/series",
};
const PURCHASE_PATH = "/api/student/rewards/shop/purchase";
const SELL_DUPLICATE_PATH = "/api/student/rewards/shop/sell-duplicate";

const TABS = [
  { id: "collection", label: "האוסף שלי", shortLabel: "אוסף" },
  { id: "shop", label: "חנות קלפים", shortLabel: "חנות" },
  { id: "catalog", label: "כל הקלפים", shortLabel: "הכל" },
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
  catalog: {
    idle: "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/35 dark:border-amber-700/45 dark:text-amber-100 dark:hover:bg-amber-900/45",
    active: "bg-amber-500 border-amber-600 text-white shadow-sm dark:bg-amber-600 dark:border-amber-500",
  },
  series: {
    idle: "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 dark:bg-violet-950/35 dark:border-violet-700/45 dark:text-violet-100 dark:hover:bg-violet-900/45",
    active: "bg-violet-500 border-violet-600 text-white shadow-sm dark:bg-violet-600 dark:border-violet-500",
  },
};

/** Shared row height for back / coins / theme / tabs — keep all items visually equal. */
const CARDS_HEADER_ROW_HEIGHT = "min-h-[2.75rem] sm:min-h-[3.25rem]";

function CardRequirementProgress({ card, T }) {
  const target = Number(card.progressTarget);
  const current = Math.max(0, Number(card.progressCurrent) || 0);
  if (!Number.isFinite(target) || target <= 0) {
    const text = card.requirementHe || card.lockMessageHe;
    return text ? (
      <p className={`text-xs leading-snug min-h-[1.125rem] ${T.tileSub}`}>{text}</p>
    ) : (
      <p className={`text-xs min-h-[1.125rem] ${T.tileSub}`}>{"\u00a0"}</p>
    );
  }
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="space-y-1 min-w-0">
      <p className={`text-xs leading-snug ${T.tileSub}`}>
        {card.requirementHe || card.progressHe || card.lockMessageHe}
      </p>
      <div className={`${T.progressTrack} w-full`}>
        <div className={T.progressFill} style={{ width: `${pct}%` }} />
      </div>
      {card.progressHe ? (
        <p className={`text-[10px] tabular-nums ${T.tileSub}`}>{card.progressHe}</p>
      ) : null}
    </div>
  );
}

function cardsHeaderRowMetricsClass() {
  return (
    `${CARDS_HEADER_ROW_HEIGHT} px-1 sm:px-2 md:px-3 py-0 ` +
    "text-base sm:text-lg md:text-xl font-extrabold leading-none"
  );
}

function cardsHeaderItemSizeClass() {
  return (
    "min-w-0 w-full inline-flex items-center justify-center " +
    cardsHeaderRowMetricsClass() +
    " whitespace-normal sm:whitespace-nowrap"
  );
}

function cardsHeaderCoinSizeClass() {
  return (
    "inline-flex w-auto max-w-none shrink-0 items-center justify-center overflow-visible " +
    cardsHeaderRowMetricsClass() +
    " whitespace-nowrap"
  );
}

function cardsBackButtonSizeClass() {
  return (
    "w-auto shrink-0 min-h-[3rem] sm:min-h-[3.5rem] px-1 py-2 text-base leading-none " +
    "sm:px-3 sm:py-2.5 sm:text-lg md:px-5 md:text-xl whitespace-nowrap"
  );
}

function tabButtonClass(tabId, active) {
  const base =
    "min-w-0 w-full rounded-lg border text-center transition-colors " +
    cardsHeaderItemSizeClass();
  const palette = TAB_STYLES[tabId] || TAB_STYLES.collection;
  return `${base} ${active ? palette.active : palette.idle}`;
}

function cardsBackButtonClass(theme, variant = "games") {
  const shell = `inline-flex justify-center items-center rounded-xl font-bold text-center shadow-sm ${cardsBackButtonSizeClass()}`;
  if (variant === "primary") {
    return theme === "classic"
      ? `${shell} border border-emerald-400/35 bg-emerald-500/90 text-white hover:bg-emerald-500`
      : `${shell} bg-sky-600 text-white hover:bg-sky-700`;
  }
  return theme === "classic"
    ? `${shell} border border-violet-400/35 bg-violet-500/20 text-white hover:bg-violet-500/30`
    : `${shell} bg-violet-600 text-white hover:bg-violet-700`;
}

function coinBalanceBadgeClass(theme) {
  const shell =
    "inline-flex justify-center items-center gap-0.5 sm:gap-1 rounded-xl font-bold tabular-nums shadow-sm border";
  if (theme === "classic") {
    return `${shell} border-amber-400/35 bg-amber-500/15 text-amber-100`;
  }
  return `${shell} border-amber-400/50 bg-amber-500/15 text-amber-900`;
}

function CardsPageHeaderActions({ theme, coinBalanceAmount, backVariant = "games" }) {
  const gridCols = coinBalanceAmount != null
    ? "grid-cols-[auto_auto]"
    : "grid-cols-[auto]";

  return (
    <div dir="ltr" className={`grid ${gridCols} gap-1 sm:gap-2 w-full sm:w-auto min-w-0 items-stretch`}>
      <Link href="/student/home" className={cardsBackButtonClass(theme, backVariant)}>
        עולם הילד
      </Link>
      {coinBalanceAmount != null ? (
        <span
          className={`${coinBalanceBadgeClass(theme)} ${cardsHeaderCoinSizeClass()}`}
          aria-label={formatCoinAmountHe(coinBalanceAmount)}
        >
          <span aria-hidden className="text-2xl sm:text-[1.75rem] leading-none shrink-0">
            🪙
          </span>
          <span className="shrink-0">{formatCoinAmountNumberHe(coinBalanceAmount)}</span>
        </span>
      ) : null}
    </div>
  );
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
  const [loadedTabs, setLoadedTabs] = useState(() => new Set());
  const [tabLoading, setTabLoading] = useState({});
  const loadedTabsRef = useRef(new Set());
  const [actionBusy, setActionBusy] = useState("");
  const [messageHe, setMessageHe] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const rewardsEnabled = isCardRewardsEnabledClient();

  const fetchCardsEndpoint = useCallback(async (path) => {
    const res = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok !== true) {
      throw new Error(json?.error || "cards_load_failed");
    }
    return json;
  }, []);

  const loadSummary = useCallback(async () => {
    const json = await fetchCardsEndpoint(CARDS_ENDPOINTS.summary);
    setPayload((prev) => ({
      ...(prev || {}),
      coinBalance: json.coinBalance,
      counts: json.counts,
    }));
    return json;
  }, [fetchCardsEndpoint]);

  const loadTabData = useCallback(
    async (tabId, { force = false } = {}) => {
      if (!CARDS_ENDPOINTS[tabId]) return;
      if (!force && loadedTabsRef.current.has(tabId)) return;

      setTabLoading((prev) => ({ ...prev, [tabId]: true }));
      try {
        const json = await fetchCardsEndpoint(CARDS_ENDPOINTS[tabId]);
        setPayload((prev) => {
          const next = { ...(prev || {}) };
          if (tabId === "collection") next.collection = json.collection;
          if (tabId === "shop") next.shop = json.shop;
          if (tabId === "catalog") next.catalog = json.catalog;
          if (tabId === "series") next.seriesProgress = json.seriesProgress;
          return next;
        });
        loadedTabsRef.current.add(tabId);
        setLoadedTabs(new Set(loadedTabsRef.current));
      } finally {
        setTabLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    },
    [fetchCardsEndpoint]
  );

  const loadInitialCards = useCallback(async () => {
    setCardsPhase("loading");
    setCardsError("");
    loadedTabsRef.current = new Set();
    setLoadedTabs(new Set());
    try {
      await Promise.all([loadSummary(), loadTabData("collection")]);
      setCardsPhase("ok");
    } catch {
      setCardsError("לא הצלחנו לטעון את הקלפים.");
      setCardsPhase("error");
    }
  }, [loadSummary, loadTabData]);

  const refreshAfterCardAction = useCallback(async () => {
    loadedTabsRef.current.delete("shop");
    loadedTabsRef.current.delete("collection");
    loadedTabsRef.current.delete("catalog");
    loadedTabsRef.current.delete("series");
    setLoadedTabs(new Set(loadedTabsRef.current));

    const refreshes = [loadSummary(), loadTabData("shop", { force: true }), loadTabData("collection", { force: true })];
    if (activeTab === "catalog") refreshes.push(loadTabData("catalog", { force: true }));
    if (activeTab === "series") refreshes.push(loadTabData("series", { force: true }));
    await Promise.all(refreshes);
  }, [loadSummary, loadTabData, activeTab]);

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
        if (rewardsEnabled) void loadInitialCards();
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/student/login");
      });

    return () => {
      mounted = false;
    };
  }, [router.isReady, router, loadInitialCards, rewardsEnabled]);

  useEffect(() => {
    if (cardsPhase !== "ok") return undefined;
    void loadTabData(activeTab);
    return undefined;
  }, [activeTab, cardsPhase, loadTabData]);

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
    setMessageIsError(false);
    try {
      const res = await fetch(PURCHASE_PATH, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setMessageIsError(true);
        setMessageHe(json?.code === "insufficient_coins" ? "אין מספיק מטבעות לרכישה." : "הרכישה לא הצליחה - נסו שוב.");
        return;
      }
      setMessageIsError(false);
      setMessageHe(`קניתם את ${json.card?.name_he || json.card?.nameHe || "הקלף"}!`);
      if (json.balanceAfter != null) {
        setStudent((prev) => (prev ? { ...prev, coin_balance: json.balanceAfter } : prev));
      }
      await refreshAfterCardAction();
    } catch {
      setMessageIsError(true);
      setMessageHe("שגיאת רשת ברכישה.");
    } finally {
      setActionBusy("");
    }
  };

  const handleSellDuplicate = async (card) => {
    if (!card?.canSellDuplicate || card?.sellbackCoins <= 0) return;

    const confirmed = window.confirm(
      `למכור עותק כפול של ${card.nameHe} ולקבל ${formatCoinAmountHe(card.sellbackCoins)}?\n` +
        "יישאר לך עותק אחד באוסף."
    );
    if (!confirmed) return;

    const busyKey = `sell:${card.id}`;
    setActionBusy(busyKey);
    setMessageHe("");
    setMessageIsError(false);
    try {
      const res = await fetch(SELL_DUPLICATE_PATH, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          idempotencyKey: `card:sellback:${card.id}:${card.duplicateCount ?? 0}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setMessageIsError(true);
        setMessageHe(
          json?.code === "no_duplicate"
            ? "אין עותק כפול למכירה."
            : "מכירת העותק הכפול לא הצליחה - נסו שוב."
        );
        return;
      }
      setMessageIsError(false);
      setMessageHe(
        `מכרתם עותק כפול של ${json.card?.name_he || json.card?.nameHe || card.nameHe} וקיבלתם ${formatCoinAmountHe(json.sellbackCoins || 0)}!`
      );
      if (json.balanceAfter != null) {
        setStudent((prev) => (prev ? { ...prev, coin_balance: json.balanceAfter } : prev));
      }
      await refreshAfterCardAction();
    } catch {
      setMessageIsError(true);
      setMessageHe("שגיאת רשת במכירה.");
    } finally {
      setActionBusy("");
    }
  };

  if (authPhase === "checking" || authPhase === "anon") {
    return (
      <Layout studentTheme={theme} studentShell="home">
        <div className={`min-h-[60vh] ${T.pageWrap}`} aria-busy="true" />
      </Layout>
    );
  }

  if (!rewardsEnabled) {
    return (
      <Layout studentTheme={theme} studentShell="home">
        <div className={`max-w-6xl mx-auto px-3 sm:px-4 py-8 text-right overflow-x-hidden ${T.pageWrap}`}>
          <p className={T.emptyText}>אוסף הקלפים עדיין לא זמין.</p>
          <div className="w-full min-w-0 sm:w-auto">
            <CardsPageHeaderActions
              theme={theme}
              coinBalanceAmount={coinBalanceAmount}
              backVariant="primary"
            />
          </div>
        </div>
      </Layout>
    );
  }

  const studentDisplayName = student?.full_name ?? "";

  const renderTabContent = () => {
    if (cardsPhase === "loading") {
      return <StudentLoadingPanel message="טוען קלפים..." reportPage />;
    }

    if (cardsPhase === "error") {
      return (
        <div className={T.errorBox}>
          <p className={T.errorTitle}>{cardsError}</p>
          <button type="button" onClick={() => void loadInitialCards()} className={T.errorBtn}>
            נסו שוב
          </button>
        </div>
      );
    }

    if (cardsPhase !== "ok") return null;

    if (tabLoading[activeTab] || !loadedTabs.has(activeTab)) {
      return <StudentLoadingPanel message="טוען קלפים..." reportPage />;
    }

    if (activeTab === "collection") {
      const collectionList = payload?.collection || [];
      return (
        <WindowedStudentCardsGrid
          items={collectionList}
          emptyMessage="עדיין אין קלפים באוסף - פתחו קופסת הפתעה בעולם הילד או קנו בחנות!"
          T={T}
          previewCards={collectionList}
          studentFullName={studentDisplayName}
          getPreviewAllowDownload={() => true}
          renderCardProps={() => ({
            footer: null,
            allowDownload: true,
          })}
        />
      );
    }

    if (activeTab === "shop") {
      const shopList = payload?.shop || [];
      const shopPreviewCards = shopList.map((c) =>
        c.alreadyOwned ? c : { ...c, showLockedStamp: true }
      );
      return (
        <WindowedStudentCardsGrid
          items={shopList}
          emptyMessage="אין קלפים זמינים לרכישה כרגע."
          T={T}
          previewCards={shopPreviewCards}
          studentFullName={studentDisplayName}
          getPreviewAllowDownload={(card) => card.alreadyOwned === true}
          renderCardProps={(card) => {
            const canBuy = card.canAfford === true && !card.alreadyOwned;
            const canSell = card.canSellDuplicate === true && card.sellbackCoins > 0;
            const ownedOnly = card.alreadyOwned && !canSell;
            const priceLabel = Math.floor(Number(card.priceCoins) || 0).toLocaleString("he-IL");
            const sellBusy = actionBusy === `sell:${card.id}`;
            const buyBusy = actionBusy === card.id;
            return {
              showLockedStamp: !card.alreadyOwned,
              allowDownload: card.alreadyOwned,
              footer: (
                <>
                  <p className={`text-sm font-semibold ${T.statValue}`}>
                    מחיר קנייה: {formatCoinAmountHe(card.priceCoins)}
                  </p>
                  {card.sellbackCoins > 0 ? (
                    <p className={`text-xs leading-snug ${T.tileSub}`}>
                      שווי מכירה: {formatCoinAmountHe(card.sellbackCoins)}
                    </p>
                  ) : (
                    <p className={`text-xs min-h-[1.125rem] ${T.tileSub}`}>{"\u00a0"}</p>
                  )}
                  <p className={`text-xs leading-snug min-h-[1.125rem] ${T.tileSub}`}>
                    {!card.alreadyOwned && !canBuy
                      ? card.missingCoins > 0
                        ? `חסרים לך ${formatCoinAmountHe(card.missingCoins)}`
                        : "אין מספיק מטבעות"
                      : "\u00a0"}
                  </p>
                  <button
                    type="button"
                    disabled={ownedOnly || sellBusy || buyBusy || (!canBuy && !canSell)}
                    onClick={() => {
                      if (canSell) void handleSellDuplicate(card);
                      else if (canBuy) void handlePurchase(card.id);
                    }}
                    className={
                      ownedOnly
                        ? `${T.ctaPrimary} text-xs w-full !bg-amber-500 hover:!bg-amber-500 !text-white shadow-md cursor-default disabled:!opacity-100`
                        : canSell
                          ? `${T.ctaGames} text-xs w-full disabled:opacity-50 disabled:pointer-events-none`
                          : `${T.ctaPrimary} text-xs w-full disabled:opacity-50 disabled:pointer-events-none`
                    }
                  >
                    {canSell
                      ? sellBusy
                        ? "מוכר..."
                        : SHOP_CARD_SELL_DUPLICATE_HE
                      : card.alreadyOwned
                        ? SHOP_CARD_ALREADY_OWNED_HE
                        : buyBusy
                          ? "קונה..."
                          : `קנה ב-${priceLabel}`}
                  </button>
                </>
              ),
            };
          }}
        />
      );
    }

    if (activeTab === "catalog") {
      const catalogList = payload?.catalog || [];
      const catalogPreviewCards = catalogList.map((c) =>
        c.isOwned ? c : { ...c, showLockedStamp: true }
      );
      return (
        <WindowedStudentCardsGrid
          items={catalogList}
          emptyMessage="אין קלפים להצגה."
          T={T}
          previewCards={catalogPreviewCards}
          studentFullName={studentDisplayName}
          getPreviewAllowDownload={(card) => card.isOwned === true}
          renderCardProps={(card) => ({
            showLockedStamp: !card.isOwned,
            allowDownload: card.isOwned,
            footer: card.isOwned ? (
              <p className="text-xs font-bold text-amber-500 dark:text-amber-300">{CATALOG_CARD_OWNED_HE}</p>
            ) : (
              <CardRequirementProgress card={card} T={T} />
            ),
          })}
        />
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
            <p className={T.heroSub}>אוסף, חנות, כל הקלפים וסדרות</p>
          </div>
          <div className="w-full min-w-0 sm:w-auto">
            <CardsPageHeaderActions theme={theme} coinBalanceAmount={coinBalanceAmount} />
          </div>
        </header>

        {messageHe ? (
          <p
            className={`mb-3 text-sm text-right ${
              messageIsError
                ? "text-rose-700 dark:text-rose-300"
                : "text-emerald-700 dark:text-emerald-300"
            }`}
            role={messageIsError ? "alert" : "status"}
          >
            {messageHe}
          </p>
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
