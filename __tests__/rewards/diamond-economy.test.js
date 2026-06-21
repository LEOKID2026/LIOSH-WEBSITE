import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeDiamondRules,
  validateDiamondRules,
  validateSurpriseBoxDiamondRewards,
} from "../../lib/rewards/server/diamond-admin.server.js";
import { calculateSoloGameDiamonds } from "../../lib/rewards/server/diamond-ledger.server.js";
import { calculateSoloGameCoins } from "../../lib/solo-games/server/solo-game-payout.server.js";

describe("calculateSoloGameDiamonds", () => {
  it("returns 0 when disabled", () => {
    const result = calculateSoloGameDiamonds({ enabled: false, fixedAmount: 5 }, {
      didWin: true,
      score: 1000,
    });
    assert.equal(result.diamonds, 0);
  });

  it("awards fixedAmount on win_only when enabled", () => {
    const result = calculateSoloGameDiamonds(
      {
        enabled: true,
        mode: "win_only",
        fixedAmount: 3,
        maxPerSession: 10,
        onlyOnWin: false,
        tiers: [],
      },
      { didWin: true, score: 100 }
    );
    assert.equal(result.diamonds, 3);
  });

  it("returns 0 when onlyOnWin and did not win", () => {
    const result = calculateSoloGameDiamonds(
      {
        enabled: true,
        mode: "win_only",
        fixedAmount: 3,
        onlyOnWin: true,
      },
      { didWin: false, score: 100 }
    );
    assert.equal(result.diamonds, 0);
  });

  it("respects maxPerSession cap", () => {
    const result = calculateSoloGameDiamonds(
      {
        enabled: true,
        mode: "win_only",
        fixedAmount: 8,
        maxPerSession: 5,
      },
      { didWin: true, score: 100 }
    );
    assert.equal(result.diamonds, 5);
  });

  it("uses in_game_collect multiplier", () => {
    const result = calculateSoloGameDiamonds(
      {
        enabled: true,
        mode: "in_game_collect",
        inGameCollectMultiplier: 2,
        maxPerSession: 10,
      },
      { diamondsCollected: 3, score: 0 }
    );
    assert.equal(result.diamonds, 6);
  });
});

describe("validateDiamondRules", () => {
  it("normalizes and accepts valid rules", () => {
    const result = validateDiamondRules({
      enabled: true,
      mode: "win_only",
      fixedAmount: 2,
      maxPerSession: 5,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.fixedAmount, 2);
  });

  it("rejects excessive maxPerSession", () => {
    const result = validateDiamondRules({ enabled: true, maxPerSession: 5000 });
    assert.equal(result.ok, false);
  });
});

describe("validateSurpriseBoxDiamondRewards", () => {
  it("requires at least one weighted reward", () => {
    assert.equal(validateSurpriseBoxDiamondRewards([]).ok, false);
    assert.equal(
      validateSurpriseBoxDiamondRewards([{ amount: 2, weight: 5 }]).ok,
      true
    );
  });
});

describe("coins unchanged by diamond rule edits", () => {
  it("calculateSoloGameCoins ignores diamondRules", () => {
    const rules = {
      baseCoins: 10,
      scoreUnitDivisor: 10,
      perScoreUnit: 1,
      maxCoins: 100,
      diamondRules: { enabled: true, fixedAmount: 99 },
    };
    const payout = calculateSoloGameCoins("catcher", "medium", { score: 50 }, rules);
    assert.equal(payout.coins, 15);
  });
});

describe("normalizeDiamondRules", () => {
  it("defaults mode to win_only", () => {
    const rules = normalizeDiamondRules({ enabled: true });
    assert.equal(rules.mode, "win_only");
    assert.equal(rules.enabled, true);
  });
});
