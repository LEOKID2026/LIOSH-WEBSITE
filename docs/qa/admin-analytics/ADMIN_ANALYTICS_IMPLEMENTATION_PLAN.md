# Admin Analytics Implementation Plan

Date: 2026-06-16

## Gate Input

Phase 0 audit: `docs/qa/admin-analytics/AUDIT_EXISTING_DATA_SOURCES.md`.

Gate decision: safe to continue to a Phase 1 DB-truth MVP. Phase 2 event tracking is intentionally deferred until the admin page clearly separates existing DB truth from not-yet-tracked metrics.

## Phase 1 MVP Scope

Add:

- `pages/admin/analytics.js`
- `pages/api/admin/analytics.js`
- `lib/admin-server/admin-analytics.server.js`

Update:

- `components/admin/AdminShell.jsx` to add an analytics nav item.
- `lib/admin-portal/admin-ui.he.js` for Hebrew admin labels, if needed.

## Routing / Security

- Use route `/admin/analytics`.
- Use API route `/api/admin/analytics`.
- Reuse `useAdminSession`, `adminAuthFetch`, and `requireAdminApiContext`.
- Use the existing service-role pattern only after admin Auth role and active admin persona entitlement are verified.
- Do not change RLS.

## Data Sources

Existing DB truth:

- `parent_profiles`
- `account_persona_entitlements`
- `parent_account_settings`
- `students`
- `student_sessions`
- `learning_sessions`
- `answers`
- `parent_assigned_activities`
- `parent_activity_status`
- `parent_activity_attempts`
- `book_reading_sessions`
- `book_page_visits`
- `coin_transactions`
- `student_coin_balances`
- worksheet tables where available

Not tracked yet:

- Parent dashboard opens.
- Parent report opens.
- Parent report PDF exports.
- Audio plays.
- Generic page/feature opens.
- Exact funnels and retention.

## Filters

The admin page and API support:

- Today.
- Last 7 days.
- Last 30 days.
- Current month.
- Custom date range.
- Grade.
- Subject.
- Active/inactive child status.

Implementation detail: date filters apply to activity rows. Grade/status filters apply through filtered student IDs. Parent totals remain global unless the metric is child-activity derived.

## Metric Contract

Every metric returned to the UI includes:

- `value`
- `label`
- `status`: `available`, `not_tracked`, `requires_events`, `unavailable`, or `partial`
- `source`: table/API source description

The UI renders:

- Numeric values only for available/partial DB-derived metrics.
- `עדיין לא נמדד` for not tracked.
- `דורש מעקב אירועים` for event-required metrics.
- `מקור נתונים חסר` for unavailable source tables.

## Phase 1 Sections

Build compact RTL sections:

- Overview cards.
- Children analytics.
- Learning analytics.
- Parent analytics.
- Parent-assigned activity analytics.
- Parent report / PDF truth analytics.
- Books / audio / explanations / worksheets.
- Rewards / coins.

## Truth Rules

- No demo data.
- No fake zeros for missing sources.
- No raw answer text sent to browser.
- Server aggregation only.
- Parent reports are compared against existing report aggregation helper where feasible; no report behavior changes.
- Inferred abandonment is labeled as candidates.

## Long-Term Analytics Foundation

The admin analytics center is implemented as a long-term owner dashboard, not a temporary MVP.

Prepared now:

- Final `analytics_events` migration in `057_admin_analytics_events.sql` (not yet applied by owner).
- Event ingestion endpoint.
- Shared server/client event helpers.
- Event catalog.
- Parent, student, learning, report, book, audio, worksheet, reward, activity, and admin event support.
- Teacher/private-teacher event support for teacher login, dashboard, report opens, activity creation, and worksheet creation.
- Owner-level account and registration growth analytics from Auth/profile/entitlement tables.
- Parent and child join-date analytics from `created_at` fields and first-learning dates.
- Permanent dashboard sections for overview, children, learning, parent behavior, parent activities, report truth, books/audio/explanations/worksheets, rewards, funnels, retention, abandonment, and feature usage.
- Permanent dashboard sections for account growth, parent join-date onboarding, child join-date/first-learning, and private-teacher analytics.

Metrics with no data show honest empty/not-enough-data states until real usage accumulates.

Out of scope for this plan: school analytics, school manager analytics, school staff analytics, school classes, and school dashboards.

## QA Plan

Add focused scripts/tests under existing conventions after the MVP implementation:

- Admin API rejects missing/non-admin token.
- Analytics API has no demo/fake placeholders.
- Missing event metrics return not-tracked metadata.
- Date range parser works.
- Server module helper tests for metric formatting/truth statuses where possible.

Full live DB truth checks require configured Supabase env and the owner-applied `057` migration.
