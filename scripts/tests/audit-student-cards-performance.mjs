#!/usr/bin/env node
/**
 * Performance audit for student card world — API timing, image URLs, thumb weights, cache headers.
 * Run: node --env-file=.env.local scripts/tests/audit-student-cards-performance.mjs
 */
import assert from "node:assert/strict";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { mapRewardCardImageFields } from "../../lib/rewards/reward-card-image-urls.js";

const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const serviceRole = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function classifyUrl(url) {
  const u = String(url || "").split("?")[0];
  if (!u) return "missing";
  if (/\/processed\/[^/]+\/thumb\.webp$/i.test(u)) return "thumb";
  if (/\/processed\/[^/]+\/display\.webp$/i.test(u)) return "display";
  if (/\/processed\/[^/]+\/download\.png$/i.test(u)) return "download";
  if (/\/processed\/[^/]+\/original\.webp$/i.test(u)) return "original";
  if (u.includes("/shop/") || u.includes("/achievements/") || u.includes("/events/")) return "legacy_storage";
  if (u.startsWith("/rewards/cards/")) return "legacy_public";
  if (u.includes(".svg")) return "placeholder_svg";
  return "other";
}

function pct(n, total) {
  return total ? `${Math.round((n / total) * 100)}%` : "0%";
}

async function findSampleStudentId() {
  const envId = process.env.AUDIT_STUDENT_ID?.trim();
  if (envId) return envId;
  const { data } = await serviceRole.from("students").select("id").limit(1).maybeSingle();
  return data?.id || null;
}

async function measureThumbSample(cards, sampleSize = 10) {
  const withThumb = cards.filter((c) => classifyUrl(c.image_thumb_url) === "thumb");
  const pick = withThumb.slice(0, sampleSize);
  const rows = [];

  for (const card of pick) {
    const url = String(card.image_thumb_url).split("?")[0];
    const t0 = performance.now();
    const res = await fetch(url, { redirect: "follow" });
    const elapsedMs = Math.round(performance.now() - t0);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    rows.push({
      cardKey: card.card_key,
      kb: Math.round(buf.length / 1024),
      px: `${meta.width}x${meta.height}`,
      fetchMs: elapsedMs,
      cacheControl: res.headers.get("cache-control") || "(none)",
      urlType: "thumb",
    });
  }
  return rows;
}

async function measureDisplaySample(cards, sampleSize = 5) {
  const withDisplay = cards.filter((c) => classifyUrl(c.image_display_url) === "display");
  const pick = withDisplay.slice(0, sampleSize);
  const rows = [];

  for (const card of pick) {
    const url = String(card.image_display_url).split("?")[0];
    const t0 = performance.now();
    const res = await fetch(url, { redirect: "follow" });
    const elapsedMs = Math.round(performance.now() - t0);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    rows.push({
      cardKey: card.card_key,
      kb: Math.round(buf.length / 1024),
      px: `${meta.width}x${meta.height}`,
      fetchMs: elapsedMs,
      cacheControl: res.headers.get("cache-control") || "(none)",
      urlType: "display",
    });
  }
  return rows;
}

async function loadCardsViewPayload(serviceRole, studentId) {
  const t0 = performance.now();
  const [cardsRes, ownedRes, seriesRes, rulesRes, studentRes] = await Promise.all([
    serviceRole.from("reward_cards").select("*, reward_card_series(name_he, slug)").eq("is_active", true),
    serviceRole.from("student_reward_cards").select("*").eq("student_id", studentId),
    serviceRole.from("reward_card_series").select("*").eq("is_active", true).order("display_order"),
    serviceRole.from("reward_card_rules").select("*, reward_cards(*)").eq("is_active", true),
    serviceRole.from("students").select("grade_level").eq("id", studentId).maybeSingle(),
  ]);
  const baseMs = Math.round(performance.now() - t0);

  if (cardsRes.error) throw new Error(cardsRes.error.message);
  if (ownedRes.error) throw new Error(ownedRes.error.message);

  const allCards = cardsRes.data || [];
  const ownedIds = new Set((ownedRes.data || []).filter((r) => r.owned).map((r) => r.card_id));

  const shop = allCards
    .filter((c) => c.can_be_purchased && c.card_type === "shop")
    .map((c) => ({
      cardKey: c.card_key,
      ...mapRewardCardImageFields(c),
    }));

  const collection = allCards
    .filter((c) => ownedIds.has(c.id))
    .map((c) => ({
      cardKey: c.card_key,
      ...mapRewardCardImageFields(c),
    }));

  const catalog = allCards.map((c) => ({
    cardKey: c.card_key,
    ...mapRewardCardImageFields(c),
  }));

  const seriesProgress = (seriesRes.data || []).map((series) => {
    const cards = allCards
      .filter((c) => c.series_id === series.id)
      .map((c) => ({ cardKey: c.card_key, ...mapRewardCardImageFields(c) }));
    return { seriesId: series.id, cards };
  });

  const lockMetaCallsEstimate = allCards.filter((c) => !ownedIds.has(c.id)).length * 3;

  return {
    baseQueryMs: baseMs,
    shop,
    collection,
    catalog,
    seriesProgress,
    lockMetaCallsEstimate,
    rulesCount: (rulesRes.data || []).length,
    studentGrade: studentRes.data?.grade_level ?? null,
  };
}

async function main() {
  const studentId = await findSampleStudentId();
  if (!studentId) {
    console.error("No student found for audit");
    process.exit(1);
  }

  console.log("=== Student Cards Performance Audit ===\n");
  console.log(`Student ID: ${studentId}\n`);

  const { data: allCardsRaw } = await serviceRole
    .from("reward_cards")
    .select(
      "id, card_key, image_url, image_thumb_url, image_display_url, image_download_url, image_variants_version, is_active"
    )
    .eq("is_active", true);

  const cards = allCardsRaw || [];
  const withImage = cards.filter((c) => {
    const u = String(c.image_url || c.image_thumb_url || "").split("?")[0];
    return u && !/\.svg(\?|$)/i.test(u);
  });

  console.log("--- 1) DB variant coverage ---");
  const ready = withImage.filter(
    (c) => c.image_thumb_url && c.image_display_url && c.image_download_url
  );
  console.log(`Active cards with image: ${withImage.length}`);
  console.log(`Variants ready in DB: ${ready.length} (${pct(ready.length, withImage.length)})`);

  const thumbTypes = {};
  const displayTypes = {};
  for (const c of withImage) {
    const mapped = mapRewardCardImageFields(c);
    thumbTypes[classifyUrl(mapped.imageThumbUrl)] =
      (thumbTypes[classifyUrl(mapped.imageThumbUrl)] || 0) + 1;
    displayTypes[classifyUrl(mapped.imageDisplayUrl)] =
      (displayTypes[classifyUrl(mapped.imageDisplayUrl)] || 0) + 1;
  }
  console.log("\nPayload imageThumbUrl types:", thumbTypes);
  console.log("Payload imageDisplayUrl types:", displayTypes);
  assert.equal(
    thumbTypes.thumb || 0,
    ready.length,
    "Expected all ready cards to expose thumb URL"
  );

  console.log("\n--- 2) API timing: split endpoints vs monolith ---");
  let viewMs = null;
  let view = null;
  let progressCacheQueries = null;
  const splitBenchmarks = [];

  async function measureView(label, fn) {
    const t0 = performance.now();
    const data = await fn();
    const ms = Math.round(performance.now() - t0);
    const payload = { ok: true, ...data };
    const jsonBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    let cardCount = 0;
    if (Array.isArray(data.collection)) cardCount = data.collection.length;
    else if (Array.isArray(data.shop)) cardCount = data.shop.length;
    else if (Array.isArray(data.catalog)) cardCount = data.catalog.length;
    else if (Array.isArray(data.seriesProgress)) {
      cardCount = data.seriesProgress.reduce((n, s) => n + (s.cards?.length || 0), 0);
    }
    splitBenchmarks.push({
      label,
      ms,
      bytes: jsonBytes,
      kb: Math.round(jsonBytes / 1024),
      cardCount,
    });
    return data;
  }

  try {
    const {
      getStudentCardsView,
      getStudentCardsSummary,
      getStudentCardsShopView,
      getStudentCardsCollectionView,
      getStudentCardsCatalogView,
      getStudentCardsSeriesView,
    } = await import("../../lib/rewards/server/reward-cards.server.js");
    const { buildStudentRuleProgressCache } = await import(
      "../../lib/rewards/server/card-acquisition-engine.server.js"
    );

    await measureView("summary", () => getStudentCardsSummary(serviceRole, studentId));
    await measureView("collection", () => getStudentCardsCollectionView(serviceRole, studentId));
    await measureView("shop", () => getStudentCardsShopView(serviceRole, studentId));
    await measureView("catalog", () => getStudentCardsCatalogView(serviceRole, studentId));
    await measureView("series", () => getStudentCardsSeriesView(serviceRole, studentId));

    const initialMs =
      (splitBenchmarks.find((b) => b.label === "summary")?.ms || 0) +
      (splitBenchmarks.find((b) => b.label === "collection")?.ms || 0);
    const initialBytes =
      (splitBenchmarks.find((b) => b.label === "summary")?.bytes || 0) +
      (splitBenchmarks.find((b) => b.label === "collection")?.bytes || 0);

    const tView0 = performance.now();
    view = await getStudentCardsView(serviceRole, studentId);
    viewMs = Math.round(performance.now() - tView0);
    const monolithKb = Math.round(
      Buffer.byteLength(JSON.stringify({ ok: true, ...view }), "utf8") / 1024
    );

    const { data: ownedRows } = await serviceRole
      .from("student_reward_cards")
      .select("card_id, owned")
      .eq("student_id", studentId);
    const ownedIds = new Set((ownedRows || []).filter((r) => r.owned).map((r) => r.card_id));
    const { data: studentRow } = await serviceRole
      .from("students")
      .select("grade_level")
      .eq("id", studentId)
      .maybeSingle();
    const { loadRulesGroupedByCardId } = await import(
      "../../lib/rewards/server/card-acquisition-engine.server.js"
    );
    const { getGradeBand } = await import("../../lib/learning-supabase/mission-progress.server.js");
    const rulesByCard = await loadRulesGroupedByCardId(serviceRole);
    const ctx = { gradeBand: getGradeBand(studentRow?.grade_level), monthlyMinutes: 0 };
    const cache = await buildStudentRuleProgressCache(serviceRole, studentId, rulesByCard, ctx);
    progressCacheQueries = cache.queryCount;

    const unownedCards = (cards || []).filter((c) => !ownedIds.has(c.id)).length;
    console.table(
      splitBenchmarks.map(({ label, ms, bytes, kb, cardCount }) => ({
        label,
        ms,
        bytes,
        kb,
        cardCount,
      }))
    );
    console.log(
      `Initial page load (summary + collection): ${initialMs}ms, ${initialBytes} bytes (~${Math.round(initialBytes / 1024)} KB)`
    );
    console.log(`Monolith getStudentCardsView (legacy): ${viewMs}ms, ${monolithKb} KB`);
    console.log(`Progress cache DB queries (batched): ${progressCacheQueries}`);
    console.log(`Lock-meta evaluations in memory: ${unownedCards} (was ~${unownedCards * 3} async calls)`);
    console.log(
      `Monolith payload sizes: collection=${view.collection.length}, shop=${view.shop.length}, catalog=${view.catalog.length}, series=${view.seriesProgress.length}, locked=${view.locked.length}`
    );
  } catch (err) {
    console.log(`Split endpoint benchmark skipped: ${err instanceof Error ? err.message : err}`);
  }

  if (!view) {
    view = await loadCardsViewPayload(serviceRole, studentId);
  }

  console.log("\n--- 3) Images loaded per tab (DOM mount, no virtualization) ---");
  const shopThumbUrls = view.shop.map((c) => classifyUrl(c.imageThumbUrl));
  const collectionThumbUrls = view.collection.map((c) => classifyUrl(c.imageThumbUrl));
  const catalogThumbUrls = view.catalog.map((c) => classifyUrl(c.imageThumbUrl));
  const seriesThumbCount = view.seriesProgress.reduce((n, s) => n + (s.cards?.length || 0), 0);

  console.log(`Shop tab: ${view.shop.length} <img> (lazy), thumb types:`, tally(shopThumbUrls));
  console.log(
    `Collection tab: ${view.collection.length} <img> (lazy), thumb types:`,
    tally(collectionThumbUrls)
  );
  console.log(
    `Catalog tab: ${view.catalog.length} <img> (lazy), thumb types:`,
    tally(catalogThumbUrls)
  );
  console.log(`Series tab: ${seriesThumbCount} small thumbs across ${view.seriesProgress.length} series`);

  console.log("\n--- 4) Modal uses display (sample from shop) ---");
  const modalSamples = view.shop.slice(0, 5).map((c) => ({
    cardKey: c.cardKey,
    gridSrc: classifyUrl(c.imageThumbUrl),
    modalSrc: classifyUrl(c.imageDisplayUrl),
    downloadSrc: classifyUrl(c.imageDownloadUrl),
    variantsReady: c.imageVariantsReady,
  }));
  console.table(modalSamples);

  console.log("\n--- 5) Thumb weight sample (network fetch from Supabase) ---");
  const thumbSample = await measureThumbSample(ready, 10);
  console.table(thumbSample);
  const avgThumbKb = Math.round(thumbSample.reduce((s, r) => s + r.kb, 0) / thumbSample.length);
  const avgThumbMs = Math.round(thumbSample.reduce((s, r) => s + r.fetchMs, 0) / thumbSample.length);
  console.log(`Average thumb: ${avgThumbKb} KB, avg fetch ${avgThumbMs}ms (server-side, warm CDN)`);

  console.log("\n--- 6) Display weight sample (modal size) ---");
  const displaySample = await measureDisplaySample(ready, 5);
  console.table(displaySample);
  const avgDisplayKb = Math.round(displaySample.reduce((s, r) => s + r.kb, 0) / displaySample.length);
  const avgDisplayMs = Math.round(displaySample.reduce((s, r) => s + r.fetchMs, 0) / displaySample.length);
  console.log(`Average display: ${avgDisplayKb} KB, avg fetch ${avgDisplayMs}ms`);

  console.log("\n--- 7) Cache headers on processed assets ---");
  const ccUnique = [...new Set(thumbSample.concat(displaySample).map((r) => r.cacheControl))];
  console.log("Cache-Control values seen:", ccUnique.join(" | "));

  console.log("\n--- 8) Cache repeat fetch (same thumb URL twice) ---");
  if (thumbSample.length) {
    const repeatUrl = String(ready[0].image_thumb_url).split("?")[0];
    const r1 = performance.now();
    await fetch(repeatUrl);
    const ms1 = Math.round(performance.now() - r1);
    const r2 = performance.now();
    await fetch(repeatUrl);
    const ms2 = Math.round(performance.now() - r2);
    console.log(`First fetch: ${ms1}ms, second fetch: ${ms2}ms (Node fetch — not browser cache)`);
  }

  console.log("\n--- 9) Service Worker scope (code analysis) ---");
  console.log("- SW intercepts ONLY same-origin paths starting with /rewards/cards/");
  console.log("- Supabase processed URLs (https://...supabase.co/.../processed/...) are NOT intercepted by SW");
  console.log("- Legacy /rewards/cards/*.webp uses network-first in SW (waits for network every time)");
  console.log("- SW pre-caches /, /game, /learning after 3s on production — not student/cards specifically");

  console.log("\n--- 10) Canvas/fallback (code path) ---");
  console.log("- RewardCardImage: canvas ONLY when preBaked=false AND URL not matching /processed/.../");
  console.log("- Shop/collection pass preBaked={imageVariantsReady} + imageThumbUrl");
  console.log("- Modal passes imageDisplayUrl + preBaked + loading=eager");
  console.log("- Download: pre-baked PNG + watermark canvas only when imageVariantsReady=true");

  const notReadyInView = [...view.shop, ...view.collection]
    .filter((c) => !c.imageVariantsReady)
    .slice(0, 5);
  if (notReadyInView.length) {
    console.log("\nWARNING: cards in shop/collection without variants (canvas fallback):");
    console.table(
      notReadyInView.map((c) => ({ cardKey: c.cardKey, thumb: classifyUrl(c.imageThumbUrl) }))
    );
  } else {
    console.log("\nShop + collection cards in view: all have imageVariantsReady=true (no canvas for grid)");
  }

  console.log("\n--- Summary / likely bottlenecks ---");
  const findings = [];
  const summaryBench = splitBenchmarks.find((b) => b.label === "summary");
  const collectionBench = splitBenchmarks.find((b) => b.label === "collection");
  const initialBytes =
    (summaryBench?.bytes || 0) + (collectionBench?.bytes || 0);
  const initialMs = (summaryBench?.ms || 0) + (collectionBench?.ms || 0);

  if (initialBytes > 0 && initialBytes < 644 * 1024) {
    findings.push(
      `Initial load (summary+collection): ${initialBytes} bytes vs monolith ~644 KB`
    );
  }
  if (initialMs > 0 && viewMs != null && initialMs < viewMs) {
    findings.push(`Initial API time ${initialMs}ms vs monolith ${viewMs}ms`);
  }
  if (viewMs != null && viewMs > 800) findings.push(`Monolith getStudentCardsView still slow: ${viewMs}ms (page no longer uses it)`);
  if (progressCacheQueries != null) {
    findings.push(`Progress cache uses ${progressCacheQueries} batched DB queries (was hundreds+ per request)`);
  }
  if (view?.shop?.length > 40) findings.push(`Shop renders ${view.shop.length} images at once (no virtualization)`);
  if (view?.catalog?.length > 80) {
    findings.push(`Catalog renders ${view.catalog.length} images (API still loads full payload)`);
  }
  if (avgDisplayKb > 150) findings.push(`Display images avg ${avgDisplayKb}KB — modal may feel slow on first open`);
  if (avgThumbKb > 40) findings.push(`Thumb images avg ${avgThumbKb}KB — heavier than ideal for grid`);

  if (!findings.length) {
    findings.push("API lock-meta batching applied — re-test in browser for perceived speed");
  }
  findings.forEach((f, i) => console.log(`${i + 1}. ${f}`));

  console.log("\naudit-student-cards-performance: done");
}

function tally(arr) {
  return arr.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
