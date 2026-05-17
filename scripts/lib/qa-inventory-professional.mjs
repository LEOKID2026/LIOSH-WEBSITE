/**
 * Professional launch inventory thresholds and classification (no lowered bars).
 */
export const PRO_LEVEL_MIN = { easy: 50, medium: 40, hard: 30 };
export const PRO_TOPIC_MIN = 100;
export const PRO_TOPIC_IDEAL = 120;
export const PRO_GENERATED_MIN = 100;
export const PRO_GENERATED_IDEAL = 150;

export const INVENTORY_SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
];

export const INVENTORY_LEVELS = ["easy", "medium", "hard"];
export const INVENTORY_GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** High-use / launch-critical topic keys (subject|grade|topic). */
export const CORE_TOPIC_KEYS = new Set([
  "hebrew|g3|reading",
  "science|g3|body",
  "science|g3|animals",
  "science|g4|body",
  "math|g1|addition",
  "math|g2|addition",
  "math|g3|multiplication",
  "math|g3|order_of_operations",
  "math|g4|fractions",
  "english|g3|grammar",
  "english|g2|grammar",
  "geometry|g3|area",
  "geometry|g4|perimeter",
  "moledet_geography|g3|homeland",
  "moledet_geography|g4|community",
]);

const CORE_EARLY_TOPICS = new Set([
  "reading",
  "grammar",
  "addition",
  "subtraction",
  "multiplication",
  "comprehension",
  "body",
  "animals",
]);

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 */
export function isCoreCell(subject, grade, topic) {
  const key = `${subject}|${grade}|${topic}`;
  if (CORE_TOPIC_KEYS.has(key)) return true;
  if (["g1", "g2", "g3"].includes(grade) && CORE_EARLY_TOPICS.has(topic)) return true;
  return false;
}

/**
 * @param {string} level
 */
export function professionalMinimumForLevel(level) {
  return PRO_LEVEL_MIN[level] ?? 40;
}

/**
 * @param {object} row
 */
export function classifyProfessionalCell(row) {
  if (row.curriculumStatus === "NOT_APPLICABLE") {
    return {
      status: "NOT_APPLICABLE",
      launchBlocking: false,
      notes: row.notes || "not in grade curriculum",
    };
  }

  const count = row.uniqueUsableQuestionCount ?? 0;
  const min = row.professionalMinimumRequired ?? 40;
  const core = isCoreCell(row.subject, row.grade, row.topic);
  const topicTotal = row.topicTotalUniqueCount ?? count;
  const src = row.inventorySource || "unknown";

  if (count === 0) {
    return {
      status: "CRITICAL_BLOCKING",
      launchBlocking: true,
      notes: row.probeErrors
        ? `zero usable (${row.probeErrors} generation errors)`
        : "zero usable questions in live inventory",
    };
  }

  if (src === "generated") {
    if (count >= PRO_GENERATED_IDEAL) {
      return {
        status: "PROFESSIONAL_READY",
        launchBlocking: false,
        notes: `generated variety ${count} ≥ ideal ${PRO_GENERATED_IDEAL}`,
      };
    }
    if (count >= PRO_GENERATED_MIN) {
      return {
        status: "PROFESSIONAL_READY",
        launchBlocking: false,
        notes: `generated variety ${count} ≥ minimum ${PRO_GENERATED_MIN}`,
      };
    }
    return {
      status: "NEEDS_AUTHORING_BEFORE_LAUNCH",
      launchBlocking: core,
      notes: `procedural pool ${count} unique variants < generated minimum ${PRO_GENERATED_MIN} (ideal ${PRO_GENERATED_IDEAL})`,
    };
  }

  const levelReady = count >= min;
  const topicReady = topicTotal >= PRO_TOPIC_MIN;

  if (levelReady && topicReady) {
    return {
      status: "PROFESSIONAL_READY",
      launchBlocking: false,
      notes: `level ${count}≥${min}, topic union ${topicTotal}≥${PRO_TOPIC_MIN}`,
    };
  }

  if (levelReady && !topicReady) {
    return {
      status: "NEEDS_AUTHORING_BEFORE_LAUNCH",
      launchBlocking: core,
      notes: `level count OK (${count}≥${min}) but topic total ${topicTotal}<${PRO_TOPIC_MIN}`,
    };
  }

  if (!levelReady && topicReady && src === "bank_grade_scoped") {
    return {
      status: "NEEDS_AUTHORING_BEFORE_LAUNCH",
      launchBlocking: core,
      notes: `English/shared bank: topic ${topicTotal}≥${PRO_TOPIC_MIN} but UI level row shares pool (${count}<${min} per-level gate)`,
    };
  }

  if (!core && count >= Math.ceil(min * 0.35) && count < min) {
    return {
      status: "LAUNCH_ACCEPTABLE_THIN",
      launchBlocking: false,
      notes: `non-core thin inventory ${count}/${min} — requires explicit owner exception to ship`,
    };
  }

  return {
    status: "NEEDS_AUTHORING_BEFORE_LAUNCH",
    launchBlocking: core,
    notes: `${count} usable < professional minimum ${min} for ${row.level}`,
  };
}

/**
 * @param {object[]} rows
 */
export function decideLaunchFromMatrix(rows) {
  const active = rows.filter((r) => r.curriculumStatus === "VALID");
  const counts = {
    PROFESSIONAL_READY: 0,
    LAUNCH_ACCEPTABLE_THIN: 0,
    NEEDS_AUTHORING_BEFORE_LAUNCH: 0,
    CRITICAL_BLOCKING: 0,
    NOT_APPLICABLE: 0,
  };
  for (const r of rows) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  const critical = counts.CRITICAL_BLOCKING || 0;
  const needsCore = active.filter(
    (r) =>
      r.status === "NEEDS_AUTHORING_BEFORE_LAUNCH" && isCoreCell(r.subject, r.grade, r.topic)
  );
  const needsAny = active.filter((r) => r.status === "NEEDS_AUTHORING_BEFORE_LAUNCH");
  const thin = active.filter((r) => r.status === "LAUNCH_ACCEPTABLE_THIN");
  const notReadyCore = active.filter(
    (r) =>
      isCoreCell(r.subject, r.grade, r.topic) &&
      r.status !== "PROFESSIONAL_READY" &&
      r.status !== "NOT_APPLICABLE"
  );

  let decision = "READY_FOR_LAUNCH";
  const reasons = [];

  if (critical > 0) {
    decision = "NOT_READY_BLOCKERS_REMAIN";
    reasons.push(`${critical} CRITICAL_BLOCKING cells`);
  } else if (needsCore.length > 0) {
    decision = "NOT_READY_INVENTORY_INSUFFICIENT";
    reasons.push(`${needsCore.length} core cells NEEDS_AUTHORING_BEFORE_LAUNCH`);
  } else if (notReadyCore.length > 0) {
    decision = "NOT_READY_INVENTORY_INSUFFICIENT";
    reasons.push(`${notReadyCore.length} core cells below PROFESSIONAL_READY`);
  } else if (needsAny.length > 0) {
    decision = "NOT_READY_INVENTORY_INSUFFICIENT";
    reasons.push(`${needsAny.length} active cells NEEDS_AUTHORING_BEFORE_LAUNCH`);
  } else if (
    active.some((r) => r.status !== "PROFESSIONAL_READY" && r.status !== "LAUNCH_ACCEPTABLE_THIN")
  ) {
    decision = "NOT_READY_INVENTORY_INSUFFICIENT";
    reasons.push("not all active cells PROFESSIONAL_READY or documented thin");
  }

  return {
    decision,
    reasons,
    counts,
    activeSelectableCells: active.length,
    thinCells: thin.map((r) => ({
      subject: r.subject,
      grade: r.grade,
      topic: r.topic,
      level: r.level,
      count: r.uniqueUsableQuestionCount,
      notes: r.notes,
    })),
    coreNeedsAuthoring: needsCore.map((r) => ({
      subject: r.subject,
      grade: r.grade,
      topic: r.topic,
      level: r.level,
      count: r.uniqueUsableQuestionCount,
      minimum: r.professionalMinimumRequired,
      notes: r.notes,
    })),
  };
}
