/**
 * Resolve a parent Supabase session whose access token is valid for Bearer APIs.
 * Prefer getUser() over getSession() — getSession may return a cached JWT that
 * the server already rejected while auto-refresh is still in flight.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<import("@supabase/supabase-js").Session | null>}
 */
export async function resolveParentBearerSession(supabase) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData?.user) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      return sessionData.session;
    }
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshData?.session?.access_token) {
    return refreshData.session;
  }

  return null;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {import("next/router").NextRouter} router
 */
export async function clearParentBearerSessionAndRedirect(supabase, router) {
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
  await router.replace("/parent/login");
}
