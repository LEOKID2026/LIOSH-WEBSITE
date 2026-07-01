import { useMemo } from "react";
import { GAMES_HUB_BRIGHT } from "../lib/student-ui/student-bright-games-hub.client.js";
import { STUDENT_BRIGHT_PAGE_BG_STYLE } from "../lib/student-ui/student-bright-page-background.client.js";

/** Offline hubs always use bright page chrome + card styling. */
export const OFFLINE_HUB_LAYOUT_THEME = "bright";

export function useOfflineHubUi() {
  return useMemo(
    () => ({
      GH: GAMES_HUB_BRIGHT,
      isBright: true,
      layoutTheme: OFFLINE_HUB_LAYOUT_THEME,
      /** Same sky gradient as Layout bright shell — applied on hub main for full coverage. */
      pageBgStyle: STUDENT_BRIGHT_PAGE_BG_STYLE,
      pageMainClass: "flex-1 w-full min-h-[100svh] flex flex-col",
    }),
    []
  );
}
