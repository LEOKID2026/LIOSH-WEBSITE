/** @typedef {'migrate' | 'noop'} ActorTypeCheckMigrationAction */

export const ACTOR_TYPE_CHECK_VALUES_BEFORE = Object.freeze([
  "admin",
  "parent",
  "student",
  "system",
  "teacher",
]);

export const ACTOR_TYPE_CHECK_VALUES_AFTER = Object.freeze([
  ...ACTOR_TYPE_CHECK_VALUES_BEFORE,
  "visitor",
]);

/**
 * @param {string | null | undefined} constraintDef
 * @returns {boolean}
 */
export function isActorTypeInCheckConstraint(constraintDef) {
  if (typeof constraintDef !== "string" || !constraintDef.trim()) return false;
  return (
    /actor_type\s+IN\s+\(/i.test(constraintDef) ||
    /actor_type\s*=\s*ANY\s*\(\s*(?:ARRAY\s*)?\[/i.test(constraintDef)
  );
}

/**
 * Parse sorted unique actor_type allowed values from a CHECK definition.
 *
 * @param {string | null | undefined} constraintDef
 * @returns {string[] | null}
 */
export function parseActorTypeInCheckValues(constraintDef) {
  if (typeof constraintDef !== "string" || !constraintDef.trim()) return null;

  let inClause =
    constraintDef.match(/actor_type\s+IN\s+\((.+)\)\s*$/i)?.[1] ||
    constraintDef.match(/actor_type\s*=\s*ANY\s*\(\s*(?:ARRAY\s*)?\[(.+)\]\s*\)/i)?.[1];

  if (!inClause) return null;

  const values = [...inClause.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  if (!values.length) return null;

  return [...new Set(values)].sort();
}

/**
 * Mirrors migration 100 actor_type CHECK validation.
 *
 * @param {string[]} constraintDefs
 * @returns {ActorTypeCheckMigrationAction}
 */
export function resolveActorTypeCheckMigration(constraintDefs) {
  const actorChecks = (constraintDefs || []).filter(isActorTypeInCheckConstraint);

  if (actorChecks.length === 0) {
    throw new Error("migration 100: no actor_type CHECK constraint found");
  }
  if (actorChecks.length > 1) {
    throw new Error("migration 100: multiple actor_type CHECK constraints found");
  }

  const parsed = parseActorTypeInCheckValues(actorChecks[0]);
  if (!parsed) {
    throw new Error("migration 100: could not parse actor_type CHECK values");
  }

  const current = parsed.join(",");
  const before = ACTOR_TYPE_CHECK_VALUES_BEFORE.join(",");
  const after = ACTOR_TYPE_CHECK_VALUES_AFTER.join(",");

  if (current === after) return "noop";
  if (current === before) return "migrate";

  throw new Error(`migration 100: unexpected actor_type CHECK values (${parsed.join(", ")})`);
}
