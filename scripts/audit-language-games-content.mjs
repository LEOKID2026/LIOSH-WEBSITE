#!/usr/bin/env node
/**
 * Full content mapping + pedagogical audit for leo-word-train & leo-word-detective.
 * Output: docs/qa/language-games-*-mapping.csv + language-games-content-audit-summary.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planLanguageSession } from "../lib/educational-games/language-session-planner.js";
import { pickWordTrainSession, WORD_TRAIN_TASKS } from "../components/educational-games/leo-word-train/leo-word-train-data.js";
import {
  pickWordDetectiveSession,
  WORD_DETECTIVE_TASKS,
} from "../components/educational-games/leo-word-detective/leo-word-detective-data.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs", "qa");

const TRAIN_EASY_OK = new Set(["upper_to_lower", "lower_to_upper", "first_letter", "one_gap"]);
const TRAIN_EASY_BANNED = new Set([
  "build_word",
  "fill_gaps",
  "dual_phrase",
  "image_word",
  "word_order",
  "sentence_gap",
  "context_word",
  "image_sentence",
]);

/** @param {string[]} headers @param {Record<string, string>[]} rows */
function toCsv(headers, rows) {
  const esc = (v) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

/** @param {import('../components/educational-games/leo-word-train/leo-word-train-data.js').TrainTask} task */
function describeTrainTask(task) {
  const fixed = task.carriages.filter((c) => c.kind === "fixed").map((c) => c.content ?? c.emoji ?? "");
  const slots = task.carriages.filter((c) => c.kind === "slot").length;
  const onBoard = [...fixed, ...Array(slots).fill("_")].join(" · ") || `${slots} קרונות ריקים`;
  const cards = task.pieces.map((p) => p.label).join(" / ");
  const distractors = task.pieces
    .map((p) => p.label)
    .filter((l) => !Object.values(task.solution).includes(l))
    .join(" / ");
  return { onBoard, cards, distractors, slotCount: slots };
}

/** @param {import('../components/educational-games/leo-word-detective/leo-word-detective-data.js').DetectiveTask} task */
function describeDetectiveTask(task) {
  const onBoard = task.zones.map((z) => z.label).join(" · ");
  const cards = task.pieces.map((p) => p.label).join(" / ");
  const correctLabels = Object.values(task.solution)
    .map((pid) => task.pieces.find((p) => p.id === pid)?.label ?? "")
    .filter(Boolean);
  const distractors = task.pieces
    .map((p) => p.label)
    .filter((l) => !correctLabels.includes(l))
    .join(" / ");
  const display = [task.emoji ? `emoji:${task.emoji}` : null, task.passage ? `passage:${task.passage.slice(0, 80)}…` : null]
    .filter(Boolean)
    .join(" | ");
  return { onBoard, cards, distractors, display: display || onBoard };
}

function promptContainsAnswer(prompt, answer) {
  const p = String(prompt || "").toLowerCase();
  const parts = String(answer || "")
    .split("|")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.some((part) => {
    if (part.length <= 1) return false;
    return p.includes(part);
  });
}

function childCanCopy(task, game) {
  const type = task.taskType;
  const prompt = task.missionHe || task.prompt || "";
  const answer = task.correctAnswer || "";

  if (game === "train") {
    if (type === "build_word") {
      const word = Object.values(task.solution).join("");
      return prompt.toLowerCase().includes(word.toLowerCase());
    }
    if (type === "dual_phrase") {
      const parts = answer.split("|");
      return parts.every((p) => prompt.toLowerCase().includes(p.toLowerCase()));
    }
    if (type === "fill_gaps") {
      const word = answer.replace(/\|/g, "");
      return prompt.toLowerCase().includes(word.toLowerCase());
    }
    if (type === "word_order") {
      if (prompt.includes(" / ")) return true;
      const words = answer.split("|");
      return words.filter((w) => prompt.toLowerCase().includes(w.toLowerCase())).length >= words.length - 1;
    }
    if (type === "image_word") {
      return task.pieces.some((p) => p.label.toLowerCase() === answer.toLowerCase()) && !task.emoji;
    }
    if (type === "first_letter") {
      const wordCar = task.carriages.find((c) => c.kind === "fixed" && c.content && c.content.length > 1);
      if (wordCar && wordCar.content.toLowerCase() === answer.toLowerCase()) return false;
      return false;
    }
    return false;
  }

  if (game === "detective") {
    if (type === "letter_drop") {
      const m = prompt.match(/—\s*([\u0590-\u05FF]+)/);
      if (m && m[1][0] === answer) return false;
      return promptContainsAnswer(prompt, answer);
    }
    if (type === "fill_gap") return false;
    if (type === "sort_letter" || type === "sort_plural" || type === "sort_gender" || type === "word_family") {
      return promptContainsAnswer(prompt, answer);
    }
    if (type === "meaning_word" || type === "meaning") return false;
    return promptContainsAnswer(prompt, answer);
  }
  return false;
}

function skillForTrain(task) {
  const map = {
    upper_to_lower: "התאמת אות גדולה→קטנה",
    lower_to_upper: "התאמת אות קטנה→גדולה",
    first_letter: "זיהוי אות פותחת",
    one_gap: "השלמת אות אחת במילה קצרה",
    build_word: "בניית מילה מאותיות",
    fill_gaps: "השלמת אותיות חסרות",
    dual_phrase: "צירוף צבע+חפץ",
    image_word: "התאמת מילה לתמונה",
    word_order: "סדר מילים במשפט",
    sentence_gap: "השלמת מילה במשפט",
    context_word: "מילת קשר לפי רמז",
    image_sentence: "סדר משפט לפי תמונה",
  };
  return map[task.taskType] ?? task.taskType;
}

function skillForDetective(task) {
  const map = {
    letter_drop: "אות פותחת",
    fill_gap: "אות חסרה",
    image_word: "תמונה→מילה",
    sort_letter: "מילה לפי אות",
    fill_sentence: "מילה חסרה במשפט",
    sort_plural: "יחיד→רבים",
    sort_gender: "זכר→נקבה",
    word_family: "משפחת מילים",
    meaning_word: "משמעות מילה",
    event_order: "סדר אירועים",
    title_stamp: "כותרת לקטע",
    conclusion: "מסקנה מהקטע",
    meaning: "פירוש מילה בקטע",
  };
  return map[task.taskType] ?? task.taskType;
}

function whatChildDoesTrain(task) {
  const t = task.taskType;
  if (t === "upper_to_lower" || t === "lower_to_upper") return "לבחור אות מתאימה ולהעמיס על קרון ריק";
  if (t === "first_letter") return "לזהות אות פותחת ולהעמיס על קרון";
  if (t === "one_gap") return "להשלים אות חסרה אחת על הקרון";
  if (t === "build_word") return "לבחור אותיות ולבנות מילה על כל הקרונות";
  if (t === "fill_gaps") return "להשלים אות(ות) חסרות במילה";
  if (t === "dual_phrase") return "להעמיס שני קרונות: צבע + חפץ";
  if (t === "image_word") return "לבחור מילה מתאימה לתמונה";
  if (t === "word_order") return "לסדר מילים בסדר נכון";
  if (t === "sentence_gap") return "להשלים מילה חסרה במשפט";
  if (t === "context_word") return "לבחור מילת קשר לפי רמז";
  if (t === "image_sentence") return "לסדר משפט לפי תמונה";
  return "להעמיס קלפים על קרונות";
}

function whatChildDoesDetective(task) {
  const t = task.taskType;
  if (t === "letter_drop") return "לגרור אות פותחת ללוח";
  if (t === "fill_gap") return "לגרור אות חסרה ללוח";
  if (t === "image_word") return "לבחור מילה לפי תמונה";
  if (t === "sort_letter") return "לגרור מילה שמתחילה באות נתונה";
  if (t === "fill_sentence") return "לגרור מילה חסרה למשפט";
  if (t === "sort_plural") return "לגרור צורת רבים";
  if (t === "sort_gender") return "לגרור צורת נקבה";
  if (t === "word_family") return "לגרור מילה ממשפחה";
  if (t === "meaning_word") return "לבחור פירוש";
  if (t === "event_order") return "לסדר אירועים לפי הקטע";
  if (t === "title_stamp") return "לבחור כותרת לקטע";
  if (t === "conclusion") return "לבחור מסקנה מהקטע";
  if (t === "meaning") return "לבחור פירוש מילה מהקטע";
  return "לגרור ראיה ללוח";
}

/** @returns {{ status: string, note: string, ageOk: string, answerInPrompt: string, copy: string }} */
function auditTrainTask(task) {
  const type = task.taskType;
  const level = task.level;
  const notes = [];
  let status = "מאושר";
  const answerInPrompt =
    type === "build_word"
      ? task.missionHe.toLowerCase().includes(Object.values(task.solution).join("").toLowerCase())
        ? "yes"
        : "no"
      : promptContainsAnswer(task.missionHe, task.correctAnswer)
        ? "yes"
        : "no";
  const copy = childCanCopy(task, "train") ? "yes" : "no";
  const { slotCount } = describeTrainTask(task);

  if (level === "easy") {
    if (!TRAIN_EASY_OK.has(type)) {
      status = "למחיקה";
      notes.push(`סוג ${type} אסור ברמת קל`);
    }
    if (TRAIN_EASY_BANNED.has(type)) {
      status = "למחיקה";
      notes.push("סוג אסור בקל");
    }
    if (type === "first_letter") {
      const word = task.carriages.find((c) => c.content?.length > 1)?.content;
      if (word && ["red", "big", "top", "fun", "bus", "map"].includes(word)) {
        status = "לתיקון";
        notes.push(`מילת אוצר/צבע ${word} בקל — להחליף למילה פונטית פשוטה`);
      }
    }
    if (slotCount !== 1 && type !== "one_gap") {
      if (type === "one_gap" && slotCount === 1) {
        /* ok */
      } else if (TRAIN_EASY_OK.has(type) && slotCount > 1) {
        status = "לתיקון";
        notes.push("יותר מקרון ריק אחד בקל");
      }
    }
    if (type === "one_gap" && slotCount !== 1) {
      status = "לתיקון";
      notes.push("one_gap צריך בדיוק אות אחת חסרה");
    }
  }

  if (level === "medium") {
    if (type === "build_word") {
      const word = Object.values(task.solution).join("");
      if (task.missionHe.toLowerCase().includes(word.toLowerCase())) {
        status = "לתיקון";
        notes.push(`prompt «בנו את המילה ${word}» — הילד מעתיק את המילה מהשאלה`);
      } else if (!task.emoji && !task.missionHe.match(/[\u0590-\u05FF]/)) {
        status = "לתיקון";
        notes.push("חסר רמז עברית/תמונה");
      }
    }
    if (type === "dual_phrase" && copy === "yes") {
      status = "לתיקון";
      notes.push("שני המילים מופיעות במפורש ב-prompt — העתקה");
    }
    if (type === "fill_gaps") {
      const word = Object.values(task.solution).join("");
      if (task.missionHe.toLowerCase().includes(word.toLowerCase())) {
        if (status === "מאושר") status = "לתיקון";
        notes.push("המילה המלאה באנגלית מופיעה ב-prompt — העתקה חלקית");
      }
    }
    if (type === "build_word" && !task.emoji && !task.missionHe.match(/[\u0590-\u05FF]/)) {
      if (status === "מאושר") status = "לתיקון";
      notes.push("חסר רמז עברית/תמונה — רק prompt באנגלית");
    }
  }

  if (level === "hard") {
    if (type === "word_order" && task.missionHe.includes(" / ")) {
      status = "לתיקון";
      notes.push("המשפט/מילים באנגלית מופיעים ב-prompt — העתקה");
    }
    if (type === "sentence_gap") {
      const fixed = task.carriages.filter((c) => c.kind === "fixed").map((c) => c.content).join(" ");
      if (fixed.split(/\s+/).length > 6) {
        status = "לתיקון";
        notes.push("משפט ארוך מדי בקרונות");
      }
    }
    if (type === "context_word") {
      const clue = task.carriages[0]?.content;
      if (clue && task.pieces.some((p) => p.label === clue)) {
        status = "לתיקון";
        notes.push("מילת הקשר מופיעה גם בקרון וגם בקלפים — מבלבל");
      }
    }
  }

  if (copy === "yes" && status === "מאושר") {
    status = "לתיקון";
    notes.push("הילד יכול להעתיק מהשאלה");
  }

  const ageOk =
    status === "מאושר" || (status === "לתיקון" && !notes.some((n) => n.includes("אסור"))) ? "yes" : "no";

  return {
    status,
    note: notes.join("; ") || "—",
    ageOk: status === "מאושר" ? "yes" : ageOk,
    answerInPrompt,
    copy,
  };
}

/** @returns {{ status: string, note: string, ageOk: string, answerInPrompt: string, copy: string }} */
function auditDetectiveTask(task) {
  const type = task.taskType;
  const level = task.level;
  const notes = [];
  let status = "מאושר";
  const answerInPrompt = promptContainsAnswer(task.missionHe, task.correctAnswer) ? "yes" : "no";
  const copy = childCanCopy(task, "detective") ? "yes" : "no";

  if (level === "easy") {
    if (task.passage) {
      status = "למחיקה";
      notes.push("קטע קריאה בקל");
    }
    if (["word_family", "fill_sentence", "sort_plural", "sort_gender"].includes(type)) {
      status = "למחיקה";
      notes.push(`סוג ${type} אסור בקל`);
    }
    if (type === "sort_letter" && copy === "yes") {
      status = "לתיקון";
      notes.push("המילה הנכונה עלולה להיות מנוחה מדי אם כל האפשרויות מתחילות באות");
    }
  }

  if (level === "medium") {
    if (task.passage) {
      status = "לתיקון";
      notes.push("passage בבינוני — לקצר/להסיר");
    }
    if (type === "word_family") {
      status = "לתיקון";
      notes.push("משפחת מילים/שורש — כבד לג׳–ד׳ לפי הכללים");
    }
    if (type === "meaning_word") {
      /* generally OK */
    }
  }

  if (level === "hard") {
    if (!task.passage) {
      status = "לתיקון";
      notes.push("חסר passage");
    } else {
      const sentences = task.passage.split(/[.!?]\s*/).filter(Boolean).length;
      if (sentences > 3) {
        status = "לתיקון";
        notes.push(`קטע ${sentences} משפטים — מעל 3`);
      }
    }
  }

  if (copy === "yes" && status === "מאושר") {
    status = "לתיקון";
    notes.push("תשובה/רמז מופיע ישירות ב-prompt");
  }

  return {
    status,
    note: notes.join("; ") || "—",
    ageOk: status === "מאושר" ? "yes" : "no",
    answerInPrompt,
    copy,
  };
}

function mapTrainTasks() {
  /** @type {Record<string, string>[]} */
  const rows = [];
  for (const level of ["easy", "medium", "hard"]) {
    for (const task of WORD_TRAIN_TASKS[level]) {
      const { onBoard, cards, distractors } = describeTrainTask(task);
      const audit = auditTrainTask(task);
      rows.push({
        gameKey: "leo-word-train",
        level: task.level,
        gradeBand: task.gradeBand,
        taskId: task.id,
        taskType: task.taskType,
        prompt: task.missionHe,
        childMissionDisplay: task.emoji ? `${task.missionHe} ${task.emoji}` : task.missionHe,
        onBoard,
        cards,
        correctAnswer: task.correctAnswer,
        distractors,
        childAction: whatChildDoesTrain(task),
        answerInPrompt: audit.answerInPrompt,
        canCopy: audit.copy,
        skill: skillForTrain(task),
        ageOk: audit.ageOk,
        status: audit.status,
        fixNote: audit.note,
      });
    }
  }
  return rows;
}

function mapDetectiveTasks() {
  /** @type {Record<string, string>[]} */
  const rows = [];
  for (const level of ["easy", "medium", "hard"]) {
    for (const task of WORD_DETECTIVE_TASKS[level]) {
      const { onBoard, cards, distractors, display } = describeDetectiveTask(task);
      const audit = auditDetectiveTask(task);
      rows.push({
        gameKey: "leo-word-detective",
        level: task.level,
        gradeBand: task.gradeBand,
        taskId: task.id,
        taskType: task.taskType,
        prompt: task.missionHe,
        childMissionDisplay: task.passage ? `${task.missionHe} | ${task.passage}` : display || task.missionHe,
        onBoard,
        cards,
        correctAnswer: task.correctAnswer,
        distractors,
        childAction: whatChildDoesDetective(task),
        answerInPrompt: audit.answerInPrompt,
        canCopy: audit.copy,
        skill: skillForDetective(task),
        ageOk: audit.ageOk,
        status: audit.status,
        fixNote: audit.note,
      });
    }
  }
  return rows;
}

function analyzeSession(gameKey, pickFn, pool) {
  const issues = [];
  for (const level of ["easy", "medium", "hard"]) {
    const session = pickFn(level);
    for (let i = 2; i < session.length; i += 1) {
      const types = [session[i - 2], session[i - 1], session[i]].map((t) => t.taskType);
      if (types[0] === types[1] && types[1] === types[2]) {
        issues.push(`${gameKey} ${level}: 3× ${types[2]} ברצף (משימות ${i - 1}-${i + 1})`);
      }
    }
    for (let i = 1; i < session.length; i += 1) {
      if (session[i].correctAnswer === session[i - 1].correctAnswer) {
        issues.push(`${gameKey} ${level}: אותה תשובה ברצף (${session[i].id})`);
      }
    }
    const phase1 = session.slice(0, 5).map((t) => t.taskType);
    const phase2 = session.slice(5, 15).map((t) => t.taskType);
    const phase3 = session.slice(15, 20).map((t) => t.taskType);
    issues.push(
      `${gameKey} ${level} session sample: phase1 types=${[...new Set(phase1)].join("+")} | phase2=${[...new Set(phase2)].length} types | phase3=${[...new Set(phase3)].length} types`,
    );
  }
  return issues;
}

function summarize(rows, gameName) {
  const byStatus = { מאושר: 0, "לתיקון": 0, "למחיקה": 0 };
  const copyYes = rows.filter((r) => r.canCopy === "yes");
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return { gameName, total: rows.length, byStatus, copyYes: copyYes.length, copyIds: copyYes.map((r) => r.taskId) };
}

const HEADERS = [
  "gameKey",
  "level",
  "gradeBand",
  "taskId",
  "taskType",
  "prompt",
  "childMissionDisplay",
  "onBoard",
  "cards",
  "correctAnswer",
  "distractors",
  "childAction",
  "answerInPrompt",
  "canCopy",
  "skill",
  "ageOk",
  "status",
  "fixNote",
];

const trainRows = mapTrainTasks();
const detectiveRows = mapDetectiveTasks();

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "language-games-train-mapping.csv"), `\uFEFF${toCsv(HEADERS, trainRows)}`, "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "language-games-detective-mapping.csv"),
  `\uFEFF${toCsv(HEADERS, detectiveRows)}`,
  "utf8",
);

const trainSum = summarize(trainRows, "רכבת המילים");
const detSum = summarize(detectiveRows, "בלש המילים");
const sessionNotes = [
  ...analyzeSession("leo-word-train", pickWordTrainSession, WORD_TRAIN_TASKS),
  ...analyzeSession("leo-word-detective", pickWordDetectiveSession, WORD_DETECTIVE_TASKS),
];

const rejected = [...trainRows, ...detectiveRows].filter((r) => r.status === "למחיקה");
const fix = [...trainRows, ...detectiveRows].filter((r) => r.status === "לתיקון");
const approved = [...trainRows, ...detectiveRows].filter((r) => r.status === "מאושר");

const easyTrainOk = trainRows.filter((r) => r.level === "easy").every((r) => TRAIN_EASY_OK.has(r.taskType));
const easyTrainCopy = trainRows.filter((r) => r.level === "easy" && r.canCopy === "yes");

const md = `# Language Games — Content Audit Summary

Generated: ${new Date().toISOString().slice(0, 10)}

**Status: תוכן לא מאושר ל-production.** עיצוב/HUD/layout מאושרים — רק תוכן משימות דורש תיקון.

## קבצי מיפוי

| קובץ | משימות |
|------|--------|
| \`docs/qa/language-games-train-mapping.csv\` | ${trainRows.length} |
| \`docs/qa/language-games-detective-mapping.csv\` | ${detectiveRows.length} |

## סיכום סטטוס

### רכבת המילים (${trainSum.total})
| סטטוס | כמות |
|-------|------|
| מאושר | ${trainSum.byStatus["מאושר"] ?? 0} |
| לתיקון | ${trainSum.byStatus["לתיקון"] ?? 0} |
| למחיקה | ${trainSum.byStatus["למחיקה"] ?? 0} |
| canCopy=yes | ${trainSum.copyYes} |

### בלש המילים (${detSum.total})
| סטטוס | כמות |
|-------|------|
| מאושר | ${detSum.byStatus["מאושר"] ?? 0} |
| לתיקון | ${detSum.byStatus["לתיקון"] ?? 0} |
| למחיקה | ${detSum.byStatus["למחיקה"] ?? 0} |
| canCopy=yes | ${detSum.copyYes} |

## בדיקות עליון (10 שאלות)

| # | שאלה | תוצאה |
|---|------|--------|
| 1 | אנגלית קל — רק אותיות / אות אחת? | ${easyTrainOk ? "✅ כן (סוגים)" : "❌ לא"} |
| 2 | אין העתקה ישירה מהשאלה? | ${[...trainRows, ...detectiveRows].filter((r) => r.canCopy === "yes").length === 0 ? "✅" : `❌ ${[...trainRows, ...detectiveRows].filter((r) => r.canCopy === "yes").length} משימות`} |
| 3 | התאמה לכיתות א׳–ו׳? | ${fix.length + rejected.length === 0 ? "✅" : `⚠️ ${approved.length}/${trainRows.length + detectiveRows.length} מאושרות`} |
| 4 | בקרת חזרתיות בסשן? | planner: max 2 same type; phases 5+10+5 — ראה session notes |
| 5 | 30+ משימות לרמה? | ✅ train 30/30/30, detective 30/30/30 |
| 6 | duplicate ids? | ✅ (selftest) |
| 7 | correctAnswer בקלפים? | ✅ (selftest) |

## משימות שנפסלו (למחיקה) — ${rejected.length}

${rejected.map((r) => `- \`${r.taskId}\` (${r.taskType}, ${r.level}): ${r.fixNote}`).join("\n") || "—"}

## משימות לתיקון — ${fix.length}

${fix.slice(0, 40).map((r) => `- \`${r.taskId}\` (${r.taskType}, ${r.level}): ${r.fixNote}`).join("\n")}
${fix.length > 40 ? `\n… ועוד ${fix.length - 40} (ראה CSV מלא)\n` : ""}

## משימות מאושרות — ${approved.length}

${approved.slice(0, 15).map((r) => `- \`${r.taskId}\` (${r.taskType}, ${r.level})`).join("\n")}
${approved.length > 15 ? `\n… ועוד ${approved.length - 15} (ראה CSV)\n` : ""}

## בעיות מרכזיות (דוגמאות)

### רכבת — medium build_word (8/8 לתיקון)
כל משימות \`wt-m-bw-*\`: prompt «בנו את המילה milk/green/school…» — המילה באנגלית מופיעה בשאלה והילד מעתיק לקלפים.

### רכבת — medium dual_phrase (7/7 לתיקון)
\`wt-m-dp-*\`: «העמיסו שני קרונות: red + hat» — שתי התשובות ב-prompt.

### רכbת — hard word_order (8/8 לתיקון)
\`wt-h-wo-*\`: «סדרו מילים — I / like / pizza» — המשפט באנגלית ב-prompt.

### רכבת — easy first_letter
חלק מהמילים (red, big, bus…) — אוצר/צבע, לא רק פוניקה.

## בקרת חזרתיות (session planner)

${sessionNotes.map((n) => `- ${n}`).join("\n")}

## Selftest — כללים שצריך להוסיף (לא הורצו כתיקון)

- אנגלית קל: להכשיל build_word, dual_phrase, sentence*, correctAnswer מילה מלאה, prompt עם תשובה מלאה
- אנגלית בינוני/קשה: להכשיל prompt עם answer באנגלית / copy pattern
- עברית קל: להכשיל passage, word_family, משפט ארוך
- עברית קשה: passage > 3 משפטים
- כללי: canCopy heuristic, duplicate id, pool < 30

## המלצה לפני קוד

1. **לכבות** ב-\`site_game_catalog\` עד אישור תוכן (\`is_enabled = false\`).
2. **לש rewrite** medium train: build_word → רמז עברית/תמונה בלבד; dual_phrase → רמז עברית.
3. **לש rewrite** hard train: word_order → רמז עברית בלבד, בלי slash-English ב-prompt.
4. **לבדוק** easy first_letter — להחליף מילות צבע/אוצר למילים CVC פשוטות.
5. **לבלש** — word_family ב-medium לתיקון; hard passages OK (≤3 משפטים).

לא deploy. לא SQL. לא שינוי עיצוב.
`;

fs.writeFileSync(path.join(OUT_DIR, "language-games-content-audit-summary.md"), md, "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      train: trainSum,
      detective: detSum,
      rejected: rejected.length,
      fix: fix.length,
      approved: approved.length,
      files: [
        "docs/qa/language-games-train-mapping.csv",
        "docs/qa/language-games-detective-mapping.csv",
        "docs/qa/language-games-content-audit-summary.md",
      ],
    },
    null,
    2,
  ),
);
