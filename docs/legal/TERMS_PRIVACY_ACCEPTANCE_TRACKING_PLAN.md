# Terms + Privacy Acceptance Tracking — Phase D Plan

**Date:** 2026-05-23  
**Status:** planning only — **no implementation**  
**Scope:** Terms + Privacy acceptance at parent signup/login only

---

## Owner decisions (locked)

- Acceptance covers **Terms + Privacy only** — not a separate consent route.
- **No** `/parent-consent` public page.
- **No** guardian/parent identity confirmation checkbox.
- **No** DB migration or checkbox in this planning pass.

---

## Requirements for Phase D (when approved)

When implemented, the system should record:

1. Parent user ID (Supabase auth)
2. Acceptance timestamp (UTC)
3. Policy versions accepted (`terms` + `privacy` version or `POLICY_LAST_UPDATED` hash)
4. Optional: client IP / user-agent (privacy review needed)
5. Support **re-acceptance** when policy materially changes

Out of scope for Phase D plan: guardian attestation, child consent, modal flows (unless separately approved).

---

## Option A — Supabase user metadata (`auth.users.raw_user_meta_data` or `app_metadata`)

Store on the auth user record, e.g.:

```json
{
  "policy_acceptance": {
    "terms_version": "2026-05-23",
    "privacy_version": "2026-05-23",
    "accepted_at": "2026-05-23T12:00:00.000Z"
  }
}
```

### Pros

- **Lowest complexity** — no new table or migration if metadata column already usable.
- Tight coupling to parent account — easy lookup on login.
- Fast to implement: update metadata on signup or first login after checkbox.
- Works with existing Supabase Auth session.

### Cons

- **Poor audit history** — updating metadata overwrites prior acceptance; no immutable log.
- **Version re-acceptance** requires careful merge logic; hard to prove historical consent.
- Metadata size limits; mixing policy data with profile fields can get messy.
- RLS / service-role writes only — client should not write metadata directly.
- Export/compliance queries less convenient than a dedicated table.

### Evidence stored

- Latest acceptance only (unless append-only JSON array is hand-rolled in metadata — not recommended).

### Version re-acceptance

- Possible by comparing stored version vs `POLICY_LAST_UPDATED`; overwrite on re-accept.
- **No reliable audit trail** of prior acceptances.

### Audit history

- **Weak** — single current snapshot.

### Privacy impact

- Low additional PII if only user id + timestamp + version strings.
- IP/UA in metadata increases sensitivity — avoid unless legally required.

### Implementation complexity

- **Low** (~1–2 days): API route + signup checkbox + login gate for outdated version.

---

## Option B — Dedicated `parent_policy_acceptances` table

Example shape (conceptual — **not migrated in this pass**):

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `parent_user_id` | uuid FK → auth.users | |
| `terms_version` | text | e.g. `2026-05-23` |
| `privacy_version` | text | |
| `accepted_at` | timestamptz | |
| `source` | text | `signup`, `login_reaccept`, `settings` |
| optional `ip_hash` | text | hashed, if approved |

Unique constraint optional: one row per `(parent_user_id, terms_version, privacy_version)` or append-only rows only.

### Pros

- **Full audit history** if append-only (each acceptance = new row).
- **Clear compliance evidence** — who accepted which version when.
- **Version re-acceptance** — query latest row or require new row when version bumps.
- Clean separation from auth profile data.
- Easier reporting and export for legal requests.

### Cons

- **Requires DB migration** + RLS policies (parent can read own rows; insert via service role or secured RPC).
- More code: migration, API, possibly Supabase RPC.
- Must define retention policy for old rows.

### Evidence stored

- Immutable (or semi-immutable) records per acceptance event.

### Version re-acceptance

- **Strong** — compare latest row versions to current; prompt checkbox; insert new row.

### Audit history

- **Strong** — full timeline if append-only.

### Privacy impact

- Stores parent user id + timestamps; minimal content.
- IP/UA optional — document in privacy policy if collected.

### Implementation complexity

- **Medium** (~3–5 days): migration, RLS, API, UI checkbox, login/version gate.

---

## Option C — Lightweight server audit table (generic `policy_acceptance_events`)

Similar to Option B but generic event log, e.g. `policy_acceptance_events`:

| Column | Notes |
|--------|-------|
| `event_type` | `terms_privacy_accepted` |
| `actor_user_id` | parent uuid |
| `payload_json` | `{ terms_version, privacy_version }` |
| `created_at` | |

Could live in existing audit/logging pattern if the project has one.

### Pros

- **Flexible** — same table could log other compliance events later.
- **Audit history** if append-only.
- Decoupled from auth user schema.

### Cons

- **Over-generic** for a single use case — harder queries (`WHERE event_type = ...`).
- Still needs migration + RLS.
- Risk of inconsistent payload shapes without strict validation.
- “Latest acceptance” requires `ORDER BY created_at DESC LIMIT 1` per user.

### Evidence stored

- Event rows with JSON payload.

### Version re-acceptance

- **Good** — new event per acceptance; compare latest payload versions.

### Audit history

- **Good** — if events are never updated/deleted.

### Privacy impact

- Similar to Option B; JSON payload must stay minimal.

### Implementation complexity

- **Medium-high** (~3–5 days) — migration + event schema discipline + API + UI.

---

## Comparison summary

| Criterion | A — User metadata | B — Dedicated table | C — Audit events |
|-----------|-------------------|---------------------|------------------|
| Audit history | Weak | Strong | Strong |
| Version re-acceptance | OK (no history) | Strong | Strong |
| Implementation effort | Low | Medium | Medium-high |
| Compliance evidence | Low | High | High |
| DB migration | None / minimal | Yes | Yes |
| Query simplicity | High | High | Medium |

---

## Recommendation

**Primary: Option B — `parent_policy_acceptances` (append-only rows)**

Reasons:

1. Child-data site with Israeli privacy expectations — **provable consent timeline** matters.
2. Owner may update Terms/Privacy (`POLICY_LAST_UPDATED`) — **re-acceptance with history** is a realistic need.
3. Keeps auth metadata clean; avoids overwrite ambiguity in Option A.
4. Option C adds flexibility the product does not need yet; B is clearer for legal review.

**Fallback for MVP:** Option A only if launch deadline is critical **and** owner accepts “latest acceptance only, no history” — document that limitation explicitly before signoff.

---

## Suggested Phase D implementation sequence (after approval)

1. Add checkbox on `/parent/login` signup mode only (Terms + Privacy links + required checkbox).
2. API route: `POST /api/parent/accept-policies` — validates session, writes acceptance row (Option B).
3. On login: if latest acceptance versions < current `POLICY_LAST_UPDATED`, show re-acceptance (banner or inline — **no modal** unless separately approved).
4. Do **not** block existing users indefinitely without grace period — product decision.
5. Update privacy policy § if IP/UA collected.

---

## Explicitly excluded (Phase D)

- Guardian/parent identity checkbox
- `/parent-consent` route
- Child/student acceptance
- ENV changes
- Copilot / report / engine changes
