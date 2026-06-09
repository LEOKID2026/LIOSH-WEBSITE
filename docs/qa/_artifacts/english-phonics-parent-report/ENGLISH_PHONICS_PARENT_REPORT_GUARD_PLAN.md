# English G1/G2 Phonics — Parent Report QA Guard Plan

**Document date:** 2026-06-09  
**Agent:** Agent 3 (QA guard / fixture only)  
**Phase:** 4B — books + registry complete; practice runtime not wired  
**Status:** **Dry-run preflight PASS-capable** — live phonics parent-report assertions **BLOCKED**

---

## 1. Purpose

Prevent future English G1/G2 phonics practice from producing **misleading parent-report conclusions** while diagnostic flags are partially ON:

| Flag | Expected baseline |
|------|-------------------|
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | `true` |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | `true` |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | `false` |

Equivalent QA mode: **C** (`subskill_gating`).

This guard does **not** change product code, flags, banks, generator, curriculum, audio, registry, or SQL.

---

## 2. Guard script

```bash
node scripts/qa/english-phonics-parent-report-guard.mjs
node scripts/qa/english-phonics-parent-report-guard.mjs --write-artifacts
node --env-file=.env.local scripts/qa/english-phonics-parent-report-guard.mjs --live
```

| Artifact | Path |
|----------|------|
| Guard results | `docs/qa/_artifacts/english-phonics-parent-report/guard-results.json` |
| Fixture spec | `docs/qa/_artifacts/english-phonics-parent-report/phonics-parent-report-fixture-spec.json` |

---

## 3. What the guard verifies **now** (executable)

These checks run without phonics runtime, banks, or seeded students:

| Check | Rationale |
|-------|-----------|
| All 23 phonics pages have skill-index entries | Registry completeness |
| Skill IDs match `english:phonics:g1|g2:*` | Taxonomy isolation from grammar/translation pools |
| `parseEnglishTopicFromSkillId` does **not** map phonics → grammar/translation/vocab | Misclassification prevention at practice-map layer |
| `ENGLISH_MASTER_TOPICS` excludes `phonics` | Phonics not auto-routed through legacy topic buckets |
| **No** phonics page exposes `hasEnglishPracticeTarget` | Practice not wired — no accidental sessions yet |
| Phonics pages use `pageType: phonics_foundation` | Content classification |
| Flag module reads mode C correctly (in-process only) | Gating ON, promotion OFF when baseline env applied |

**Verdict today:** Executable preflight can **PASS**. This is **not** a claim that phonics parent-report behavior is safe end-to-end.

---

## 4. What remains **BLOCKED** until banks/generator connect

Live parent-report assertions are **deferred** — the guard reports `BLOCKED`, never fake PASS:

| Deferred assertion | Trigger to enable |
|--------------------|-------------------|
| G1 phonics-only sessions → no strong diagnosis | Banks + generator + `topic=phonics` practice map + seed `phonicsg1` |
| G2 phonics-only → no grammar/translation conclusions | Same + seed `phonicsg2` |
| Thin phonics/listening evidence → soft/thin copy only | Sufficient seeded sessions with `manual_only` / thin metadata |
| No internal metadata in HTML/PDF/API public payload | Live report path after seed |
| Gating active under mode C on phonics windows | Staging smoke + phonics fixture overlap |
| Promotion remains OFF | `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false` on target env |

### Blockers (current repo state)

1. **Phonics question banks** — not present (`english*bank*` absent).
2. **Practice map** — phonics pages intentionally excluded (`tests/learning/english-phonics-g1-g2-registry.test.mjs`).
3. **Generator** — no phonics `questionType` emission path verified.
4. **Fixture seed** — `phonicsg1` / `phonicsg2` students not in AAA roster.

---

## 5. Future live fixture spec

When unblocked, seed two students per `phonics-parent-report-fixture-spec.json`:

| Student | Grade | Login | Session mix |
|---------|-------|-------|-------------|
| PhonicsG1 | 1 | `phonicsg1` | letter/sound/listen items from G1 phonics pages only |
| PhonicsG2 | 2 | `phonicsg2` | blend/listen/sentence-exposure from G2 phonics pages only |

Report window: `2026-06-01` → `2026-06-09` (adjust at seed time).

### Live assertion patterns (reuse staging smoke)

**Leak scan** — must not appear in public HTML/PDF/JSON text:

- `_evidenceQuality`, `bySubSkill`, `gatingDecisions`, `promotionDecisions`
- `skillId`, `subSkill`, `english:phonics:*` raw taxonomy IDs

**Strong diagnosis** — must be suppressed for thin phonics evidence:

```regex
/(כדאי לשים לב ל|נראה שיש קושי|הביצועים הכלליים)/
```

**Soft/thin** — acceptable when data exists:

```regex
/(מעט נתוני תרגול|יש עדיין מעט נתוני תרגול|מומלץ לשמור)/
```

**Grammar/translation conclusions** — must not appear from phonics-only data:

- `דקדוק באנגלית`, `תרגום…אנגלית`, `past simple`, `present continuous`, `grammar_basics`, `english:pool:translation`

---

## 6. Related QA (run alongside, not replaced)

| Script | Role |
|--------|------|
| `parent-report-diagnostic-flags-staging-smoke.mjs` | Mode C staging smoke (AAA fixtures) |
| `parent-report-diagnostic-visible-impact-hardening.mjs` | Public payload leak hardening |
| `parent-report-visible-truth-audit.mjs` | Visible sentence ↔ question-count truth |
| `english-phonics-g1-g2-registry.test.mjs` | Registry + practice-target absence |

---

## 7. Sign-off gates (Phase 4B execution)

| Stage | Guard expectation |
|-------|-------------------|
| Book + registry only (now) | Preflight PASS; live BLOCKED |
| Banks + practice map wired | Re-run preflight; implement live pipeline |
| Seed + staging deploy | `--live` must PASS all deferred assertions |
| User-facing ship | Preflight + live PASS + staging smoke PASS |

---

## 8. Explicit non-goals (this agent)

- No edits to `lib/parent-server/`
- No edits to `lib/learning/diagnostic-metadata-subskill-flag.js`
- No edits to English banks, generator, curriculum, audio, manifest, launch registry
- No SQL changes
- No runtime behavior changes
- No git commit or push
