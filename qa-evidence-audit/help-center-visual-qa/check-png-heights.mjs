#!/usr/bin/env node
/** Quick gate: PNG pixel heights for recaptured help assets (no browser). */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const base = join(root, "public", "help-center", "screenshots");

function pngSize(buf) {
  if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".png")) out.push(p);
  }
  return out;
}

const caps = { mobile: 520, tablet: 700, desktop: 960 };
const files = walk(base);
const bad = [];
for (const p of files) {
  const rel = p.replace(base, "").replace(/\\/g, "/");
  const region = rel.includes("/mobile/") ? "mobile" : rel.includes("/tablet/") ? "tablet" : "desktop";
  const { h, w } = pngSize(readFileSync(p)) || {};
  if (!h) continue;
  const cap = caps[region];
  if (h > cap) bad.push({ rel, w, h, cap });
}

console.log(JSON.stringify({ total: files.length, overCap: bad.length, bad: bad.slice(0, 40) }, null, 2));
process.exit(bad.length ? 1 : 0);
