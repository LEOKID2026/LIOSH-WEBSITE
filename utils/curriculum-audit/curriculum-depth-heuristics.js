/**
 * Advisory depth / sequencing heuristics for curriculum audit (Phase 3).
 * Flags do not modify banks or UI — only enrich audit reports.
 */

/**
 * @typedef {Object} DepthAnalysis
 * @property {string[]} depthFlags
 * @property {boolean} suggestTooAdvanced
 * @property {boolean} suggestNeedsHumanReview
 * @property {string[]} notes
 */

const FLAG = {
  ENGLISH_GRAMMAR_EARLY: "english_grammar_early_grade",
  ENGLISH_SENTENCE_EARLY: "english_sentence_writing_early_grade",
  ENGLISH_RC_EARLY: "english_reading_comprehension_early_grade",
  GEOMETRY_VOLUME_EARLY: "geometry_volume_early",
  GEOMETRY_DIAGONALS_EARLY: "geometry_diagonals_early",
  GEOMETRY_AREA_BROAD: "geometry_area_too_broad",
  GEOMETRY_ADVANCED_ANGLES_EARLY: "geometry_advanced_angles_early_grade",
  MATH_FRACTIONS_DEPTH_UNCLEAR: "math_fractions_depth_unclear",
  MATH_PERCENTAGES_TOO_EARLY: "math_percentages_too_early_grade",
  HEBREW_LANGUAGE_COMPLEXITY_EARLY: "hebrew_language_complexity_early_grade",
  SCIENCE_GRADE_LOW_COVERAGE: "science_grade_low_coverage",
  HEBREW_UPPER_LOW_COVERAGE: "hebrew_upper_grade_low_coverage",
  WIDE_GRADE_SPAN: "wide_grade_span_requires_review",
  DUPLICATE_CROSS_GRADE: "duplicate_across_grades_requires_review",
  TOPIC_SHALLOW_CROSS_GRADE: "topic_shallow_cross_grade_spread",
  MOLEDET_VALUES_REPEATED: "moledet_values_homeland_repeated_across_grades",
};

/**
 * @param {object} rec inventory row
 * @param {object} norm from normalizeInventoryTopic
 * @param {object} ctx
 * @param {object} [ctx.coverageContext]
 * @param {Record<number, number>} [ctx.coverageContext.scienceByGrade]
 * @param {Record<number, number>} [ctx.coverageContext.hebrewByGrade]
 * @param {Record<string, Set<number>>} [ctx.coverageContext.normKeyGrades] subject|normKey -> Set of grades
 * @param {number} [ctx.duplicatePeerCount] rows sharing stem hash in subject
 */
export function analyzeCurriculumDepth(rec, norm, ctx = {}) {
  /** @type {string[]} */
  const depthFlags = [];
  const notes = [];
  let suggestTooAdvanced = false;
  let suggestNeedsHumanReview = false;

  const gmin = Number(rec.gradeMin);
  const gmax = Number(rec.gradeMax);
  const subject = rec.subject;
  const rawTopic = String(rec.topic || "").toLowerCase();
  const nk = String(norm?.normalizedTopicKey || "");
  const diff = String(rec.difficulty || "").toLowerCase();
  const preview = String(rec.textPreview || "");

  const span = Number.isFinite(gmax) && Number.isFinite(gmin) ? gmax - gmin : 0;
  if (span >= 2) {
    depthFlags.push(FLAG.WIDE_GRADE_SPAN);
    notes.push(`Grade span ${gmin}–${gmax} (advisory wide-band review).`);
  }

  const dupPeers = ctx.duplicatePeerCount ?? 0;
  if (dupPeers > 0) {
    depthFlags.push(FLAG.DUPLICATE_CROSS_GRADE);
    notes.push(`${dupPeers} inventory peer(s) share stem hash in same subject.`);
  }

  const nkGrades = ctx.normKeyGrades?.[`${subject}|${nk}`];
  if (nkGrades && nkGrades.size >= 4) {
    depthFlags.push(FLAG.TOPIC_SHALLOW_CROSS_GRADE);
    notes.push("Normalized topic appears across many grades - verify depth progression.");
  }

  if (subject === "english" && gmin <= 2) {
    if (rawTopic === "grammar" || nk.startsWith("english.grammar")) {
      depthFlags.push(FLAG.ENGLISH_GRAMMAR_EARLY);
      suggestNeedsHumanReview = true;
      notes.push("English grammar exposure in grades 1–2 - confirm oral/exposure vs formal grammar.");
    }
    if (rawTopic === "sentence" || nk.startsWith("english.sentence_writing")) {
      depthFlags.push(FLAG.ENGLISH_SENTENCE_EARLY);
      suggestNeedsHumanReview = true;
    }
  }
  if (subject === "english" && gmin <= 3) {
    const heavyRc =
      nk.includes("formal_reading") ||
      (nk.includes("vocabulary") && diff === "hard" && preview.length > 160);
    if (heavyRc) {
      depthFlags.push(FLAG.ENGLISH_RC_EARLY);
      suggestNeedsHumanReview = true;
      notes.push("Reading-load / literacy-heavy item in early English - confirm exposure vs formal comprehension.");
    }
  }

  const ADV_ANGLE_HINT =
    /\bobtuse\b|\bsupplementary\b|\bcomplementary\b|\binscribed\b|\bcircumscribed\b|\balternate\s+interior\b/i;
  if (subject === "geometry") {
    /* Align with israeli-primary-curriculum-map geometryGrade: volume allowed from g2; diagonals from g3. */
    if ((rawTopic.includes("volume") || nk.includes("volume")) && gmin <= 1) {
      depthFlags.push(FLAG.GEOMETRY_VOLUME_EARLY);
      suggestTooAdvanced = true;
      notes.push("Volume strand before grade 2 - sequencing review.");
    }
    if ((rawTopic.includes("diagonal") || nk.includes("diagonals")) && gmin <= 2) {
      depthFlags.push(FLAG.GEOMETRY_DIAGONALS_EARLY);
      suggestTooAdvanced = true;
      notes.push("Diagonal properties before grade 3 - sequencing review.");
    }
    if (gmin <= 3 && ADV_ANGLE_HINT.test(preview)) {
      depthFlags.push(FLAG.GEOMETRY_ADVANCED_ANGLES_EARLY);
      suggestTooAdvanced = true;
      notes.push("Advanced angle vocabulary in stem - verify grade placement.");
    }
  }

  if (subject === "math") {
    const pctEarly =
      rawTopic.includes("percent") ||
      nk.includes("percentages") ||
      nk.includes("percentage");
    if (pctEarly && gmin <= 3) {
      depthFlags.push(FLAG.MATH_PERCENTAGES_TOO_EARLY);
      if (gmin <= 2) suggestTooAdvanced = true;
      else suggestNeedsHumanReview = true;
      notes.push("Percent strand in lower primary - sequencing / depth review.");
    }
    if ((rawTopic.includes("fraction") || nk.includes("fractions")) && gmin <= 2 && diff === "hard") {
      depthFlags.push(FLAG.MATH_FRACTIONS_DEPTH_UNCLEAR);
      suggestNeedsHumanReview = true;
    }
    if (nk.includes("fractions") || nk.includes("decimals")) {
      if (preview.length > 200 || diff.includes("|")) {
        depthFlags.push(FLAG.MATH_FRACTIONS_DEPTH_UNCLEAR);
        notes.push("Fraction/decimal item with complex difficulty label - depth clarity review.");
      }
    }
  }

  if (subject === "hebrew" && gmin <= 2 && nk.includes("grammar_language_knowledge")) {
    depthFlags.push(FLAG.HEBREW_LANGUAGE_COMPLEXITY_EARLY);
    suggestNeedsHumanReview = true;
    notes.push("Formal Hebrew grammar/language-knowledge tagging in very early grades - confirm spiral vs mastery.");
  }

  const sciByG = ctx.coverageContext?.scienceByGrade;
  if (subject === "science" && sciByG && sciByG[gmin] != null && sciByG[gmin] < 40) {
    depthFlags.push(FLAG.SCIENCE_GRADE_LOW_COVERAGE);
    notes.push(`Science grade ${gmin} row count globally low (${sciByG[gmin]}) - coverage caveat.`);
  }

  const hebByG = ctx.coverageContext?.hebrewByGrade;
  if (subject === "hebrew" && gmin >= 5 && hebByG && hebByG[gmin] != null && hebByG[gmin] < 120) {
    depthFlags.push(FLAG.HEBREW_UPPER_LOW_COVERAGE);
    notes.push(`Hebrew upper-grade inventory thinner (${hebByG[gmin]} rows for g${gmin}).`);
  }

  if (subject === "moledet-geography") {
    if (["values", "homeland"].includes(rawTopic)) {
      depthFlags.push(FLAG.MOLEDET_VALUES_REPEATED);
      notes.push("Moledet theme repeats across grades - intentional spiral vs duplication review.");
    }
  }

  return {
    depthFlags,
    suggestTooAdvanced,
    suggestNeedsHumanReview,
    notes,
  };
}

/**
 * @param {object} rec inventory row (gradeMin, gradeMax)
 */
export function mergeDepthFlagsIntoClassification(
  baseClassification,
  baseReasons,
  depth,
  placement,
  rec
) {
  let classification = baseClassification;
  /** @type {string[]} */
  const reasons = [...(baseReasons || [])];
  let depthAdjusted = false;

  const gmin = Number(rec?.gradeMin);
  const coreAligned =
    classification === "aligned" || classification === "aligned_low_confidence";

  const bucket = placement?.bucket;
  const mapKey = placement?.def?.key || "";
  const geometryStrand =
    mapKey.startsWith("geometry.") || String(rec?.subject || "") === "geometry";

  /** Map may place early volume/diagonals in `allowedTopics` — still flag sequencing risk. */
  const placementAllowsDepthBump =
    bucket === "coreTopics" ||
    (bucket === "allowedTopics" && geometryStrand) ||
    (bucket === "allowedTopics" && mapKey.startsWith("math."));

  if (depth.suggestTooAdvanced && coreAligned && placementAllowsDepthBump) {
    const vol = depth.depthFlags.includes(FLAG.GEOMETRY_VOLUME_EARLY);
    const diag = depth.depthFlags.includes(FLAG.GEOMETRY_DIAGONALS_EARLY);
    const advAng = depth.depthFlags.includes(FLAG.GEOMETRY_ADVANCED_ANGLES_EARLY);
    const pct = depth.depthFlags.includes(FLAG.MATH_PERCENTAGES_TOO_EARLY);
    if (vol || diag || advAng || (pct && gmin <= 2)) {
      classification = "too_advanced";
      reasons.push("depth_heuristic_early_advanced_topic_for_placement_bucket");
      depthAdjusted = true;
    }
  }

  if (depth.suggestNeedsHumanReview && classification === "aligned" && placement?.bucket === "coreTopics") {
    const eg = depth.depthFlags.some((f) =>
      [FLAG.ENGLISH_GRAMMAR_EARLY, FLAG.ENGLISH_SENTENCE_EARLY, FLAG.ENGLISH_RC_EARLY].includes(f)
    );
    const pctReview =
      depth.depthFlags.includes(FLAG.MATH_PERCENTAGES_TOO_EARLY) && gmin >= 3 && gmin <= 4;
    const heb = depth.depthFlags.includes(FLAG.HEBREW_LANGUAGE_COMPLEXITY_EARLY);
    if (eg || pctReview || heb) {
      classification = "needs_human_review";
      reasons.push("depth_heuristic_core_path_requires_pedagogy_confirmation");
      depthAdjusted = true;
    }
  }

  if (
    classification === "aligned_low_confidence" &&
    placement?.bucket === "coreTopics" &&
    depth.depthFlags.includes(FLAG.MATH_PERCENTAGES_TOO_EARLY) &&
    gmin <= 2
  ) {
    classification = "too_advanced";
    reasons.push("depth_heuristic_percentages_very_early_even_if_bucket_matched");
    depthAdjusted = true;
  }

  return { classification, reasons, depthAdjusted };
}

export { FLAG as DEPTH_FLAG_IDS };
