/**
 * פרופיל התנהגות ברמת שורת דוח — מבוסס אירועי טעות מנורמלים + מדדי שורה (ללא UI).
 */

import { mistakePatternClusterKey } from "./mistake-event.js";
import { filterMistakesForRow } from "./parent-report-row-trend.js";

/** @typedef {"knowledge_gap"|"careless_pattern"|"speed_pressure"|"instruction_friction"|"fragile_success"|"stable_mastery"|"undetermined"} BehaviorDominantType */

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * @param {string} subjectId
 * @param {string} topicRowKey
 * @param {Record<string, unknown>} row
 * @param {unknown[]} rawMistakes
 * @param {number} periodStartMs
 * @param {number} periodEndMs
 */
export function computeRowBehaviorProfile(subjectId, topicRowKey, row, rawMistakes, periodStartMs, periodEndMs) {
  const events = filterMistakesForRow(subjectId, topicRowKey, row, rawMistakes, periodStartMs, periodEndMs);
  const wrongs = events.filter((e) => !e.isCorrect);
  const q = Number(row?.questions) || 0;
  const acc = Math.round(Number(row?.accuracy) || 0);
  const wrongCount = Math.max(0, Number(row?.wrong) ?? (q > 0 ? q - (Number(row?.correct) || 0) : 0));
  const wrongRatio = q > 0 ? wrongCount / q : 0;
  const modeKey = row?.modeKey != null ? String(row.modeKey).trim() : "";

  const responseMsWrong = [];
  let hintKnown = 0;
  let hints = 0;
  let retryKnown = 0;
  let retrySum = 0;
  let changedKnown = 0;
  let changedYes = 0;
  let firstKnown = 0;
  let firstMiss = 0;

  for (const e of wrongs) {
    if (e.responseMs != null && Number.isFinite(Number(e.responseMs)) && Number(e.responseMs) > 0) {
      responseMsWrong.push(Number(e.responseMs));
    }
    if (e.hintUsed === true || e.hintUsed === false) {
      hintKnown += 1;
      if (e.hintUsed === true) hints += 1;
    }
    if (e.retryCount != null && Number.isFinite(Number(e.retryCount))) {
      retryKnown += 1;
      retrySum += Number(e.retryCount);
    }
    if (e.changedAnswer === true || e.changedAnswer === false) {
      changedKnown += 1;
      if (e.changedAnswer === true) changedYes += 1;
    }
    if (e.firstTryCorrect === true || e.firstTryCorrect === false) {
      firstKnown += 1;
      if (e.firstTryCorrect === false) firstMiss += 1;
    }
  }

  const medWrongMs = median(responseMsWrong);
  const hintRate = hintKnown >= 2 ? hints / hintKnown : null;
  const avgRetry = retryKnown >= 2 ? retrySum / retryKnown : null;
  const changedRate = changedKnown >= 2 ? changedYes / changedKnown : null;
  const firstTryMissRate = firstKnown >= 2 ? firstMiss / firstKnown : null;

  const famCounts = {};
  for (const e of wrongs) {
    const k = mistakePatternClusterKey(e);
    famCounts[k] = (famCounts[k] || 0) + 1;
  }
  let maxFamCount = 0;
  for (const c of Object.values(famCounts)) maxFamCount = Math.max(maxFamCount, c);

  const scores = {
    knowledge_gap: 0,
    careless_pattern: 0,
    speed_pressure: 0,
    instruction_friction: 0,
    fragile_success: 0,
    stable_mastery: 0,
  };

  if (q >= 4 && wrongRatio >= 0.32) scores.knowledge_gap += 2.2;
  if (wrongs.length >= 3 && maxFamCount >= 3) scores.knowledge_gap += 1.8;
  if (acc < 62 && q >= 5) scores.knowledge_gap += 1;

  if (modeKey === "speed") scores.speed_pressure += 2.4;
  if (responseMsWrong.length >= 3 && medWrongMs != null && medWrongMs < 2200) scores.speed_pressure += 1.6;
  if (responseMsWrong.length >= 4 && medWrongMs != null && medWrongMs < 3500 && acc >= 55 && acc < 85) {
    scores.careless_pattern += 1.4;
  }

  if (hintRate != null && hintRate >= 0.42 && hintKnown >= 3) scores.instruction_friction += 2.2;
  if (hintRate != null && hintRate >= 0.28 && hintKnown >= 4 && acc >= 60) scores.instruction_friction += 0.8;

  if (q >= 6 && acc >= 72 && acc < 92 && wrongRatio < 0.34) {
    if (firstTryMissRate != null && firstTryMissRate >= 0.45) scores.fragile_success += 2;
    if (avgRetry != null && avgRetry >= 1.1) scores.fragile_success += 1.2;
    if (changedRate != null && changedRate >= 0.35) scores.fragile_success += 1;
  }

  if (q >= 8 && acc >= 88 && wrongRatio <= 0.14 && wrongs.length <= Math.max(1, Math.floor(q * 0.12))) {
    scores.stable_mastery += 2.8;
  }
  if (q >= 12 && acc >= 90 && wrongRatio <= 0.1 && (hintRate == null || hintRate <= 0.25)) {
    scores.stable_mastery += 1;
  }

  if (acc >= 75 && acc < 92 && wrongRatio < 0.28 && medWrongMs != null && medWrongMs < 4000 && wrongs.length >= 2) {
    scores.careless_pattern += 1;
  }

  let winner = /** @type {BehaviorDominantType} */ ("undetermined");
  let best = -1;
  for (const [k, v] of Object.entries(scores)) {
    if (v > best) {
      best = v;
      winner = /** @type {BehaviorDominantType} */ (k);
    }
  }
  const strength = Math.round(Math.max(0, Math.min(1, best / 4)) * 100) / 100;
  if (best < 1.15 && q < 4 && wrongs.length < 2) {
    winner = "undetermined";
  }

  const decisionTrace = [
    {
      source: "behavior",
      phase: "inputs",
      data: {
        subjectId,
        topicRowKey: String(topicRowKey || ""),
        questions: q,
        accuracy: acc,
        wrongRatio: Math.round(wrongRatio * 1000) / 1000,
        wrongEventsInRow: wrongs.length,
        modeKey: modeKey || null,
      },
    },
    {
      source: "behavior",
      phase: "aggregates",
      data: {
        medianResponseMsWrong: medWrongMs,
        hintRate,
        hintKnown,
        avgRetry,
        changedRate,
        firstTryMissRate,
        maxPatternFamilyRepeats: maxFamCount,
      },
    },
    { source: "behavior", phase: "scores", data: { ...scores, winner, bestScore: Math.round(best * 100) / 100 } },
  ];

  const summaryParts = [];
  if (winner === "undetermined") {
    summaryParts.push("אין מספיק אותות התנהגותיים באירועי טעות ובנפח כדי לסווג דומיננטית.");
  } else {
    summaryParts.push(`סיווג דומיננטי: ${winner} (עוצמה ${strength}).`);
    if (medWrongMs != null) summaryParts.push(`זמן תגובה חציוני בשאלות שגויות: ${Math.round(medWrongMs)}ms.`);
    if (hintRate != null) summaryParts.push(`שיעור שימוש ברמזים בשאלות שגויות: ${Math.round(hintRate * 100)}%.`);
  }
  const summaryHe = summaryParts.join(" ");

  return {
    version: 1,
    dominantType: winner,
    strength01: winner === "undetermined" ? 0 : strength,
    signals: {
      questions: q,
      accuracy: acc,
      wrongRatio: Math.round(wrongRatio * 1000) / 1000,
      wrongEventCount: wrongs.length,
      modeKey: modeKey || null,
      medianResponseMsWrong: medWrongMs,
      hintRate,
      hintKnownCount: hintKnown,
      avgRetryOnWrong: avgRetry,
      changedAnswerRateOnWrong: changedRate,
      firstTryMissRateOnWrong: firstTryMissRate,
      maxPatternFamilyRepeats: maxFamCount,
      typeScores: scores,
    },
    summaryHe,
    decisionTrace,
  };
}

/**
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, unknown[]>} rawMistakesBySubject
 * @param {number} periodStartMs
 * @param {number} periodEndMs
 */
export function enrichTopicMapsWithRowBehaviorProfiles(maps, rawMistakesBySubject, periodStartMs, periodEndMs) {
  const startMs = Number(periodStartMs);
  const endMs = Number(periodEndMs);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return;

  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const raw = rawMistakesBySubject?.[subjectId] || [];
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      row.behaviorProfile = computeRowBehaviorProfile(subjectId, topicRowKey, row, raw, startMs, endMs);
    }
  }
}
