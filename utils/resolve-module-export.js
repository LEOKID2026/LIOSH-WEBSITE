/**
 * Resolve a named export from data-bank modules under both native Node ESM and tsx.
 * tsx may wrap large static banks as default-only; Node keeps named exports.
 *
 * @param {Record<string, unknown>} mod
 * @param {string} exportName
 */
export function resolveModuleExport(mod, exportName) {
  return mod[exportName] ?? mod.default?.[exportName];
}
