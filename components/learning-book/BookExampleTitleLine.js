import { parseExampleTitleLine } from "../../lib/learning-book/book-line-classifier";

const mathIslandStyle = {
  direction: "ltr",
  unicodeBidi: "isolate",
  display: "inline-block",
  verticalAlign: "baseline",
};

export default function BookExampleTitleLine({ text }) {
  const parsed = parseExampleTitleLine(text);
  if (!parsed) return null;

  const { mathPart, hebrewPart, trailingColon, separator = " - " } = parsed;

  return (
    <p
      className="text-right text-base font-bold leading-relaxed text-[color:var(--book-text)] sm:text-lg"
      dir="rtl"
      data-book-example-title="true"
    >
      <bdi dir="ltr" style={mathIslandStyle} className="tabular-nums">
        {mathPart}
      </bdi>
      <span>{separator}</span>
      <span>{hebrewPart}</span>
      {trailingColon ? <span>:</span> : null}
    </p>
  );
}
