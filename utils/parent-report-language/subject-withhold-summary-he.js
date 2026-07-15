/**
 * Parent-facing copy when the engine keeps actionState "withhold" but there is practice volume.
 * Centralizes replacement for the old generic "יש נתוני תרגול… עדיין זהיר" line.
 */

/** Full generic cautious line for subject scope (parent-facing subject cards / detailed.json). */
export const GENERIC_CAUTIOUS_SUBJECT_LINE_HE =
  "יש נתוני תרגול מסוימים, אך מה שנראה מהתרגולים עדיין זהיר - כדאי להמשיך לעקוב אחרי עוד תרגול.";

/** Topic-level thin cautious line (short report / בנושא X prefix). */
export const GENERIC_CAUTIOUS_TOPIC_LINE_HE =
  "יש נתוני תרגול, אך מה שנראה מהתרגולים עדיין זהיר - כדאי להמשיך לעקוב אחרי עוד תרגול.";

const SUBJECT_COPY = {
  richStable:
    "יש נפח תרגול משמעותי במקצוע, ואפשר לראות תמונה עקבית יותר לפי הדיוק והנושאים שנבדקו.",
  richNoStrength:
    "יש נפח תרגול משמעותי במקצוע; לא נראה כרגע קושי חד שחוזר על עצמו - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.",
  unstable:
    "במקצוע רואים תשובות פחות עקביות בין נושאים - כדאי לחזור על בסיס קצר ולבדוק יציבות לפני כיוון ברור.",
  medium:
    "יש נפח תרגול מסוים; כדי לצמצם טעות בפרשנות - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.",
  multiWeak:
    "רואים כמה כיוונים שונים בתרגול במקצוע - כדאי להתמקד בהדרגה במה שחוזר כקשה.",
  weakPattern: (p) =>
    `במקצוע הזה מופיע קושי יחסי (${p}), ולכן כדאי להתמקד בתרגול קצר וממוקד.`,
};

const TOPIC_COPY = {
  richStable:
    "יש נפח תרגול משמעותי, ואפשר לראות תמונה עקבית יותר לפי הדיוק ומה שנבדק בפועל.",
  richNoStrength:
    "יש נפח תרגול משמעותי; לא נראה כרגע קושי חד שחוזר על עצמו - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.",
  unstable:
    "רואים תשובות פחות עקביות בין חלקי הנושא - כדאי לייצב בסיס קצר לפני כיוון ברור.",
  medium:
    "יש נפח תרגול; כדי לצמצם טעות בפרשנות - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.",
  multiWeak:
    "רואים כמה כיוונים שונים בתרגול - כדאי להתמקד בהדרגה במה שחוזר כקשה.",
  weakPattern: (p) => `מופיע קושי יחסי (${p}) - כדאי להתמקד בתרגול קצר וממוקד.`,
};

/**
 * @param {unknown[]} units
 */
export function unitsSuggestInstability(units) {
  const list = Array.isArray(units) ? units : [];
  for (const u of list) {
    const b = String(u?.strengthProfile?.dominantBehavior || "").toLowerCase();
    if (b === "random_guessing" || b === "inconsistent" || b.includes("guess") || b.includes("inconsisten")) {
      return true;
    }
  }
  return false;
}

/**
 * @param {"subject"|"topic"} mode
 * @param {{
 *   subjectReportQuestions?: number,
 *   sumUnitQuestions?: number,
 *   strengthUnitCount?: number,
 *   diagnosedCount?: number,
 *   weakPatternHe?: string,
 *   units?: unknown[],
 *   subjectLabelHe?: string,
 *   reportSubjectAccuracy?: number | null,
 *   reportTotalQuestions?: number,
 *   clearWeakTopicLabelHe?: string,
 *   clearWeakTopicQuestions?: number,
 *   clearWeakTopicAccuracy?: number,
 * }} ctx
 */
export function withholdSummaryCopyHe(mode, ctx) {
  const m = mode === "topic" ? "topic" : "subject";
  const C = m === "topic" ? TOPIC_COPY : SUBJECT_COPY;
  const subjectLabelHe = String(ctx.subjectLabelHe || "").trim();
  const mediumSubjectAware = subjectLabelHe
    ? `יש נפח תרגול ב${subjectLabelHe}; כדי לצמצם טעות בפרשנות - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.`
    : "יש נפח תרגול מסוים; כדי לצמצם טעות בפרשנות - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.";
  const accMaybe =
    ctx.reportSubjectAccuracy == null ? null : Number(ctx.reportSubjectAccuracy);
  const reportAcc =
    accMaybe != null && Number.isFinite(accMaybe)
      ? Math.max(0, Math.min(100, Math.round(accMaybe)))
      : null;

  const volume = Math.max(
    Math.max(0, Number(ctx.subjectReportQuestions) || 0),
    Math.max(0, Number(ctx.sumUnitQuestions) || 0),
  );
  const su = Math.max(0, Number(ctx.strengthUnitCount) || 0);
  const dc = Math.max(0, Number(ctx.diagnosedCount) || 0);
  const pattern = String(ctx.weakPatternHe || "").trim();
  const units = Array.isArray(ctx.units) ? ctx.units : [];
  const reportTotalQuestions = Math.max(0, Number(ctx.reportTotalQuestions) || 0);
  /** Plenty of practice overall → avoid generic cautious row/topic copy for one thinner slice */
  const globalVolumeSupportsRichCopy = reportTotalQuestions >= 80;

  const thinLine = m === "subject" ? GENERIC_CAUTIOUS_SUBJECT_LINE_HE : GENERIC_CAUTIOUS_TOPIC_LINE_HE;
  const weakLabel = String(ctx.clearWeakTopicLabelHe || "").trim();
  const weakQ = Math.max(0, Number(ctx.clearWeakTopicQuestions) || 0);
  const weakAcc = Number(ctx.clearWeakTopicAccuracy);

  if (
    volume >= 5 &&
    reportAcc != null &&
    reportAcc <= 55 &&
    (weakQ >= 5 || volume >= 5)
  ) {
    if (m === "subject" && subjectLabelHe) {
      if (weakLabel) {
        return `ב${subjectLabelHe} נראית נקודת חיזוק ברורה בנושא ${weakLabel} - כדאי לחזק אותו בתרגול קצר וממוקד.`;
      }
      return `ב${subjectLabelHe} נראית נקודת חיזוק ברורה לפי התרגול - כדאי להתמקד בנושאים שדורשים חיזוק.`;
    }
    if (m === "topic" && weakLabel) {
      return `נראית נקודת חיזוק ברורה בנושא ${weakLabel} - כדאי לחזק אותו בתרגול קצר וממוקד.`;
    }
  }

  if (volume > 0 && volume < 35) {
    if (globalVolumeSupportsRichCopy) {
      if (dc >= 1 && pattern) return C.weakPattern(pattern);
      if (reportAcc != null && reportAcc > 0 && reportAcc <= 55 && volume >= 15) {
        if (m === "subject") {
          return subjectLabelHe
            ? `ב${subjectLabelHe} נראה קושי יחסי לפי הדיוק בסיכום התרגול - כדאי להתמקד בתרגול קצר וממוקד.`
            : mediumSubjectAware;
        }
        return TOPIC_COPY.medium;
      }
      return volume >= 15 ? (m === "subject" ? mediumSubjectAware : C.medium) : C.richStable;
    }
    return thinLine;
  }

  if (unitsSuggestInstability(units)) {
    return C.unstable;
  }

  if (dc >= 1 && pattern) {
    return C.weakPattern(pattern);
  }
  if (dc >= 2) {
    return C.multiWeak;
  }

  if (reportAcc != null && reportAcc > 0 && reportAcc <= 55 && volume >= 25) {
    if (m === "subject" && subjectLabelHe) {
      return `ב${subjectLabelHe} נראה קושי יחסי לפי הדיוק בסיכום התרגול - כדאי להתמקד בתרגול קצר וממוקד.`;
    }
    if (m === "topic") {
      return `נראה קושי יחסי לפי הדיוק בסיכום התרגול - כדאי להתמקד בתרגול קצר וממוקד.`;
    }
  }

  if (volume >= 90 && su >= 1) {
    return C.richStable;
  }
  if (volume >= 90 && su === 0) {
    if (m === "subject" && subjectLabelHe) {
      return `יש נפח תרגול משמעותי ב${subjectLabelHe}; לא נראה כרגע קושי חד שחוזר על עצמו - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.`;
    }
    return C.richNoStrength;
  }

  if (volume >= 40) {
    return m === "subject" ? mediumSubjectAware : C.medium;
  }

  if (volume >= 10) {
    if (reportAcc != null && reportAcc <= 55) {
      if (m === "subject" && subjectLabelHe) {
        if (weakLabel) {
          return `ב${subjectLabelHe} נראית נקודת חיזוק ברורה בנושא ${weakLabel} - כדאי לחזק אותו בתרגול קצר וממוקד.`;
        }
        return `ב${subjectLabelHe} נראית נקודת חיזוק ברורה לפי התרגול - כדאי להתמקד בנושאים שדורשים חיזוק.`;
      }
    }
    if (globalVolumeSupportsRichCopy) {
      return m === "subject" ? mediumSubjectAware : C.medium;
    }
    return thinLine;
  }

  // Grammar fix (was: "אין מספיק מה שרואים בשורות בשלב זה." — broken Hebrew syntax).
  // Meaning preserved exactly: not enough evidence yet to draw a conclusion at this stage.
  return "עדיין אין מספיק נתונים בשלב זה כדי לקבוע תמונה ברורה.";
}

/**
 * Confidence strip parallel to withhold summary (no generic cautious fallback).
 * @param {{
 *   subjectReportQuestions?: number,
 *   sumUnitQuestions?: number,
 *   strengthUnitCount?: number,
 *   diagnosedCount?: number,
 *   reportSubjectAccuracy?: number | null,
 * }} ctx
 */
export function withholdConfidenceSummaryFallbackHe(ctx) {
  const subjectLabelHe = String(ctx.subjectLabelHe || "").trim();
  const volume = Math.max(
    Math.max(0, Number(ctx.subjectReportQuestions) || 0),
    Math.max(0, Number(ctx.sumUnitQuestions) || 0),
  );
  const su = Math.max(0, Number(ctx.strengthUnitCount) || 0);
  const dc = Math.max(0, Number(ctx.diagnosedCount) || 0);
  const accMaybe =
    ctx.reportSubjectAccuracy == null ? null : Number(ctx.reportSubjectAccuracy);
  const reportAcc =
    accMaybe != null && Number.isFinite(accMaybe)
      ? Math.max(0, Math.min(100, Math.round(accMaybe)))
      : null;

  if (volume > 0 && volume < 35) {
    return "יש בסיס תרגול במקצוע, אך העדות עדיין מצומצמת - כדאי להמשיך לאסוף תרגול ולעקוב.";
  }
  if (reportAcc != null && reportAcc > 0 && reportAcc <= 55 && volume >= 25) {
    return "לפי סיכום התרגול במקצוע נראה דיוק נמוך יחסית - כדאי להתמקד בתרגול קצר וממוקד ואז לבדוק שוב.";
  }
  if (volume >= 90 && su >= 1) {
    return "יש נפח תרגול משמעותי במקצוע - אפשר לראות כיוון ראשוני עקבי יותר לפי מה שנבדק.";
  }
  if (volume >= 40 && dc >= 2) {
    return "במקצוע רואים כמה דפוסים במקביל - כדאי להתמקד במה שחוזר כקשה, בתנועה קטנה וקבועה.";
  }
  if (volume >= 40) {
    return subjectLabelHe
      ? `יש נפח תרגול ב${subjectLabelHe} - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.`
      : "יש נפח תרגול מסוים - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי מה שחוזר.";
  }
  return subjectLabelHe
    ? `יש בסיס תרגול ב${subjectLabelHe} - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי התפתחות.`
    : "יש בסיס תרגול מסוים - כדאי להמשיך בתרגול ממוקד ולעקוב אחרי התפתחות.";
}

/**
 * Detects the legacy paired cautious wording (subject or topic variants).
 * @param {string} text
 */
export function isGenericCautiousPracticeLineHe(text) {
  const t = String(text || "");
  const hasPractice = /יש\s+נתוני\s+תרגול/.test(t);
  const hasCautious = /מה\s+שנראה\s+מהתרגולים\s+עדיין\s+זהיר/.test(t);
  return hasPractice && hasCautious;
}
