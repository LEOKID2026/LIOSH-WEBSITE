# דוח העברת Leo Miners — Leo Kids TRY

**תאריך:** 2026-07-06  
**מקור:** `MLEO-GAME/game/mleo-miners.js` → `LEO-KIDS-WEB-TRY`

---

## קבצים שנוצרו

### Migration (לא הורץ)
- `supabase/migrations/095_leo_miners_foundation.sql`

### Server lib
- `lib/leo-miners/leo-miners-constants.js`
- `lib/leo-miners/leo-miners-economy.client.js`
- `lib/leo-miners/leo-miners-formulas.client.js`
- `lib/leo-miners/leo-miners-gameplay-config.client.js`
- `lib/leo-miners/server/leo-miners-default-settings.js`
- `lib/leo-miners/server/leo-miners-admin-config.server.js`
- `lib/leo-miners/server/leo-miners-errors.server.js`
- `lib/leo-miners/server/leo-miners-formulas.server.js`
- `lib/leo-miners/server/leo-miners-config.server.js`
- `lib/leo-miners/server/leo-miners-guards.server.js`
- `lib/leo-miners/server/leo-miners-state.server.js`
- `lib/leo-miners/server/leo-miners-accrue.server.js`
- `lib/leo-miners/server/leo-miners-claim.server.js`

### API routes
- `pages/api/student/leo-miners/state.js`
- `pages/api/student/leo-miners/save-state.js`
- `pages/api/student/leo-miners/accrue.js`
- `pages/api/student/leo-miners/claim.js`
- `pages/api/student/leo-miners/reset.js`

### UI
- `components/leo-miners/LeoMinersGame.jsx`
- `components/leo-miners/LeoMinersShell.jsx`
- `components/admin/games/AdminLeoMinersConfigTab.jsx`
- `pages/admin/games/leo-miners.js`
- `pages/api/admin/leo-miners/config.js`
- `pages/student/solo-games/leo-miners.js`
- `pages/dev/leo-miners-prototype.js`

### Assets
- `public/images/leo-miners/*`
- `public/sounds/leo-miners/*`

### Scripts (transform/fix)
- `scripts/transform-leo-miners-game.mjs`
- `scripts/cleanup-leo-miners-game.mjs`
- `scripts/final-fix-leo-miners-game.mjs`
- `scripts/fix-leo-miners-game-final.mjs`

---

## קבצים ששונו
- `lib/solo-games/solo-game-registry.js` — metadata `leo-miners`
- `pages/_app.js` — route מוגן `/student/solo-games/leo-miners`

---

## Migration `095_leo_miners_foundation.sql`

**מספר:** 095 (אחרי 094)

**כולל:**
- `leo_miners_state`, `leo_miners_accrue_log`, `leo_miners_claim_log`, `leo_miners_config`
- `site_game_catalog` row ל-`leo-miners` עם **`is_enabled = false`**, **`hub_route = '/game'`**
- `reward_economy_solo_game_rules` עם **`is_active = false`**
- `leo_miners_config.is_active = false`, `settings_json.enabled = false`
- `leo_miners_config.id` — default קבוע `'00000000-0000-4000-8000-000000000095'` (תואם singleton check)

### תיקוני pre-SQL (2026-07-06)

| נושא | תיקון |
|------|--------|
| `hub_route` | `/student/solo-games` → **`/game`** — hub solo רשmi ב-`lib/games/game-catalog.constants.js` (`CATEGORY_HUB_ROUTES.solo`); תואם `backHref` במשחק |
| `leo_miners_config.id` | default `gen_random_uuid()` → **`'00000000-0000-4000-8000-000000000095'::uuid`** — מונע כשל insert בלי id מפורש |
| `game_key` constraints | רשימה = migration **076** (12 משחקים) + **`leo-miners`** — זהה ל-`SOLO_GAME_KEYS` ב-`solo-game-registry.js`; **לא** הוסר שום key |

**למה אין סיכון ל-constraints:** המיגרציה רק **מרחיבה** את הרשימה מ-076; אין משחק solo ב-TRY שלא ברשימה. דפוס הפרויקט (075, 076, 089…) הוא allowlist ידני — אין migration דינamic אחר ב-repo. משחקים קיימים ב-DB עם keys מהרשימה הישנה ימשיכו לעבור; sessions/rules חדשים ל-`leo-miners` יאושרו רק אחרי הרצה.

**Re-run בטוח:** `leo_miners_config` — `on conflict do nothing`. `site_game_catalog` / `reward_economy_solo_game_rules` — `on conflict do update` מעדכן metadata בלבד (**לא** דורס `is_enabled` / `is_active` אם כבר הופעלו ידנית).

**רשימת solo keys (13):** `catcher`, `puzzle`, `memory`, `flyer`, `leo-jump`, `balloons`, `maze`, `picture-puzzle`, `target-tap`, `sort-shapes`, `smart-blocks`, `fruit-slice`, **`leo-miners`** (חדש).

**הערה:** solo games ישנים ב-catalog עדיין מציגים `hub_route = '/student/solo-games'` (071–076). רק `leo-miners` נרשם עם `/game`. הקוד ב-runtime משתמש ב-`CATEGORY_HUB_ROUTES.solo = '/game'` לניווט hub — לא תלוי ב-hub_route מה-DB לכל משחק.

---

## Assets

### הועתקו (מ-`LEO-KIDS/public`)
| קובץ | סטטוס |
|------|--------|
| `bg-cave.png`, `bg-cave2.png`, `bg-cave3.png` | ✅ |
| `leo-miner-4x.png`, `rock.png`, `silver.png` | ✅ |
| `coin3.png`, `coin4.png` | ✅ (coin4 גם כ-`spawn-icon.png`) |
| `click.mp3`, `merge.mp3`, `rock.mp3`, `gift.mp3`, `bg-music.mp3` | ✅ |

### חסרים (dev-only / לא קריטי)
- `bg-cave1`, `bg-cave4`–`bg-cave6`, `rock1`–`rock6` — רק ל-dev picker; fallback לברירת מחדל

---

## מה הוסר מהקריפטו
- wagmi, RainbowKit, viem, WalletConnect, BSC, testnet, TGE
- wallet connect/disconnect, on-chain claim, vault-to-wallet
- terms/crypto modals, TGE countdown, wallet release bar
- local `MINING_LS` / wallet mining state

---

## איך לפתוח

| URL | תיאור |
|-----|--------|
| `/student/solo-games/leo-miners` | route רשmi — `GameAccessGuard` solo + `leo-miners` |
| `/dev/leo-miners-prototype` | אבטיפוס — ללא access guard (לבדיקות מקומיות) |
| חזרה | `/game` (solo hub) |

**לפני SQL:** משחק playable מ-localStorage; banner `miners_db_not_ready`; claim/accrue API → 503/403; **אין** toast מטבעות מזויפים מהשרת.

**אחרי SQL + enable:**
1. הרץ `supabase/migrations/095_leo_miners_foundation.sql`
2. `UPDATE leo_miners_config SET is_active = true, settings_json = jsonb_set(settings_json, '{enabled}', 'true');`
3. `UPDATE site_game_catalog SET is_enabled = true WHERE game_key = 'leo-miners';`
4. E2E: state → accrue → claim → מטבעות/יהלומים דרך `applyArcadeCoinMove` / `applyDiamondMove`

**Hub `/game`:** leo-miners **לא** מופיע עד `site_game_catalog.is_enabled = true`.

---

## Admin + gameplay tuning (אחרי SQL אחד)

**Admin UI:** `/admin/games/leo-miners`  
**Admin API:** `GET/POST /api/admin/leo-miners/config`

### שליטה מ-Admin (ללא migration נוסף)

| קבוצה | דוגמאות |
|--------|---------|
| הפעלה | `enabled`, `economy_enabled`, `accrue_enabled`, `claim_enabled`, catalog, solo rule |
| כלכלה / caps | daily points/coins, ratio, softcut, stage_blocks, guest caps |
| Gameplay tuning | `base_dps`, `rock_base_hp`, `spawn_initial_cost`, `auto_dog_interval_sec`, … |

**Admin controls משפיעים גם על client gameplay tuning אחרי refresh:**  
`/api/student/leo-miners/state` מחזיר `config.gameplayTuning` → `LeoMinersShell` → `LeoMinersGame` (hydrate בטעינת דף). שינוי ב-Admin + F5 משנה:

- DPS כלבים (`base_dps`, `level_dps_multiplier`)
- HP סלעים (`rock_base_hp`, `rock_hp_multiplier`)
- מטבעות מסלע (`gold_factor`)
- מחיר spawn + מכפיל (`spawn_initial_cost`, `spawn_cost_multiplier`) — למשחק חדש / fresh state
- שדרוגי DPS/GOLD (`dps_upgrade_multiplier`, `gold_upgrade_multiplier`)
- Auto-dog (`auto_dog_interval_sec`, `auto_dog_bank_cap`)

אין live-update תוך כדי משחק — רק אחרי רענון (by design).

### נשאר בקבצים בלבד (לא Admin)

- `LANES`, `SLOTS_PER_LANE`, `MAX_MINERS`, `LANE_CENTER_Y_FRACS`
- canvas layout, merge loop, belt animation
- assets, SFX paths, טקסטים עברית/אנגלית ב-HUD
- `GIFT_PHASES`, `DIAMOND_PRIZES`, dev bg/rock picker
- `minerScale`, `minerWidth` (גודל ספרייט)

### דורש SQL חדש רק אם

- טבלה/עמודה חדשה, `game_key` חדש, סוג claim/action חדש

---

## בדיקות שרצו

| בדיקה | תוצאה |
|-------|--------|
| `git status` | קבצים חדשים/מעודכנים — ראה git |
| grep crypto (components/leo-miners) | ✅ אפס התאמות wagmi/wallet/MLEO |
| read_lints על קבצי UI | ✅ ללא שגיאות |
| `npm run lint` | ❌ אין script lint בפרויקט |
| pre-SQL review (095 + דוח) | ✅ hub_route, config id default, allowlist vs 076/registry |

---

## SQL להרצה ידנית

```
supabase/migrations/095_leo_miners_foundation.sql
```

---

## E2E צפוי אחרי SQL + enable

**כן** — בתנאי:
- migration הורץ בהצלחה
- `leo_miners_config.is_active = true` + `enabled = true`
- `site_game_catalog.is_enabled = true` ל-`leo-miners`
- תלמיד מחובר עם גישת solo

---

## בעיות שנותרו

1. **Monolith ~3K שורות** — refactor עתידי אחרי E2E
2. **חלק מה-HUD/modals באנגלית** — how-to, GAIN modal, HUD info (לא blocker פונקציונלי)
3. **Dev rock/bg variants חסרים** — dev picker נופל ל-default
4. **API `assertStudentCanPlayGame`** — גם אחרי SQL, accrue/claim חסומים עד enable catalog (403) — by design
5. **לא הורץ build מלא** — אין `lint` script; מומלץ smoke ידני ב-dev server

---

## לא בוצע (לפי תוכנית)
- commit / push
- הרצת SQL
- שינוי `package.json`
