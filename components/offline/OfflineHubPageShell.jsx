import Layout from "../Layout";
import { OFFLINE_HUB_LAYOUT_THEME, useOfflineHubUi } from "../../hooks/useOfflineHubUi.js";

/**
 * Shared bright shell for all student offline hub pages (main, solo, educational).
 * Forces the sky gradient background even when the global student theme is classic.
 */
export default function OfflineHubPageShell({ children }) {
  const { GH, pageBgStyle, pageMainClass } = useOfflineHubUi();

  return (
    <Layout studentTheme={OFFLINE_HUB_LAYOUT_THEME} studentShell="home">
      <main className={`${GH.pageWrap} ${pageMainClass}`} style={pageBgStyle} dir="rtl">
        {children}
      </main>
    </Layout>
  );
}
