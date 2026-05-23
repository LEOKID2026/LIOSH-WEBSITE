# Privacy / Cookies / Child Data Plan

**Generated:** 2026-05-23
**Risk rows:** **R-PRIV-01 (P1, owner-decision required)**, R-LOG-01 (P1)

> **Disclaimer:** this is a *planning* document, not legal advice. Before public launch, owner must obtain a legal review for the chosen jurisdiction.

## Goal

Define the minimum privacy posture for a product that processes data **about children**. Identify the owner decisions that gate public launch, and the controlled-pilot allowances.

## Audience

- **Children (grades 1–6).** Real users of the learning surface. They do not directly create accounts; their parent does.
- **Parents.** Account holders, controllers in privacy terms.
- **Visitors / public.** Marketing pages.

## Jurisdiction options

Owner must pick:

| Region | Likely framework |
|--------|------------------|
| Israel | חוק הגנת הפרטיות (Israeli Privacy Protection Law) + best practice for minors |
| EU / UK | GDPR + GDPR-K (or UK ICO Children's Code / "Age Appropriate Design Code") |
| US | COPPA (under 13) |
| Multi-region | strictest of the above |

> Decision needed: **starting jurisdiction = ?** (see [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md)).

## Minimum posture for any jurisdiction

1. **Parental consent gate.** Account creation requires the parent to confirm they are the parent and consent to the child's use.
2. **Data minimization.** Collect only what the product requires (see [SECURITY_DATA_INVENTORY.md](./SECURITY_DATA_INVENTORY.md)).
3. **Privacy notice.** A short, plain-language notice at `/privacy` (Hebrew + English) that:
   - Explains what is collected.
   - Explains who can see it (only the parent + system administrators).
   - Explains retention.
   - Explains how to delete data.
   - Lists the data controller.
4. **Right to erasure.** Parent must be able to delete a child via the dashboard. The deletion must cascade across `learning_*` tables.
5. **Right of access.** Parent can already view full report. Add an "export my data" capability (next fix pass; non-blocking for closed pilot).
6. **No advertising / profiling.** No third-party advertising network, no behavioral profiling beyond educational mastery state.
7. **No data sale.**
8. **Cross-border transfer disclosure.** If any LLM provider (OpenAI / Google) processes prompts in a different jurisdiction, disclose this in the privacy notice and obtain consent.

## Cookie banner — is it required?

| Jurisdiction | Strict cookie banner required? |
|--------------|-------------------------------|
| Israel | typically not required for purely functional cookies; transparent disclosure recommended |
| EU / UK | yes for any non-essential cookie; today the product uses only essential cookies (student session) — confirm |
| US (COPPA) | not required, but consent flow for minors is required |

If the product uses **only** essential cookies (student session, parent Supabase session), a banner can be replaced by a clear privacy notice. Confirm in next fix pass.

## Controlled pilot allowance

For a closed pilot ≤ 50 testers with explicit parental sign-up:

- Privacy notice must exist (even short).
- Parental consent recorded (a simple checkbox + timestamp + parent-confirmed name).
- No advertising / profiling.
- Data deletion path tested.
- Pilot pause within 48h if any privacy incident; see [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md).

This may proceed *without* a full GDPR-K / COPPA legal package, with **owner waiver** captured in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md).

## Public launch requirements

- Full legal review for chosen jurisdiction.
- DPIA (Data Protection Impact Assessment) if EU / UK.
- DPO identified (or "controller contact").
- Documented retention + deletion process.
- Subject access request workflow (manual is acceptable initially).
- Vendor list disclosed (Supabase, Vercel, OpenAI / Google for LLM).

## Owner decisions required (gate to public launch)

| # | Decision |
|---|----------|
| D-PRIV-1 | starting jurisdiction (IL / EU / US / multi) |
| D-PRIV-2 | LLM provider in production (OpenAI / Gemini) and disclosure language |
| D-PRIV-3 | retention period for learning data after account deletion |
| D-PRIV-4 | parental consent UX (checkbox vs. signed form) |
| D-PRIV-5 | cookie banner needed (depends on D-PRIV-1) |
| D-PRIV-6 | DPO / privacy contact email |

## Acceptance for next fix pass (privacy slice)

- D-PRIV-1..6 decided and recorded.
- Privacy notice published at `/privacy`.
- Parental consent step verified in account creation.
- Deletion cascade verified via test.
- Register row R-PRIV-01 may move to `fixed` for the *pilot* once D-PRIV-1..6 are decided AND the closed-pilot allowance bullets are met. Public-launch closure requires the legal review.
