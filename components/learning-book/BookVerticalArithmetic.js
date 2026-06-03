import {
  isVerticalArithmeticBlock,
  verticalArithmeticDisplayLines,
} from "../../lib/learning-book/vertical-arithmetic-parse";

const islandStyle = {
  direction: "ltr",
  unicodeBidi: "isolate",
};

export default function BookVerticalArithmetic({ content }) {
  if (!isVerticalArithmeticBlock(content)) return null;

  const lines = verticalArithmeticDisplayLines(content);

  return (
    <pre
      className="mx-auto w-fit max-w-full py-1 text-center font-mono text-base leading-relaxed tabular-nums whitespace-pre sm:text-lg"
      dir="ltr"
      style={islandStyle}
      data-book-vertical-arithmetic="true"
    >
      {lines.join("\n")}
    </pre>
  );
}
