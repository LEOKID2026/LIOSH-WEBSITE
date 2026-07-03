import EmoteBar from "./EmoteBar.jsx";

/**
 * Shared social dock for in-game screens (safe emotes only).
 * @param {{ roomId: string, gameSession?: { state?: { emotes?: unknown[] } } | null, className?: string }} props
 */
export default function ArcadeGameSocialDock({ roomId, gameSession = null, className = "" }) {
  const state = gameSession?.state;
  const emotes = state && typeof state === "object" && Array.isArray(state.emotes) ? state.emotes : [];

  return (
    <div className={`flex justify-center py-2 ${className}`}>
      <EmoteBar roomId={roomId} emotes={emotes} />
    </div>
  );
}
