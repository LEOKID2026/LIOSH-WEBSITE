#!/usr/bin/env node
/**
 * Full Leo Lab experiment mapping — read-only audit.
 * Run: node tmp/leo-lab-experiment-full-map.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPERIMENTS_BY_DIFFICULTY,
  LAB_ITEMS,
  SHELF_BY_DIFFICULTY,
} from "../components/educational-games/leo-lab/leo-lab-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_MD = path.join(__dirname, "leo-lab-experiment-mapping.md");
const OUT_CSV = path.join(__dirname, "leo-lab-experiment-mapping.csv");

/** @type {Record<string, string>} */
const LEVEL_HE = { easy: "קל", medium: "בינוני", hard: "קשה" };

/** @type {Record<string, string>} */
const GRADE_BAND = {
  easy: "א׳–ב׳",
  medium: "ג׳–ד׳",
  hard: "ה׳–ו׳",
};

/** Keywords that hint at shelf items (Hebrew + emoji concepts) */
const ITEM_HINT_TERMS = {
  water: ["מים", "השק", "שתי", "רטיב", "להשק", "שקי"],
  sun: ["שמש", "אור", "חם", "חום"],
  plant: ["צמח", "גדל", "שורש", "עלה"],
  magnet: ["מגנט", "מושך", "נמש"],
  nail: ["מסמר", "מתכת"],
  metal_spoon: ["כפית", "מתכת"],
  can: ["פחית", "פח", "מתכת"],
  wood: ["עץ", "עצ"],
  soil: ["אדמה", "אדמ"],
  ice: ["קרח", "קפוא"],
  bowl: ["קערה", "קער"],
  battery: ["סוללה", "חשמל"],
  bulb: ["נורה", "אור"],
  wire: ["חוט", "חוט"],
  switch: ["מתג"],
  stone: ["אבן"],
  paint_red: ["אדום", "כתום", "סגול"],
  paint_yellow: ["צהוב", "כתום", "ירוק"],
  paint_blue: ["כחול", "ירוק", "סגול"],
};

/** Title words that often ARE the answer (bad if in title) */
const ANSWER_WORDS_IN_TITLE = [
  "מים",
  "שמש",
  "מגנט",
  "צמח",
  "אדמה",
  "קרח",
  "אור",
  "מתכת",
  "צבע",
  "כתום",
  "ירוק",
  "סגול",
  "אדום",
  "צהוב",
  "כחול",
];

/** @param {string} icon */
function iconItemIds(icon) {
  if (!icon) return [];
  return Object.values(LAB_ITEMS)
    .filter((item) => icon.includes(item.icon))
    .map((item) => item.id);
}

/** @param {string} text @param {string[]} itemIds */
function textMentionsItems(text, itemIds) {
  const t = (text || "").toLowerCase();
  for (const id of itemIds) {
    const name = LAB_ITEMS[id]?.name;
    if (name && t.includes(name)) return true;
    for (const kw of ITEM_HINT_TERMS[id] || []) {
      if (t.includes(kw)) return true;
    }
  }
  return false;
}

/** @param {string} text @param {string[]} validIds */
function textHintsValidItems(text, validIds) {
  return textMentionsItems(text, validIds);
}

/** @param {import('../components/educational-games/leo-lab/leo-lab-data.js').LabExperiment} exp */
function analyzeExperiment(exp) {
  const diff = exp.difficulty;
  const shelfIds = SHELF_BY_DIFFICULTY[diff] || [];
  const shelfNames = shelfIds.map((id) => LAB_ITEMS[id]?.name).filter(Boolean);
  const validIds = exp.validItems;
  const validNames = validIds.map((id) => LAB_ITEMS[id]?.name).filter(Boolean);
  const distractorIds = shelfIds.filter((id) => !validIds.includes(id));
  const distractorNames = distractorIds.map((id) => LAB_ITEMS[id]?.name).filter(Boolean);

  const answerMode = exp.exactMatch
    ? `exactMatch (${exp.pickCount} חובה)`
    : `validItems רחב (${validIds.length} מותרים, בוחרים ${exp.pickCount})`;

  const hintUi = `🧾 בחרו ${exp.pickCount} חפצים`;

  const titleHints = textHintsValidItems(exp.title, validIds) ||
    ANSWER_WORDS_IN_TITLE.some((w) => exp.title.includes(w) &&
      validIds.some((id) => (ITEM_HINT_TERMS[id] || []).some((k) => w.includes(k) || k.includes(w))));

  const iconIdsFromMission = iconItemIds(exp.missionIcon ?? "");
  const iconHints =
    iconIdsFromMission.some((id) => validIds.includes(id)) ||
    textHintsValidItems(exp.missionIcon ?? "", validIds);

  const promptHints = textHintsValidItems(exp.prompt, validIds);

  // Shelf items that could plausibly answer but aren't accepted
  /** @type {string[]} */
  let altCorrectOnShelf = [];
  for (const sid of distractorIds) {
    if (textMentionsItems(`${exp.prompt} ${exp.title}`, [sid])) {
      altCorrectOnShelf.push(LAB_ITEMS[sid]?.name || sid);
    }
  }

  // Answers fit question heuristic
  let answersFit = "כן";
  /** @type {string[]} */
  const fitNotes = [];

  if (exp.prompt.includes("השק") || exp.title.includes("השק")) {
    if (validIds.includes("soil") && !exp.prompt.includes("גדל") && !exp.prompt.includes("צמח")) {
      answersFit = "לא";
      fitNotes.push("השקייה≠אדמה");
    }
    if (validIds.includes("water") && exp.title.includes("מים")) {
      answersFit = "לא";
      fitNotes.push("כותרת+מים+תשובת מים");
    }
  }

  if (exp.prompt.includes("קרח") && !shelfIds.includes("ice") && validIds.every((id) => id !== "ice")) {
    fitNotes.push("שואל על קרח אבל אין קרח במדף");
    if (answersFit === "כן") answersFit = "חלקית";
  }

  if (exp.title.includes("מים") && validIds.includes("water")) {
    answersFit = "לא";
    fitNotes.push("כותרת מזכירה מים ומים בתשובה");
  }

  if (exp.title.includes("שמש") && validIds.includes("sun")) {
    answersFit = "לא";
    fitNotes.push("כותרת מזכירה שמש ושמש בתשובה");
  }

  if (promptHints && validIds.length <= 2 && exp.exactMatch) {
    fitNotes.push("שאלה מכוונת לחפצים");
  }

  if (titleHints || iconHints || promptHints) {
    if (answersFit === "כן") answersFit = "חלקית";
  }

  // Age fit
  let ageFit = "כן";
  const ageNotes = [];
  const electric = ["battery", "bulb", "wire", "switch"];
  if (diff === "easy" && validIds.some((id) => electric.includes(id))) {
    ageFit = "לא";
    ageNotes.push("חשמל ברמת קל");
  }
  if (diff === "easy" && exp.prompt.length > 55) {
    ageFit = "חלקית";
    ageNotes.push("ניסוח ארוך לקטנים");
  }

  /** @type {string[]} */
  const actions = [];
  if (titleHints) actions.push("לשנות כותרת");
  if (iconHints) actions.push("לשנות אייקון");
  if (promptHints) actions.push("לשנות ניסוח");
  if (answersFit === "לא" || answersFit === "חלקית") actions.push("לשנות תשובות");
  if (altCorrectOnShelf.length) actions.push("לבדוק תשובות חלופיות");
  if (ageFit === "לא") actions.push("להעביר רמה");
  if (!actions.length) actions.push("להשאיר");
  else if (actions.length > 2) actions.unshift("לשנות ניסוח");

  const action = [...new Set(actions)].join(" + ");

  return {
    level: LEVEL_HE[diff] || diff,
    grade: GRADE_BAND[diff] || "",
    id: exp.id,
    title: exp.title,
    icon: exp.missionIcon ?? "🦁👨‍🔬",
    prompt: exp.prompt,
    hint: hintUi,
    fact: exp.fact || "",
    pickCount: exp.pickCount,
    correctAnswers: validNames.join(" + "),
    answerMode,
    shelf: shelfNames.join(", "),
    distractors: distractorNames.join(", "),
    titleHints: titleHints ? "כן" : "לא",
    iconHints: iconHints ? "כן" : "לא",
    promptHints: promptHints ? "כן" : "לא",
    answersFit: fitNotes.length ? `${answersFit} (${fitNotes.join("; ")})` : answersFit,
    altCorrect: altCorrectOnShelf.length ? `כן (${altCorrectOnShelf.join(", ")})` : "לא",
    ageFit: ageNotes.length ? `${ageFit} (${ageNotes.join("; ")})` : ageFit,
    action,
    flags: [titleHints, iconHints, promptHints, answersFit !== "כן", altCorrectOnShelf.length > 0, ageFit !== "כן"].filter(Boolean).length,
  };
}

/** @type {ReturnType<typeof analyzeExperiment>[]} */
const rows = [];
for (const [diff, list] of Object.entries(EXPERIMENTS_BY_DIFFICULTY)) {
  for (const exp of list) {
    rows.push(analyzeExperiment(exp));
  }
}

rows.sort((a, b) => {
  const order = { קל: 0, בינוני: 1, קשה: 2 };
  return (order[a.level] ?? 9) - (order[b.level] ?? 9) || a.id.localeCompare(b.id);
});

const cols = [
  ["level", "רמה"],
  ["grade", "גיל"],
  ["id", "ID"],
  ["title", "כותרת"],
  ["icon", "אייקון"],
  ["prompt", "שאלה"],
  ["hint", "רמז UI"],
  ["pickCount", "כמה לבחור"],
  ["correctAnswers", "תשובות נכונות"],
  ["answerMode", "מצב תשובה"],
  ["shelf", "מדף"],
  ["distractors", "מסיחים"],
  ["titleHints", "כותרת מרמזת"],
  ["iconHints", "אייקון מרמז"],
  ["promptHints", "שאלה מרמזת"],
  ["answersFit", "תשובות מתאימות"],
  ["altCorrect", "תשובה נוספת על המדף"],
  ["ageFit", "מתאים לגיל"],
  ["action", "פעולה מומלצת"],
];

function escCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const csvLines = [
  cols.map(([, h]) => h).join(","),
  ...rows.map((r) => cols.map(([k]) => escCsv(r[k])).join(",")),
];
fs.writeFileSync(OUT_CSV, `\uFEFF${csvLines.join("\n")}`, "utf8");

const byLevel = {
  קל: rows.filter((r) => r.level === "קל"),
  בינוני: rows.filter((r) => r.level === "בינוני"),
  קשה: rows.filter((r) => r.level === "קשה"),
};

function mdRow(r) {
  return `| ${[
    r.level,
    r.id,
    r.title.replace(/\|/g, "\\|"),
    r.icon,
    r.prompt.replace(/\|/g, "\\|").slice(0, 80),
    r.pickCount,
    r.correctAnswers.replace(/\|/g, "\\|"),
    r.answerMode.replace(/\|/g, "\\|"),
    r.titleHints,
    r.iconHints,
    r.promptHints,
    r.answersFit.replace(/\|/g, "\\|"),
    r.altCorrect.replace(/\|/g, "\\|"),
    r.ageFit.replace(/\|/g, "\\|"),
    r.action.replace(/\|/g, "\\|"),
  ].join(" | ")} |`;
}

const flagged = rows.filter((r) => r.flags >= 2).sort((a, b) => b.flags - a.flags);

let md = `# מיפוי מלא — מעבדת הניסויים (Leo Lab)

**תאריך:** ${new Date().toISOString().slice(0, 10)}  
**סה״כ ניסויים:** ${rows.length}  
**קל:** ${byLevel.קל.length} | **בינוני:** ${byLevel.בינוני.length} | **קשה:** ${byLevel.קשה.length}

> דוח מיפוי בלבד — **ללא תיקון תוכן**.  
> CSV מלא: \`tmp/leo-lab-experiment-mapping.csv\`

## מה הילד רואה בכל ניסוי

| שדה UI | מקור בקוד |
|--------|-----------|
| כותרת | \`experiment.title\` → customerName |
| אייקון | \`experiment.missionIcon\` → customerAvatar |
| שאלה | \`experiment.prompt\` → missionText |
| רמז | \`🧾 בחרו N חפצים\` (קבוע) |
| משוב | \`fact\` — רק אחרי בדיקה |

## סיכום בעיות (heuristic)

| מדד | כמות |
|-----|------|
| כותרת מרמזת | ${rows.filter((r) => r.titleHints === "כן").length} |
| אייקון מרמזת | ${rows.filter((r) => r.iconHints === "כן").length} |
| שאלה מרמזת | ${rows.filter((r) => r.promptHints === "כן").length} |
| תשובות לא מתאימות / חלקית | ${rows.filter((r) => r.answersFit !== "כן").length} |
| תשובה חלופית אפשרית על המדף | ${rows.filter((r) => r.altCorrect.startsWith("כן")).length} |
| לא מתאים לגיל | ${rows.filter((r) => r.ageFit.startsWith("לא")).length} |
| ≥2 דגלים אדומים | ${flagged.length} |

## ניסויים בעייתיים במיוחד (≥2 דגלים)

| רמה | ID | כותרת | אייקון | שאלה | תשובות | בעיות | פעולה |
|-----|-----|--------|--------|------|--------|-------|-------|
`;

for (const r of flagged.slice(0, 40)) {
  md += `| ${r.level} | ${r.id} | ${r.title} | ${r.icon} | ${r.prompt.slice(0, 60)}… | ${r.correctAnswers} | כ:${r.titleHints} א:${r.iconHints} ש:${r.promptHints} ת:${r.answersFit} | ${r.action} |\n`;
}

md += `\n---\n\n## טבלה מלאה — קל (${byLevel.קל.length})\n\n`;
md += `| רמה | ID | כותרת | אייקון | שאלה | N | תשובות | מצב | כותרת? | אייקון? | שאלה? | מתאים? | חלופית? | גיל? | פעולה |\n`;
md += `|-----|-----|--------|--------|------|---|--------|-----|--------|---------|--------|--------|----------|------|--------|\n`;
for (const r of byLevel.קל) md += `${mdRow(r)}\n`;

md += `\n## טבלה מלאה — בינוני (${byLevel.בינוני.length})\n\n`;
md += `| רמה | ID | כותרת | אייקון | שאלה | N | תשובות | מצב | כותרת? | אייקון? | שאלה? | מתאים? | חלופית? | גיל? | פעולה |\n`;
md += `|-----|-----|--------|--------|------|---|--------|-----|--------|---------|--------|--------|----------|------|--------|\n`;
for (const r of byLevel.בינוני) md += `${mdRow(r)}\n`;

md += `\n## טבלה מלאה — קשה (${byLevel.קשה.length})\n\n`;
md += `| רמה | ID | כותרת | אייקון | שאלה | N | תשובות | מצב | כותרת? | אייקון? | שאלה? | מתאים? | חלופית? | גיל? | פעולה |\n`;
md += `|-----|-----|--------|--------|------|---|--------|-----|--------|---------|--------|--------|----------|------|--------|\n`;
for (const r of byLevel.קשה) md += `${mdRow(r)}\n`;

md += `\n## נספח — מדפים לפי רמה\n\n`;
for (const [diff, ids] of Object.entries(SHELF_BY_DIFFICULTY)) {
  md += `- **${LEVEL_HE[diff]} (${GRADE_BAND[diff]})**: ${ids.map((id) => LAB_ITEMS[id]?.name || id).join(", ")}\n`;
}

fs.writeFileSync(OUT_MD, md, "utf8");

console.log(`Wrote ${OUT_MD}`);
console.log(`Wrote ${OUT_CSV}`);
console.log(`Total: ${rows.length}, flagged (≥2): ${flagged.length}`);
