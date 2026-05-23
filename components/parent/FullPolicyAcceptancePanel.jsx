import { useCallback, useEffect, useRef, useState } from "react";
import { buildTermsPrivacyAcceptanceDocument } from "../../data/legal/termsPrivacyAcceptanceContent";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../data/legal/sitePolicies.he";
import { postPolicyAcceptance } from "../../lib/parent-client/policy-acceptance-api";
import PolicySectionsBody from "../legal/PolicySectionsBody";

const SCROLL_BOTTOM_EPS = 32;

/**
 * Full in-site Terms + Privacy acceptance — single page scroll only (Phase D.2D).
 * No internal overflow boxes (overflow-x-hidden also avoided — it forces overflow-y:auto in CSS).
 */
export default function FullPolicyAcceptancePanel({
  accessToken = null,
  acceptanceSource,
  termsVersion,
  privacyVersion,
  onAccepted,
  onDeclined,
  onBack,
  persistToApi = true,
  layout = "default",
}) {
  const policyDocument = buildTermsPrivacyAcceptanceDocument();
  const bottomSentinelRef = useRef(null);

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const updateScrollState = useCallback(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const rect = sentinel.getBoundingClientRect();
    const docBottom =
      window.innerHeight + window.scrollY >=
      window.document.documentElement.scrollHeight - SCROLL_BOTTOM_EPS;
    const sentinelVisible = rect.top <= window.innerHeight - SCROLL_BOTTOM_EPS;

    if (docBottom || sentinelVisible) setScrolledToBottom(true);
  }, []);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    updateScrollState();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setScrolledToBottom(true);
      },
      { root: null, rootMargin: "0px 0px 64px 0px", threshold: 0 }
    );
    io.observe(sentinel);

    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(sentinel);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const canApprove = scrolledToBottom && confirmChecked && !busy;

  const handleApprove = async () => {
    if (!canApprove) return;
    setBusy(true);
    setError("");

    if (persistToApi && accessToken) {
      const { ok, payload } = await postPolicyAcceptance(accessToken, {
        termsVersion: termsVersion || TERMS_VERSION,
        privacyVersion: privacyVersion || PRIVACY_VERSION,
        source: acceptanceSource,
      });
      if (!ok) {
        setError(payload?.error || "שמירת האישור נכשלה. נסו שוב.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    onAccepted();
  };

  const widthClass = layout === "fullPage" ? "max-w-4xl" : "max-w-3xl";

  return (
    <section
      dir="rtl"
      lang="he"
      data-policy-scroll-mode="page-only"
      data-policy-acceptance-root
      className={`w-full mx-auto ${widthClass} px-3 sm:px-4 py-6 sm:py-8 space-y-6`}
      aria-label="אישור תנאי שימוש ומדיניות פרטיות"
    >
      <header className="rounded-xl border border-amber-400/30 bg-black/60 px-4 sm:px-5 py-4 space-y-2 text-right">
        <h1 className="text-lg sm:text-xl font-bold text-amber-200">{policyDocument.meta.title}</h1>
        <p className="text-sm text-white/80 leading-relaxed">{policyDocument.meta.intro}</p>
        <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
          גללו את דף האתר עד הסוף, סמנו את תיבת האישור, ואשרו לפני המשך.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-white/55">
          <div>
            <dt className="inline font-semibold text-white/70">גרסת תנאים: </dt>
            <dd className="inline">{policyDocument.meta.termsVersion}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-white/70">גרסת פרטיות: </dt>
            <dd className="inline">{policyDocument.meta.privacyVersion}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-white/70">עודכן: </dt>
            <dd className="inline">{policyDocument.meta.lastUpdated}</dd>
          </div>
        </dl>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-white/50 hover:text-white underline"
          >
            חזרה
          </button>
        ) : null}
      </header>

      <div className="rounded-xl border border-amber-400/30 bg-black/60 px-3 sm:px-4 py-4 space-y-8 min-w-0">
        {policyDocument.parts.map((part) => (
          <article key={part.key} className="space-y-3 min-w-0">
            <h2 className="text-lg font-bold text-amber-100/90 border-b border-white/10 pb-2">
              {part.title}
            </h2>
            {part.intro ? (
              <p className="text-sm text-white/75 leading-relaxed break-words">{part.intro}</p>
            ) : null}
            <PolicySectionsBody sections={part.sections} linkComponent="anchor" />
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-amber-400/30 bg-black/60 px-4 sm:px-5 py-4 space-y-3 text-right text-sm text-white/75">
        <nav aria-label="מסמכים משלימים">
          <p className="text-xs text-white/55 mb-2">מסמכים משלימים (לא כלולים במסך האישור):</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {policyDocument.relatedLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-amber-300 hover:text-amber-200 underline">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs sm:text-sm pt-1 border-t border-white/10">
          <span className="text-white/60">יצירת קשר: </span>
          <a
            href={`mailto:${policyDocument.meta.contactEmail}`}
            className="text-amber-300 hover:text-amber-200 underline break-all"
          >
            {policyDocument.meta.contactEmail}
          </a>
        </p>
      </div>

      <div className="rounded-xl border border-amber-400/30 bg-black/60 px-4 sm:px-5 py-4 space-y-3 text-right">
        {!scrolledToBottom ? (
          <p className="text-xs text-amber-200/80 bg-amber-950/30 border border-amber-400/20 rounded-lg px-3 py-2 text-center">
            גללו את דף האתר עד כאן כדי לאפשר אישור
          </p>
        ) : null}

        <div ref={bottomSentinelRef} data-policy-bottom-sentinel className="h-px w-full" aria-hidden />

        <label
          className={`flex items-start gap-2 text-sm leading-relaxed cursor-pointer ${
            scrolledToBottom ? "text-white/85" : "text-white/40 cursor-not-allowed"
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={confirmChecked}
            disabled={!scrolledToBottom || busy}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />
          <span className="break-words">קראתי את תנאי השימוש ומדיניות הפרטיות ואני מסכים/ה להם.</span>
        </label>

        {error ? (
          <p className="text-sm text-red-300 break-words" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
          <button
            type="button"
            onClick={onDeclined}
            disabled={busy}
            className="rounded border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            אינני מסכים/ה
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={!canApprove}
            className="rounded bg-amber-500 text-black px-4 py-2.5 text-sm font-bold disabled:opacity-40"
          >
            {busy ? "שומר..." : "אני מסכים/ה וממשיך/ה"}
          </button>
        </div>
      </div>
    </section>
  );
}
