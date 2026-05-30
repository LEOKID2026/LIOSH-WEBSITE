import { createClient } from "@supabase/supabase-js";

let browserClient = null;

function requireLearningPublicEnv() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  }
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

export function getLearningSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("getLearningSupabaseBrowserClient must run in the browser");
  }

  if (!browserClient) {
    const { url, anonKey } = requireLearningPublicEnv();
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Recovery tokens are established explicitly on /auth/reset-password.
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}
