import crypto from "node:crypto";

const LEO_NUMBER_RE = /^[0-9]{6}$/;
const MAX_ATTEMPTS = 40;

/**
 * @param {string} raw
 */
export function normalizeLeoNumber(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return digits;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function generateUniqueLeoNumber(supabase) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const n = crypto.randomInt(0, 1_000_000);
    const leoNumber = String(n).padStart(6, "0");
    if (!LEO_NUMBER_RE.test(leoNumber)) continue;

    const { data, error } = await supabase
      .from("students")
      .select("id")
      .eq("leo_number", leoNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) return leoNumber;
  }
  throw new Error("leo_number_generation_exhausted");
}
