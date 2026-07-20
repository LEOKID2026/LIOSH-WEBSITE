/**
 * QA gate checklist (25 manual images) — run before release.
 * Categories: 5 portraits, 5 pets, 5 toys, 5 busy bg, 5 dark/weak.
 * Pass criteria: no black edge-map, no crash, crop/preset/manual available.
 */
export const QA_GATE_CATEGORIES = [
  { id: "portraits", count: 5, labelHe: "פורטרטים" },
  { id: "pets", count: 5, labelHe: "חיות מחמד" },
  { id: "toys", count: 5, labelHe: "צעצועים/מוצרים" },
  { id: "busy-bg", count: 5, labelHe: "רקע עמוס" },
  { id: "dark-weak", count: 5, labelHe: "כהות/חלשות" },
];

console.log(
  JSON.stringify(
    {
      ok: true,
      totalImages: QA_GATE_CATEGORIES.reduce((s, c) => s + c.count, 0),
      categories: QA_GATE_CATEGORIES,
      note: "Manual browser QA — verify each category before public release",
    },
    null,
    2
  )
);
