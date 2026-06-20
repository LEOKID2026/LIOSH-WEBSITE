/**
 * Economy unavailable errors — fail-closed; never fall back to legacy or code defaults.
 */

export const ECONOMY_ERROR_CODES = Object.freeze({
  economy_disabled: "economy_disabled",
  economy_config_missing: "economy_config_missing",
  economy_db_error: "economy_db_error",
});

/**
 * Thrown when Admin/DB economy is required but unavailable.
 */
export class EconomyUnavailableError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ details?: Record<string, unknown> }} [opts]
   */
  constructor(code, message, opts = {}) {
    super(message);
    this.name = "EconomyUnavailableError";
    this.code = code;
    this.details = opts.details || null;
  }
}

/**
 * @param {EconomyUnavailableError | { code?: string, message?: string }} err
 */
export function economyUnavailableHttpResponse(err) {
  const code =
    err instanceof EconomyUnavailableError
      ? err.code
      : err?.code || ECONOMY_ERROR_CODES.economy_config_missing;
  const message =
    err instanceof EconomyUnavailableError
      ? err.message
      : err?.message || "כלכלת המטבעות אינה זמינה כרגע";
  return {
    ok: false,
    error: code,
    messageHe: message,
    unavailable: true,
  };
}
