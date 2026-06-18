/**
 * Phase D2 — Daily plan generator (pure function).
 *
 * Inputs:
 *   - state    : the loaded longitudinal state (from longitudinal-state.mjs)
 *   - date     : 'YYYY-MM-DD' string (Asia/Jerusalem-resolved by config.mjs)
 *   - mode     : 'realtime' | 'fast' (only affects intendedMinutes scaling
 *                used by the realtime-pacer in D2.5; the planner itself is
 *                mode-agnostic so dry-run and full-run produce the same
 *                plan for the same (state, date) pair)
 *   - personas : the AAA1..AAA12 persona table (default = imported PERSONAS)
 *
 * Output:
 *   {
 *     date, mode, generatedAt,
 *     students: { [label]: PlanStudent },
 *     summary: { studied, skipped, totalSessions, totalMinutes,
 *                subjectCounts, profileCounts }
 *   }
 *
 *   PlanStudent = {
 *     studied: boolean,
 *     skipReason: string | null,
 *     grade, personaKind, defaultProfile,
 *     intendedMinutes,
 *     sessions: [{ subject, profile, topic, grade, questionCount,
 *                  intendedMinutes, seed, weaknessSubject }, ...]
 *   }
 *
 * Determinism contract:
 *   For a given (state, date) the function MUST produce an identical plan
 *   on every call. This is what makes `--dry-run` meaningful: you can
 *   inspect tonight's plan, and the actual nightly run will execute that
 *   same plan (within the bounds of UI-side variability inside subject
 *   drivers). The seed for each per-student / per-session decision is
 *   derived from a stable FNV-1a hash of (date, label, ...key parts).
 *
 * Hard rules:
 *   - Never schedules a subject the product doesn't support at that grade
 *     (currently: moledet-geography requires grade >= 3).
 *   - Never schedules a session shorter than 3 minutes / fewer than 4
 *     questions (the subject drivers can't reliably produce useful
 *     evidence below those floors).
 *   - Caps the day's minutes by persona.dailyMinutesAbsoluteCap AND the
 *     global owner budget (VIRTUAL_STUDENT_MAX_PLANNED_MINUTES_PER_DAY,
 *     default 35). Outlier trims are logged on the PlanStudent.
 *   - Forces 'targeted' profile on weakness subjects regardless of the
 *     evolving defaultProfile in state.
 */
import { makeRng } from "./answer-profiles.mjs";
import {
  resolveMaxStudentPlannedMinutesPerDay,
  resolveMaxSessionsPerStudentPerDay,
  computeParallelDayEstimateMinutes,
} from "./planner-budget.mjs";
import {
  PERSONAS,
  SUBJECTS,
  defaultTopicForSubject,
  isSubjectAvailableForGrade,
} from "../scenarios/student-personas.mjs";

const FNV1A_OFFSET = 2166136261;
const FNV1A_PRIME = 16777619;

function fnv1a32(str) {
  let h = FNV1A_OFFSET >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, FNV1A_PRIME) >>> 0;
  }
  return h >>> 0;
}

function dateSeed(...parts) {
  return fnv1a32(parts.map((p) => String(p ?? "")).join("|"));
}

function rngInRange(rng, lo, hi) {
  const a = Number(lo) || 0;
  const b = Math.max(a, Number(hi) || a);
  return Math.round(a + rng() * (b - a));
}

function clampInt(n, lo, hi) {
  const num = Math.round(Number(n));
  if (!Number.isFinite(num)) return lo;
  return Math.max(lo, Math.min(hi, num));
}

/**
 * Pick how many sessions this student does today. Persona may allow up to 3
 * (AAA11), but owner budget caps at resolveMaxSessionsPerStudentPerDay() (2).
 */
function pickNumSessions(persona, rng) {
  const personaMax = clampInt(persona.maxSessions ?? 2, 1, 3);
  const ownerMax = resolveMaxSessionsPerStudentPerDay();
  const max = Math.min(personaMax, ownerMax);
  if (max === 1) return 1;
  if (max === 2) return rng() < 0.55 ? 1 : 2;
  // max === 3: 30% one, 50% two, 20% three.
  const r = rng();
  if (r < 0.3) return 1;
  if (r < 0.8) return 2;
  return 3;
}

/**
 * Choose `count` distinct subjects for the day.
 *
 * Weighting:
 *   - 60% chance the first slot is a weakness subject (one of
 *     persona.weaknesses keys, if any).
 *   - 40% chance the first slot is a strength subject (one of
 *     persona.strengths, if any) when the weakness roll didn't fire.
 *   - Remaining slots: uniform random from the remaining subject pool.
 *   - Subjects unavailable for the persona's grade (e.g. moledet-geography
 *     for grades 1-2) are filtered out before any roll.
 */
function chooseSubjects({ persona, rng, count }) {
  const available = SUBJECTS.filter((s) =>
    isSubjectAvailableForGrade(s, persona.grade)
  );
  const weakSubjects = Object.keys(persona.weaknesses || {}).filter((s) =>
    available.includes(s)
  );
  const strengthSubjects = (persona.strengths || []).filter((s) =>
    available.includes(s)
  );

  const subjects = [];
  if (weakSubjects.length > 0 && rng() < 0.6) {
    subjects.push(weakSubjects[Math.floor(rng() * weakSubjects.length)]);
  } else if (strengthSubjects.length > 0 && rng() < 0.4) {
    subjects.push(
      strengthSubjects[Math.floor(rng() * strengthSubjects.length)]
    );
  }

  const pool = available.filter((s) => !subjects.includes(s));
  while (subjects.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    subjects.push(pool.splice(idx, 1)[0]);
  }
  return subjects;
}

/**
 * Resolve the active default profile: honour the evolved
 * state.students[label].defaultProfile if present, else fall back to the
 * persona's defaultProfile, else 'average'.
 */
function resolveDefaultProfile({ persona, state, label }) {
  const fromState = state?.students?.[label]?.defaultProfile;
  if (fromState) return fromState;
  if (persona?.defaultProfile) return persona.defaultProfile;
  return "average";
}

/**
 * Resolve the per-session profile. Weakness subjects always become
 * 'targeted'. 'inconsistent' personas (AAA8) flip per-day between
 * 'strong' and 'weak' regardless of subject. Otherwise we use
 * resolveDefaultProfile().
 */
function pickSessionProfile({ persona, state, label, subject, dayRng }) {
  if (persona?.weaknesses && persona.weaknesses[subject]) {
    return "targeted";
  }
  if (persona?.evolution === "inconsistent") {
    return dayRng() < 0.5 ? "weak" : "strong";
  }
  return resolveDefaultProfile({ persona, state, label });
}

/**
 * Generate the full daily plan for all 12 personas.
 */
export function generateDailyPlan({
  state,
  date,
  mode = "realtime",
  personas = PERSONAS,
}) {
  if (!state || typeof state !== "object") {
    throw new Error("generateDailyPlan: state is required");
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `generateDailyPlan: date must be YYYY-MM-DD (got: ${String(date)})`
    );
  }

  const planStudents = {};
  for (const [label, persona] of Object.entries(personas)) {
    planStudents[label] = planForOneStudent({
      label,
      persona,
      state,
      date,
      mode,
    });
  }

  const summary = summarizePlan(planStudents);
  const estimate = computeParallelDayEstimateMinutes(
    { students: planStudents },
    { mode }
  );
  summary.parallelDayEstimateMinutes = estimate.parallelDayEstimateMinutes;
  summary.budgetOutlierCount = Object.values(planStudents).filter(
    (e) => e.budgetTrimmed
  ).length;

  return {
    date,
    mode,
    generatedAt: new Date().toISOString(),
    students: planStudents,
    summary,
  };
}

function planForOneStudent({ label, persona, state, date, mode }) {
  const dayRng = makeRng(dateSeed(date, label));
  const studied = dayRng() < (Number(persona.consistency) || 0);
  const grade = persona.grade;
  const personaKind = persona.kind;
  const defaultProfile = resolveDefaultProfile({ persona, state, label });

  if (!studied) {
    return {
      studied: false,
      skipReason:
        `attendance-roll: P(study)=${persona.consistency} did not draw ` +
        `a study day for ${date}`,
      grade,
      personaKind,
      defaultProfile,
      intendedMinutes: 0,
      sessions: [],
    };
  }

  const minMinutes = Number(persona.dailyMinutesRange?.[0] ?? 10);
  const maxMinutes = Number(persona.dailyMinutesRange?.[1] ?? 30);
  const sampledMinutes = rngInRange(dayRng, minMinutes, maxMinutes);
  const personaCap = Number(persona.dailyMinutesAbsoluteCap || 120);
  const globalMax = resolveMaxStudentPlannedMinutesPerDay();
  const beforeBudget = Math.min(sampledMinutes, personaCap);
  let intendedMinutes = Math.min(beforeBudget, globalMax);
  let budgetNote = null;
  let budgetTrimmed = false;

  if (beforeBudget > globalMax) {
    budgetTrimmed = true;
    budgetNote =
      `planner-budget outlier: ${label} sampled=${beforeBudget}min ` +
      `trimmed to global cap ${globalMax}min (persona exceeded owner daily budget)`;
  }

  if (intendedMinutes < 5) {
    return {
      studied: false,
      skipReason: `study-roll-too-short: sampled ${intendedMinutes} min < 5 min floor`,
      grade,
      personaKind,
      defaultProfile,
      intendedMinutes: 0,
      sessions: [],
    };
  }

  let numSessions = pickNumSessions(persona, dayRng);
  const numSessionsRequested = numSessions;
  const maxSessionsCap = resolveMaxSessionsPerStudentPerDay();
  if (numSessions > maxSessionsCap) {
    budgetTrimmed = true;
    const sessionCapNote =
      `planner-budget: ${label} reduced sessions ${numSessions}→${maxSessionsCap} ` +
      `(owner max sessions/day cap)`;
    budgetNote = budgetNote ? `${budgetNote}; ${sessionCapNote}` : sessionCapNote;
    numSessions = maxSessionsCap;
  }
  const numSessionsBefore = numSessions;
  while (
    numSessions > 1 &&
    Math.floor(intendedMinutes / numSessions) < 3
  ) {
    numSessions -= 1;
    if (!budgetNote) {
      budgetTrimmed = true;
      budgetNote =
        `planner-budget: ${label} reduced sessions ${numSessionsBefore}→${numSessions} ` +
        `to keep >=3min/session at ${intendedMinutes}min/day`;
    }
  }

  const subjects = chooseSubjects({ persona, rng: dayRng, count: numSessions });

  if (subjects.length === 0) {
    return {
      studied: false,
      skipReason: "no-available-subjects: persona+grade left an empty subject pool",
      grade,
      personaKind,
      defaultProfile,
      intendedMinutes: 0,
      sessions: [],
    };
  }

  const minutesPerSession = Math.max(
    3,
    Math.floor(intendedMinutes / subjects.length)
  );
  const sessions = subjects.map((subject) => {
    const profile = pickSessionProfile({
      persona,
      state,
      label,
      subject,
      dayRng,
    });
    const topic = defaultTopicForSubject(subject, grade);
    const questionCount = clampInt(minutesPerSession / 1.5, 4, 16);
    return {
      subject,
      profile,
      topic,
      grade,
      questionCount,
      intendedMinutes: minutesPerSession,
      seed: dateSeed(date, label, subject) >>> 0,
      weaknessSubject: Boolean(persona.weaknesses && persona.weaknesses[subject]),
    };
  });

  const sessionMinutesSum = sessions.reduce(
    (acc, s) => acc + (Number(s.intendedMinutes) || 0),
    0
  );

  return {
    studied: true,
    skipReason: null,
    grade,
    personaKind,
    defaultProfile,
    intendedMinutes: sessionMinutesSum,
    budgetNote,
    budgetTrimmed,
    sessions,
  };
}

function summarizePlan(planStudents) {
  let studied = 0;
  let skipped = 0;
  let totalSessions = 0;
  let totalMinutes = 0;
  let maxStudentPlannedMinutes = 0;
  let maxSessionsPerStudent = 0;
  const perStudentPlannedMinutes = {};
  const subjectCounts = {};
  const profileCounts = {};
  for (const [label, entry] of Object.entries(planStudents)) {
    if (entry.studied) {
      studied += 1;
      totalSessions += entry.sessions.length;
      totalMinutes += entry.intendedMinutes;
      perStudentPlannedMinutes[label] = entry.intendedMinutes;
      maxSessionsPerStudent = Math.max(
        maxSessionsPerStudent,
        entry.sessions.length
      );
      maxStudentPlannedMinutes = Math.max(
        maxStudentPlannedMinutes,
        Number(entry.intendedMinutes) || 0
      );
      for (const s of entry.sessions) {
        subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1;
        profileCounts[s.profile] = (profileCounts[s.profile] || 0) + 1;
      }
    } else {
      skipped += 1;
    }
  }
  return {
    studied,
    skipped,
    totalSessions,
    totalMinutes,
    maxStudentPlannedMinutes,
    maxSessionsPerStudent,
    perStudentPlannedMinutes,
    subjectCounts,
    profileCounts,
  };
}

/**
 * Render a one-screen Markdown summary of a plan. Used by the dry-run
 * artifact writer so the operator can eyeball tonight's plan.
 */
export function renderPlanMarkdown(plan, { stateMeta = {} } = {}) {
  const lines = [];
  lines.push(`# Daily plan — ${plan.date} (mode: ${plan.mode})`);
  lines.push("");
  lines.push(`- generatedAt: \`${plan.generatedAt}\``);
  lines.push(
    `- summary: studied=\`${plan.summary.studied}\` ` +
      `skipped=\`${plan.summary.skipped}\` ` +
      `totalSessions=\`${plan.summary.totalSessions}\` ` +
      `totalMinutes=\`${plan.summary.totalMinutes}\` (sum across students) ` +
      `maxStudentPlannedMinutes=\`${plan.summary.maxStudentPlannedMinutes}\` (parallel wall-clock driver)`
  );
  if (Object.keys(plan.summary.subjectCounts).length > 0) {
    lines.push(
      `- subjectCounts: \`${JSON.stringify(plan.summary.subjectCounts)}\``
    );
  }
  if (Object.keys(plan.summary.profileCounts).length > 0) {
    lines.push(
      `- profileCounts: \`${JSON.stringify(plan.summary.profileCounts)}\``
    );
  }
  if (stateMeta.fresh) {
    lines.push(
      `- state: **fresh** (no prior state.json found at \`${stateMeta.filePath}\`; this is the first nightly run for this state dir)`
    );
  } else if (stateMeta.filePath) {
    lines.push(
      `- state: loaded from \`${stateMeta.filePath}\` ` +
        `(lastRunDate=\`${stateMeta.lastRunDate || "(none)"}\` ` +
        `lastRunStatus=\`${stateMeta.lastRunStatus || "(none)"}\`)`
    );
  }
  lines.push("");
  lines.push("## Per-student");
  lines.push("");
  lines.push(
    "| student | grade | persona | studied | sessions | minutes | subjects | profiles |"
  );
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const [label, entry] of Object.entries(plan.students)) {
    if (!entry.studied) {
      lines.push(
        `| ${label} | ${entry.grade} | ${entry.personaKind} | no | 0 | 0 | — | — |`
      );
    } else {
      const subjectStr = entry.sessions.map((s) => s.subject).join(", ");
      const profileStr = entry.sessions
        .map((s) => `${s.profile}${s.weaknessSubject ? "*" : ""}`)
        .join(", ");
      lines.push(
        `| ${label} | ${entry.grade} | ${entry.personaKind} | yes | ` +
          `${entry.sessions.length} | ${entry.intendedMinutes} | ` +
          `${subjectStr} | ${profileStr} |`
      );
    }
  }
  lines.push("");
  lines.push("## Skip reasons");
  for (const [label, entry] of Object.entries(plan.students)) {
    if (!entry.studied) {
      lines.push(`- \`${label}\`: ${entry.skipReason}`);
    }
  }
  lines.push("");
  lines.push("## Per-session detail (studied only)");
  for (const [label, entry] of Object.entries(plan.students)) {
    if (!entry.studied) continue;
    lines.push("");
    lines.push(
      `### \`${label}\` — grade=${entry.grade} — ${entry.personaKind} — defaultProfile=\`${entry.defaultProfile}\` — intendedMinutes=${entry.intendedMinutes}`
    );
    for (let i = 0; i < entry.sessions.length; i++) {
      const s = entry.sessions[i];
      const flag = s.weaknessSubject ? " (weakness)" : "";
      lines.push(
        `- session ${i + 1}: subject=\`${s.subject}\`${flag} ` +
          `profile=\`${s.profile}\` topic=\`${s.topic}\` ` +
          `questionCount=\`${s.questionCount}\` ` +
          `intendedMinutes=\`${s.intendedMinutes}\``
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}
