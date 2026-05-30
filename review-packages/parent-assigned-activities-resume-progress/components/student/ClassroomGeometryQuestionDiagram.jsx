import { useMemo } from "react";
import GeometryExplanationDiagram from "../learning/geometry/GeometryExplanationDiagram";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec";

/**
 * Neutral diagram for classroom activity question display (not post-submit explanation).
 * @param {{ subject?: string, topic?: string, shape?: string, params?: Record<string, unknown>, embedded?: boolean }} question
 */
export default function ClassroomGeometryQuestionDiagram({ question, embedded = false }) {
  const diagramQuestion = useMemo(() => {
    if (!question || question.subject !== "geometry") return null;
    const params =
      question.params && typeof question.params === "object" ? question.params : {};
    const shape = question.shape || params.shape;
    const topic = question.topic;
    if (!topic || !params?.kind) return null;
    return { topic, shape, params };
  }, [question]);

  const spec = useMemo(
    () =>
      diagramQuestion
        ? getGeometryDiagramSpec(diagramQuestion, { hideUnknownValues: true })
        : null,
    [diagramQuestion]
  );

  if (!spec?.kind) return null;

  return (
    <div
      className={embedded ? "w-full shrink-0 overflow-visible" : "mb-2 shrink-0"}
      data-testid="classroom-geometry-diagram"
    >
      <GeometryExplanationDiagram
        spec={spec}
        emphasis="neutral"
        question={diagramQuestion}
        compact={!embedded}
        embedded={embedded}
      />
    </div>
  );
}
