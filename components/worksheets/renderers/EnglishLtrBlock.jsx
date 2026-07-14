/**
 * LTR block for English text inside RTL worksheet.
 */

/**
 * @param {{ children: import("react").ReactNode, className?: string }} props
 */
export function EnglishLtrBlock({ children, className = "" }) {
  return (
    <span className={`english-ltr ${className}`.trim()} dir="ltr">
      {children}
    </span>
  );
}
