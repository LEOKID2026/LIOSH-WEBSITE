import { useCallback, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { formatCoinAmountHe } from "../../../lib/rewards/rewards-ui.he.js";
import RewardCardImage from "./RewardCardImage.jsx";

const OPEN_PATH = "/api/student/rewards/surprise-box/open";
const OPEN_TIMEOUT_MS = 30_000;
const OPEN_ERROR_HE = "לא הצלחנו לפתוח את הקופסה כרגע. נסו שוב עוד רגע.";
const NO_MORE_BOX_HE = "אין כרגע קופסה נוספת לפתיחה.";

const CARD_THUMB_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

function SurpriseBoxCardPrizeRow({ card, T }) {
  const imageSrc = card.imageThumbUrl || card.imageUrl || CARD_THUMB_PLACEHOLDER;

  return (
    <li className={`rounded-lg border p-2 min-w-0 overflow-hidden ${T.subjectCard}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0 text-right">
          <p className={`text-sm font-bold leading-snug ${T.subjectTitle}`}>{card.nameHe}</p>
          <p className={`text-xs mt-0.5 ${T.tileSub}`}>נדירות: {card.rarityHe}</p>
          {card.wasDuplicate ? (
            <p className="text-xs mt-1 text-amber-700 dark:text-amber-300 line-clamp-2">
              {card.conversionProgressHe || "קיבלתם עותק נוסף - אפשר לאסוף ולהמיר כפילויות."}
            </p>
          ) : (
            <p className="text-xs mt-1 text-emerald-700 dark:text-emerald-300">קלף חדש באוסף!</p>
          )}
        </div>
        <div className="shrink-0 w-9 aspect-[2/3]" aria-hidden>
          <RewardCardImage
            src={imageSrc}
            preBaked={card.imageVariantsReady === true}
            size="thumb"
            fit="cover"
            loading="eager"
            wrapperClassName="w-full h-full"
          />
        </div>
      </div>
    </li>
  );
}

export default function StudentSurpriseBoxOpenModal({ open, onClose, onOpened }) {
  const { homeModalShell, tokens: T, isBright } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  const isReopenAttemptRef = useRef(false);
  const [openAttempt, setOpenAttempt] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorHe, setErrorHe] = useState("");
  const [remainingPending, setRemainingPending] = useState(0);

  const notifyOpened = useCallback((json) => {
    try {
      onOpenedRef.current?.(json);
    } catch {
      /* parent status refresh must not affect prize reveal */
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setOpenAttempt(0);
      setPhase("idle");
      setResult(null);
      setErrorHe("");
      setRemainingPending(0);
      isReopenAttemptRef.current = false;
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    const isReopen = isReopenAttemptRef.current;
    const idempotencyKey = `box:${Date.now()}:${openAttempt}`;

    setPhase("opening");
    setErrorHe("");
    setResult(null);

    (async () => {
      const timeoutId = setTimeout(() => controller.abort(), OPEN_TIMEOUT_MS);
      try {
        const res = await fetch(OPEN_PATH, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey }),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || json?.ok !== true) {
          if (json?.code === "no_pending_box") {
            setRemainingPending(0);
            setErrorHe(isReopen ? NO_MORE_BOX_HE : "אין קופסה מוכנה כרגע - נסו שוב מאוחר יותר.");
            notifyOpened(json);
          } else {
            setErrorHe(OPEN_ERROR_HE);
          }
          setPhase("error");
          return;
        }
        const pendingAfter = Math.max(0, Number(json.pendingBoxCountAfter) || 0);
        flushSync(() => {
          setResult(json);
          setRemainingPending(pendingAfter);
          setPhase("done");
        });
        notifyOpened(json);
      } catch {
        if (cancelled) return;
        setErrorHe(OPEN_ERROR_HE);
        setPhase("error");
      } finally {
        clearTimeout(timeoutId);
        isReopenAttemptRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, openAttempt, notifyOpened]);

  const handleOpenAnother = useCallback(() => {
    if (phase !== "done" || remainingPending <= 0) return;
    isReopenAttemptRef.current = true;
    setOpenAttempt((attempt) => attempt + 1);
  }, [phase, remainingPending]);

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
      className={`${homeModalShell.overlay} !items-center !justify-center !p-3 sm:!p-4`}
      role="presentation"
      onClick={() => {
        if (phase !== "opening") onClose?.();
      }}
    >
      <div
        className={`${homeModalShell.panel} !h-auto w-full max-w-md !max-h-[min(88vh,100%)] !rounded-2xl overflow-y-auto overflow-x-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        lang="he"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={`sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-3 py-2 ${
            isBright ? "border-amber-200 bg-gradient-to-l from-amber-50 to-white" : "border-white/10 bg-black/30"
          }`}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={phase === "opening"}
            className={`${homeModalShell.closeBtn} !min-h-9 !min-w-9`}
            aria-label="סגור"
          >
            ✕
          </button>
          <h2 id={titleId} className={`text-base font-bold text-right flex-1 ${T.tileTitle}`}>
            {phase === "opening" ? "פותחים קופסה..." : phase === "done" ? "יש! קיבלתם פרסים!" : "קופסת הפתעה"}
          </h2>
          <span className="text-xl shrink-0" aria-hidden>
            🎁
          </span>
        </header>

        <div className="px-3 py-2.5 space-y-2 text-right">
          {phase === "opening" ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <div className={T.loadingSpinner} aria-hidden />
              <p className={`${T.loadingText} text-sm`}>מגלגלים את הפרסים...</p>
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
              {coinAmounts.length > 0 || diamondsReward > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {coinAmounts.length > 0 ? (
                    <div className={`flex-1 min-w-[7rem] rounded-lg border px-2.5 py-2 ${T.statCard}`}>
                      <p className={`text-[10px] leading-tight ${T.statLabel}`}>מטבעות</p>
                      {coinAmounts.length === 1 ? (
                        <p className={`text-base font-bold leading-tight ${T.statValue}`}>
                          {formatCoinAmountHe(coinAmounts[0])}
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {coinAmounts.map((amount, i) => (
                            <li key={i} className={`text-xs font-bold leading-tight ${T.statValue}`}>
                              {i + 1}: {formatCoinAmountHe(amount)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                  {diamondsReward > 0 ? (
                    <div className={`flex-1 min-w-[7rem] rounded-lg border px-2.5 py-2 ${T.statCard}`}>
                      <p className={`text-[10px] leading-tight ${T.statLabel}`}>יהלומים</p>
                      <p className={`text-base font-bold leading-tight ${T.statValue}`}>+{diamondsReward} 💎</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {cards.length > 0 ? (
                <ul className="space-y-1.5 min-w-0">
                  {cards.map((card, i) => (
                    <SurpriseBoxCardPrizeRow key={`${card.nameHe}-${i}`} card={card} T={T} />
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleOpenAnother}
                  disabled={remainingPending <= 0}
                  className={`${T.ctaSurpriseOpen} w-full min-h-[2.5rem] !py-2 !text-sm disabled:opacity-50 disabled:pointer-events-none`}
                >
                  פתח קופסה נוספת
                </button>
                <div className="flex flex-row gap-1.5 w-full min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`${T.ctaGames} flex-1 min-w-0 min-h-[2rem] !px-2 !py-1 !text-xs`}
                  >
                    לעולם הילד
                  </button>
                  <Link
                    href="/student/cards"
                    className={`${T.ctaPrimary} flex-1 min-w-0 min-h-[2rem] !px-2 !py-1 !text-xs text-center`}
                  >
                    לאוסף שלי
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
