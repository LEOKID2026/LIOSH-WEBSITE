import { useCallback, useEffect, useRef, useState } from "react";
import { buildFullPolicyAcceptanceDocument } from "../../data/legal/fullPolicyAcceptanceContent";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../data/legal/sitePolicies.he";
import { postPolicyAcceptance } from "../../lib/parent-client/policy-acceptance-api";
import PolicySectionsBody from "../legal/PolicySectionsBody";

const SCROLL_BOTTOM_EPS = 24;

/**
 * Full in-site Terms + Privacy acceptance (scroll + confirm + agree/decline).
 *
 * @param {{
 *   accessToken?: string | null;
 *   acceptanceSource: 'parent_signup' | 'parent_dashboard';
 *   termsVersion: string;
 *   privacyVersion: string;
 *   onAccepted: () => void;
 *   onDeclined: () => void;
 *   onBack?: () => void;
 *   persistToApi?: boolean;
 * }} props
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
}) {
  const document = buildFullPolicyAcceptanceDocument();
  const scrollRef = useRef(null);
  const bottomSentinelRef = useRef(null);

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_EPS;
    if (atBottom) setScrolledToBottom(true);
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = bottomSentinelRef.current;
    if (!root || !sentinel) return;

    updateScrollState();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setScrolledToBottom(true);
      },
      { root, threshold: 0.1 }
    );
    io.observe(sentinel);

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(root);
    return () => {
      io.disconnect();
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

  return (
    <div
      dir="rtl"
      lang="he"
      className="flex flex-col rounded-xl border border-amber-400/30 bg-black/60 overflow-hidden max-w-3xl w-full mx-auto"
      role="region"
      aria-label="אישור תנאי שימוש ומדיניות פרטיות"
    >
      <header className="shrink-0 px-4 sm:px-5 py-4 border-b border-white/10 space-y-2 text-right">
        <h2 className="text-lg sm:text-xl font-bold text-amber-200">תנאי שימוש ומדיניות פרטיות</h2>
        <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
          יש לגלול עד סוף המסמך, לסמן את תיבת האישור, ולאשר לפני המשך.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/55">
          <div>
            <dt className="inline font-semibold text-white/70">גרסת תנאים: </dt>
            <dd className="inline">{document.meta.termsVersion}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-white/70">גרסת פרטיות: </dt>
            <dd className="inline">{document.meta.privacyVersion}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-white/70">עודכן: </dt>
            <dd className="inline">{document.meta.lastUpdated}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-white/70">יצירת קשר: </dt>
            <dd className="inline">
              <a href={`mailto:${document.meta.contactEmail}`} className="text-amber-300 underline">
                {document.meta.contactEmail}
              </a>
            </dd>
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

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex-1 min-h-0 max-h-[min(58vh,520px)] overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 overscroll-contain"
        tabIndex={0}
        aria-label="תוכן המדיניות — גללו עד הסוף"
      >
        <div className="space-y-8">
          {document.parts.map((part) => (
            <div key={part.key} className="space-y-3">
              <h3 className="text-lg font-bold text-amber-100/90 border-b border-white/10 pb-2">
                {part.title}
              </h3>
              {part.intro ? (
                <p className="text-sm text-white/75 leading-relaxed">{part.intro}</p>
              ) : null}
              <PolicySectionsBody sections={part.sections} linkComponent="anchor" />
            </div>
          ))}
          <div ref={bottomSentinelRef} className="h-1" aria-hidden />
        </div>
      </div>

      {!scrolledToBottom ? (
        <p className="shrink-0 px-4 py-2 text-xs text-amber-200/80 bg-amber-950/30 border-t border-white/10 text-center">
          גללו עד סוף המסמך כדי לאפשר אישור
        </p>
      ) : null}

      <footer className="shrink-0 px-4 sm:px-5 py-4 border-t border-white/10 space-y-3 bg-black/40">
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
          <span>קראתי את תנאי השימוש ומדיניות הפרטיות ואני מסכים/ה להם.</span>
        </label>

        {error ? <p className="text-sm text-red-300" role="alert">{error}</p> : null}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
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
      </footer>
    </div>
  );
}
