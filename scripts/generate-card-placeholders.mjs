#!/usr/bin/env node
/**
 * Regenerate Hebrew card placeholder SVGs for LOCAL DEV ONLY.
 * Do NOT run in production deploy — student world must not rely on these paths.
 * Run: node scripts/generate-card-placeholders.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, "..", "public", "rewards", "cards");

const RARITY_STYLE = {
  regular: { label: "רגיל", from: "#e2e8f0", to: "#94a3b8", stroke: "#64748b", text: "#334155", sub: "#475569" },
  special: { label: "מיוחד", from: "#ddd6fe", to: "#7c3aed", stroke: "#6d28d9", text: "#ffffff", sub: "#ede9fe" },
  rare: { label: "נדיר", from: "#bae6fd", to: "#0284c7", stroke: "#0369a1", text: "#ffffff", sub: "#e0f2fe" },
  gold: { label: "זהב", from: "#fde68a", to: "#d97706", stroke: "#b45309", text: "#78350f", sub: "#92400e" },
};

function cardSvg(nameHe, rarity) {
  const v = RARITY_STYLE[rarity] || RARITY_STYLE.regular;
  const title = String(nameHe).slice(0, 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${v.from}"/>
      <stop offset="100%" stop-color="${v.to}"/>
    </linearGradient>
  </defs>
  <rect width="200" height="280" rx="16" fill="url(#bg)" stroke="${v.stroke}" stroke-width="3"/>
  <text x="100" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${v.text}">${title}</text>
  <text x="100" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${v.sub}">${v.label}</text>
</svg>
`;
}

/** Matches 058_card_rewards_system.sql seed — shop + achievement paths. */
const SEED_CARDS = [
  ["shop", "animals", "lion_gold", "אריה זהב", "gold"],
  ["shop", "animals", "tiger_fast", "נמר מהיר", "special"],
  ["shop", "animals", "panda_happy", "פנדה שמחה", "regular"],
  ["shop", "animals", "dog_loyal", "כלב נאמן", "regular"],
  ["shop", "animals", "bear_strong", "דוב חזק", "regular"],
  ["shop", "animals", "fox_clever", "שועל זריז", "special"],
  ["shop", "space", "space_cat", "חתול חלל", "special"],
  ["shop", "space", "star_rocket", "טיל כוכבים", "regular"],
  ["shop", "space", "green_star", "כוכב ירוק", "regular"],
  ["shop", "space", "space_pilot", "טייס חלל", "regular"],
  ["shop", "space", "cute_alien", "חייזר חמוד", "special"],
  ["shop", "space", "nebula_glow", "ערפילית זוהרת", "rare"],
  ["shop", "dinosaurs", "blue_dino", "דינוזאור כחול", "regular"],
  ["shop", "dinosaurs", "trex_mighty", "טי-רקס", "special"],
  ["shop", "dinosaurs", "ptero_fly", "פטרוזאור", "regular"],
  ["shop", "dinosaurs", "tri_guard", "טריצרטופס", "rare"],
  ["shop", "robots", "smart_robot", "רובוט חכם", "special"],
  ["shop", "robots", "silver_robot", "רובוט כסוף", "regular"],
  ["shop", "robots", "gold_robot", "רובוט זהב", "gold"],
  ["shop", "robots", "helper_bot", "עוזר רובוט", "regular"],
  ["shop", "heroes", "learning_hero", "גיבור למידה", "regular"],
  ["shop", "heroes", "class_star", "כוכב הכיתה", "special"],
  ["shop", "heroes", "number_hero", "גיבור המספרים", "regular"],
  ["shop", "heroes", "persistence_hero", "גיבור התמדה", "rare"],
  ["shop", "fantasy", "little_dragon", "דרקון קטן", "special"],
  ["shop", "fantasy", "magic_shield", "מגן הקסם", "regular"],
  ["shop", "fantasy", "green_spell", "קסם ירוק", "regular"],
  ["shop", "fantasy", "golden_knight", "אביר זהב", "gold"],
  ["shop", "nature", "wise_owl", "ינשוף חכם", "special"],
  ["shop", "nature", "wise_turtle", "צב חכם", "regular"],
  ["shop", "nature", "color_flower", "פרח צבעוני", "regular"],
  ["shop", "nature", "magic_forest", "יער קסום", "rare"],
  ["shop", "football", "gold_striker", "כדורגלן זהב", "gold"],
  ["shop", "football", "top_goalkeeper", "שוער מעולה", "special"],
  ["shop", "football", "goal_king", "מלך השערים", "regular"],
  ["shop", "football", "field_star", "כוכב המגרש", "regular"],
  ["achievements", "persistence", "streak_3", "מתמיד 3 ימים", "regular"],
  ["achievements", "persistence", "streak_7", "מתמיד 7 ימים", "regular"],
  ["achievements", "persistence", "streak_14", "מתמיד 14 יום", "special"],
  ["achievements", "general", "strong_start", "מתחיל חזק", "regular"],
  ["achievements", "general", "week_star", "כוכב השבוע", "special"],
  ["achievements", "general", "never_give_up", "לא מוותר", "rare"],
  ["achievements", "general", "mission_done", "משימה הושלמה", "regular"],
  ["achievements", "general", "question_master", "אלוף השאלות", "special"],
  ["achievements", "general", "power_week", "שבוע עוצמה", "rare"],
  ["achievements", "general", "parent_activity", "פעילות מהורה", "regular"],
  ["achievements", "math", "number_explorer", "חוקר המספרים", "regular"],
  ["achievements", "math", "math_star", "כוכב החשבון", "special"],
  ["achievements", "math", "multiplication_champ", "אלוף הכפל", "gold"],
  ["achievements", "hebrew", "young_reader", "קורא צעיר", "regular"],
  ["achievements", "hebrew", "winning_reader", "קורא מצטיין", "special"],
  ["achievements", "hebrew", "word_discoverer", "מגלה מילים", "special"],
  ["achievements", "english", "english_star", "כוכב אנגלית", "regular"],
  ["achievements", "english", "english_speaker", "דובר אנגלית", "special"],
  ["achievements", "science", "nature_explorer", "חוקר הטבע", "regular"],
  ["achievements", "science", "young_scientist", "מדען צעיר", "special"],
  ["achievements", "geometry", "geometry_ace", "אלוף הגיאומטריה", "regular"],
  ["achievements", "geometry", "shape_master", "גיאומטר מוכשר", "special"],
  ["achievements", "moledet", "homeland_explorer", "חוקר המולדת", "regular"],
  ["achievements", "moledet", "homeland_scholar", "ידע מולדת", "special"],
];

for (const v of Object.values(RARITY_STYLE)) {
  const dir = path.join(publicRoot, "placeholders", v.label === "רגיל" ? "regular" : v.label === "מיוחד" ? "special" : v.label === "נדיר" ? "rare" : "gold");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "default.svg"), cardSvg("קלף", v.label === "רגיל" ? "regular" : v.label === "מיוחד" ? "special" : v.label === "נדיר" ? "rare" : "gold"), "utf8");
}

for (const [kind, slug, key, nameHe, rarity] of SEED_CARDS) {
  const dir = path.join(publicRoot, kind, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${key}.svg`), cardSvg(nameHe, rarity), "utf8");
}

console.log(`Generated ${SEED_CARDS.length} card SVGs + rarity defaults.`);
