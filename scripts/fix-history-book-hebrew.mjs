#!/usr/bin/env node
/**
 * Fix corrupted Hebrew/Latin mix in history G6 book drafts (child-facing sections).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRAFTS = join(ROOT, "docs/learning-book/history/g6/drafts");

const REPLACEMENTS = [
  [/יehud/gi, "יהוד"],
  [/יehuda/gi, "יהודה"],
  [/יehudim/gi, "יהודים"],
  [/יehudית/gi, "יהודית"],
  [/יהudah/gi, "יהודה"],
  [/יהudim/gi, "יהודים"],
  [/יהudית/gi, "יהודית"],
  [/יavne/gi, "יבנה"],
  [/יehuda/gi, "יהודה"],
  [/בitalia/gi, "באיטליה"],
  [/בitalia/gi, "באיטליה"],
  [/לatin/gi, "לatin"],
  [/לatin/gi, "לatin"],
  [/פompeyus/gi, "צבאות רומיים"],
  [/פompeyus/gi, "צבאות רומיים"],
  [/חורbן/gi, "חורban"],
  [/חורbן/gi, "חורban"],
  [/חורban/gi, "חורban"],
  [/כיפat/gi, "כיפat"],
  [/כיפat/gi, "כיפat"],
  [/סPORT/gi, "ספורט"],
  [/צ militari/gi, "צבאי"],
  [/דisciplina/gi, "משמעת"],
  [/א ostracon/gi, "חרס"],
  [/יונatan/gi, "יונתן"],
  [/שמעon/gi, "שמעון"],
  [/חנukah/gi, "חנוכה"],
  [/udah/gi, "הודה"],
  [/ompeyuS/gi, "צבאות רומיים"],
  [/avne/gi, "בנה"],
  [/italia2/gi, "איטליה"],
  [/latin/gi, "רומית"],
  [/לatin/gi, "רומית"],
  [/Yavne/gi, "יבנה"],
  [/Bar Kochba/gi, "בר כוכba"],
  [/Bar Kokhba/gi, "בר כוכba"],
  [/ha-churban/gi, "החורban"],
  [/churban/gi, "חורban"],
  [/Bavel/gi, "בבל"],
  [/Herod/gi, "הורדוס"],
  [/Yehuda/gi, "יהודה"],
  [/Yehudim/gi, "יהודים"],
  [/Mered/gi, "מרד"],
  [/Mikdash/gi, "מקdש"],
  [/provincia/gi, "פרובינציה"],
  [/migbalot/gi, "מגבלות"],
  [/masim/gi, "מיסים"],
  [/metachim/gi, "מתחים"],
  [/merkaz/gi, "מרכז"],
  [/limud/gi, "לימוד"],
  [/tefila/gi, "תפילה"],
  [/galut/gi, "גלות"],
  [/edut/gi, "עדות"],
  [/yeshira/gi, "ישירה"],
  [/chayei/gi, "חיי"],
  [/lifnei/gi, "לפני"],
  [/mered/gi, "מרed"],
  [/Midbar/gi, "מdbar"],
  [/Melach/gi, "hamelach"],
  [/migilot/gi, "מגילות"],
  [/Yam/gi, "ים"],
  [/ezmaaut/gi, "עצmאות"],
  [/Hashmona/gi, "החשmונא"],
  [/kibushim/gi, "כibushim"],
  [/milchamot/gi, "מלחמות"],
  [/shlita/gi, "שlita"],
  [/romit/gi, "רומית"],
  [/memuna/gi, "ממונה"],
  [/ke-melech/gi, "כמלך"],
  [/ke-/gi, "כ"],
  [/ve-/gi, "ו"],
  [/u-/gi, "ו"],
  [/be-/gi, "ב"],
  [/le-/gi, "ל"],
  [/ha-/gi, "ה"],
  [/lifnei/gi, "לפני"],
  [/Gadol/gi, "גדול"],
];

/** Strip latin from child sections (after metadata header). */
function cleanChildBody(text) {
  let out = text;
  for (const [re, rep] of REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  // Remove remaining isolated latin letters in Hebrew words (e.g. יehud → fixed above)
  out = out.replace(/([א-ת])([a-zA-Z]+)([א-ת])/g, (_, a, latin, b) => {
    const map = {
      udah: "הודה",
      avne: "בנה",
      bן: "בן",
      latin: "רומית",
      ehud: "הוד",
      ehuda: "הודה",
      ehudim: "הודים",
      ehudית: "הודית",
      avne: "בנה",
      bן: "בן",
    };
    return a + (map[latin.toLowerCase()] || "") + b;
  });
  return out;
}

function processFile(name) {
  const path = join(DRAFTS, name);
  let raw = readFileSync(path, "utf8");
  const parts = raw.split(/^---\s*$/m);
  if (parts.length < 2) {
    raw = cleanChildBody(raw);
  } else {
    // Keep metadata block; clean sections 1+
    const head = parts.slice(0, 2).join("\n---\n");
    const body = parts.slice(2).join("\n---\n");
    raw = head + "\n---\n" + cleanChildBody(body);
  }
  writeFileSync(path, raw, "utf8");
}

for (const f of [
  "what_is_history.md",
  "classical_greece.md",
  "hellenism_jews.md",
  "hasmonaeans.md",
  "rome_jews.md",
]) {
  processFile(f);
}

console.log("Book draft cleanup pass done");
