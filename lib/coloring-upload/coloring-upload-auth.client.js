/**
 * Optional parent bearer token for coloring upload quota (logged-in users).
 */

import { getLearningSupabaseBrowserClient } from "../learning-supabase/client.js";
import { resolveParentBearerSession } from "../parent-client/parent-bearer-session.client.js";

/**
 * @returns {Promise<string | null>}
 */
export async function getColoringUploadAuthHeader() {
  if (typeof window === "undefined") return null;
  try {
    const supabase = getLearningSupabaseBrowserClient();
    const session = await resolveParentBearerSession(supabase);
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  } catch {
    return null;
  }
}
