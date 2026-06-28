import {
  GAME_ACCESS_MESSAGES,
  GAME_ACCESS_STATES,
  permissionsFieldForCategory,
} from "../game-catalog.constants.js";
import {
  applyGuestLockToGameAccess,
  loadGuestGameAccessRows,
  loadGuestRuntimeConfig,
  resolveDefaultGuestPlayableGameKeys,
} from "../../guest/guest-access-policy.server.js";
import { isGuestStudent } from "../../guest/guest-display.js";
import { GUEST_GAME_LOCK_MESSAGE_HE } from "../../guest/constants.js";

const DEFAULT_PERMISSIONS = Object.freeze({
  online_enabled: true,
  offline_enabled: true,
  solo_enabled: true,
  educational_enabled: true,
});

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadSiteGameCatalog(supabase) {
  const { data, error } = await supabase
    .from("site_game_catalog")
    .select(
      "game_key,category,title_he,route,hub_route,is_enabled,sort_order,emoji,blurb_he,metadata_json"
    )
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message || "catalog_load_failed");
  return data || [];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function loadStudentGamePermissions(supabase, studentId) {
  const { data, error } = await supabase
    .from("student_game_category_permissions")
    .select("online_enabled,offline_enabled,solo_enabled,educational_enabled")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw new Error(error.message || "permissions_load_failed");

  return {
    online_enabled: data?.online_enabled !== false,
    offline_enabled: data?.offline_enabled !== false,
    solo_enabled: data?.solo_enabled !== false,
    educational_enabled: data?.educational_enabled !== false,
  };
}

/**
 * @param {string} category
 * @param {{ online_enabled?: boolean, offline_enabled?: boolean, solo_enabled?: boolean }} permissions
 */
export function isCategoryEnabledByParent(category, permissions) {
  const field = permissionsFieldForCategory(category);
  if (!field) return true;
  const perms = permissions || DEFAULT_PERMISSIONS;
  return perms[field] !== false;
}

/**
 * @param {object|null|undefined} catalogRow
 * @param {{ online_enabled?: boolean, offline_enabled?: boolean, solo_enabled?: boolean }} permissions
 */
export function resolveEffectiveGameAccess(catalogRow, permissions) {
  if (!catalogRow) {
    return {
      state: GAME_ACCESS_STATES.ADMIN_DISABLED,
      category: null,
      gameKey: null,
      message: GAME_ACCESS_MESSAGES.admin_disabled,
    };
  }

  const category = catalogRow.category;
  const gameKey = catalogRow.game_key;

  if (catalogRow.is_enabled !== true) {
    return {
      state: GAME_ACCESS_STATES.ADMIN_DISABLED,
      category,
      gameKey,
      message: GAME_ACCESS_MESSAGES.admin_disabled,
    };
  }

  if (!isCategoryEnabledByParent(category, permissions)) {
    return {
      state: GAME_ACCESS_STATES.PARENT_LOCKED,
      category,
      gameKey,
      message: GAME_ACCESS_MESSAGES.parent_locked,
    };
  }

  return {
    state: GAME_ACCESS_STATES.ALLOWED,
    category,
    gameKey,
    message: null,
  };
}

/**
 * @param {string} category
 * @param {Array<object>} catalog
 * @param {{ online_enabled?: boolean, offline_enabled?: boolean, solo_enabled?: boolean }} permissions
 */
export function resolveCategoryCardState(category, catalog, permissions) {
  const rows = (catalog || []).filter((r) => r.category === category);
  const enabledGames = rows.filter((r) => r.is_enabled === true);
  const enabledGameCount = enabledGames.length;
  const parentAllowed = isCategoryEnabledByParent(category, permissions);

  if (enabledGameCount === 0) {
    return {
      visible: false,
      playable: false,
      locked: false,
      enabledGameCount: 0,
      state: GAME_ACCESS_STATES.ADMIN_DISABLED,
    };
  }

  if (!parentAllowed) {
    return {
      visible: true,
      playable: false,
      locked: true,
      enabledGameCount,
      state: GAME_ACCESS_STATES.PARENT_LOCKED,
      message: GAME_ACCESS_MESSAGES.parent_locked,
    };
  }

  return {
    visible: true,
    playable: true,
    locked: false,
    enabledGameCount,
    state: GAME_ACCESS_STATES.ALLOWED,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} gameKey
 */
export async function assertStudentCanPlayGame(supabase, studentId, gameKey) {
  const key = String(gameKey || "").trim().toLowerCase();
  if (!key) {
    return { ok: false, code: "invalid_game", message: "משחק לא תקין", status: 400 };
  }

  const [catalog, permissions] = await Promise.all([
    loadSiteGameCatalog(supabase),
    loadStudentGamePermissions(supabase, studentId),
  ]);

  const row = catalog.find((r) => r.game_key === key);
  let access = resolveEffectiveGameAccess(row, permissions);

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, account_kind")
    .eq("id", studentId)
    .maybeSingle();

  if (isGuestStudent(studentRow || {})) {
    const config = await loadGuestRuntimeConfig(supabase);
    const guestRows = await loadGuestGameAccessRows(supabase);
    const guestPlayableByKey = resolveDefaultGuestPlayableGameKeys(
      guestRows,
      catalog,
      config.defaults.gamesPerCategory
    );
    access = applyGuestLockToGameAccess(access, row, guestPlayableByKey);
  }

  if (access.state === GAME_ACCESS_STATES.ADMIN_DISABLED) {
    return {
      ok: false,
      code: "game_admin_disabled",
      message: access.message,
      status: 403,
      category: access.category,
    };
  }

  if (access.state === GAME_ACCESS_STATES.PARENT_LOCKED) {
    return {
      ok: false,
      code: "game_parent_locked",
      message: access.message,
      status: 403,
      category: access.category,
    };
  }

  if (access.state === GAME_ACCESS_STATES.GUEST_LOCKED) {
    return {
      ok: false,
      code: "game_guest_locked",
      message: access.message || GUEST_GAME_LOCK_MESSAGE_HE,
      status: 403,
      category: access.category,
    };
  }

  return { ok: true, access, catalogRow: row };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} category
 */
export async function assertStudentCanAccessCategory(supabase, studentId, category) {
  const cat = String(category || "").trim();
  const [catalog, permissions] = await Promise.all([
    loadSiteGameCatalog(supabase),
    loadStudentGamePermissions(supabase, studentId),
  ]);

  const card = resolveCategoryCardState(cat, catalog, permissions);

  if (!card.visible) {
    return {
      ok: false,
      code: "category_unavailable",
      message: GAME_ACCESS_MESSAGES.admin_disabled,
      status: 403,
      category: cat,
    };
  }

  if (card.locked) {
    return {
      ok: false,
      code: "game_parent_locked",
      message: card.message,
      status: 403,
      category: cat,
    };
  }

  return { ok: true, card, catalog: catalog.filter((r) => r.category === cat && r.is_enabled) };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function buildStudentGameAccessPayload(supabase, studentId) {
  const [catalog, permissions, studentRow] = await Promise.all([
    loadSiteGameCatalog(supabase),
    loadStudentGamePermissions(supabase, studentId),
    supabase
      .from("students")
      .select("id, account_kind")
      .eq("id", studentId)
      .maybeSingle()
      .then(({ data }) => data),
  ]);

  let guestPlayableByKey = null;
  if (isGuestStudent(studentRow || {})) {
    const config = await loadGuestRuntimeConfig(supabase);
    const guestRows = await loadGuestGameAccessRows(supabase);
    guestPlayableByKey = resolveDefaultGuestPlayableGameKeys(
      guestRows,
      catalog,
      config.defaults.gamesPerCategory
    );
  }

  const games = catalog.map((row) => {
    let access = resolveEffectiveGameAccess(row, permissions);
    if (guestPlayableByKey) {
      access = applyGuestLockToGameAccess(access, row, guestPlayableByKey);
    }
    return {
      gameKey: row.game_key,
      category: row.category,
      titleHe: row.title_he,
      route: row.route,
      hubRoute: row.hub_route,
      isEnabled: row.is_enabled === true,
      sortOrder: row.sort_order,
      emoji: row.emoji,
      blurbHe: row.blurb_he,
      accessState: access.state,
      playable: access.state === GAME_ACCESS_STATES.ALLOWED,
      lockMessage: access.state === GAME_ACCESS_STATES.GUEST_LOCKED ? GUEST_GAME_LOCK_MESSAGE_HE : access.message,
    };
  });

  const categories = {};
  for (const cat of ["online", "offline", "solo", "educational"]) {
    let card = resolveCategoryCardState(cat, catalog, permissions);
    if (guestPlayableByKey) {
      const catGames = catalog.filter((r) => r.category === cat && r.is_enabled === true);
      const anyPlayable = catGames.some((row) => {
        const base = resolveEffectiveGameAccess(row, permissions);
        const access = applyGuestLockToGameAccess(base, row, guestPlayableByKey);
        return access.state === GAME_ACCESS_STATES.ALLOWED;
      });
      if (card.visible && card.playable && !anyPlayable) {
        card = {
          ...card,
          playable: false,
          locked: true,
          state: GAME_ACCESS_STATES.GUEST_LOCKED,
          message: GUEST_GAME_LOCK_MESSAGE_HE,
        };
      }
    }
    categories[cat] = card;
  }

  return {
    permissions: {
      onlineEnabled: permissions.online_enabled,
      offlineEnabled: permissions.offline_enabled,
      soloEnabled: permissions.solo_enabled,
      educationalEnabled: permissions.educational_enabled,
    },
    categories,
    games,
    isGuest: isGuestStudent(studentRow || {}),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 * @param {boolean} isEnabled
 * @param {string} adminUserId
 */
export async function updateSiteGameCatalogEnabled(supabase, gameKey, isEnabled, adminUserId) {
  const key = String(gameKey || "").trim();
  const { data: before } = await supabase
    .from("site_game_catalog")
    .select("game_key,is_enabled")
    .eq("game_key", key)
    .maybeSingle();

  if (!before) {
    return { ok: false, code: "not_found", message: "משחק לא נמצא" };
  }

  const { data, error } = await supabase
    .from("site_game_catalog")
    .update({ is_enabled: isEnabled === true, updated_at: new Date().toISOString() })
    .eq("game_key", key)
    .select("*")
    .single();

  if (error) {
    return { ok: false, code: "db_error", message: error.message };
  }

  if (adminUserId) {
    await supabase.from("reward_economy_change_log").insert({
      admin_user_id: adminUserId,
      setting_area: "game_catalog",
      entity_key: key,
      field_name: "is_enabled",
      old_value_json: { is_enabled: before.is_enabled },
      new_value_json: { is_enabled: isEnabled === true },
    });
  }

  return { ok: true, game: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentGamePermissions(supabase, studentId) {
  const perms = await loadStudentGamePermissions(supabase, studentId);
  return {
    onlineEnabled: perms.online_enabled !== false,
    offlineEnabled: perms.offline_enabled !== false,
    soloEnabled: perms.solo_enabled !== false,
  };
}

/**
 * @param {{
 *   supabase: import("@supabase/supabase-js").SupabaseClient,
 *   studentId: string,
 *   parentId: string,
 *   patch: { onlineEnabled?: boolean, offlineEnabled?: boolean, soloEnabled?: boolean },
 * }} params
 */
export async function upsertStudentGamePermissions({ supabase, studentId, parentId, patch }) {
  const current = await loadStudentGamePermissions(supabase, studentId);
  const row = {
    student_id: studentId,
    online_enabled: patch.onlineEnabled ?? current.online_enabled,
    offline_enabled: patch.offlineEnabled ?? current.offline_enabled,
    solo_enabled: patch.soloEnabled ?? current.solo_enabled,
    updated_at: new Date().toISOString(),
    updated_by: parentId,
  };

  const { data, error } = await supabase
    .from("student_game_category_permissions")
    .upsert(row, { onConflict: "student_id" })
    .select("online_enabled,offline_enabled,solo_enabled,educational_enabled")
    .single();

  if (error) throw new Error(error.message || "permissions_update_failed");

  return {
    onlineEnabled: data.online_enabled !== false,
    offlineEnabled: data.offline_enabled !== false,
    soloEnabled: data.solo_enabled !== false,
  };
}
