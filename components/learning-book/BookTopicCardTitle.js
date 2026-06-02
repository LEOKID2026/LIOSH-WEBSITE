import MixedHebrewMathText from "./MixedHebrewMathText";
import { stripStrayMarkdown } from "../../lib/learning-book/parse-inline-markdown";

function titleNeedsMathRenderer(text) {
  const cleaned = stripStrayMarkdown(String(text || "")).trim();
  return /\d/.test(cleaned) && /[+−\-=×÷]/.test(cleaned);
}

/**
 * Topic prev/next card titles — plain Hebrew preserves word spaces; math titles stay isolated.
 */
export default function BookTopicCardTitle({ text }) {
  const cleaned = stripStrayMarkdown(String(text || "")).trim();
  if (!cleaned) return null;

  const wrapClass =
    "block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-snug";

  if (titleNeedsMathRenderer(cleaned)) {
    return (
      <span className={wrapClass} dir="rtl">
        <MixedHebrewMathText text={cleaned} />
      </span>
    );
  }

  return (
    <span className={wrapClass} dir="rtl" lang="he">
      {cleaned}
    </span>
  );
}
