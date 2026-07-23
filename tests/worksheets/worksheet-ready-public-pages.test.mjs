/**
 * Ready worksheet public landing pages — SEO, paths, uniqueness.
 * Run: node --test tests/worksheets/worksheet-ready-public-pages.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { READY_WORKSHEET_CATALOG } from "../../lib/worksheets/worksheet-ready-catalog.js";
import {
  buildReadyWorksheetPublicPageMeta,
  listReadyWorksheetPublicPaths,
  readyWorksheetPublicPath,
} from "../../lib/worksheets/worksheet-ready-public-page.server.js";
import { CANONICAL_PUBLIC_SITE_ORIGIN } from "../../lib/site/canonical-public-site-origin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("worksheet-ready-public-pages", () => {
  test("every catalog entry has a unique public path and SEO fields", () => {
    const paths = new Set();
    const titles = new Set();
    const slugs = new Set();

    for (const entry of READY_WORKSHEET_CATALOG) {
      const page = buildReadyWorksheetPublicPageMeta(entry);
      assert.ok(page.h1.length > 8, entry.slug);
      assert.ok(page.seoTitle.includes("LEO KIDS"), entry.slug);
      assert.ok(page.seoDescription.length > 40, entry.slug);
      assert.ok(page.shortDescription.length > 20, entry.slug);
      assert.ok(page.learningGoals.length >= 3, entry.slug);
      assert.ok(page.relatedWorksheetSlugs.length >= 1, entry.slug);
      assert.equal(page.canonicalPath, readyWorksheetPublicPath(entry.slug));

      assert.ok(!slugs.has(entry.slug), `duplicate slug ${entry.slug}`);
      slugs.add(entry.slug);

      assert.ok(!paths.has(page.canonicalPath), `duplicate path ${page.canonicalPath}`);
      paths.add(page.canonicalPath);

      assert.ok(!titles.has(page.seoTitle), `duplicate title ${page.seoTitle}`);
      titles.add(page.seoTitle);
    }

    assert.equal(paths.size, 35);
    assert.equal(listReadyWorksheetPublicPaths().length, 35);
  });

  test("sitemap includes all ready worksheet public paths and excludes preview", () => {
    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    for (const path of listReadyWorksheetPublicPaths()) {
      assert.match(
        sitemap,
        new RegExp(`<loc>${CANONICAL_PUBLIC_SITE_ORIGIN.replace(/\./g, "\\.")}${path}</loc>`),
        `missing ${path}`
      );
    }
    assert.doesNotMatch(sitemap, /\/practice\/worksheets\/preview/);
  });

  test("catalog cards link to public landing pages for question worksheets", () => {
    const src = readFileSync(
      join(ROOT, "components/worksheets/ReadyWorksheetsTab.jsx"),
      "utf8"
    );
    assert.match(src, /readyWorksheetPublicPath/);
    assert.match(src, /worksheet-ready-card-link/);
  });

  test("preview route remains noindex in source", () => {
    const preview = readFileSync(join(ROOT, "pages/practice/worksheets/preview.js"), "utf8");
    const answers = readFileSync(
      join(ROOT, "pages/practice/worksheets/preview/answers.js"),
      "utf8"
    );
    assert.match(preview, /noindex/);
    assert.match(answers, /noindex/);
  });
});
