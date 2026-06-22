# Site Map And Protection Audit (Read-Only)

Scope: route mapping from `pages/` and `pages/api/` only.  
No code changes performed.

## Parent-Facing Pages
- `/parent/login` -> `pages/parent/login.js`
- `/parent/dashboard` -> `pages/parent/dashboard.js`
- `/parent/rewards` -> `pages/parent/rewards.js`

## Student-Facing Pages
- `/student/login` -> `pages/student/login.js`
- `/student/home` -> `pages/student/home.js`
- `/student/arcade` -> `pages/student/arcade.js`
- `/student/games/bingo` -> `pages/student/games/bingo.js`
- `/student/games/checkers` -> `pages/student/games/checkers.js`
- `/student/games/chess` -> `pages/student/games/chess.js`
- `/student/games/dominoes` -> `pages/student/games/dominoes.js`
- `/student/games/fourline` -> `pages/student/games/fourline.js`
- `/student/games/ludo` -> `pages/student/games/ludo.js`
- `/student/games/snakes-and-ladders` -> `pages/student/games/snakes-and-ladders.js`

## Practice Pages
- `/learning` -> `pages/learning/index.js`
- `/learning/curriculum` -> `pages/learning/curriculum.js`
- `/learning/geometry-curriculum` -> `pages/learning/geometry-curriculum.js`
- `/learning/math-master` -> `pages/learning/math-master.js`
- `/learning/geometry-master` -> `pages/learning/geometry-master.js`
- `/learning/english-master` -> `pages/learning/english-master.js`
- `/learning/science-master` -> `pages/learning/science-master.js`
- `/learning/hebrew-master` -> `pages/learning/hebrew-master.js`
- `/learning/moledet-geography-master` -> `pages/learning/moledet-geography-master.js`

## Report Pages
- `/learning/parent-report` -> `pages/learning/parent-report.js`
- `/learning/parent-report-detailed` -> `pages/learning/parent-report-detailed.js`
- `/learning/parent-report-detailed.renderable` -> `pages/learning/parent-report-detailed.renderable.jsx`

## PDF/Export Routes
- Short report print/export path in `pages/learning/parent-report.js`
- Detailed report print/export controls in `pages/learning/parent-report-detailed.js`
- Renderable print/PDF support surface in `pages/learning/parent-report-detailed.renderable.jsx`
- No dedicated `/api/*pdf*` route identified in current pages/api tree.

## Parent AI / Copilot Routes
- `/api/parent/copilot-turn` -> `pages/api/parent/copilot-turn.js`

## Auth Routes
- Parent page login: `/parent/login` -> `pages/parent/login.js`
- Student page login: `/student/login` -> `pages/student/login.js`
- Student API login: `/api/student/login` -> `pages/api/student/login.js`
- Student API logout: `/api/student/logout` -> `pages/api/student/logout.js`
- Student session introspection: `/api/student/me` -> `pages/api/student/me.js`

## Dev / Simulator / Admin Routes
- `/learning/dev-student-simulator` -> `pages/learning/dev-student-simulator.js`
- `/learning/dev/engine-review` -> `pages/learning/dev/engine-review.js`
- `/learning/dev-db-report-preview` -> `pages/learning/dev-db-report-preview.js`
- `/api/dev-student-simulator/login` -> `pages/api/dev-student-simulator/login.js`
- `/api/dev-student-simulator/logout` -> `pages/api/dev-student-simulator/logout.js`
- `/api/student/dev-add-coins` -> `pages/api/student/dev-add-coins.js`
- `/api/learning-simulator/engine-review-pack-status` -> `pages/api/learning-simulator/engine-review-pack-status.js`
- `/api/learning-simulator/generate-expert-review-pack` -> `pages/api/learning-simulator/generate-expert-review-pack.js`

## Public Routes
- `/`, `/about`, `/contact`, `/gallery`, `/game`, `/games`, `/student/solo-games/*`
- `/offline`, `/offline/memory-match`, `/offline/rock-paper-scissors`, `/offline/tap-battle`, `/offline/tic-tac-toe`
- Public utility API observed: `/api/gallery`

## Routes That Must Require Parent Auth
- All `/api/parent/*` endpoints:
  - `/api/parent/create-student`
  - `/api/parent/create-student-access-code`
  - `/api/parent/list-students`
  - `/api/parent/update-student`
  - `/api/parent/students/[studentId]/report-data`
  - `/api/parent/copilot-turn` (strict mode in production)
- Parent-only pages:
  - `/parent/dashboard`
  - `/parent/rewards`
  - Parent report pages when loaded with parent scoped data

## Routes That Must Require Student Auth
- `/api/student/me`
- `/api/student/logout`
- Learning APIs:
  - `/api/learning/session/start`
  - `/api/learning/answer`
  - `/api/learning/session/finish`
  - `/api/learning/planner-recommendation`
- Arcade APIs (`/api/arcade/*`) including rooms, quick match, balance, snapshots, and game action routes
- Student-only pages:
  - `/student/home`
  - `/student/arcade`
  - `/student/games/*`

## Routes That Must Never Be Public In Production
- All `/api/parent/*`
- `/api/student/dev-add-coins`
- `/api/dev-student-simulator/*`
- `/api/learning-simulator/*` unless server-token protected
- `/learning/dev-student-simulator`
- `/learning/dev/engine-review`
- `/learning/dev-db-report-preview`
- ~~`/api/learning-supabase/health`~~ *(removed — use `GET /` for reachability checks only)*

## Risky Or Unclear Routes
- `/api/student/dev-add-coins`: dev capability with sensitive effect; must be disabled or strictly protected in production.
- `/api/learning-simulator/engine-review-pack-status`: appears gated by public feature flag, no token in current implementation path.
- ~~`/api/learning-supabase/health`~~: removed; no dedicated Supabase table health API.
- `/api/hebrew-nakdan`, `/api/hebrew-audio-*`: unauthenticated utility surface may create abuse/cost/PII risk.
- `/api/parent/copilot-turn`: multi-mode auth behavior increases configuration risk if non-production flags leak.
- `/learning/parent-report-detailed.renderable`: render-specific page requires clear production exposure policy.

## Notes
- No root Next middleware file observed in this mapping snapshot; route protection is likely enforced in page/API-level logic and server helpers.
