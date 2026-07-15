import {
  applyPageCreditCap,
  applySessionCreditCap,
  computePageCreditedDwellMs,
  computeVisibleDwellMs,
  isPageRead,
  isSectionViewed,
  VIEW_THRESHOLD_MS,
  LEARNING_IDLE_FREEZE_MS,
} from "../learning/book-dwell-policy.js";

export { VIEW_THRESHOLD_MS };

export const BOOK_READING_SESSION_KEY = "liosh_book_reading_session_v1";
const BOOK_EVENTS_URL = "/api/learning/book-events";

/**
 * Client feature flag - enabled unless explicitly "false".
 */
export function isLearningBookTrackingEnabledClient() {
  return process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED !== "false";
}

function makeToken(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredSession() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BOOK_READING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSession(state) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(BOOK_READING_SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function clearStoredSession() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(BOOK_READING_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function postBookEvents(payload) {
  try {
    const response = await fetch(BOOK_EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function beaconBookEvents(payload) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false;
  }
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    return navigator.sendBeacon(BOOK_EVENTS_URL, blob);
  } catch {
    return false;
  }
}

function createNoOpBookReadingTracker() {
  return {
    onSectionChange() {},
    onPageEnter() {},
    onPageLeave() {},
    onCtaClick() {},
    endSession() {},
    dispose() {},
    getVisibilityTracker() {
      return { hiddenTabMs: 0 };
    },
    flushBeacon() {
      return false;
    },
  };
}

/**
 * @param {{
 *   subject: string,
 *   grade: string,
 *   pageId?: string|null,
 *   batchId?: string|null,
 *   sequenceIndex?: number|null,
 *   entryPageId?: string|null,
 *   returnFrom?: string|null,
 * }} params
 */
export function createBookReadingTracker(params) {
  if (!isLearningBookTrackingEnabledClient()) {
    return createNoOpBookReadingTracker();
  }

  const subject = String(params.subject || "").toLowerCase();
  const grade = String(params.grade || "").toLowerCase();

  /** @type {{ clientSessionToken: string, bookReadingSessionId: string|null, subject: string, grade: string, totals: object }|null} */
  let sessionState = null;
  /** @type {{ clientVisitToken: string, bookPageVisitId: string|null, pageId: string, startedAt: number, sectionIndex: number, sectionStartedAt: number, sectionsViewed: number[], sectionsSkipped: number[], hiddenTabMs: number, hiddenSince: number|null, triggeredCta: boolean }|null} */
  let visitState = null;

  let visibilityListenerAttached = false;

  function syncHiddenTabMs() {
    if (!visitState?.hiddenSince) return;
    visitState.hiddenTabMs += Math.max(0, Date.now() - visitState.hiddenSince);
    visitState.hiddenSince = null;
  }

  function onVisibilityChange() {
    if (typeof document === "undefined" || !visitState) return;
    if (document.visibilityState === "hidden") {
      if (!visitState.hiddenSince) visitState.hiddenSince = Date.now();
    } else if (visitState.hiddenSince) {
      visitState.hiddenTabMs += Math.max(0, Date.now() - visitState.hiddenSince);
      visitState.hiddenSince = null;
    }
  }

  function attachVisibilityListener() {
    if (visibilityListenerAttached || typeof document === "undefined") return;
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);
    window.addEventListener("blur", onVisibilityChange);
    visibilityListenerAttached = true;
  }

  function detachVisibilityListener() {
    if (!visibilityListenerAttached || typeof document === "undefined") return;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onVisibilityChange);
    window.removeEventListener("blur", onVisibilityChange);
    visibilityListenerAttached = false;
  }

  async function ensureSession() {
    const stored = readStoredSession();
    if (
      stored?.bookReadingSessionId &&
      stored.clientSessionToken &&
      stored.subject === subject &&
      stored.grade === grade
    ) {
      sessionState = {
        clientSessionToken: stored.clientSessionToken,
        bookReadingSessionId: stored.bookReadingSessionId,
        subject,
        grade,
        totals: stored.totals || {
          totalRawDwellMs: 0,
          totalCreditedDwellMs: 0,
          totalHiddenTabMs: 0,
          pagesReadCount: 0,
          pagesSkippedCount: 0,
          triggeredCta: false,
        },
      };
      return sessionState;
    }

    const clientSessionToken = makeToken("bsess");
    const startResult = await postBookEvents({
      event: "book_reading_session_start",
      clientSessionToken,
      subject,
      grade,
      entryPageId: params.entryPageId || params.pageId || null,
      returnFrom: params.returnFrom || null,
    });

    const bookReadingSessionId = startResult?.bookReadingSessionId || null;
    sessionState = {
      clientSessionToken,
      bookReadingSessionId,
      subject,
      grade,
      totals: {
        totalRawDwellMs: 0,
        totalCreditedDwellMs: 0,
        totalHiddenTabMs: 0,
        pagesReadCount: 0,
        pagesSkippedCount: 0,
        triggeredCta: false,
      },
    };
    writeStoredSession(sessionState);
    return sessionState;
  }

  function recordSectionDwell(sectionIndex, dwellMs, visibleMs) {
    if (!visitState) return;
    const sectionNumber = sectionIndex + 1;
    if (isSectionViewed(visibleMs)) {
      if (!visitState.sectionsViewed.includes(sectionNumber)) {
        visitState.sectionsViewed.push(sectionNumber);
      }
    } else if (dwellMs > 0) {
      if (!visitState.sectionsSkipped.includes(sectionNumber)) {
        visitState.sectionsSkipped.push(sectionNumber);
      }
    }
  }

  async function startPageVisit(pageId, batchId, sequenceIndex) {
    if (!pageId) return;
    const session = await ensureSession();
    if (!session?.bookReadingSessionId) return;

    const clientVisitToken = makeToken("bvisit");
    const startVisitResult = await postBookEvents({
      event: "book_page_visit_start",
      bookReadingSessionId: session.bookReadingSessionId,
      clientVisitToken,
      pageId,
      subject,
      grade,
      batchId: batchId || null,
      sequenceIndex: sequenceIndex ?? null,
    });
    const bookPageVisitId = startVisitResult?.bookPageVisitId || null;

    const now = Date.now();
    visitState = {
      clientVisitToken,
      bookPageVisitId,
      pageId,
      startedAt: now,
      lastActivityAt: now,
      sectionIndex: 0,
      sectionStartedAt: now,
      sectionsViewed: [],
      sectionsSkipped: [],
      hiddenTabMs: 0,
      hiddenSince: document?.visibilityState === "hidden" ? now : null,
      triggeredCta: false,
    };
    attachVisibilityListener();
  }

  async function endPageVisit(useBeacon = false) {
    if (!visitState || !sessionState?.bookReadingSessionId) {
      visitState = null;
      return null;
    }

    syncHiddenTabMs();
    const rawDwellMs = Math.max(0, Date.now() - visitState.startedAt);
    const sectionDwellMs = Math.max(0, Date.now() - visitState.sectionStartedAt);
    const sectionVisibleMs = computeVisibleDwellMs(
      sectionDwellMs,
      visitState.hiddenSince ? Math.max(0, Date.now() - visitState.hiddenSince) : 0
    );
    recordSectionDwell(visitState.sectionIndex, sectionDwellMs, sectionVisibleMs);

    const hiddenTabMs = visitState.hiddenTabMs;
    const visible = computeVisibleDwellMs(rawDwellMs, hiddenTabMs);
    // Idle freeze: at most IDLE ms after last learning interaction.
    const openCeiling = Math.max(
      0,
      visitState.lastActivityAt - visitState.startedAt + LEARNING_IDLE_FREEZE_MS
    );
    const creditedDwellMs = computePageCreditedDwellMs(rawDwellMs, hiddenTabMs, {
      idleCreditedMs: Math.min(visible, openCeiling),
    });
    const pageRead = isPageRead(visible);

    const payload = {
      event: "book_page_visit_end",
      bookPageVisitId: visitState.bookPageVisitId,
      rawDwellMs,
      creditedDwellMs,
      hiddenTabMs,
      sectionsViewed: [...visitState.sectionsViewed].sort((a, b) => a - b),
      sectionsSkipped: [...visitState.sectionsSkipped].sort((a, b) => a - b),
      pageRead,
      triggeredCta: visitState.triggeredCta,
    };

    if (useBeacon) {
      beaconBookEvents(payload);
    } else {
      await postBookEvents(payload);
    }

    sessionState.totals.totalRawDwellMs += rawDwellMs;
    sessionState.totals.totalHiddenTabMs += hiddenTabMs;
    sessionState.totals.totalCreditedDwellMs = applySessionCreditCap(
      sessionState.totals.totalCreditedDwellMs + creditedDwellMs
    );
    if (pageRead) sessionState.totals.pagesReadCount += 1;
    else sessionState.totals.pagesSkippedCount += 1;
    if (visitState.triggeredCta) sessionState.totals.triggeredCta = true;
    writeStoredSession(sessionState);

    const ended = { ...payload, visitState: { ...visitState } };
    visitState = null;
    detachVisibilityListener();
    return ended;
  }

  return {
    onSectionChange(fromIndex, toIndex) {
      if (!visitState) return;
      const now = Date.now();
      visitState.lastActivityAt = now;
      const sectionDwellMs = Math.max(0, now - visitState.sectionStartedAt);
      const extraHidden =
        visitState.hiddenSince && document?.visibilityState === "hidden"
          ? Math.max(0, now - visitState.hiddenSince)
          : 0;
      const visibleMs = computeVisibleDwellMs(sectionDwellMs, extraHidden);
      recordSectionDwell(fromIndex, sectionDwellMs, visibleMs);
      visitState.sectionIndex = toIndex;
      visitState.sectionStartedAt = now;
    },

    /** Scroll / in-content interaction — renews idle window. */
    onLearningInteraction() {
      if (visitState) visitState.lastActivityAt = Date.now();
    },

    async onPageEnter(pageId, batchId, sequenceIndex) {
      await startPageVisit(pageId, batchId, sequenceIndex);
    },

    async onPageLeave(useBeacon = false) {
      return endPageVisit(useBeacon);
    },

    onCtaClick() {
      if (visitState) {
        visitState.triggeredCta = true;
        visitState.lastActivityAt = Date.now();
      }
      if (sessionState?.totals) sessionState.totals.triggeredCta = true;
    },

    async endSession(useBeacon = false, ctaPageId = null) {
      await endPageVisit(useBeacon);
      if (!sessionState?.bookReadingSessionId) {
        clearStoredSession();
        return;
      }
      const totals = sessionState.totals;
      const payload = {
        event: "book_reading_session_end",
        bookReadingSessionId: sessionState.bookReadingSessionId,
        totalRawDwellMs: totals.totalRawDwellMs,
        totalCreditedDwellMs: totals.totalCreditedDwellMs,
        totalHiddenTabMs: totals.totalHiddenTabMs,
        pagesReadCount: totals.pagesReadCount,
        pagesSkippedCount: totals.pagesSkippedCount,
        triggeredCta: totals.triggeredCta,
        ctaPageId: ctaPageId || null,
      };
      if (useBeacon) beaconBookEvents(payload);
      else await postBookEvents(payload);
      clearStoredSession();
      sessionState = null;
    },

    getVisibilityTracker() {
      syncHiddenTabMs();
      return { hiddenTabMs: visitState?.hiddenTabMs || 0 };
    },

    flushBeacon(url = BOOK_EVENTS_URL) {
      void url;
      return beaconBookEvents({ events: [] });
    },

    dispose() {
      detachVisibilityListener();
    },
  };
}
