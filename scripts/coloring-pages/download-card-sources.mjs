/**
 * Download best available source image for each active reward card.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { loadProjectEnv, ROOT } from "./load-env.mjs";

loadProjectEnv();

const CATALOG_PATH = path.join(ROOT, "data/coloring/reward-cards-source-catalog.json");
const OUT_DIR = path.join(ROOT, "tmp/coloring-pages-work/sources");
const REPORT_PATH = path.join(ROOT, "tmp/coloring-pages-work/download-report.json");
const BUCKET = "reward-cards";

function supabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {string} storagePath
 */
async function downloadStorage(client, storagePath) {
  const { data, error } = await client.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * @param {string} url
 */
async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param {Record<string, unknown>} card
 */
async function resolveSourceBuffer(client, card) {
  const tries = [];

  if (card.imageDownloadUrl) tries.push(() => downloadUrl(String(card.imageDownloadUrl)));
  if (card.imageDisplayUrl) tries.push(() => downloadUrl(String(card.imageDisplayUrl)));
  if (card.storagePath) tries.push(() => downloadStorage(client, String(card.storagePath)));

  const local = String(card.imageUrl || "");
  if (local.startsWith("/")) {
    const localPath = path.join(ROOT, "public", local.replace(/^\//, ""));
    if (fs.existsSync(localPath)) {
      tries.unshift(async () => fs.readFileSync(localPath));
    }
  }

  for (const fn of tries) {
    try {
      const buf = await fn();
      if (buf && buf.length > 1000) return buf;
    } catch {
      /* next */
    }
  }
  return null;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const cards = catalog.cards.filter((c) => c.isActive !== false);
  const client = supabase();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  /** @type {Record<string, unknown>[]} */
  const report = [];

  for (const card of cards) {
    const outPath = path.join(OUT_DIR, `${card.cardKey}.png`);
    if (fs.existsSync(outPath)) {
      report.push({ cardKey: card.cardKey, ok: true, cached: true, outPath: rel(outPath) });
      continue;
    }

    const buf = await resolveSourceBuffer(client, card);
    if (!buf) {
      report.push({ cardKey: card.cardKey, ok: false, reason: "no_source" });
      continue;
    }

    await sharp(buf).png().toFile(outPath);
    report.push({ cardKey: card.cardKey, ok: true, outPath: rel(outPath) });
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ count: report.length, report }, null, 2));

  const ok = report.filter((r) => r.ok).length;
  const fail = report.length - ok;
  console.log(JSON.stringify({ ok, fail, reportPath: REPORT_PATH }, null, 2));
}

/**
 * @param {string} abs
 */
function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
