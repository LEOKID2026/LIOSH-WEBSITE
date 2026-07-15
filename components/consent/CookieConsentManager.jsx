import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  acceptAllConsent,
  rejectAllConsent,
  saveConsentChoice,
  readStoredConsent,
} from "../../lib/consent/consent-storage.client.js";
import { shouldDeferCookieConsentBanner } from "../../lib/consent/consent-banner-policy.client.js";
import { applyGoogleConsentFromStorage } from "../../lib/consent/google-consent-mode.client.js";
import { maybeLoadGoogleAdsScripts } from "../../lib/consent/google-ads-loader.client.js";
import { useConsentState } from "../../hooks/useConsentState.js";

const LEGAL_LINKS = [
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/legal", label: "מסמכים משפטיים" },
  { href: "/data-deletion", label: "מחיקת נתונים" },
];

function syncConsentSideEffects() {
  applyGoogleConsentFromStorage();
  maybeLoadGoogleAdsScripts();
}

/**
 * @param {{ onSaved?: () => void; initialAds?: boolean; initialAnalytics?: boolean }} props
 */
function CookieConsentPreferencesPanel({ onSaved, initialAds = false, initialAnalytics = false }) {
  const [ads, setAds] = useState(initialAds);
  const [analytics, setAnalytics] = useState(initialAnalytics);

  useEffect(() => {
    setAds(initialAds);
    setAnalytics(initialAnalytics);
  }, [initialAds, initialAnalytics]);

  const persistCustom = () => {
    saveConsentChoice({
      choice: "custom",
      ads,
      analytics,
      source: "preferences",
    });
    syncConsentSideEffects();
    onSaved?.();
  };

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg text-right space-y-4"
      dir="rtl"
      lang="he"
      role="dialog"
      aria-labelledby="consent-preferences-title"
    >
      <h2 id="consent-preferences-title" className="text-base font-bold text-slate-900">
        ניהול העדפות עוגיות
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        עוגיות הכרחיות נדרשות לכניסה, להעדפות ולתפקוד האתר. הבחירות למטה נוגעות לפרסומות ומדידה אופציונליות - אינן פעילות כעת.
      </p>
      <label className="flex items-start justify-between gap-3 text-sm text-slate-800">
        <span>
          <span className="font-semibold block">פרסומות (לא פעיל כעת)</span>
          <span className="text-slate-500 text-xs">פרסומות עתידיות אופציונליות - ייתכן שיופעלו בעתיד בכפוף לאישור Google ולהגדרה</span>
        </span>
        <input
          type="checkbox"
          checked={ads}
          onChange={(e) => setAds(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
        />
      </label>
      <label className="flex items-start justify-between gap-3 text-sm text-slate-800">
        <span>
          <span className="font-semibold block">מדידה ואנליטיקה (לא פעיל כעת)</span>
          <span className="text-slate-500 text-xs">מדידה אנונימית אופציונלית - ייתכן שתופעל בעתיד בכפוף להגדרה</span>
        </span>
        <input
          type="checkbox"
          checked={analytics}
          onChange={(e) => setAnalytics(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
        />
      </label>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={persistCustom}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
        >
          שמירת העדפות
        </button>
      </div>
    </div>
  );
}

export default function CookieConsentManager() {
  const router = useRouter();
  const { ready, decided } = useConsentState();
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefsOnlyOpen, setPrefsOnlyOpen] = useState(false);

  const pathname = router.pathname || "";
  const deferred = shouldDeferCookieConsentBanner(pathname);
  const showBanner = ready && !decided && !deferred;

  useEffect(() => {
    const onOpenPrefs = () => {
      setPrefsOnlyOpen(true);
      setShowPreferences(true);
    };
    window.addEventListener("leokids:open-consent-preferences", onOpenPrefs);
    return () => window.removeEventListener("leokids:open-consent-preferences", onOpenPrefs);
  }, []);

  useEffect(() => {
    if (!ready) return;
    syncConsentSideEffects();
  }, [ready, decided]);

  useEffect(() => {
    if (!showBanner) {
      document.body.classList.remove("leokids-consent-banner-open");
      return undefined;
    }
    document.body.classList.add("leokids-consent-banner-open");
    return () => document.body.classList.remove("leokids-consent-banner-open");
  }, [showBanner]);

  const stored = readStoredConsent();
  const initialAds = stored?.ads === true;
  const initialAnalytics = stored?.analytics === true;

  const closePreferences = () => {
    setShowPreferences(false);
    setPrefsOnlyOpen(false);
  };

  const handleAccept = () => {
    acceptAllConsent("banner");
    syncConsentSideEffects();
    setShowPreferences(false);
  };

  const handleReject = () => {
    rejectAllConsent("banner");
    syncConsentSideEffects();
    setShowPreferences(false);
  };

  if (prefsOnlyOpen && !showBanner) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/40"
        dir="rtl"
        lang="he"
      >
        <div className="w-full max-w-md pointer-events-auto">
          <CookieConsentPreferencesPanel
            initialAds={initialAds}
            initialAnalytics={initialAnalytics}
            onSaved={closePreferences}
          />
          <button
            type="button"
            className="mt-2 w-full text-center text-sm text-white/90 underline"
            onClick={closePreferences}
          >
            סגירה
          </button>
        </div>
      </div>
    );
  }

  if (!showBanner) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[55] pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      dir="rtl"
      lang="he"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl px-3 pb-3">
        {showPreferences ? (
          <CookieConsentPreferencesPanel
            initialAds={initialAds}
            initialAnalytics={initialAnalytics}
            onSaved={() => setShowPreferences(false)}
          />
        ) : (
          <aside
            role="dialog"
            aria-labelledby="cookie-consent-title"
            className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-xl p-4 text-right space-y-3"
          >
            <h2 id="cookie-consent-title" className="text-sm font-bold text-slate-900">
              עוגיות ואחסון מקומי
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              האתר משתמש בעוגיות ובאחסון מקומי לתפקוד הכרחי בלבד (כניסה, העדפות והמשך שימוש).
              פרסומות ומדידה אינן פעילות כעת - ייתכן שיופעלו בעתיד בכפוף לאישור Google ולהסכמתכם.
            </p>
            <p className="text-[11px] text-slate-500">
              {LEGAL_LINKS.map((link, i) => (
                <span key={link.href}>
                  {i > 0 ? " · " : null}
                  <Link href={link.href} className="underline hover:text-slate-700">
                    {link.label}
                  </Link>
                </span>
              ))}
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                דחייה
              </button>
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                ניהול העדפות
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
              >
                אישור
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
