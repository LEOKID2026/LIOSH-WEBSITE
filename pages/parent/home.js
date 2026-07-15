import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import PortalLoadingPanel from "../../components/ui/PortalLoadingPanel.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

/** Parent home alias — keep a continuous non-black loading screen while routing to dashboard. */
export default function ParentHomePage() {
  const router = useRouter();
  const { theme } = useStudentTheme();
  const isBright = theme !== "classic";
  const layoutProps = { studentTheme: theme, studentShell: "home" };

  useEffect(() => {
    if (!router.isReady) return;
    router.replace("/parent/dashboard");
  }, [router]);

  return (
    <Layout {...layoutProps}>
      <div className="max-w-md mx-auto px-4 py-8" dir="rtl" lang="he">
        <PortalLoadingPanel isBright={isBright} message="בודק התחברות הורה..." />
      </div>
    </Layout>
  );
}
