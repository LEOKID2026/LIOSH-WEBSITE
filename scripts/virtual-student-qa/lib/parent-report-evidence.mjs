/**
 * Parent-report text/diagnostic evidence extraction (E5.1).
 *
 * QA-only: scrapes rendered parent report DOM/text for machine-readable
 * artifacts. Does not change product code.
 */

import { scanParentReportText } from "../../launch-readiness/lib/raw-keys-blacklist.mjs";

export const SUBJECT_LABELS = {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  "moledet-geography": "מולדת",
};

export const SUBJECT_EMOJI = {
  math: "🧮",
  geometry: "📐",
  english: "📘",
  hebrew: "📚",
  science: "🔬",
  "moledet-geography": "🗺️",
};

const ALL_SUBJECTS = Object.keys(SUBJECT_LABELS);

/** Hebrew alt labels seen in parent report copy. */
const HEBREW_SUBJECT_ALIASES = {
  math: ["חשבון", "מתמטיקה"],
  geometry: ["גאומטריה"],
  english: ["אנגלית"],
  hebrew: ["עברית"],
  science: ["מדעים"],
  "moledet-geography": ["מולדת", "גאוגרפיה", "גאוג'"],
};

const WEAKNESS_MARKERS = [
  "נקודות לשיפור",
  "תחומים דורשים תשומת לב",
  "דורש תשומת לב",
  "חולש",
  "לשיפור",
  "weakness",
];

const RECOMMENDATION_MARKERS = [
  "מומלץ",
  "המלצ",
  "recommend",
  "לשמר",
  "תרגול",
];

const DIAGNOSTIC_UNIT_MARKERS = [
  "יחיד",
  "unit",
  "נושא",
  "topic",
];

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStudentIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/studentId=([^&]+)/i);
  return m ? m[1] : null;
}

function mapHebrewTitleToSubject(title) {
  const t = normalizeWhitespace(title);
  for (const subj of ALL_SUBJECTS) {
    const emoji = SUBJECT_EMOJI[subj];
    const label = SUBJECT_LABELS[subj];
    if (t.includes(`${emoji} ${label}`) || t.includes(label)) return subj;
    for (const alias of HEBREW_SUBJECT_ALIASES[subj] || []) {
      if (t.includes(alias)) return subj;
    }
  }
  return null;
}

function detectSubjectsInText(text) {
  const found = new Set();
  const normalized = normalizeWhitespace(text);
  for (const subj of ALL_SUBJECTS) {
    const label = SUBJECT_LABELS[subj];
    const emoji = SUBJECT_EMOJI[subj];
    if (normalized.includes(`${emoji} ${label}`) || normalized.includes(label)) {
      found.add(subj);
    }
    for (const alias of HEBREW_SUBJECT_ALIASES[subj] || []) {
      if (normalized.includes(alias)) found.add(subj);
    }
    if (normalized.toLowerCase().includes(subj)) found.add(subj);
  }
  return [...found];
}

function detectDiagnosticSubjectsFromText(text, domDiagnosticTitles = []) {
  const subjects = new Set();
  for (const title of domDiagnosticTitles) {
    const mapped = mapHebrewTitleToSubject(title);
    if (mapped) subjects.add(mapped);
  }
  const normalized = normalizeWhitespace(text);
  const hasWeaknessLanguage = WEAKNESS_MARKERS.some((m) => normalized.includes(m));
  if (hasWeaknessLanguage) {
    for (const subj of detectSubjectsInText(normalized)) {
      subjects.add(subj);
    }
  }
  return [...subjects];
}

function detectRecommendationsFromText(text, domRecItems = []) {
  const subjects = new Set();
  for (const item of domRecItems) {
    for (const subj of detectSubjectsInText(item)) subjects.add(subj);
    if (RECOMMENDATION_MARKERS.some((m) => item.includes(m))) {
      for (const subj of detectSubjectsInText(item)) subjects.add(subj);
    }
  }
  if (subjects.size === 0 && RECOMMENDATION_MARKERS.some((m) => text.includes(m))) {
    for (const subj of detectSubjectsInText(text)) subjects.add(subj);
  }
  return [...subjects];
}

function detectDiagnosticUnits(domRecItems, text) {
  const units = [];
  for (const item of domRecItems) {
    const line = normalizeWhitespace(item);
    if (!line) continue;
    const isUnitLike =
      DIAGNOSTIC_UNIT_MARKERS.some((m) => line.toLowerCase().includes(m)) ||
      WEAKNESS_MARKERS.some((m) => line.includes(m));
    if (isUnitLike && line.length <= 300) units.push(line.slice(0, 300));
  }
  if (units.length === 0 && WEAKNESS_MARKERS.some((m) => text.includes(m))) {
    units.push("(weakness section visible but no discrete unit text extracted)");
  }
  return units.slice(0, 20);
}

function detectStudentName(text, expectedStudentName) {
  if (expectedStudentName && text.includes(expectedStudentName)) {
    return expectedStudentName;
  }
  const m = text.match(/בדיקה[-\u0590-\u05FF\w\d]+/);
  return m ? m[0] : null;
}

/**
 * Extract structured evidence from a Playwright page (post-load).
 */
export async function extractParentReportEvidenceFromPage(page, {
  studentLabel,
  phase,
  reportUrl,
  expectedStudentName = null,
  numericSnapshot = null,
}) {
  const limitations = [];

  const domData = await page.evaluate(() => {
    const rtl = document.querySelector('[dir="rtl"]');
    const root = rtl || document.body;
    const visibleText = root?.innerText || "";
    const reportTitle =
      document.querySelector("h1,h2")?.innerText?.trim() ||
      Array.from(document.querySelectorAll('[role="heading"]'))
        .map((el) => el.innerText?.trim())
        .find((t) => t && t.includes("דוח")) ||
      null;
    const diagnosticTitles = Array.from(
      document.querySelectorAll(".parent-report-diagnostic-subject-title")
    ).map((el) => el.innerText?.trim() || "");
    const diagnosticItems = Array.from(
      document.querySelectorAll(
        ".parent-report-diagnostics-print .parent-report-rec-item"
      )
    ).map((el) => el.innerText?.trim() || "");
    const recommendationItems = Array.from(
      document.querySelectorAll(
        ".parent-report-recommendations-print .parent-report-rec-item"
      )
    ).map((el) => el.innerText?.trim() || "");
    return {
      visibleText,
      reportTitle,
      diagnosticTitles,
      diagnosticItems,
      recommendationItems,
    };
  });

  const visibleText = domData.visibleText || "";
  const normalizedVisibleText = normalizeWhitespace(visibleText);
  const textSample = normalizedVisibleText.slice(0, 4000);

  if (!visibleText.trim()) {
    limitations.push("visibleText empty after page load");
  }

  const detectedSubjects = detectSubjectsInText(normalizedVisibleText);
  if (numericSnapshot?.bySubject) {
    for (const [subj, entry] of Object.entries(numericSnapshot.bySubject)) {
      if (entry?.questionCount > 0 && !detectedSubjects.includes(subj)) {
        detectedSubjects.push(subj);
      }
    }
  }

  const detectedDiagnosticSubjects = detectDiagnosticSubjectsFromText(
    normalizedVisibleText,
    domData.diagnosticTitles
  );
  const detectedRecommendations = detectRecommendationsFromText(
    normalizedVisibleText,
    [...domData.diagnosticItems, ...domData.recommendationItems]
  );
  const detectedDiagnosticUnits = detectDiagnosticUnits(
    domData.diagnosticItems,
    normalizedVisibleText
  );

  if (domData.diagnosticTitles.length === 0 && detectedDiagnosticSubjects.length === 0) {
    limitations.push("no diagnostic subject blocks visible in DOM");
  }
  if (detectedDiagnosticUnits.length === 0) {
    limitations.push("no discrete diagnostic units extracted from DOM");
  }
  if (detectedRecommendations.length === 0 && domData.recommendationItems.length === 0) {
    limitations.push("no recommendation items visible in DOM");
  }

  const scan = scanParentReportText(normalizedVisibleText);

  return {
    studentLabel,
    studentId: extractStudentIdFromUrl(reportUrl || page.url()),
    reportUrl: reportUrl || page.url(),
    capturedAt: new Date().toISOString(),
    phase,
    visibleText: textSample,
    normalizedVisibleText: normalizedVisibleText.slice(0, 8000),
    reportTitle: domData.reportTitle,
    detectedStudentNameOrLabel: detectStudentName(normalizedVisibleText, expectedStudentName),
    detectedSubjects,
    detectedRecommendations,
    detectedDiagnosticSubjects,
    detectedDiagnosticUnits,
    detectedRawKeys: scan.rawKeys.map((m) => m.token),
    detectedEngineJargon: scan.engineJargon.map((m) => m.token),
    rawKeyMatches: scan.rawKeys,
    engineJargonMatches: scan.engineJargon,
    numericSnapshot: numericSnapshot || null,
    source: "rendered-parent-report-page",
    limitations,
  };
}

export function buildParentReportEvidenceMarkdown(evidence) {
  const lines = [];
  lines.push(`# Parent Report Snapshot — ${evidence.studentLabel} (${evidence.phase})`);
  lines.push("");
  lines.push(`- **reportUrl:** ${evidence.reportUrl || "—"}`);
  lines.push(`- **capturedAt:** ${evidence.capturedAt}`);
  lines.push(`- **studentId:** ${evidence.studentId || "—"}`);
  lines.push(`- **detected name:** ${evidence.detectedStudentNameOrLabel || "—"}`);
  lines.push(`- **source:** ${evidence.source}`);
  lines.push("");
  lines.push(`## Detected subjects`);
  lines.push((evidence.detectedSubjects || []).join(", ") || "—");
  lines.push("");
  lines.push(`## Diagnostic subjects`);
  lines.push((evidence.detectedDiagnosticSubjects || []).join(", ") || "—");
  lines.push("");
  lines.push(`## Recommendations`);
  lines.push((evidence.detectedRecommendations || []).join(", ") || "—");
  lines.push("");
  lines.push(`## Diagnostic units (${(evidence.detectedDiagnosticUnits || []).length})`);
  for (const u of evidence.detectedDiagnosticUnits || []) lines.push(`- ${u}`);
  if ((evidence.detectedDiagnosticUnits || []).length === 0) lines.push("—");
  lines.push("");
  lines.push(`## Raw keys (${(evidence.detectedRawKeys || []).length})`);
  lines.push((evidence.detectedRawKeys || []).join(", ") || "none");
  lines.push("");
  lines.push(`## Engine jargon (${(evidence.detectedEngineJargon || []).length})`);
  lines.push((evidence.detectedEngineJargon || []).join(", ") || "none");
  lines.push("");
  lines.push(`## Limitations`);
  for (const l of evidence.limitations || []) lines.push(`- ${l}`);
  if ((evidence.limitations || []).length === 0) lines.push("- none");
  lines.push("");
  lines.push(`## Text sample`);
  lines.push("```");
  lines.push((evidence.visibleText || "").slice(0, 1500));
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

export function inferPhaseFromArtifactPrefix(prefix) {
  const p = String(prefix || "").toLowerCase();
  if (p.includes("baseline")) return "baseline";
  if (p.includes("after")) return "after";
  return "unknown";
}
