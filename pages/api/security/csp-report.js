/**
 * CSP Report-Only violation sink — accepts browser CSP reports, does not persist PII.
 * Production: rate-limited, 204 No Content, no storage.
 * Development: optional redacted safeApiLog line.
 */
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { rejectIfRateLimited } from "../../../lib/security/in-memory-rate-limit.js";
import { safeApiLog } from "../../../lib/security/safe-log.js";

function redactReportUri(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return `${u.origin}${u.pathname}`;
  } catch {
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  }
}

function extractCspReport(body) {
  if (!body || typeof body !== "object") return null;
  const report = body["csp-report"] || body.cspReport || body;
  if (!report || typeof report !== "object") return null;
  return {
    violatedDirective: String(report["violated-directive"] || report.violatedDirective || "").slice(0, 200),
    effectiveDirective: String(report["effective-directive"] || report.effectiveDirective || "").slice(0, 200),
    blockedUri: redactReportUri(report["blocked-uri"] || report.blockedUri),
    documentUri: redactReportUri(report["document-uri"] || report.documentUri),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (
    rejectIfRateLimited(req, res, {
      namespace: "csp-report",
      maxAttempts: 120,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return;
  }

  const summary = extractCspReport(req.body);
  if (!isProductionRuntime() && summary) {
    safeApiLog("[csp-report]", summary);
  }

  res.status(204).end();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "32kb",
    },
  },
};
