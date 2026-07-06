/**
 * Client entry for student ad ENV config (inlined at build time via Next.js).
 */
export {
  STUDENT_AD_ENV,
  STUDENT_AD_POLICY,
  STUDENT_AD_FORBIDDEN_PROP_KEYS,
  resolveStudentAdRenderModeFromEnv,
  resolveStudentAdRenderModeWithConsent,
} from "./student-ad-config.js";

import {
  resolveStudentAdRenderModeFromEnv,
  resolveStudentAdRenderModeWithConsent,
} from "./student-ad-config.js";
import { isAdsConsentGranted } from "../consent/consent-storage.client.js";

/** @returns {import("./student-ad-config.js").StudentAdRenderMode} */
export function resolveStudentAdRenderMode() {
  return resolveStudentAdRenderModeWithConsent(process.env, {
    adsConsentGranted: isAdsConsentGranted(),
  });
}

/** Env-only mode (ignores consent) — for diagnostics/tests. */
export function resolveStudentAdRenderModeEnvOnly() {
  return resolveStudentAdRenderModeFromEnv(process.env);
}
