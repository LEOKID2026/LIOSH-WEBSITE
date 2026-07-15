import { applyArcadeCoinMove } from "../../arcade/server/arcade-coins.js";
import { requireEducationalGameRules } from "../../rewards/server/economy-config.server.js";
import { difficultyLabelHe } from "../educational-game-registry.js";
import {
  getEducationalPositiveProgress,
  zeroProgressCoinResult,
} from "../../games/server/positive-progress.server.js";

const EDUCATIONAL_COIN_SOURCE_TYPE = "educational_game";

const RECYCLING_FACTORY_MAX_SCORE = Object.freeze({
  easy: 450,
  medium: 700,
  hard: 950,
});

const LEO_SUPERMARKET_MAX_SCORE = Object.freeze({
  easy: 3500,
  medium: 4000,
  hard: 4500,
});

const LEO_LAB_MAX_SCORE = Object.freeze({
  easy: 1200,
  medium: 1300,
  hard: 1400,
});

const LEO_PIZZERIA_MAX_SCORE = Object.freeze({
  easy: 1200,
  medium: 1300,
  hard: 1400,
});

const LEO_CONTINUOUS_MAX_SCORE = Object.freeze({
  easy: 8000,
  medium: 10000,
  hard: 12000,
});

const LEO_NUMBER_PATH_MAX_SCORE = Object.freeze({
  easy: 500,
  medium: 550,
  hard: 600,
});

const LEO_LANGUAGE_TASK_MAX_SCORE = Object.freeze({
  easy: 900,
  medium: 1000,
  hard: 1100,
});

function clampInt(n, min, max) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

function clampFloat(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function mapByDifficulty(rulesObj, diff, fallback) {
  if (rulesObj && typeof rulesObj === "object" && rulesObj[diff] != null) {
    return clampInt(rulesObj[diff], 0, 100000);
  }
  return fallback;
}

function calculateRecyclingFactoryCoins(diff, metrics, rules) {
  const progress = getEducationalPositiveProgress("recycling-factory", metrics);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const baseRate = mapByDifficulty(
    rules?.basePerCorrectItem,
    diff,
    diff === "easy" ? 3 : diff === "hard" ? 5 : 4,
  );
  const completeBonus = mapByDifficulty(
    rules?.completeTargetBonus,
    diff,
    diff === "easy" ? 35 : diff === "hard" ? 65 : 50,
  );

  const itemsSorted = progress;
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 200);
  const didWin = metrics?.didWin === true;
  const score = clampInt(metrics?.score, 0, 100000);

  let coins = itemsSorted * baseRate;
  const breakdown = [`מיון נכון (${itemsSorted}): ${itemsSorted * baseRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.75) {
    const bonusPct = clampFloat(rules?.accuracyBonus75, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 10) {
    const streakBonus = clampInt(rules?.bestStreakBonus10, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (didWin && completeBonus > 0) {
    coins += completeBonus;
    breakdown.push(`השלמת יעד: +${completeBonus}`);
  }

  const highThreshold = clampInt(rules?.highScoreBonusThreshold, 0, 100000);
  const highBonus = clampInt(rules?.highScoreBonus, 0, maxCoins);
  if (didWin && score >= highThreshold && highBonus > 0) {
    coins += highBonus;
    breakdown.push(`ניקוד גבוה: +${highBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoSupermarketCoins(diff, metrics, rules) {
  const progress = getEducationalPositiveProgress("leo-supermarket", metrics);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const correct = progress;
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 30);

  const correctRate = mapByDifficulty(
    rules?.bonusPerCorrectCustomer,
    diff,
    diff === "easy" ? 7 : diff === "hard" ? 13 : 10,
  );
  const completeBonus = mapByDifficulty(
    rules?.completeAll30Bonus,
    diff,
    diff === "easy" ? 40 : diff === "hard" ? 80 : 60,
  );

  let coins = correct * correctRate;
  const breakdown = [`לקוחות נכונים (${correct}): ${correct * correctRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.75) {
    const bonusPct = clampFloat(rules?.accuracyBonus75, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 10) {
    const streakBonus = clampInt(rules?.bestStreakBonus10, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (metrics?.completedAllCustomers === true && completeBonus > 0) {
    coins += completeBonus;
    breakdown.push(`20 לקוחות: +${completeBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoLabCoins(diff, metrics, rules) {
  const progress = getEducationalPositiveProgress("leo-lab", metrics);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const successful = progress;
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 20);

  const successRate = mapByDifficulty(
    rules?.bonusPerSuccessfulExperiment,
    diff,
    diff === "easy" ? 4 : diff === "hard" ? 8 : 6,
  );
  const completeBonus = mapByDifficulty(
    rules?.completeAll20Bonus,
    diff,
    diff === "easy" ? 35 : diff === "hard" ? 65 : 50,
  );

  let coins = successful * successRate;
  const breakdown = [`ניסויים שהצליחו (${successful}): ${successful * successRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.8) {
    const bonusPct = clampFloat(rules?.accuracyBonus80, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 5) {
    const streakBonus = clampInt(rules?.bestStreakBonus5, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (metrics?.completedAllExperiments === true && completeBonus > 0) {
    coins += completeBonus;
    breakdown.push(`20 ניסויים: +${completeBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoPizzeriaCoins(diff, metrics, rules) {
  const progress = getEducationalPositiveProgress("leo-pizzeria", metrics);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const successful = progress;
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 20);

  const successRate = mapByDifficulty(
    rules?.bonusPerSuccessfulCustomer,
    diff,
    diff === "easy" ? 4 : diff === "hard" ? 8 : 6,
  );
  const completeBonus = mapByDifficulty(
    rules?.completeAll20Bonus,
    diff,
    diff === "easy" ? 35 : diff === "hard" ? 65 : 50,
  );

  let coins = successful * successRate;
  const breakdown = [`לקוחות ששירתם (${successful}): ${successful * successRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.8) {
    const bonusPct = clampFloat(rules?.accuracyBonus80, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 5) {
    const streakBonus = clampInt(rules?.bestStreakBonus5, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (metrics?.completedAllCustomers === true && completeBonus > 0) {
    coins += completeBonus;
    breakdown.push(`20 לקוחות: +${completeBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoContinuousCoins(diff, metrics, rules, progressLabel) {
  const progress = clampInt(metrics?.successfulQuestions, 0, 20);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 50);

  const successRate = mapByDifficulty(
    rules?.bonusPerSuccessfulQuestion,
    diff,
    diff === "easy" ? 4 : diff === "hard" ? 8 : 6,
  );
  const milestoneBonus = mapByDifficulty(
    rules?.milestoneBonus25,
    diff,
    diff === "easy" ? 30 : diff === "hard" ? 60 : 45,
  );

  let coins = progress * successRate;
  const breakdown = [`${progressLabel} (${progress}): ${progress * successRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.8) {
    const bonusPct = clampFloat(rules?.accuracyBonus80, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 5) {
    const streakBonus = clampInt(rules?.bestStreakBonus5, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (progress >= 20 && milestoneBonus > 0) {
    coins += milestoneBonus;
    breakdown.push(`אבן דרך 20: +${milestoneBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoGiftsCoins(diff, metrics, rules) {
  return calculateLeoContinuousCoins(diff, metrics, rules, "שאלות נכונות");
}

function calculateLeoBakeryCoins(diff, metrics, rules) {
  return calculateLeoContinuousCoins(diff, metrics, rules, "הזמנות נכונות");
}

function calculateLeoNumberPathCoins(diff, metrics, rules) {
  const progress = clampInt(metrics?.successfulTasks, 0, 20);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 20);

  const successRate = mapByDifficulty(
    rules?.bonusPerSuccessfulTask,
    diff,
    diff === "easy" ? 8 : diff === "hard" ? 14 : 11,
  );
  const completeBonus = mapByDifficulty(
    rules?.completeAll12Bonus,
    diff,
    diff === "easy" ? 35 : diff === "hard" ? 65 : 50,
  );

  let coins = progress * successRate;
  const breakdown = [`משימות שהצליחו (${progress}): ${progress * successRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.8) {
    const bonusPct = clampFloat(rules?.accuracyBonus80, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 5) {
    const streakBonus = clampInt(rules?.bestStreakBonus5, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (metrics?.completedAllTasks === true && completeBonus > 0) {
    coins += completeBonus;
    breakdown.push(`20 משימות: +${completeBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoLanguageTaskCoins(diff, metrics, rules) {
  const progress = clampInt(metrics?.successfulTasks, 0, 20);
  const zero = zeroProgressCoinResult(progress);
  if (zero) {
    return { ...zero, displayLevelHe: difficultyLabelHe(diff) };
  }

  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 20);

  const successRate = mapByDifficulty(
    rules?.bonusPerSuccessfulTask,
    diff,
    diff === "easy" ? 6 : diff === "hard" ? 10 : 8,
  );
  const completeBonus = mapByDifficulty(
    rules?.completeAll20Bonus,
    diff,
    diff === "easy" ? 40 : diff === "hard" ? 70 : 55,
  );

  let coins = progress * successRate;
  const breakdown = [`משימות שהצליחו (${progress}): ${progress * successRate}`];

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.8) {
    const bonusPct = clampFloat(rules?.accuracyBonus80, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 5) {
    const streakBonus = clampInt(rules?.bestStreakBonus5, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  if (metrics?.completedAllTasks === true && completeBonus > 0) {
    coins += completeBonus;
    breakdown.push(`20 משימות: +${completeBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

function calculateLeoWordTrainCoins(diff, metrics, rules) {
  return calculateLeoLanguageTaskCoins(diff, metrics, rules);
}

function calculateLeoWordDetectiveCoins(diff, metrics, rules) {
  return calculateLeoLanguageTaskCoins(diff, metrics, rules);
}

/**
 * @param {Record<string, unknown>} metrics
 * @param {string|null|undefined} difficulty
 * @param {Record<string, unknown>} rules
 */
export function calculateEducationalGameCoins(gameKey, difficulty, metrics, rules) {
  const diff = String(difficulty || metrics?.difficulty || "medium").toLowerCase();
  if (gameKey === "leo-supermarket") {
    return calculateLeoSupermarketCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-lab") {
    return calculateLeoLabCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-pizzeria") {
    return calculateLeoPizzeriaCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-gifts") {
    return calculateLeoGiftsCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-bakery") {
    return calculateLeoBakeryCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-number-path") {
    return calculateLeoNumberPathCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-word-train") {
    return calculateLeoWordTrainCoins(diff, metrics, rules);
  }
  if (gameKey === "leo-word-detective") {
    return calculateLeoWordDetectiveCoins(diff, metrics, rules);
  }
  return calculateRecyclingFactoryCoins(diff, metrics, rules);
}

function validateRecyclingFactoryMetrics(metrics, diff, score) {
  const sortedItems = Number(metrics?.sortedItems);
  const correctItems = Number(metrics?.correctItems);
  const wrongItems = Number(metrics?.wrongItems);
  const missedItems = Number(metrics?.missedItems);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [sortedItems, 100, "פריטים שמוינו"],
    [correctItems, 100, "פריטים נכונים"],
    [wrongItems, 50, "טעויות מיון"],
    [missedItems, 50, "פריטים שפוספסו"],
    [mistakes, 50, "טעויות"],
    [bestStreak, 100, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  const cap = RECYCLING_FACTORY_MAX_SCORE[diff] || 950;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };
  const expectedSorted = 20;
  if (metrics?.didWin === true && sortedItems < expectedSorted) {
    return { ok: false, message: "כמות פריטים לא תקינה" };
  }
  if (correctItems > sortedItems + 2) {
    return { ok: false, message: "נתוני מיון לא תקינים" };
  }
  if (Math.abs(mistakes - (wrongItems + missedItems)) > 1) {
    return { ok: false, message: "ספירת טעויות לא תקינה" };
  }

  return { ok: true };
}

function validateLeoSupermarketMetrics(metrics, diff, score) {
  const customersTotal = Number(metrics?.customersTotal);
  const customersReached = Number(metrics?.customersReached);
  const customersCompleted = Number(metrics?.customersCompleted);
  const correctCustomers = Number(metrics?.correctCustomers);
  const wrongProducts = Number(metrics?.wrongProducts);
  const wrongChange = Number(metrics?.wrongChange);
  const timeoutMistakes = Number(metrics?.timeoutMistakes);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [customersTotal, 20, "סה״כ לקוחות"],
    [customersReached, 20, "לקוחות שהגיעו"],
    [customersCompleted, 20, "לקוחות שטופלו"],
    [correctCustomers, 20, "לקוחות נכונים"],
    [wrongProducts, 20, "טעויות מוצר"],
    [wrongChange, 20, "טעויות עודף"],
    [timeoutMistakes, 20, "פסילות זמן"],
    [mistakes, 20, "פסילות"],
    [bestStreak, 20, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (customersTotal !== 20) {
    return { ok: false, message: "סה״כ לקוחות לא תקין" };
  }
  if (customersReached > customersTotal || customersCompleted > customersTotal) {
    return { ok: false, message: "ספירת לקוחות לא תקינה" };
  }
  if (correctCustomers > customersCompleted + 1) {
    return { ok: false, message: "לקוחות נכונים לא תקינים" };
  }
  if (Math.abs(mistakes - (wrongProducts + wrongChange + timeoutMistakes)) > 1) {
    return { ok: false, message: "ספירת פסילות לא תקינה" };
  }

  const cap = LEO_SUPERMARKET_MAX_SCORE[diff] || 4500;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };

  return { ok: true };
}

function buildLeoSupermarketFinishPresentation(metrics) {
  const correct = clampInt(metrics?.correctCustomers, 0, 20);
  return {
    subtitleHe: `כל הכבוד! שירתת ${correct} לקוחות ועזרת לליאו במכולת`,
    statsLines: [
      { label: "לקוחות שהגעת אליהם", value: String(clampInt(metrics?.customersReached, 0, 20)) },
      { label: "לקוחות שטופלו", value: String(clampInt(metrics?.customersCompleted, 0, 20)) },
      { label: "לקוחות נכונים", value: String(correct) },
      { label: "דיוק", value: `${Math.round(clampFloat(metrics?.accuracy, 0, 1) * 100)}%` },
      { label: "פסילות", value: String(clampInt(metrics?.mistakes, 0, 20)) },
      { label: "רצף הכי טוב", value: String(clampInt(metrics?.bestStreak, 0, 20)) },
    ],
  };
}

function buildLeoLabFinishPresentation(metrics) {
  const successful = clampInt(metrics?.successfulExperiments, 0, 20);
  return {
    subtitleHe: `כל הכבוד! הצלחתם לבצע ${successful} ניסויים במעבדה של ליאו`,
    statsLines: [
      { label: "ניסויים שהגעתם אליהם", value: String(clampInt(metrics?.experimentsReached, 0, 20)) },
      { label: "ניסויים שהצליחו", value: String(successful) },
      { label: "טעויות", value: String(clampInt(metrics?.mistakes, 0, 20)) },
      { label: "דיוק", value: `${Math.round(clampFloat(metrics?.accuracy, 0, 1) * 100)}%` },
      { label: "רצף הכי טוב", value: String(clampInt(metrics?.bestStreak, 0, 20)) },
    ],
  };
}

function buildLeoPizzeriaFinishPresentation(metrics) {
  const successful = clampInt(metrics?.successfulCustomers, 0, 20);
  return {
    subtitleHe: `כל הכבוד! הכנתם ${successful} פיצות נכונות בפיצרייה של ליאו`,
    statsLines: [
      { label: "לקוחות שהגעתם אליהם", value: String(clampInt(metrics?.customersReached, 0, 20)) },
      { label: "פיצות שהוגשו נכון", value: String(successful) },
      { label: "טעויות", value: String(clampInt(metrics?.mistakes, 0, 20)) },
      { label: "דיוק", value: `${Math.round(clampFloat(metrics?.accuracy, 0, 1) * 100)}%` },
      { label: "רצף הכי טוב", value: String(clampInt(metrics?.bestStreak, 0, 20)) },
    ],
  };
}

function validateLeoLabMetrics(metrics, diff, score) {
  const experimentsTotal = Number(metrics?.experimentsTotal);
  const experimentsReached = Number(metrics?.experimentsReached);
  const successfulExperiments = Number(metrics?.successfulExperiments);
  const failedAttempts = Number(metrics?.failedAttempts);
  const mistakes = Number(metrics?.mistakes);
  const firstTrySuccesses = Number(metrics?.firstTrySuccesses);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [experimentsTotal, 20, "סה״כ ניסויים"],
    [experimentsReached, 20, "ניסויים שהגיעו"],
    [successfulExperiments, 20, "ניסויים שהצליחו"],
    [failedAttempts, 30, "ניסיונות כושלים"],
    [mistakes, 20, "טעויות"],
    [firstTrySuccesses, 20, "הצלחות בניסיון ראשון"],
    [bestStreak, 20, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (experimentsTotal !== 20) {
    return { ok: false, message: "סה״כ ניסויים לא תקין" };
  }
  if (experimentsReached > experimentsTotal || successfulExperiments > experimentsTotal) {
    return { ok: false, message: "ספירת ניסויים לא תקינה" };
  }
  if (successfulExperiments > experimentsReached + 1) {
    return { ok: false, message: "ניסויים שהצליחו לא תקינים" };
  }
  if (Math.abs(mistakes - failedAttempts) > 1) {
    return { ok: false, message: "ספירת טעויות לא תקינה" };
  }
  if (firstTrySuccesses > successfulExperiments + 1) {
    return { ok: false, message: "הצלחות בניסיון ראשון לא תקינות" };
  }

  const cap = LEO_LAB_MAX_SCORE[diff] || 1400;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };

  return { ok: true };
}

function validateLeoPizzeriaMetrics(metrics, diff, score) {
  const customersTotal = Number(metrics?.customersTotal);
  const customersReached = Number(metrics?.customersReached);
  const successfulCustomers = Number(metrics?.successfulCustomers);
  const failedAttempts = Number(metrics?.failedAttempts);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [customersTotal, 20, "סה״כ לקוחות"],
    [customersReached, 20, "לקוחות שהגיעו"],
    [successfulCustomers, 20, "לקוחות ששירתם"],
    [failedAttempts, 30, "ניסיונות כושלים"],
    [mistakes, 20, "טעויות"],
    [bestStreak, 20, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (customersTotal !== 20) {
    return { ok: false, message: "סה״כ לקוחות לא תקין" };
  }
  if (customersReached > customersTotal || successfulCustomers > customersTotal) {
    return { ok: false, message: "ספירת לקוחות לא תקינה" };
  }
  if (successfulCustomers > customersReached + 1) {
    return { ok: false, message: "לקוחות ששירתם לא תקינים" };
  }
  if (Math.abs(mistakes - failedAttempts) > 1) {
    return { ok: false, message: "ספירת טעויות לא תקינה" };
  }

  const cap = LEO_PIZZERIA_MAX_SCORE[diff] || 1400;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };

  return { ok: true };
}

function validateLeoContinuousMetrics(metrics, diff, score, maxQuestions) {
  const successfulQuestions = Number(metrics?.successfulQuestions);
  const questionsReached = Number(metrics?.questionsReached);
  const failedAttempts = Number(metrics?.failedAttempts);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const highestStage = Number(metrics?.highestStage);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [successfulQuestions, maxQuestions, "שאלות נכונות"],
    [questionsReached, maxQuestions, "שאלות שהגיעו"],
    [failedAttempts, maxQuestions, "ניסיונות כושלים"],
    [mistakes, 10, "טעויות"],
    [bestStreak, maxQuestions, "רצף"],
    [highestStage, 50, "שלב"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (successfulQuestions > questionsReached + 1) {
    return { ok: false, message: "ספירת שאלות לא תקינה" };
  }

  const cap = LEO_CONTINUOUS_MAX_SCORE[diff] || 12000;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };

  return { ok: true };
}

function validateLeoGiftsMetrics(metrics, diff, score) {
  return validateLeoContinuousMetrics(metrics, diff, score, 200);
}

function validateLeoBakeryMetrics(metrics, diff, score) {
  return validateLeoContinuousMetrics(metrics, diff, score, 200);
}

function buildLeoContinuousFinishPresentation(metrics, emoji, noun) {
  const successful = clampInt(metrics?.successfulQuestions, 0, 200);
  return {
    subtitleHe: `כל הכבוד! פתרתם ${successful} ${noun} ${emoji}`,
    statsLines: [
      { label: "שאלות שהגעתם אליהן", value: String(clampInt(metrics?.questionsReached, 0, 200)) },
      { label: "תשובות נכונות", value: String(successful) },
      { label: "טעויות", value: String(clampInt(metrics?.mistakes, 0, 10)) },
      { label: "שלב הכי גבוה", value: String(clampInt(metrics?.highestStage, 1, 50)) },
      { label: "דיוק", value: `${Math.round(clampFloat(metrics?.accuracy, 0, 1) * 100)}%` },
      { label: "רצף הכי טוב", value: String(clampInt(metrics?.bestStreak, 0, 200)) },
    ],
  };
}

function buildLeoGiftsFinishPresentation(metrics) {
  return buildLeoContinuousFinishPresentation(metrics, "🎁", "שאלות חילוק");
}

function buildLeoBakeryFinishPresentation(metrics) {
  return buildLeoContinuousFinishPresentation(metrics, "🥐", "הזמנות");
}

function buildLeoNumberPathFinishPresentation(metrics) {
  const successful = clampInt(metrics?.successfulTasks, 0, 20);
  return {
    subtitleHe: `כל הכבוד! השלמתם ${successful} משימות במסלול המספרים`,
    statsLines: [
      { label: "משימות שהגעתם אליהן", value: String(clampInt(metrics?.tasksReached, 0, 20)) },
      { label: "משימות שהצליחו", value: String(successful) },
      { label: "טעויות", value: String(clampInt(metrics?.mistakes, 0, 36)) },
      { label: "דיוק", value: `${Math.round(clampFloat(metrics?.accuracy, 0, 1) * 100)}%` },
      { label: "רצף הכי טוב", value: String(clampInt(metrics?.bestStreak, 0, 20)) },
    ],
  };
}

function buildLeoLanguageTaskFinishPresentation(metrics, emoji, titleHe) {
  const successful = clampInt(metrics?.successfulTasks, 0, 20);
  return {
    subtitleHe: `${emoji} כל הכבוד! השלמתם ${successful} משימות ב${titleHe}`,
    statsLines: [
      { label: "משימות שהגעתם אליהן", value: String(clampInt(metrics?.tasksReached, 0, 20)) },
      { label: "משימות שהצליחו", value: String(successful) },
      { label: "טעויות", value: String(clampInt(metrics?.mistakes, 0, 20)) },
      { label: "דיוק", value: `${Math.round(clampFloat(metrics?.accuracy, 0, 1) * 100)}%` },
      { label: "רצף הכי טוב", value: String(clampInt(metrics?.bestStreak, 0, 20)) },
    ],
  };
}

function buildLeoWordTrainFinishPresentation(metrics) {
  return buildLeoLanguageTaskFinishPresentation(metrics, "🚂", "רכבת המילים");
}

function buildLeoWordDetectiveFinishPresentation(metrics) {
  return buildLeoLanguageTaskFinishPresentation(metrics, "🕵️", "בלש המילים");
}

function validateLeoNumberPathMetrics(metrics, diff, score) {
  const tasksTotal = Number(metrics?.tasksTotal);
  const tasksReached = Number(metrics?.tasksReached);
  const successfulTasks = Number(metrics?.successfulTasks);
  const failedAttempts = Number(metrics?.failedAttempts);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [tasksTotal, 20, "סה״כ משימות"],
    [tasksReached, 20, "משימות שהגיעו"],
    [successfulTasks, 20, "משימות שהצליחו"],
    [failedAttempts, 60, "ניסיונות כושלים"],
    [mistakes, 36, "טעויות"],
    [bestStreak, 20, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (tasksTotal !== 20) {
    return { ok: false, message: "סה״כ משימות לא תקין" };
  }
  if (tasksReached > tasksTotal || successfulTasks > tasksTotal) {
    return { ok: false, message: "ספירת משימות לא תקינה" };
  }

  const cap = LEO_NUMBER_PATH_MAX_SCORE[diff] || 600;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };

  return { ok: true };
}

function validateLeoLanguageTaskMetrics(metrics, diff, score) {
  const tasksTotal = Number(metrics?.tasksTotal);
  const tasksReached = Number(metrics?.tasksReached);
  const successfulTasks = Number(metrics?.successfulTasks);
  const failedAttempts = Number(metrics?.failedAttempts);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [tasksTotal, 20, "סה״כ משימות"],
    [tasksReached, 20, "משימות שהגיעו"],
    [successfulTasks, 20, "משימות שהצליחו"],
    [failedAttempts, 60, "ניסיונות כושלים"],
    [mistakes, 20, "טעויות"],
    [bestStreak, 20, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (tasksTotal !== 20) {
    return { ok: false, message: "סה״כ משימות לא תקין" };
  }
  if (tasksReached > tasksTotal || successfulTasks > tasksTotal) {
    return { ok: false, message: "ספירת משימות לא תקינה" };
  }

  const cap = LEO_LANGUAGE_TASK_MAX_SCORE[diff] || 1100;
  if (score > cap) return { ok: false, message: "ניקוד חריג" };

  return { ok: true };
}

function validateLeoWordTrainMetrics(metrics, diff, score) {
  return validateLeoLanguageTaskMetrics(metrics, diff, score);
}

function validateLeoWordDetectiveMetrics(metrics, diff, score) {
  return validateLeoLanguageTaskMetrics(metrics, diff, score);
}

/**
 * @param {Record<string, unknown>} metrics
 * @param {string} gameKey
 * @param {string|null|undefined} difficulty
 */
export function validateEducationalGameMetrics(metrics, gameKey, difficulty) {
  const score = Number(metrics?.score);
  if (!Number.isFinite(score) || score < 0 || score > 100000) {
    return { ok: false, message: "ניקוד לא תקין" };
  }

  const diff = String(difficulty || metrics?.difficulty || "").toLowerCase();
  if (!["easy", "medium", "hard"].includes(diff)) {
    return { ok: false, message: "רמת קושי לא תקינה" };
  }

  if (gameKey === "leo-supermarket") {
    return validateLeoSupermarketMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-lab") {
    return validateLeoLabMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-pizzeria") {
    return validateLeoPizzeriaMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-gifts") {
    return validateLeoGiftsMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-bakery") {
    return validateLeoBakeryMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-number-path") {
    return validateLeoNumberPathMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-word-train") {
    return validateLeoWordTrainMetrics(metrics, diff, score);
  }
  if (gameKey === "leo-word-detective") {
    return validateLeoWordDetectiveMetrics(metrics, diff, score);
  }
  if (gameKey === "recycling-factory") {
    return validateRecyclingFactoryMetrics(metrics, diff, score);
  }

  return { ok: false, message: "משחק לא נתמך" };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 */
export async function finalizeEducationalGameSession(supabase, params) {
  const { session, studentId, metrics, finishedAt = new Date().toISOString() } = params;
  const gameKey = session.game_key;
  const difficulty = session.difficulty || metrics?.difficulty || null;

  const metricCheck = validateEducationalGameMetrics(metrics, gameKey, difficulty);
  if (!metricCheck.ok) {
    return { ok: false, code: "invalid_metrics", message: metricCheck.message };
  }

  const rules = await requireEducationalGameRules(supabase, gameKey);
  const payout = calculateEducationalGameCoins(gameKey, difficulty, metrics, rules);
  const leoPresentation =
    gameKey === "leo-supermarket"
      ? buildLeoSupermarketFinishPresentation(metrics)
      : gameKey === "leo-lab"
        ? buildLeoLabFinishPresentation(metrics)
        : gameKey === "leo-pizzeria"
          ? buildLeoPizzeriaFinishPresentation(metrics)
          : gameKey === "leo-gifts"
          ? buildLeoGiftsFinishPresentation(metrics)
          : gameKey === "leo-bakery"
            ? buildLeoBakeryFinishPresentation(metrics)
            : gameKey === "leo-number-path"
              ? buildLeoNumberPathFinishPresentation(metrics)
              : gameKey === "leo-word-train"
                ? buildLeoWordTrainFinishPresentation(metrics)
                : gameKey === "leo-word-detective"
                  ? buildLeoWordDetectiveFinishPresentation(metrics)
                  : null;

  let balanceAfter = null;
  let duplicate = false;

  if (payout.coins > 0) {
    const coinResult = await applyArcadeCoinMove(supabase, {
      studentId,
      direction: "earn",
      amount: payout.coins,
      idempotencyKey: `educational_game_${session.id}`,
      sourceType: EDUCATIONAL_COIN_SOURCE_TYPE,
      sourceId: session.id,
      metadata: {
        gameKey,
        category: "educational",
        difficulty,
        metrics,
        breakdownHe: payout.breakdownHe,
      },
      reason: `educational_game_${gameKey}`,
    });

    if (!coinResult.ok) {
      return {
        ok: false,
        code: coinResult.code || "coin_failed",
        message: coinResult.message || "לא ניתן לזכות מטבעות",
      };
    }
    balanceAfter = coinResult.balanceAfter ?? null;
    duplicate = coinResult.duplicate === true;
  } else {
    const { data: balRow } = await supabase
      .from("student_coin_balances")
      .select("balance")
      .eq("student_id", studentId)
      .maybeSingle();
    balanceAfter = balRow?.balance ?? 0;
  }

  const resultJson = {
    didWin: metrics?.didWin === true,
    score: metrics?.score ?? 0,
    coinsAwarded: payout.coins,
    breakdownHe: payout.breakdownHe,
    displayLevelHe: payout.displayLevelHe,
    balanceAfter,
    duplicate,
    accuracy: metrics?.accuracy ?? 0,
    correctItems: metrics?.correctItems ?? metrics?.correctCustomers ?? metrics?.successfulExperiments ?? 0,
    mistakes: metrics?.mistakes ?? 0,
    bestStreak: metrics?.bestStreak ?? 0,
    subtitleHe: leoPresentation?.subtitleHe,
    statsLines: leoPresentation?.statsLines,
  };

  const { error: updateError } = await supabase
    .from("educational_game_sessions")
    .update({
      status: "completed",
      finished_at: finishedAt,
      metrics_json: metrics,
      coins_awarded: payout.coins,
      result_json: resultJson,
      updated_at: finishedAt,
    })
    .eq("id", session.id)
    .eq("student_id", studentId)
    .eq("status", "active");

  if (updateError) {
    return { ok: false, code: "db_error", message: updateError.message || "לא ניתן לשמור תוצאה" };
  }

  return {
    ok: true,
    didWin: resultJson.didWin,
    score: resultJson.score,
    coinsAwarded: payout.coins,
    breakdownHe: payout.breakdownHe,
    displayLevelHe: payout.displayLevelHe,
    balanceAfter,
    duplicate,
    accuracy: Math.round((metrics?.accuracy ?? 0) * 100),
    correctItems: resultJson.correctItems,
    mistakes: metrics?.mistakes ?? 0,
    bestStreak: metrics?.bestStreak ?? 0,
    subtitleHe: leoPresentation?.subtitleHe,
    statsLines: leoPresentation?.statsLines,
  };
}
