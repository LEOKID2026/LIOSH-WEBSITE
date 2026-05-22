/**
 * Browser launch + Playwright network observer for /api/learning/* calls.
 *
 * Tracks request/response pairs for the three real-persistence endpoints:
 *   POST /api/learning/session/start
 *   POST /api/learning/answer
 *   POST /api/learning/session/finish
 *
 * Captures the learningSessionId from session/start so Tier 1 can verify
 * persistence without relying on localStorage.
 */
import { chromium } from "playwright";

const TRACKED_PATHS = [
  "/api/learning/session/start",
  "/api/learning/answer",
  "/api/learning/session/finish",
];

export async function launchBrowser({ headed = false } = {}) {
  return chromium.launch({ headless: !headed });
}

export async function newStudentContext(browser) {
  return browser.newContext({
    locale: "he-IL",
    viewport: { width: 1280, height: 800 },
  });
}

export function attachLearningNetworkObserver(page) {
  const events = [];

  page.on("request", (request) => {
    const url = request.url();
    const matched = TRACKED_PATHS.find((path) => url.includes(path));
    if (!matched) return;
    events.push({
      kind: "request",
      path: matched,
      url,
      method: request.method(),
      ts: Date.now(),
    });
  });

  page.on("response", async (response) => {
    const request = response.request();
    const url = request.url();
    const matched = TRACKED_PATHS.find((path) => url.includes(path));
    if (!matched) return;
    let bodyJson = null;
    try {
      bodyJson = await response.json();
    } catch {
      bodyJson = null;
    }
    events.push({
      kind: "response",
      path: matched,
      url,
      method: request.method(),
      status: response.status(),
      ok: response.ok(),
      ts: Date.now(),
      body: sanitizeBody(matched, bodyJson),
    });
  });

  return {
    events,
    snapshot() {
      return events.slice();
    },
    summary() {
      return summarizeEvents(events);
    },
  };
}

function sanitizeBody(path, body) {
  if (!body || typeof body !== "object") return null;
  if (path === "/api/learning/session/start") {
    return {
      learningSessionId: body.learningSessionId ? String(body.learningSessionId) : null,
      ok: typeof body.ok === "boolean" ? body.ok : null,
      error: body.error ? String(body.error).slice(0, 200) : null,
    };
  }
  if (path === "/api/learning/answer") {
    return {
      ok: typeof body.ok === "boolean" ? body.ok : null,
      error: body.error ? String(body.error).slice(0, 200) : null,
      answerId: body.answerId ? String(body.answerId) : null,
    };
  }
  if (path === "/api/learning/session/finish") {
    return {
      ok: typeof body.ok === "boolean" ? body.ok : null,
      error: body.error ? String(body.error).slice(0, 200) : null,
    };
  }
  return null;
}

function summarizeEvents(events) {
  const byPath = {};
  for (const path of TRACKED_PATHS) {
    byPath[path] = { requests: 0, responses: 0, ok: 0, fail: 0, sessionId: null };
  }
  for (const event of events) {
    const bucket = byPath[event.path];
    if (!bucket) continue;
    if (event.kind === "request") {
      bucket.requests += 1;
    } else if (event.kind === "response") {
      bucket.responses += 1;
      if (event.ok) bucket.ok += 1;
      else bucket.fail += 1;
      if (event.path === "/api/learning/session/start" && event.body?.learningSessionId) {
        bucket.sessionId = event.body.learningSessionId;
      }
    }
  }
  return byPath;
}
