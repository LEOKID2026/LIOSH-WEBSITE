/** Shared Leo Kids UI bits for Solo Games V2 engines. */

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
export function SoloV2Playfield({ children, bg = SOLO_V2_ASSETS.bgSky, className = "" }) {
  return (
    <div
      className={`relative min-h-0 flex-1 w-full max-w-lg overflow-hidden rounded-2xl border-4 border-yellow-400 shadow-lg ${className}`}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(8,47,73,0.55), rgba(15,23,42,0.75)), url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
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
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <img src={SOLO_V2_ASSETS.leo} alt="" className="h-20 w-20 object-contain drop-shadow-lg sm:h-24 sm:w-24" />
      <h2 className="text-lg font-extrabold text-yellow-300 sm:text-xl">{title}</h2>
      <ul className="space-y-1 text-sm text-gray-200">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 text-base font-bold text-black shadow-md"
      >
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
