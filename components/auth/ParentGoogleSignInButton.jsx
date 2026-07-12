/**
 * Official Google Identity Services button for parent login.
 * Click-only: no One Tap, no auto_select, and never call accounts.id prompt UI.
 */

import { useEffect, useRef, useState } from "react";
import {
  createParentGoogleNoncePair,
  getParentGoogleClientId,
  loadParentGoogleGsiClient,
} from "../../lib/auth/parent-google-oauth.client.js";

/**
 * @param {{
 *   disabled?: boolean;
 *   className?: string;
 *   onCredential?: (payload: { credential: string, nonce: string }) => void | Promise<void>;
 *   onError?: (messageHe: string) => void;
 * }} props
 */
export default function ParentGoogleSignInButton({
  disabled = false,
  className = "",
  onCredential,
  onError,
}) {
  const containerRef = useRef(null);
  const nonceRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState("");

  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    const clientId = getParentGoogleClientId();

    if (!clientId) {
      setInitError("התחברות עם Google אינה מוגדרת כרגע. התחברו עם אימייל וסיסמה.");
      setReady(false);
      return undefined;
    }

    (async () => {
      try {
        await loadParentGoogleGsiClient();
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;

        const { nonce, hashedNonce } = await createParentGoogleNoncePair();
        if (cancelled) return;
        nonceRef.current = nonce;

        const width = Math.max(240, Math.floor(containerRef.current.offsetWidth || 320));

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            const credential = String(response?.credential || "").trim();
            const usedNonce = nonceRef.current;
            nonceRef.current = null;
            if (!credential) {
              onErrorRef.current?.("לא הצלחנו להשלים התחברות עם Google. נסו שוב.");
              return;
            }
            void onCredentialRef.current?.({ credential, nonce: usedNonce || "" });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,
          nonce: hashedNonce,
          context: "signin",
          ux_mode: "popup",
        });

        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "filled_blue",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width,
          locale: "he",
        });

        if (!cancelled) {
          setInitError("");
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setReady(false);
          setInitError("לא ניתן לטעון את התחברות Google כרגע. נסו שוב בעוד רגע.");
          onErrorRef.current?.(
            "לא ניתן לטעון את התחברות Google כרגע. נסו שוב בעוד רגע."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      nonceRef.current = null;
    };
  }, []);

  if (initError && !ready) {
    return (
      <div
        className={["w-full min-h-10", className].filter(Boolean).join(" ")}
        data-testid="parent-google-sign-in"
        role="status"
      >
        <p className="text-sm text-center opacity-80">{initError}</p>
      </div>
    );
  }

  return (
    <div
      className={["relative w-full min-h-10", className].filter(Boolean).join(" ")}
      data-testid="parent-google-sign-in"
      aria-busy={disabled ? "true" : "false"}
    >
      <div ref={containerRef} className="w-full flex justify-center [&>div]:w-full" />
      {disabled ? (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-full bg-white/50"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
