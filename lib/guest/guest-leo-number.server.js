import crypto from "node:crypto";
import {
  LEO_NUMBER_MAX_EXCLUSIVE,
  LEO_NUMBER_MIN,
  LEO_NUMBER_RE,
  isValidLeoNumberString,
} from "./leo-number.constants.js";

const MAX_ATTEMPTS = 40;

export { LEO_NUMBER_RE, LEO_NUMBER_DIGITS, LEO_NUMBER_MIN } from "./leo-number.constants.js";

/**
 * @param {string} raw
 */
export function normalizeLeoNumber(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return isValidLeoNumberString(digits);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function generateUniqueLeoNumber(supabase) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const n = crypto.randomInt(LEO_NUMBER_MIN, LEO_NUMBER_MAX_EXCLUSIVE);
    const leoNumber = String(n);
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
