/**
 * Preflight: baseline + env + optional Vercel reachability.
 */
import { assertDemoSchoolBaseline, createServiceRole, requireEnv } from "../demo-school-lib.mjs";
import { DEMO_STUDENT_COUNT } from "./school-sim-config.mjs";
import { ensurePersonaMaps, loadSchoolSimState } from "./longitudinal-state.mjs";
import {
  credentialsArtifactPath,
  loadCredentialsArtifact,
  resolveStaffPassword,
} from "./student-credentials.mjs";

export async function runPreflight({ baseUrl, log = console.log, requireUiCreds = true } = {}) {
  const state = loadSchoolSimState();
  const serviceRole = createServiceRole();

  requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("LEARNING_STUDENT_ACCESS_SECRET");

  const baseline = await assertDemoSchoolBaseline(serviceRole, state, { strict: false });
  log(
    `preflight: baseline counts ${baseline.activeClasses}/${baseline.enrollments}/${baseline.classStudentLinks}` +
      (baseline.ok ? " OK" : ` mismatch: ${baseline.mismatches?.join("; ")}`)
  );

  const studentIds = state.studentIds || [];
  if (studentIds.length < DEMO_STUDENT_COUNT - 5) {
    throw new Error(`preflight: expected ~${DEMO_STUDENT_COUNT} students, got ${studentIds.length}`);
  }

  ensurePersonaMaps(state);

  let httpOk = false;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/`, { redirect: "manual" });
    httpOk = res.status < 500;
    log(`preflight: GET ${baseUrl}/ -> ${res.status}`);
  } catch (e) {
    log(`preflight: GET ${baseUrl}/ failed: ${e?.message || e}`);
  }

  let staffPasswordConfigured = false;
  try {
    resolveStaffPassword();
    staffPasswordConfigured = true;
  } catch {
    log("preflight: staff password env not set");
  }

  let studentCredentialArtifact = null;
  let artCount = 0;
  if (requireUiCreds) {
    const art = loadCredentialsArtifact();
    artCount = art?.students ? Object.keys(art.students).length : 0;
    if (artCount >= 12) {
      studentCredentialArtifact = { path: credentialsArtifactPath(), count: artCount, source: art.source };
      log(`preflight: student credential artifact OK (${artCount} entries)`);
    } else {
      log(
        `preflight: student credential artifact missing or incomplete (${artCount} entries at ${credentialsArtifactPath()})`
      );
    }
  }

  const enoughForUi = artCount >= 12;
  const baselinePass = baseline.ok === true;

  log("--- preflight summary ---");
  log(`staff password found: ${staffPasswordConfigured ? "yes" : "no"}`);
  log(`student credential artifact found: ${studentCredentialArtifact ? "yes" : "no"}`);
  log(`student credentials count: ${artCount}`);
  log(`enough credentials for UI sample (>=12): ${enoughForUi ? "yes" : "no"}`);
  log(
    `baseline 108/398/2388: ${baselinePass ? "pass" : `fail (${baseline.mismatches?.join("; ") || "mismatch"})`}`
  );
  log("-------------------------");

  const passed =
    baselinePass &&
    staffPasswordConfigured &&
    (!requireUiCreds || (studentCredentialArtifact && enoughForUi));

  if (!passed && requireUiCreds) {
    throw new Error("preflight failed — see summary above");
  }

  return {
    passed,
    baseline,
    studentCount: studentIds.length,
    httpOk,
    schoolId: state.schoolId,
    staffPasswordConfigured,
    studentCredentialArtifact,
    enoughForUi,
    baselinePass,
  };
}
