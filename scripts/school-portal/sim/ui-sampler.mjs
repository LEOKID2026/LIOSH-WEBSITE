/**
 * Phase 2 — Playwright UI sample (12–15 students).
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServiceRole } from "../demo-school-lib.mjs";
import {
  assertStudentCredentialsReady,
  loadStudentCredentialsForIds,
} from "./student-credentials.mjs";
import { defaultBaseUrl, UI_SAMPLE_MIN_PER_GRADE, UI_SAMPLE_SIZE } from "./school-sim-config.mjs";
import { assignPersonaType } from "./persona-model.mjs";
import { pickAnswerForArithmetic, makeRng } from "../../virtual-student-qa/lib/answer-profiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

function gradeFromUsername(username) {
  const m = String(username || "").match(/demo-g(\d)s/);
  return m ? Number(m[1]) : null;
}

function pickUiSampleStudents(state) {
  const studentIds = state.studentIds || [];
  const byGrade = {};
  for (let i = 0; i < studentIds.length; i++) {
    const id = studentIds[i];
    const meta = state.studentsByPhysical;
    let grade = gradeFromUsername(state.studentLogins?.[id]) || null;
    if (!grade && meta && typeof meta === "object") {
      for (const key of Object.keys(meta)) {
        const block = meta[key];
        if (block?.studentIds?.includes(id)) {
          grade = block.grade || 1;
          break;
        }
      }
    }
    if (!grade) grade = (i % 6) + 1;
    if (!byGrade[grade]) byGrade[grade] = [];
    byGrade[grade].push({ studentId: id, index: i, grade });
  }

  const picked = [];
  for (let g = 1; g <= 6; g++) {
    const list = byGrade[g] || [];
    if (list.length) picked.push(list[0]);
  }
  const profiles = state.studentProfiles || {};
  const need = {
    struggling: 2,
    average: 4,
    good: 3,
    excellent: 2,
    inconsistent: 1,
    improving: 1,
  };
  for (const [persona, count] of Object.entries(need)) {
    let added = 0;
    for (let i = 0; i < studentIds.length && added < count; i++) {
      const id = studentIds[i];
      const p = profiles[id] || assignPersonaType(i, studentIds.length);
      if (p !== persona) continue;
      if (picked.some((x) => x.studentId === id)) continue;
      picked.push({ studentId: id, index: i, grade: (i % 6) + 1, persona: p });
      added += 1;
    }
  }
  while (picked.length < UI_SAMPLE_SIZE && picked.length < studentIds.length) {
    const i = picked.length;
    const id = studentIds[i];
    if (!picked.some((x) => x.studentId === id)) {
      picked.push({ studentId: id, index: i, grade: (i % 6) + 1 });
    }
  }
  return picked.slice(0, UI_SAMPLE_SIZE);
}

async function loadCredentials(studentIds) {
  const map = await loadStudentCredentialsForIds(studentIds);
  assertStudentCredentialsReady(studentIds, map);
  const accounts = new Map();
  for (const [studentId, cred] of map) {
    accounts.set(studentId, {
      label: cred.username,
      username: cred.username,
      pin: cred.pin,
    });
  }
  return accounts;
}

/**
 * @returns {Promise<{ manifest, results, pass, fail, partial, total }>}
 */
export async function runUiSample(state, { baseUrl = defaultBaseUrl(), artifactRoot, log = console.log } = {}) {
  const sample = pickUiSampleStudents(state);
  const creds = await loadCredentials(sample.map((s) => s.studentId));

  const { launchBrowser, newStudentContext } = await import(
    pathToFileUrl(path.join(REPO_ROOT, "scripts/virtual-student-qa/lib/browser.mjs"))
  );
  const { authenticateStudent } = await import(
    pathToFileUrl(path.join(REPO_ROOT, "scripts/virtual-student-qa/lib/student-auth.mjs"))
  );
  const { runMathScenario } = await import(
    pathToFileUrl(path.join(REPO_ROOT, "scripts/virtual-student-qa/lib/subject-drivers/math-master.mjs"))
  );

  const browser = await launchBrowser({ headed: false });
  const results = [];
  let pass = 0;
  let fail = 0;
  let partial = 0;

  try {
    for (const entry of sample) {
      const account = creds.get(entry.studentId);
      if (!account) {
        results.push({
          studentId: entry.studentId,
          status: "fail",
          reason: "no student_access_codes row",
        });
        fail += 1;
        continue;
      }

      const context = await newStudentContext(browser);
      const page = await context.newPage();
      const network = [];
      page.on("request", (req) => {
        const u = req.url();
        if (u.includes("/api/learning/")) network.push(u);
      });

      try {
        await authenticateStudent({
          context,
          page,
          account,
          baseUrl,
          mode: "ui",
          log,
        });

        const rng = makeRng((entry.index + 1) * 7919);
        const operation = "addition";
        const scenario = {
          id: `school-sim-${entry.studentId}`,
          subject: "math",
          topic: operation,
          operation,
          grade: entry.grade || 3,
          profile: entry.persona === "struggling" ? "weak" : entry.persona === "excellent" ? "strong" : "average",
          questionCount: 4,
          weaknessTopics: [],
          rng: () => rng,
          pickAnswer: ({ profile, computedAnswer, topicKey, weaknessTopics }) =>
            pickAnswerForArithmetic({
              profile,
              computedAnswer,
              rng,
              topicKey,
              weaknessTopics,
            }),
        };

        await runMathScenario({
          page,
          baseUrl,
          scenario,
          log,
          screenshotter: async (p, name) => {
            if (artifactRoot) {
              const fs = await import("node:fs");
              const shotPath = path.join(artifactRoot, "ui-sample", "screenshots", `${entry.studentId}-${name}.png`);
              try {
                await p.screenshot({ path: shotPath, fullPage: true });
              } catch {
                // ignore
              }
            }
          },
        });

        const hasStart = network.some((u) => u.includes("/api/learning/session/start"));
        const hasFinish = network.some(
          (u) => u.includes("/api/learning/session/finish") || u.includes("session/finish")
        );
        const verdict = hasStart ? (hasFinish ? "pass" : "partial") : "fail";
        if (verdict === "pass") pass += 1;
        else if (verdict === "partial") partial += 1;
        else fail += 1;

        results.push({
          studentId: entry.studentId,
          username: account.username,
          grade: entry.grade,
          status: verdict,
          sessionStartSeen: hasStart,
          sessionFinishSeen: hasFinish,
        });
      } catch (e) {
        fail += 1;
        results.push({
          studentId: entry.studentId,
          status: "fail",
          reason: String(e?.message || e).slice(0, 300),
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  return {
    manifest: sample,
    results,
    pass,
    fail,
    partial,
    total: sample.length,
  };
}

function pathToFileUrl(p) {
  return pathToFileURL(p).href;
}
