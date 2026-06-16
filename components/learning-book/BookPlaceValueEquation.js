import { parseCanonicalPlaceValueEquation } from "../../lib/learning-book/place-value-equation-order";

const islandStyle = {
  direction: "ltr",
  unicodeBidi: "isolate",
};

export default function BookPlaceValueEquation({ text }) {
  const parsed = parseCanonicalPlaceValueEquation(text);
  if (!parsed) return null;

  const { terms, total } = parsed;

  return (
    <p
      className="my-1 block w-full text-center text-base font-semibold tabular-nums sm:text-lg"
      dir="ltr"
      style={islandStyle}
      data-book-place-value-equation="true"
    >
      {terms.join(" + ")} = {total}
    </p>
  );
}
