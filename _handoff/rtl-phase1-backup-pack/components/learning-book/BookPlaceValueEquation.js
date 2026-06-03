import { parsePlaceValueEquationLine } from "../../lib/learning-book/book-line-classifier";

const islandStyle = {
  direction: "ltr",
  unicodeBidi: "isolate",
};

export default function BookPlaceValueEquation({ text }) {
  const parsed = parsePlaceValueEquationLine(text);
  if (!parsed) return null;

  const { left, terms } = parsed;

  return (
    <p
      className="my-1 block w-full text-center text-base font-semibold tabular-nums sm:text-lg"
      dir="ltr"
      style={islandStyle}
      data-book-place-value-equation="true"
    >
      {left} = {terms.join(" + ")}
    </p>
  );
}
