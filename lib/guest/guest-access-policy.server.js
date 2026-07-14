import {
  GUEST_ACCOUNT_KIND,
  GUEST_DEFAULT_GRADE_LEVEL,
  GUEST_GAME_LOCK_MESSAGE_HE,
  GUEST_LOCK_MESSAGE_HE,
  GUEST_LOCKED_HOME_PANELS,
  GUEST_STATUS_ACTIVE,
  GUEST_STATUS_LINKED,
  GUEST_TOPIC_LOCK_MESSAGE_HE,
} from "./constants.js";
import { isGuestStudent, formatGuestDisplayNameHe } from "./guest-display.js";
import {
  loadGuestRuntimeConfig,
  loadGuestSettingsMap,
  parseGuestDefaults,
  parseGuestEconomy,
  parseGuestModeEnabled,
  parseGuestSurpriseBoxSettings,
} from "./guest-settings.server.js";
import {
  GAME_ACCESS_STATES,
} from "../games/game-catalog.constants.js";

export { loadGuestRuntimeConfig } from "./guest-settings.server.js";

function isMissingGuestTableError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("guest_") && (msg.includes("does not exist") || msg.includes("relation"));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadGuestGameAccessRows(supabase) {
  const { data, error } = await supabase
    .from("guest_game_access")
    .select("game_key, guest_playable, sort_priority")
    .order("sort_priority", { ascending: true });

  if (error) {
    if (isMissingGuestTableError(error)) return [];
    throw error;
  }
  return data || [];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadGuestLearningAccessRows(supabase) {
  const { data, error } = await supabase
    .from("guest_learning_access")
    .select("subject, topic, guest_playable, sort_priority")
    .order("sort_priority", { ascending: true });

  if (error) {
    if (isMissingGuestTableError(error)) return [];
    throw error;
  }
  return data || [];
}

/**
 * @param {Array<{ game_key: string, guest_playable?: boolean, sort_priority?: number }>} rows
 * @param {Array<object>} catalog
 * @param {number} gamesPerCategory
 */
export function resolveDefaultGuestPlayableGameKeys(rows, catalog, gamesPerCategory) {
  const limit = Number.isFinite(gamesPerCategory) && gamesPerCategory > 0 ? Math.min(gamesPerCategory, 20) : 2;

  const playable = new Map();
  for (const category of ["online", "offline", "solo", "educational"]) {
    const enabled = (catalog || [])
      .filter((r) => r.category === category && r.is_enabled === true)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    enabled.slice(0, limit).forEach((r) => {
      if (r.game_key) playable.set(r.game_key, true);
    });
  }

  for (const row of rows || []) {
    const gameKey = String(row?.game_key || "").trim();
    if (!gameKey) continue;
    if (row.guest_playable === true) {
      playable.set(gameKey, true);
    } else {
      playable.delete(gameKey);
    }
  }

  return playable;
}

/**
 * @param {Array<{ subject: string, topic: string, guest_playable?: boolean, sort_priority?: number }>} rows
 * @param {string} subject
 * @param {string[]} curriculumTopics
 * @param {number} topicsPerSubject
 */
export function resolveDefaultGuestPlayableTopics(rows, subject, curriculumTopics, topicsPerSubject) {
  const sub = String(subject || "").trim();
  const topics = Array.isArray(curriculumTopics) ? curriculumTopics : [];
  const explicitForSubject = (rows || []).filter((r) => String(r.subject || "").trim() === sub);

  if (explicitForSubject.length > 0) {
    const map = new Map();
    for (const row of explicitForSubject) {
      map.set(String(row.topic || "").trim(), row.guest_playable === true);
    }
    return map;
  }

  const map = new Map();
  topics.slice(0, topicsPerSubject).forEach((topic) => {
    map.set(String(topic || "").trim(), true);
  });
  return map;
}

/**
 * @param {{ account_kind?: string, accountKind?: string }} student
 */
export function isRegisteredStudent(student) {
  return !isGuestStudent(student);
}

/**
 * @param {{ account_kind?: string, guest_status?: string, guestStatus?: string }} student
 */
export function isActiveGuestStudent(student) {
  if (!isGuestStudent(student)) return false;
  const status = student?.guest_status ?? student?.guestStatus;
  return status === GUEST_STATUS_ACTIVE;
}

/**
 * @param {{ account_kind?: string, guest_status?: string, guestStatus?: string }} student
 */
export function isLinkedGuestStudent(student) {
  if (!isGuestStudent(student)) return false;
  const status = student?.guest_status ?? student?.guestStatus;
  return status === GUEST_STATUS_LINKED;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ account_kind?: string, accountKind?: string, leo_number?: string|null, guest_status?: string }} student
 */
export async function buildGuestPolicyPayload(supabase, student) {
  if (!isGuestStudent(student)) return null;

  const config = await loadGuestRuntimeConfig(supabase);
  return {
    accountKind: GUEST_ACCOUNT_KIND,
    guestStatus: student.guest_status ?? GUEST_STATUS_ACTIVE,
    leoNumber: student.leo_number ?? null,
    displayNameHe: formatGuestDisplayNameHe(student),
    defaultGradeLevel: GUEST_DEFAULT_GRADE_LEVEL,
    lockedHomePanels: [...GUEST_LOCKED_HOME_PANELS],
    lockMessageHe: GUEST_LOCK_MESSAGE_HE,
    gameLockMessageHe: GUEST_GAME_LOCK_MESSAGE_HE,
    topicLockMessageHe: GUEST_TOPIC_LOCK_MESSAGE_HE,
    economy: config.economy,
    defaults: config.defaults,
    surpriseBox: config.surpriseBox,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function loadStudentAccountKind(supabase, studentId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, account_kind, leo_number, guest_status, grade_level")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    if (String(error.message || "").includes("account_kind")) {
      const { data: fallback } = await supabase
        .from("students")
        .select("id, grade_level")
        .eq("id", studentId)
        .maybeSingle();
      return fallback ? { ...fallback, account_kind: "registered" } : null;
    }
    throw error;
  }
  return data;
}

/**
 * Apply guest lock on top of registered access resolution.
 * @param {{ state: string, category?: string|null, gameKey?: string|null, message?: string|null }} baseAccess
 * @param {object|null|undefined} catalogRow
 * @param {Map<string, boolean>} guestPlayableByKey
 */
export function applyGuestLockToGameAccess(baseAccess, catalogRow, guestPlayableByKey) {
  if (baseAccess.state !== GAME_ACCESS_STATES.ALLOWED || !catalogRow?.game_key) {
    return baseAccess;
  }

  if (guestPlayableByKey.get(catalogRow.game_key) === true) {
    return baseAccess;
  }

  return {
    state: GAME_ACCESS_STATES.GUEST_LOCKED,
    category: catalogRow.category,
    gameKey: catalogRow.game_key,
    message: GUEST_GAME_LOCK_MESSAGE_HE,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} subject
 * @param {string} topic
 * @param {string[]} curriculumTopics
 */
export async function assertGuestLearningTopicAllowed(supabase, studentId, subject, topic) {
  const student = await loadStudentAccountKind(supabase, studentId);
  if (!student || !isGuestStudent(student)) {
    return { ok: true, guest: false };
  }

  const config = await loadGuestRuntimeConfig(supabase);
  const rows = await loadGuestLearningAccessRows(supabase);
  const playableMap = resolveDefaultGuestPlayableTopics(
    rows,
    subject,
    curriculumTopics,
    config.defaults.topicsPerSubject
  );
  const key = String(topic || "").trim();
  if (playableMap.get(key) === true) {
    return { ok: true, guest: true };
  }

  return {
    ok: false,
    guest: true,
    status: 403,
    code: "guest_topic_locked",
    message: GUEST_TOPIC_LOCK_MESSAGE_HE,
  };
}

/**
 * @param {{ account_kind?: string }} student
 */
export function assertNotGuestForReports(student) {
  if (isGuestStudent(student)) {
    return {
      ok: false,
      status: 403,
      code: "guest_not_eligible",
      message: "לא זמין לאורח",
    };
  }
  return { ok: true };
}

export {
  parseGuestModeEnabled,
  parseGuestDefaults,
  parseGuestEconomy,
  parseGuestSurpriseBoxSettings,
  loadGuestSettingsMap,
};
