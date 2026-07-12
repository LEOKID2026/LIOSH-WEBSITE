/**
 * Regression guard: PWA manifest metadata fields that can surface to parents/children
 * (long-press app icon on Android/iOS, add-to-home-screen prompts) must be in Hebrew.
 * The product "LEO KIDS" brand name (Latin script) is intentional and excluded.
 * Run: node --test tests/pwa/manifest-no-visible-english.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const MANIFEST_FILES = [
  "public/manifest.json",
  "public/manifest-student.webmanifest",
  "public/manifest-parent.webmanifest",
  "public/manifest-teacher.webmanifest",
];

function hasHebrew(str) {
  return /[\u0590-\u05FF]/.test(String(str || ""));
}

describe("PWA manifest description/shortcut metadata is Hebrew, not visible English", () => {
  for (const file of MANIFEST_FILES) {
    test(`${file} description is Hebrew`, () => {
      const manifest = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
      assert.ok(hasHebrew(manifest.description), `${file} description must contain Hebrew text`);
    });

    test(`${file} shortcuts (if any) are Hebrew`, () => {
      const manifest = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
      for (const shortcut of manifest.shortcuts || []) {
        assert.ok(hasHebrew(shortcut.name), `${file} shortcut.name must be Hebrew`);
        assert.ok(hasHebrew(shortcut.short_name), `${file} shortcut.short_name must be Hebrew`);
        assert.ok(hasHebrew(shortcut.description), `${file} shortcut.description must be Hebrew`);
      }
    });
  }
});
