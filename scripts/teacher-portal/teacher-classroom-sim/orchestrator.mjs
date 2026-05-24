/**
 * Playwright orchestrator — real UI learning flow via reused virtual-student-qa drivers.
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser, newStudentContext, attachLearningNetworkObserver } from "../../virtual-student-qa/lib/browser.mjs";
import { authenticateStudent } from "../../virtual-student-qa/lib/student-auth.mjs";
import { buildScenarioFromSession } from "../../virtual-student-qa/scenarios/phase-d2-suite.mjs";
import { runMathScenario } from "../../virtual-student-qa/lib/subject-drivers/math-master.mjs";
import { runGeometryScenario } from "../../virtual-student-qa/lib/subject-drivers/geometry-master.mjs";
import { runHebrewScenario } from "../../virtual-student-qa/lib/subject-drivers/hebrew-master.mjs";
import { runEnglishScenario } from "../../virtual-student-qa/lib/subject-drivers/english-master.mjs";
import { runScienceScenario } from "../../virtual-student-qa/lib/subject-drivers/science-master.mjs";
import { runMoledetGeographyScenario } from "../../virtual-student-qa/lib/subject-drivers/moledet-geography-master.mjs";

const DRIVER_BY_SUBJECT = {
  math: runMathScenario,
  geometry: runGeometryScenario,
  hebrew: runHebrewScenario,
  english: runEnglishScenario,
  science: runScienceScenario,
  "moledet-geography": runMoledetGeographyScenario,
};

function makeArtifacts(artifactsDir) {
  mkdirSync(artifactsDir, { recursive: true });
  const logFile = join(artifactsDir, "run.log");
  return {
    dir: artifactsDir,
    log(line) {
      const stamped = `[${new Date().toISOString()}] ${line}\n`;
      appendFileSync(logFile, stamped, "utf8");
    },
    writeJson(name, obj) {
      writeFileSync(join(artifactsDir, name), JSON.stringify(obj, null, 2), "utf8");
    },
    async saveScreenshot(page, name) {
      try {
        await page.screenshot({ path: join(artifactsDir, `${name}.png`), fullPage: true });
      } catch {
        // ignore
      }
    },
  };
}

function noopScreenshotter() {
  return async () => {};
}

export async function runClassroomSimulation({
  plan,
  baseUrl,
  headed = false,
  artifactsDir,
  log = console.log,
}) {
  const artifacts = makeArtifacts(artifactsDir);
  const writeLog = (line) => {
    log(line);
    artifacts.log(line);
  };

  const studied = Object.values(plan.students).filter((s) => s.studied);
  if (studied.length === 0) {
    writeLog("orchestrator: no students attending today — empty run");
    return {
      verdict: "pass",
      sessionsCreated: 0,
      answersCreated: 0,
      studentResults: [],
    };
  }

  artifacts.writeJson("plan.json", plan);
  const browser = await launchBrowser({ headed });
  const studentResults = [];
  let totalSessions = 0;
  let totalAnswers = 0;
  let failures = 0;

  try {
    for (let i = 0; i < studied.length; i++) {
      const studentPlan = studied[i];
      writeLog(
        `orchestrator: student ${i + 1}/${studied.length} ${studentPlan.label} (${studentPlan.personaKind}) sessions=${studentPlan.sessions.length}`
      );

      const account = {
        label: studentPlan.label,
        username: studentPlan.username,
        code: "",
        pin: String(process.env.SIM_TEACHER_STUDENT_PIN || "1234").replace(/\D/g, "").slice(0, 4) || "1234",
      };

      const studentContext = await newStudentContext(browser);
      const page = await studentContext.newPage();
      const observer = attachLearningNetworkObserver(page);
      const sessionResults = [];
      let studentFailed = false;

      try {
        await authenticateStudent({
          context: studentContext,
          page,
          account,
          baseUrl,
          mode: "ui",
          log: writeLog,
        });

        for (let si = 0; si < studentPlan.sessions.length; si++) {
          const session = studentPlan.sessions[si];
          const scenario = buildScenarioFromSession({
            studentLabel: studentPlan.label,
            sessionIndex: si,
            session,
          });
          const driver = DRIVER_BY_SUBJECT[scenario.subject];
          if (!driver) {
            sessionResults.push({ topic: session.topic, error: `no driver for ${session.subject}`, completed: false });
            studentFailed = true;
            continue;
          }

          writeLog(
            `orchestrator: ${studentPlan.label} session ${si + 1}/${studentPlan.sessions.length} subject=${session.subject} topic=${session.topic} profile=${session.profile} q=${session.questionCount}`
          );

          const marker = observer.mark();
          try {
            const screenshotter = noopScreenshotter();
            await driver({ page, baseUrl, scenario, log: writeLog, screenshotter });
            const networkSummary = observer.summarizeSince(marker);
            const answerCount = networkSummary?.["/api/learning/answer"]?.responses || 0;
            sessionResults.push({
              topic: session.topic,
              profile: session.profile,
              questionCount: session.questionCount,
              answered: answerCount,
              completed: answerCount > 0,
              networkSummary,
            });
            if (answerCount > 0) {
              totalSessions += 1;
              totalAnswers += answerCount;
            } else {
              studentFailed = true;
            }
          } catch (err) {
            sessionResults.push({
              topic: session.topic,
              error: String(err?.message || err),
              completed: false,
            });
            studentFailed = true;
            await artifacts.saveScreenshot(page, `${studentPlan.label}-sess${si + 1}-fail`);
          }
        }
      } catch (err) {
        studentFailed = true;
        sessionResults.push({ error: `auth failed: ${err?.message || err}`, completed: false });
      } finally {
        await studentContext.close().catch(() => {});
      }

      if (studentFailed) failures += 1;
      const passedSessions = sessionResults.filter((s) => s.completed).length;
      studentResults.push({
        label: studentPlan.label,
        studentId: studentPlan.studentId,
        personaKind: studentPlan.personaKind,
        status: passedSessions === 0 ? "fail" : passedSessions < studentPlan.sessions.length ? "partial" : "pass",
        sessionResults,
      });
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const failCount = studentResults.filter((r) => r.status === "fail").length;
  const passCount = studentResults.filter((r) => r.status === "pass").length;
  const result = {
    verdict:
      failCount === studied.length
        ? "fail"
        : failCount === 0
          ? "pass"
          : totalAnswers > 0
            ? "partial"
            : "fail",
    sessionsCreated: totalSessions,
    answersCreated: totalAnswers,
    studentResults,
    studiedCount: studied.length,
    failureCount: failCount,
    passCount,
  };

  artifacts.writeJson("run-result.json", result);
  return result;
}
