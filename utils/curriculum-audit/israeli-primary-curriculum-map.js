/**
 * Israeli elementary (grades 1–6) curriculum mapping — Phase 2 conservative layer.
 * Topic entries are structured objects (not bare strings). Hebrew labels are advisory.
 */

/** @typedef {'high' | 'medium' | 'low'} MapConfidence */

/**
 * @typedef {Object} CurriculumTopicDef
 * @property {string} key
 * @property {string} labelHe
 * @property {'core' | 'allowed' | 'enrichment' | 'not_yet'} expectedLevel
 * @property {MapConfidence} confidence
 * @property {string} notes
 * @property {Array<{ sourceType: string, title: string, url: string, checkedAt: string, note: string }>} [sourceRefs]
 */

/**
 * @typedef {Object} GradeCurriculumEntry
 * @property {CurriculumTopicDef[]} coreTopics
 * @property {CurriculumTopicDef[]} allowedTopics
 * @property {CurriculumTopicDef[]} enrichmentTopics
 * @property {CurriculumTopicDef[]} notExpectedYet
 * @property {string} sourceNotes
 * @property {MapConfidence} confidence
 */

const REVIEW_NOTE =
  "Conservative elementary mapping; requires human curriculum review before release blocking.";

/**
 * Sample anchors only — broad references for human verification; not item-level Ministry certification.
 * @type {Record<string, Array<{ sourceType: string, title: string, url: string, checkedAt: string, note: string }>>}
 */
export const CURRICULUM_SOURCE_REF_PRESETS = {
  internal_conservative: [
    {
      sourceType: "internal_conservative",
      title: "Internal conservative strand mapping (LIOSH audit layer)",
      url: "",
      checkedAt: "2026-05-09",
      note: "Repo-maintained interpretation - requires pedagogy sign-off before any release gate.",
    },
  ],
  rama_general: [
    {
      sourceType: "rama",
      title: "אופקים חדשים - עקרונות כלליים (משרד החינוך / רשויות)",
      url: "https://www.gov.il/he/departments/education",
      checkedAt: "2026-05-09",
      note: "General framework reference only; does not map individual question stems to outcomes.",
    },
  ],
  moe_portal: [
    {
      sourceType: "official_moe",
      title: "משרד החינוך - דף ראשי והנחיות כלליות",
      url: "https://www.gov.il/he/departments/education",
      checkedAt: "2026-05-09",
      note: "Official portal - use for policy context; not a line-by-line syllabus match.",
    },
  ],
  /** Broad framing only — not item-level English outcomes. */
  english_exposure_framework: [
    {
      sourceType: "official_moe",
      title: "משרד החינוך - מסגרת כללית (אנגלית)",
      url: "https://www.gov.il/he/departments/education",
      checkedAt: "2026-05-09",
      note: "General policy context; early grades often emphasize exposure/listening - verify formal literacy vs exposure per school.",
    },
    {
      sourceType: "rama",
      title: "אופקים חדשים - עקרונות כלליים (משרד החינוך / רשויות)",
      url: "https://www.gov.il/he/departments/education",
      checkedAt: "2026-05-09",
      note: "General framework reference only; does not map individual question stems to outcomes.",
    },
  ],
  /** Shapes / spatial orientation — interpretive mapping; not a formal geometry syllabus slice. */
  geometry_shapes_intro: [
    {
      sourceType: "internal_conservative",
      title: "Internal strand: plane shapes recognition (audit)",
      url: "",
      checkedAt: "2026-05-09",
      note: "Repo interpretation of typical early shape recognition - requires pedagogy validation.",
    },
    {
      sourceType: "official_moe",
      title: "משרד החינוך - דף ראשי והנחיות כלליות",
      url: "https://www.gov.il/he/departments/education",
      checkedAt: "2026-05-09",
      note: "Official portal - use for policy context; not a line-by-line syllabus match.",
    },
  ],
};

/** @param {object} [extra] optional sourceRefs and overrides */
function td(key, labelHe, level, conf = "medium", extra = {}) {
  return {
    key,
    labelHe,
    expectedLevel: level,
    confidence: conf,
    notes: REVIEW_NOTE,
    ...extra,
  };
}

function anchored(...refGroups) {
  const sourceRefs = refGroups.flat().filter(Boolean);
  return sourceRefs.length ? { sourceRefs } : {};
}

const G_HE = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];

/** Prefix match: exact key or child path (e.g. english.grammar.*) */
export function matchTopicDef(defs, normalizedKey) {
  if (!normalizedKey || !Array.isArray(defs)) return null;
  for (const def of defs) {
    if (!def?.key) continue;
    if (normalizedKey === def.key) return def;
    if (normalizedKey.startsWith(`${def.key}.`)) return def;
  }
  return null;
}

/**
 * @param {GradeCurriculumEntry} entry
 * @param {string} normalizedKey
 * @returns {{ bucket: string, def: CurriculumTopicDef } | null}
 */
export function findTopicPlacement(subjectKey, gradeNum, normalizedKey) {
  const entry = getGradeEntry(subjectKey, gradeNum);
  if (!entry) return null;
  const order = ["notExpectedYet", "enrichmentTopics", "allowedTopics", "coreTopics"];
  for (const bucket of order) {
    const arr = entry[bucket];
    const hit = matchTopicDef(arr, normalizedKey);
    if (hit) return { bucket, def: hit };
  }
  return null;
}

function emptyGrade(g, extraNote = "") {
  return {
    coreTopics: [],
    allowedTopics: [],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]}: ${extraNote}`,
    confidence: /** @type {MapConfidence} */ ("low"),
  };
}

// ---------- Math ----------
function mathGrade(g) {
  /** @type {GradeCurriculumEntry} */
  const base = {
    coreTopics: [],
    allowedTopics: [],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]} - מתמטיקה: מיפוי לפי מיתרים (מספרים, פעולות, מילולי, שברים וכו׳). יש לאמת מול תוכנית האח״ח.`,
    confidence: "medium",
  };

  const NS = td(
    "math.number_sense",
    "תפיסה מספרית וחישוב מנטלי",
    "core",
    "medium",
    anchored(CURRICULUM_SOURCE_REF_PRESETS.internal_conservative, CURRICULUM_SOURCE_REF_PRESETS.rama_general)
  );
  const AS = td("math.addition_subtraction", "חיבור וחיסור", "core");
  const MD = td("math.multiplication_division", "כפל וחילוק", "core");
  const WP = td("math.word_problems", "שאלות מילוליות", "core");
  const FR = td("math.fractions", "שברים", "core");
  const DEC = td("math.decimals", "עשרוניים", "core");
  const PCT = td("math.percentages", "אחוזים", "allowed");
  const PAT = td("math.patterns_sequences", "דפוסים וסדרות", "allowed");
  const DIV = td("math.divisibility_factors", "התחלקות, כפולות וגורמים", "allowed");
  const EQ = td("math.equations_and_expressions", "משוואות וביטויים", "allowed");
  const EST = td("math.estimation_rounding", "אומדן ועיגול", "allowed");
  const MIX = td("math.mixed_operations", "תרגילים מעורבים", "allowed");
  const GEOX = td(
    "math.geometry_context",
    "קשרים גיאומטריים בהקשר חישובי",
    "allowed",
    "low"
  );
  const DATA = td("math.data_and_charts", "נתונים ותרשימים", "enrichment");
  const RS = td("math.powers_and_scaling", "חזקות והגדלה", "allowed");
  const RAT = td("math.ratio_and_scale", "יחס, קנה מידה ופרופורציה", "allowed");

  if (g === 1) {
    base.coreTopics = [NS, AS, MD, WP, EQ];
    base.allowedTopics = [MIX, GEOX];
    base.enrichmentTopics = [DATA];
    base.notExpectedYet = [FR, DEC, PCT, RAT, DIV];
  } else if (g === 2) {
    base.coreTopics = [NS, AS, MD, WP, FR, MIX];
    base.allowedTopics = [DIV, EQ, PAT, GEOX];
    base.enrichmentTopics = [DATA];
    base.notExpectedYet = [PCT, DEC, RAT];
  } else if (g === 3) {
    base.coreTopics = [NS, AS, MD, FR, DEC, EQ, WP, PAT];
    base.allowedTopics = [DIV, MIX, EST];
    base.enrichmentTopics = [DATA, GEOX];
    base.notExpectedYet = [PCT, RAT];
  } else if (g === 4) {
    base.coreTopics = [NS, AS, MD, FR, DEC, DIV, EQ, WP, MIX];
    base.allowedTopics = [PAT, EST, RS, GEOX, DATA];
    base.enrichmentTopics = [];
    base.notExpectedYet = [PCT, RAT];
  } else if (g === 5) {
    base.coreTopics = [NS, AS, MD, FR, DEC, PCT, WP, MIX];
    base.allowedTopics = [DIV, EQ, PAT, EST, RAT, GEOX, DATA];
    base.enrichmentTopics = [];
    base.notExpectedYet = [];
  } else {
    base.coreTopics = [NS, AS, MD, FR, DEC, PCT, WP, MIX, RAT];
    base.allowedTopics = [DIV, EQ, PAT, EST, RS, GEOX, DATA];
    base.enrichmentTopics = [];
    base.notExpectedYet = [];
  }

  return base;
}

// ---------- Geometry ----------
function geometryGrade(g) {
  const SH = td(
    "geometry.shape_recognition_plane_figures",
    "הכרת צורות ומצולעים במישור",
    "core",
    "medium",
    anchored(CURRICULUM_SOURCE_REF_PRESETS.geometry_shapes_intro)
  );
  const SP = td(
    "geometry.parallel_perpendicular_spatial",
    "מקבילים, מאונכים ומיקום במרחב",
    "core"
  );
  const AN = td("geometry.angles", "זוויות", "core");
  const PR = td("geometry.perimeter", "היקף", "core");
  const AR = td("geometry.area", "שטח", "core");
  const VOL = td("geometry.volume", "נפח", "core");
  const SOL = td("geometry.solids_3d", "גופים תלת מימדיים", "allowed");
  const TR = td("geometry.transformations_symmetry", "טרנספורמציות וסימטריה", "allowed");
  const TRI = td("geometry.triangles", "משולשים", "allowed");
  const QUAD = td("geometry.polygons_quadrilaterals", "מרובעים ומצולעים", "allowed");
  const CIR = td("geometry.circle_basic", "מעגל ועיגול", "allowed");
  const PY = td("geometry.pythagoras_right_triangles", "משפט פיתגורס", "allowed");
  const MIX = td("geometry.mixed_review", "ערבוב נושאי גאומטריה", "allowed");
  const TIL = td("geometry.tiling_covering", "ריצוף וכיסוי", "enrichment");
  const DIAG = td("geometry.diagonals_properties", "אלכסונים ותכונות צורה", "allowed");
  const HEIGHT = td("geometry.heights_area_links", "גבהים וקשר לשטח", "allowed");

  /** @type {GradeCurriculumEntry} */
  const base = {
    coreTopics: [],
    allowedTopics: [],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]} - גאומטריה: נושאים מופרדים (צורות, זוויות, שטח...).`,
    confidence: "medium",
  };

  if (g === 1) {
    base.coreTopics = [SH, TR];
    base.allowedTopics = [SP, AR, SOL];
    base.enrichmentTopics = [AN, DIAG];
    base.notExpectedYet = [PY, VOL, CIR];
  } else if (g === 2) {
    base.coreTopics = [AR, SOL, TR];
    base.allowedTopics = [SH, PR, SP, AN, VOL];
    base.notExpectedYet = [PY];
  } else if (g === 3) {
    base.coreTopics = [AN, SP, TRI, QUAD, AR, PR, TR];
    base.allowedTopics = [SH, DIAG, HEIGHT, SOL];
  } else if (g === 4) {
    base.coreTopics = [SH, DIAG, TR, AR, PR, VOL];
    base.allowedTopics = [QUAD, TRI, CIR, HEIGHT, SP, SOL, TIL, AN];
  } else if (g === 5) {
    base.coreTopics = [AN, SP, QUAD, DIAG, HEIGHT, TR, TIL, AR, PR, VOL, MIX];
    base.allowedTopics = [SOL, TRI];
  } else {
    base.coreTopics = [SOL, CIR, VOL, AR, PR, AN, MIX];
    base.allowedTopics = [PY, TRI, QUAD, HEIGHT, SP, TR, TIL];
  }

  return base;
}

// ---------- Hebrew ----------
function hebrewGrade(g) {
  const DEC = td("hebrew.decoding_reading_fluency", "קריאה והתפתחות קריאה", "core");
  const RC = td("hebrew.reading_comprehension", "הבנת הנקרא", "core");
  const LOC = td("hebrew.locating_information", "איתור מידע בטקסט", "allowed");
  const INF = td("hebrew.inference", "היקש והסקת מסקנות", "allowed");
  const SEQ = td("hebrew.sequence_order", "סדר ורצף", "allowed");
  const VOC = td("hebrew.vocabulary", "אוצר מילים", "core");
  const GR = td("hebrew.grammar_language_knowledge", "דקדוק וידיעת השפה", "core");
  const WR = td("hebrew.writing", "כתיבה", "allowed");
  const OR = td("hebrew.oral_expression", "דיבור והצגה בעל פה", "allowed");
  const MAIN = td("hebrew.main_idea", "רעיון מרכזי", "allowed");
  const CON = td("hebrew.connectors_cohesion", "מילות קישור ולכידות", "allowed");

  /** @type {GradeCurriculumEntry} */
  const base = {
    coreTopics: [],
    allowedTopics: [],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]} - עברית לפי מיומנויות יסוד.`,
    confidence: "medium",
  };

  if (g <= 2) {
    base.coreTopics = [DEC, VOC, GR];
    base.allowedTopics = [RC, LOC, WR];
    base.enrichmentTopics = [OR, SEQ];
  } else if (g <= 4) {
    base.coreTopics = [DEC, RC, VOC, GR];
    base.allowedTopics = [LOC, WR, MAIN, INF, SEQ, CON];
    base.enrichmentTopics = [OR];
  } else {
    base.coreTopics = [RC, INF, VOC, GR, WR];
    base.allowedTopics = [DEC, LOC, MAIN, SEQ, CON, OR];
  }

  return base;
}

// ---------- English (grammar not assumed core for g1–2) ----------
function englishGrade(g) {
  const EXP = td(
    "english.exposure_oral_listening",
    "חשיפה ראשונית: האזנה ושיח בסיסי",
    "core",
    "medium",
    anchored(CURRICULUM_SOURCE_REF_PRESETS.english_exposure_framework)
  );
  const VOC = td(
    "english.vocabulary_translation",
    "אוצר מילים (כולל תרגום ומילולי)",
    "core",
    "medium"
  );
  const GR = td("english.grammar", "דקדוק מובנה (בריכות grammar)", "allowed", "medium");
  const SENT = td(
    "english.sentence_writing_patterns",
    "משפטים ודפוסי ניסוח",
    "allowed",
    "medium"
  );
  const FORM_RC = td(
    "english.formal_reading_comprehension_literacy",
    "הבנת הנקרא פורמלית ברמת ספרות",
    "not_yet",
    "low"
  );

  /** @type {GradeCurriculumEntry} */
  const base = {
    coreTopics: [],
    allowedTopics: [],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]} - אנגלית: מופרד חשיפה / אוצר מילים / דקדוק / משפטים. גלי גיל-לא להניח ליבה זהה.`,
    confidence: "medium",
  };

  if (g <= 2) {
    base.coreTopics = [EXP, VOC];
    base.enrichmentTopics = [GR, SENT];
    base.notExpectedYet = [FORM_RC];
  } else if (g <= 4) {
    base.coreTopics = [VOC, GR];
    base.allowedTopics = [SENT];
    base.enrichmentTopics = [EXP];
  } else {
    base.coreTopics = [VOC, GR, SENT];
    base.allowedTopics = [EXP];
  }

  return base;
}

// ---------- Science ----------
function scienceGrade(g) {
  const LIFE = td("science.life_science_body", "מדעי החיים - גוף האדם", "core");
  const AN = td("science.life_science_animals", "מדעי החיים - בעלי חיים", "core");
  const PL = td("science.life_science_plants", "מדעי החיים - צמחים", "core");
  const ECO = td("science.life_science_ecosystems", "מערכות אקולוגיות", "allowed");
  const MAT = td("science.materials_matter", "חומרים וחומר", "core");
  const EN = td("science.energy", "אנרגיה", "allowed");
  const ES = td("science.earth_space_environment", "כדור הארץ, סביבה וחלל", "allowed");
  const INQ = td("science.scientific_inquiry", "חקירה מדעית וניסויים", "allowed");
  const TECH = td("science.technology_applications", "טכנולוגיה ויישומים", "enrichment");

  /** @type {GradeCurriculumEntry} */
  const base = {
    coreTopics: [],
    allowedTopics: [],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]} - מדעים לפי תחומים עיקריים.`,
    confidence: "medium",
  };

  if (g <= 2) {
    base.coreTopics = [LIFE, AN, PL, MAT];
    base.allowedTopics = [EN, ES];
    base.enrichmentTopics = [INQ, TECH, ECO];
  } else if (g <= 4) {
    base.coreTopics = [LIFE, AN, PL, MAT, ES, EN];
    base.allowedTopics = [ECO, INQ];
    base.enrichmentTopics = [TECH];
  } else {
    base.coreTopics = [MAT, EN, ES, ECO, INQ];
    base.allowedTopics = [LIFE, AN, PL, TECH];
  }

  return base;
}

// ---------- Moledet / geography (advisory low) ----------
function geographyGrade(g) {
  const BANK = td(
    "moledet.bank",
    "נושאי בנק מולדת/גיאוגרפיה (מפתחות גולמיים תחת moledet.bank.*)",
    "allowed",
    "low"
  );
  return {
    coreTopics: [],
    allowedTopics: [BANK],
    enrichmentTopics: [],
    notExpectedYet: [],
    sourceNotes: `כיתה ${G_HE[g]} - מולדת/גיאוגרפיה: המיפוי השלבי נשאר ברמת אמון נמוכה עד סימון פדגוגי ייעודי.`,
    confidence: "low",
  };
}

function buildSubjectGrades(builder) {
  return {
    grade_1: builder(1),
    grade_2: builder(2),
    grade_3: builder(3),
    grade_4: builder(4),
    grade_5: builder(5),
    grade_6: builder(6),
  };
}

/** @type {Record<string, object>} */
export const ISRAELI_PRIMARY_CURRICULUM_MAP = {
  math: {
    ...buildSubjectGrades(mathGrade),
    repoHints: {
      note: "Strands align with normalized math.* keys from curriculum-topic-normalizer.js",
    },
  },
  geometry: {
    ...buildSubjectGrades(geometryGrade),
    repoHints: {
      note: "Separated geometry strands - do not collapse to one topic.",
    },
  },
  hebrew: {
    ...buildSubjectGrades(hebrewGrade),
    repoHints: { note: "Skill-based Hebrew mapping." },
  },
  english: {
    ...buildSubjectGrades(englishGrade),
    repoHints: {
      note: "Grades 1–2: grammar not assumed core; exposure/enrichment separation.",
    },
  },
  science: {
    ...buildSubjectGrades(scienceGrade),
    repoHints: { note: "Domain-based science mapping." },
  },
  "moledet-geography": {
    ...buildSubjectGrades(geographyGrade),
    repoHints: {
      note: "Inventory retained; curriculum placement deferred - confidence low.",
    },
  },
};

export const CURRICULUM_MAP_META = {
  version: 3,
  phase: 3,
  scope: "Israel elementary (grades 1–6) - conservative structured mapping + advisory source anchors",
  defaultConfidence: "medium",
  disclaimer:
    "This map does not encode an official Ministry of Education syllabus line-by-line. " +
    "Uncertain matches must be reviewed by a human pedagogy owner.",
};

const GRADE_KEYS = ["grade_1", "grade_2", "grade_3", "grade_4", "grade_5", "grade_6"];

export function gradeNumToKey(gradeNum) {
  if (gradeNum < 1 || gradeNum > 6) return null;
  return GRADE_KEYS[gradeNum - 1];
}

export function getGradeEntry(subjectKey, gradeNum) {
  const sub = ISRAELI_PRIMARY_CURRICULUM_MAP[subjectKey];
  if (!sub) return null;
  const gk = gradeNumToKey(gradeNum);
  if (!gk) return null;
  const entry = sub[gk];
  return entry && typeof entry === "object" && Array.isArray(entry.coreTopics) ? entry : null;
}

/** Collect every topic key declared anywhere in a subject map (all grades). */
export function collectCatalogKeysForSubject(subjectKey) {
  const sub = ISRAELI_PRIMARY_CURRICULUM_MAP[subjectKey];
  if (!sub) return new Set();
  const keys = new Set();
  for (const gk of GRADE_KEYS) {
    const slot = sub[gk];
    if (!slot || !Array.isArray(slot.coreTopics)) continue;
    for (const bucket of ["coreTopics", "allowedTopics", "enrichmentTopics", "notExpectedYet"]) {
      for (const def of slot[bucket] || []) {
        if (def?.key) keys.add(def.key);
      }
    }
  }
  return keys;
}
