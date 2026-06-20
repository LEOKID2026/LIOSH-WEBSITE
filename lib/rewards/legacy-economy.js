/**
 * SEED / MIGRATION ONLY — not a runtime economy source.
 * Do not import from award, display, or API paths at runtime.
 * Values are copied into DB via migrations (058+) and future 063 seed.
 */

export const LEGACY_MISSION_POOL = {
  g12: [
    { id: "questions_10", textHe: "ענה על 10 שאלות היום", type: "questions", target: 10, rewardCoins: 20 },
    { id: "minutes_5", textHe: "למד 5 דקות היום", type: "minutes", target: 5, rewardCoins: 20 },
    { id: "subjects_1", textHe: "תרגל מקצוע אחד לפחות", type: "subjects", target: 1, rewardCoins: 20 },
  ],
  g34: [
    { id: "questions_15", textHe: "ענה על 15 שאלות היום", type: "questions", target: 15, rewardCoins: 20 },
    { id: "minutes_8", textHe: "למד 8 דקות היום", type: "minutes", target: 8, rewardCoins: 20 },
    { id: "subjects_2", textHe: "תרגל שני מקצועות שונים", type: "subjects", target: 2, rewardCoins: 20 },
  ],
  g56: [
    { id: "questions_20", textHe: "ענה על 20 שאלות היום", type: "questions", target: 20, rewardCoins: 20 },
    { id: "minutes_10", textHe: "למד 10 דקות היום", type: "minutes", target: 10, rewardCoins: 20 },
    { id: "subjects_2", textHe: "תרגל שני מקצועות שונים", type: "subjects", target: 2, rewardCoins: 20 },
  ],
};

export const LEGACY_MISSION_REWARD_COINS = 20;

export const LEGACY_MONTHLY_PERSISTENCE_TIERS = [
  { minutes: 100, coins: 10_000, labelHe: "יעד 100 דקות" },
  { minutes: 250, coins: 30_000, labelHe: "יעד 250 דקות" },
  { minutes: 400, coins: 60_000, labelHe: "יעד 400 דקות" },
  { minutes: 600, coins: 100_000, labelHe: "יעד 600 דקות" },
];

export const LEGACY_MONTHLY_GLOBAL = {
  monthlyMinutesCap: 600,
  monthlyCoinsCap: 100_000,
};
