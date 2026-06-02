import { GEOMETRY_G1_BOOK_META, isValidGeometryG1PageId } from "./geometry-g1-registry";
import { GEOMETRY_G2_BOOK_META, isValidGeometryG2PageId } from "./geometry-g2-registry";
import { GEOMETRY_G3_BOOK_META, isValidGeometryG3PageId } from "./geometry-g3-registry";
import { GEOMETRY_G4_BOOK_META, isValidGeometryG4PageId } from "./geometry-g4-registry";
import { GEOMETRY_G5_BOOK_META, isValidGeometryG5PageId } from "./geometry-g5-registry";
import { GEOMETRY_G6_BOOK_META, isValidGeometryG6PageId } from "./geometry-g6-registry";

/** @type {Record<string, { meta: typeof GEOMETRY_G1_BOOK_META, isValid: (id: string) => boolean, topicToPage: Record<string, string> }>} */
const GRADE_BOOK = {
  g1: {
    meta: GEOMETRY_G1_BOOK_META,
    isValid: isValidGeometryG1PageId,
    topicToPage: {
      shapes_basic: "shapes_basic_square",
      transformations: "transformations",
    },
  },
  g2: {
    meta: GEOMETRY_G2_BOOK_META,
    isValid: isValidGeometryG2PageId,
    topicToPage: {
      shapes_basic: "square_area",
      area: "square_area",
      solids: "solids",
      transformations: "transformations",
    },
  },
  g3: {
    meta: GEOMETRY_G3_BOOK_META,
    isValid: isValidGeometryG3PageId,
    topicToPage: {
      shapes_basic: "triangles",
      triangles: "triangles",
      quadrilaterals: "quadrilaterals",
      parallel_perpendicular: "parallel_perpendicular",
      area: "square_area",
      perimeter: "square_perimeter",
      angles: "triangle_angles",
      rotation: "rotation",
      solids: "solids",
    },
  },
  g4: {
    meta: GEOMETRY_G4_BOOK_META,
    isValid: isValidGeometryG4PageId,
    topicToPage: {
      shapes_basic: "shapes_basic_properties_square",
      angles: "shapes_basic_properties_angles",
      parallel_perpendicular: "parallel_perpendicular",
      triangles: "triangle_angles",
      quadrilaterals: "quadrilaterals",
      diagonal: "diagonal_square",
      symmetry: "symmetry",
      area: "square_area",
      perimeter: "square_perimeter",
      volume: "rectangular_prism_volume",
    },
  },
  g5: {
    meta: GEOMETRY_G5_BOOK_META,
    isValid: isValidGeometryG5PageId,
    topicToPage: {
      angles: "triangle_angles",
      parallel_perpendicular: "parallel_perpendicular",
      quadrilaterals: "quadrilaterals",
      diagonal: "diagonal_square",
      heights: "heights_triangle",
      tiling: "tiling",
      area: "square_area",
      perimeter: "square_perimeter",
      volume: "rectangular_prism_volume",
      solids: "solids",
    },
  },
  g6: {
    meta: GEOMETRY_G6_BOOK_META,
    isValid: isValidGeometryG6PageId,
    topicToPage: {
      perimeter: "square_perimeter",
      area: "square_area",
      angles: "triangle_angles",
      circles: "circle_perimeter",
      pythagoras: "pythagoras_hyp",
      solids: "solids",
      volume: "rectangular_prism_volume",
    },
  },
};

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function resolveGeometryBookPageId({ grade, topic, kind }) {
  const gradeKey = String(grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;

  const kindKey = String(kind || "")
    .trim()
    .replace(/^story_/, "");
  if (kindKey && cfg.isValid(kindKey)) {
    return kindKey;
  }

  const topicKey = String(topic || "").trim();
  if (!topicKey || topicKey === "mixed") return null;

  const fromTopic = cfg.topicToPage[topicKey];
  if (fromTopic && cfg.isValid(fromTopic)) {
    return fromTopic;
  }

  return null;
}

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function getGeometryBookHref(ctx) {
  const pageId = resolveGeometryBookPageId(ctx);
  if (!pageId) return null;
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;
  return `${cfg.meta.routeBase}/${pageId}`;
}
