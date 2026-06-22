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
  bright = false,
}) {
  const policyDocument = buildTermsPrivacyAcceptanceDocument();
  const bottomSentinelRef = useRef(null);

  const shellClass = bright
    ? "rounded-xl border border-sky-200 bg-white px-4 sm:px-5 py-4 space-y-2 text-right shadow-sm"
    : "rounded-xl border border-amber-400/30 bg-black/60 px-4 sm:px-5 py-4 space-y-2 text-right";
  const titleClass = bright ? "text-lg sm:text-xl font-bold text-slate-900" : "text-lg sm:text-xl font-bold text-amber-200";
  const introClass = bright ? "text-sm text-slate-700 leading-relaxed" : "text-sm text-white/80 leading-relaxed";
  const hintClass = bright ? "text-xs sm:text-sm text-slate-600 leading-relaxed" : "text-xs sm:text-sm text-white/65 leading-relaxed";
  const metaClass = bright ? "grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-500" : "grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-white/55";
  const metaLabelClass = bright ? "inline font-semibold text-slate-700" : "inline font-semibold text-white/70";
  const backClass = bright ? "text-xs text-slate-500 hover:text-slate-800 underline" : "text-xs text-white/50 hover:text-white underline";
  const bodyShellClass = bright
    ? "rounded-xl border border-sky-200 bg-slate-50 px-3 sm:px-4 py-4 space-y-8 min-w-0"
    : "rounded-xl border border-amber-400/30 bg-black/60 px-3 sm:px-4 py-4 space-y-8 min-w-0";
  const partTitleClass = bright
    ? "text-lg font-bold text-amber-800 border-b border-slate-200 pb-2"
    : "text-lg font-bold text-amber-100/90 border-b border-white/10 pb-2";
  const partIntroClass = bright ? "text-sm text-slate-700 leading-relaxed break-words" : "text-sm text-white/75 leading-relaxed break-words";
  const footerShellClass = shellClass;
  const footerTextClass = bright ? "rounded-xl border border-sky-200 bg-white px-4 sm:px-5 py-4 space-y-3 text-right text-sm text-slate-700" : "rounded-xl border border-amber-400/30 bg-black/60 px-4 sm:px-5 py-4 space-y-3 text-right text-sm text-white/75";
  const footerHintClass = bright ? "text-xs text-slate-500 mb-2" : "text-xs text-white/55 mb-2";
  const footerLinkClass = bright ? "text-sky-700 hover:text-sky-900 underline" : "text-amber-300 hover:text-amber-200 underline";
  const footerContactClass = bright ? "text-xs sm:text-sm pt-1 border-t border-slate-200" : "text-xs sm:text-sm pt-1 border-t border-white/10";
  const footerContactLabelClass = bright ? "text-slate-500" : "text-white/60";
  const actionShellClass = shellClass;
  const scrollHintClass = bright
    ? "text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center"
    : "text-xs text-amber-200/80 bg-amber-950/30 border border-amber-400/20 rounded-lg px-3 py-2 text-center";
  const declineClass = bright ? "rounded border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" : "rounded border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50";
  const approveClass = "rounded bg-amber-500 text-black px-4 py-2.5 text-sm font-bold disabled:opacity-40";
  const errorClass = bright ? "text-sm text-rose-600 break-words" : "text-sm text-red-300 break-words";

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
      <header className={shellClass}>
        <h1 className={titleClass}>{policyDocument.meta.title}</h1>
        <p className={introClass}>{policyDocument.meta.intro}</p>
        <p className={hintClass}>
          גללו את דף האתר עד הסוף, סמנו את תיבת האישור, ואשרו לפני המשך.
        </p>
        <dl className={metaClass}>
          <div>
            <dt className={metaLabelClass}>גרסת תנאים: </dt>
            <dd className="inline">{policyDocument.meta.termsVersion}</dd>
          </div>
          <div>
            <dt className={metaLabelClass}>גרסת פרטיות: </dt>
            <dd className="inline">{policyDocument.meta.privacyVersion}</dd>
          </div>
          <div>
            <dt className={metaLabelClass}>עודכן: </dt>
            <dd className="inline">{policyDocument.meta.lastUpdated}</dd>
          </div>
        </dl>
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            חזרה
          </button>
        ) : null}
      </header>

      <div className={bodyShellClass}>
        {policyDocument.parts.map((part) => (
          <article key={part.key} className="space-y-3 min-w-0">
            <h2 className={partTitleClass}>{part.title}</h2>
            {part.intro ? <p className={partIntroClass}>{part.intro}</p> : null}
            <PolicySectionsBody sections={part.sections} linkComponent="anchor" bright={bright} />
          </article>
        ))}
      </div>

      <div className={footerTextClass}>
        <nav aria-label="מסמכים משלימים">
          <p className={footerHintClass}>מסמכים משלימים (לא כלולים במסך האישור):</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {policyDocument.relatedLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={footerLinkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className={footerContactClass}>
          <span className={footerContactLabelClass}>יצירת קשר: </span>
          <a href={`mailto:${policyDocument.meta.contactEmail}`} className={`${footerLinkClass} break-all`}>
            {policyDocument.meta.contactEmail}
          </a>
        </p>
      </div>

      <div className={actionShellClass}>
        {!scrolledToBottom ? <p className={scrollHintClass}>גללו את דף האתר עד כאן כדי לאפשר אישור</p> : null}

        <div ref={bottomSentinelRef} data-policy-bottom-sentinel className="h-px w-full" aria-hidden />

        <label
          className={`flex items-start gap-2 text-sm leading-relaxed cursor-pointer ${
            scrolledToBottom
              ? bright
                ? "text-slate-800"
                : "text-white/85"
              : bright
                ? "text-slate-400 cursor-not-allowed"
                : "text-white/40 cursor-not-allowed"
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
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
          <button type="button" onClick={onDeclined} disabled={busy} className={declineClass}>
            אינני מסכים/ה
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={!canApprove}
            className={approveClass}
          >
            {busy ? "שומר..." : "אני מסכים/ה וממשיך/ה"}
          </button>
        </div>
      </div>
    </section>
  );
}
