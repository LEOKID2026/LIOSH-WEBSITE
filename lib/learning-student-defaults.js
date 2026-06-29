const HEBREW_GRADE_LETTER_TO_NUMBER = {
  א: 1,
  ב: 2,
  ג: 3,
  ד: 4,
  ה: 5,
  ו: 6,
};

export function normalizeGradeLevelToKey(rawGradeLevel) {
  if (rawGradeLevel == null) return "";

  if (typeof rawGradeLevel === "number" && Number.isFinite(rawGradeLevel)) {
    const n = Math.floor(rawGradeLevel);
    if (n >= 1 && n <= 6) return `g${n}`;
    return "";
  }

  const value = String(rawGradeLevel).trim();
  if (!value) return "";

  const lower = value.toLowerCase();

  if (/^g[1-6]$/.test(lower)) {
    return lower;
  }

  if (/^[1-6]$/.test(lower)) {
    return `g${lower}`;
  }

  const gradeMatch = lower.match(/(?:grade|grade_|g|class|כיתה)[\s_-]*([1-6])/);
  if (gradeMatch) {
    return `g${gradeMatch[1]}`;
  }

  const hebrewMatch = value.match(/כיתה\s*([אבגדהו])/);
  if (hebrewMatch) {
    const gradeNumber = HEBREW_GRADE_LETTER_TO_NUMBER[hebrewMatch[1]];
    if (gradeNumber) {
      return `g${gradeNumber}`;
    }
  }

  const standaloneHebrew = value.match(/^([אבגדהו])['׳"]?$/);
  if (standaloneHebrew) {
    const gradeNumber = HEBREW_GRADE_LETTER_TO_NUMBER[standaloneHebrew[1]];
    if (gradeNumber) {
      return `g${gradeNumber}`;
    }
  }

  return "";
}

/** Canonical g1–g6 → Hebrew class label for student-facing UI (display only). */
const GRADE_KEY_TO_HEBREW_LABEL = {
  g1: "כיתה א׳",
  g2: "כיתה ב׳",
  g3: "כיתה ג׳",
  g4: "כיתה ד׳",
  g5: "כיתה ה׳",
  g6: "כיתה ו׳",
};

/**
 * Formats stored grade codes (e.g. grade_3, g3) for Hebrew UI. Does not alter DB/API values.
 * @param {string | null | undefined} gradeLevel
 * @returns {string} Hebrew label, or trimmed original if unknown, or "" if empty.
 */
export function formatGradeLevelHe(gradeLevel) {
  const raw = String(gradeLevel ?? "").trim();
  if (!raw) return "";

  const canonical = normalizeGradeLevelToKey(raw);
  if (canonical && GRADE_KEY_TO_HEBREW_LABEL[canonical]) {
    return GRADE_KEY_TO_HEBREW_LABEL[canonical];
  }

  const key = raw.toLowerCase();
  const direct = {
    grade_1: "כיתה א׳",
    grade_2: "כיתה ב׳",
    grade_3: "כיתה ג׳",
    grade_4: "כיתה ד׳",
    grade_5: "כיתה ה׳",
    grade_6: "כיתה ו׳",
    g1: "כיתה א׳",
    g2: "כיתה ב׳",
    g3: "כיתה ג׳",
    g4: "כיתה ד׳",
    g5: "כיתה ה׳",
    g6: "כיתה ו׳",
  };
  if (direct[key]) return direct[key];

  if (/^[1-6]$/.test(key) && GRADE_KEY_TO_HEBREW_LABEL[`g${key}`]) {
    return GRADE_KEY_TO_HEBREW_LABEL[`g${key}`];
  }

  return raw;
}

export function gradeKeyToNumber(gradeKey) {
  const match = String(gradeKey || "").toLowerCase().match(/^g([1-6])$/);
  return match ? Number(match[1]) : null;
}

export async function fetchStudentDefaults() {
  const response = await fetch("/api/student/me", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.student?.id) {
    return null;
  }

  const student = payload.student;
  return {
    fullName: String(student.full_name || "").trim(),
    gradeKey: normalizeGradeLevelToKey(student.grade_level),
  };
}
