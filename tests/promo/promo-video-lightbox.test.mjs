#!/usr/bin/env node
/**
 * Source contract: promo videos use shared lightbox; login pages stay video-free.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const studentPromo = read("components/student/StudentPromoVideo.jsx");
const parentPromo = read("components/parent/ParentPromoVideo.jsx");
const clickable = read("components/promo/PromoVideoClickablePreview.jsx");
const modal = read("components/promo/PromoVideoModal.jsx");
const studentLogin = read("pages/student/login.js");
const parentLogin = read("pages/parent/login.js");
const indexPage = read("pages/index.js");
const marketing = read("components/marketing/MarketingLandingPage.jsx");

assert.match(studentPromo, /PromoVideoClickablePreview/);
assert.match(parentPromo, /PromoVideoClickablePreview/);
assert.doesNotMatch(studentPromo, /<video[^>]*controls/);
assert.doesNotMatch(parentPromo, /<video[^>]*controls/);

assert.match(clickable, /PromoVideoModal/);
assert.match(clickable, /role="button"/);
assert.match(modal, /promo-video-modal/);
assert.match(modal, /Escape/);
assert.match(modal, /controls/);
assert.match(modal, /aspect-video/);

assert.doesNotMatch(studentLogin, /StudentPromoVideo|ParentPromoVideo/);
assert.doesNotMatch(parentLogin, /StudentPromoVideo|ParentPromoVideo/);

assert.match(indexPage, /HomeParentVideo/);
assert.match(indexPage, /HomeKidsSection/);
const homeParentVideo = read("components/home/HomeParentVideo.jsx");
const homeKidsSection = read("components/home/HomeKidsSection.jsx");
assert.match(homeParentVideo, /ParentPromoVideo/);
assert.match(homeKidsSection, /StudentPromoVideo/);
assert.match(marketing, /audience === "kids"/);
assert.match(marketing, /StudentPromoVideo/);
assert.match(marketing, /audience === "parents"/);
assert.match(marketing, /ParentPromoVideo/);

console.log("promo-video-lightbox.test: passed");
