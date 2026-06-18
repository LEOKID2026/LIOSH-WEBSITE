/**
 * Spot-check: English typing path under practice-only guards.
 * Run after gate smoke when english scenario used grade≤3 (MCQ-only topics).
 */
import { launchBrowser, newStudentContext } from "../lib/browser.mjs";
import {
  loadAccounts,
  selectAccount,
  resolveBaseUrl,
  resolveStudentAuthMode,
} from "../lib/config.mjs";
import { authenticateStudent } from "../lib/student-auth.mjs";
import { runEnglishScenario } from "../lib/subject-drivers/english-master.mjs";
import { makeRng } from "../lib/answer-profiles.mjs";

const log = (line) => console.log(line);

async function main() {
  const baseUrl = resolveBaseUrl("");
  const account = selectAccount(loadAccounts(), "AAA1");
  const browser = await launchBrowser({ headed: false });
  const context = await newStudentContext(browser);
  const page = await context.newPage();
  try {
    await authenticateStudent({
      context,
      page,
      account,
      baseUrl,
      mode: resolveStudentAuthMode(),
      log,
    });
    const rng = makeRng(0xb1c0ee);
    const result = await runEnglishScenario({
      page,
      baseUrl,
      scenario: {
        grade: 4,
        topic: null,
        questionCount: 4,
        intendedMinutes: 3,
        inSessionPacingEnabled: true,
        profile: "strong",
        weaknessTopics: [],
        rng: () => rng,
        pickAnswer: () => ({ value: "x", intendedCorrect: false }),
      },
      log,
      screenshotter: async () => {},
    });
    const shapes = result?.shapeCounts || {};
    const ev = result?.evidence || {};
    console.log("\n=== ENGLISH TYPING SPOT-CHECK ===");
    console.log(
      `session.mode=${ev.sessionMode} gameMode=practice shapes=${JSON.stringify(shapes)} ` +
        `countable=${ev.countableAnswers} excluded=${ev.excludedAnswers}`
    );
    if (!shapes.typing || shapes.typing < 1) {
      console.log("verdict=SKIP (no typing questions drawn — MCQ-only session)");
      process.exit(0);
    }
    const ok =
      ev.sessionMode === "practice" &&
      (ev.countableAnswers || 0) + (ev.excludedAnswers || 0) >= shapes.typing;
    console.log(`verdict=${ok ? "PASS" : "FAIL"}`);
    process.exit(ok ? 0 : 1);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
