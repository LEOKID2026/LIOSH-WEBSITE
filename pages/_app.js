import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import OfflineIndicator from "../components/OfflineIndicator";
import StudentAccessGate from "../components/student/StudentAccessGate";
import DevServiceWorkerCleanup from "../components/dev/DevServiceWorkerCleanup";
import { useIOSViewportFix } from "../hooks/useIOSViewportFix";
import { initPwaInstallPromptCapture } from "../lib/pwa/pwa-install-prompt";

if (typeof window !== "undefined") {
  initPwaInstallPromptCapture();
}

const STUDENT_PROTECTED_ROUTES = new Set([
  "/student/arcade",
  "/student/games/fourline",
  "/student/games/ludo",
  "/student/games/snakes-and-ladders",
  "/student/games/checkers",
  "/student/games/chess",
  "/student/games/dominoes",
  "/student/games/bingo",
  "/learning",
  "/learning/math-master",
  "/learning/geometry-master",
  "/learning/english-master",
  "/learning/hebrew-master",
  "/learning/science-master",
  "/learning/moledet-geography-master",
  "/learning/curriculum",
  "/learning/geometry-curriculum",
  "/learning/book/math/g1",
  "/learning/book/math/g1/[pageId]",
  "/learning/dev-student-simulator",
]);

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  useIOSViewportFix();

  useEffect(() => {
    initPwaInstallPromptCapture();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }

    // בפיתוח: ראה DevServiceWorkerCleanup — לא רושמים SW; מנקים רישומים ו־Cache Storage.
    if (process.env.NODE_ENV === "development") {
      return undefined;
    }

    const isCapacitorNative =
      typeof window !== "undefined" &&
      window.Capacitor?.isNativePlatform?.();

    // Capacitor APK WebView: skip SW so deploys load fresh /_next/static (no cache-first).
    // Browser/PWA keep normal offline SW registration below.
    if (isCapacitorNative) {
      let cancelled = false;

      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));

          if (cancelled || !("caches" in window)) return;
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        } catch (e) {
          console.warn("[SW] Capacitor native cleanup:", e);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log("[SW] Registered successfully:", registration.scope);
            
            // Pre-cache דפים חשובים אחרי שהדף נטען (רק במצב online)
            if (registration.active && navigator.onLine) {
              // המתין שהדף נטען לגמרי לפני pre-caching
              setTimeout(() => {
                const essentialPages = [
                  '/',
                  '/game',
                  '/learning',
                ];
                registration.active.postMessage({
                  type: 'PRE_CACHE_PAGES',
                  pages: essentialPages
                });
                console.log('[App] Sent pre-cache request for essential pages');
              }, 3000);
            }
            
            // Pre-cache הדף הנוכחי
            if (registration.active && navigator.onLine) {
              setTimeout(() => {
                const currentPath = window.location.pathname;
                if (currentPath && currentPath !== '/') {
                  registration.active.postMessage({
                    type: 'PRE_CACHE_PAGES',
                    pages: [currentPath]
                  });
                }
              }, 4000);
            }
            
            // בדיקה לעדכונים כל שעה
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
            
            // טיפול בעדכונים
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Service Worker חדש זמין - אפשר להציע רענון (לא אוטומטי)
                  console.log("[SW] New service worker available");
                }
              });
            });
          })
          .catch((registrationError) => {
            console.error("[SW] Registration failed:", registrationError);
          });
    };

    if (document.readyState === "complete") {
      registerSW();
      return;
    }

    window.addEventListener("load", registerSW);
    return () => window.removeEventListener("load", registerSW);
  }, []);

  const shouldGate = STUDENT_PROTECTED_ROUTES.has(router.pathname || "");

  return (
    <>
      {process.env.NODE_ENV !== "production" ? <DevServiceWorkerCleanup /> : null}
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="description" content="LEO K - Fun games and learning activities for kids. Play arcade games, solve puzzles, and practice math, geometry and English." />
        <meta name="theme-color" content="#fbbf24" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LEO K" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#fbbf24" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Icons */}
        <link rel="icon" href="/images/leo-icons/icon-192.png" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/leo-icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/images/leo-icons/icon-512.png" />
        <link rel="apple-touch-icon" href="/images/leo-icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/images/leo-icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/leo-icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/leo-icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/leo-icons/icon-192.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        <title>LEO K - Kids Games & Learning</title>
      </Head>
      <OfflineIndicator />
      {shouldGate ? (
        <StudentAccessGate>
          <Component {...pageProps} />
        </StudentAccessGate>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
}
