import {
  BEHAVIOR_PROFILES,
  FORBIDDEN_ENGLISH_PATTERNS,
  FORBIDDEN_TECHNICAL_PATTERNS,
} from "./constants.mjs";

const PROFILE_IDS = new Set(BEHAVIOR_PROFILES.map((p) => p.id));
const ENGINE_KEYS = new Set([
  "mastery_stable",
  "partial_stable",
  "topic_needs_strengthening",
  "clear_topic_gap",
  "early_direction_only",
  "insufficient_data",
  "speed_pressure_pattern",
  "self_practice",
  "parent_assigned",
  "parent_assigned_activity",
]);

const LATIN_TOKEN = /[A-Za-z][A-Za-z0-9_]{2,}/g;

function collectParentVisibleStrings(payload) {
  const out = [];
  const pf = payload?.parentFacing;
  if (pf && typeof pf === "object") {
    for (const key of ["insights", "homeRecommendations", "practiceFocus", "teacherMessages"]) {
      const arr = pf[key];
      if (Array.isArray(arr)) {
        for (const line of arr) {
          if (typeof line === "string" && line.trim()) out.push({ path: `parentFacing.${key}`, value: line });
        }
      }
    }
  }
  const name = payload?.student?.full_name;
  if (typeof name === "string" && name.trim()) {
    out.push({ path: "student.full_name", value: name });
  }
  return out;
}

function collectInternalMetadataStrings(payload) {
  const out = [];
  const walk = (node, path) => {
    if (node == null) return;
    if (typeof node === "string") {
      if (/[A-Za-z]/.test(node)) out.push({ path, value: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(payload?.subjects, "subjects");
  return out;
}

function classifyToken(token, { childName, profileId }) {
  if (PROFILE_IDS.has(token)) return "profile_label";
  if (ENGINE_KEYS.has(token)) return "engine_key";
  if (childName.includes(token)) return "child_name";
  if (FORBIDDEN_ENGLISH_PATTERNS.some((p) => p.test(token))) return "forbidden_pattern";
  if (FORBIDDEN_TECHNICAL_PATTERNS.some((p) => p.test(token))) return "engine_key";
  return "unknown";
}

function classifyMetadataPath(path) {
  if (path.includes("evidenceSources") || path.includes("primaryEvidenceSource")) return "metadata_enum_leak";
  if (path.includes("byContentGrade")) return "metadata_enum_leak";
  return "report_internals";
}

/**
 * Analyze English / Latin tokens in parent report payloads.
 * @param {Array<{ student, publicPayload, rawPayload }>} samples
 */
export function analyzeEnglishInReports(samples) {
  const stringIndex = new Map();
  let studentsWithForbiddenPattern = 0;
  let studentsWithParentVisibleLatin = 0;
  let hitsFromChildNameInVisible = 0;
  let hitsFromProfileInVisible = 0;
  let hitsFromReportCopy = 0;
  let hitsFromMetadataLeak = 0;

  for (const { student, publicPayload } of samples) {
    const childName = String(student.displayName || publicPayload?.student?.full_name || "");
    const profileId = String(student.profile || "");
    const joined = JSON.stringify(publicPayload || {});

    let forbiddenHit = false;
    for (const pat of FORBIDDEN_ENGLISH_PATTERNS) {
      if (pat.test(joined)) {
        forbiddenHit = true;
        const key = String(pat);
        const row = stringIndex.get(key) || { string: key, source: "forbidden_pattern", count: 0, paths: new Set() };
        row.count += 1;
        stringIndex.set(key, row);
      }
    }
    if (forbiddenHit) studentsWithForbiddenPattern += 1;

    const visible = collectParentVisibleStrings(publicPayload);
    let visibleLatin = false;
    for (const { path, value } of visible) {
      for (const match of value.matchAll(LATIN_TOKEN)) {
        const token = match[0];
        visibleLatin = true;
        const source = classifyToken(token, { childName, profileId });
        const row = stringIndex.get(token) || { string: token, source, count: 0, paths: new Set() };
        row.count += 1;
        row.paths.add(path);
        if (source === "child_name") hitsFromChildNameInVisible += 1;
        else if (source === "profile_label") hitsFromProfileInVisible += 1;
        else if (source === "unknown") hitsFromReportCopy += 1;
        stringIndex.set(token, row);
      }
    }
    if (visibleLatin) studentsWithParentVisibleLatin += 1;

    for (const { path, value } of collectInternalMetadataStrings(publicPayload)) {
      if (!ENGINE_KEYS.has(value) && !PROFILE_IDS.has(value)) continue;
      hitsFromMetadataLeak += 1;
      const row = stringIndex.get(value) || {
        string: value,
        source: classifyMetadataPath(path),
        count: 0,
        paths: new Set(),
      };
      row.count += 1;
      row.paths.add(path);
      stringIndex.set(value, row);
    }
  }

  const strings = [...stringIndex.values()]
    .map((r) => ({
      string: r.string,
      source: r.source,
      count: r.count,
      examplePaths: [...r.paths].slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    studentsAnalyzed: samples.length,
    studentsWithForbiddenPattern,
    studentsWithParentVisibleLatin,
    breakdown: {
      fromChildNameInParentVisible: hitsFromChildNameInVisible,
      fromProfileLabelInParentVisible: hitsFromProfileInVisible,
      fromHebrewReportCopy: hitsFromReportCopy,
      fromMetadataEnumLeak: hitsFromMetadataLeak,
      fromForbiddenPatternRule: studentsWithForbiddenPattern,
    },
    strings,
    conclusion:
      studentsWithForbiddenPattern > 0 && hitsFromMetadataLeak > 0
        ? "Primary blocker is internal evidence enum (self_practice) leaking in subjects.byContentGrade — not parentFacing Hebrew copy."
        : hitsFromChildNameInVisible > 0 || hitsFromProfileInVisible > 0
          ? "English in parent-visible student.full_name from QA profile slugs."
          : hitsFromReportCopy > 0
            ? "English found in parentFacing Hebrew copy — requires product copy review."
            : "No parent-visible English issues detected.",
    recommendedCleanup: {
      issue: "self_practice in subjects.*.byContentGrade.*.evidenceSources survives stripInternalReportPayloadFields",
      recommendation:
        "stripInternalReportPayloadFields should remove internal evidenceSources before parent client response",
      blocksParentCopyGate: false,
      parentVisible: false,
    },
  };
}

export function scanParentVisibleText(payload) {
  const visible = collectParentVisibleStrings(payload);
  const joined = visible.map((v) => v.value).join("\n");
  const englishHits = [];
  const technicalHits = [];
  const hebrewIssues = [];

  for (const pat of FORBIDDEN_ENGLISH_PATTERNS) {
    if (pat.test(joined)) englishHits.push(String(pat));
  }
  for (const pat of FORBIDDEN_TECHNICAL_PATTERNS) {
    if (pat.test(joined)) technicalHits.push(String(pat));
  }
  for (const match of joined.matchAll(LATIN_TOKEN)) {
    const token = match[0];
    if (!englishHits.includes(token)) englishHits.push(token);
  }
  if (!/[\u0590-\u05FF]/.test(joined) && joined.trim().length > 8) {
    hebrewIssues.push("no_hebrew_detected");
  }
  return { englishHits, technicalHits, hebrewIssues, visiblePaths: visible.map((v) => v.path) };
}

export function buildEnglishAnalysisMarkdown(analysis) {
  const lines = [
    "# English Analysis — Mass Virtual Students",
    "",
    `Students analyzed: ${analysis.studentsAnalyzed}`,
    "",
    "## Breakdown",
    "",
    `1. Forbidden-pattern rule hits (full JSON scan): ${analysis.breakdown.fromForbiddenPatternRule}`,
    `2. Child name tokens in parent-visible text: ${analysis.breakdown.fromChildNameInParentVisible}`,
    `3. Profile slug tokens in parent-visible text: ${analysis.breakdown.fromProfileLabelInParentVisible}`,
    `4. Unknown Latin in parentFacing / name (report copy): ${analysis.breakdown.fromHebrewReportCopy}`,
    `5. Metadata enum leak (subjects.byContentGrade): ${analysis.breakdown.fromMetadataEnumLeak}`,
    "",
    `**Conclusion:** ${analysis.conclusion}`,
    "",
    "## Strings",
    "",
    "| String | Source | Count | Example paths |",
    "| ------ | ------ | ----- | ------------- |",
  ];
  for (const row of analysis.strings.slice(0, 40)) {
    lines.push(
      `| \`${row.string}\` | ${row.source} | ${row.count} | ${row.examplePaths.join("; ") || "—"} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}
