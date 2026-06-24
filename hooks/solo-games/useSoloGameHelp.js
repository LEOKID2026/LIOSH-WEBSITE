import { useCallback, useState } from "react";

/**
 * @returns {{
 *   helpGame: object | null,
 *   isHelpOpen: boolean,
 *   openSoloGameHelp: (game: object) => void,
 *   closeSoloGameHelp: () => void,
 * }}
 */
export function useSoloGameHelp() {
  const [helpGame, setHelpGame] = useState(null);

  const openSoloGameHelp = useCallback((game) => {
    if (!game) return;
    setHelpGame(game);
  }, []);

  const closeSoloGameHelp = useCallback(() => {
    setHelpGame(null);
  }, []);

  return {
    helpGame,
    isHelpOpen: helpGame != null,
    openSoloGameHelp,
    closeSoloGameHelp,
  };
}
