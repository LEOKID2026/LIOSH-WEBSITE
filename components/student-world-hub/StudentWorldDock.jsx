import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isCardRewardsEnabledClient } from "../../lib/rewards/reward-feature-flags.client.js";
import { formatCountdownHe } from "../../lib/rewards/rewards-ui.he.js";
import {
  STUDENT_WORLD_DOCK_PRIMARY,
  STUDENT_WORLD_MORE_PANELS,
  isWorldHubPanelLocked,
} from "./studentWorldHubConfig.js";

const SURPRISE_STATUS_PATH = "/api/student/rewards/surprise-box/status";

/** Mobile tighter shell so tiles can grow; md+ keeps prior desktop padding/gaps. */
const dockShell =
  "flex flex-col items-center gap-1 px-1 py-1 md:gap-2.5 md:px-4 md:py-2.5";

/** Mobile: 4×3; md+: 6×2 (unchanged desktop columns). */
const dockGridClass =
  "grid w-full max-w-full grid-cols-4 gap-1 md:grid-cols-6 md:gap-2.5 justify-items-center";

const DOCK_ICONS_PER_DESKTOP_ROW = 6;

/** Mobile tile: ≥+33% vs prior 36px (floor 48px via min size, up to 56px); md+ restores 56×56. */
const dockBtnClass =
  "relative flex aspect-square w-[min(3.5rem,88%)] min-w-12 min-h-12 shrink-0 items-center justify-center rounded-lg border border-white/50 bg-white/70 text-center shadow-sm transition hover:bg-white/85 active:scale-95 md:aspect-auto md:h-14 md:w-14 md:min-h-0 md:min-w-0 md:max-w-none md:rounded-xl";

/** Mobile icon +25% vs prior text-base; md+ restores text-2xl. */
const dockIconClass = "text-xl leading-none md:text-2xl";

/** Mobile badge scales with the larger tile; md+ restores prior size. */
const dockBadgeClass =
  "absolute -left-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white md:-left-1 md:-top-1 md:h-4 md:min-w-[1rem] md:px-0.5 md:text-[9px]";

/**
 * @param {{
 *   guestLockedPanelSet?: Set<string>,
 *   lockMessage?: string,
 *   onOpenPanel?: (panelId: string) => void,
 *   onOpenAvatar?: () => void,
 *   onLockedTap?: (message: string) => void,
 *   onSurpriseOpen?: () => void,
 *   surpriseOpeningLocked?: boolean,
 *   surpriseRefreshToken?: number,
 *   surpriseStatusOverride?: { ready?: boolean, pendingBoxCount?: number } | null,
 * }} props
 */
export default function StudentWorldDock({
  guestLockedPanelSet = new Set(),
  lockMessage = "",
  onOpenPanel,
  onOpenAvatar,
  onLockedTap,
  onSurpriseOpen,
  surpriseOpeningLocked = false,
  surpriseRefreshToken = 0,
  surpriseStatusOverride = null,
}) {
  const [surprisePending, setSurprisePending] = useState(0);
  const [surpriseReady, setSurpriseReady] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  const surpriseEnabled = Boolean(onSurpriseOpen) && isCardRewardsEnabledClient();

  const loadSurpriseStatus = useCallback(async () => {
    if (!surpriseEnabled) return;
    try {
      const res = await fetch(SURPRISE_STATUS_PATH, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) return;
      setSurpriseReady(json.ready === true);
      setSurprisePending(Math.max(0, Number(json.pendingBoxCount) || 0));
      setSecondsRemaining(
        json.secondsRemaining != null ? Math.max(0, Number(json.secondsRemaining) || 0) : null
      );
    } catch {
      /* ignore — dock icon still works */
    }
  }, [surpriseEnabled]);

  useEffect(() => {
    void loadSurpriseStatus();
  }, [loadSurpriseStatus, surpriseRefreshToken]);

  useEffect(() => {
    if (!surpriseStatusOverride) return;
    if (surpriseStatusOverride.pendingBoxCount != null) {
      const count = Math.max(0, Number(surpriseStatusOverride.pendingBoxCount) || 0);
      setSurprisePending(count);
      setSurpriseReady(count > 0);
      if (count <= 0) setSecondsRemaining(null);
    } else if (typeof surpriseStatusOverride.ready === "boolean") {
      setSurpriseReady(surpriseStatusOverride.ready);
    }
  }, [surpriseStatusOverride]);

  useEffect(() => {
    if (!surpriseEnabled || surpriseReady || secondsRemaining == null || secondsRemaining <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev == null || prev <= 1) {
          void loadSurpriseStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [surpriseEnabled, surpriseReady, secondsRemaining, loadSurpriseStatus]);

  const tryPanel = (panelId) => {
    const locked = isWorldHubPanelLocked(panelId, guestLockedPanelSet);
    if (locked) {
      onLockedTap?.(lockMessage);
      return;
    }
    onOpenPanel?.(panelId);
  };

  const canOpenSurprise = surpriseEnabled && surpriseReady && !surpriseOpeningLocked;
  const surpriseCountdownHe =
    !surpriseReady && secondsRemaining != null && secondsRemaining > 0
      ? formatCountdownHe(secondsRemaining)
      : null;

  const primaryItems = STUDENT_WORLD_DOCK_PRIMARY.filter((item) => item.kind !== "more");

  const dockItems = useMemo(() => {
    /** @type {Array<{ kind: "surprise" } | { kind: "primary", item: typeof STUDENT_WORLD_DOCK_PRIMARY[number] } | { kind: "panel", entry: typeof STUDENT_WORLD_MORE_PANELS[number] }>} */
    const ordered = [];
    if (surpriseEnabled) ordered.push({ kind: "surprise" });
    for (const item of primaryItems) ordered.push({ kind: "primary", item });
    for (const entry of STUDENT_WORLD_MORE_PANELS) ordered.push({ kind: "panel", entry });
    return ordered;
  }, [primaryItems, surpriseEnabled]);

  const dockItemKey = (entry) =>
    entry.kind === "surprise" ? "surprise" : entry.kind === "primary" ? entry.item.id : entry.entry.id;

  const renderSurpriseButton = () => (
    <button
      type="button"
      data-testid="student-world-dock-surprise-box"
      data-surprise-ready={canOpenSurprise ? "true" : "false"}
      className={`${dockBtnClass} ${canOpenSurprise ? "ring-2 ring-amber-400" : ""}`}
      title={
        canOpenSurprise
          ? "קופסת הפתעה מוכנה"
          : surpriseCountdownHe
            ? `הקופסה הבאה תהיה מוכנה בעוד ${surpriseCountdownHe}`
            : "קופסת הפתעה"
      }
      aria-label={
        canOpenSurprise
          ? "קופסת הפתעה מוכנה לפתיחה"
          : surpriseCountdownHe
            ? `קופסת הפתעה - הקופסה הבאה תהיה מוכנה בעוד ${surpriseCountdownHe}`
            : "קופסת הפתעה"
      }
      disabled={!canOpenSurprise}
      onClick={() => {
        if (canOpenSurprise) onSurpriseOpen?.();
      }}
    >
      <span className={dockIconClass} aria-hidden>
        🎁
      </span>
      {surprisePending > 0 ? (
        <span className={dockBadgeClass}>
          {surprisePending}
        </span>
      ) : null}
    </button>
  );

  const renderPanelItem = (entry) => {
    const locked = isWorldHubPanelLocked(entry.panelId, guestLockedPanelSet);
    return (
      <button
        key={entry.id}
        type="button"
        data-testid={`student-world-dock-${entry.id}`}
        className={`${dockBtnClass} ${locked ? "opacity-80" : ""}`}
        title={locked ? lockMessage : entry.labelHe}
        aria-label={entry.labelHe}
        onClick={() => tryPanel(entry.panelId)}
      >
        <span className={dockIconClass} aria-hidden>
          {locked ? "🔒" : entry.emoji}
        </span>
      </button>
    );
  };

  const renderDockEntry = (entry) => {
    if (entry.kind === "surprise") return renderSurpriseButton();
    if (entry.kind === "primary") return renderPrimaryItem(entry.item);
    if (entry.kind === "panel") return renderPanelItem(entry.entry);
    return null;
  };

  const renderPrimaryItem = (item) => {
    if (item.kind === "link" && item.href) {
      return (
        <Link
          key={item.id}
          href={item.href}
          data-testid={`student-world-dock-${item.id}`}
          className={dockBtnClass}
          title={item.labelHe}
          aria-label={item.labelHe}
        >
          <span className={dockIconClass} aria-hidden>
            {item.emoji}
          </span>
        </Link>
      );
    }

    if (item.kind === "avatar") {
      return (
        <button
          key={item.id}
          type="button"
          data-testid={`student-world-dock-${item.id}`}
          className={dockBtnClass}
          title={item.labelHe}
          aria-label={item.labelHe}
          onClick={() => onOpenAvatar?.()}
        >
          <span className={dockIconClass} aria-hidden>
            {item.emoji}
          </span>
        </button>
      );
    }

    if (item.kind === "panel" && item.panelId) {
      const locked = isWorldHubPanelLocked(item.panelId, guestLockedPanelSet);
      return (
        <button
          key={item.id}
          type="button"
          data-testid={`student-world-dock-${item.id}`}
          className={`${dockBtnClass} ${locked ? "opacity-80" : ""}`}
          title={locked ? lockMessage : item.labelHe}
          aria-label={item.labelHe}
          onClick={() => tryPanel(item.panelId)}
        >
          <span className={dockIconClass} aria-hidden>
            {locked ? "🔒" : item.emoji}
          </span>
        </button>
      );
    }

    return null;
  };

  const secondaryStart = Math.min(DOCK_ICONS_PER_DESKTOP_ROW, dockItems.length);
  const showSurpriseCountdown = Boolean(surpriseEnabled && surpriseCountdownHe);

  return (
    <div className="flex w-full justify-center -translate-y-5 pt-1 md:translate-y-2 md:pt-2" data-testid="student-world-dock">
      <div className={dockShell}>
        <div className={dockGridClass} data-testid="student-world-dock-grid">
          {dockItems.slice(0, secondaryStart).map((entry) => (
            <span key={dockItemKey(entry)} className="contents">
              {renderDockEntry(entry)}
            </span>
          ))}

          {showSurpriseCountdown ? (
            <p
              className="col-span-full hidden max-w-[18rem] justify-self-center text-center text-[10px] font-semibold text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] sm:text-xs md:block"
              data-testid="student-world-dock-surprise-countdown"
            >
              הקופסה הבאה בעוד{" "}
              <span className="tabular-nums">{surpriseCountdownHe}</span>
            </p>
          ) : null}

          <span className="contents" data-testid="student-world-dock-secondary">
            {dockItems.slice(secondaryStart).map((entry) => (
              <span key={dockItemKey(entry)} className="contents">
                {renderDockEntry(entry)}
              </span>
            ))}
          </span>
        </div>

        {showSurpriseCountdown ? (
          <p className="max-w-[18rem] text-center text-[10px] font-semibold text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] sm:text-xs md:hidden">
            הקופסה הבאה בעוד{" "}
            <span className="tabular-nums">{surpriseCountdownHe}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
