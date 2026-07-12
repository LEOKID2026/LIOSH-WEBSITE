#!/usr/bin/env node
/**
 * Student ad placeholder readiness — ENV-driven mode, no external provider, no PII props, no new slots.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveStudentAdRenderMode,
  resolveStudentAdRenderModeFromEnv,
  resolveStudentAdRenderModeWithConsent,
  STUDENT_AD_ENV,
  STUDENT_AD_POLICY,
} from "../../lib/student-ui/student-ad-config.client.js";
import {
  findForbiddenStudentAdProps,
  sanitizeStudentAdProps,
} from "../../lib/student-ui/student-ad-props.client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function withEnv(overrides, fn) {
  const backup = {};
  for (const key of Object.keys(overrides)) {
    backup[key] = process.env[key];
    const value = overrides[key];
    if (value == null || value === "") delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(backup)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function testDefaultModeIsPlaceholder() {
  assert.equal(resolveStudentAdRenderMode(), "placeholder");
}

function testEnvKeyDocumented() {
  assert.equal(STUDENT_AD_ENV.EXTERNAL_ENABLED, "NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED");
}

function testProductionRequiresExplicitEnvForExternal() {
  assert.equal(
    resolveStudentAdRenderModeFromEnv({ NODE_ENV: "production" }),
    "placeholder",
  );
  assert.equal(
    resolveStudentAdRenderModeFromEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED: "true",
    }),
    "external",
  );
  assert.equal(
    resolveStudentAdRenderModeWithConsent(
      {
        NODE_ENV: "production",
        NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED: "true",
      },
      { adsConsentGranted: false },
    ),
    "placeholder",
  );
  assert.equal(
    resolveStudentAdRenderModeFromEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED: "false",
    }),
    "placeholder",
  );
}

function testDevelopmentHardLockBlocksExternalEvenWithMisconfiguredEnv() {
  const misconfigured = {
    NODE_ENV: "development",
    NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED: "true",
  };
  assert.equal(resolveStudentAdRenderModeFromEnv(misconfigured), "placeholder");

  withEnv(
    {
      NODE_ENV: "development",
      NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED: "true",
    },
    () => {
      assert.equal(resolveStudentAdRenderMode(), "placeholder");
    },
  );
}

function testConfigHasNoHardcodedExternalToggle() {
  const src = read("lib/student-ui/student-ad-config.js");
  assert.doesNotMatch(src, /STUDENT_AD_RENDER_MODE\s*=\s*["']external["']/);
  assert.match(src, /NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED/);
  assert.match(src, /NODE_ENV\s*!==\s*["']production["']/);
}

function testChildSafePolicy() {
  assert.equal(STUDENT_AD_POLICY.childSafe, true);
  assert.equal(STUDENT_AD_POLICY.personalized, false);
}

function testForbiddenPropsAreStripped() {
  const dirty = {
    variant: "layout",
    theme: "bright",
    dataAdSlot: "test-slot",
    studentId: "abc-123",
    email: "kid@example.com",
    grade: "4",
    subject: "math",
    score: 90,
    MB: 12,
  };
  const found = findForbiddenStudentAdProps(dirty);
  assert.ok(found.includes("studentId"));
  assert.ok(found.includes("email"));
  assert.ok(found.includes("MB"));

  const clean = sanitizeStudentAdProps(dirty);
  assert.deepEqual(clean, {
    variant: "layout",
    theme: "bright",
    dataAdSlot: "test-slot",
  });
  assert.equal("studentId" in clean, false);
  assert.equal("email" in clean, false);
}

function testNoExternalAdScriptsInAdComponents() {
  const files = [
    "components/student/StudentAdSlot.jsx",
    "components/student/StudentAdPlaceholder.jsx",
    "components/student/StudentExternalAdHost.jsx",
    "lib/student-ui/student-ad-config.js",
    "lib/student-ui/student-ad-config.client.js",
    "lib/student-ui/student-ad-props.client.js",
    "lib/student-ui/student-ad-slot.client.js",
  ];
  const forbidden = [
    /googlesyndication/i,
    /pagead2/i,
    /doubleclick/i,
    /adsense/i,
    /<script/i,
    /createElement\s*\(\s*["']script["']/i,
  ];
  for (const rel of files) {
    const src = read(rel);
    for (const pattern of forbidden) {
      assert.match(
        src,
        new RegExp(`^(?!.*${pattern.source}).*$`, "ims"),
        `${rel} must not contain external ad script patterns (${pattern})`,
      );
    }
  }
}

function testExternalHostDoesNotLoadProvider() {
  const src = read("components/student/StudentExternalAdHost.jsx");
  assert.doesNotMatch(src, /useEffect/i);
  assert.doesNotMatch(src, /import\s+Script/i);
  assert.match(src, /data-ad-mount="external-provider"/);
}

function testKnownPlaceholderFilesOnly() {
  const allowedFiles = new Set([
    "components/Layout.js",
    "components/learning/LearningMasterAdSlot.jsx",
    "components/student/StudentImmersiveAdPage.jsx",
    "components/solo-games/SoloGameAdSlot.jsx",
    "components/solo-games/SoloGameShell.jsx",
    "components/solo-games/engines/MleoPicturePuzzleEngine.jsx",
    "components/learning-book/LearningBookShell.js",
    "components/learning-book/MathG1BookShell.js",
    "components/learning-book/MathG2BookShell.js",
    "components/learning-book/MathG3BookShell.js",
    "components/learning-book/MathG4BookShell.js",
    "components/learning-book/MathG5BookShell.js",
    "components/learning-book/MathG6BookShell.js",
    "components/arcade/chess/ChessScreen.js",
    "components/arcade/checkers/CheckersScreen.js",
    "components/arcade/dominoes/DominoesScreen.js",
    "components/arcade/fourline/FourlineScreen.js",
    "components/arcade/ludo/LudoScreen.js",
    "components/arcade/snakes-ladders/SnakesLaddersScreen.js",
    "components/arcade/bingo/ArcadeBingoScreen.js",
    "components/arcade/placeholder/ArcadePlaceholderScreen.js",
    "pages/learning/math-master.js",
    "pages/learning/english-master.js",
    "pages/learning/hebrew-master.js",
    "pages/learning/science-master.js",
    "pages/learning/history-master.js",
    "pages/learning/geometry-master.js",
    "pages/learning/moledet-geography-master.js",
    "pages/learning/curriculum.js",
    "pages/learning/geometry-curriculum.js",
    "pages/offline/memory-match.js",
    "pages/offline/tic-tac-toe.js",
    "pages/offline/tap-battle.js",
    "pages/offline/rock-paper-scissors.js",
    // Owner-approved parent-report ad placeholder (product decision — see
    // docs/reports/final-launch-fixes-2026-07-13/fix-report.md, "Product-Approved" section).
    "components/student/StudentFixedBottomAdChrome.jsx",
  ]);

  const usagePattern =
    /<(StudentAdSlot|LearningMasterAdSlot|StudentImmersiveAdPage|SoloGameAdSlot)\b/;
  const dirs = ["components", "pages"];
  const offenders = [];

  for (const dir of dirs) {
    walk(path.join(ROOT, dir), (file) => {
      if (!/\.(jsx?|tsx?)$/.test(file)) return;
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      const src = fs.readFileSync(file, "utf8");
      if (!usagePattern.test(src)) return;
      if (!allowedFiles.has(rel)) offenders.push(rel);
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `unexpected ad slot usage in: ${offenders.join(", ") || "(none)"}`,
  );
  assert.equal(allowedFiles.size, 35, "baseline allowlist size");
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tmp" || entry.name === "node_modules") continue;
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

testDefaultModeIsPlaceholder();
testEnvKeyDocumented();
testProductionRequiresExplicitEnvForExternal();
testDevelopmentHardLockBlocksExternalEvenWithMisconfiguredEnv();
testConfigHasNoHardcodedExternalToggle();
testChildSafePolicy();
testForbiddenPropsAreStripped();
testNoExternalAdScriptsInAdComponents();
testExternalHostDoesNotLoadProvider();
testKnownPlaceholderFilesOnly();

console.log("student-ad-readiness: all checks passed");
