/**
 * LTR-isolated math expression for RTL worksheet pages.
 */

/**
 * @param {{
 *   children: import("react").ReactNode,
 *   block?: boolean,
 *   className?: string,
 * }} props
 */
export default function WorksheetMathLtr({ children, block = false, className = "" }) {
  const Tag = block ? "div" : "span";
  return (
    <Tag dir="ltr" className={`worksheet-math-ltr${block ? " worksheet-math-ltr-block" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}
