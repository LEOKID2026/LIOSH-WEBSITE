/**
 * Maps raw inventory topic/subtopic strings to stable audit keys (English internal).
 * Preserves raw strings; Hebrew labels are conservative metadata for reports only.
 */

/** @typedef {'high' | 'medium' | 'low'} NormConfidence */

/**
 * @typedef {Object} NormalizedTopic
 * @property {string} rawTopic
 * @property {string} rawSubtopic
 * @property {string} normalizedTopicKey
 * @property {string} normalizedTopicLabelHe
 * @property {NormConfidence} normalizationConfidence
 * @property {string} normalizationNotes
 * @property {string[]} [compositeSegments]
 */

function slug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u0590-\u05FF.+|-]/g, "");
}

/**
 * @param {object} input
 * @param {string} input.subject
 * @param {string} [input.topic]
 * @param {string} [input.subtopic]
 * @returns {NormalizedTopic}
 */
export function normalizeInventoryTopic(input) {
  const subject = String(input.subject || "").trim();
  const rawTopic = String(input.topic ?? "").trim();
  const rawSubtopic = String(input.subtopic ?? "").trim();

  switch (subject) {
    case "math":
      return normalizeMath(rawTopic, rawSubtopic);
    case "geometry":
      return normalizeGeometry(rawTopic, rawSubtopic);
    case "hebrew":
      return normalizeHebrew(rawTopic, rawSubtopic);
    case "english":
      return normalizeEnglish(rawTopic, rawSubtopic);
    case "science":
      return normalizeScience(rawTopic, rawSubtopic);
    case "moledet-geography":
      return normalizeGeography(rawTopic, rawSubtopic);
    case "geography":
      return normalizeGeography(rawTopic, rawSubtopic);
    default:
      return {
        rawTopic,
        rawSubtopic,
        normalizedTopicKey: `unknown.${slug(subject)}.${slug(rawTopic)}`,
        normalizedTopicLabelHe: "נושא לא מסווג",
        normalizationConfidence: "low",
        normalizationNotes: "Unknown subject for normalization.",
      };
  }
}

/** @returns {NormalizedTopic} */
function normalizeMath(rawTopic, rawSubtopic) {
  const op = slug(rawTopic || rawSubtopic);
  const sub = slug(rawSubtopic);

  const strandMap = {
    number_sense: {
      key: "math.number_sense",
      he: "תפיסה מספרית / חישוב מנטלי",
    },
    compare: {
      key: "math.number_sense",
      he: "תפיסה מספרית / השוואה",
    },
    addition: {
      key: "math.addition_subtraction",
      he: "חיבור וחיסור",
    },
    subtraction: {
      key: "math.addition_subtraction",
      he: "חיבור וחיסור",
    },
    multiplication: {
      key: "math.multiplication_division",
      he: "כפל וחילוק",
    },
    division: {
      key: "math.multiplication_division",
      he: "כפל וחילוק",
    },
    division_with_remainder: {
      key: "math.multiplication_division",
      he: "כפל וחילוק (כולל חילוק עם שארית)",
    },
    fractions: { key: "math.fractions", he: "שברים" },
    decimals: { key: "math.decimals", he: "עשרוניים" },
    percentages: { key: "math.percentages", he: "אחוזים" },
    word_problems: { key: "math.word_problems", he: "שאלות מילוליות" },
    sequences: { key: "math.patterns_sequences", he: "סדרות ודפוסים" },
    divisibility: { key: "math.divisibility_factors", he: "התחלקות וגורמים" },
    prime_composite: { key: "math.divisibility_factors", he: "ראשוניים ופריקים" },
    factors_multiples: { key: "math.divisibility_factors", he: "כפולות וגורמים" },
    powers: { key: "math.powers_and_scaling", he: "חזקות וקנה מידה" },
    ratio: { key: "math.ratio_and_scale", he: "יחס וקנה מידה" },
    scale: { key: "math.ratio_and_scale", he: "יחס וקנה מידה" },
    estimation: { key: "math.estimation_rounding", he: "אומדן ועיגול" },
    rounding: { key: "math.estimation_rounding", he: "אומדן ועיגול" },
    equations: { key: "math.equations_and_expressions", he: "משוואות וביטויים" },
    order_of_operations: {
      key: "math.equations_and_expressions",
      he: "סדר פעולות וביטויים",
    },
    zero_one_properties: {
      key: "math.number_sense",
      he: "תכונות המספרים 0 ו-1",
    },
    mixed: { key: "math.mixed_operations", he: "תרגילים מעורבים" },
    geometry_basic: {
      key: "math.geometry_context",
      he: "קשרים גיאומטריים בהקשר חישובי (לא גאומטריה נפרדת)",
    },
    data: { key: "math.data_and_charts", he: "נתונים ותרשימים" },
  };

  const primary = op || sub;
  const hit = strandMap[primary];
  if (hit) {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: hit.key,
      normalizedTopicLabelHe: hit.he,
      normalizationConfidence: "high",
      normalizationNotes: "Mapped from math generator operation / topic key.",
    };
  }

  return {
    rawTopic,
    rawSubtopic,
    normalizedTopicKey: `math.unmapped.${primary || "empty"}`,
    normalizedTopicLabelHe: "מתמטיקה - נושא לא ממופה באודיט",
    normalizationConfidence: "low",
    normalizationNotes:
      "Operation/topic not in strand table - expand curriculum-topic-normalizer.js.",
  };
}

/** @returns {NormalizedTopic} */
function normalizeGeometry(rawTopic, rawSubtopic) {
  const segments = String(rawTopic || "")
    .split("|")
    .map((x) => slug(x))
    .filter(Boolean);
  const kind = slug(rawSubtopic);

  const geomMap = {
    shapes_basic: {
      key: "geometry.shape_recognition_plane_figures",
      he: "הכרת צורות ומצולעים",
    },
    quadrilaterals: {
      key: "geometry.polygons_quadrilaterals",
      he: "מרובעים ומצולעים",
    },
    triangles: { key: "geometry.triangles", he: "משולשים" },
    area: { key: "geometry.area", he: "שטח" },
    perimeter: { key: "geometry.perimeter", he: "היקף" },
    volume: { key: "geometry.volume", he: "נפח" },
    solids: { key: "geometry.solids_3d", he: "גופים תלת מימדיים" },
    angles: { key: "geometry.angles", he: "זוויות" },
    parallel_perpendicular: {
      key: "geometry.parallel_perpendicular_spatial",
      he: "מקבילים, מאונכים ומיקום במרחב",
    },
    transformations: {
      key: "geometry.transformations_symmetry",
      he: "טרנספורמציות וסימטריה",
    },
    rotation: {
      key: "geometry.transformations_symmetry",
      he: "סיבוב והזזה במישור",
    },
    symmetry: { key: "geometry.transformations_symmetry", he: "סימטריה" },
    tiling: { key: "geometry.tiling_covering", he: "ריצוף וכיסוי" },
    diagonal: { key: "geometry.diagonals_properties", he: "אלכסונים ותכונות צורה" },
    heights: { key: "geometry.heights_area_links", he: "גבהים וקשר לשטח" },
    circles: { key: "geometry.circle_basic", he: "מעגל ועיגול" },
    pythagoras: { key: "geometry.pythagoras_right_triangles", he: "משפט פיתגורס" },
    mixed: { key: "geometry.mixed_review", he: "ערבוב נושאי גאומטריה" },
  };

  const primarySeg = segments[0] || kind;
  const hit = geomMap[primarySeg] || geomMap[kind];
  if (hit) {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: hit.key,
      normalizedTopicLabelHe: hit.he,
      normalizationConfidence: segments.length > 1 ? "medium" : "high",
      normalizationNotes:
        segments.length > 1
          ? "Composite topic string split; primary segment drove mapping."
          : "Mapped from geometry topic / generator kind.",
      compositeSegments: segments.length ? segments : undefined,
    };
  }

  return {
    rawTopic,
    rawSubtopic,
    normalizedTopicKey: `geometry.unmapped.${primarySeg || kind || "empty"}`,
    normalizedTopicLabelHe: "גאומטריה - נושא לא ממופה באודיט",
    normalizationConfidence: "low",
    normalizationNotes: "Expand geometry strand map for this topic/kind.",
    compositeSegments: segments.length ? segments : undefined,
  };
}

/** @returns {NormalizedTopic} */
function normalizeHebrew(rawTopic, rawSubtopic) {
  const t = slug(rawTopic);
  const st = slug(rawSubtopic);

  const skillMap = {
    reading: {
      key: "hebrew.decoding_reading_fluency",
      he: "קריאה והתפתחות קריאה",
    },
    comprehension: {
      key: "hebrew.reading_comprehension",
      he: "הבנת הנקרא",
    },
    writing: { key: "hebrew.writing", he: "כתיבה" },
    grammar: {
      key: "hebrew.grammar_language_knowledge",
      he: "דקדוק וידיעת השפה",
    },
    vocabulary: { key: "hebrew.vocabulary", he: "אוצר מילים" },
    speaking: { key: "hebrew.oral_expression", he: "דיבור והצגה בעל פה" },
  };

  const refineReading = () => {
    const u = `${rawSubtopic}`.toLowerCase();
    if (
      u.includes("locat") ||
      u.includes("מידע") ||
      u.includes("scan") ||
      u.includes("find")
    )
      return {
        key: "hebrew.locating_information",
        he: "איתור מידע בטקסט",
      };
    if (u.includes("infer") || u.includes("היקש") || u.includes("מסקנה"))
      return { key: "hebrew.inference", he: "היקש והסקת מסקנות" };
    if (u.includes("sequence") || u.includes("order") || u.includes("סדר"))
      return { key: "hebrew.sequence_order", he: "סדר ורצף" };
    if (u.includes("main") || u.includes("מרכזי"))
      return { key: "hebrew.main_idea", he: "רעיון מרכזי" };
    if (u.includes("connector") || u.includes("קישור"))
      return { key: "hebrew.connectors_cohesion", he: "מילות קישור ולכידות" };
    return null;
  };

  if (t === "comprehension" && st) {
    const r = refineReading();
    if (r) {
      return {
        rawTopic,
        rawSubtopic,
        normalizedTopicKey: r.key,
        normalizedTopicLabelHe: r.he,
        normalizationConfidence: "medium",
        normalizationNotes:
          "Heuristic refinement from subtopic slug - verify against Hebrew bank metadata.",
      };
    }
  }

  const hit = skillMap[t];
  if (hit) {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: hit.key,
      normalizedTopicLabelHe: hit.he,
      normalizationConfidence: st ? "medium" : "high",
      normalizationNotes: st
        ? "Primary Hebrew skill from topic; subtopic present - review for finer skill tagging."
        : "Mapped from Hebrew TOPICS key.",
    };
  }

  return {
    rawTopic,
    rawSubtopic,
    normalizedTopicKey: `hebrew.unmapped.${t || "empty"}`,
    normalizedTopicLabelHe: "עברית - מיומנות לא ממופה",
    normalizationConfidence: "low",
    normalizationNotes: "Unknown Hebrew topic bucket.",
  };
}

/** @returns {NormalizedTopic} */
function normalizeEnglish(rawTopic, rawSubtopic) {
  let cat = slug(rawTopic);
  const pool = slug(rawSubtopic);
  if (cat === "sentences") cat = "sentence";

  if (cat === "vocabulary") {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: `english.vocabulary_translation.${pool || "general"}`,
      normalizedTopicLabelHe: "אוצר מילים ומילולי",
      normalizationConfidence: pool ? "high" : "medium",
      normalizationNotes: "Vocabulary games map to lexis / translation strand.",
    };
  }
  if (cat === "writing") {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: `english.sentence_writing_patterns.${pool || "writing"}`,
      normalizedTopicLabelHe: "כתיבה ודפוסי משפט",
      normalizationConfidence: "medium",
      normalizationNotes: "Writing / typing modes align with sentence-writing strand.",
    };
  }
  if (cat === "mixed") {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: "english.mixed_practice",
      normalizedTopicLabelHe: "אנגלית - ערבוב נושאים",
      normalizationConfidence: "medium",
      normalizationNotes: "Mixed practice - audit often skips or treats as composite.",
    };
  }

  if (cat === "grammar") {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: `english.grammar.${pool || "general"}`,
      normalizedTopicLabelHe: "דקדוק אנגלית (מסלול בריכה)",
      normalizationConfidence: pool ? "high" : "medium",
      normalizationNotes:
        "Grammar pools vary by grade gate in product - audit uses pool key as subtype.",
    };
  }
  if (cat === "translation") {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: `english.vocabulary_translation.${pool || "general"}`,
      normalizedTopicLabelHe: "אוצר מילים ותרגום (מילולי)",
      normalizationConfidence: pool ? "high" : "medium",
      normalizationNotes: "Translation pools emphasize vocabulary / phrases.",
    };
  }
  if (cat === "sentence") {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: `english.sentence_writing_patterns.${pool || "general"}`,
      normalizedTopicLabelHe: "משפטים, ניסוח והרחבה",
      normalizationConfidence: pool ? "medium" : "medium",
      normalizationNotes:
        "Sentence pools touch writing-like patterns - not full composition curriculum.",
    };
  }

  return {
    rawTopic,
    rawSubtopic,
    normalizedTopicKey: `english.unmapped.${cat || "empty"}`,
    normalizedTopicLabelHe: "אנגלית - קטגוריה לא ממופה",
    normalizationConfidence: "low",
    normalizationNotes: "Expected grammar | translation | sentence.",
  };
}

/** @returns {NormalizedTopic} */
function normalizeScience(rawTopic, rawSubtopic) {
  const t = slug(rawTopic);
  const domainMap = {
    body: { key: "science.life_science_body", he: "מדעי החיים - גוף האדם" },
    animals: { key: "science.life_science_animals", he: "מדעי החיים - בעלי חיים" },
    plants: { key: "science.life_science_plants", he: "מדעי החיים - צמחים" },
    ecosystems: {
      key: "science.life_science_ecosystems",
      he: "מערכות אקולוגיות",
    },
    matter: { key: "science.materials_matter", he: "חומרים וחומר" },
    materials: { key: "science.materials_matter", he: "חומרים ותכונות" },
    energy: { key: "science.energy", he: "אנרגיה" },
    earth_space: {
      key: "science.earth_space_environment",
      he: "כדור הארץ והחלל",
    },
    environment: {
      key: "science.earth_space_environment",
      he: "סביבה וכדור הארץ",
    },
    experiments: {
      key: "science.scientific_inquiry",
      he: "חקירה מדעית וניסויים",
    },
    technology: {
      key: "science.technology_applications",
      he: "טכנולוגיה ויישומים",
    },
  };

  const hit = domainMap[t];
  if (hit) {
    return {
      rawTopic,
      rawSubtopic,
      normalizedTopicKey: hit.key,
      normalizedTopicLabelHe: hit.he,
      normalizationConfidence: "high",
      normalizationNotes: "Mapped from science bank topic field.",
    };
  }

  return {
    rawTopic,
    rawSubtopic,
    normalizedTopicKey: `science.unmapped.${t || "empty"}`,
    normalizedTopicLabelHe: "מדעים - תחום לא ממופה",
    normalizationConfidence: "low",
    normalizationNotes: "Extend science domain map.",
  };
}

/** @returns {NormalizedTopic} */
function normalizeGeography(rawTopic, rawSubtopic) {
  const t = slug(rawTopic);
  return {
    rawTopic,
    rawSubtopic,
    normalizedTopicKey: `moledet.bank.${t || "general"}`,
    normalizedTopicLabelHe: "מולדת / גיאוגרפיה - נושא מהבנק הסטטי",
    normalizationConfidence: "medium",
    normalizationNotes:
      "Curriculum placement for Moledet/geography requires dedicated pedagogy review; kept advisory only.",
  };
}
