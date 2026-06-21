/**
 * Hebrew master driver — Phase C repair.
 *
 * Hebrew is the only Phase C subject whose learning page swaps the
 * input shape per question via `currentQuestion.answerMode`:
 *
 *   - default            → MCQ (hebrew-mcq-${idx})
 *   - "typing"           → free-text input (placeholder "כתוב את התשובה שלך כאן..."),
 *                          submitted via Enter or the "✅ בדוק תשובה" button.
 *   - "hebrew_audio_recorded_manual"
 *                        → an audio-recording task driven from the
 *                          HebrewAudioBuild1Panel above the question card.
 *                          That panel exposes a real "דילוג" (skip) button
 *                          for users without a microphone; clicking it
 *                          calls `finishAudioRecordedManualNeutral`, which
 *                          counts the question + advances to the next one
 *                          without firing /api/learning/answer (product
 *                          design — manual review). We use the SAME real
 *                          UI affordance, never fake audio input.
 *
 * Why we skip audio rather than record:
 *   The product (utils/hebrew-audio-attach.js) deterministically attaches
 *   recording-mode audio at sequenceIndex %9 in the {5,8} positions for
 *   the default reading topic in grade ≥3, so a 10-question scenario will
 *   always hit recording mode at q5 and q8. The runner cannot drive a
 *   real microphone in a headless browser, so for those questions it
 *   uses the page's own "דילוג" button — the same path a real user
 *   without a microphone takes — and records them as `audio-skipped`
 *   in the run summary. They count toward the parent-report question
 *   total (the page calls `/api/student/learning-profile` PATCH) but
 *   not toward Tier 1 /answer evidence.
 *
 * Phase C constraint: do not change product UI / Hebrew copy / behaviour /
 * testids. So we drive the typing shape using the page's existing markup:
 * the placeholder string is fixed product copy (we read it as a CSS
 * selector, never edit it), and the input's `onKeyPress` Enter handler is
 * already wired to the real `handleAnswer`. The "דילוג" button is also
 * located by its visible Hebrew label — read-only.
 *
 * Profile control:
 *   - MCQ:    same fiber-probe-based pickMcqIndex as english/science.
 *   - typing: pickAnswerForArithmetic gives us a boolean `intendedCorrect`;
 *             on intendedCorrect=true we type the page's currentQuestion
 *             correctAnswer (preferring acceptedAnswers[0] when present so
 *             niqqud-strict questions still hit the accepted-list path);
 *             on false we type a Hebrew sentinel wrong string that cannot
 *             collide with any real answer.
 *   - audio_recorded_manual: profile is N/A; we skip via the real UI
 *             button. Profile signal is computed only over MCQ + typing
 *             questions, so audio skips never inflate / deflate it.
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

const SUBJECT = "hebrew";
const SUBJECT_LABEL = "hebrew-master";
const PATH = "/learning/hebrew-master";
const MCQ_PREFIX = `${SUBJECT}-mcq-`;
const TYPING_PLACEHOLDER = "כתוב את התשובה שלך כאן...";
// The wrong sentinel must (a) not match any real correct answer under
// hebrew_relaxed_text/hebrew_niqqud_strict comparison, and (b) survive
// trim/whitespace normalisation. Three underscores plus a Hebrew word
// satisfies both.
const TYPING_WRONG_SENTINEL = "___שגוי___";

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
 * Wait until the page reaches a state we can interpret per-question:
 *   1. MCQ buttons exist and are enabled, OR
 *   2. Typing input is visible+enabled, OR
 *   3. We see the audio-recorded-manual panel hint.
 *
 * Returns a discriminator string.
 */
async function waitForAnswerableQuestion({ page, timeoutMs }) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(
      ({ mcqPrefix, placeholder }) => {
        const mcqs = Array.from(
          document.querySelectorAll(`[data-testid^="${mcqPrefix}"]`)
        );
        if (mcqs.length > 0) {
          const enabled = mcqs.every((b) => !b.disabled);
          if (enabled) return { kind: "mcq" };
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
        // Audio recorded manual mode renders the literal hint text from
        // pages/learning/hebrew-master.js: "השלמה מהפאנל למעלה."
        const hintNode = Array.from(
          document.querySelectorAll("p, span, div")
        ).find((n) => n.textContent?.trim() === "השלמה מהפאנל למעלה.");
        if (hintNode) return { kind: "audio_recorded_manual" };
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
 * Pick the typed value for a typing-mode hebrew question (profile-driven).
 */
function pickTypedAnswer({ probe, scenario }) {
  const topicKey = probe.topic || scenario.topic || "reading";
  return pickProfileTypedAnswer({ scenario, probe, topicKey });
}

/**
 * Click the real-UI "דילוג" (skip) button inside HebrewAudioBuild1Panel.
 *
 * Returns { ok: boolean, reason?: string }. On success the page has
 * advanced past the audio question; on failure we report the reason so
 * the caller can surface it in earlyExitReason.
 *
 * Robustness:
 *   - The button is found by its visible Hebrew text (existing product
 *     copy, never modified by this runner).
 *   - We try a normal Playwright click, fall back to a native DOM
 *     .click() via evaluate so transitional overlays don't block us.
 *   - We wait for the question's currentQuestion reference to change in
 *     React state so we don't race the next iteration.
 */
async function skipAudioRecordedManual({ page, log, questionIndex }) {
  const skipBtn = page
    .getByRole("button", { name: "דילוג", exact: true })
    .first();
  if (!(await skipBtn.count())) {
    return { ok: false, reason: "skip-button-not-rendered" };
  }
  await skipBtn.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});

  // The audio panel disables ALL its buttons (including דילוג) while
  // `busy=true` — set during playStem / runGuidedCapture transitions.
  // Wait for the skip button to be enabled so our click is not a no-op.
  try {
    await skipBtn.evaluate(
      (el) => !el.hasAttribute("disabled") && !el.disabled,
      undefined,
      { timeout: 10_000 }
    );
    await page.waitForFunction(
      () => {
        const btns = Array.from(
          document.querySelectorAll('button')
        ).filter((b) => (b.textContent || "").trim() === "דילוג");
        return btns.length > 0 && btns.every((b) => !b.disabled);
      },
      undefined,
      { timeout: 10_000 }
    );
  } catch {
    // Fall through; we'll still try the click below.
  }

  // Capture the current exerciseText so we can confirm advance.
  const beforeStem = await page
    .getByTestId("hebrew-question-stem")
    .innerText()
    .catch(() => "");

  // Try up to 3 click attempts: the audio panel's `busy` flag flips on
  // first user interaction (TTS init), so the first click may land
  // while busy=true and be ignored. Retrying a couple of times after a
  // short backoff covers that race without changing product code.
  let clickAttempts = 0;
  let advanced = false;
  while (clickAttempts < 3 && !advanced) {
    clickAttempts += 1;
    try {
      await skipBtn.click({ timeout: 5_000 });
    } catch (firstError) {
      log(
        `${SUBJECT_LABEL}: q${questionIndex} attempt ${clickAttempts} normal דילוג click failed ` +
          `(${String(firstError?.message || "").slice(0, 100)}); falling back to native DOM .click() via evaluate`
      );
      try {
        await skipBtn.evaluate((el) => el.click(), undefined, { timeout: 10_000 });
      } catch (secondError) {
        if (clickAttempts >= 3) {
          return {
            ok: false,
            reason: `skip-click-failed-after-${clickAttempts}-attempts: ${String(secondError?.message || secondError).slice(0, 200)}`,
          };
        }
        await page.waitForTimeout(800);
        continue;
      }
    }

    // After click → 600ms to onGuidedNeutralDone → 1400ms to next question.
    // Wait up to 6s per attempt for stem text to change.
    try {
      await page.waitForFunction(
        (prev) => {
          const stem =
            document.querySelector('[data-testid="hebrew-question-stem"]')?.innerText?.trim() ||
            "";
          return stem !== prev;
        },
        beforeStem,
        { timeout: 6_000 }
      );
      advanced = true;
    } catch {
      log(
        `${SUBJECT_LABEL}: q${questionIndex} attempt ${clickAttempts} skip click did not advance the page within 6s; ` +
          `retrying after backoff`
      );
      await page.waitForTimeout(800);
    }
  }

  if (!advanced) {
    return {
      ok: false,
      reason: `next-question-did-not-load-after-${clickAttempts}-skip-attempts`,
    };
  }
  return { ok: true };
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

export async function runHebrewScenario({ page, baseUrl, scenario, log, screenshotter }) {
  const url = new URL(PATH, baseUrl).toString();
  log(`${SUBJECT_LABEL}: navigate ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const playerNameDiv = page.getByTestId(`${SUBJECT}-player-name`);
  await playerNameDiv.waitFor({ state: "visible", timeout: 30_000 });
  log(`${SUBJECT_LABEL}: waiting for player name to auto-populate`);
  await page
    .waitForFunction(
      () => {
        const node = document.querySelector('[data-testid="hebrew-player-name"]');
        const text = node?.textContent?.trim() || "";
        return Boolean(text) && text !== "שחקן";
      },
      undefined,
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
  const skippedAudioQuestions = [];
  const probeFailures = [];
  const shapeCounts = { mcq: 0, typing: 0, audio_skipped: 0 };
  let earlyExitReason = null;
  const evidenceTracker = createPracticeEvidenceTracker(SUBJECT_LABEL, log);
  const pacing = attachSessionPacingToScenario(scenario, {
    log,
    subjectLabel: SUBJECT_LABEL,
  });

  for (let i = 0; i < scenario.questionCount; i++) {
    const questionIndex = i + 1;

    const shape = await waitForAnswerableQuestion({ page, timeoutMs: 30_000 });
    if (shape === "timeout" || shape === "none") {
      earlyExitReason = `no-answerable-shape-q${questionIndex}: page presented neither MCQ nor typing nor audio panel within 30s`;
      log(`${SUBJECT_LABEL}: q${questionIndex} ${earlyExitReason}`);
      await screenshotter(`${SUBJECT}-master-shape-stuck-q${questionIndex}`).catch(
        () => {}
      );
      break;
    }

    if (shape === "audio_recorded_manual") {
      // hebrew_audio_recorded_manual mode requires real audio recording.
      // Headless runners do not drive a microphone, so we use the page's
      // own "דילוג" button — the same affordance the product offers to
      // human users who don't have a microphone. The skip path calls
      // finishAudioRecordedManualNeutral, which advances the page and
      // increments the parent-report total via the learning-profile
      // PATCH, but does NOT fire /api/learning/answer. Record the skip
      // honestly in the run summary.
      const stemText = await readStemText({ page });
      const skipped = await skipAudioRecordedManual({
        page,
        log,
        questionIndex,
      });
      if (!skipped.ok) {
        earlyExitReason = `audio-skip-failed-q${questionIndex}: ${skipped.reason}`;
        log(`${SUBJECT_LABEL}: q${questionIndex} ${earlyExitReason}`);
        await screenshotter(
          `${SUBJECT}-master-audio-skip-failure-q${questionIndex}`
        ).catch(() => {});
        break;
      }
      shapeCounts.audio_skipped += 1;
      skippedAudioQuestions.push({
        index: questionIndex,
        exerciseText: shortText(stemText),
        reason: "hebrew_audio_recorded_manual: real microphone required; used real-UI 'דילוג' affordance",
      });
      log(
        `${SUBJECT_LABEL}: q${questionIndex} shape=audio_recorded_manual ` +
          `skipped via real-UI 'דילוג' button (no /api/learning/answer fired; ` +
          `parent report total still increments)`
      );
      continue;
    }

    shapeCounts[shape] += 1;
    const stemText = await readStemText({ page });

    // Probe currentQuestion. For MCQ we anchor via the first MCQ button;
    // for typing we anchor via the always-present learning-stop-game node.
    const probe =
      shape === "mcq"
        ? await probeCurrentQuestion({ page, mcqTestidPrefix: MCQ_PREFIX })
        : await probeCurrentQuestion({ page, entryTestid: "learning-stop-game" });

    const probeAnswerMode = probe.answerMode || (shape === "mcq" ? "mcq" : "typing");
    const topicKey = probe.topic || scenario.topic || "reading";

    if (shape === "mcq") {
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
        // scenario.rng is `() => rng`; the call returns the rng function
        // itself, so we have to invoke it again to consume a draw.
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

      // Wait for the post-answer disabled state so we don't race the
      // next iteration's "enabled" check.
      await page
        .waitForFunction(
          (prefix) => {
            const btns = Array.from(
              document.querySelectorAll(`[data-testid^="${prefix}"]`)
            );
            return btns.length > 0 && btns.every((b) => b.disabled);
          },
          MCQ_PREFIX,
          { timeout: 5_000 }
        )
        .catch(() => {});

      const observedCorrect = await readAnswerIsCorrect(answerRes);
      const entry = buildAnsweredQuestionEntry({
        index: questionIndex,
        topic: topicKey,
        exerciseText: stemText,
        computedAnswer: probe.ok ? probe.correctAnswer : null,
        submittedValue: visibleLabels[pickedIndex] ?? `option#${pickedIndex}`,
        intendedCorrect: intendedCorrect ?? false,
        observedCorrect,
        flow: "mcq",
      });
      if (intendedCorrect === null) entry.intendedUnknown = true;
      if (probeNote) entry.probeNote = probeNote;
      entry.answerMode = probeAnswerMode;
      answeredQuestions.push(entry);
      continue;
    }

    // ---- typing flow -------------------------------------------------
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

    const typingInput = page.locator(`input[placeholder="${TYPING_PLACEHOLDER}"]`);
    await typingInput.waitFor({ state: "visible", timeout: 10_000 });

    await pacing.waitBeforeAnswer(questionIndex);

    const answerRes = await waitForAnswerSave({
      page,
      log,
      subject: SUBJECT_LABEL,
      questionIndex,
      doClick: async () => {
        await typingInput.click({ timeout: 5_000 }).catch(() => {});
        await typingInput.fill("", { timeout: 5_000 }).catch(() => {});
        await typingInput.fill(pick.value, { timeout: 10_000 });
        await typingInput.press("Enter", { timeout: 10_000 });
      },
    });

    evidenceTracker.recordAnswer({
      sessionStartResponse,
      answerResponse: answerRes,
    });

    // After answer the typing input becomes disabled; wait briefly so the
    // next question's shape probe doesn't catch this question's input.
    await page
      .waitForFunction(
        (placeholder) => {
          const node = document.querySelector(
            `input[placeholder="${placeholder}"]`
          );
          return !node || node.disabled;
        },
        TYPING_PLACEHOLDER,
        { timeout: 5_000 }
      )
      .catch(() => {});

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
    entry.answerMode = probeAnswerMode;
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
      `shapes={mcq:${shapeCounts.mcq},typing:${shapeCounts.typing},audio_skipped:${shapeCounts.audio_skipped}} ` +
      `probeFailures=${probeFailures.length}`
  );

  return {
    answeredQuestions,
    skippedAudioQuestions,
    playerName,
    accountGrade: null,
    accountGradeRaw: null,
    tally,
    answerFlow: "mixed-mcq-typing-skip",
    probeFailures,
    earlyExitReason,
    shapeCounts,
    evidence,
  };
}
