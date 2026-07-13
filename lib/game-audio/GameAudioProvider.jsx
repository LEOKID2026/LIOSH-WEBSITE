import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { GAME_AUDIO_MANIFEST_BY_ID } from "./game-audio-manifest.js";
import {
  DEFAULT_SETTINGS,
  loadGameAudioSettings,
  saveGameAudioSettings,
} from "./game-audio-settings.js";
import { createGameAudioManager } from "./game-audio-manager.js";

export const GameAudioContext = createContext(null);

const GAME_ROUTE_RE =
  /^\/(student\/)?(games|game|offline|learning|educational-games|solo-games)(\/|$)|^\/leo-miners/;

function isGameRoute(pathname) {
  if (!pathname) return false;
  return GAME_ROUTE_RE.test(pathname);
}

/**
 * Global game audio provider — wraps app in _app.js.
 */
export default function GameAudioProvider({ children }) {
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const managerRef = useRef(null);

  useEffect(() => {
    const loaded = loadGameAudioSettings();
    settingsRef.current = loaded;
    setSettings(loaded);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    managerRef.current = createGameAudioManager(
      GAME_AUDIO_MANIFEST_BY_ID,
      () => settingsRef.current,
      (next) => {
        settingsRef.current = next;
        setSettings(next);
        saveGameAudioSettings(next);
      },
    );

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        managerRef.current?.handleVisibilityHidden();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      managerRef.current?.stopAll();
    };
  }, []);

  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !router?.events) return undefined;

    const onStart = (url) => {
      const path = String(url || "").split("?")[0];
      if (!isGameRoute(path)) mgr.handleRouteChange();
    };
    router.events.on("routeChangeStart", onStart);
    return () => router.events.off("routeChangeStart", onStart);
  }, [router]);

  const stableActionsRef = useRef(null);
  if (!stableActionsRef.current) {
    const mgr = () => managerRef.current;
    stableActionsRef.current = {
      primeFromUserGesture: () => mgr()?.primeFromUserGesture(),
      playSfx: (id, opts) => mgr()?.playSfx(id, opts),
      playMusic: (id, opts) => mgr()?.playMusic(id, opts),
      stopMusic: () => mgr()?.stopMusic(),
      pauseMusic: () => mgr()?.pauseMusic(),
      resumeMusic: () => mgr()?.resumeMusic(),
      stopAsset: (id) => mgr()?.stopAsset(id),
      stopGroup: () => mgr()?.stopGroup(),
      stopAll: () => mgr()?.stopAll(),
      playVoice: (id, payload, opts) => mgr()?.playVoice(id, payload, opts),
      stopVoice: () => mgr()?.stopVoice(),
      registerVoiceController: (c) => mgr()?.registerVoiceController(c),
      unregisterVoiceController: (c) => mgr()?.unregisterVoiceController(c),
      beginVoice: () => mgr()?.beginVoice(),
      endVoice: () => mgr()?.endVoice(),
      getSettings: () => mgr()?.getSettings() || settingsRef.current,
      updateSettings: (patch) => mgr()?.updateSettings(patch),
      resetSettings: () => mgr()?.resetSettings(),
      toggleMaster: () => {
        const next = !settingsRef.current.masterEnabled;
        mgr()?.updateSettings({ masterEnabled: next });
        if (!next) mgr()?.stopAll();
      },
    };
  }

  const api = useMemo(
    () => ({
      ...stableActionsRef.current,
      settings,
    }),
    [settings],
  );

  return (
    <GameAudioContext.Provider value={api}>{children}</GameAudioContext.Provider>
  );
}
