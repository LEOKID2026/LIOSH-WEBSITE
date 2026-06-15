/**
 * Phase 6 — production hard-stop + dry-run defaults for DB-mutating scripts.
 * Do not rely on NODE_ENV alone when Supabase URL points at a remote project.
 */

export const SUPABASE_URL_ENV_NAMES = [
  "NEXT_PUBLIC_LEARNING_SUPABASE_URL",
  "SUPABASE_URL",
];

export const PRODUCTION_HOST_BLOCKLIST = [
  "leok.co.il",
  "www.leok.co.il",
  "liosh.com",
  "www.liosh.com",
  "liosh-website.vercel.app",
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function splitRefs(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function redactUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}/***`;
  } catch {
    return "(invalid-url)";
  }
}

export function resolveSupabaseTarget(env = process.env) {
  let url = "";
  for (const name of SUPABASE_URL_ENV_NAMES) {
    const candidate = String(env[name] || "").trim();
    if (candidate) {
      url = candidate;
      break;
    }
  }

  if (!url) {
    return {
      url: "",
      host: "",
      projectRef: "",
      redactedUrl: "(missing)",
      missingEnv: true,
    };
  }

  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return {
      url,
      host: "",
      projectRef: "",
      redactedUrl: redactUrl(url),
      invalidUrl: true,
    };
  }

  let projectRef = "";
  const supabaseHostMatch = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (supabaseHostMatch) {
    projectRef = supabaseHostMatch[1].toLowerCase();
  }

  return {
    url,
    host,
    projectRef,
    redactedUrl: redactUrl(url),
  };
}

export function classifyScriptEnvironment(target, env = process.env) {
  const host = String(target?.host || "").toLowerCase();
  const projectRef = String(target?.projectRef || "").toLowerCase();
  const productionRefs = splitRefs(env.LEARNING_PRODUCTION_PROJECT_REFS);
  const stagingRefs = splitRefs(env.LEARNING_STAGING_PROJECT_REFS);
  const scriptTarget = String(env.SCRIPT_TARGET || env.LEARNING_SCRIPT_TARGET || "")
    .trim()
    .toLowerCase();

  if (!host && target?.missingEnv) return "unknown";
  if (LOCAL_HOSTS.has(host)) return "local";

  if (scriptTarget === "staging") return "staging";
  if (scriptTarget === "local") return "local";
  if (projectRef && stagingRefs.includes(projectRef)) return "staging";
  if (host.includes("staging")) return "staging";

  if (env.VERCEL_ENV === "production") return "production";
  if (projectRef && productionRefs.includes(projectRef)) return "production";
  for (const blocked of PRODUCTION_HOST_BLOCKLIST) {
    if (host === blocked || host.endsWith(`.${blocked}`)) return "production";
  }

  if (host.endsWith(".supabase.co")) {
    return "production";
  }

  return "staging";
}

export function parseScriptArgv(argv = [], { defaultDryRun = true } = {}) {
  const flags = new Set(argv.filter((a) => a.startsWith("-")));
  const hasDryRunFlag = flags.has("--dry-run");
  const hasWriteFlag = flags.has("--write");
  const verifyOnly = flags.has("--verify-only");
  const preflightOnly = flags.has("--preflight-only");
  const cleanOnly = flags.has("--clean-only");

  let dryRun = defaultDryRun;
  if (hasDryRunFlag) dryRun = true;
  if (hasWriteFlag) dryRun = false;

  const envDryRun = String(process.env.DRY_RUN ?? "").trim().toLowerCase();
  if (envDryRun === "1" || envDryRun === "true" || envDryRun === "yes") dryRun = true;
  if (envDryRun === "0" || envDryRun === "false" || envDryRun === "no") dryRun = false;

  const readOnly = verifyOnly || preflightOnly;
  return { dryRun, verifyOnly, preflightOnly, cleanOnly, readOnly, hasWriteFlag, hasDryRunFlag };
}

export class ProductionScriptGuardError extends Error {
  constructor(message, code = "PRODUCTION_GUARD_BLOCKED") {
    super(message);
    this.name = "ProductionScriptGuardError";
    this.code = code;
  }
}

export function formatScriptVerdict({ artifactOnly = false, passed = true } = {}) {
  if (artifactOnly) return passed ? "ARTIFACT_VERIFY" : "ARTIFACT_VERIFY_FAIL";
  return passed ? "PASS" : "FAIL";
}

/**
 * @param {{
 *   scriptName: string,
 *   confirmOperation: string,
 *   affectedTables?: string[],
 *   defaultDryRun?: boolean,
 *   argv?: string[],
 *   artifactPath?: string,
 * }} options
 */
export function createProductionScriptGuard(options) {
  const {
    scriptName,
    confirmOperation,
    affectedTables = [],
    defaultDryRun = true,
    argv = process.argv.slice(2),
    artifactPath = "",
  } = options;

  const target = resolveSupabaseTarget();
  const environment = classifyScriptEnvironment(target);
  const mode = parseScriptArgv(argv, { defaultDryRun });
  const isProduction = environment === "production";
  const tables = [...new Set(affectedTables.filter(Boolean))];

  const summary = {
    affectedRows: 0,
    skippedRows: 0,
    errors: [],
    artifactPath: artifactPath || "",
  };

  function fail(message, code = "PRODUCTION_GUARD_BLOCKED") {
    throw new ProductionScriptGuardError(message, code);
  }

  function assertWriteAllowed() {
    if (mode.readOnly) return;
    if (target.missingEnv) {
      fail(
        `Refusing ${scriptName}: missing Supabase URL (${SUPABASE_URL_ENV_NAMES.join(" or ")}).`,
        "MISSING_SUPABASE_URL"
      );
    }
    if (target.invalidUrl) {
      fail(`Refusing ${scriptName}: invalid Supabase URL.`, "INVALID_SUPABASE_URL");
    }
    if (mode.dryRun) return;

    if (!isProduction) return;

    const allow = String(process.env.ALLOW_PRODUCTION_WRITE || "").trim() === "true";
    const confirmRef = String(process.env.CONFIRM_PROJECT_REF || "").trim().toLowerCase();
    const confirmOp = String(process.env.CONFIRM_OPERATION || "").trim();

    if (!allow) {
      fail(
        `${scriptName}: production write blocked. Set ALLOW_PRODUCTION_WRITE=true with CONFIRM_PROJECT_REF and CONFIRM_OPERATION to override.`,
        "PRODUCTION_WRITE_BLOCKED"
      );
    }
    if (!target.projectRef || confirmRef !== target.projectRef) {
      fail(
        `${scriptName}: CONFIRM_PROJECT_REF must equal target project ref "${target.projectRef || "(unknown)"}" (got "${confirmRef || "(empty)"}").`,
        "CONFIRM_PROJECT_REF_MISMATCH"
      );
    }
    if (confirmOp !== confirmOperation) {
      fail(
        `${scriptName}: CONFIRM_OPERATION must equal "${confirmOperation}" (got "${confirmOp || "(empty)"}").`,
        "CONFIRM_OPERATION_MISMATCH"
      );
    }
  }

  function printStartBanner(extra = {}) {
    const writeMode = mode.readOnly ? "read-only" : mode.dryRun ? "dry-run" : "write";
    console.log(`[production-guard] script=${scriptName}`);
    console.log(`[production-guard] target=${target.redactedUrl} projectRef=${target.projectRef || "(n/a)"}`);
    console.log(`[production-guard] environment=${environment}`);
    console.log(`[production-guard] mode=${writeMode}`);
    console.log(`[production-guard] affectedTables=${tables.length ? tables.join(", ") : "(none declared)"}`);
    if (extra.note) console.log(`[production-guard] note=${extra.note}`);
    if (isProduction && !mode.dryRun && !mode.readOnly) {
      console.log("[production-guard] WARNING: production write path — triple confirmation required");
    }
  }

  function printEndSummary(overrides = {}) {
    const out = { ...summary, ...overrides };
    console.log("[production-guard] --- run summary ---");
    console.log(`[production-guard] affectedRows=${out.affectedRows}`);
    console.log(`[production-guard] skippedRows=${out.skippedRows}`);
    console.log(`[production-guard] errors=${out.errors.length ? out.errors.join(" | ") : "(none)"}`);
    console.log(`[production-guard] artifactPath=${out.artifactPath || "(none)"}`);
    if (mode.dryRun && !mode.readOnly) {
      console.log("[production-guard] dry-run: no database writes were performed");
    }
  }

  function recordAffected(count = 1) {
    summary.affectedRows += Math.max(0, Number(count) || 0);
  }

  function recordSkipped(count = 1) {
    summary.skippedRows += Math.max(0, Number(count) || 0);
  }

  function recordError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(msg);
  }

  function setArtifactPath(p) {
    summary.artifactPath = String(p || "");
  }

  return {
    target,
    environment,
    isProduction,
    isDryRun: mode.dryRun,
    isReadOnly: mode.readOnly,
    mode,
    tables,
    summary,
    assertWriteAllowed,
    printStartBanner,
    printEndSummary,
    recordAffected,
    recordSkipped,
    recordError,
    setArtifactPath,
    formatVerdict: (passed = true, { artifactOnly = false } = {}) =>
      formatScriptVerdict({ artifactOnly, passed }),
  };
}

export function exitOnGuardError(err) {
  if (err instanceof ProductionScriptGuardError) {
    console.error(`[production-guard] BLOCKED: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
