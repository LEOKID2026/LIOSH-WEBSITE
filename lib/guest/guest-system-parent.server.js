import { GUEST_SYSTEM_PARENT_EMAIL } from "./constants.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 */
export async function resolveGuestSystemParentId(serviceRole) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    const match = data?.users?.find((u) => u.email === GUEST_SYSTEM_PARENT_EMAIL);
    if (match?.id) return { ok: true, parentId: match.id };
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return { ok: false, status: 503, code: "guest_system_parent_not_found" };
}
