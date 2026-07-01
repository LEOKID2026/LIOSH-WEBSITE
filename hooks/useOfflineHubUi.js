import { useMemo } from "react";
import { GAMES_HUB_BRIGHT } from "../lib/student-ui/student-bright-games-hub.client.js";

/** Offline hubs always use bright page chrome + card styling. */
export const OFFLINE_HUB_LAYOUT_THEME = "bright";

export function useOfflineHubUi() {
  return useMemo(
    () => ({
      GH: GAMES_HUB_BRIGHT,
      isBright: true,
      layoutTheme: OFFLINE_HUB_LAYOUT_THEME,
    }),
    []
  );
}
