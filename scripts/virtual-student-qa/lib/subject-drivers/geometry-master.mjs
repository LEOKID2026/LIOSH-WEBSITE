/**
 * Geometry master driver — Phase C.
 *
 * Drives the real /learning/geometry-master page using its stable testids:
 *   geometry-player-name        (display, auto-filled from /api/student/me)
 *   geometry-topic-select       (e.g. "area", "perimeter")
 *   geometry-start-game
 *   geometry-text-answer        (text input answer flow for numeric topics)
 *   geometry-question-stem
 *   geometry-mcq-${idx}         (MCQ flow for non-numeric topics — not used
 *                                in this Phase C scenario; we choose "area")
 *   learning-stop-game          (fires session/finish)
 *
 * Why default topic = "area":
 *   • Area renders the math-style numeric text input, which has a clean
 *     handleAnswer flow we can drive deterministically.
 *   • The page does not expose `geometry-grade-select`; the grade is forced
 *     to the student account grade, so the scenario's `grade` field is
 *     informational only — we record the actual account grade alongside.
 *
 * Phase C profile control: we read `currentQuestion.correctAnswer` from the
 * page's React fiber (lib/mcq-fiber-probe.mjs with `entryTestid`) and use
 * the same arithmetic profile picker (correct vs jittered-wrong integer)
 * that the math driver uses, so the same intended-vs-observed signal works.
 *
 * Submit: the page's text-answer onKeyPress handles Enter, which is the
 * cleanest submit path because the "בדוק" button has no testid.
 */

import {
  waitForSessionStart,
  waitForAnswerSave,
  clickStopAndConfirmSessionFinish,
  readAnswerIsCorrect,
  buildAnsweredQuestionEntry,
  tallyCorrectness,
  shortText,
  selectCountablePracticeMode,
  createPracticeEvidenceTracker,
  selectTopicRobustly,
} from "../learning-session-helpers.mjs";
import { probeCurrentQuestion } from "../mcq-fiber-probe.mjs";
import { pickAnswerForArithmetic } from "../answer-profiles.mjs";
import { attachSessionPacingToScenario } from "../session-pacing.mjs";

const GEOMETRY_PATH = "/learning/geometry-master";

export async function runGeometryScenario({ page, baseUrl, scenario, log, screenshotter }) {
  const url = new URL(GEOMETRY_PATH, baseUrl).toString();
  log(`geometry-master: navigate ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const playerNameDiv = page.getByTestId("geometry-player-name");
  await playerNameDiv.waitFor({ state: "visible", timeout: 30_000 });

  log("geometry-master: waiting for player name to auto-populate");
  await page
    .waitForFunction(
      () => {
        const node = document.querySelector('[data-testid="geometry-player-name"]');
        const text = node?.textContent?.trim() || "";
        return Boolean(text) && text !== "שחקן";
      },
      null,
      { timeout: 30_000 }
    )
    .catch(() => {});

  const playerName = (await playerNameDiv.innerText().catch(() => "")).trim();

  const topicValue = scenario.topic || "area";
  await selectTopicRobustly({
    page,
    baseUrl,
    path: GEOMETRY_PATH,
    topicSelectTestid: "geometry-topic-select",
    playerNameTestid: "geometry-player-name",
    topic: topicValue,
    subjectLabel: "geometry-master",
    log,
    required: true,
  });

  await screenshotter("02-geometry-master-ready");

  await selectCountablePracticeMode({ page, log, subjectLabel: "geometry-master" });

  const startButton = page.getByTestId("geometry-start-game");
  await startButton.waitFor({ state: "visible", timeout: 10_000 });
  log(
    `geometry-master: starting game mode=practice topic=${scenario.topic || "area"} ` +
      `profile=${scenario.profile} questions=${scenario.questionCount}`
  );

  const sessionStartPromise = waitForSessionStart({
    page,
    log,
    subject: "geometry-master",
  });
  await startButton.click();
  const sessionStartResponse = await sessionStartPromise;

  // The page reads currentQuestion in two flows: text-input (geometry-text-answer)
  // and MCQ (geometry-mcq-${idx}). Phase C scenarios use the text-input flow.
  const textInput = page.getByTestId("geometry-text-answer");
  try {
    await textInput.waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    throw new Error(
      "geometry-master: geometry-text-answer did not appear after start. " +
        `Topic '${scenario.topic || "area"}' may render an MCQ-only UI for the ` +
        `student's account grade. Underlying: ${error?.message || error}`
    );
  }

  const answeredQuestions = [];

  const evidenceTracker = createPracticeEvidenceTracker("geometry-master", log);
  const pacing = attachSessionPacingToScenario(scenario, {
    log,
    subjectLabel: "geometry-master",
  });
  for (let i = 0; i < scenario.questionCount; i++) {
    const questionIndex = i + 1;

    log(
      `geometry-master: q${questionIndex}/${scenario.questionCount} — waiting for prompt`
    );

    await page.waitForFunction(
      () => {
        const input = document.querySelector('[data-testid="geometry-text-answer"]');
        if (!input) return false;
        if (input.disabled) return false;
        return (input.value || "") === "";
      },
      null,
      { timeout: 30_000 }
    );

    const stemText = await page
      .getByTestId("geometry-question-stem")
      .innerText()
      .catch(() => "");

    // Read the live correctAnswer from the page's React fiber so we can drive
    // strong/weak/average deterministically. The geometry page mixes two
    // text-input question shapes:
    //
    //   - Numeric calculation (e.g. area=15) — correctAnswer is a number.
    //   - Conceptual recall   (e.g. "מה חשוב לזכור?" → correctAnswer="שטח")
    //     — correctAnswer is a string label.
    //
    // For numeric questions we run the math-style picker (correct = number,
    // wrong = number ± offset). For string questions we cannot meaningfully
    // jitter the value, so we deterministically choose between submitting
    // the correct string or a clearly-wrong throwaway string per profile.
    const probe = await probeCurrentQuestion({
      page,
      entryTestid: "geometry-text-answer",
    });

    let correctNumeric = null;
    let correctString = null;
    if (probe.ok && probe.correctAnswer != null) {
      const asNum = Number(probe.correctAnswer);
      if (Number.isFinite(asNum) && String(probe.correctAnswer).trim() !== "") {
        correctNumeric = asNum;
      } else {
        correctString = String(probe.correctAnswer).trim();
      }
    }

    let pick;
    let questionFlavour;
    if (correctNumeric != null) {
      questionFlavour = "numeric";
      pick = scenario.pickAnswer({
        profile: scenario.profile,
        computedAnswer: correctNumeric,
        topicKey: probe.topic || scenario.topic || "area",
        weaknessTopics: scenario.weaknessTopics ?? [],
      });
    } else if (correctString) {
      questionFlavour = "string";
      // Use the same RNG path the math picker would have used by tunneling
      // through pickAnswerForArithmetic with a placeholder "computed" so the
      // rng() draws stay deterministic. We then ignore its value/perturbed
      // shape and submit either correctString (intendedCorrect) or a fixed
      // sentinel wrong string ("___שגוי___").
      const decision = scenario.pickAnswer({
        profile: scenario.profile,
        computedAnswer: 0,
        topicKey: probe.topic || scenario.topic || "area",
        weaknessTopics: scenario.weaknessTopics ?? [],
      });
      pick = {
        value: decision.intendedCorrect ? correctString : "___שגוי___",
        intendedCorrect: decision.intendedCorrect,
      };
    } else {
      questionFlavour = "unknown";
      log(
        `geometry-master: q${questionIndex} fiber probe did not resolve any ` +
          `correctAnswer (reason=${probe.reason || "(none)"}); submitting a wrong sentinel.`
      );
      pick = { value: "0", intendedCorrect: false };
    }

    log(
      `geometry-master: q${questionIndex} stem="${shortText(stemText)}" ` +
        `flavour=${questionFlavour} correctAnswer(probe)=${probe.ok ? probe.correctAnswer : "n/a"} ` +
        `submit=${pick.value} intendedCorrect=${pick.intendedCorrect}`
    );

    await pacing.waitBeforeAnswer(questionIndex);

    const answerRes = await waitForAnswerSave({
      page,
      log,
      subject: "geometry-master",
      questionIndex,
      doClick: async () => {
        await textInput.fill(pick.value);
        // Enter triggers handleAnswer in the page; the בדוק button has no testid.
        await textInput.press("Enter");
      },
    });

    evidenceTracker.recordAnswer({
      sessionStartResponse,
      answerResponse: answerRes,
    });

    // Top-of-loop "input enabled and empty" wait synchronizes the next
    // question; an explicit "disabled===true" wait races the auto-advance
    // back to enabled and is unnecessary now that waitForAnswerSave already
    // proves the answer save succeeded.

    const observedCorrect = await readAnswerIsCorrect(answerRes);

    answeredQuestions.push(
      buildAnsweredQuestionEntry({
        index: questionIndex,
        topic: probe.topic || scenario.topic || "area",
        exerciseText: stemText,
        computedAnswer: correctNumeric,
        submittedValue: pick.value,
        intendedCorrect: pick.intendedCorrect,
        observedCorrect,
        flow: "text",
      })
    );
  }

  await screenshotter("03-geometry-master-questions-complete");

  await clickStopAndConfirmSessionFinish({
    page,
    log,
    subject: "geometry-master",
  });

  await screenshotter("04-geometry-master-after-stop");

  const evidence = evidenceTracker.finalize();

  const tally = tallyCorrectness(answeredQuestions);
  log(
    `geometry-master: profile=${scenario.profile} ` +
      `intendedCorrect=${tally.intendedCorrect}/${tally.total} ` +
      `observedCorrect=${tally.observedCorrect ?? "n/a"}/${tally.observedKnown}`
  );

  return {
    answeredQuestions,
    playerName,
    accountGrade: null,
    accountGradeRaw: null,
    tally,
    answerFlow: "text",
    evidence,
  };
}

// Re-export the arithmetic picker so scenarios can reuse it without importing
// answer-profiles.mjs directly. Keeps Phase C scenarios slim.
export { pickAnswerForArithmetic };
