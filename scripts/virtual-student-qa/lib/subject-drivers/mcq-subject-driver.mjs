/**
 * Generic MCQ subject driver — Phase C.
 *
 * Used by hebrew/english/science whose learning pages share the same shape:
 *   {subject}-player-name        (auto-fills from /api/student/me)
 *   {subject}-topic-select       (subject-specific topic strings)
 *   {subject}-start-game
 *   {subject}-mcq-${idx}         (one MCQ button per option; question stem in
 *                                 student-question-body and/or
 *                                 {subject}-question-stem)
 *   learning-stop-game           (fires session/finish — shared testid)
 *
 * Profile correctness control (the "do answer profiles actually work" thing):
 *   The page keeps the active question (with correctAnswer / correctIndex
 *   and options[]) inside React state. There is no DOM-level marker that
 *   identifies which MCQ button is correct before the user clicks. We can
 *   either (a) add testids to the product (NOT allowed in Phase C) or
 *   (b) READ the live state via a React fiber walk anchored on the first
 *   MCQ button. We do (b) — see lib/mcq-fiber-probe.mjs.
 *
 * After every click we also read the page's outgoing /api/learning/answer
 * request body's `isCorrect` to compute observed correctness independently
 * of fiber confidence.
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
  clickMcqOptionRobustly,
} from "../learning-session-helpers.mjs";
import { probeCurrentQuestion } from "../mcq-fiber-probe.mjs";
import { pickMcqIndex } from "../answer-profiles.mjs";
import { attachSessionPacingToScenario } from "../session-pacing.mjs";

/**
 * @param {object} cfg
 * @param {string} cfg.subject       - 'hebrew' | 'english' | 'science'
 * @param {string} cfg.subjectLabel  - label used in driver logs and tally text
 * @param {string} cfg.path          - '/learning/<subject>-master'
 */
export function makeMcqSubjectDriver({ subject, subjectLabel, path }) {
  const playerNameTestid = `${subject}-player-name`;
  const topicSelectTestid = `${subject}-topic-select`;
  const startGameTestid = `${subject}-start-game`;
  const mcqPrefix = `${subject}-mcq-`;
  const questionStemTestid = `${subject}-question-stem`;

  return async function runScenario({ page, baseUrl, scenario, log, screenshotter }) {
    const url = new URL(path, baseUrl).toString();
    log(`${subjectLabel}: navigate ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const playerNameDiv = page.getByTestId(playerNameTestid);
    await playerNameDiv.waitFor({ state: "visible", timeout: 30_000 });

    log(`${subjectLabel}: waiting for player name to auto-populate`);
    await page
      .waitForFunction(
        (testid) => {
          const node = document.querySelector(`[data-testid="${testid}"]`);
          const text = node?.textContent?.trim() || "";
          return Boolean(text) && text !== "שחקן";
        },
        playerNameTestid,
        { timeout: 30_000 }
      )
      .catch(() => {});

    const playerName = (await playerNameDiv.innerText().catch(() => "")).trim();

    // Topic must be selected before session/start — partial sessions with wrong
    // topic are a common source of wall-clock orphans under parallel load.
    if (scenario.topic) {
      await selectTopicRobustly({
        page,
        baseUrl,
        path,
        topicSelectTestid,
        playerNameTestid,
        topic: scenario.topic,
        subjectLabel,
        log,
        required: true,
      });
    }

    await screenshotter(`02-${subject}-master-ready`);

    await selectCountablePracticeMode({ page, log, subjectLabel });

    const startButton = page.getByTestId(startGameTestid);
    await startButton.waitFor({ state: "visible", timeout: 10_000 });
    log(
      `${subjectLabel}: starting game mode=practice profile=${scenario.profile} ` +
        `topic=${scenario.topic ?? "(default)"} questions=${scenario.questionCount}`
    );

    const sessionStartPromise = waitForSessionStart({
      page,
      log,
      subject: subjectLabel,
    });
    await startButton.click();
    const sessionStartResponse = await sessionStartPromise;

    // Wait for at least one MCQ button in the new question UI.
    try {
      await page.waitForSelector(`[data-testid^="${mcqPrefix}"]`, {
        state: "visible",
        timeout: 30_000,
      });
    } catch (error) {
      throw new Error(
        `${subjectLabel}: MCQ buttons (${mcqPrefix}) never appeared after start. ` +
          `Underlying: ${error?.message || error}`
      );
    }

    const answeredQuestions = [];
    const probeFailures = [];

    let earlyExitReason = null;
    const evidenceTracker = createPracticeEvidenceTracker(subjectLabel, log);
    const pacing = attachSessionPacingToScenario(scenario, { log, subjectLabel });
    for (let i = 0; i < scenario.questionCount; i++) {
      const questionIndex = i + 1;

      // Wait until the MCQ buttons for the next question are enabled & not
      // showing the post-answer disabled styling. The page disables all MCQs
      // after a click and re-enables them when the next question loads.
      // Some pages (notably hebrew-master) interleave a transient
      // showLevelUp modal between questions; the buttons disappear briefly
      // while the modal is up. We accept a 20s wait — long enough for the
      // 3s modal — and on timeout we capture a screenshot and break out of
      // the question loop so the scenario records degraded but doesn't
      // hard-fail the whole run.
      try {
        await page.waitForFunction(
          (prefix) => {
            const btns = Array.from(
              document.querySelectorAll(`[data-testid^="${prefix}"]`)
            );
            if (btns.length === 0) return false;
            return btns.every((b) => !b.disabled);
          },
          mcqPrefix,
          { timeout: 20_000 }
        );
      } catch (waitError) {
        earlyExitReason = `mcq-buttons-not-ready-q${questionIndex}: ${
          String(waitError?.message || "").slice(0, 120)
        }`;
        log(
          `${subjectLabel}: q${questionIndex} MCQ buttons did not return — ${earlyExitReason}. ` +
            `Stopping the question loop early; the session/finish leg still runs.`
        );
        await screenshotter(`${subject}-master-mcq-stuck-q${questionIndex}`).catch(
          () => {}
        );
        break;
      }

      const stemText = await readStemText({ page, questionStemTestid });

      // Probe with short retry loop until the fiber's question state matches
      // the DOM's MCQ buttons. Even after Playwright sees buttons enabled,
      // some pages (notably english-master) take an extra render tick before
      // `currentQuestion` settles to the new question — without retry the
      // probe would return a stale state (e.g. previousExplanationQuestion)
      // and the profile picker would silently fall back to "answer index 0".
      // Retry budget is small (capped ~600ms total) so a real probe failure
      // still surfaces quickly.
      const probe = await probeWithLabelMatchRetry({
        page,
        mcqTestidPrefix: mcqPrefix,
        maxAttempts: 6,
        intervalMs: 100,
      });

      const visibleLabels = probe.visibleLabels || [];
      const optionsCount = visibleLabels.length;
      const fiberCorrectIndex =
        typeof probe.resolvedCorrectIndex === "number"
          ? probe.resolvedCorrectIndex
          : null;

      let pickedIndex;
      let intendedCorrect;
      let probeNote = null;
      if (probe.ok && fiberCorrectIndex != null && optionsCount > 0) {
        const decision = pickMcqIndex({
          profile: scenario.profile,
          correctIndex: fiberCorrectIndex,
          optionsCount,
          rng: scenario.rng(),
          topicKey: probe.topic || scenario.topic,
          weaknessTopics: scenario.weaknessTopics ?? [],
        });
        pickedIndex = decision.index;
        intendedCorrect = decision.intendedCorrect;
      } else {
        // Fiber probe failed — we cannot honour the profile. Pick a
        // deterministic index per scenario rng but flag this question's
        // intended correctness as null so the run summary marks the
        // subject as profile-uncontrollable.
        //
        // scenario.rng is `() => rng` so calling it returns the rng
        // function itself; we must invoke it again to consume a draw.
        const rngFn = scenario.rng();
        pickedIndex = optionsCount > 0
          ? Math.floor(rngFn() * optionsCount)
          : 0;
        intendedCorrect = null;
        probeNote = `fiber-probe-failed:${probe.reason || "unknown"}`;
        probeFailures.push({ questionIndex, reason: probeNote });
      }

      log(
        `${subjectLabel}: q${questionIndex} stem="${shortText(stemText)}" ` +
          `correctAnswer(probe)=${probe.ok ? probe.correctAnswer : "n/a"} ` +
          `matchedByLabels=${probe.ok ? probe.matchedByLabels : "n/a"} ` +
          `pickedIndex=${pickedIndex}/${optionsCount} intendedCorrect=${intendedCorrect}`
      );

      await pacing.waitBeforeAnswer(questionIndex);

      const answerRes = await waitForAnswerSave({
        page,
        log,
        subject: subjectLabel,
        questionIndex,
        doClick: async () => {
          await clickMcqOptionRobustly({
            page,
            mcqTestid: `${mcqPrefix}${pickedIndex}`,
            log,
            subjectLabel,
            questionIndex,
          });
        },
      });

      evidenceTracker.recordAnswer({
        sessionStartResponse,
        answerResponse: answerRes,
      });

      // After the click, the page disables all MCQ buttons until the next
      // question loads. Wait for the disabled state so we don't race the
      // next iteration's "enabled" check.
      await page
        .waitForFunction(
          (prefix) => {
            const btns = Array.from(
              document.querySelectorAll(`[data-testid^="${prefix}"]`)
            );
            return btns.length > 0 && btns.every((b) => b.disabled);
          },
          mcqPrefix,
          { timeout: 10_000 }
        )
        .catch(() => {});

      const observedCorrect = await readAnswerIsCorrect(answerRes);

      const entry = buildAnsweredQuestionEntry({
        index: questionIndex,
        topic: probe.topic || scenario.topic || null,
        exerciseText: stemText,
        computedAnswer: probe.ok ? probe.correctAnswer : null,
        submittedValue: visibleLabels[pickedIndex] ?? `option#${pickedIndex}`,
        intendedCorrect: intendedCorrect ?? false,
        observedCorrect,
        flow: "mcq",
      });
      // Preserve fiber-uncertainty info even though buildAnsweredQuestionEntry
      // squashes intendedCorrect to a boolean — the run summary uses
      // probeFailures (below) to mark profile control as PARTIAL.
      if (intendedCorrect === null) {
        entry.intendedUnknown = true;
      }
      if (probeNote) entry.probeNote = probeNote;
      answeredQuestions.push(entry);
    }

    await screenshotter(`03-${subject}-master-questions-complete`);

    await clickStopAndConfirmSessionFinish({
      page,
      log,
      subject: subjectLabel,
    });

    await screenshotter(`04-${subject}-master-after-stop`);

    const evidence = evidenceTracker.finalize();

    const tally = tallyCorrectness(answeredQuestions);
    log(
      `${subjectLabel}: profile=${scenario.profile} ` +
        `intendedCorrect=${tally.intendedCorrect}/${tally.total} ` +
        `observedCorrect=${tally.observedCorrect ?? "n/a"}/${tally.observedKnown} ` +
        `probeFailures=${probeFailures.length}`
    );

    return {
      answeredQuestions,
      playerName,
      accountGrade: null,
      accountGradeRaw: null,
      tally,
      answerFlow: "mcq",
      probeFailures,
      earlyExitReason,
      evidence,
    };
  };
}

/**
 * Run `probeCurrentQuestion` in a short retry loop, returning the first probe
 * whose `matchedByLabels` is true (i.e. the fiber's question state's options
 * line up with the rendered MCQ buttons). If every attempt fails, return the
 * LAST probe so the caller's existing fallback path runs (intendedCorrect is
 * marked uncertain, the question is still answered through the real UI, and
 * `probeFailures` is incremented).
 *
 * Why: after a click, several setStates can land in slightly separate React
 * commits (timer reset, streak/score, generateNewQuestion's
 * `setPreviousExplanationQuestion(currentQuestion); setCurrentQuestion(new)`).
 * Buttons can be visually enabled with the new question's labels for a brief
 * window before the parent component's `currentQuestion` hook is committed
 * (or, conversely, while a sibling/child component still holds a memo of the
 * old question). The label-match check from mcq-fiber-probe is the cheapest
 * way to detect that window; the retry loop simply waits it out.
 */
async function probeWithLabelMatchRetry({
  page,
  mcqTestidPrefix,
  maxAttempts = 6,
  intervalMs = 100,
}) {
  let lastProbe = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const probe = await probeCurrentQuestion({ page, mcqTestidPrefix });
    if (probe.ok && probe.matchedByLabels) {
      return probe;
    }
    lastProbe = probe;
    if (attempt < maxAttempts) {
      await page.waitForTimeout(intervalMs);
    }
  }
  return lastProbe;
}

async function readStemText({ page, questionStemTestid }) {
  // Prefer the subject-specific question-stem testid; fall back to the shared
  // student-question-body which several pages also render.
  const primary = page.getByTestId(questionStemTestid);
  if (await primary.count()) {
    const t = await primary.first().innerText().catch(() => "");
    if (t) return t;
  }
  const fallback = page.getByTestId("student-question-body");
  if (await fallback.count()) {
    return (await fallback.first().innerText().catch(() => "")) || "";
  }
  return "";
}
