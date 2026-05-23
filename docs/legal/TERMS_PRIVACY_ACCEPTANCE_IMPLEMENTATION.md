# Terms + Privacy Acceptance — Phase D Implementation

**Date:** 2026-05-23  
**Phase D.1 verification:** 2026-05-23 — **PASS** (dev DB + API smoke)  
**Phase D.2:** 2026-05-23 — full policy acceptance panel (replaces weak checkbox-only UX)  
**Phase D.2B:** 2026-05-23 — auto-forced full policy window + Hebrew auth errors (real browser fix)  
**Phase D.2C:** 2026-05-23 — page scroll (no nested scroll trap / left scrollbar) — **rejected in real browser**  
**Phase D.2D:** 2026-05-23 — eliminate internal scroll completely (`overflow-x-hidden` CSS trap fix)  
**Phase D.2F:** 2026-05-23 — policy API route availability + fail-closed gate (stale-server root cause)  
**Phase D.2G:** 2026-05-23 — operational hardening + version re-acceptance proof  
**Phase D.2H:** 2026-05-24 — **global** Terms/Privacy version bump (`2026-05-23` → `2026-05-24`)  
**Status:** code + dev migration applied; production migration = owner apply same SQL

---

## Policy version source of truth

File: `data/legal/sitePolicies.he.js`

| Constant | Purpose |
|----------|---------|
| `POLICY_LAST_UPDATED` | Display date on legal pages |
| `TERMS_VERSION` | Acceptance audit id for Terms (**active: `2026-05-24`**) |
| `PRIVACY_VERSION` | Acceptance audit id for Privacy (**active: `2026-05-24`**) |

When Terms or Privacy change materially, bump the relevant version constant(s). Existing parents will be prompted to re-accept on next dashboard visit.

**Official re-acceptance mechanism (Phase D.2G — do not delete rows):**

- Bump `TERMS_VERSION` and/or `PRIVACY_VERSION` in `data/legal/sitePolicies.he.js`.
- Rebuild and redeploy (or restart local server after clean build).
- Parents with an older acceptance row see the full policy panel again automatically.
- Accepting inserts a **new append-only row**; prior rows remain in `parent_policy_acceptances`.
- **Do not** globally `DELETE` acceptance rows for normal policy updates — that bypasses audit history and is for QA/dev reset only.

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
| Signup mode | **Auto-shows** full policy window (no open button). Form hidden until acceptance completed. |
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

## Phase D.2B — Auto-forced policy window + Hebrew auth (2026-05-23)

### Real browser issues found (D.2 rejection)

1. **English auth errors** — Supabase `Invalid login credentials` was shown raw in the UI (`הכניסה נכשלה: Invalid login credentials`).
2. **Teaser gate, not forced window** — Dashboard gate showed a short intro + «פתחו וקראו…» button; parents could reach the dashboard header without reading policy content.
3. **Signup “open policy” button** — Signup required clicking a button to open the panel instead of auto-showing the full policy window.

### Fixes applied

| Area | D.2B behavior |
|------|----------------|
| Auth errors | `lib/parent-client/parent-auth-errors.he.js` maps Supabase/provider strings to safe Hebrew (e.g. `Invalid login credentials` → `פרטי ההתחברות שגויים…`). |
| Dashboard gate | `ParentPolicyAcceptanceGate` **auto-renders** `FullPolicyAcceptancePanel` immediately when `accepted === false`. No teaser / open button. Entire dashboard (header + content) wrapped inside gate. |
| Decline | `PolicyAcceptanceDeclinedBlock` — Hebrew message `לא ניתן להמשיך לאזור ההורים…`; only «קראו שוב» or «יציאה והחזרה למסך הכניסה» (logout). |
| Signup | Switching to **הרשמה** auto-shows full policy window; signup form hidden until scroll + checkbox + accept. No standalone open button. |
| Login redirect | Successful login → `/parent/dashboard` → gate auto-shows full window if versions not accepted. |

### Decline behavior (D.2B)

| Context | Result |
|---------|--------|
| Dashboard | Declined block; dashboard content not rendered; logout returns to `/parent/login`. |
| Signup | Declined block with signup-specific message; «חזרה למסך הכניסה» switches to login tab. |

### Browser validation (D.2B smoke)

**Script:** `scripts/legal/policy-acceptance-browser-smoke.mjs`  
**Run:** `npm run build` → `npx next start -p 3108` → `node --env-file=.env.local scripts/legal/policy-acceptance-browser-smoke.mjs --base http://localhost:3108`

**Result:** **PASS** (2026-05-23)

| Scenario | Result |
|----------|--------|
| A — Wrong credentials | Hebrew error shown; no English `Invalid login credentials` |
| B — Unaccepted parent login | Full policy window auto-shown; dashboard hidden; decline blocks; scroll + checkbox + accept unlocks; refresh stays unlocked |
| C — Version mismatch | Unit check: stale versions → not accepted (no repo version bump) |
| D — Signup | Full policy window auto-shown; no open button; decline blocks signup form |

**Playwright spec (optional):** `tests/e2e/parent-policy-acceptance-d2b.spec.ts`

### DB / API changes in D.2B

**None.**

---

## Phase D.2C — Page scroll / scroll-trap fix (2026-05-23)

### Real browser issue (D.2B rejection)

The full policy panel used an internal `overflow-y: auto` region with `max-height`, `overscroll-contain`, and RTL direction. In the browser this caused:

- Mouse wheel / trackpad feeling **stuck** when the cursor was over the policy area
- An **internal scrollbar on the left** (RTL nested scroll)
- Scroll not chaining naturally to the page

### Fix

`FullPolicyAcceptancePanel` now uses **normal page/document scroll**:

| Before (D.2B) | After (D.2C) |
|---------------|--------------|
| Nested `overflow-y-auto` + `max-h-[…vh]` | No nested scroll container |
| IntersectionObserver `root` = inner div | IntersectionObserver `root: null` (viewport) + window scroll listener |
| Footer pinned below fixed-height scroll box | Footer flows at bottom of inline page content |
| `overscroll-contain` scroll trap | Removed — page scroll chains naturally |

Bottom detection: bottom sentinel (`data-policy-bottom-sentinel`) + viewport IntersectionObserver + `window.scroll` / `resize`.

Panel marker: `data-policy-scroll-mode="page"`.

Approval rules unchanged: scroll to bottom + confirmation checkbox → enable **אני מסכים/ה וממשיך/ה**.

### Browser validation (D.2C)

**Result:** **PASS** (2026-05-23, same smoke script)

| Check | Result |
|-------|--------|
| Full policy visible immediately on dashboard | PASS |
| No nested max-height scroll trap in panel | PASS |
| Checkbox disabled until page scrolled to bottom | PASS |
| Approve disabled until checkbox checked | PASS |
| Decline blocks; accept unlocks; refresh stays unlocked | PASS |
| Signup auto-forces full panel; Hebrew errors | PASS (carried from D.2B) |

### DB / API changes in D.2C

**None.** (Rejected in real browser — internal scrollbar still visible.)

---

## Phase D.2D — Eliminate internal scroll completely (2026-05-23)

### Why D.2C was rejected

Real browser screenshot showed a **left-side internal scrollbar** inside the policy card and wheel/trackpad still trapped when the cursor was over the policy area. Root cause: **`overflow-x-hidden` on the content wrapper** — per CSS, when `overflow-x` is `hidden`/`clip`, computed `overflow-y` becomes `auto`, creating an implicit nested scroll box (worse in RTL = scrollbar on the left).

D.2C smoke did not catch this because it only checked explicit `overflow-y-auto` classes, not computed styles from `overflow-x-hidden`.

### D.2D fix

| Removed | Replaced with |
|---------|----------------|
| `overflow-y-auto`, `max-h-[…vh]`, `overscroll-contain`, `overflow-hidden` on card | Normal block layout — no overflow classes |
| `overflow-x-hidden` on policy content | `break-words` / `min-w-0` only |
| Single card with header / scroll region / footer | Three stacked blocks in **one page flow**; sentinel immediately before checkbox |
| `data-policy-scroll-mode="page"` | `data-policy-scroll-mode="page-only"` + `data-policy-acceptance-root` |

**Acceptance criterion:** exactly **one** vertical scrollbar — the browser window scrollbar (far right). No internal scrollboxes inside `[data-policy-acceptance-root]`.

### Browser validation (D.2D)

**Script:** `scripts/legal/policy-acceptance-browser-smoke.mjs` (strict computed-style audit)

**Result:** **PASS** (2026-05-23)

| Check | Result |
|-------|--------|
| No `overflow-x: hidden` inside acceptance root | PASS — audit |
| No computed `overflow-y: auto/scroll` inside root | PASS — audit |
| No `max-height` / fixed height scroll traps | PASS — audit |
| Page document height ~9109px (natural page scroll) | PASS |
| Checkbox/approve gating + decline/accept flows | PASS |
| Screenshot | `reports/legal/policy-acceptance-d2d-scroll.png` |

### DB / API changes in D.2D

**None.**

---

## Phase D.2F — Policy API availability + fail-closed gate (2026-05-23)

### Stale-server root cause (critical)

Symptoms in browser console:

- `/api/parent/policy-acceptance/status` → **404**
- Client tried to parse HTML 404 as JSON (`Unexpected token '<'…`)
- Dashboard could appear to “work” while policy gate was broken

**Root cause:** `run.bat` previously **reused** an existing listener on port **3002** without restarting. That process served an **old `.next` build** that did not include new API routes (`policy-acceptance/*`, and sometimes `list-students`).

**Not the cause:** DB reset, wrong route path, wrong repo, missing SQL.

### D.2F client/gate fix

| File | Fix |
|------|-----|
| `lib/parent-client/policy-acceptance-api.js` | Check `Content-Type`; never parse HTML as JSON; Hebrew-safe errors |
| `components/parent/ParentPolicyAcceptanceGate.jsx` | `statusChecked` flag — children only when valid status returns `accepted: true`; Hebrew retry panel on any failure |

### DB / API changes in D.2F

**None.**

---

## Phase D.2G — Operational hardening + version re-acceptance proof (2026-05-23)

### Stale-server prevention

| Change | Purpose |
|--------|---------|
| `run.bat` | **Removed silent reuse.** Always stops existing Node on port 3002, then starts fresh `next dev -p 3002`. |
| `scripts/dev/restart-local-3002.bat` | Safe path after API/route changes: kill port → delete `.next` → `npm run build` → `next start -p 3002`. |

**Safe local restart (recommended after policy/API work):**

```bat
scripts\dev\restart-local-3002.bat
```

Or manually:

```powershell
# stop Node on 3002, then:
Remove-Item -Recurse -Force .next
npm run build
npx next start -p 3002
```

**Owner browser testing:** use `http://localhost:3002` on a **freshly restarted** local server — not an old Vercel tab or a stale `run.bat` reuse session.

### Version bump re-acceptance proof

**Script:** `scripts/legal/policy-acceptance-version-reaccept-smoke.mjs`

**Result:** **PASS** (2026-05-23)

| Step | Result |
|------|--------|
| Parent accepted on baseline `TERMS_VERSION=2026-05-23` | PASS |
| Temp bump to `2026-05-23-d2g-test` + rebuild | PASS |
| Status API → `accepted: false` | PASS |
| Dashboard hidden; full policy panel auto-shown | PASS |
| Accept → dashboard unlocks; refresh stays unlocked | PASS |
| DB: **2 rows** — old `2026-05-23` row **preserved**; new `2026-05-23-d2g-test` row inserted | PASS |
| `TERMS_VERSION` reverted to `2026-05-23` in repo | PASS |

### Fail-closed re-check (D.2G)

Simulated HTML 404 on status API during browser login:

| Check | Result |
|-------|--------|
| Dashboard content hidden | PASS |
| Hebrew message + `נסו שוב` | PASS |
| No JSON parse crash | PASS |
| No English user-facing error | PASS |

### Scroll re-check on fresh latest local build (D.2G)

Strict D.2D computed-style audit inside version-bump browser flow:

| Check | Result |
|-------|--------|
| `data-policy-scroll-mode="page-only"` | PASS |
| No internal `overflow-y: auto/scroll` inside acceptance root | PASS |
| No `overflow-x: hidden` trap inside root | PASS |
| Single page scrollbar (document scroll only) | PASS |

### API curl (fresh `next start -p 3002`, no auth)

| Route | Expected | Result |
|-------|----------|--------|
| `GET /api/parent/policy-acceptance/status` | 401 JSON | PASS |
| `POST /api/parent/policy-acceptance/accept` | 401 JSON | PASS |
| `GET /api/parent/list-students` | 401 JSON | PASS |

### DB / API / ENV changes in D.2G

**None** (operational scripts + docs only; version bump test was temporary and reverted).

---

## Phase D.2H — Global version bump (`2026-05-23` → `2026-05-24`) (2026-05-24)

### What changed (kept — not reverted)

File: `data/legal/sitePolicies.he.js`

| Constant | Old | New (active) |
|----------|-----|--------------|
| `POLICY_LAST_UPDATED` | `2026-05-23` | `2026-05-24` |
| `TERMS_VERSION` | `2026-05-23` | `2026-05-24` |
| `PRIVACY_VERSION` | `2026-05-23` | `2026-05-24` |

**No rows deleted.** This is the official global “reset” for all parents — bump versions only.

### Status logic (verified)

`resolveParentPolicyAcceptanceStatus()` / `isCurrentPolicyAccepted()`:

- Loads **latest** row by `accepted_at`.
- Returns `accepted: true` only when `terms_version === TERMS_VERSION` **and** `privacy_version === PRIVACY_VERSION`.
- Parent with only `2026-05-23` row → `accepted: false`.
- Parent with no rows → `accepted: false`.

### Validation script

`scripts/legal/policy-acceptance-global-version-d2h.mjs`  
Report: `reports/legal/policy-acceptance-d2h-global-bump.json`

**Result:** **PASS** (2026-05-24)

| Parent | Status after bump | DB rows (append-only) |
|--------|-------------------|------------------------|
| `18eran@gmail.com` (`be71653c-…`) | `accepted: false` — must re-accept | 1 row: `2026-05-23` preserved |
| `admin@admin.com` (`05c73a19-…`) | `accepted: true` — already re-accepted during prior QA | 2 rows: `2026-05-23` + `2026-05-24` both preserved |
| Synthetic parent (old version only) | Full browser: gate → scroll → decline/accept → dashboard | 2 rows after accept; old row not deleted |

### Browser (synthetic old-version parent)

| Check | Result |
|-------|--------|
| Dashboard hidden until accept | PASS |
| Full policy panel auto-shown | PASS |
| Page-only scroll (no internal scrollbar) | PASS |
| Decline blocks | PASS |
| Accept inserts `2026-05-24` row | PASS |
| Refresh stays unlocked | PASS |

**Owner account `18eran@gmail.com`:** status API confirms gate will block dashboard on next login (no password in repo for automated browser — manual login on `localhost:3002` will show the full policy screen).

### DB / API / ENV changes in D.2H

**None** beyond version constants in `sitePolicies.he.js`. No schema changes. No global `DELETE`.

---

## איך מחייבים את כל ההורים לאשר מחדש

כאשר תנאי השימוש ו/או מדיניות הפרטיות מתעדכנים materially:

1. **עדכנו גרסאות בקוד** — `data/legal/sitePolicies.he.js`:
   - `POLICY_LAST_UPDATED` (תאריך תצוגה)
   - `TERMS_VERSION` ו/או `PRIVACY_VERSION` (מזהי audit — חובה להעלות גרסה)
2. **אל תמחקו שורות** מ-`parent_policy_acceptances`. הטבלה append-only; שורות ישנות נשארות כהיסטוריית audit.
3. **בנו מחדש ופרסמו** (או הפעילו מחדש שרת מקומי אחרי build):
   - `scripts\dev\restart-local-3002.bat` (מקומי)
   - deploy ל-Vercel/production (בבעלות — מחוץ לסCOPE של שלב זה)
4. **התנהגות לאחר deploy:**
   - הורה whose latest row **אינו** תואם ל-`TERMS_VERSION` + `PRIVACY_VERSION` הנוכחיים → `accepted: false`
   - בכניסה ל-`/parent/dashboard` — **מסך אישור מלא** (גלילת דף + תיבת סימון + אישור)
   - אין `/parent-consent`, אין checkbox זהות הורה, אין כפתור «פתחו מדיניות»
5. **לאחר אישור:** INSERT של שורה חדשה עם הגרסאות הנוכחיות; שורות קודמות **נשמרות**.
6. **אין מנגנון «איפוס גלובלי» באמצעות DELETE** — רק bump גרסה.

---

## Phase D.1 UI smoke results (superseded for signup/gate UX by D.2 / D.2B / D.2C / D.2D)

**Static routes:** `/parent/login`, `/parent/dashboard`, `/terms`, `/privacy` → HTTP 200.

**Code / behavior review:**

| Check | Result |
|-------|--------|
| Signup full panel auto-forced (D.2B) | PASS — הרשמה tab opens panel immediately |
| Dashboard gate auto full panel (D.2B) | PASS — no teaser / open button |
| Hebrew auth errors (D.2B) | PASS — `mapParentAuthError` |
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

## Failure behavior (Phase D.1 / D.2F fail-closed)

| Scenario | Behavior |
|----------|----------|
| Migration missing | GET/POST → 500; gate shows Hebrew error + «נסו שוב» (no blank crash) |
| API 404 / HTML / non-JSON on status | **Dashboard content hidden**; Hebrew retry panel; no JSON parse crash; no English user-facing error |
| API 500 on status | Same fail-closed retry panel |
| POST fails | Error under full policy panel; user can retry accept |
| Network fail | Same fail-closed retry panel |
| Not accepted (incl. version mismatch) | Dashboard content hidden; full policy panel auto-shown |

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

## Files (Phase D + D.1 + D.2 + D.2B)

| File | Role |
|------|------|
| `supabase/migrations/018_parent_policy_acceptances.sql` | DDL |
| `lib/parent-server/policy-acceptance.server.js` | Server logic |
| `lib/parent-client/policy-acceptance-api.js` | Browser API helpers |
| `lib/parent-client/parent-auth-errors.he.js` | Hebrew auth error mapping (D.2B) |
| `pages/api/parent/policy-acceptance/status.js` | GET |
| `pages/api/parent/policy-acceptance/accept.js` | POST |
| `components/parent/ParentPolicyAcceptanceGate.jsx` | Auto-forced dashboard gate (D.2B) |
| `components/parent/FullPolicyAcceptancePanel.jsx` | Scroll + confirm panel |
| `components/parent/PolicyAcceptanceDeclinedBlock.jsx` | Decline blocked state (D.2B) |
| `components/legal/PolicySectionsBody.jsx` | Shared policy section renderer |
| `data/legal/fullPolicyAcceptanceContent.js` | Assembled document from `SITE_POLICIES` |
| `pages/parent/login.js` | Signup auto-panel + Hebrew errors (D.2B) |
| `pages/parent/dashboard.js` | Gate wraps all dashboard content (D.2B) |
| `scripts/legal/policy-acceptance-api-smoke.mjs` | API smoke (D.1) |
| `scripts/legal/policy-acceptance-browser-smoke.mjs` | Browser smoke (D.2B/D.2D) |
| `scripts/legal/policy-acceptance-global-version-d2h.mjs` | Global bump validation (D.2H) |
| `reports/legal/policy-acceptance-d2h-global-bump.json` | D.2H DB/status report |
| `scripts/dev/restart-local-3002.bat` | Safe clean rebuild + prod server on 3002 (D.2G) |
| `run.bat` | Dev launcher — stops stale Node on 3002 before start (D.2G) |
| `tests/e2e/parent-policy-acceptance-d2b.spec.ts` | Playwright spec (D.2B) |

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
- [x] Phase D.2D page-only scroll (no overflow-x-hidden trap)
- [x] D.2D strict browser audit PASS
- [x] Phase D.2F fail-closed gate + API route availability PASS
- [x] Phase D.2G stale-server hardening + version re-acceptance proof PASS
- [x] Phase D.2H global bump `2026-05-24` + append-only re-accept PASS
- [x] `npm run build` PASS (D.2H)
- [ ] Manual browser: `18eran@gmail.com` login on fresh `localhost:3002` (owner password not in repo)
