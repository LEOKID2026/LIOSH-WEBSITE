import {
  gradeKeyToNumber,
  normalizeGradeLevelToKey,
} from "../learning-student-defaults.js";

/**
 * Pure resolver for student session + grade display state (browser-safe).
 *
 * @param {{
 *   status: "loading" | "ok" | "blocked",
 *   student: { id?: string, full_name?: string, grade_level?: string|null, coin_balance?: number, account_kind?: string } | null,
 *   activeStudentId?: string | null,
 *   cachedGradeLevelRaw?: string | null,
 *   demoGradeLevel?: string | null,
 * }} input
 */
export function resolveStudentSessionView(input) {
  const status = input?.status || "loading";
  const student = input?.student && typeof input.student === "object" ? input.student : null;
  const activeStudentId = String(input?.activeStudentId || "").trim();
  const cachedGradeLevelRaw =
    input?.cachedGradeLevelRaw != null ? String(input.cachedGradeLevelRaw) : "";
  const demoGradeRaw =
    input?.demoGradeLevel != null
      ? String(input.demoGradeLevel).trim()
      : student?.account_kind === "demo"
        ? String(student.grade_level ?? "").trim()
        : "";

  const sessionLoading = status === "loading";
  const sessionBlocked = status === "blocked";

  if (status === "ok" && student?.account_kind === "demo") {
    const gradeKey = normalizeGradeLevelToKey(demoGradeRaw || student?.grade_level);
    const rawBal = student?.coin_balance;
    const coinBalance =
      typeof rawBal === "number" && !Number.isNaN(rawBal) ? rawBal : 0;

    return {
      sessionLoading: false,
      sessionBlocked: false,
      sessionResolved: true,
      studentId: "",
      fullName: String(student?.full_name || student?.displayNameHe || "").trim(),
      coinBalance,
      gradeResolved: Boolean(gradeKey),
      gradeKey: gradeKey || null,
      gradeNumber: gradeKey ? gradeKeyToNumber(gradeKey) : null,
      authoritativeGradeKey: gradeKey || null,
      gradeSource: gradeKey ? "demo_session" : null,
    };
  }

  if (status === "ok" && student?.id) {
    const authoritativeGradeKey = normalizeGradeLevelToKey(student.grade_level);
    const gradeKey = authoritativeGradeKey || "";
    const gradeNumber = gradeKey ? gradeKeyToNumber(gradeKey) : null;
    const rawBal = student.coin_balance;
    const coinBalance =
      typeof rawBal === "number" && !Number.isNaN(rawBal) ? rawBal : 0;

    return {
      sessionLoading: false,
      sessionBlocked: false,
      sessionResolved: true,
      studentId: String(student.id),
      fullName: String(student.full_name || "").trim(),
      coinBalance,
      gradeResolved: Boolean(gradeKey),
      gradeKey: gradeKey || null,
      gradeNumber,
      authoritativeGradeKey: gradeKey || null,
      gradeSource: gradeKey ? "authoritative" : null,
    };
  }

  if (sessionLoading && activeStudentId && cachedGradeLevelRaw) {
    const hintKey = normalizeGradeLevelToKey(cachedGradeLevelRaw);
    if (hintKey) {
      return {
        sessionLoading: true,
        sessionBlocked: false,
        sessionResolved: false,
        studentId: activeStudentId,
        fullName: "",
        coinBalance: 0,
        gradeResolved: true,
        gradeKey: hintKey,
        gradeNumber: gradeKeyToNumber(hintKey),
        authoritativeGradeKey: null,
        gradeSource: "cache_hint",
      };
    }
  }

  return {
    sessionLoading,
    sessionBlocked,
    sessionResolved: false,
    studentId: activeStudentId || "",
    fullName: "",
    coinBalance: 0,
    gradeResolved: false,
    gradeKey: null,
    gradeNumber: null,
    authoritativeGradeKey: null,
    gradeSource: null,
  };
}

/**
 * Detect legacy hardcoded initial grade defaults that must not drive visible UI.
 * @param {string} sourceFileBasename
 * @param {string | null | undefined} initialGradeLiteral
 */
export function isLegacyHardcodedInitialGrade(sourceFileBasename, initialGradeLiteral) {
  const file = String(sourceFileBasename || "");
  const grade = String(initialGradeLiteral || "").toLowerCase();
  if (!grade) return false;
  if (file.includes("math-master") && grade === "g3") return true;
  if (file.includes("hebrew-master") && grade === "g3") return true;
  if (file.includes("english-master") && grade === "g3") return true;
  if (file.includes("moledet-geography-master") && grade === "g3") return true;
  if (file.includes("geometry-master") && grade === "g5") return true;
  if (file.includes("science-master") && grade === "g1") return true;
  return false;
}
