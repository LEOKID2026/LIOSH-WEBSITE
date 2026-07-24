import { useEffect, useRef } from "react";

/**
 * Shared rollback-aware application of the ActionDecisionContractV2 executor
 * directive's one-shot, state-mutating fields (forced question kind, level).
 *
 * Background (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md,
 * BLOCKER-2): `sessionPolicy.timerEnabled` / `sessionPolicy.readingPresentation` /
 * `sessionPolicy.guidance` are read live off `directive` on every render, so
 * they already self-correct the instant a decision expires — no rollback
 * needed for those. `practiceForceKindRef.current` and the `level` React
 * state are copied out into master-local mutable state exactly once when a
 * decision becomes active, and previously were NEVER reverted when that same
 * decision expired/became ineligible/failed to fetch. This hook fixes that,
 * identically across all 7 learning masters.
 *
 * Decision identity is the contract's own createdAt + version (NOT levelKey,
 * NOT topic) — see hooks/useStudentActionDecision.js / lib/learning/action-decision-executor.js.
 *
 * @param {object} params
 * @param {object} params.directive executor directive from useStudentActionDecision()
 * @param {string} params.level current level/sourceDifficulty value
 * @param {(level: string) => void} params.applyLevel setter used ONLY for ADC-driven level changes
 * @param {{ current: string|null }|null} [params.forceKindRef] optional — not every subject consumes preferKind yet
 */
export function useActionDecisionRouteSync({ directive, level, applyLevel, forceKindRef = null }) {
  const stateRef = useRef({
    appliedKey: null,
    rolledBack: true,
    baselineLevel: null,
    baselineKind: null,
    didSetLevel: false,
    didSetKind: false,
  });

  useEffect(() => {
    const active = directive?.active === true;
    // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md
    // (final round): createdAt lives at directive.lifecycle.createdAt, not
    // directive.createdAt (see lib/learning/action-decision-executor.js's
    // baseDirective) — reading the wrong (always-undefined) field meant
    // every decision with the same contract version computed the identical
    // key, so a genuinely NEW decision replacing an active one was never
    // detected as new. Caught by tests/learning/decision-engine-runtime-consumption.test.mjs.
    const key = active
      ? `${String(directive?.sourceContractVersion || "")}:${String(directive?.lifecycle?.createdAt || "")}`
      : null;

    if (active) {
      const s = stateRef.current;
      if (key !== s.appliedKey) {
        // A new (or first) decision is taking over — snapshot the pre-decision
        // baseline once, before applying anything, so a later rollback restores
        // exactly what was there before this specific decision.
        stateRef.current = {
          appliedKey: key,
          rolledBack: false,
          baselineLevel: level,
          baselineKind: forceKindRef ? forceKindRef.current : null,
          didSetLevel: false,
          didSetKind: false,
        };
      }
      const s2 = stateRef.current;
      if (forceKindRef && directive.questionPolicy?.preferKind) {
        forceKindRef.current = directive.questionPolicy.preferKind;
        s2.didSetKind = true;
      }
      if (
        ["advance_cautiously", "strengthen_prerequisite"].includes(directive.action) &&
        directive.routePolicy?.level &&
        directive.routePolicy.level !== level
      ) {
        applyLevel(directive.routePolicy.level);
        s2.didSetLevel = true;
      }
      return;
    }

    // Inactive: decision expired, was rejected, or fetch/API failed. Roll back
    // exactly once — restore only the fields this same decision actually set,
    // never invent a different path. A brand-new active decision is handled
    // above and never reaches this branch, so it is never clobbered.
    const s = stateRef.current;
    if (s.appliedKey !== null && !s.rolledBack) {
      if (s.didSetKind && forceKindRef) forceKindRef.current = s.baselineKind;
      if (s.didSetLevel && s.baselineLevel != null && s.baselineLevel !== level) {
        applyLevel(s.baselineLevel);
      }
      stateRef.current = { ...s, rolledBack: true, appliedKey: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directive, level, applyLevel, forceKindRef]);
}
