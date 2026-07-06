import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { formatCoinAmountHe } from "../../../lib/rewards/rewards-ui.he.js";
import RewardCardImage from "./RewardCardImage.jsx";

const OPEN_PATH = "/api/student/rewards/surprise-box/open";
const OPEN_TIMEOUT_MS = 12000;

const CARD_THUMB_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

function SurpriseBoxCardPrizeRow({ card, T }) {
  const imageSrc = card.imageThumbUrl || card.imageUrl || CARD_THUMB_PLACEHOLDER;

  return (
    <li className={`rounded-xl border p-3 sm:p-4 min-w-0 overflow-hidden ${T.subjectCard}`}>
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex-1 min-w-0 text-right">
          <p className={`font-bold leading-snug ${T.subjectTitle}`}>{card.nameHe}</p>
          <p className={`text-sm mt-1 ${T.tileSub}`}>נדירות: {card.rarityHe}</p>
          {card.wasDuplicate ? (
            <p className="text-sm mt-2 text-amber-700 dark:text-amber-300">
              {card.conversionProgressHe || "קיבלתם עותק נוסף — אפשר לאסוף ולהמיר כפילויות."}
            </p>
          ) : (
            <p className="text-sm mt-2 text-emerald-700 dark:text-emerald-300">קלף חדש באוסף!</p>
          )}
        </div>
        <div className="shrink-0 w-11 sm:w-14 aspect-[2/3]" aria-hidden>
          <RewardCardImage
            src={imageSrc}
            preBaked={card.imageVariantsReady === true}
            size="thumb"
            fit="cover"
            wrapperClassName="w-full h-full"
          />
        </div>
      </div>
    </li>
  );
}

export default function StudentSurpriseBoxOpenModal({ open, onClose, onOpened, onError }) {
  const { homeModalShell, tokens: T, isBright } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);
  const openSessionRef = useRef(0);
  const onOpenedRef = useRef(onOpened);
  const onErrorRef = useRef(onError);

  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorHe, setErrorHe] = useState("");

  useEffect(() => {
    onOpenedRef.current = onOpened;
    onErrorRef.current = onError;
  }, [onOpened, onError]);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setResult(null);
      setErrorHe("");
      return undefined;
    }

    const session = openSessionRef.current + 1;
    openSessionRef.current = session;

    const abortController = new AbortController();
    let timedOut = false;

    setPhase("opening");
    setErrorHe("");
    setResult(null);

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      abortController.abort();
      if (openSessionRef.current !== session) return;
      setErrorHe("לא הצלחנו לפתוח את הקופסה בזמן. נסו שוב.");
      setPhase("error");
      onErrorRef.current?.();
    }, OPEN_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(OPEN_PATH, {
          method: "POST",
          credentials: "include",
          signal: abortController.signal,
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey: `box:${Date.now()}:${session}` }),
        });
        const json = await res.json().catch(() => ({}));
        if (openSessionRef.current !== session || timedOut) return;

        if (!res.ok || json?.ok !== true) {
          if (json?.code === "no_pending_box") {
            setErrorHe("אין קופסה זמינה כרגע.");
          } else {
            setErrorHe("לא הצלחנו לפתוח את הקופסה. נסו שוב.");
          }
          setPhase("error");
          onErrorRef.current?.();
          return;
        }

        setResult(json);
        setPhase("done");
        onOpenedRef.current?.(json);
      } catch (err) {
        if (openSessionRef.current !== session || timedOut) return;
        if (err?.name === "AbortError") return;
        setErrorHe("שגיאת רשת בפתיחת הקופסה.");
        setPhase("error");
        onErrorRef.current?.();
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && phase !== "opening") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, phase]);

  if (!open) return null;

  const cards = Array.isArray(result?.cards) ? result.cards : [];
  const coinAmounts = Array.isArray(result?.coinAmounts)
    ? result.coinAmounts
    : result?.coinsReward != null
      ? [result.coinsReward]
      : [];
  const diamondsReward = Math.floor(Number(result?.diamondsReward) || 0);

  return (
    <div
      className={homeModalShell.overlay}
      role="presentation"
      onClick={() => {
        if (phase !== "opening") onClose?.();
      }}
    >
      <div
        className={`${homeModalShell.panel} md:max-w-lg w-full max-h-[90vh] overflow-y-auto overflow-x-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        lang="he"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={`sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 ${
            isBright ? "border-amber-200 bg-gradient-to-l from-amber-50 to-white" : "border-white/10 bg-black/30"
          }`}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={phase === "opening"}
            className={homeModalShell.closeBtn}
            aria-label="סגור"
          >
            ✕
          </button>
          <h2 id={titleId} className={`text-lg font-bold text-right flex-1 ${T.tileTitle}`}>
            {phase === "opening" ? "פותחים קופסה..." : phase === "done" ? "יש! קיבלתם פרסים!" : "קופסת הפתעה"}
          </h2>
          <span className="text-2xl shrink-0" aria-hidden>
            🎁
          </span>
        </header>

        <div className="p-4 md:p-5 space-y-4 text-right">
          {phase === "opening" ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className={T.loadingSpinner} aria-hidden />
              <p className={T.loadingText}>מגלגלים את הפרסים...</p>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className={T.errorBox}>
              <p className={T.errorTitle}>{errorHe}</p>
              <button type="button" onClick={onClose} className={T.errorBtn}>
                סגור
              </button>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <>
              <p className={`text-sm ${T.panelIntro}`}>
                {coinAmounts.length > 0 && diamondsReward > 0 && cards.length > 0
                  ? `קיבלתם מטבעות, יהלומים ו-${cards.length} קלפים:`
                  : coinAmounts.length > 0 && diamondsReward > 0
                    ? `קיבלתם מטבעות ויהלומים:`
                    : coinAmounts.length > 0 && cards.length > 0
                      ? `קיבלתם ${coinAmounts.length} פרס${coinAmounts.length > 1 ? "י" : ""} מטבעות ו-${cards.length} קלפים:`
                      : coinAmounts.length > 0
                        ? `קיבלתם ${coinAmounts.length} פרס${coinAmounts.length > 1 ? "י" : ""} מטבעות:`
                        : diamondsReward > 0 && cards.length > 0
                          ? `קיבלתם יהלומים ו-${cards.length} קלפים:`
                          : diamondsReward > 0
                            ? "קיבלתם יהלומים!"
                            : cards.length > 0
                              ? `קיבלתם ${cards.length} קלפים:`
                              : "קיבלתם פרס!"}
              </p>

              {diamondsReward > 0 ? (
                <div className={`rounded-xl border p-4 space-y-2 ${T.statCard}`}>
                  <p className={`text-xs ${T.statLabel}`}>יהלומים</p>
                  <p className={`text-xl font-bold ${T.statValue}`}>+{diamondsReward} 💎</p>
                </div>
              ) : null}

              {coinAmounts.length > 0 ? (
                <div className={`rounded-xl border p-4 space-y-2 ${T.statCard}`}>
                  <p className={`text-xs ${T.statLabel}`}>מטבעות</p>
                  {coinAmounts.length === 1 ? (
                    <p className={`text-xl font-bold ${T.statValue}`}>
                      {formatCoinAmountHe(coinAmounts[0])}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {coinAmounts.map((amount, i) => (
                        <li key={i} className={`text-base font-bold ${T.statValue}`}>
                          פרס {i + 1}: {formatCoinAmountHe(amount)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {cards.length > 0 ? (
                <ul className="space-y-3 min-w-0">
                  {cards.map((card, i) => (
                    <SurpriseBoxCardPrizeRow key={`${card.nameHe}-${i}`} card={card} T={T} />
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {cards.length > 0 ? (
                  <Link href="/student/cards" className={`${T.ctaPrimary} text-center flex-1`}>
                    לאוסף שלי
                  </Link>
                ) : null}
                <button type="button" onClick={onClose} className={`${T.ctaGames} flex-1`}>
                  המשך לעולם הילד
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
