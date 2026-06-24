import Link from "next/link";

/**
 * Minimal dev-only shell — not tied to SoloGameShell or registry.
 * @param {{ title: string, subtitle?: string, children: import("react").ReactNode, headerExtra?: import("react").ReactNode }} props
 */
export default function DevPrototypeShell({ title, subtitle, children, headerExtra }) {
  return (
    <div
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-900 text-white select-none"
      dir="rtl"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <Link
          href="/game"
          className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"
        >
          חזרה
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-lg font-extrabold text-yellow-300 sm:text-xl">{title}</h1>
          {subtitle ? (
            <p className="text-[11px] font-semibold leading-4 text-white/60 sm:text-xs">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex min-h-[44px] min-w-[72px] shrink-0 items-center justify-end">{headerExtra}</div>
      </header>
      {children}
    </div>
  );
}
