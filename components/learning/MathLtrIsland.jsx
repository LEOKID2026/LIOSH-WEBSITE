import { learningMathIsolateStyle } from "../../utils/learning-mixed-hebrew-math-render";

const mathLtrIslandStyle = Object.freeze({
  ...learningMathIsolateStyle,
  textAlign: "center",
});

/**
 * LTR math island for expressions inside RTL Hebrew UI (e.g. times table modal).
 */
export default function MathLtrIsland({ children, className = "", style = {} }) {
  return (
    <span
      dir="ltr"
      data-math-ltr-island="true"
      className={className}
      style={{ ...mathLtrIslandStyle, ...style }}
    >
      {children}
    </span>
  );
}
