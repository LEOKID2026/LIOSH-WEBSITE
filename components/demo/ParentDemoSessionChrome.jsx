import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ParentDemoModeProvider } from "./ParentDemoModeContext.jsx";
import ParentDemoModeBar from "./ParentDemoModeBar.jsx";
import {
  installParentDemoFetchShim,
  uninstallParentDemoFetchShim,
} from "../../lib/demo/parent-demo-fetch-shim.client.js";
import { hasParentDemoSession } from "../../lib/demo/parent-demo-mode.client.js";

/** Demo bar + provider + fetch shim on any route while parent demo session is active. */
export default function ParentDemoSessionChrome({ children }) {
  const router = useRouter();
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    setSessionActive(hasParentDemoSession());
  }, [router.pathname]);

  useEffect(() => {
    if (!sessionActive) return undefined;
    const uninstall = installParentDemoFetchShim();
    return () => {
      uninstall();
      uninstallParentDemoFetchShim();
    };
  }, [sessionActive]);

  if (!sessionActive) return children;

  return (
    <ParentDemoModeProvider>
      <ParentDemoModeBar />
      {children}
    </ParentDemoModeProvider>
  );
}
