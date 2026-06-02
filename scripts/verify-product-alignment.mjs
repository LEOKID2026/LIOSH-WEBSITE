/**
 * Product alignment verification — read-only scan of product surfaces vs curriculum oracle.
 * Run: node scripts/verify-product-alignment.mjs
 * Output: data/curriculum-oracle/v1/product-alignment-findings.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ORACLE_DIR, REPO_ROOT, readJson, writeJson } from "./lib/ministry-oracle-shared.mjs";
import { verifyAllCompletedBooksSequenceEnforced } from "../lib/learning-book/learning-book-sequence.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(ORACLE_DIR, "product-alignment-findings.json");

const GRADES = [1, 2, 3, 4, 5, 6];
const GRADE_KEYS = GRADES.map((g) => `g${g}`);

/** @typedef {"MISSING_REQUIRED_TOPIC"|"OVERTEACHING"|"WRONG_GRADE_SCOPE"|"HIDDEN_PREREQUISITE"|"OUT_OF_SEQUENCE"|"UNSUPPORTED_REPORT_LABEL"|"UNSUPPORTED_TEACHER_ASSIGNMENT"|"SOURCE_BLOCKER"|"NEEDS_OWNER_DECISION"} Classification */
/** @typedef {"P0"|"P1"|"P2"|"INFO"} Severity */

/**
 * @param {object} p
 * @returns {object}
 */
function finding(p) {
  return {
    finding_id: p.finding_id,
    subject: p.subject,
    grade: p.grade ?? null,
    topic: p.topic ?? null,
    product_surface: p.product_surface,
    file_path: p.file_path,
    current_behavior: p.current_behavior,
    oracle_status: p.oracle_status ?? null,
    evidence_from_code: p.evidence_from_code,
    evidence_from_oracle: p.evidence_from_oracle ?? null,
    classification: p.classification,
    severity: p.severity,
    recommended_action: p.recommended_action,
    can_implement_immediately: p.can_implement_immediately,
    source_verification_required: p.source_verification_required,
  };
}

async function loadProductModules() {
  const href = (rel) => pathToFileURL(path.join(REPO_ROOT, rel)).href;
  const [
    geoConstants,
    gradeBindings,
    g5Registry,
    g6Registry,
    classroomLabels,
    geoDiagBridge,
    moledetCurriculum,
    scienceCurriculum,
    gradeAwareTemplates,
    reportGuards,
    moledetSubjectId,
  ] = await Promise.all([
    import(href("utils/geometry-constants.js")),
    import(href("scripts/curriculum-spine-grade-bindings.mjs")),
    import(href("lib/learning-book/geometry-g5-registry.js")),
    import(href("lib/learning-book/geometry-g6-registry.js")),
    import(href("lib/classroom-activities/classroom-skill-labels-he.js")),
    import(href("utils/geometry-diagnostic-metadata-bridge.js")),
    import(href("data/moledet-geography-curriculum.js")),
    import(href("data/science-curriculum.js")),
    import(href("utils/parent-report-language/grade-aware-recommendation-templates.js")),
    import(href("utils/report-diagnostic-safety-guards.js")),
    import(href("lib/learning-shared/moledet-geography-subject-id.js")),
  ]);

  return {
    TOPIC_SHAPES: geoConstants.TOPIC_SHAPES,
    GEO_GRADES: geoConstants.GRADES,
    geometryKindGradeSpan: gradeBindings.geometryKindGradeSpan,
    GEOMETRY_G5_PAGE_ORDER: g5Registry.GEOMETRY_G5_PAGE_ORDER,
    GEOMETRY_G6_PAGE_ORDER: g6Registry.GEOMETRY_G6_PAGE_ORDER,
    classroomLabels: classroomLabels.GEO_DIAGNOSTIC_SKILL_LABEL_HE,
    geoTaxOrderText: fs.readFileSync(
      path.join(REPO_ROOT, "utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js"),
      "utf8"
    ),
    geoDiagBridgeText: fs.readFileSync(path.join(REPO_ROOT, "utils/geometry-diagnostic-metadata-bridge.js"), "utf8"),
    MOLEDET_GEOGRAPHY_GRADES: moledetCurriculum.MOLEDET_GEOGRAPHY_GRADES,
    SCIENCE_GRADES: scienceCurriculum.SCIENCE_GRADES,
    GRADE_AWARE_RECOMMENDATION_TEMPLATES: gradeAwareTemplates.GRADE_AWARE_RECOMMENDATION_TEMPLATES,
    shouldOmitRawDiagnosticRecommendationFallback:
      reportGuards.shouldOmitRawDiagnosticRecommendationFallback,
    rectangleAreaBridgeUsesSafeFallbackForVerify:
      geoDiagBridge.rectangleAreaBridgeUsesSafeFallbackForVerify,
    moledetSubjectId,
  };
}

function listLearningBookRegistries() {
  const dir = path.join(REPO_ROOT, "lib/learning-book");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith("-registry.js"))
    .sort();
}

function oracleRows(matrix) {
  return matrix.rows ?? matrix;
}

function countOracleBySubject(rows) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const row of rows) {
    const subj = row.subject ?? "unknown";
    counts[subj] = (counts[subj] ?? 0) + 1;
  }
  return counts;
}

function findOracleRow(rows, predicate) {
  return rows.find(predicate) ?? null;
}

function filterOracleRows(rows, predicate) {
  return rows.filter(predicate);
}

function spineSkills() {
  const data = readJson("data/curriculum-spine/v1/skills.json");
  return data.skills ?? data;
}

function runChecks(ctx) {
  const {
    oracle,
    skills,
    modules,
    sourceInventory,
    scienceScaffold,
    moledetScaffold,
  } = ctx;
  const rows = oracleRows(oracle);
  /** @type {ReturnType<finding>[]} */
  const findings = [];

  const triangleOracle = findOracleRow(
    rows,
    (r) => r.row_id === "math.g5.measurement.area_formulas.triangle_area"
  );
  const heightsOracle = findOracleRow(rows, (r) => r.row_id === "math.g5.geometry.heights");
  const parallelogramOracle = findOracleRow(
    rows,
    (r) => r.row_id === "math.g5.measurement.area_formulas.parallelogram_trapezoid"
  );
  const moledetG1Oracle = findOracleRow(rows, (r) => r.row_id === "moledet.g1.official_status");

  // GEO-01 — triangle area overteaching via TOPIC_SHAPES.area
  const oracleTriangleGrade = triangleOracle?.grade ?? 5;
  for (const g of GRADES) {
    const gk = `g${g}`;
    const shapes = modules.TOPIC_SHAPES.area?.[gk] ?? [];
    if (shapes.includes("triangle") && g < oracleTriangleGrade) {
      const binding = modules.geometryKindGradeSpan("triangle_area");
      findings.push(
        finding({
          finding_id: `GEO-01-G${g}`,
          subject: "geometry",
          grade: g,
          topic: "triangle_area",
          product_surface: "question_generator",
          file_path: "utils/geometry-constants.js",
          current_behavior: `TOPIC_SHAPES.area.${gk} includes "triangle"; geometryKindGradeSpan("triangle_area")=${JSON.stringify(binding)} enables triangle area questions from grade ${g}.`,
          oracle_status: triangleOracle?.status ?? "required_pending_pdf_parse",
          evidence_from_code: `TOPIC_SHAPES.area.${gk}=${JSON.stringify(shapes)}; scripts/curriculum-spine-grade-bindings.mjs triangle_area span ${JSON.stringify(binding)}`,
          evidence_from_oracle: `math.g5.measurement.area_formulas.triangle_area grade=${oracleTriangleGrade} status=${triangleOracle?.status}`,
          classification: "OVERTEACHING",
          severity: g <= 4 ? "P0" : "P1",
          recommended_action: `Gate triangle area generator and practice to grade ${oracleTriangleGrade}+ until oracle confirms earlier grades.`,
          can_implement_immediately: true,
          source_verification_required: false,
        })
      );
    }
  }

  // GEO-02 — triangle_area missing from spine or wrong grade span
  const triangleSpine = skills.find((s) => s.skill_id === "geometry:kind:triangle_area");
  if (
    !triangleSpine ||
    triangleSpine.minGrade > 5 ||
    triangleSpine.maxGrade < 6
  ) {
    findings.push(
      finding({
        finding_id: "GEO-02",
        subject: "geometry",
        grade: 5,
        topic: "triangle_area",
        product_surface: "curriculum_spine",
        file_path: "data/curriculum-spine/v1/skills.json",
        current_behavior: "No geometry:kind:triangle_area row among geometry spine skills.",
        oracle_status: triangleOracle?.status,
        evidence_from_code: "grep geometry:kind:triangle_area in skills.json → 0 matches",
        evidence_from_oracle: triangleOracle?.row_id,
        classification: "MISSING_REQUIRED_TOPIC",
        severity: "P1",
        recommended_action: "Add verified spine skill after oracle PDF parse confirms formula scope.",
        can_implement_immediately: false,
        source_verification_required: true,
      })
    );
  }

  // GEO-03 — G5 book missing triangle_area page
  const g5Pages = modules.GEOMETRY_G5_PAGE_ORDER;
  const hasG5TriangleArea = g5Pages.includes("triangle_area");
  if (!hasG5TriangleArea) {
    findings.push(
      finding({
        finding_id: "GEO-03",
        subject: "geometry",
        grade: 5,
        topic: "triangle_area",
        product_surface: "learning_book",
        file_path: "lib/learning-book/geometry-g5-registry.js",
        current_behavior: `GEOMETRY_G5_PAGE_ORDER=${JSON.stringify(g5Pages)} — no triangle_area page.`,
        oracle_status: triangleOracle?.status,
        evidence_from_code: "GEOMETRY_G5_BOOK_BATCHES batch b has square_area only; no triangle_area batch entry",
        evidence_from_oracle: `${triangleOracle?.row_id} sequence_index=${triangleOracle?.sequence_index}`,
        classification: "MISSING_REQUIRED_TOPIC",
        severity: "P1",
        recommended_action: "Add G5 learning-book page triangle_area after source verification.",
        can_implement_immediately: false,
        source_verification_required: true,
      })
    );
  }

  // GEO-04 — official G5 order: heights (§ ד.4) before area formulas (§ ה)
  const heightsIdx = g5Pages.indexOf("heights_triangle");
  const triangleAreaIdx = g5Pages.indexOf("triangle_area");
  const areaFormulaPages = ["square_area", "triangle_area", "parallelogram_area", "trapezoid_area"];
  if (heightsIdx !== -1) {
    for (const pageId of areaFormulaPages) {
      const areaIdx = g5Pages.indexOf(pageId);
      if (areaIdx !== -1 && areaIdx < heightsIdx) {
        findings.push(
          finding({
            finding_id: "GEO-04",
            subject: "geometry",
            grade: 5,
            topic: pageId,
            product_surface: "learning_book",
            file_path: "lib/learning-book/geometry-g5-registry.js",
            current_behavior: `${pageId} (index ${areaIdx}) appears before heights_triangle (index ${heightsIdx}); kita5.pdf order is § ד.4 גבהים then § ה. מדידות שטחים.`,
            oracle_status: heightsOracle?.status,
            evidence_from_code: `GEOMETRY_G5_PAGE_ORDER indices ${pageId}=${areaIdx} heights_triangle=${heightsIdx}`,
            evidence_from_oracle: "kita5.pdf § ד.4 before § ה",
            classification: "OUT_OF_SEQUENCE",
            severity: "P1",
            recommended_action: "Move heights batch before area formula pages in G5 book registry.",
            can_implement_immediately: true,
            source_verification_required: false,
          })
        );
        break;
      }
    }
  }

  // GEO-05 — G6 prism_volume_triangle without G5 triangle_area (unprotected exposure)
  const g6HasPrismTriangle = modules.GEOMETRY_G6_PAGE_ORDER.includes("prism_volume_triangle");
  const gatesText = fs.readFileSync(
    path.join(REPO_ROOT, "utils/geometry-curriculum-gates.js"),
    "utf8"
  );
  const prismGated =
    gatesText.includes("isPrismVolumeTriangleAllowed") &&
    gatesText.includes("TRIANGLE_AREA_TEACH_PATH_READY = false");
  if (g6HasPrismTriangle && !hasG5TriangleArea && !prismGated) {
    findings.push(
      finding({
        finding_id: "GEO-05",
        subject: "geometry",
        grade: 6,
        topic: "prism_volume_triangle",
        product_surface: "learning_book",
        file_path: "lib/learning-book/geometry-g6-registry.js",
        current_behavior: "G6 book includes prism_volume_triangle; G5 book lacks triangle_area prerequisite page.",
        oracle_status: triangleOracle?.status,
        evidence_from_code: "geometry-g6-registry batch e pages include prism_volume_triangle; G5 has no triangle_area",
        evidence_from_oracle: triangleOracle?.row_id,
        classification: "HIDDEN_PREREQUISITE",
        severity: "P1",
        recommended_action: "Gate G6 prism_volume_triangle until G5 triangle area is taught and registered.",
        can_implement_immediately: true,
        source_verification_required: false,
      })
    );
  }

  // GEO-06 — classroom label geo_area_triangle_formula without grade gate
  const labels = modules.classroomLabels ?? {};
  const labelsText = fs.readFileSync(
    path.join(REPO_ROOT, "lib/classroom-activities/classroom-skill-labels-he.js"),
    "utf8"
  );
  if (labels.geo_area_triangle_formula || labelsText.includes("geo_area_triangle_formula")) {
    const hasGradeGate =
      labelsText.includes("isTriangleAreaFormulaGradeAllowed") &&
      labelsText.includes("gradeLevel");
    if (!hasGradeGate) {
      findings.push(
        finding({
          finding_id: "GEO-06",
          subject: "geometry",
          grade: null,
          topic: "triangle_area",
          product_surface: "teacher_classroom_labels",
          file_path: "lib/classroom-activities/classroom-skill-labels-he.js",
          current_behavior: `geo_area_triangle_formula label present without grade-aware gate via isTriangleAreaFormulaGradeAllowed.`,
          oracle_status: triangleOracle?.status,
          evidence_from_code: 'geo_area_triangle_formula: "שטח משולש"',
          evidence_from_oracle: `${triangleOracle?.row_id} grade=${oracleTriangleGrade}`,
          classification: "UNSUPPORTED_REPORT_LABEL",
          severity: "P0",
          recommended_action: "Suppress or grade-gate geo_area_triangle_formula for grades below G5.",
          can_implement_immediately: true,
          source_verification_required: false,
        })
      );
    }
  }

  // GEO-07 — diagnostic bridge triangle_area → geo_area_triangle_formula without grade guard
  if (modules.geoDiagBridgeText.includes("triangle_area:")) {
    const bridgeHasGradeGate = modules.geoDiagBridgeText.includes(
      "isTriangleAreaFormulaGradeAllowed"
    );
    if (!bridgeHasGradeGate) {
      findings.push(
        finding({
          finding_id: "GEO-07",
          subject: "geometry",
          grade: null,
          topic: "triangle_area",
          product_surface: "diagnostic_metadata_bridge",
          file_path: "utils/geometry-diagnostic-metadata-bridge.js",
          current_behavior: `BY_KIND.triangle_area maps to diagnosticSkillId geo_area_triangle_formula without grade guard in enrichGeometryProceduralParams.`,
          oracle_status: triangleOracle?.status,
          evidence_from_code: "BY_KIND.triangle_area.diagnosticSkillId = geo_area_triangle_formula",
          evidence_from_oracle: triangleOracle?.row_id,
          classification: "UNSUPPORTED_TEACHER_ASSIGNMENT",
          severity: "P0",
          recommended_action: "Add grade-aware guard in diagnostic bridge for triangle_area kinds below G5.",
          can_implement_immediately: true,
          source_verification_required: false,
        })
      );
    }
  }

  // GEO-08 — G08 indicators include triangle_area for all grades (no grade-aware filter)
  const g08Match = modules.geoTaxOrderText.match(/const G08_INDICATORS = \[([\s\S]*?)\];/);
  const g08Indicators = g08Match
    ? [...g08Match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];
  if (g08Indicators.includes("triangle_area") && !modules.geoTaxOrderText.includes("g08IndicatorsForRow")) {
    findings.push(
      finding({
        finding_id: "GEO-08",
        subject: "geometry",
        grade: null,
        topic: "triangle_area",
        product_surface: "diagnostic_taxonomy_routing",
        file_path: "utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js",
        current_behavior: `G08_INDICATORS includes "triangle_area"; routes area/triangle wrong answers to G-08 bucket regardless of student grade.`,
        oracle_status: triangleOracle?.status,
        evidence_from_oracle: "G-08 advanced area taxonomy; triangle_area oracle grade 5",
        evidence_from_code: `G08_INDICATORS=${JSON.stringify(g08Indicators.filter((x) => x.includes("triangle") || x.includes("area")))}`,
        classification: "UNSUPPORTED_REPORT_LABEL",
        severity: "P0",
        recommended_action: "Grade-gate G-08 triangle_area indicator routing to G5+ only.",
        can_implement_immediately: true,
        source_verification_required: false,
      })
    );
  }

  // GEO-09 — rectangle_area in bridge but not spine / bindings
  const rectBinding = modules.geometryKindGradeSpan("rectangle_area");
  const rectSpine = skills.find((s) => s.skill_id?.includes("rectangle_area"));
  const rectBridgeGuarded =
    typeof modules.rectangleAreaBridgeUsesSafeFallbackForVerify === "function" &&
    modules.rectangleAreaBridgeUsesSafeFallbackForVerify();
  if (
    modules.geoDiagBridgeText.includes("rectangle_area:") &&
    !rectSpine &&
    rectBinding === null &&
    !rectBridgeGuarded
  ) {
    findings.push(
      finding({
        finding_id: "GEO-09",
        subject: "geometry",
        grade: null,
        topic: "rectangle_area",
        product_surface: "diagnostic_metadata_bridge",
        file_path: "utils/geometry-diagnostic-metadata-bridge.js",
        current_behavior: "rectangle_area in BY_KIND → geo_rect_area_plan; no matching spine skill; geometryKindGradeSpan returns null.",
        oracle_status: "derived_from_product",
        evidence_from_code: "BY_KIND.rectangle_area; no geometry:kind:rectangle_area in skills.json; grade span null",
        evidence_from_oracle: "Rectangle area covered under multiple oracle rows; spine mirror incomplete",
        classification: "NEEDS_OWNER_DECISION",
        severity: "P2",
        recommended_action: "Owner decision: register rectangle_area spine skill or remove diagnostic bridge entry.",
        can_implement_immediately: false,
        source_verification_required: true,
      })
    );
  }

  // GEO-10 — symmetry spine G4 only vs G6 topics
  const symmetrySkill = skills.find((s) => s.skill_id === "geometry:kind:symmetry");
  const g6HasSymmetryTopic = modules.GEO_GRADES.g6?.topics?.includes("symmetry");
  if (symmetrySkill && symmetrySkill.minGrade === 4 && symmetrySkill.maxGrade === 4 && g6HasSymmetryTopic) {
    findings.push(
      finding({
        finding_id: "GEO-10",
        subject: "geometry",
        grade: 6,
        topic: "symmetry",
        product_surface: "question_generator",
        file_path: "utils/geometry-constants.js",
        current_behavior: `Spine symmetry skill grades ${symmetrySkill.minGrade}–${symmetrySkill.maxGrade}; GRADES.g6.topics includes "symmetry".`,
        oracle_status: "check_oracle_symmetry_g6",
        evidence_from_code: "skills.json geometry:kind:symmetry minGrade=4 maxGrade=4; GRADES.g6.topics includes symmetry",
        evidence_from_oracle: "Verify symmetry oracle row grade span",
        classification: "WRONG_GRADE_SCOPE",
        severity: "P2",
        recommended_action: "Align G6 symmetry generator availability with verified oracle grade span.",
        can_implement_immediately: false,
        source_verification_required: true,
      })
    );
  }

  // SCI-01 — zero oracle science rows vs spine science skills
  const scienceOracleRows = filterOracleRows(rows, (r) => r.subject === "science");
  const scienceSpine = skills.filter((s) => s.subject === "science");
  if (scienceOracleRows.length === 0 && scienceSpine.length > 0) {
    for (const g of GRADES) {
      findings.push(
        finding({
          finding_id: `SCI-01-G${g}`,
          subject: "science",
          grade: g,
          topic: "all",
          product_surface: "curriculum_spine_and_runtime",
          file_path: "data/curriculum-spine/v1/skills.json",
          current_behavior: `${scienceSpine.length} science spine skills active; no official oracle rows.`,
          oracle_status: "no_oracle_rows",
          evidence_from_code: `science spine skill count=${scienceSpine.length}; SCIENCE_GRADES.g${g}.topics active in product`,
          evidence_from_oracle: "ministry-matrix.draft.json science row count=0",
          classification: "SOURCE_BLOCKER",
          severity: "P0",
          recommended_action: "Remove Ministry alignment claims for science; gate content until official oracle rows exist.",
          can_implement_immediately: true,
          source_verification_required: true,
        })
      );
    }
  }

  // SCI-02 — plants grade span vs curriculum topics
  const plantsSkill = skills.find((s) => s.skill_id === "science:topic:plants");
  if (plantsSkill) {
    const { minGrade, maxGrade } = plantsSkill;
    const mismatches = [];
    for (const g of GRADES) {
      const gk = `g${g}`;
      const topics = modules.SCIENCE_GRADES[gk]?.topics ?? [];
      const hasPlants = topics.includes("plants");
      const shouldHave = g >= minGrade && g <= maxGrade;
      if (shouldHave && !hasPlants) mismatches.push(`${gk}: skill span expects plants, topic absent`);
      if (!shouldHave && hasPlants) mismatches.push(`${gk}: plants topic present outside skill span`);
    }
    if (mismatches.length) {
      findings.push(
        finding({
          finding_id: "SCI-02",
          subject: "science",
          grade: null,
          topic: "plants",
          product_surface: "curriculum_spine",
          file_path: "data/science-curriculum.js",
          current_behavior: mismatches.join("; "),
          oracle_status: "internal_scaffold_only",
          evidence_from_code: `science:topic:plants minGrade=${minGrade} maxGrade=${maxGrade}`,
          evidence_from_oracle: scienceScaffold?.rows?.filter((r) => r.official_topic === "plants").map((r) => r.row_id).join(", "),
          classification: "WRONG_GRADE_SCOPE",
          severity: "P2",
          recommended_action: "Align plants topic in SCIENCE_GRADES with verified oracle/scaffold span.",
          can_implement_immediately: false,
          source_verification_required: true,
        })
      );
    }
  }

  // SCI-03 — missing S-05, S-06, S-08 in grade-aware science templates
  const scienceTemplates = modules.GRADE_AWARE_RECOMMENDATION_TEMPLATES?.science ?? {};
  for (const taxId of ["S-05", "S-06", "S-08"]) {
    const guardActive =
      typeof modules.shouldOmitRawDiagnosticRecommendationFallback === "function" &&
      modules.shouldOmitRawDiagnosticRecommendationFallback("science", taxId);
    if (!scienceTemplates[taxId] && !guardActive) {
      findings.push(
        finding({
          finding_id: `SCI-03-${taxId}`,
          subject: "science",
          grade: null,
          topic: taxId,
          product_surface: "parent_report_grade_aware_templates",
          file_path: "utils/parent-report-language/grade-aware-recommendation-templates.js",
          current_behavior: `${taxId} approved in taxonomy-science.js but absent from GRADE_AWARE_RECOMMENDATION_TEMPLATES.science.`,
          oracle_status: "no_oracle_rows",
          evidence_from_code: `science template keys: ${Object.keys(scienceTemplates).sort().join(", ")}`,
          evidence_from_oracle: "Science oracle empty; templates incomplete for S-05/S-06/S-08",
          classification: "UNSUPPORTED_REPORT_LABEL",
          severity: "P1",
          recommended_action: `Add approved grade-aware copy for ${taxId} or suppress taxonomy routing until templates exist.`,
          can_implement_immediately: true,
          source_verification_required: false,
        })
      );
    }
  }

  // MOL-01 — G1 geography spine skills vs oracle not_in_grade
  const g1GeoSkills = skills.filter(
    (s) => s.subject === "geography" && s.minGrade <= 1 && s.maxGrade >= 1
  );
  if (moledetG1Oracle?.status === "not_in_grade" && g1GeoSkills.length > 0) {
    findings.push(
      finding({
        finding_id: "MOL-01",
        subject: "moledet-geography",
        grade: 1,
        topic: "all",
        product_surface: "curriculum_spine",
        file_path: "data/curriculum-spine/v1/skills.json",
        current_behavior: `${g1GeoSkills.length} geography spine skills include grade 1; product serves full moledet content at G1.`,
        oracle_status: moledetG1Oracle.status,
        evidence_from_code: `geography G1 spine skill count=${g1GeoSkills.length}`,
        evidence_from_oracle: `${moledetG1Oracle.row_id} status=${moledetG1Oracle.status} confidence=${moledetG1Oracle.confidence}`,
        classification: "OVERTEACHING",
        severity: "P0",
        recommended_action: "Gate moledet/geography G1 content; oracle marks G1 as not_in_grade / no_verified_source.",
        can_implement_immediately: true,
        source_verification_required: true,
      })
    );
  }

  // MOL-02 — product G1 topics vs oracle
  const g1ProductTopics = modules.MOLEDET_GEOGRAPHY_GRADES.g1?.topics ?? [];
  if (moledetG1Oracle && g1ProductTopics.length > 1) {
    findings.push(
      finding({
        finding_id: "MOL-02",
        subject: "moledet-geography",
        grade: 1,
        topic: "all",
        product_surface: "student_topic_selection",
        file_path: "data/moledet-geography-curriculum.js",
        current_behavior: `MOLEDET_GEOGRAPHY_GRADES.g1.topics=${JSON.stringify(g1ProductTopics)} (6 topics) active despite oracle G1 not_in_grade.`,
        oracle_status: moledetG1Oracle.status,
        evidence_from_code: `MOLEDET_GEOGRAPHY_GRADES.g1.topics length=${g1ProductTopics.length}`,
        evidence_from_oracle: moledetG1Oracle.row_id,
        classification: "WRONG_GRADE_SCOPE",
        severity: "P0",
        recommended_action: "Disable G1 moledet topic menu until official G1 source verified.",
        can_implement_immediately: true,
        source_verification_required: true,
      })
    );
  }

  // MOL-03 — spine moledet/geography subject split vs oracle G2–4 / G5–6
  const moledetSourceSkills = skills.filter((s) =>
    String(s.source || "").includes("moledet-geography-curriculum.js")
  );
  const g234SpineMisaligned = moledetSourceSkills.filter(
    (s) => s.minGrade >= 2 && s.maxGrade <= 4 && s.subject !== "moledet"
  );
  const g56SpineMisaligned = moledetSourceSkills.filter(
    (s) => s.minGrade >= 5 && s.maxGrade <= 6 && s.subject !== "geography"
  );
  const moledetOracleG234 = filterOracleRows(
    rows,
    (r) => r.subject === "moledet" && r.grade >= 2 && r.grade <= 4
  );
  const geographyOracleG56 = filterOracleRows(
    rows,
    (r) => r.subject === "geography" && r.grade >= 5 && r.grade <= 6
  );
  if (
    (g234SpineMisaligned.length > 0 && moledetOracleG234.length > 0) ||
    (g56SpineMisaligned.length > 0 && geographyOracleG56.length > 0)
  ) {
    findings.push(
      finding({
        finding_id: "MOL-03",
        subject: "moledet-geography",
        grade: null,
        topic: "subject_taxonomy",
        product_surface: "curriculum_spine",
        file_path: "data/curriculum-spine/v1/skills.json",
        current_behavior: `Moledet curriculum spine misaligned: G2–4 non-moledet=${g234SpineMisaligned.length}; G5–6 non-geography=${g56SpineMisaligned.length}.`,
        oracle_status: "split_subject_model",
        evidence_from_code: `g234 misaligned=${g234SpineMisaligned.length}; g56 misaligned=${g56SpineMisaligned.length}`,
        evidence_from_oracle: `moledet oracle rows G2-4=${moledetOracleG234.length}; geography oracle G5-6=${geographyOracleG56.length}`,
        classification: "NEEDS_OWNER_DECISION",
        severity: "P2",
        recommended_action: "Align spine subject moledet (G2–4) and geography (G5–6) with oracle bands.",
        can_implement_immediately: true,
        source_verification_required: false,
      })
    );
  }

  // MOL-04 — moledet-geography vs moledet_geography alias wiring
  const {
    assertMoledetGeographySubjectAliasesConfigured,
    MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID,
    MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
  } = modules.moledetSubjectId;
  const mol04WiringFiles = [
    "pages/learning/parent-report.js",
    "pages/learning/moledet-geography-master.js",
    "lib/learning-supabase/learning-activity.js",
  ];
  const mol04Unwired = mol04WiringFiles.filter((rel) => {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    return !text.includes("moledet-geography-subject-id");
  });
  if (!assertMoledetGeographySubjectAliasesConfigured() || mol04Unwired.length > 0) {
    findings.push(
      finding({
        finding_id: "MOL-04",
        subject: "moledet-geography",
        grade: null,
        topic: "subject_id",
        product_surface: "reporting_and_runtime",
        file_path: "lib/learning-shared/moledet-geography-subject-id.js",
        current_behavior: `Alias module ok=${assertMoledetGeographySubjectAliasesConfigured()}; unwired surfaces=${mol04Unwired.join(", ") || "none"}. Canonical activity=${MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID}; report=${MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID}.`,
        oracle_status: "moledet-geography partial uses hyphen",
        evidence_from_code: `unwired=${mol04Unwired.length}; aliasOk=${assertMoledetGeographySubjectAliasesConfigured()}`,
        evidence_from_oracle: "partial_sources partial=moledet-geography",
        classification: "NEEDS_OWNER_DECISION",
        severity: "P2",
        recommended_action: "Pick canonical subject id and alias across parent, teacher, school, and spine layers.",
        can_implement_immediately: true,
        source_verification_required: false,
      })
    );
  }

  // ENG-01 — English G4–6 source_blocker vs active spine
  for (const g of [4, 5, 6]) {
    const blocker = findOracleRow(rows, (r) => r.row_id === `english.g${g}.source_blocker`);
    const englishGSkills = skills.filter(
      (s) => s.subject === "english" && s.minGrade <= g && s.maxGrade >= g
    );
    if (blocker && englishGSkills.length > 0) {
      findings.push(
        finding({
          finding_id: `ENG-01-G${g}`,
          subject: "english",
          grade: g,
          topic: "all",
          product_surface: "curriculum_spine_and_runtime",
          file_path: "data/curriculum-spine/v1/skills.json",
          current_behavior: `${englishGSkills.length} english spine skills cover grade ${g}; no product grade gate for source_blocker.`,
          oracle_status: blocker.status,
          evidence_from_code: `english skills spanning g${g}: ${englishGSkills.length}`,
          evidence_from_oracle: blocker.row_id,
          classification: "SOURCE_BLOCKER",
          severity: "P0",
          recommended_action: `Gate English G${g} content and remove Ministry alignment claims until verified oracle rows replace source_blocker.`,
          can_implement_immediately: true,
          source_verification_required: true,
        })
      );
    }
  }

  // HEB-01 — only G1 hebrew learning book registry
  const hebrewRegistries = listLearningBookRegistries().filter((f) => f.startsWith("hebrew-"));
  const hebrewOracleG2Plus = filterOracleRows(rows, (r) => r.subject === "hebrew" && r.grade >= 2);
  const missingHebrewBookGrades = GRADES.filter(
    (g) => g >= 2 && !hebrewRegistries.includes(`hebrew-g${g}-registry.js`)
  );
  if (hebrewOracleG2Plus.length > 0 && missingHebrewBookGrades.length > 0) {
    findings.push(
      finding({
        finding_id: "HEB-01",
        subject: "hebrew",
        grade: null,
        topic: "learning_book",
        product_surface: "learning_book",
        file_path: "lib/learning-book/",
        current_behavior: `Hebrew learning-book registries: ${hebrewRegistries.join(", ") || "none"}; missing G${missingHebrewBookGrades.join(", G")} registries.`,
        oracle_status: "derived_alignment",
        evidence_from_code: `hebrew registries=${JSON.stringify(hebrewRegistries)}`,
        evidence_from_oracle: `${hebrewOracleG2Plus.length} hebrew oracle rows for grades 2–6`,
        classification: "MISSING_REQUIRED_TOPIC",
        severity: "INFO",
        recommended_action: "Add Hebrew G2–6 learning-book registries when editorial pipeline ready; subject has derived_alignment not blocking launch gates.",
        can_implement_immediately: false,
        source_verification_required: false,
      })
    );
  }

  // SEQ-01 — G5 parallelogram/trapezoid area before heights
  const paraIdx = g5Pages.indexOf("parallelogram_area");
  const trapIdx = g5Pages.indexOf("trapezoid_area");
  const heightsParaIdx = g5Pages.indexOf("heights_parallelogram");
  if (
    paraIdx !== -1 &&
    heightsParaIdx !== -1 &&
    paraIdx < heightsParaIdx &&
    parallelogramOracle?.prerequisite_row_ids?.includes("math.g5.geometry.heights")
  ) {
    findings.push(
      finding({
        finding_id: "SEQ-01",
        subject: "geometry",
        grade: 5,
        topic: "parallelogram_trapezoid_area",
        product_surface: "learning_book",
        file_path: "lib/learning-book/geometry-g5-registry.js",
        current_behavior: `Book order: parallelogram_area@${paraIdx}, trapezoid_area@${trapIdx}, heights_parallelogram@${heightsParaIdx}. Oracle requires heights before parallelogram/trapezoid area formulas.`,
        oracle_status: parallelogramOracle?.status,
        evidence_from_code: `GEOMETRY_G5_PAGE_ORDER batch c before batch d`,
        evidence_from_oracle: `${parallelogramOracle?.row_id} prerequisite_row_ids includes math.g5.geometry.heights`,
        classification: "OUT_OF_SEQUENCE",
        severity: "P1",
        recommended_action: "Reorder G5 book: heights batch before parallelogram/trapezoid area batch.",
        can_implement_immediately: true,
        source_verification_required: false,
      })
    );
  }

  // SEQ-02 — completed books must enforce learning sequence via resolver
  const registries = listLearningBookRegistries();
  const completedSubjects = ["math", "geometry", "science", "hebrew", "english"];
  const completedRegs = registries.filter((f) =>
    completedSubjects.some((s) => f.startsWith(`${s}-g`))
  );
  const unpatchted = completedRegs.filter((f) => {
    const t = fs.readFileSync(path.join(REPO_ROOT, "lib/learning-book", f), "utf8");
    return !t.includes("createSequencedBookExports");
  });
  const seqCheck = verifyAllCompletedBooksSequenceEnforced();
  const seqEnforced = seqCheck.ok && unpatchted.length === 0;
  if (!seqEnforced) {
    findings.push(
      finding({
        finding_id: "SEQ-02",
        subject: "all",
        grade: null,
        topic: "pedagogical_sequence",
        product_surface: "learning_book",
        file_path: "lib/learning-book/learning-book-sequence.js",
        current_behavior: `Sequence resolver incomplete: unpatchted=${unpatchted.length}, metaViolations=${seqCheck.violations.length}`,
        oracle_status: "sequence_fields_populated",
        evidence_from_code: `unpatchted registries=${JSON.stringify(unpatchted.slice(0, 5))}`,
        evidence_from_oracle: `${rows.filter((r) => r.sequence_index != null).length} rows with sequence_index`,
        classification: "OUT_OF_SEQUENCE",
        severity: "P1",
        recommended_action: "Wire all completed book registries through createSequencedBookExports and learning-book-sequence-meta.",
        can_implement_immediately: true,
        source_verification_required: false,
      })
    );
  }

  return findings;
}

function buildOracleSnapshot(oracle, sourceInventory, findings) {
  const rows = oracleRows(oracle);
  const bySubject = countOracleBySubject(rows);
  const severityCounts = { P0: 0, P1: 0, P2: 0, INFO: 0 };
  for (const f of findings) severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;

  return {
    matrix_path: "data/curriculum-oracle/v1/ministry-matrix.draft.json",
    row_count: oracle.row_count ?? rows.length,
    blocker_count: oracle.blocker_count ?? rows.filter((r) => r.status?.includes("blocker")).length,
    high_confidence_rows: rows.filter((r) => r.confidence === "high").length,
    science_oracle_rows: bySubject.science ?? 0,
    hebrew_oracle_rows: bySubject.hebrew ?? 0,
    english_oracle_rows: bySubject.english ?? 0,
    geometry_oracle_rows: bySubject.geometry ?? 0,
    moledet_oracle_rows: bySubject.moledet ?? 0,
    geography_oracle_rows: bySubject.geography ?? 0,
    source_inventory_verified_count: sourceInventory?.sources?.filter((s) => s.verification_status === "verified")?.length ?? null,
    finding_count: findings.length,
    severity_counts: severityCounts,
    generated_at: new Date().toISOString(),
  };
}

async function main() {
  const oracle = readJson("data/curriculum-oracle/v1/ministry-matrix.draft.json");
  const sourceInventory = readJson("data/curriculum-oracle/v1/source-inventory.json");
  const scienceScaffold = readJson("data/curriculum-oracle/v1/internal-scaffold.science.json");
  const moledetScaffold = readJson("data/curriculum-oracle/v1/internal-scaffold.moledet-geography.json");
  const skills = spineSkills();
  const modules = await loadProductModules();

  const findings = runChecks({
    oracle,
    skills,
    modules,
    sourceInventory,
    scienceScaffold,
    moledetScaffold,
  });

  const payload = {
    schema_version: 1,
    generator: "scripts/verify-product-alignment.mjs",
    generated_at: new Date().toISOString(),
    oracle_snapshot: buildOracleSnapshot(oracle, sourceInventory, findings),
    inputs_read: [
      "data/curriculum-oracle/v1/ministry-matrix.draft.json",
      "data/curriculum-oracle/v1/source-inventory.json",
      "data/curriculum-oracle/v1/internal-scaffold.science.json",
      "data/curriculum-oracle/v1/internal-scaffold.moledet-geography.json",
      "data/curriculum-spine/v1/skills.json",
      "utils/geometry-constants.js",
      "scripts/curriculum-spine-grade-bindings.mjs",
      "lib/learning-book/geometry-g5-registry.js",
      "lib/learning-book/geometry-g6-registry.js",
      "lib/classroom-activities/classroom-skill-labels-he.js",
      "utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js",
      "utils/geometry-diagnostic-metadata-bridge.js",
      "data/moledet-geography-curriculum.js",
      "data/science-curriculum.js",
      "utils/parent-report-language/grade-aware-recommendation-templates.js",
    ],
    findings,
  };

  writeJson(OUTPUT, payload);
  console.log(`Wrote ${findings.length} findings → ${path.relative(REPO_ROOT, OUTPUT)}`);
  console.log(JSON.stringify(payload.oracle_snapshot.severity_counts));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
