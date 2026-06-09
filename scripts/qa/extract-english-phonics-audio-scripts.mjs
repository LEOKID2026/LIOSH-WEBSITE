#!/usr/bin/env node
/**
 * Phase 4B Step 3 / 3A — English G1/G2 phonics audio script extraction (read-only QA).
 * Reads 23 draft markdown files and writes/validates the owner-review artifact.
 *
 * Run: node scripts/qa/extract-english-phonics-audio-scripts.mjs
 * Run: node scripts/qa/extract-english-phonics-audio-scripts.mjs --validate-only
 */
import fs from "node:fs";
import path from "node:path";
import { parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(
  ROOT,
  "docs/qa/_artifacts/english-phonics-audio-scripts"
);
const ARTIFACT_PATH = path.join(
  ARTIFACT_DIR,
  "ENGLISH_G1_G2_PHONICS_AUDIO_SCRIPT_REVIEW.md"
);

const G1_PHONICS = [
  "letters_upper",
  "letters_lower",
  "letters_match",
  "letter_names",
  "phonics_sounds",
  "phonics_first_sound",
  "classroom_words",
  "first_words_simple",
  "first_words_cvc",
  "picture_word_match",
  "listening_classroom",
  "listening_commands",
];

const G2_PHONICS = [
  "letters_review",
  "letters_order",
  "phonics_sounds_review",
  "phonics_blending",
  "sound_letter_match",
  "first_word_reading",
  "word_families_cvc",
  "classroom_vocab_g2",
  "listening_comprehension",
  "picture_audio_word_match",
  "early_sentences_exposure",
];

const SECTION_HEADINGS = {
  1: "מה לומדים?",
  2: "הסבר",
  3: "דוגמה",
  4: "בואו נפתור",
  5: "נסו בעצמכם",
  6: "שימו לב!",
  7: "בואו נתרגל!",
};

/** @type {Record<string, { primary: string, notes?: string }>} */
const PAGE_PROFILE = {
  letters_upper: { primary: "letter-name" },
  letters_lower: { primary: "letter-name" },
  letters_match: { primary: "letter-name" },
  letter_names: { primary: "letter-name" },
  phonics_sounds: { primary: "letter-sound" },
  phonics_first_sound: { primary: "word" },
  classroom_words: { primary: "word" },
  first_words_simple: { primary: "word" },
  first_words_cvc: { primary: "word", notes: "Slow blend clips in §2–§4" },
  picture_word_match: { primary: "word" },
  listening_classroom: { primary: "command" },
  listening_commands: { primary: "command" },
  letters_review: { primary: "letter-name" },
  letters_order: { primary: "letter-name" },
  phonics_sounds_review: { primary: "letter-sound" },
  phonics_blending: { primary: "word", notes: "Segmented + blended CVC" },
  sound_letter_match: { primary: "letter-sound" },
  first_word_reading: { primary: "word", notes: "Includes sight words the, I, a, is" },
  word_families_cvc: { primary: "word" },
  classroom_vocab_g2: { primary: "word" },
  listening_comprehension: { primary: "sentence" },
  picture_audio_word_match: { primary: "word" },
  early_sentences_exposure: { primary: "sentence" },
};

const ARTIFACT_STEP = "Phase 4B Step 3A";
const CYRILLIC_RE = /[\u0400-\u04FF]/;

/** Locked owner decisions — Step 3A */
const LOCKED_ACCENT = {
  label: "US English only (LOCKED)",
  z: "zee (not zed)",
  h: "aitch (not haitch)",
  vowels: "US vowel quality throughout — do not mix UK vowels",
};

/** Remaining risks after Step 3A cleanup (open items only). */
const REMAINING_RISKS = [
  {
    risk: "CVC blend pause length",
    detail: "`first_words_cvc`, `phonics_blending`, `word_families_cvc` — locked format `c … a … t → cat`; owner confirms pause timing at recording",
    action: "Approve timing in recording session",
  },
  {
    risk: "b/d and p/q confusables",
    detail: "`letters_lower`, `letters_review`, `phonics_sounds_review`",
    action: "Extra-clear consonant clips; no whispered audio",
  },
  {
    risk: "Hebrew narration phrasing",
    detail: "Long §4–§5 Hebrew scaffolding on some pages",
    action: "Read aloud before recording; shorten if TTS sounds unnatural",
  },
  {
    risk: "Word inventory scope",
    detail: "G1 CVC (6 words) vs G2 blends (8 words) vs families (-at/-an/-it/-og) — intentional progression",
    action: "Confirm full token list still matches curriculum intent before recording",
  },
];

/** Resolved in Step 3A — documented for audit trail. */
const RESOLVED_RISKS = [
  "Cyrillic typo in `letters_lower` §4 — fixed",
  "`mat` inventory drift in `phonics_blending` — removed; §3 uses `cat` from page word list only",
  "US accent policy — locked (zee, aitch, US vowels)",
  "Letter name vs sound — separate clip types; C letter name = see, C sound in cat = hard c/k",
  "Sight word I — child text uses `I — אני`; owner notes cover letter-name vs pronoun context",
  "Classroom commands — slow, clear, friendly tone (no quiz/harsh delivery)",
  "Sentence exposure — slow neutral delivery; no grammar quiz or translation",
];

/**
 * @param {string} body
 */
function stripMarkdownForSpeech(body) {
  return String(body || "")
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/u, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/`/g, "")
        .replace(/^[-*❌✓]\s*/u, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {string} text
 */
function detectLanguageMix(text) {
  const hasHebrew = /[\u0590-\u05FF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasHebrew && hasLatin) return "mixed";
  if (hasLatin) return "English";
  return "Hebrew";
}

/**
 * @param {string} body
 * @returns {string[]}
 */
function extractEnglishTokens(body) {
  const tokens = new Set();
  const boldRe = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = boldRe.exec(body)) !== null) {
    const t = m[1].trim();
    if (/[A-Za-z]/.test(t)) tokens.add(t);
  }
  const quotedRe = /"([^"]+)"/g;
  while ((m = quotedRe.exec(body)) !== null) {
    const t = m[1].trim();
    if (/[A-Za-z]/.test(t)) tokens.add(t);
  }
  return [...tokens];
}

/**
 * @param {string} pageId
 * @param {number} sectionNum
 * @param {string} body
 * @param {string} primaryType
 */
function classifyAudioType(pageId, sectionNum, body, primaryType) {
  if (sectionNum === 1 || sectionNum === 7) return "narration";
  if (sectionNum === 6) return "narration";

  const lower = body.toLowerCase();
  if (
    primaryType === "command" &&
    (sectionNum === 2 || sectionNum === 3) &&
    /stand up|sit down|open your|close your|point to|show me|listen\.|look\./i.test(body)
  ) {
    return "command";
  }
  if (primaryType === "sentence" && (sectionNum === 2 || sectionNum === 3)) {
    return "sentence";
  }
  if (
    primaryType === "letter-name" &&
    (sectionNum === 2 || sectionNum === 3 || sectionNum === 4) &&
    /[A-Z](?:\s+[A-Z])*/.test(body)
  ) {
    return sectionNum === 2 && body.includes("A B C") ? "narration" : "letter-name";
  }
  if (
    primaryType === "letter-sound" &&
    (sectionNum === 2 || sectionNum === 3 || sectionNum === 4)
  ) {
    return /צליל|sound|sss|mmm|bbb|ttt|fff|hhh/i.test(body) ? "letter-sound" : "narration";
  }
  if (
    (primaryType === "word" || pageId.includes("word") || pageId.includes("cvc")) &&
    (sectionNum === 2 || sectionNum === 3 || sectionNum === 4)
  ) {
    if (/…|\.\.\.|c \+ a \+ t|segmented|blend|חבר/i.test(body)) return "word";
    if (/\b(cat|dog|sun|pen|book|hat|sit|red|blue)\b/i.test(lower)) return "word";
    return "word";
  }
  return "narration";
}

/**
 * @param {string} body
 * @param {string} audioType
 */
function buildSpokenText(body, audioType) {
  const cleaned = stripMarkdownForSpeech(body);
  if (!cleaned) return "";

  if (audioType === "command") {
    const cmds = extractEnglishTokens(body).filter((t) => /[.!?]$/.test(t) || t.includes(" "));
    if (cmds.length) {
      return `[Hebrew intro from narration] ${cmds.map((c) => `«${c}»`).join(" · ")} [Slow, clear, friendly — not quiz-like]`;
    }
  }
  if (audioType === "letter-name" && /[A-Z]/.test(body)) {
    return `${cleaned} [Pause between letter-name clips where letters appear in bold.]`;
  }
  if (audioType === "letter-sound") {
    return `${cleaned} [Isolate each consonant/vowel sound with a short pause.]`;
  }
  if (audioType === "word" && /…|\.\.\.|→|\+/u.test(body)) {
    return `${cleaned} [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat]`;
  }
  if (audioType === "sentence") {
    return `${cleaned} [Exposure only: slow, neutral tone — not grammar quiz or translation]`;
  }
  return cleaned;
}

/**
 * @param {string} grade
 * @param {string} pageId
 */
function loadPhonicsPage(grade, pageId) {
  const filePath = path.join(
    ROOT,
    `docs/learning-book/english/${grade}/drafts/${pageId}.md`
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing draft: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return parseLearningPageMarkdown(raw, pageId);
}

/**
 * @param {string} grade
 * @param {string[]} pageIds
 */
function extractPages(grade, pageIds) {
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  /** @type {Map<string, { token: string, pages: Set<string>, kinds: Set<string>, note: string }>} */
  const tokenIndex = new Map();

  for (const pageId of pageIds) {
    const page = loadPhonicsPage(grade, pageId);
    const profile = PAGE_PROFILE[pageId] || { primary: "narration" };

    for (const section of page.sections) {
      const audioType = classifyAudioType(
        pageId,
        section.number,
        section.body,
        profile.primary
      );
      const spoken = buildSpokenText(section.body, audioType);
      const lang = detectLanguageMix(section.body);
      const sectionPad = String(section.number).padStart(2, "0");

      /** @type {string[]} */
      const notes = [];
      if (profile.notes && (section.number === 2 || section.number === 3)) {
        notes.push(profile.notes);
      }
      if (pageId === "first_word_reading" && /(^|\s)I(\s|$)/.test(section.body)) {
        notes.push(
          "Owner: uppercase I = letter name and pronoun in sentence context; child text: I — אני"
        );
      }
      if (pageId === "early_sentences_exposure" && section.number === 2) {
        notes.push("Exposure only — I see a cat / It is red: slow, neutral, no grammar quiz");
      }
      if (
        (pageId === "listening_classroom" || pageId === "listening_commands") &&
        (section.number === 2 || section.number === 3)
      ) {
        notes.push("Commands: slow, clear, friendly — not quiz-like or harsh");
      }
      if (
        (pageId === "letter_names" || pageId === "phonics_sounds" || pageId === "phonics_first_sound") &&
        section.number >= 2 &&
        section.number <= 4
      ) {
        notes.push("Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound)");
      }
      if (
        (pageId === "first_words_cvc" ||
          pageId === "phonics_blending" ||
          pageId === "word_families_cvc") &&
        (section.number === 2 || section.number === 3 || section.number === 4)
      ) {
        notes.push("Blend format locked: c … a … t → cat — short clear pauses");
      }
      if (lang === "mixed") notes.push("Hebrew narration + embedded English clips");
      if (section.number === 5) notes.push("Self-check — optional shorter narration");
      if (section.number === 6 && /❌|✓/.test(section.body)) {
        notes.push("Contrast pairs — keep calm, not punitive tone");
      }

      rows.push({
        grade,
        pageId,
        titleHe: page.metadata.title_hebrew || page.displayTitle,
        section: sectionPad,
        heading: section.title || SECTION_HEADINGS[section.number],
        spokenText: spoken,
        languageMix: lang,
        audioType,
        notes: notes.join("; ") || "—",
        manifestKey: `english:${grade}:${pageId}:section:${sectionPad}`,
      });

      for (const token of extractEnglishTokens(section.body)) {
        const key = token.toLowerCase().replace(/\s+/g, " ").trim();
        if (!tokenIndex.has(key)) {
          tokenIndex.set(key, {
            token,
            pages: new Set(),
            kinds: new Set(),
            note: guessPronunciationNote(token, profile.primary, pageId),
          });
        }
        const entry = tokenIndex.get(key);
        entry.pages.add(`${grade}/${pageId}`);
        entry.kinds.add(classifyTokenKind(token, profile.primary, pageId));
      }
    }
  }

  return { rows, tokenIndex };
}

/**
 * @param {string} token
 * @param {string} pagePrimary
 */
function classifyTokenKind(token, pagePrimary, pageId) {
  if (/^(Stand up|Sit down|Open your|Close your|Point to|Show me|Listen|Look)/i.test(token)) {
    return "command";
  }
  if (token.trim() === "C" && (pageId === "letter_names" || pagePrimary === "letter-name")) {
    return "letter name";
  }
  if (token.trim() === "c" && pagePrimary === "letter-sound") {
    return "letter sound";
  }
  if (/^[A-Z]$/.test(token.trim())) return "letter name";
  if (/^[a-z]$/.test(token.trim())) return "letter sound";
  if (/[.!?]$/.test(token.trim()) && token.split(/\s+/).length >= 3) return "sentence";
  if (pagePrimary === "letter-sound" && token.length <= 3) return "letter sound";
  if (token.trim() === "I") return "word";
  return "word";
}

/**
 * @param {string} token
 * @param {string} pagePrimary
 * @param {string} pageId
 */
function guessPronunciationNote(token, pagePrimary, pageId) {
  if (token.trim() === "Z") return `US letter name locked: ${LOCKED_ACCENT.z}`;
  if (token.trim() === "H") return `US letter name locked: ${LOCKED_ACCENT.h}`;
  if (token.trim() === "C" && (pageId === "letter_names" || pagePrimary === "letter-name")) {
    return 'US letter name locked: "see" — not the hard c/k sound in cat';
  }
  if (token.trim() === "c" && pagePrimary === "letter-sound") {
    return "Hard c/k sound as in cat — separate clip from letter name see";
  }
  if (token.trim() === "I") {
    return "Uppercase I: letter name and pronoun (אני) in sentence context — child text: I — אני";
  }
  if (/^[A-Z]$/.test(token)) return `US letter name (${token}) — ${LOCKED_ACCENT.label}`;
  if (/^[a-z]$/.test(token)) return "Short consonant/vowel sound as in example word on page (US accent)";
  if (/^(Stand up|Sit down|Open your book|Close your book)/i.test(token)) {
    return "Classroom command — slow, clear, friendly imperative";
  }
  if (/^(Point to|Show me)/i.test(token)) return "Short instruction — slow, clear, friendly tone";
  if (/[.!?]$/.test(token) && token.split(/\s+/).length >= 3) {
    return "Exposure sentence — slow, neutral tone; not grammar quiz or translation";
  }
  if (pagePrimary === "letter-sound") return "Isolated phoneme or example word stem (US accent)";
  return "Speak as whole English word; child-friendly pace (US accent)";
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function renderPageTables(rows) {
  /** @type {string[]} */
  const parts = [];
  const byPage = new Map();
  for (const row of rows) {
    const key = `${row.grade}:${row.pageId}`;
    if (!byPage.has(key)) byPage.set(key, []);
    byPage.get(key).push(row);
  }

  for (const [key, pageRows] of byPage) {
    const first = pageRows[0];
    parts.push(`### ${first.grade.toUpperCase()} · \`${first.pageId}\` · ${first.titleHe}`);
    parts.push("");
    parts.push(
      "| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |"
    );
    parts.push("|-----|---------|----------------------|------|------------|-------------|---------------------|");
    for (const r of pageRows) {
      const spoken = String(r.spokenText).replace(/\|/g, "\\|").slice(0, 220);
      parts.push(
        `| ${r.section} | ${r.heading} | ${spoken} | ${r.languageMix} | ${r.audioType} | ${r.notes} | \`${r.manifestKey}\` |`
      );
    }
    parts.push("");
  }
  return parts.join("\n");
}

/**
 * @param {Map<string, { token: string, pages: Set<string>, kinds: Set<string>, note: string }>} tokenIndex
 */
function renderPronunciationList(tokenIndex) {
  const sorted = [...tokenIndex.values()].sort((a, b) =>
    a.token.localeCompare(b.token, "en")
  );
  /** @type {string[]} */
  const lines = [
    "| Token | Page(s) | Kind | Proposed pronunciation note |",
    "|-------|---------|------|---------------------------|",
  ];
  for (const entry of sorted) {
    const kind = [...entry.kinds].sort().join(", ");
    const pages = [...entry.pages].sort().join("; ");
    lines.push(
      `| ${entry.token.replace(/\|/g, "\\|")} | ${pages} | ${kind} | ${entry.note} |`
    );
  }
  return lines.join("\n");
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function buildMarkdown(g1Rows, g2Rows, tokenIndex) {
  const allRows = [...g1Rows, ...g2Rows];
  const today = new Date().toISOString().slice(0, 10);

  return `# English G1/G2 Phonics — Audio Script Review (${ARTIFACT_STEP})

> **Status:** Owner-review artifact · Step 3A cleanup + decision lock · Generated ${today}  
> **Generator:** \`node scripts/qa/extract-english-phonics-audio-scripts.mjs\`  
> **Baseline registry:** Phase 4B Step 2 complete (registry + skill index + sequence meta)

---

## 1. Baseline

| Item | Value |
|------|-------|
| G1 phonics pages | **12** |
| G2 phonics-review pages | **11** |
| Total phonics pages | **23** |
| Sections per page | **7** (§01–§07) |
| G1 section audio slots (future) | **84** (12 × 7) |
| G2 section audio slots (future) | **77** (11 × 7) |
| **Total section audio slots** | **161** |
| Slots represented in this artifact | **${allRows.length}** |
| Audio files generated | **None** |
| Manifest entries added | **None** |
| Step 3A draft fixes | \`letters_lower\` typo fixed; \`phonics_blending\` mat removed |

Future manifest key pattern (not created yet): \`english:{grade}:{pageId}:section:{NN}\`  
Future public path pattern: \`/audio/learning-books/english/{grade}/{pageId}/section-{NN}.mp3\`

---

## 2. Locked owner decisions (Step 3A)

### 2.1 Accent — **LOCKED: US English only**

| Decision | Locked value |
|----------|--------------|
| Accent | **US English only** — no UK clips anywhere in G1/G2 phonics |
| Letter Z | **zee** (not zed) |
| Letter H | **aitch** (not haitch) |
| Vowels | **US vowel quality** throughout (e.g. cat, hot, run) — do not mix US/UK |
| Pace | Child-directed, slow, clear |
| Hebrew narration | Natural, simple Hebrew for section framing |
| English tokens | Spoken in English — not transliterated into Hebrew in recordings |

### 2.2 Letter name vs letter sound — **separate clip types**

| Rule | Detail |
|------|--------|
| Letter names | Spoken as alphabet names (A, B, C…) in \`letter-name\` clips only |
| Letter sounds | Spoken as isolated phoneme sounds in \`letter-sound\` clips only |
| **C letter name** | **"see"** — US letter name |
| **C in cat** | Hard **c/k** sound — not "see" |
| Child-facing text | No IPA symbols; owner-review notes may describe sounds in plain English |
| Do not blur | Narration must not mix name clips and sound clips in one undifferentiated take |

### 2.3 CVC blending pacing — **locked format**

| Rule | Detail |
|------|--------|
| Format | \`c … a … t → cat\` (slow segmented sounds, short clear pauses, then whole word) |
| Pages | \`first_words_cvc\`, \`phonics_blending\`, \`word_families_cvc\` |
| Child-facing text | No phonetic notation beyond dots and arrow |
| Recording | Owner confirms pause length at session — format is locked |

### 2.4 Sight word **I**

| Context | Rule |
|---------|------|
| Child-facing text | **I — אני** (simple) |
| Owner note | Uppercase **I** is both the letter name and the pronoun in sentence context (\`I see a cat.\`) |
| Recording | Same US pronunciation; context (word list vs sentence) makes meaning clear |

### 2.5 Classroom commands — **friendly delivery**

| Rule | Detail |
|------|--------|
| Pages | \`listening_classroom\`, \`listening_commands\` |
| Tone | Slow, clear, **friendly** — not quiz-like or harsh |
| Examples | Stand up. · Sit down. · Open your book. · Point to the door. |

### 2.6 Sentence exposure — **exposure only**

| Rule | Detail |
|------|--------|
| Pages | \`early_sentences_exposure\`, \`listening_comprehension\` |
| Examples | I see a cat. · It is red. |
| Delivery | Slow, neutral — **not** grammar quiz or translation drill |
| Purpose | Hear, repeat, match picture — no rule testing |

---

## 3. Per-page script tables

Each row is one future book-section audio slot. **Proposed spoken text** is derived from draft §1–§7 body copy (markdown stripped). Owner may edit phrasing before recording; locked decisions in §2 are canonical.

${renderPageTables(allRows)}

---

## 4. Consolidated English pronunciation list

All English tokens extracted from draft §1–§7 (bold and quoted). Pronunciation notes reflect **locked US accent** and **separate name/sound rules**.

${renderPronunciationList(tokenIndex)}

---

## 5. Remaining owner-review risks (post–Step 3A)

| Risk | Detail | Action |
|------|--------|--------|
${REMAINING_RISKS.map((r) => `| ${r.risk} | ${r.detail} | ${r.action} |`).join("\n")}

### Resolved in Step 3A

${RESOLVED_RISKS.map((r) => `- ${r}`).join("\n")}

---

## 6. No-product-change guarantee

This artifact is **approval documentation only**. It does **not**:

- Generate audio or MP3 files
- Add or edit entries in \`learning-book-audio-manifest.js\`
- Change book runtime, catalog, registry, or page rendering
- Enable audio playback in the learning book UI
- Modify English question banks, generator, or curriculum
- Update launch-readiness registry or parent-report logic
- Change diagnostic flags or SQL

Recording and manifest wiring remain **post–Step 3A / post-recording approval** work.

---

## Appendix — slot coverage summary

| Grade | Pages | Sections | Slots |
|-------|-------|----------|-------|
| G1 | 12 | 7 | 84 |
| G2 | 11 | 7 | 77 |
| **Total** | **23** | — | **161** |

Validation: \`node scripts/qa/extract-english-phonics-audio-scripts.mjs --validate-only\`
`;
}

function validateDrafts(pageIdsByGrade) {
  /** @type {string[]} */
  const errors = [];
  for (const [grade, pageIds] of Object.entries(pageIdsByGrade)) {
    for (const pageId of pageIds) {
      const filePath = path.join(
        ROOT,
        `docs/learning-book/english/${grade}/drafts/${pageId}.md`
      );
      const raw = fs.readFileSync(filePath, "utf8");
      if (CYRILLIC_RE.test(raw)) {
        errors.push(`${grade}/${pageId}: contains Cyrillic characters (typo check failed)`);
      }
      if (pageId === "phonics_blending" && /\bmat\b/i.test(raw)) {
        errors.push(`${grade}/${pageId}: mat must not appear after Step 3A cleanup`);
      }
    }
  }
  return errors;
}

function validateArtifact(rows) {
  const errors = [];
  if (rows.length !== 161) {
    errors.push(`Expected 161 section rows, got ${rows.length}`);
  }
  const keys = new Set(rows.map((r) => r.manifestKey));
  if (keys.size !== 161) {
    errors.push(`Duplicate manifest keys: expected 161 unique, got ${keys.size}`);
  }
  for (const row of rows) {
    if (!row.spokenText) errors.push(`Empty spoken text: ${row.manifestKey}`);
    if (!row.audioType) errors.push(`Missing audio type: ${row.manifestKey}`);
  }
  return errors;
}

function validateArtifactFile(md) {
  /** @type {string[]} */
  const errors = [];
  const slotMatch = md.match(/Slots represented in this artifact \| \*\*(\d+)\*\*/);
  const slots = slotMatch ? Number(slotMatch[1]) : 0;
  if (slots !== 161) {
    errors.push(`Artifact reports ${slots} slots, expected 161`);
  }
  if (!md.includes("LOCKED: US English only")) {
    errors.push("Artifact missing locked US accent policy");
  }
  if (!md.includes("C letter name") || !md.includes('"see"')) {
    errors.push("Artifact missing locked C letter-name rule");
  }
  if (!md.includes("c … a … t → cat")) {
    errors.push("Artifact missing locked CVC blend format");
  }
  if (md.includes("mat (mentioned, not listed)")) {
    errors.push("Artifact still references unresolved mat risk");
  }
  if (CYRILLIC_RE.test(md)) {
    errors.push("Artifact contains Cyrillic text");
  }
  return errors;
}

function main() {
  const validateOnly = process.argv.includes("--validate-only");

  /** @type {string[]} */
  const errors = [];

  const g1 = extractPages("g1", G1_PHONICS);
  const g2 = extractPages("g2", G2_PHONICS);
  const allRows = [...g1.rows, ...g2.rows];

  errors.push(
    ...validateDrafts({ g1: G1_PHONICS, g2: G2_PHONICS }),
    ...validateArtifact(allRows)
  );
  if (errors.length) {
    console.error("extract-english-phonics-audio-scripts: validation failed");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  if (validateOnly) {
    if (!fs.existsSync(ARTIFACT_PATH)) {
      console.error(`Missing artifact: ${ARTIFACT_PATH}`);
      process.exit(1);
    }
    const md = fs.readFileSync(ARTIFACT_PATH, "utf8");
    const fileErrors = validateArtifactFile(md);
    if (fileErrors.length) {
      console.error("extract-english-phonics-audio-scripts: artifact validation failed");
      for (const e of fileErrors) console.error(`  - ${e}`);
      process.exit(1);
    }
    console.log("validate-only: artifact present, 161 slots + Step 3A locks confirmed");
    process.exit(0);
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const mergedTokens = new Map([...g1.tokenIndex, ...g2.tokenIndex]);
  for (const [k, v] of g2.tokenIndex) {
    if (mergedTokens.has(k)) {
      const existing = mergedTokens.get(k);
      for (const p of v.pages) existing.pages.add(p);
      for (const kind of v.kinds) existing.kinds.add(kind);
    } else {
      mergedTokens.set(k, v);
    }
  }

  const md = buildMarkdown(g1.rows, g2.rows, mergedTokens);
  fs.writeFileSync(ARTIFACT_PATH, md, "utf8");

  console.log(`Wrote ${ARTIFACT_PATH}`);
  console.log(`  pages: 23 (G1 ${G1_PHONICS.length}, G2 ${G2_PHONICS.length})`);
  console.log(`  section slots: ${allRows.length}`);
  console.log(`  pronunciation tokens: ${mergedTokens.size}`);
}

main();
