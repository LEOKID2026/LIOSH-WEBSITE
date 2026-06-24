import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import OfflineIndicator from "../components/OfflineIndicator";
import StudentAccessGate from "../components/student/StudentAccessGate";
import DevServiceWorkerCleanup from "../components/dev/DevServiceWorkerCleanup";
import { useIOSViewportFix } from "../hooks/useIOSViewportFix";
import { initPwaInstallPromptCapture } from "../lib/pwa/pwa-install-prompt";
import { initParentPwaInstallPromptCapture } from "../lib/pwa/pwa-parent-install-prompt";
import { initTeacherPwaInstallPromptCapture } from "../lib/pwa/pwa-teacher-install-prompt";
import { StudentThemeProvider } from "../contexts/StudentThemeContext.jsx";
import BrowserThemeColorSync from "../components/BrowserThemeColorSync.jsx";
import {
  BROWSER_THEME_COLOR_BRIGHT,
  BROWSER_THEME_COLOR_BOOTSTRAP_SCRIPT,
} from "../lib/student-ui/browser-theme-color.client.js";

if (typeof window !== "undefined") {
  initParentPwaInstallPromptCapture();
  initTeacherPwaInstallPromptCapture();
  if (window.location.pathname === "/student/install-app") {
    initPwaInstallPromptCapture();
  }
}

const STUDENT_PROTECTED_ROUTES = new Set([
  "/games",
  "/game",
  "/offline",
  "/offline/tic-tac-toe",
  "/offline/rock-paper-scissors",
  "/offline/tap-battle",
  "/offline/memory-match",
  "/student/arcade",
  "/student/games/fourline",
  "/student/games/ludo",
  "/student/games/snakes-and-ladders",
  "/student/games/checkers",
  "/student/games/chess",
  "/student/games/dominoes",
  "/student/games/bingo",
  "/student/solo-games",
  "/student/solo-games/catcher",
  "/student/solo-games/puzzle",
  "/student/solo-games/memory",
  "/student/solo-games/flyer",
  "/student/solo-games/leo-jump",
  "/student/solo-games/balloons",
  "/student/solo-games/maze",
  "/student/solo-games/picture-puzzle",
  "/student/solo-games/target-tap",
  "/student/solo-games/sort-shapes",
  "/student/solo-games/smart-blocks",
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
  "/learning/book/geometry/g1",
  "/learning/book/geometry/g1/[pageId]",
  "/learning/book/geometry/g3",
  "/learning/book/geometry/g3/[pageId]",
  "/learning/book/[subject]/[grade]",
  "/learning/book/[subject]/[grade]/[pageId]",
  "/learning/dev-student-simulator",
]);

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  useIOSViewportFix();

  useEffect(() => {
    initParentPwaInstallPromptCapture();
    initTeacherPwaInstallPromptCapture();
    if (router.pathname === "/student/install-app") {
      initPwaInstallPromptCapture();
    }
  }, [router.pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }

    // בפיתוח: ראה DevServiceWorkerCleanup — לא רושמים SW; מנקים רישומים ו Cache Storage.
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

    const isParentRoute = (router.pathname || "").startsWith("/parent/");
    const isStudentRoute = (router.pathname || "").startsWith("/student/");
    const isTeacherRoute = (router.pathname || "").startsWith("/teacher/");

    const registerSW = () => {
      if (isParentRoute) {
        navigator.serviceWorker
          .register("/parent/sw.js", { scope: "/parent/" })
          .then((registration) => {
            console.log("[SW parent] Registered:", registration.scope);
          })
          .catch((registrationError) => {
            console.error("[SW parent] Registration failed:", registrationError);
          });
        return;
      }

      if (isStudentRoute) {
        navigator.serviceWorker
          .register("/student/sw.js", { scope: "/student/" })
          .then((registration) => {
            console.log("[SW student] Registered:", registration.scope);
          })
          .catch((registrationError) => {
            console.error("[SW student] Registration failed:", registrationError);
          });
        return;
      }

      if (isTeacherRoute) {
        navigator.serviceWorker
          .register("/teacher/sw.js", { scope: "/teacher/" })
          .then((registration) => {
            console.log("[SW teacher] Registered:", registration.scope);
          })
          .catch((registrationError) => {
            console.error("[SW teacher] Registration failed:", registrationError);
          });
        return;
      }

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
  }, [router.pathname]);

  const shouldGate = STUDENT_PROTECTED_ROUTES.has(router.pathname || "");
  const isStudentPwaInstallMode = router.pathname === "/student/install-app";
  const isParentPwaInstallMode = router.pathname === "/parent/install-app";
  const isTeacherPwaInstallMode = router.pathname === "/teacher/install-app";

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
        {isStudentPwaInstallMode ? (
          <>
            <meta name="theme-color" content={BROWSER_THEME_COLOR_BRIGHT} />
            <meta name="apple-mobile-web-app-title" content="LEO K" />
            <meta name="msapplication-TileColor" content={BROWSER_THEME_COLOR_BRIGHT} />
            <meta name="msapplication-TileImage" content="/icons/child/mstile-150x150.png" />
          </>
        ) : isParentPwaInstallMode ? (
          <>
            <meta name="theme-color" content="#0d9488" />
            <meta name="apple-mobile-web-app-title" content="P LEO K" />
            <meta name="msapplication-TileColor" content="#0d9488" />
            <meta name="msapplication-TileImage" content="/icons/parent/mstile-150x150.png" />
          </>
        ) : isTeacherPwaInstallMode ? (
          <>
            <meta name="theme-color" content="#4338ca" />
            <meta name="apple-mobile-web-app-title" content="T LEO K" />
            <meta name="msapplication-TileColor" content="#4338ca" />
            <meta name="msapplication-TileImage" content="/icons/teacher/mstile-150x150.png" />
          </>
        ) : (
          <>
            <meta name="theme-color" content={BROWSER_THEME_COLOR_BRIGHT} />
            <meta name="apple-mobile-web-app-title" content="LEO K" />
            <meta name="msapplication-TileColor" content={BROWSER_THEME_COLOR_BRIGHT} />
          </>
        )}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: BROWSER_THEME_COLOR_BOOTSTRAP_SCRIPT }} />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {isStudentPwaInstallMode ? (
          <>
            <link rel="icon" href="/icons/child/favicon.ico" sizes="any" />
            <link rel="icon" type="image/png" sizes="48x48" href="/icons/child/favicon-48x48.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/child/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/child/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/child/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="192x192" href="/icons/child/android-chrome-192x192.png" />
            <link rel="icon" type="image/png" sizes="512x512" href="/icons/child/android-chrome-512x512.png" />
          </>
        ) : isParentPwaInstallMode ? (
          <>
            <link rel="icon" href="/icons/parent/favicon.ico" sizes="any" />
            <link rel="icon" type="image/png" sizes="48x48" href="/icons/parent/favicon-48x48.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/parent/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/parent/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/parent/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="192x192" href="/icons/parent/android-chrome-192x192.png" />
            <link rel="icon" type="image/png" sizes="512x512" href="/icons/parent/android-chrome-512x512.png" />
          </>
        ) : isTeacherPwaInstallMode ? (
          <>
            <link rel="icon" href="/icons/teacher/favicon.ico" sizes="any" />
            <link rel="icon" type="image/png" sizes="48x48" href="/icons/teacher/favicon-48x48.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/teacher/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/teacher/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/teacher/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="192x192" href="/icons/teacher/android-chrome-192x192.png" />
            <link rel="icon" type="image/png" sizes="512x512" href="/icons/teacher/android-chrome-512x512.png" />
          </>
        ) : (
          <>
            <link rel="icon" href="/icons/child/favicon.ico" sizes="any" />
            <link rel="icon" type="image/png" sizes="48x48" href="/icons/child/favicon-48x48.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/child/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/child/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/child/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="192x192" href="/icons/child/android-chrome-192x192.png" />
            <link rel="icon" type="image/png" sizes="512x512" href="/icons/child/android-chrome-512x512.png" />
          </>
        )}

        {isStudentPwaInstallMode ? (
          <link rel="manifest" href="/manifest.json" />
        ) : null}
        {isParentPwaInstallMode ? (
          <link rel="manifest" href="/manifest-parent.webmanifest" />
        ) : null}
        {isTeacherPwaInstallMode ? (
          <link rel="manifest" href="/manifest-teacher.webmanifest" />
        ) : null}
        
        <title>LEO K - Kids Games & Learning</title>
      </Head>
      <OfflineIndicator />
      <StudentThemeProvider>
        <BrowserThemeColorSync />
        {shouldGate ? (
          <StudentAccessGate>
            <Component {...pageProps} />
          </StudentAccessGate>
        ) : (
          <Component {...pageProps} />
        )}
      </StudentThemeProvider>
    </>
  );
}
