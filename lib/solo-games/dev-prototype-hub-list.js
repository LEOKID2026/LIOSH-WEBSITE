/**
 * Dev-only hub list for solo game prototypes — not the production solo-game registry.
 */

/** Public games hub card — hidden; admin entry is via /admin nav only. */
export const SHOW_PUBLIC_PROTOTYPE_HUB_ENTRY = false;
export const SOLO_DEV_PROTOTYPE_LIST = [
  { id: "fruit-slice", titleHe: "חיתוך פירות", route: "/dev/fruit-slice-prototype", emoji: "🍎" },
  { id: "pipe-puzzle", titleHe: "צינורות מים", route: "/dev/pipe-puzzle-prototype", emoji: "🚰" },
  { id: "connect-colors", titleHe: "חיבור צבעים", route: "/dev/connect-colors-prototype", emoji: "🎨" },
  { id: "traffic-jam", titleHe: "פקק תנועה", route: "/dev/traffic-jam-prototype", emoji: "🚗" },
  { id: "tower-stack", titleHe: "מגדל קוביות", route: "/dev/tower-stack-prototype", emoji: "🧱" },
  { id: "marble-run", titleHe: "מסילת כדור", route: "/dev/marble-run-prototype", emoji: "⚪" },
  { id: "balance-scale", titleHe: "מאזניים", route: "/dev/balance-scale-prototype", emoji: "⚖️" },
  { id: "rhythm", titleHe: "משחק קצ\u05D1", route: "/dev/rhythm-prototype", emoji: "🎵" },
  { id: "tangram", titleHe: "טנגרם", route: "/dev/tangram-prototype", emoji: "🔺" },
  { id: "brick-breaker", titleHe: "שובר לבנים", route: "/dev/brick-breaker-prototype", emoji: "🧱" },
  { id: "smart-blocks", titleHe: "בלוקים חכמים - אבטיפוס", route: "/dev/smart-blocks-prototype", emoji: "🧩" },
];

export const SOLO_DEV_PROTOTYPES_HUB = {
  route: "/dev/solo-game-prototypes",
  titleHe: "אבטיפוסי משחקים",
  blurbHe: "בדיקת רעיונות למשחקי סולו חדשים",
  ctaHe: "כניסה לאבטיפוסים",
  emoji: "🧪",
};

export const SOLO_DEV_PROTOTYPES_PLAY_HUB = {
  route: "/dev/solo-game-prototypes/games",
  titleHe: "אבטיפוסי משחקי סולו",
  metaHe: "11 אבטיפוסים · משחקיות",
  blurbHe: "חיתוך פירות, צינורות, בלוקים ועוד - בדיקת תחושה ומשחקיות למשחקי סולו.",
  ctaHe: "כניסה לאבטיפוסי סולו",
  emoji: "🎮",
};

export const LEARNING_DEV_PROTOTYPES_HUB = {
  route: "/dev/learning-game-prototypes",
  titleHe: "אבטיפוסים לימודיים",
  metaHe: "8 אבטיפוסים · העשרה",
  blurbHe: "מכולת, מיחזור, חיות, מעבדה, מסע בישראל, מזג אוויר, חלל ועוד.",
  ctaHe: "כניסה לאבטיפוסים לימודיים",
  emoji: "📚",
};

export const STUDENT_WORLD_HOME_PROTOTYPE = {
  id: "student-world-home",
  route: "/student/world-home-prototype",
  titleHe: "עולם הילדים - אב טיפוס",
  metaHe: "מסך פתיחה · UI",
  blurbHe: "אב טיפוס למסך עולם הילדים - רקע עולם, שערים ו-dock. דורש התחברות תלמיד.",
  ctaHe: "פתח אב טיפוס",
  emoji: "🌍",
};

export const LEO_DOG_PROTOTYPE = {
  id: "leo-dog",
  route: "/dev/leo-dog-prototype",
  titleHe: "הכלב של ליאו",
  metaHe: "חיית מחמד · אבטיפוס",
  blurbHe: "טפלו בליאו, שחקו איתו, ליטוף ומקלחת - חוויה חיובית בסגנון Talking Tom קל.",
  ctaHe: "פתח אבטיפוס",
  emoji: "🐕",
};
