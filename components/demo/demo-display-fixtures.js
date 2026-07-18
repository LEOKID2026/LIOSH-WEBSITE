import { STUDENT_TRUTH_LABELS_HE } from "../../lib/learning-shared/student-display-truth.js";

/** LEO KIDS brand mascot — Shiba dog, not lion. */
export const DEMO_AVATAR_EMOJI = "🐶";

export const DEMO_COIN_BALANCE = 150;
export const DEMO_DIAMOND_BALANCE = 5;

export const DEMO_DAILY_MISSIONS = {
  missions: [
    {
      id: "demo-m1",
      titleHe: "תרגלו מתמטיקה",
      descriptionHe: "פתרו 5 שאלות במתמטיקה",
      progressCurrent: 2,
      progressTarget: 5,
      completed: false,
      rewardCoins: 10,
    },
    {
      id: "demo-m2",
      titleHe: "משחק סולו",
      descriptionHe: "שחקו משחק סולו אחד",
      progressCurrent: 0,
      progressTarget: 1,
      completed: false,
      rewardCoins: 15,
    },
  ],
};

export const DEMO_MONTHLY_PERSISTENCE = {
  tiers: [
    { id: "demo-tier-1", labelHe: "5 דקות", minutesRequired: 5, reached: true },
    { id: "demo-tier-2", labelHe: "15 דקות", minutesRequired: 15, reached: false },
    { id: "demo-tier-3", labelHe: "30 דקות", minutesRequired: 30, reached: false },
  ],
  minutesThisMonth: 8,
  goalMinutes: 60,
  minutesDisplayHe: "8",
};

export const DEMO_HOME_PAYLOAD = {
  derived: {
    summaryLevel: 3,
    summaryStars: 12,
    bestScoreOverall: 850,
    bestStreakOverall: 7,
    questionsAnswered: 42,
    correctAnswers: 36,
    overallAccuracyPct: 86,
    learningMinutesThisMonth: 8,
    learningMinutesThisMonthDisplayHe: "8",
    monthlyGoalMinutes: 60,
    learningMinutesFilterNoteHe: STUDENT_TRUTH_LABELS_HE.periodThisMonth,
    learningMinutesLifetimeRounded: 120,
    learningMinutesLifetimeDisplayHe: "120",
    learningMinutesLifetimeScopeHe: "מפי סיכומי פגישות (הדגמה)",
    summaryStarsScopeHe: "כל הנושאים",
  },
  profile: {
    avatarEmoji: DEMO_AVATAR_EMOJI,
    avatarBackgroundKey: "sky",
  },
};

/** Pre-built dashboard view for demo home (no student.id required). */
export const DEMO_DASHBOARD_VIEW = {
  identity: {
    displayNameHe: "מצב הדגמה",
    coinBalanceDisplayHe: String(DEMO_COIN_BALANCE),
    coinBalance: DEMO_COIN_BALANCE,
    avatarEmoji: DEMO_AVATAR_EMOJI,
    avatarCustomDataUrl: "",
    avatarBackgroundKey: "sky",
  },
  accountStats: {
    summaryLevel: 3,
    summaryStars: 12,
    summaryStarsScopeHe: "כל הנושאים",
    bestScoreOverall: 850,
    bestStreakOverall: 7,
    questionsAnswered: 42,
    correctAnswers: 36,
    overallAccuracyPct: 86,
    learningMinutesThisMonth: 8,
    learningMinutesThisMonthDisplayHe: "8",
    monthlyGoalMinutes: 60,
    learningMinutesFilterNoteHe: STUDENT_TRUTH_LABELS_HE.periodThisMonth,
    learningMinutesLifetimeRounded: 120,
    learningMinutesLifetimeDisplayHe: "120",
    learningMinutesLifetimeScopeHe: "מפי סיכומי פגישות (הדגמה)",
  },
  dailyMissions: DEMO_DAILY_MISSIONS,
  monthlyPersistence: DEMO_MONTHLY_PERSISTENCE,
  subjects: [
    { key: "math", labelHe: "מתמטיקה", href: "/learning/math-master", accuracyPct: 88, level: 3, stars: 4 },
    { key: "hebrew", labelHe: "עברית", href: "/learning/hebrew-master", accuracyPct: 82, level: 2, stars: 3 },
    { key: "english", labelHe: "אנגלית", href: "/learning/english-master", accuracyPct: 75, level: 2, stars: 2 },
  ],
  badges: [],
  recommendations: [],
  monthlyJourney: {
    minutesThisMonth: 8,
    minutesDisplayHe: "8",
    goalMinutes: 60,
    progressPct: 13,
    filterNoteHe: STUDENT_TRUTH_LABELS_HE.periodThisMonth,
    encouragementHe: "המשיכו לתרגל — זו הדגמה!",
  },
};

export const DEMO_CARDS_COLLECTION = [
  {
    id: "demo-card-1",
    nameHe: "לEO כוכב",
    rarityHe: "נדיר",
    emoji: "⭐",
    owned: true,
    quantity: 1,
  },
  {
    id: "demo-card-2",
    nameHe: "לEO גיבור",
    rarityHe: "רגיל",
    emoji: DEMO_AVATAR_EMOJI,
    owned: true,
    quantity: 2,
  },
];

export const DEMO_SHOP_LISTINGS = [
  {
    id: "demo-shop-1",
    nameHe: "קלף דמו",
    priceCoins: 50,
    emoji: "🃏",
    owned: false,
    canAfford: true,
    alreadyOwned: false,
  },
];

export const DEMO_CARDS_CATALOG = [
  { id: "demo-cat-1", nameHe: "לEO כוכב", rarityHe: "נדיר", emoji: "⭐" },
  { id: "demo-cat-2", nameHe: "לEO גיבור", rarityHe: "רגיל", emoji: DEMO_AVATAR_EMOJI },
];

export const DEMO_CARDS_SERIES = [
  { id: "demo-series-1", nameHe: "סדרת הדגמה", totalCards: 2, ownedCards: 1 },
];

export const DEMO_ARCADE_PROFILE = {
  displayName: "שחקן הדגמה",
  fullName: null,
  totalWins: 0,
  totalLosses: 0,
  totalGames: 0,
  isGuest: false,
  leoNumber: null,
};

export const DEMO_ARCADE_AVATAR = {
  avatarEmoji: DEMO_AVATAR_EMOJI,
  avatarCustomDataUrl: "",
  avatarBackgroundKey: "sky",
};

/** @type {Array<{ id: string, gameKey?: string, resultType?: string, rewardAmount?: number }>} */
export const DEMO_ARCADE_HISTORY = [];

export const DEMO_ARCADE_MISSIONS = {
  missions: [],
  achievements: [],
  featureLocked: false,
};

export const DEMO_ARCADE_FIXTURES = {
  balance: 150,
  diamondBalance: DEMO_DIAMOND_BALANCE,
  games: [],
  clubProfile: { ...DEMO_ARCADE_PROFILE },
  openRooms: [],
  avatar: { ...DEMO_ARCADE_AVATAR },
  history: DEMO_ARCADE_HISTORY,
};

export const DEMO_MY_ROOM_FIXTURE = {
  trophies: [],
  decorations: [],
  messageHe: "חדר אישי — תצוגה במצב הדגמה",
};
