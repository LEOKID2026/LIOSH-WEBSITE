/**
 * Worksheets SEO page — H1, meta, גאומטריה spelling, unified layout.
 * Run: node --test tests/worksheets/worksheets-seo-page-qa.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getWorksheetsPageContent } from "../../data/seo/worksheets-pages.he.js";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he.js";
import { SEO_PUBLIC_PATHS } from "../../lib/seo/seo-public-paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("worksheets-seo-page-qa", () => {
  test("worksheets page exists with single H1 in content", () => {
    const content = getWorksheetsPageContent();
    assert.ok(content.h1.length > 10);
    assert.equal(content.seoKey, "practice-worksheets");
    assert.ok(content.sections.length >= 4);
    assert.ok(content.faq.length >= 4);
  });

  test("SEO entry and sitemap include /practice/worksheets only", () => {
    const seo = getPublicPageSeo("practice-worksheets");
    assert.equal(seo.canonicalPath, "/practice/worksheets");
    assert.ok(seo.title.includes("דפי עבודה"));
    assert.ok(SEO_PUBLIC_PATHS.includes("/practice/worksheets"));

    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    assert.match(sitemap, /\/practice\/worksheets<\/loc>/);
    assert.doesNotMatch(sitemap, /\/practice\/worksheets\/preview/);
  });

  test("גאומטריה spelling - not גיאומטריה", () => {
    const files = [
      "data/seo/worksheets-pages.he.js",
      "components/seo/PracticeSeoLandingPage.jsx",
      "components/seo/PublicSeoWideLayout.jsx",
      "lib/site/public-page-seo.he.js",
    ];
    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.doesNotMatch(src, /גיאומטריה/, rel);
      if (rel.includes("worksheets-pages")) {
        assert.match(src, /גאומטריה/);
      }
    }
  });

  test("landing page uses unified PracticeSeoLandingPage wrapper", () => {
    const src = readFileSync(join(ROOT, "pages/practice/worksheets/index.js"), "utf8");
    assert.match(src, /PracticeSeoLandingPage/);
    assert.match(src, /getWorksheetsPageContent/);
    assert.doesNotMatch(src, /WorksheetsSeoLandingPage/);
  });

  test("unified public SEO wide layout exists", () => {
    const layout = readFileSync(join(ROOT, "components/seo/PublicSeoWideLayout.jsx"), "utf8");
    assert.match(layout, /PublicSeoWideLayout/);
    assert.match(layout, /public-seo-wide-layout/);
    const practice = readFileSync(join(ROOT, "components/seo/PracticeSeoLandingPage.jsx"), "utf8");
    assert.match(practice, /PublicSeoWideLayout/);
    assert.match(practice, /PublicSeoWorksheetsHubSlot/);
    const guide = readFileSync(join(ROOT, "components/seo/GuideSeoArticlePage.jsx"), "utf8");
    assert.match(guide, /PublicSeoWideLayout/);
  });
});
