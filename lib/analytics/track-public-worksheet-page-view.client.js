import {
  claimPublicWorksheetPageViewSend,
  getPublicWorksheetVisitSessionId,
} from "./public-worksheet-session.client.js";

/**
 * Fire-and-forget page view for the public worksheet generator.
 * Sends once per browser tab session; failures never throw.
 */
export function trackPublicWorksheetPageViewedOnce() {
  if (typeof window === "undefined") return;
  if (!claimPublicWorksheetPageViewSend()) return;

  const visitSessionId = getPublicWorksheetVisitSessionId();
  if (!visitSessionId) return;

  const body = JSON.stringify({ visitSessionId });

  fetch("/api/public/analytics/worksheet-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    keepalive: body.length < 60000,
    body,
  }).catch(() => {});
}
