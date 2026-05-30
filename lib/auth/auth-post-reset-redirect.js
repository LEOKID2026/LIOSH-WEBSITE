import { isAdminAppMetadataUser } from "../admin-portal/use-admin-session";

/**
 * @param {object|null|undefined} meBody
 */
export function teacherPostLoginPath(meBody) {
  const schoolRole = meBody?.data?.schoolMembership?.schoolRole;
  if (schoolRole === "school_operator") {
    return "/school/operator/dashboard";
  }
  if (meBody?.data?.schoolMembership?.isSchoolManager) {
    return "/school/dashboard";
  }
  return "/teacher/dashboard";
}

/**
 * @param {string} accessToken
 */
export async function fetchTeacherMe(accessToken) {
  const res = await fetch("/api/teacher/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Resolve persona-aware destination after password reset.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function resolvePostPasswordResetPath(supabase) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (isAdminAppMetadataUser(user)) {
    return "/admin/teachers";
  }

  const role =
    user?.app_metadata && typeof user.app_metadata.role === "string"
      ? user.app_metadata.role.trim().toLowerCase()
      : "";

  if (role === "teacher") {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      return "/teacher/login";
    }
    const me = await fetchTeacherMe(token);
    if (me.status === 200) {
      return teacherPostLoginPath(me.body);
    }
    return "/teacher/login";
  }

  return "/parent/dashboard";
}
