import { readFileSync } from "node:fs";

const H = {
  italy: "\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4",
  yehuda: "\u05D9\u05D4\u05D5\u05D3\u05D4",
  yehudim: "\u05D9\u05D4\u05D5\u05D3\u05D9\u05DD",
  yehudit: "\u05D9\u05D4\u05D5\u05D3\u05D9\u05EA",
  yavne: "\u05D9\u05D1\u05E0\u05D4",
  barKokhba: "\u05D1\u05E8 \u05DB\u05D5\u05DA\u05D1\u05D0",
  churban: "\u05D7\u05D5\u05E8\u05D1\u05DF",
  mikdash: "\u05DE\u05E7\u05D3\u05E9",
  deadSea: "\u05D9\u05DD \u05D4\u05DE\u05DC\u05D7",
  judeanDesert: "\u05DE\u05D3\u05D1\u05E8 \u05D9\u05D4\u05D5\u05D3\u05D4",
};

const raw = readFileSync("scripts/write-rome-jews-clean.mjs", "utf8");
const meta = raw.match(/const meta = `([\s\S]*?)`;/)[1].replace(/\$\{H\.(\w+)\}/g, (_, k) => H[k]);

const parts = meta.split("---");
console.log("parts count:", parts.length);
const child = parts.slice(1).join("---");
for (const m of child.matchAll(/[a-zA-Z]/g)) {
  const i = m.index;
  console.log("latin at", i, ":", JSON.stringify(child.slice(Math.max(0, i - 25), i + 25)));
}
