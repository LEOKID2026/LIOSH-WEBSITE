import { isAdsConsentGranted } from "./consent-storage.client.js";
import { resolveStudentAdRenderModeFromEnv } from "../student-ui/student-ad-config.client.js";

let loadAttempted = false;

/**
 * Load Google tag / AdSense only when production + env flag + ads consent + configured ID.
 * Safe no-op in development, without consent, or without publisher ID.
 */
export function maybeLoadGoogleAdsScripts() {
  if (typeof window === "undefined") return;
  if (loadAttempted) return;

  if (resolveStudentAdRenderModeFromEnv(process.env) !== "external") return;
  if (!isAdsConsentGranted()) return;

  const clientId = String(process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID || "").trim();
  const tagId = String(process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || "").trim();
  if (!clientId && !tagId) return;

  loadAttempted = true;

  if (tagId) {
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };
    window.gtag("js", new Date());
    window.gtag("config", tagId, { anonymize_ip: true });
  }

  if (clientId) {
    appendScript(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`,
      { crossOrigin: "anonymous" },
    );
  }
}

function appendScript(src, attrs = {}) {
  const existing = document.querySelector(`script[data-leokids-google-loader="${src}"]`);
  if (existing) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.setAttribute("data-leokids-google-loader", src);
  if (attrs.crossOrigin) script.crossOrigin = attrs.crossOrigin;
  document.head.appendChild(script);
}

/** @visibleForTesting */
export function resetGoogleAdsLoaderForTests() {
  loadAttempted = false;
}
