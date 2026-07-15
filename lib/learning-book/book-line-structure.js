/**
 * Structural label/body split for mixed Hebrew + math book lines (renderer only).
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";

const HEBREW = /[\u0590-\u05FF]/;

/** Known RTL label prefixes before a colon (child-facing book copy). */
const KNOWN_LABEL_PREFIX =
  /^(?:שאלה|שלב\s*\d+|תשובה|דוגמה|רמז|זכרו|טיפ|קל\s*לטעות|משמעות|נוסחה|בשיעור|עשרות|אחדות|סה״כ|סה"כ|מפרקים|מחברים|היה|הוציא|נשאר|מה\s+(?:יודעים|מבקשים|עושים)|חשבו|בדקו|ספרו|מצאו)\s*:/u;

const STRUCTURAL_BOLD_LABEL =
  /^(\*\*(?:שאלה|שלב\s*\d+|תשובה|דוגמה|רמז|זכרו|טיפ|קל\s*לטעות|משמעות|נוסחה)[^*\n]*:\*\*)\s+(.*)$/su;

/**
 * @param {string} label
 */
function normalizeLabel(label) {
  return stripStrayMarkdown(String(label || "")).replace(/\s+/g, " ").trim();
}

/**
 * @param {string} label
 */
function isPlausibleDisplayLabel(label) {
  const plain = normalizeLabel(label);
  if (!plain.endsWith(":")) return false;
  if (/^שלב\s*\d+\s*:/u.test(plain)) return true;
  if (/[=+−×÷]/.test(plain.replace(/שלב\s*\d+\s*:/u, ""))) return false;
  // Clock times / ratios (שיעור 2:, 1:25) — not structural RTL labels.
  if (/\d\s*:\s*$/.test(plain)) return false;
  return true;
}

/**
 * Split a book line into an RTL label and a body when the pattern is unambiguous.
 * Uses the **first** colon only — never a later colon inside math clauses.
 * @param {string} line
 * @returns {{ label: string, body: string }|null}
 */
export function parseBookLineStructure(line) {
  const input = String(line || "").trim();
  if (!input) return null;

  const marker = input.match(/^([❌✓])\s+([\s\S]+)$/);
  if (marker?.[2]?.trim()) {
    return { label: marker[1], body: marker[2].trim() };
  }

  const boldLabel = input.match(/^(\*\*[^*\n]+:\*\*)\s+([\s\S]+)$/);
  if (boldLabel?.[2]?.trim()) {
    return {
      label: normalizeLabel(boldLabel[1]),
      body: boldLabel[2].trim(),
    };
  }

  const colonIndex = input.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 72) {
    const rawLabel = input.slice(0, colonIndex + 1);
    const body = input.slice(colonIndex + 1).trim();
    const beforeColon = input[colonIndex - 1] || "";
    const afterColon = input[colonIndex + 1] || "";
    const hebrewRatioColon =
      /[\u0590-\u05FF]/.test(beforeColon) && /[\u0590-\u05FF]/.test(afterColon);
    if (body && isPlausibleDisplayLabel(rawLabel)) {
      const label = normalizeLabel(rawLabel);
      const labelLooksKnown =
        KNOWN_LABEL_PREFIX.test(label) || KNOWN_LABEL_PREFIX.test(input);
      const bodyHasMath =
        (/\d/.test(body) && /[+−\-=×÷?_≈]/.test(body)) ||
        /[π°²³√≈]/.test(body);
      if (labelLooksKnown || (HEBREW.test(label) && bodyHasMath && !hebrewRatioColon)) {
        return { label, body };
      }
    }
  }

  return null;
}

/**
 * Strip top-level structural labels before math scanning (never mid-line colons).
 * @param {string} text
 * @returns {{ scanText: string, label: string|null }}
 */
export function stripBookLineLabelForMathScan(text) {
  const input = String(text || "").trim();
  if (!input) return { scanText: input, label: null };

  const marker = input.match(/^([❌✓])\s+(.*)$/s);
  if (marker?.[2]?.trim()) {
    return { scanText: marker[2].trim(), label: marker[1] };
  }

  const boldStructural = input.match(STRUCTURAL_BOLD_LABEL);
  if (boldStructural?.[2]?.trim()) {
    return {
      scanText: boldStructural[2].trim(),
      label: normalizeLabel(boldStructural[1]),
    };
  }

  return { scanText: input, label: null };
}

/**
 * Split a body into clauses at ". " boundaries before Hebrew sub-labels.
 * @param {string} body
 * @returns {string[]}
 */
export function splitMixedBodyClauses(body) {
  const input = String(body || "").trim();
  if (!input) return [];

  const parts = input
    .split(/(?<=\.)\s+(?=[\u0590-\u05FF*❌✓])/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length ? parts : [input];
}

/**
 * True when a digit starts a step label like "שלב 4:" - not a math expression.
 * @param {string} stripped markdown-stripped text
 * @param {number} index digit index in stripped
 */
export function isStepLabelDigit(stripped, index) {
  const before = stripped.slice(0, index);
  return /(?:^|\s)שלב\s*$/u.test(before);
}
