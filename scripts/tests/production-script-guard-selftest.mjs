#!/usr/bin/env node
/**
 * Phase 6 — production script guard unit tests (no DB access).
 */
import assert from "node:assert/strict";
import {
  ProductionScriptGuardError,
  classifyScriptEnvironment,
  createProductionScriptGuard,
  formatScriptVerdict,
  parseScriptArgv,
  resolveSupabaseTarget,
} from "../lib/production-script-guard.mjs";

function withEnv(overrides, fn) {
  const backup = {};
  for (const [key, value] of Object.entries(overrides)) {
    backup[key] = process.env[key];
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

function testResolveTarget() {
  const target = resolveSupabaseTarget({
    NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://abcstaging123.supabase.co",
  });
  assert.equal(target.projectRef, "abcstaging123");
  assert.match(target.redactedUrl, /\/\*\*\*$/);
}

function testProductionClassificationByRemoteSupabase() {
  const target = resolveSupabaseTarget({
    NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://prodproject.supabase.co",
  });
  const env = classifyScriptEnvironment(target, {});
  assert.equal(env, "production");
}

function testStagingClassificationByExplicitRef() {
  const target = resolveSupabaseTarget({
    NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://mystagingref.supabase.co",
  });
  const env = classifyScriptEnvironment(target, {
    LEARNING_STAGING_PROJECT_REFS: "mystagingref",
  });
  assert.equal(env, "staging");
}

function testLocalClassification() {
  const target = resolveSupabaseTarget({
    NEXT_PUBLIC_LEARNING_SUPABASE_URL: "http://127.0.0.1:54321",
  });
  assert.equal(classifyScriptEnvironment(target, {}), "local");
}

function testDefaultDryRun() {
  const mode = parseScriptArgv([], { defaultDryRun: true });
  assert.equal(mode.dryRun, true);
  const writeMode = parseScriptArgv(["--write"], { defaultDryRun: true });
  assert.equal(writeMode.dryRun, false);
}

function testProductionWriteBlockedWithoutApproval() {
  withEnv(
    {
      NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://prodref.supabase.co",
      ALLOW_PRODUCTION_WRITE: "",
      CONFIRM_PROJECT_REF: "",
      CONFIRM_OPERATION: "",
    },
    () => {
      const guard = createProductionScriptGuard({
        scriptName: "test-script",
        confirmOperation: "TEST_OPERATION",
        affectedTables: ["answers"],
        defaultDryRun: false,
        argv: ["--write"],
      });
      assert.throws(() => guard.assertWriteAllowed(), ProductionScriptGuardError);
    }
  );
}

function testProductionWriteBlockedWithWrongConfirm() {
  withEnv(
    {
      NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://prodref.supabase.co",
      ALLOW_PRODUCTION_WRITE: "true",
      CONFIRM_PROJECT_REF: "wrongref",
      CONFIRM_OPERATION: "TEST_OPERATION",
    },
    () => {
      const guard = createProductionScriptGuard({
        scriptName: "test-script",
        confirmOperation: "TEST_OPERATION",
        defaultDryRun: false,
        argv: ["--write"],
      });
      assert.throws(() => guard.assertWriteAllowed(), /CONFIRM_PROJECT_REF/);
    }
  );
}

function testProductionWriteAllowedWithTripleConfirm() {
  withEnv(
    {
      NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://prodref.supabase.co",
      ALLOW_PRODUCTION_WRITE: "true",
      CONFIRM_PROJECT_REF: "prodref",
      CONFIRM_OPERATION: "TEST_OPERATION",
    },
    () => {
      const guard = createProductionScriptGuard({
        scriptName: "test-script",
        confirmOperation: "TEST_OPERATION",
        defaultDryRun: false,
        argv: ["--write"],
      });
      assert.doesNotThrow(() => guard.assertWriteAllowed());
    }
  );
}

function testDryRunSkipsWriteAssertionOnProduction() {
  withEnv(
    {
      NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://prodref.supabase.co",
    },
    () => {
      const guard = createProductionScriptGuard({
        scriptName: "test-script",
        confirmOperation: "TEST_OPERATION",
        defaultDryRun: true,
        argv: [],
      });
      assert.doesNotThrow(() => guard.assertWriteAllowed());
      assert.equal(guard.isDryRun, true);
    }
  );
}

function testStagingWriteAllowedWithoutProductionTripleConfirm() {
  withEnv(
    {
      NEXT_PUBLIC_LEARNING_SUPABASE_URL: "https://stagingref.supabase.co",
      LEARNING_STAGING_PROJECT_REFS: "stagingref",
    },
    () => {
      const guard = createProductionScriptGuard({
        scriptName: "test-script",
        confirmOperation: "TEST_OPERATION",
        defaultDryRun: false,
        argv: ["--write"],
      });
      assert.doesNotThrow(() => guard.assertWriteAllowed());
      assert.equal(guard.isProduction, false);
    }
  );
}

function testArtifactVerdictLabel() {
  assert.equal(formatScriptVerdict({ artifactOnly: true, passed: true }), "ARTIFACT_VERIFY");
  assert.equal(formatScriptVerdict({ artifactOnly: false, passed: true }), "PASS");
}

function main() {
  const tests = [
    ["resolve target", testResolveTarget],
    ["production by remote supabase", testProductionClassificationByRemoteSupabase],
    ["staging by explicit ref", testStagingClassificationByExplicitRef],
    ["local host", testLocalClassification],
    ["default dry-run argv", testDefaultDryRun],
    ["production blocked without approval", testProductionWriteBlockedWithoutApproval],
    ["production blocked wrong confirm", testProductionWriteBlockedWithWrongConfirm],
    ["production allowed triple confirm", testProductionWriteAllowedWithTripleConfirm],
    ["dry-run skips production write gate", testDryRunSkipsWriteAssertionOnProduction],
    ["staging write without triple confirm", testStagingWriteAllowedWithoutProductionTripleConfirm],
    ["artifact verdict label", testArtifactVerdictLabel],
  ];

  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      console.log(`PASS ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${name}:`, err?.message || err);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} guard test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} production-script-guard tests passed`);
}

main();
