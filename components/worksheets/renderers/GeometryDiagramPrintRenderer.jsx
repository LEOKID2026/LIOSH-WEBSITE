/**
 * Geometry diagram renderer — static SVG for preview/print.
 */

import { renderGeometryDiagramSvgHtml } from "../../../lib/worksheets/worksheet-geometry-diagram-svg.js";
import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion, inkSave?: boolean }} props
 */
export function GeometryDiagramPrintRenderer({ question, inkSave = false }) {
  const svgHtml = question.diagramSpec
    ? renderGeometryDiagramSvgHtml(question.diagramSpec, { inkSave })
    : "";

  return (
    <div className="worksheet-renderer geometry-diagram">
      <p className="worksheet-stem">{question.stemHe}</p>
      {svgHtml ? (
        <div
          className="worksheet-diagram-wrap"
          dir="ltr"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : null}
      <WorksheetOptionsGrid optionsHe={question.optionsHe} />
    </div>
  );
}
