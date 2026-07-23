import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearParentDemoSession,
  readParentDemoSession,
} from "../../lib/demo/parent-demo-mode.client.js";

/** @typedef {{ session: import('../../lib/demo/parent-demo-mode.client.js').ParentDemoSession | null, isDemo: boolean, exitDemo: () => void }} ParentDemoModeValue */

const ParentDemoModeContext = createContext(
  /** @type {ParentDemoModeValue | null} */ (null),
);

export function ParentDemoModeProvider({ children }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(readParentDemoSession());
  }, []);

  const exitDemo = useCallback(() => {
    clearParentDemoSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isDemo: !!session,
      exitDemo,
    }),
    [session, exitDemo],
  );

  return (
    <ParentDemoModeContext.Provider value={value}>{children}</ParentDemoModeContext.Provider>
  );
}

export function useParentDemoMode() {
  const ctx = useContext(ParentDemoModeContext);
  if (!ctx) {
    return { session: null, isDemo: false, exitDemo: () => {} };
  }
  return ctx;
}
