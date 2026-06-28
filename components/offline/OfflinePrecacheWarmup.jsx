import { useEffect, useRef } from "react";
import {
  OFFLINE_FULL_PRECACHE_NAV_URLS,
  OFFLINE_BASELINE_PRECACHE_NAV_URLS,
} from "../../lib/offline/offline-precache-manifest.js";
import {
  STUDENT_OFFLINE_FULL_SW_ENABLED,
} from "../../lib/offline/offline-flags.js";

/**
 * After one online visit to the offline hub, ask the student SW to precache
 * all offline routes, Next.js chunks, _next/data JSON, and assets.
 */
export default function OfflinePrecacheWarmup() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!STUDENT_OFFLINE_FULL_SW_ENABLED) return undefined;
    if (!navigator.onLine) return undefined;
    if (!("serviceWorker" in navigator)) return undefined;
    if (startedRef.current) return undefined;
    startedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration("/student/")) ||
          (await navigator.serviceWorker.ready);

        const worker = registration?.active || navigator.serviceWorker.controller;
        if (!worker || cancelled) return;

        const buildId = window.__NEXT_DATA__?.buildId || null;
        const navUrls = STUDENT_OFFLINE_FULL_SW_ENABLED
          ? OFFLINE_FULL_PRECACHE_NAV_URLS
          : OFFLINE_BASELINE_PRECACHE_NAV_URLS;

        worker.postMessage({
          type: "PRE_CACHE_STUDENT_OFFLINE",
          buildId,
          navUrls,
        });
      } catch (err) {
        console.warn("[OfflinePrecacheWarmup] failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
