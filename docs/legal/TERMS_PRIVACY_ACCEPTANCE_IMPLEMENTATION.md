# Terms + Privacy Acceptance — Phase D Implementation

**Date:** 2026-05-23  
**Phase D.1 verification:** 2026-05-23 — **PASS** (dev DB + API smoke)  
**Phase D.2:** 2026-05-23 — full policy acceptance panel (replaces weak checkbox-only UX)  
**Status:** code + dev migration applied; production migration = owner apply same SQL

---

## Policy version source of truth

File: `data/legal/sitePolicies.he.js`

| Constant | Purpose |
|----------|---------|
| `POLICY_LAST_UPDATED` | Display date on legal pages |
| `TERMS_VERSION` | Acceptance audit id for Terms (currently equals `POLICY_LAST_UPDATED`) |
| `PRIVACY_VERSION` | Acceptance audit id for Privacy (currently equals `POLICY_LAST_UPDATED`) |

When Terms or Privacy change materially, bump the relevant version constant(s). Existing parents will be prompted to re-accept on next dashboard visit.

---

## Parent ID mapping (Phase D.1 — confirmed)

The API uses `auth.getUser()` → `user.id` as `parentUserId`.

Project schema (migration `001`):

- `parent_profiles.id` **references** `auth.users(id)` (same UUID)
- Trigger `handle_parent_profile_created()` inserts `parent_profiles(id) = new.id` on auth user create
- All parent RLS policies use `auth.uid()` compared to `parent_id` / `parent_profiles.id`

**FK in `018`:** `parent_policy_acceptances.parent_user_id → parent_profiles(id)`

**Verification (LEO-KID / `ajxwmlwbzxwffrtlfuoe`):**

```sql
SELECT pp.id, u.id, (pp.id = u.id) AS ids_match
FROM parent_profiles pp JOIN auth.users u ON u.id = pp.id LIMIT 3;
-- ids_match = true for all sampled rows
```

**Conclusion:** `auth.user.id` === `parent_profiles.id` === `parent_policy_acceptances.parent_user_id`. No API/migration fix required.

---

## Database

**Migration file (repo):** `supabase/migrations/018_parent_policy_acceptances.sql`

**Migration applied (dev):** **YES** — Supabase project **LEO-KID** (`ajxwmlwbzxwffrtlfuoe`), migration name `parent_policy_acceptances`, 2026-05-23.

**Table:** `public.parent_policy_acceptances`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `parent_user_id` | uuid NOT NULL | FK → `parent_profiles(id)` ON DELETE CASCADE |
| `terms_version` | text NOT NULL | Must match server `TERMS_VERSION` on accept |
| `privacy_version` | text NOT NULL | Must match server `PRIVACY_VERSION` on accept |
| `accepted_at` | timestamptz NOT NULL | default `now()` |
| `locale` | text NOT NULL | default `'he'` |
| `source` | text NOT NULL | default `'parent_login'` |
| `created_at` | timestamptz NOT NULL | default `now()` |

**Migration safety review (Phase D.1):**

| Check | Result |
|-------|--------|
| Append-only (no UPDATE/DELETE policies) | PASS |
| RLS enabled | PASS (`rls_enabled = true`) |
| Browser policies (anon/authenticated) | PASS — **zero policies** |
| Service-role API writes only | PASS |
| Old rows preserved on re-accept | PASS — new INSERT only |
| Current acceptance = latest row matching versions | PASS — `isCurrentPolicyAccepted()` |
| Raw IP storage | PASS — not implemented |
| ENV/salt dependency | PASS — none |

**Not included:** `ip_hash`, `user_agent_hash` (future enhancement).

---

## Apply migration to production (owner action)

If production uses the same LEO-KID project, migration is **already applied**.

If a separate production Supabase project exists:

1. Open Supabase Dashboard → SQL Editor (or CLI `supabase db push`).
2. Run the contents of `supabase/migrations/018_parent_policy_acceptances.sql` verbatim.
3. Verify:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'parent_policy_acceptances';

SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'parent_policy_acceptances';
-- expect zero rows
```

**Do not modify ENV** for this step.

---

## Server logic

`lib/parent-server/policy-acceptance.server.js`

- `resolveParentPolicyAcceptanceStatus`
- `recordParentPolicyAcceptance` (idempotent if already on current versions)
- `resolveAuthenticatedParentUserId` (Bearer + `auth.getUser()`)

**Allowed `source` values:** `parent_signup`, `parent_login`, `parent_dashboard`

---

## API routes

| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/parent/policy-acceptance/status` | Bearer parent session |
| POST | `/api/parent/policy-acceptance/accept` | Bearer parent session |

---

## Phase D.1 API smoke results

**Script:** `scripts/legal/policy-acceptance-api-smoke.mjs`

**Run:**

```bash
npm run build
npx next start -p 3106
node --env-file=.env.local scripts/legal/policy-acceptance-api-smoke.mjs --base http://localhost:3106
```

**Result:** **PASS** (2026-05-23)

| Test | Result |
|------|--------|
| GET without auth | 401 |
| GET before accept | `accepted: false`, correct required versions |
| POST wrong version | 409 |
| POST invalid source | 400 |
| POST current versions | 200, row inserted |
| GET after accept | `accepted: true`, `acceptedAt` set |
| Duplicate POST | 200, `alreadyAccepted: true` |
| Service-role DB row | Verified; ephemeral test user + rows cleaned up |
| Version logic unit checks | stale terms → not accepted |

Uses ephemeral `policy-smoke-*@example.com` parent when `E2E_PARENT_*` not set (auto-deleted after test).

---

## Phase D.2 — Full policy acceptance panel (2026-05-23)

### Why Phase D (checkbox-only) was rejected

Phase D shipped a signup checkbox with links to `/terms` and `/privacy`. A parent could check the box without opening or reading any policy content. That UX was **not approved as final** — acceptance must happen through a dedicated in-site full policy experience with scroll-to-read and explicit confirmation.

### Component: `FullPolicyAcceptancePanel`

File: `components/parent/FullPolicyAcceptancePanel.jsx`

Reusable panel that:

1. Renders full Hebrew policy content **inside the site** (not external links only).
2. Pulls copy from `data/legal/sitePolicies.he.js` via `data/legal/fullPolicyAcceptanceContent.js` (Terms, Privacy, data-deletion summary, AI disclosure summary, cookies/ads summary, accessibility/contact).
3. Shows meta: Terms version, Privacy version, last updated, contact email (`18eran@gmail.com`).
4. Requires **scroll to bottom** of the scrollable policy area (IntersectionObserver + scroll handler; short content auto-marks bottom on mount/resize).
5. Shows required confirmation checkbox at footer: «קראתי את תנאי השימוש ומדיניות הפרטיות ואני מסכים/ה להם.» — disabled until scrolled.
6. Primary «אני מסכים/ה וממשיך/ה» enabled only when scrolled **and** checkbox checked.
7. Secondary «אינני מסכים/ה» closes panel; user remains blocked.

Shared section renderer: `components/legal/PolicySectionsBody.jsx`.

### Signup flow (`/parent/login`)

| Step | Behavior |
|------|----------|
| Signup mode | No checkbox-only acceptance. Button: «פתחו וקראו את תנאי השימוש ומדיניות הפרטיות» opens full panel. |
| Pre-signup panel | `persistToApi={false}` — local `preSignupPolicyCompleted` flag only. |
| Submit disabled | Until full panel accepted (`preSignupPolicyCompleted === true`). |
| Decline | Panel closes; signup blocked; message shown. |
| After signUp + session | POST `/api/parent/policy-acceptance/accept` with `source: parent_signup`. |
| Email verification, no session | Acceptance enforced on first authenticated dashboard visit via gate. |

### Dashboard gate (`ParentPolicyAcceptanceGate`)

Replaces lightweight one-click gate:

1. Parent without current accepted versions sees blocking inline intro (not dashboard content).
2. Button opens `FullPolicyAcceptancePanel` with `persistToApi={true}`.
3. Accept → POST existing API → children rendered.
4. Decline → panel closes; gate intro remains; dashboard content hidden.
5. Version mismatch → gate reappears on next visit.

### Decline behavior

| Context | On «אינני מסכים/ה» |
|---------|-------------------|
| Signup | Panel closes; cannot submit signup; explanatory message. |
| Dashboard | Panel closes; gate intro visible; no dashboard content. |

### DB / API changes in D.2

**None.** Reuses `parent_policy_acceptances` table, GET/POST routes, and version constants unchanged.

### Phase D.2 validation (code review)

| Check | Result |
|-------|--------|
| Signup cannot proceed with checkbox/link only | PASS — button opens full panel; submit gated on `preSignupPolicyCompleted` |
| Full panel opens from signup and gate | PASS |
| Approve disabled before scroll bottom | PASS — `canApprove = scrolledToBottom && confirmChecked` |
| Approve disabled until confirm checkbox | PASS — checkbox disabled until scrolled |
| Decline blocks continuation | PASS — signup + gate |
| Accept stores via existing API (dashboard) | PASS — `postPolicyAcceptance` with current versions |
| Accepted parent no longer sees gate | PASS — `setAccepted(true)` on accept |
| Version mismatch shows gate | PASS — server `accepted: false` unchanged |
| No `/parent-consent` | PASS |
| No guardian text | PASS |
| No ENV touched | PASS |
| No engine/report/Copilot/disclaimer changes | PASS |
| `npm run build` | PASS (2026-05-23) |
| RTL, mobile layout, keyboard (scroll region `tabIndex={0}`, decline/back) | PASS — code review |

---

## Phase D.1 UI smoke results (superseded for signup/gate UX by D.2)

**Static routes:** `/parent/login`, `/parent/dashboard`, `/terms`, `/privacy` → HTTP 200.

**Code / behavior review:**

| Check | Result |
|-------|--------|
| Signup full panel (D.2) | PASS — `FullPolicyAcceptancePanel` + open button |
| Submit disabled until panel accepted | PASS — `preSignupPolicyCompleted` |
| Hebrew text, no guardian wording | PASS — grep clean |
| Links to `/terms`, `/privacy` (informational on login mode) | PASS |
| No `/parent-consent` route | PASS |
| Dashboard gate inline full panel (D.2) | PASS — `ParentPolicyAcceptanceGate.jsx` |
| Gate intro + open panel button | PASS |
| Status load failure → retry panel (not blank) | PASS — D.1 fix |
| POST failure → error message, gate remains | PASS |
| No bypass when not accepted | PASS — children not rendered until `accepted` |
| Student login not gated | PASS — unchanged |

**Note:** Signup panel and dashboard gate are client-rendered; not visible in static HTML prerender (expected for Next.js CSR on these pages).

**Manual UI recommended before launch:** signup full panel + scroll/checkbox + dashboard gate in browser (requires parent credentials).

---

## Version re-acceptance

1. Bump `TERMS_VERSION` and/or `PRIVACY_VERSION` in `sitePolicies.he.js`.
2. Latest DB row no longer matches → `accepted: false`.
3. Dashboard gate on next visit.
4. New accept → new append-only row; old rows remain.

**Simulated in API smoke:** `isCurrentPolicyAccepted({ terms_version: '1999-01-01', ... })` → false (no code bump left in repo).

---

## Signup / email verification limitation

- Session immediately after `signUp` → acceptance stored via POST (`source: parent_signup`).
- Email confirmation required, no session → acceptance collected on dashboard gate after first login.

---

## Failure behavior (Phase D.1)

| Scenario | Behavior |
|----------|----------|
| Migration missing | GET/POST → 500; gate shows error + «נסו שוב» (no blank crash) |
| API 500 on status | Error panel with retry; dashboard header/logout still visible |
| POST fails | Error under gate; user can retry accept |
| Network fail | Same as API fail |
| Not accepted | Dashboard content hidden; no infinite refetch loop |

---

## Intentionally not included

- Guardian/parent identity checkbox
- `/parent-consent` route
- Child/student acceptance gate
- Subscription/payment or auto-deletion
- ENV / Vercel changes
- Raw IP storage
- Engine, report, Copilot logic changes
- `ParentReportImportantDisclaimer` changes

---

## Privacy copy change

One bullet added under Privacy → «אילו נתונים נאספים» for acceptance version/timestamp.

---

## Files (Phase D + D.1 + D.2)

| File | Role |
|------|------|
| `supabase/migrations/018_parent_policy_acceptances.sql` | DDL |
| `lib/parent-server/policy-acceptance.server.js` | Server logic |
| `lib/parent-client/policy-acceptance-api.js` | Browser API helpers |
| `pages/api/parent/policy-acceptance/status.js` | GET |
| `pages/api/parent/policy-acceptance/accept.js` | POST |
| `components/parent/ParentPolicyAcceptanceGate.jsx` | Dashboard gate (D.2 full panel) |
| `components/parent/FullPolicyAcceptancePanel.jsx` | Reusable scroll + confirm panel (D.2) |
| `components/legal/PolicySectionsBody.jsx` | Shared policy section renderer (D.2) |
| `data/legal/fullPolicyAcceptanceContent.js` | Assembled document from `SITE_POLICIES` (D.2) |
| `pages/parent/login.js` | Signup open-panel flow (D.2) |
| `pages/parent/dashboard.js` | Gate wrapper |
| `scripts/legal/policy-acceptance-api-smoke.mjs` | API smoke (D.1) |

---

## Remaining launch blockers (policy acceptance)

1. **Manual browser QA** — signup full panel (scroll + checkbox) + dashboard gate with real parent account.
2. **Production migration** — confirm same SQL on prod project if not LEO-KID.
3. **Owner/legal review** of policy copy (separate from acceptance mechanism).

---

## Verification checklist

- [x] Migration reviewed
- [x] Migration applied (LEO-KID dev)
- [x] Parent ID mapping confirmed
- [x] API smoke PASS
- [x] UI code review PASS
- [x] `npm run build` PASS
- [x] Phase D.2 full panel UX implemented
- [x] `npm run build` PASS (D.2)
- [ ] Manual browser signup full panel + gate QA (owner)
