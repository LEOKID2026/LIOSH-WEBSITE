# LEO K – Kids Games & Learning (Next.js)

This folder is a minimal Next.js project that matches the structure you described:

- Home page
- Entry page for main arcade games
- Entry page for offline (same-device) games
- Entry page for learning games
- 6 main games
- 4 offline games
- 3 learning games

**Parent reports (pipeline & tests):** [docs/PARENT_REPORT.md](docs/PARENT_REPORT.md)

## Routes

- `/` – Home
- `/game` – Main games hub (uses your existing **game.js** gallery)
- `/offline` – Offline games hub
  - `/offline/tic-tac-toe`
  - `/offline/rock-paper-scissors`
  - `/offline/tap-battle` (stub)
  - `/offline/memory-match` (stub)
- `/learning` – Learning hub
  - `/learning/math-master` (stub)
  - `/learning/geometry-master` (full code copied)
  - `/learning/english-master` (full code copied)
- Solo Leo games: `/student/solo-games/*` (10 games) and hub `/game`

Legacy `/mleo-*` pages were removed from the site (archived under `archive/deprecated-mleo-games/`).

## Where I already pasted your existing code

These pages already contain the full code from your current project:

- `pages/game.js` – the gallery from `/game`
- `pages/offline/tic-tac-toe.js`
- `pages/offline/rock-paper-scissors.js`
- `pages/learning/english-master.js`
- `pages/learning/geometry-master.js`

They still expect:

- `components/Layout`
- `hooks/useIOSViewportFix`

Both exist here as simple versions so everything builds.
You can replace them later with the more advanced versions from your main sites.

## Pages you need to fill yourself

- `pages/offline/tap-battle.js`
- `pages/offline/memory-match.js`
- `pages/learning/math-master.js`

Each one has a clear `TODO` where you can paste your existing code.

## How to use

1. Create a new Next.js project or download this folder as-is.
2. Run:

   ```bash
   npm install
   npm run dev
   ```

3. Start replacing the stub pages with your real game code, and adjust the design / texts as you like.
