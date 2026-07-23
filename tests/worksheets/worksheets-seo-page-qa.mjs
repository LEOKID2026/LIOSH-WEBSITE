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
    assert.ok(content.stats.length === 4);
    assert.ok(content.faq.length >= 6);
    assert.ok(content.generator.h2.length > 5);
    assert.ok(content.ready.h2.length > 5);
  });

  test("SEO entry and sitemap include /practice/worksheets and ready worksheet pages", () => {
    const seo = getPublicPageSeo("practice-worksheets");
    assert.equal(seo.canonicalPath, "/practice/worksheets");
    assert.equal(
      seo.title,
      "דפי עבודה לילדים להדפסה לפי כיתה ומקצוע | LEO KIDS"
    );
    assert.equal(
      seo.description,
      "צרו דפי עבודה לילדים לפי כיתה ומקצוע, בחרו מתוך 35 דפים מוכנים, פתחו דפי תשובות ושלבו תרגול במתמטיקה, גאומטריה, עברית ואנגלית."
    );
    assert.ok(SEO_PUBLIC_PATHS.includes("/practice/worksheets"));
    assert.ok(SEO_PUBLIC_PATHS.includes("/practice/worksheets/math-g1-addition-horizontal-regular"));

    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    assert.match(sitemap, /\/practice\/worksheets<\/loc>/);
    assert.match(
      sitemap,
      /\/practice\/worksheets\/math-g1-addition-horizontal-regular<\/loc>/
    );
    assert.doesNotMatch(sitemap, /\/practice\/worksheets\/preview/);
  });

  test("גאומטריה spelling - not גיאומטריה", () => {
    const files = [
      "data/seo/worksheets-pages.he.js",
      "components/seo/WorksheetsSeoLandingPage.jsx",
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

  test("landing page uses dedicated WorksheetsSeoLandingPage wrapper", () => {
    const src = readFileSync(join(ROOT, "pages/practice/worksheets/index.js"), "utf8");
    assert.match(src, /WorksheetsSeoLandingPage/);
    assert.match(src, /getWorksheetsPageContent/);
    assert.doesNotMatch(src, /PracticeSeoLandingPage/);
  });

  test("unified public SEO wide layout exists", () => {
    const layout = readFileSync(join(ROOT, "components/seo/PublicSeoWideLayout.jsx"), "utf8");
    assert.match(layout, /PublicSeoWideLayout/);
    assert.match(layout, /public-seo-wide-layout/);
    const worksheets = readFileSync(join(ROOT, "components/seo/WorksheetsSeoLandingPage.jsx"), "utf8");
    assert.match(worksheets, /PublicSeoWideLayout/);
    assert.match(worksheets, /PublicSeoWorksheetsHubSlot/);
    const guide = readFileSync(join(ROOT, "components/seo/GuideSeoArticlePage.jsx"), "utf8");
    assert.match(guide, /PublicSeoWideLayout/);
  });
});
