import MixedHebrewMathText from "./MixedHebrewMathText";
import { useBookGradeTheme } from "./BookGradeThemeContext";

function TableCell({ value }) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const isNumeric = /^[\d\s.,+\-−×÷<>=%]+$/.test(trimmed);
  return (
    <td
      className={`border border-white/15 px-2 py-1.5 text-center sm:px-3 sm:py-2 ${
        isNumeric ? "tabular-nums" : ""
      }`}
      dir={isNumeric ? "ltr" : "rtl"}
    >
      <MixedHebrewMathText text={trimmed} />
    </td>
  );
}

/**
 * Responsive RTL pipe table for place-value / comparison grids in learning books.
 */
export default function BookPipeTable({ headers = [], rows = [] }) {
  const { classes: theme } = useBookGradeTheme();
  if (!headers.length && !rows.length) return null;

  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);

  return (
    <div
      className="book-pipe-table my-4 w-full overflow-x-auto rounded-lg border border-white/10"
      dir="rtl"
    >
      <table className="w-full min-w-[260px] border-collapse text-sm sm:text-base">
        {headers.length > 0 ? (
          <thead>
            <tr className={`${theme.inlineCodeBg} text-white/90`}>
              {Array.from({ length: colCount }, (_, i) => (
                <th
                  key={i}
                  className="border border-white/15 px-2 py-1.5 font-bold sm:px-3 sm:py-2"
                  dir="rtl"
                >
                  {headers[i] ? (
                    <MixedHebrewMathText text={headers[i]} />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="even:bg-white/[0.03]">
              {Array.from({ length: colCount }, (_, ci) => (
                <TableCell key={ci} value={row[ci] ?? ""} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
