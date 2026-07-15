/** @typedef {{ howToPlay: string, scoring: string, rewards: string, tip: string }} SoloGameHelpContent */

export const SOLO_GAME_HELP_FALLBACK = Object.freeze({
  howToPlay: "שחקו לפי ההוראות על המסך ונסו להגיע ליעד של המשחק.",
  scoring: "כל פעולה טובה מוסיפה נקודות. טעויות או זמן שנגמר עלולים לסיים את המשחק.",
  rewards: "בסיום משחק מוצלח אפשר לצבור מטבעות ויהלומים לעולם הילד.",
  tip: "קראו את המסך לפני שמתחילים - ואז תכננו את הצעד הבא.",
});

/**
 * @param {{ titleHe?: string, help?: Partial<SoloGameHelpContent> } | null | undefined} game
 * @returns {SoloGameHelpContent}
 */
export function resolveSoloGameHelp(game) {
  const help = game?.help || {};
  return {
    howToPlay: help.howToPlay?.trim() || SOLO_GAME_HELP_FALLBACK.howToPlay,
    scoring: help.scoring?.trim() || SOLO_GAME_HELP_FALLBACK.scoring,
    rewards: help.rewards?.trim() || SOLO_GAME_HELP_FALLBACK.rewards,
    tip: help.tip?.trim() || SOLO_GAME_HELP_FALLBACK.tip,
  };
}
