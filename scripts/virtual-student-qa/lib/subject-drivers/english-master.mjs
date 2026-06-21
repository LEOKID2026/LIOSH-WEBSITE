/**
 * English master driver — Phase C, MCQ + typing.
 *
 * Root cause of 2026-05-23 partial run (AAA7 grade 4 English):
 *   The English page presents TWO question shapes in the same session:
 *     - MCQ ("choice") for en_to_he direction vocabulary
 *     - Free-text typing for he_to_en direction vocabulary at grade ≥ 4
 *   (see pages/learning/english-master.js determineMcqOrTyping())
 *   The previous generic MCQ driver waited 20 s for MCQ buttons that never
 *   arrived for typing questions and exited the session early.
 *
 * Additional root cause (found during desktop validation, 2026-05-23):
 *   English "learning" mode auto-advances on BOTH correct (1000 ms) and
 *   wrong (1500 ms) answers via setTimeout → generateNewQuestion(). Clicking
 *   the "שאלה הבאה" button in addition to the auto-advance timer produces a
 *   double-advance: the next question is replaced mid-interaction, causing
 *   the subsequent locator.press("Enter") to wait 10 s for a typing input
 *   that has already been removed from the DOM.
 *   Fix: never click "שאלה הבאה" — wait passively for the auto-advance.
 *   Also uses page.keyboard.press("Enter") instead of locator.press to avoid
 *   Playwright actionability re-checks racing React re-renders after fill().
 *
 * English-specific notes:
 *   - No audio mode — English has only MCQ and typing.
 *   - Typing mode auto-advances (setTimeout in handleAnswer): 1000 ms correct,
 *     1500 ms wrong. The "שאלה הבאה" button must NOT be clicked by the driver.
 *   - Typing placeholder matches Hebrew master: "כתוב את התשובה שלך כאן..."
 *   - Correct answer for he_to_en typing is an English word surfaced via the
 *     React fiber probe anchored on the always-present learning-stop-game node.
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
import { pickMcqIndex, pickCorrectnessIntent } from "../answer-profiles.mjs";
import { attachSessionPacingToScenario } from "../session-pacing.mjs";

const SUBJECT = "english";
const SUBJECT_LABEL = "english-master";
const PATH = "/learning/english-master";
const MCQ_PREFIX = `${SUBJECT}-mcq-`;

// The placeholder text used by the typing input on the English page.
// Must match pages/learning/english-master.js exactly (never edit product copy).
const TYPING_PLACEHOLDER = "כתוב את התשובה שלך כאן...";

// Typed-wrong sentinel: fallback when probe cannot surface a correct answer.
const TYPING_WRONG_SENTINEL = "___wrong___";

function resolveTypedCorrectValue(probe) {
  let preferred =
    Array.isArray(probe.acceptedAnswersSample) &&
    probe.acceptedAnswersSample.length > 0
      ? probe.acceptedAnswersSample[0]
      : probe.correctAnswer;
  preferred = String(preferred == null ? "" : preferred).trim();
  return preferred;
}

function pickProfileMcqIndex({ scenario, fiberCorrectIndex, optionsCount, topicKey }) {
  return pickMcqIndex({
    profile: scenario.profile,
    correctIndex: fiberCorrectIndex,
    optionsCount,
    rng: scenario.rng(),
    topicKey,
    weaknessTopics: scenario.weaknessTopics ?? [],
  });
}

function pickProfileTypedAnswer({ scenario, probe, topicKey }) {
  const preferred = resolveTypedCorrectValue(probe);
  if (preferred === "") {
    return { value: TYPING_WRONG_SENTINEL, intendedCorrect: false };
  }
  const intendedCorrect = pickCorrectnessIntent({
    profile: scenario.profile,
    rng: scenario.rng(),
    topicKey,
    weaknessTopics: scenario.weaknessTopics ?? [],
  });
  return {
    value: intendedCorrect ? preferred : TYPING_WRONG_SENTINEL,
    intendedCorrect,
  };
}

/**
 * Poll until the page reaches an answerable state.
 *
 * Returns "mcq"    when MCQ buttons are present AND enabled.
 *         "typing" when the free-text input is visible AND enabled.
 *         "timeout"when neither appeared within timeoutMs.
 */
async function waitForAnswerableQuestion({ page, timeoutMs }) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(
      ({ mcqPrefix, placeholder }) => {
        const mcqs = Array.from(
          document.querySelectorAll(`[data-testid^="${mcqPrefix}"]`)
        );
        if (mcqs.length > 0 && mcqs.every((b) => !b.disabled)) {
          return { kind: "mcq" };
        }
        const typingInput = document.querySelector(
          `input[placeholder="${placeholder}"]`
        );
        if (
          typingInput &&
          !typingInput.disabled &&
          typingInput.offsetParent !== null
        ) {
          return { kind: "typing" };
        }
        return { kind: "none" };
      },
      { mcqPrefix: MCQ_PREFIX, placeholder: TYPING_PLACEHOLDER }
    );
    if (state.kind !== "none") return state.kind;
    await page.waitForTimeout(250);
  }
  return "timeout";
}

/**
 * Pick the typed value for a typing-mode English question (profile-driven).
 */
function pickTypedAnswer({ probe, scenario }) {
  const topicKey = probe.topic || scenario.topic || "vocabulary";
  return pickProfileTypedAnswer({ scenario, probe, topicKey });
}

/**
 * Retry fiber probe until the MCQ button labels match the fiber's question
 * state (guards against React render-lag on english-master question transitions).
 */
async function probeWithLabelMatchRetry({
  page,
  maxAttempts = 6,
  intervalMs = 100,
}) {
  let lastProbe = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const probe = await probeCurrentQuestion({
      page,
      mcqTestidPrefix: MCQ_PREFIX,
    });
    if (probe.ok && probe.matchedByLabels) return probe;
    lastProbe = probe;
    if (attempt < maxAttempts) await page.waitForTimeout(intervalMs);
  }
  return lastProbe;
}

async function readStemText({ page }) {
  const primary = page.getByTestId(`${SUBJECT}-question-stem`);
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

export async function runEnglishScenario({
  page,
  baseUrl,
  scenario,
  log,
  screenshotter,
}) {
  const url = new URL(PATH, baseUrl).toString();
  log(`${SUBJECT_LABEL}: navigate ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const playerNameDiv = page.getByTestId(`${SUBJECT}-player-name`);
  await playerNameDiv.waitFor({ state: "visible", timeout: 30_000 });
  log(`${SUBJECT_LABEL}: waiting for player name to auto-populate`);
  await page
    .waitForFunction(
      (testid) => {
        const node = document.querySelector(`[data-testid="${testid}"]`);
        const text = node?.textContent?.trim() || "";
        return Boolean(text) && text !== "שחקן";
      },
      `${SUBJECT}-player-name`,
      { timeout: 30_000 }
    )
    .catch(() => {});

  const playerName = (await playerNameDiv.innerText().catch(() => "")).trim();

  if (scenario.topic) {
    await selectTopicRobustly({
      page,
      baseUrl,
      path: PATH,
      topicSelectTestid: `${SUBJECT}-topic-select`,
      playerNameTestid: `${SUBJECT}-player-name`,
      topic: scenario.topic,
      subjectLabel: SUBJECT_LABEL,
      log,
      required: true,
    });
  }

  await screenshotter(`02-${SUBJECT}-master-ready`);

  await selectCountablePracticeMode({ page, log, subjectLabel: SUBJECT_LABEL });

  const startButton = page.getByTestId(`${SUBJECT}-start-game`);
  await startButton.waitFor({ state: "visible", timeout: 10_000 });
  log(
    `${SUBJECT_LABEL}: starting game mode=practice profile=${scenario.profile} ` +
      `topic=${scenario.topic ?? "(default)"} questions=${scenario.questionCount}`
  );

  const sessionStartPromise = waitForSessionStart({
    page,
    log,
    subject: SUBJECT_LABEL,
  });
  await startButton.click();
  const sessionStartResponse = await sessionStartPromise;

  const answeredQuestions = [];
  const probeFailures = [];
  const shapeCounts = { mcq: 0, typing: 0 };
  let earlyExitReason = null;
  const evidenceTracker = createPracticeEvidenceTracker(SUBJECT_LABEL, log);
  const pacing = attachSessionPacingToScenario(scenario, {
    log,
    subjectLabel: SUBJECT_LABEL,
  });

  for (let i = 0; i < scenario.questionCount; i++) {
    const questionIndex = i + 1;

    // Wait up to 30 s for the next question to be in an answerable state.
    // 30 s is generous — normal transitions take <2 s. It also covers any
    // transient level-up modals or animation pauses.
    const shape = await waitForAnswerableQuestion({
      page,
      timeoutMs: 30_000,
    });

    if (shape === "timeout" || shape === "none") {
      earlyExitReason =
        `no-answerable-shape-q${questionIndex}: ` +
        `page presented neither MCQ nor typing within 30s`;
      log(`${SUBJECT_LABEL}: q${questionIndex} ${earlyExitReason}`);
      await screenshotter(
        `${SUBJECT}-master-shape-stuck-q${questionIndex}`
      ).catch(() => {});
      break;
    }

    shapeCounts[shape] += 1;
    const stemText = await readStemText({ page });

    // ---- MCQ flow -------------------------------------------------------
    if (shape === "mcq") {
      // Retry probe until labels match to guard against React render-lag
      // (english-master currentQuestion can lag MCQ button renders by 1 tick).
      const probe = await probeWithLabelMatchRetry({ page });
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
        const decision = pickProfileMcqIndex({
          scenario,
          fiberCorrectIndex,
          optionsCount,
          topicKey: probe.topic || scenario.topic || null,
        });
        pickedIndex = decision.index;
        intendedCorrect = decision.intendedCorrect;
      } else {
        const rngFn = scenario.rng();
        pickedIndex = optionsCount > 0
          ? Math.floor(rngFn() * optionsCount)
          : 0;
        intendedCorrect = null;
        probeNote = `fiber-probe-failed:${probe.reason || "unknown"}`;
        probeFailures.push({ questionIndex, reason: probeNote });
      }

      log(
        `${SUBJECT_LABEL}: q${questionIndex} shape=mcq stem="${shortText(stemText)}" ` +
          `correctAnswer(probe)=${probe.ok ? probe.correctAnswer : "n/a"} ` +
          `matchedByLabels=${probe.ok ? probe.matchedByLabels : "n/a"} ` +
          `pickedIndex=${pickedIndex}/${optionsCount} intendedCorrect=${intendedCorrect}`
      );

      await pacing.waitBeforeAnswer(questionIndex);

      const answerRes = await waitForAnswerSave({
        page,
        log,
        subject: SUBJECT_LABEL,
        questionIndex,
        doClick: async () => {
          await clickMcqOptionRobustly({
            page,
            mcqTestid: `${MCQ_PREFIX}${pickedIndex}`,
            log,
            subjectLabel: SUBJECT_LABEL,
            questionIndex,
          });
        },
      });

      evidenceTracker.recordAnswer({
        sessionStartResponse,
        answerResponse: answerRes,
      });

      // Wait for disabled state — the page disables MCQs after click and
      // re-enables them when the next question auto-loads.
      await page
        .waitForFunction(
          (prefix) => {
            const btns = Array.from(
              document.querySelectorAll(`[data-testid^="${prefix}"]`)
            );
            return btns.length > 0 && btns.every((b) => b.disabled);
          },
          MCQ_PREFIX,
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
      if (intendedCorrect === null) entry.intendedUnknown = true;
      if (probeNote) entry.probeNote = probeNote;
      answeredQuestions.push(entry);
      continue;
    }

    // ---- typing flow ----------------------------------------------------
    // Probe via the always-present learning-stop-game node as fiber anchor.
    const probe = await probeCurrentQuestion({
      page,
      entryTestid: "learning-stop-game",
    });
    const topicKey = probe.topic || scenario.topic || "vocabulary";

    if (!probe.ok || probe.correctAnswer == null) {
      probeFailures.push({
        questionIndex,
        reason: `typing-probe-failed:${probe.reason || "no-correct-answer"}`,
      });
    }

    const pick = pickTypedAnswer({ probe, scenario });

    log(
      `${SUBJECT_LABEL}: q${questionIndex} shape=typing stem="${shortText(stemText)}" ` +
        `correctAnswer(probe)=${probe.ok ? probe.correctAnswer : "n/a"} ` +
        `submit="${shortText(pick.value)}" intendedCorrect=${pick.intendedCorrect}`
    );

    const typingInput = page.locator(
      `input[placeholder="${TYPING_PLACEHOLDER}"]`
    );
    await typingInput.waitFor({ state: "visible", timeout: 10_000 });

    await pacing.waitBeforeAnswer(questionIndex);

    const answerRes = await waitForAnswerSave({
      page,
      log,
      subject: SUBJECT_LABEL,
      questionIndex,
      doClick: async () => {
        await typingInput.click({ timeout: 5_000 }).catch(() => {});
        await typingInput.fill(pick.value, { timeout: 10_000 });
        // Use page.keyboard.press instead of locator.press("Enter") to avoid
        // Playwright's actionability re-checks (stable/enabled/visible) that
        // can race with React re-renders triggered by fill(). page.keyboard
        // fires the keypress on the currently focused element (typingInput
        // remains focused after fill) without waiting for stability.
        await page.keyboard.press("Enter");
      },
    });

    evidenceTracker.recordAnswer({
      sessionStartResponse,
      answerResponse: answerRes,
    });

    // The English page in "learning" mode (the default) calls generateNewQuestion()
    // automatically via setTimeout:
    //   - correct answer → 1000 ms delay
    //   - wrong answer   → 1500 ms delay
    //
    // CRITICAL: do NOT click the "שאלה הבאה" button.
    // Clicking it triggers an IMMEDIATE generateNewQuestion() call, and the
    // pending auto-advance setTimeout fires afterwards — producing a double-
    // advance that shifts all subsequent question indices. The extra advance
    // replaces the next question's DOM mid-interaction, causing locator.press
    // to wait 10 s for a typing input that has already been removed.
    //
    // Instead, wait passively for the page's own auto-advance to commit
    // the next question (stem text change or typing input disappearance).
    await page
      .waitForFunction(
        ({ stemTestid, prevStem, placeholder }) => {
          const node =
            document.querySelector(`[data-testid="${stemTestid}"]`) ||
            document.querySelector('[data-testid="student-question-body"]');
          const current = (node?.innerText || "").trim();
          if (current !== "" && current !== prevStem) return true;
          // Typing input disappearing means the page switched to MCQ.
          if (!document.querySelector(`input[placeholder="${placeholder}"]`))
            return true;
          return false;
        },
        {
          stemTestid: `${SUBJECT}-question-stem`,
          prevStem: stemText,
          placeholder: TYPING_PLACEHOLDER,
        },
        // 3500 ms covers the 1500 ms wrong-answer delay + network/render lag.
        { timeout: 3_500 }
      )
      .catch(() => {});

    // Extra settle time for the answer-area DOM to stabilize (MCQ buttons
    // must finish entrance animation before waitForAnswerableQuestion runs).
    await page.waitForTimeout(300);

    const observedCorrect = await readAnswerIsCorrect(answerRes);
    const entry = buildAnsweredQuestionEntry({
      index: questionIndex,
      topic: topicKey,
      exerciseText: stemText,
      computedAnswer: probe.ok ? probe.correctAnswer : null,
      submittedValue: pick.value,
      intendedCorrect: pick.intendedCorrect,
      observedCorrect,
      flow: "typing",
    });
    answeredQuestions.push(entry);
  }

  await screenshotter(`03-${SUBJECT}-master-questions-complete`);

  await clickStopAndConfirmSessionFinish({
    page,
    log,
    subject: SUBJECT_LABEL,
  });

  await screenshotter(`04-${SUBJECT}-master-after-stop`);

  const evidence = evidenceTracker.finalize();

  const tally = tallyCorrectness(answeredQuestions);
  log(
    `${SUBJECT_LABEL}: profile=${scenario.profile} ` +
      `intendedCorrect=${tally.intendedCorrect}/${tally.total} ` +
      `observedCorrect=${tally.observedCorrect ?? "n/a"}/${tally.observedKnown} ` +
      `shapes={mcq:${shapeCounts.mcq},typing:${shapeCounts.typing}} ` +
      `probeFailures=${probeFailures.length}`
  );

  return {
    answeredQuestions,
    playerName,
    accountGrade: null,
    accountGradeRaw: null,
    tally,
    answerFlow: "mixed-mcq-typing",
    probeFailures,
    earlyExitReason,
    shapeCounts,
    evidence,
  };
}
