/** Shared Leo Kids UI bits for Solo Games V2 engines. */

import { useEffect, useRef, useState } from "react";
import { useSoloGameShellUi } from "../../../hooks/solo-games/useSoloGameShellUi.js";
export const SOLO_V2_ASSETS = {
  leo: "/images/leo.png",
  leoAlt: "/images/leo2.png",
  dog: "/images/dog.png",
  coin: "/images/coin.png",
  coinLogo: "/images/leo-logo.png",
  diamond: "/images/diamond.png",
  star: "/images/candy/star.png",
  heart: "/images/candy/heart.png",
  bomb: "/images/obstacle1.png",
  obstacle: "/images/obstacle1.png",
  bgSky: "/images/game1.png",
  bgPark: "/images/game-park.png",
  bgDay: "/images/game-day.png",
  candy: (name) => `/images/candy/${name}`,
};

/**
 * @param {{ rows: { label: string, value: import("react").ReactNode, accent?: string }[] }} props
 */
export function SoloV2Hud({ rows }) {
  return (
    <div className="flex w-full max-w-lg shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-yellow-400/40 bg-black/50 px-3 py-2 text-xs font-bold sm:text-sm">
      {rows.map((row) => (
        <span key={row.label} className={row.accent || "text-white"}>
          {row.label}: {row.value}
        </span>
      ))}
    </div>
  );
}

/**
 * @param {{ children: import("react").ReactNode, bg?: string, className?: string }} props
 */
export function SoloV2Playfield({ children, bg: _bg, className = "" }) {
  return (
    <div
      className={`relative min-h-0 flex-1 w-full max-w-lg overflow-hidden rounded-2xl border-4 border-yellow-400 bg-gradient-to-b from-slate-900 via-slate-950 to-gray-950 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * @param {{ text: string }} props
 */
export function SoloV2Goal({ text }) {
  return (
    <p className="mx-auto mb-2 max-w-lg shrink-0 rounded-lg border border-sky-400/40 bg-sky-950/50 px-3 py-1.5 text-center text-xs font-semibold text-sky-100 sm:text-sm">
      🎯 {text}
    </p>
  );
}

/**
 * @param {{ title: string, subtitle?: string, success?: boolean }} props
 */
export function SoloV2EndBanner({ title, subtitle = "", success = false }) {
  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 px-4 text-center ${
        success ? "bg-emerald-950/80" : "bg-rose-950/80"
      }`}
    >
      <p className="text-2xl font-extrabold text-white sm:text-3xl">{title}</p>
      {subtitle ? <p className="text-sm font-semibold text-white/90 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

/**
 * @param {{ title: string, lines: string[], onStart: () => void }} props
 */
export function SoloV2Intro({ title, lines, onStart }) {
  const { SG } = useSoloGameShellUi();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <img src={SOLO_V2_ASSETS.leo} alt="" className="h-20 w-20 object-contain drop-shadow-lg sm:h-24 sm:w-24" />
      <h2 className={SG.introTitle}>{title}</h2>
      <ul className={SG.introLines}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <button type="button" onClick={onStart} className={SG.introStartBtn}>
        התחל משחק
      </button>
    </div>
  );
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** @param {PointerEvent | TouchEvent} e @param {DOMRect} rect */
export function getBoardTapPoint(e, rect) {
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * Reliable mobile tap handling on a full-size capture layer.
 * @param {React.RefObject<HTMLElement | null>} boardRef
 * @param {React.RefObject<HTMLElement | null>} captureRef
 * @param {React.MutableRefObject<boolean>} runningRef
 * @param {(x: number, y: number, rect: DOMRect) => void} onTap
 * @param {boolean} active
 */
export function useSoloBoardTap(boardRef, captureRef, runningRef, onTap, active) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    if (!active) return undefined;
    const capture = captureRef.current;
    const board = boardRef.current;
    if (!capture || !board) return undefined;

    let ignoreNextPointer = false;

    const handle = (e) => {
      if (!runningRef.current) return;
      if (e.target?.closest?.("button, [data-solo-fullscreen-toggle]")) return;
      if (e.type === "touchstart") {
        ignoreNextPointer = true;
        window.setTimeout(() => {
          ignoreNextPointer = false;
        }, 450);
      } else if (e.type === "pointerdown" && ignoreNextPointer) {
        return;
      }
      if (e.cancelable) e.preventDefault();
      const rect = board.getBoundingClientRect();
      const { x, y } = getBoardTapPoint(e, rect);
      onTapRef.current(x, y, rect);
    };

    capture.addEventListener("touchstart", handle, { passive: false });
    capture.addEventListener("pointerdown", handle, { passive: false });
    return () => {
      capture.removeEventListener("touchstart", handle);
      capture.removeEventListener("pointerdown", handle);
    };
  }, [boardRef, captureRef, runningRef, active]);
}

const KEYBOARD_BLOCK =
  "ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Space,Enter,KeyW,KeyA,KeyS,KeyD,KeyH,Digit1,Digit2,Digit3,Tab";

/**
 * @param {boolean} active
 * @param {(e: KeyboardEvent) => boolean | void} onKey Return true to preventDefault
 */
export function useSoloGameKeyboard(active, onKey) {
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;

  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      const block = onKeyRef.current(e);
      if (block) e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active]);
}

/**
 * Keyboard crosshair for tap-style solo games.
 * @param {boolean} active
 * @param {{ step?: number, onFire: (x: number, y: number, rect: DOMRect) => void, boardRef: React.RefObject<HTMLElement | null> }} opts
 */
export function useSoloAimKeyboard(active, { step = 2.4, onFire, boardRef }) {
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;
  const aimRef = useRef({ xPct: 50, yPct: 50 });
  const [aim, setAim] = useState({ xPct: 50, yPct: 50 });

  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      let moved = false;
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        aimRef.current.yPct = Math.max(8, aimRef.current.yPct - step);
        moved = true;
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        aimRef.current.yPct = Math.min(92, aimRef.current.yPct + step);
        moved = true;
      } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
        aimRef.current.xPct = Math.max(8, aimRef.current.xPct - step);
        moved = true;
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        aimRef.current.xPct = Math.min(92, aimRef.current.xPct + step);
        moved = true;
      } else if (e.code === "Space" || e.code === "Enter") {
        const board = boardRef.current;
        if (board) {
          const rect = board.getBoundingClientRect();
          const x = (aimRef.current.xPct / 100) * rect.width;
          const y = (aimRef.current.yPct / 100) * rect.height;
          onFireRef.current(x, y, rect);
        }
        e.preventDefault();
        return;
      }
      if (moved) {
        setAim({ ...aimRef.current });
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, boardRef, step]);

  useEffect(() => {
    if (active) {
      aimRef.current = { xPct: 50, yPct: 50 };
      setAim({ xPct: 50, yPct: 50 });
    }
  }, [active]);

  return aim;
}

/** @param {{ xPct: number, yPct: number, className?: string }} props */
export function SoloAimCrosshair({ xPct, yPct, className = "" }) {
  return (
    <div
      className={`pointer-events-none absolute z-[60] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300 bg-yellow-300/15 shadow-[0_0_10px_rgba(253,224,71,0.55)] ${className}`}
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      aria-hidden
    >
      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/80" />
    </div>
  );
}

export { KEYBOARD_BLOCK };
