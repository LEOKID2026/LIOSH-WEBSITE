/**
 * Prevents body (#050816) flash while Next router hydrates on arcade room routes.
 * Intentional dark game shell — not a full-page site loader.
 */
export default function ArcadeRouteHoldShell() {
  return <div className="min-h-screen bg-zinc-950" dir="rtl" aria-busy="true" />;
}
