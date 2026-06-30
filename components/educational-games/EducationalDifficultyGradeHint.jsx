import { EDUCATIONAL_DIFFICULTY_GRADE_HINT } from "../../lib/educational-games/educational-game-registry.js";

/** @param {{ className?: string, style?: import('react').CSSProperties }} props */
export default function EducationalDifficultyGradeHint({ className = "", style }) {
  return (
    <p className={className || "text-[0.72rem] font-normal opacity-70"} style={style}>
      {EDUCATIONAL_DIFFICULTY_GRADE_HINT}
    </p>
  );
}
