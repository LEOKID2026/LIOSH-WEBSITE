import styles from "./FractionDisplay.module.css";

const HE_NUM = ["אפס", "אחד", "שניים", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה", "שמונה", "תשעה", "עשרה", "אחד־עשר", "שניים־עשר"];
const HE_DEN = {
  1: "שלמים",
  2: "חצאים",
  3: "שלישים",
  4: "רבעים",
  5: "חמישיות",
  6: "שישיות",
  8: "שמיניות",
  10: "עשיריות",
  12: "שניים־עשרים",
};

/**
 * @param {{ numerator: number, denominator: number, size?: 'sm'|'md'|'lg', className?: string }} props
 */
export default function FractionDisplay({ numerator, denominator, size = "md", className = "" }) {
  const n = Math.max(0, Math.floor(Number(numerator) || 0));
  const d = Math.max(1, Math.floor(Number(denominator) || 1));
  const nWord = HE_NUM[n] || String(n);
  const dWord = HE_DEN[d] || `${d}`;
  const aria = n === 0 ? "אפס" : n === d ? "שלם אחד" : `${nWord} ${dWord}`;

  return (
    <span
      className={`${styles.fraction} ${styles[size] || styles.md} ${className}`}
      dir="ltr"
      role="img"
      aria-label={aria}
    >
      <span className={styles.numerator}>{n}</span>
      <span className={styles.bar} aria-hidden="true" />
      <span className={styles.denominator}>{d}</span>
    </span>
  );
}

/** Hebrew labels for compare relations — never show enum strings. */
export const COMPARE_LABEL_HE = Object.freeze({
  greater: "הראשון גדול יותר",
  less: "הראשון קטן יותר",
  equal: "שווים",
});
