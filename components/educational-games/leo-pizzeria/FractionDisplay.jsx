import styles from "./FractionDisplay.module.css";
import { COMPARE_LABEL_HE, fractionAriaLabel } from "./fraction-display-he.js";

export { COMPARE_LABEL_HE, fractionAriaLabel };

/**
 * @param {{ numerator: number, denominator: number, size?: 'sm'|'md'|'lg', className?: string }} props
 */
export default function FractionDisplay({ numerator, denominator, size = "md", className = "" }) {
  const n = Math.max(0, Math.floor(Number(numerator) || 0));
  const d = Math.max(1, Math.floor(Number(denominator) || 1));
  const aria = fractionAriaLabel(n, d);

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
