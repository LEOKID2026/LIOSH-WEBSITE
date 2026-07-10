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

const dockShell =
  "flex flex-col items-center gap-1.5 px-2 py-1.5 md:gap-2.5 md:px-4 md:py-2.5";

const dockRowClass = "grid grid-cols-6 gap-1.5 md:gap-2.5 justify-items-center";

const DOCK_ICONS_PER_ROW = 6;

const dockBtnClass =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/50 bg-white/70 text-center shadow-sm transition hover:bg-white/85 active:scale-95 sm:h-10 sm:w-10 md:h-14 md:w-14 md:rounded-xl";

const dockIconClass = "text-base leading-none md:text-2xl";

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

  const dockRows = useMemo(() => {
    /** @type {Array<{ kind: "surprise" } | { kind: "primary", item: typeof STUDENT_WORLD_DOCK_PRIMARY[number] } | { kind: "panel", entry: typeof STUDENT_WORLD_MORE_PANELS[number] }>} */
    const ordered = [];
    if (surpriseEnabled) ordered.push({ kind: "surprise" });
    for (const item of primaryItems) ordered.push({ kind: "primary", item });
    for (const entry of STUDENT_WORLD_MORE_PANELS) ordered.push({ kind: "panel", entry });
    return {
      rowOne: ordered.slice(0, DOCK_ICONS_PER_ROW),
      rowTwo: ordered.slice(DOCK_ICONS_PER_ROW, DOCK_ICONS_PER_ROW * 2),
    };
  }, [primaryItems, surpriseEnabled]);

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
            ? `קופסת הפתעה — הקופסה הבאה תהיה מוכנה בעוד ${surpriseCountdownHe}`
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
        <span className="absolute -left-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
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

  return (
    <div className="flex w-full justify-center -translate-y-5 pt-1 md:translate-y-2 md:pt-2" data-testid="student-world-dock">
      <div className={dockShell}>
        <div className={dockRowClass}>
          {dockRows.rowOne.map((entry) => (
            <span key={entry.kind === "surprise" ? "surprise" : entry.kind === "primary" ? entry.item.id : entry.entry.id} className="contents">
              {renderDockEntry(entry)}
            </span>
          ))}
        </div>

        {surpriseEnabled && surpriseCountdownHe ? (
          <p
            className="max-w-[18rem] text-center text-[10px] font-semibold text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] sm:text-xs"
            data-testid="student-world-dock-surprise-countdown"
          >
            הקופסה הבאה בעוד{" "}
            <span className="tabular-nums">{surpriseCountdownHe}</span>
          </p>
        ) : null}

        <div className={dockRowClass} data-testid="student-world-dock-secondary">
          {dockRows.rowTwo.map((entry) => (
            <span key={entry.kind === "primary" ? entry.item.id : entry.entry.id} className="contents">
              {renderDockEntry(entry)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
