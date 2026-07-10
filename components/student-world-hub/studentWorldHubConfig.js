/** @typedef {"link" | "panel" | "avatar" | "more"} StudentWorldDockKind */

/**
 * @typedef {object} StudentWorldGate
 * @property {string} id
 * @property {string} labelHe
 * @property {string} emoji
 * @property {string} href
 * @property {string} bgClass
 */

/** @type {StudentWorldGate[]} */
export const STUDENT_WORLD_GATES = [
  {
    id: "learning",
    labelHe: "משחקי האתגר",
    emoji: "📚",
    href: "/student/learning",
    bgClass: "from-emerald-500 to-emerald-600 border-emerald-300",
  },
  {
    id: "games",
    labelHe: "משחקים",
    emoji: "🎮",
    href: "/student/games",
    bgClass: "from-violet-500 to-purple-600 border-violet-300",
  },
  {
    id: "club",
    labelHe: "מועדון אונליין",
    emoji: "🌐",
    href: "/student/arcade",
    bgClass: "from-sky-500 to-blue-600 border-sky-300",
  },
];

/**
 * @typedef {object} StudentWorldDockItem
 * @property {string} id
 * @property {string} labelHe
 * @property {string} emoji
 * @property {StudentWorldDockKind} kind
 * @property {string} [href]
 * @property {string} [panelId]
 */

/** @type {StudentWorldDockItem[]} */
export const STUDENT_WORLD_DOCK_PRIMARY = [
  { id: "collection", labelHe: "אוסף", emoji: "🃏", kind: "link", href: "/student/cards" },
  { id: "friends", labelHe: "חברים", emoji: "👫", kind: "link", href: "/student/arcade" },
  { id: "profile", labelHe: "פרופיל", emoji: "😊", kind: "avatar" },
  { id: "missions", labelHe: "משימות", emoji: "✅", kind: "panel", panelId: "missions" },
];

/** Panels reachable from "more" menu — same modals as before. */
export const STUDENT_WORLD_MORE_PANELS = [
  { id: "stats", panelId: "stats", labelHe: "הנתונים שלי", emoji: "📊" },
  { id: "progress", panelId: "progress", labelHe: "ההתקדמות שלי", emoji: "📈" },
  { id: "classroom", panelId: "classroom", labelHe: "פעילויות", emoji: "📋" },
  { id: "worksheets", panelId: "worksheets", labelHe: "דפי עבודה", emoji: "📄" },
  { id: "subjects", panelId: "subjects", labelHe: "נושאים", emoji: "📚" },
  { id: "badges", panelId: "badges", labelHe: "תגים", emoji: "🏅" },
  { id: "recommendations", panelId: "recommendations", labelHe: "המלצות", emoji: "💡" },
];

/** @param {string} panelId @param {Set<string>} guestLockedPanelSet */
export function isWorldHubPanelLocked(panelId, guestLockedPanelSet) {
  if (!panelId) return false;
  return guestLockedPanelSet?.has(panelId) ?? false;
}
