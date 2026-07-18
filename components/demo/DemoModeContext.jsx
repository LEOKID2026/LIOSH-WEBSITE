import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearDemoSession,
  demoPlayRemainingMs,
  isPlayExpired,
  readDemoSession,
  updateDemoGrade,
} from "../../lib/demo/demo-mode.client.js";
import { registerDemoTimeExpiredNotifier } from "../../lib/demo/demo-play-guard.client.js";

/** @typedef {import("../../lib/demo/demo-mode.client.js").DemoSession} DemoSession */

/**
 * @typedef {object} DemoModeContextValue
 * @property {boolean} isDemo
 * @property {DemoSession | null} session
 * @property {boolean} playExpired
 * @property {number} remainingMs
 * @property {boolean} timeExpiredModalOpen
 * @property {(open: boolean) => void} setTimeExpiredModalOpen
 * @property {() => void} notifyTimeExpired
 * @property {(grade: string) => DemoSession | null} changeGrade
 * @property {() => void} exitDemo
 * @property {() => void} refreshSession
 */

const DemoModeContext = createContext(null);

/** @param {{ children: import("react").ReactNode }} props */
export function DemoModeProvider({ children }) {
  const [session, setSession] = useState(null);
  const [timeExpiredModalOpen, setTimeExpiredModalOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const refreshSession = useCallback(() => {
    setSession(readDemoSession());
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    registerDemoTimeExpiredNotifier(() => setTimeExpiredModalOpen(true));
    return () => registerDemoTimeExpiredNotifier(null);
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  const notifyTimeExpired = useCallback(() => {
    setTimeExpiredModalOpen(true);
  }, []);

  const changeGrade = useCallback((grade) => {
    const next = updateDemoGrade(grade);
    setSession(next);
    return next;
  }, []);

  const exitDemo = useCallback(() => {
    clearDemoSession();
    setSession(null);
    setTimeExpiredModalOpen(false);
  }, []);

  const value = useMemo(() => {
    void tick;
    const s = session || readDemoSession();
    return {
      isDemo: s != null,
      session: s,
      playExpired: isPlayExpired(s),
      remainingMs: demoPlayRemainingMs(),
      timeExpiredModalOpen,
      setTimeExpiredModalOpen,
      notifyTimeExpired,
      changeGrade,
      exitDemo,
      refreshSession,
    };
  }, [session, timeExpiredModalOpen, notifyTimeExpired, changeGrade, exitDemo, refreshSession, tick]);

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

/** @returns {DemoModeContextValue} */
export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    return {
      isDemo: false,
      session: null,
      playExpired: false,
      remainingMs: 0,
      timeExpiredModalOpen: false,
      setTimeExpiredModalOpen: () => {},
      notifyTimeExpired: () => {},
      changeGrade: () => null,
      exitDemo: () => {},
      refreshSession: () => {},
    };
  }
  return ctx;
}

export default DemoModeContext;
