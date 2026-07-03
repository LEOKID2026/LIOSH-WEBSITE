---
name: leo-game-club-plan
overview: "תוכנית פיתוח V3 — מועדון המשחקים של ליאו: רצף ביצוע 0A-0D (תשתית, Admin controls, שם תצוגה, שמירת נתוני אורח) ואחריהן פרקי ביצוע 1-10 (לובי, כרטיס שחקן, חברים, הזמנות, משימות, emotes, קוסמטיקה, טורנירים, חדר אישי, Realtime)."
todos:
  - id: wave0a
    content: "0A — אכיפת הרשאות אחידה: quick-game ו-join-by-code יבדקו את אותו מקור אמת כמו create/join"
    status: completed
  - id: wave0b
    content: "0B — Admin Guest Arcade Controls: UI ב-pages/admin/guest/index.js לשליטה per-game + guest_feature_permissions"
    status: completed
  - id: wave0c
    content: "0C — שם תצוגה ציבורי: arcade_display_name לרשום ולאורח, נפרד מ-full_name ומ-leo_number"
    status: completed
  - id: wave0d
    content: "0D — Guest Link Preservation: מדיניות מה עובר מאורח לילד רשום בעת קישור להורה"
    status: completed
  - id: wave1
    content: "1 — לובי מועדון המשחקים: עיצוב, tabs, כרטיסי משחק, שם תצוגה, banner אורח"
    status: completed
  - id: wave2
    content: 2 — כרטיס שחקן + היסטוריית משחקים
    status: completed
  - id: wave3
    content: "3 — חברים בסיסיים: הוספה לפי leo_number, אישור, נוכחות"
    status: completed
  - id: wave4
    content: 4 — הזמנות למשחק + התראות
    status: completed
  - id: wave5
    content: 5 — משימות ארקייד יומיות + הישגים
    status: completed
  - id: wave6
    content: 6 — הודעות מוכנות / emotes בטוחים
    status: completed
  - id: wave7
    content: 7 — חנות קוסמטית למשחקים
    status: completed
  - id: wave8
    content: 8 — טורנירים ואירועים
    status: completed
  - id: wave9
    content: 9 — חדר אישי
    status: completed
  - id: wave10
    content: 10 — Realtime (רק אחרי יציבות מלאה)
    status: completed
isProject: false
---

# תוכנית פיתוח V3 — מועדון המשחקים של ליאו

---

## כללי נוהל — חובה לקרוא לפני ביצוע

### SQL / Migrations
כל migration/SQL שמופיע בתוכנית זו הוא **הכנה בלבד**.
הסוכן מכין קובצי SQL/מיגרציות לפי בקשה ומציג אותם לבדיקה.
**רק הבעלים מריץ SQL בפועל.**

### Build
build יורץ רק לפי נוהל הפרויקט:
- לפני פרסום / העברה משמעותית
- כשמשנים imports / routes / API / לוגיקה רגישה
- או כש הבעלים מבקש במפורש

### Commit / Push
לא עושים commit/push אלא אם הבעלים מבקש במפורש.

### אישורים
הבעלים מאשר את התוכנית הסופית המלאה לפני תחילת ביצוע.
אין gates אישור באמצע פרקי הביצוע.

---

## א. עקרון מוצר סופי לאורחים: Admin-controlled, לא hardcoded

**כלל יסוד:**
אורח מחובר הוא שחקן לכל דבר ועניין מבחינת קוד המערכת.
המגבלות על אורח אינן בקוד — הן בהגדרות Admin.
הבעלים שולט דרך Admin Panel מה פתוח לאורח ומה סגור.

**ברירות מחדל מוצעות (לא קשיחות בקוד):**
- משחקי ארקייד: לפי `guest_game_access` per-game — Admin שולט
- חנות, חברים, הזמנות, טורנירים: סגור כברירת מחדל — Admin יכול לפתוח

**מה זה אומר בפועל:**
- כל feature guard בקוד בודק הגדרת Admin, לא account_kind בלבד
- אין `if (isGuest) return 403` קשיח
- יש `if (!hasPermission(student, feature, adminSettings)) return 403`

---

## ב. עקרונות מוצר קבועים

- **לא** מוסיפים משחקים חדשים בשלב הזה
- **לא** בונים Roblox — מדובר במעטפת חברתית בלבד
- **לא** מחברים ללמידה, דוחות הורים, Copilot, מנוע אבחוני
- כל הכלכלה נשארת server-side בלבד
- קוסמטיקה = עיצוב/איסוף בלבד, ללא יתרון משחקי
- אין leaderboard מבייש — רק הישגים אישיים, גביעים, תארים חיוביים
- תקשורת בין ילדים = הודעות מוכנות בלבד, **אין צ'אט חופשי**
- `arcade_display_name` נפרד מ-`full_name` ומ-`leo_number`
- מגבלות אורח — Admin-controlled בלבד, לא hardcoded

---

## ג. סיכום מצב קיים

**עובד כבר:**
- 7 משחקי ארקייד מקוונים ב-`/student/arcade`
- חדרים ציבוריים, פרטיים, משחק מהיר, הצטרפות לפי קוד
- חיוב/זיכוי מטבעות דרך שרת (RPC `arcade_coin_apply`)
- Ledger מלא ב-`coin_transactions`
- תמיכה בילד רשום + ילד אורח (שניהם `student_id` אחיד)
- קישור אורח להורה + העברת מטבעות/קלפים
- Polling HTTP כל 1.5 שניות (אין Realtime)

**Admin קיים:**
- [`pages/admin/games/index.js`](pages/admin/games/index.js) — שליטה בקטלוג (`site_game_catalog`)
- [`pages/admin/guest/index.js`](pages/admin/guest/index.js) — שליטה במצב אורח (`guest_mode_enabled`, `gamesPerCategory`, `shopEnabled`, `cardsEnabled`)
- [`pages/admin/rewards/index.js`](pages/admin/rewards/index.js) — עלויות כניסה, payout rules
- `GET/PUT /api/admin/guest/games` — שליטה per-game לאורחים **קיים ב-API, חסר UI**

**חסר לחלוטין:**
- UI ב-admin/guest לשליטה per-game
- `guest_feature_permissions` — שליטה Admin על פיצ'רים חברתיים
- `arcade_display_name` — שם תצוגה ציבורי
- מערכת חברים, הזמנות, נוכחות
- כרטיס שחקן, היסטוריית משחקים ב-UI
- משימות ארקייד, הישגים, טורנירים, אירועים
- קוסמטיקה, חדר אישי, דיווח/חסימה
- ניקוי אוטומטי של חדרים ישנים

**פערי אכיפה דחופים:**
- `quick-game` ו-`join-by-code` לא קוראים ל-`assertStudentCanPlayGame`
- אין lazy cleanup לחדרי waiting ישנים
- UI מציג שחמט/בינגו כ-"יגיע בהמשך" למרות מימוש מלא

---

## ד. פרק ביצוע 0A — אכיפת הרשאות אחידה בארקייד

**מטרה:** כל נתיב ארקייד יבדוק את אותו מקור אמת — החלטות Admin + Parent + guest settings.

**עיקרון:** זה לא "חסימת אורח". זו כיבוד החלטות Admin/Parent/Guest settings.

**מה יפותח:**

1. נתיבים שחסרה בהם הבדיקה:
   - [`pages/api/arcade/quick-game.js`](pages/api/arcade/quick-game.js) — הוספת `assertStudentCanPlayGame`
   - [`pages/api/arcade/rooms/join-by-code.js`](pages/api/arcade/rooms/join-by-code.js) — הוספת `assertStudentCanPlayGame`
   - בדיקה גם: [`pages/api/arcade/rooms/join.js`](pages/api/arcade/rooms/join.js)

2. מקור האמת לבדיקה:
   ```
   canPlay(student, gameKey) =
     Admin: game enabled in site_game_catalog
     + Admin: game open to guest (if guest) via guest_game_access
     + Parent: game permitted (if registered) via student_game_category_permissions
   ```

3. Lazy cleanup לחדרי waiting ישנים:
   - [`pages/api/arcade/rooms/open.js`](pages/api/arcade/rooms/open.js) — סינון חדרים שנשארו `waiting` יותר מ-15 דקות
   - [`lib/arcade/server/arcade-rooms.js`](lib/arcade/server/arcade-rooms.js) — פונקציית `filterStaleWaitingRooms`

4. תיקון UI שחמט/בינגו:
   - [`pages/student/arcade.js`](pages/student/arcade.js) — הסרת "יגיע בהמשך" ממשחקים עם מימוש מלא

**DB migration:** לא נדרש

**API:** שינוי handlers קיימים בלבד

**בדיקות:**
- שחקן מנסה quick-game על משחק מכובה ב-Admin → חסום
- שחקן מנסה join-by-code על משחק מכובה → חסום
- אורח על משחק סגור ב-guest_game_access → חסום
- אורח על משחק פתוח → עובד
- ילד רשום — כל כפתורי לובי עובדים כרגיל
- חדרי waiting ישנים לא מוצגים ברשימה הפתוחה

---

## ה. פרק ביצוע 0B — Admin Guest Arcade Controls

**מטרה:** UI ב-[`pages/admin/guest/index.js`](pages/admin/guest/index.js) לשליטה מלאה על אורחים בארקייד ובפיצ'רים חברתיים עתידיים.

**שלב א — שליטה per-game (API קיים, חסר UI):**

שימוש ב-`GET/PUT /api/admin/guest/games` הקיים:
- רשימת משחקי ארקייד עם toggle per-game
- כפתור "פתח הכל לאורחים" / "סגור הכל לאורחים"
- הצגת מצב נוכחי מ-`guest_game_access`
- הסבר ב-UI: "אם הכל פתוח — אורח משחק כמו שחקן רגיל"

**שלב ב — Admin controls לפיצ'רים חברתיים עתידיים:**

טבלה חדשה `guest_feature_permissions` עם toggles:

| feature_key | ברירת מחדל מוצעת |
|-------------|------------------|
| `room_public_create` | פתוח (כבר עובד) |
| `room_private_create` | פתוח (כבר עובד) |
| `room_join_by_code` | פתוח (כבר עובד) |
| `quick_game` | פתוח (כבר עובד) |
| `invites_send` | סגור |
| `invites_receive` | סגור |
| `friends` | סגור |
| `safe_messages` | פתוח |
| `shop` | סגור |
| `events` | פתוח |
| `tournaments` | סגור |
| `missions` | סגור |
| `personal_room` | סגור |

**קבצים שיושפעו:**
- [`pages/admin/guest/index.js`](pages/admin/guest/index.js) — הוספת section "שליטת ארקייד לאורחים"
- `pages/api/admin/guest/games.js` — קיים, ללא שינוי
- `pages/api/admin/guest/features.js` — **חדש** — GET/PUT לשליטה בפיצ'רים

**DB migration נדרש:** `guest_feature_permissions(feature_key PK, enabled_for_guest BOOLEAN, updated_at)`

**Components חדשים:** `GuestArcadeGameToggles`, `GuestFeaturePermissionsPanel`

**בדיקות:**
- Admin מכבה משחק לאורח → אורח לא יכול להיכנס
- Admin פותח שליחת הזמנה לאורח → אורח יכול לשלוח
- שינויי Admin נכנסים לתוקף ללא build

---

## ו. פרק ביצוע 0C — שם תצוגה ציבורי

**מטרה:** כל שחקן (רשום ואורח) יכול לבחור שם תצוגה שמופיע בלובי, חדרים, כרטיס שחקן, הזמנות.

**עקרונות:**
- `arcade_display_name` — שדה חדש, נפרד לחלוטין מ-`full_name`
- `full_name` נשאר — נקבע על ידי הורה, לא ניתן לשינוי על ידי הילד
- `leo_number` נשאר — לזיהוי, resume, קישור להורה
- `arcade_display_name` — ניתן לבחירה/שינוי על ידי הילד מתוך כרטיס השחקן

**ברירות מחדל:**
- ילד רשום: שם פרטי (חלק מ-full_name) → ניתן לשינוי
- אורח: `אורח {leo_number}` → ניתן לשינוי

**מיקום שמירה:** שדה `display_name` ב-`arcade_player_profiles` (פרק 2)

**API חדש:**
- `PUT /api/arcade/profile/display-name`
  - לא ריק
  - לא יותר מ-20 תווים
  - basic filter תווים/מילים אסורות
  - rate limit: שינוי אחד ל-24 שעות

**Visibility:**
- Admin + הורה: רואים גם `full_name` וגם `display_name`
- ילדים אחרים: רואים רק `display_name`

**קבצים שיושפעו:**
- [`lib/arcade/server/arcade-rooms.js`](lib/arcade/server/arcade-rooms.js) — snapshot מחזיר `display_name`
- [`pages/api/arcade/rooms/[roomId]/snapshot.js`](pages/api/arcade/rooms/%5BroomId%5D/snapshot.js) — מחזיר `display_name`
- `pages/api/arcade/profile/display-name.js` — חדש

**DB migration נדרש:** שדה `display_name VARCHAR(20)` ב-`arcade_player_profiles` (נוצר בפרק 2)

**בדיקות:**
- שם ריק נדחה
- שם ארוך מ-20 תווים נדחה
- שינוי שם כפול בפחות מ-24 שעות נדחה
- Admin רואה full_name בנפרד
- שם מוצג נכון בחדר לשחקן השני

---

## ז. פרק ביצוע 0D — שמירת נתוני אורח בעת קישור להורה

**מטרה:** תיעוד מדיניות מפורטת מה עובר מאורח לילד רשום בעת קישור להורה — כדי שכל פרק ביצוע עתידי יידע מה צריך לטפל בו.

**מדיניות העברה מוצעת:**

| נכס | מה קורה בקישור | הערה |
|-----|----------------|-------|
| מטבעות | עובר — קיים | `transferGuestCoinsAndCards` קיים |
| יהלומים | עובר — קיים | |
| קלפים | עובר — קיים | |
| `arcade_display_name` | עובר כ-display_name | לא כ-full_name |
| `arcade_player_profiles` | re-link ל-student_id החדש | |
| `arcade_results` (היסטוריה) | UPDATE student_id הישן לחדש | |
| `arcade_player_achievements` | re-link ל-student_id החדש | |
| `arcade_player_cosmetics` | re-link ל-student_id החדש | |
| `arcade_friendships` | החלטת בעלים | לא חובה בשלב ראשון |
| `arcade_personal_rooms` | החלטת בעלים | מומלץ לשמר |

**מה לא עובר לעולם:**
- `full_name` — נשאר כפי שהורה הגדיר לילד הרשום
- session ישן — מבוטל
- `guest_status` — מוסמן `linked`

**כלל חשוב לכל פרק ביצוע עתידי:**
כשמוסיפים טבלה חדשה (profiles, cosmetics וכו') — חובה לוודא שיש re-link בפונקציית הקישור (`transferGuestCoinsAndCards` או פונקציה מורחבת).

**DB migration:** לא בפרק זה | **API:** לא בפרק זה

**בדיקות (לאחר כל פרק ביצוע):**
- קישור אורח → כל הנכסים הרלוונטיים עברו ל-student_id החדש
- `guest_status = linked`, session מבוטל, `leo_number` שמור

---

## ח. פרק ביצוע 1 — לובי מועדון המשחקים של ליאו

**מטרה:** שדרוג חוויית הכניסה ל-`/student/arcade` מרשימה ל-hub חברתי עם זהות ברורה.

**מה יפותח:**
- כותרת + עיצוב "מועדון המשחקים של ליאו"
- Widget ראש: avatar + **display_name** + מטבעות
- Tab navigation: משחקים / חברים / חנות / פרופיל
- כרטיסי משחק ויזואליים: תמונה, שחקנים פעילים, status
- "חדרים פתוחים" ממוקם ברור
- אורח: banner "שדרג לפרופיל ליאו לחוויה מלאה" — **לא חוסם, רק מציע**

**קבצים שיושפעו:**
- [`pages/student/arcade.js`](pages/student/arcade.js) — עיצוב, layout, navigation
- [`components/arcade/`](components/arcade/) — components חדשים

**Components חדשים:** `ArcadeGameCard`, `ArcadeLobbyHeader`, `ArcadeTabNav`

**DB migration:** לא | **API:** לא

---

## ט. פרק ביצוע 2 — כרטיס שחקן + היסטוריית משחקים

**מטרה:** כרטיס שחקן עם stats ועמוד היסטוריה. הנתונים כבר קיימים ב-`arcade_results`.

**מה יפותח:**
- כרטיס שחקן: display_name, avatar/badge, ניצחונות, משחקים, משחק אהוב, תואר
- עריכת display_name מתוך הכרטיס (כפתור עריכה)
- היסטוריית 20 משחקים אחרונים עם pagination
- view חבר — display_name, ניצחונות, תואר (ללא מטבעות, ללא full_name)
- כרטיס אורח: נשלט ב-Admin (`guest_feature_permissions`) — session-only כברירת מחדל

**DB migration נדרש:**
```sql
CREATE TABLE arcade_player_profiles (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  display_name VARCHAR(20),
  avatar_id INT,
  title_id INT,
  total_wins INT NOT NULL DEFAULT 0,
  total_games INT NOT NULL DEFAULT 0,
  favorite_game_key VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: enabled, service-role only
```

**API:**
- `GET /api/arcade/profile/me`
- `GET /api/arcade/profile/{studentId}` — שדות ציבוריים בלבד
- `GET /api/arcade/history` — pagination
- `PUT /api/arcade/profile/display-name` (מוגדר בפרק 0C)

**Components חדשים:** `PlayerCard`, `GameHistoryList`, `GameHistoryRow`, `PlayerBadge`, `DisplayNameEditor`

---

## י. פרק ביצוע 3 — חברים בסיסיים

**מטרה:** הוספת חבר לפי `leo_number` או `display_name`, נוכחות online/offline.

**עקרון:** הרשאות אורח נשלטות ב-Admin (`guest_feature_permissions.friends`).

**מה יפותח:**
- חיפוש חבר לפי `leo_number` (ייחודי) או display_name
- שליחת/אישור/דחיית בקשת חברות
- רשימת חברים עם online/offline (heartbeat כל 30 שניות, TTL 60 שניות)
- הסרת חבר
- אם Admin פתח לאורח — אורח פועל בדיוק כמו שחקן רשום

**DB migration נדרש:**
```sql
CREATE TABLE arcade_friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  to_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/accepted/declined/blocked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE arcade_friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_a_id, student_b_id)
);

CREATE TABLE arcade_presence (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT FALSE
);
-- RLS: enabled, service-role only
```

**API:**
- `POST /api/arcade/friends/request`
- `POST /api/arcade/friends/respond`
- `GET /api/arcade/friends`
- `DELETE /api/arcade/friends/{friendId}`
- `POST /api/arcade/presence/heartbeat`

**Hooks חדשים:** `useFriends`, `usePresenceHeartbeat`

**Components חדשים:** `FriendsList`, `FriendRequestCard`, `AddFriendModal`, `OnlineBadge`

**סיכונים:** rate limit על חיפוש לפי leo_number

---

## יא. פרק ביצוע 4 — הזמנות למשחק + התראות

**מטרה:** שחקן מזמין חבר ישירות למשחק, חבר מקבל notification.

**עקרון:** הרשאות שליחה/קבלה לאורח נשלטות ב-Admin בנפרד (`invites_send`, `invites_receive`).

**מה יפותח:**
- "הזמן חבר למשחק" מתוך רשימת חברים
- notification לחבר (polling כל 10 שניות)
- קבלה → הצטרפות אוטומטית לחדר
- הזמנה פגה אחרי 2 דקות
- rate limit: 5 הזמנות לדקה

**DB migration נדרש:**
```sql
CREATE TABLE arcade_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  to_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  room_id UUID REFERENCES arcade_rooms(id) ON DELETE SET NULL,
  game_key VARCHAR NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/accepted/declined/expired
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: enabled, service-role only
```

**API:**
- `POST /api/arcade/invites/send`
- `POST /api/arcade/invites/respond`
- `GET /api/arcade/invites/pending`

**Components חדשים:** `InviteModal`, `InviteBanner`, `InviteCard`

---

## יב. פרק ביצוע 5 — משימות ארקייד יומיות + הישגים

**מטרה:** מוטיבציה חוזרת — משימות יומיות, הישגים חד-פעמיים.

**עקרון:** הרשאות אורח נשלטות ב-Admin (`guest_feature_permissions.missions`).

**מה יפותח:**
- 3 משימות ארקייד יומיות: "שחק 3 ארבע בשורה", "נצח פעמיים בלודו", "הצטרף לחדר ציבורי"
- השלמה → מטבעות / badge
- הישגים חד-פעמיים: "שחקן ראשון", "50 ניצחונות", "שחק כל 7 המשחקים"
- אם Admin פתח לאורח — אורח מקבל משימות שמורות

**DB migration נדרש:**
```sql
CREATE TABLE arcade_daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key VARCHAR, -- NULL = כל משחק
  description_he TEXT NOT NULL,
  goal_type VARCHAR NOT NULL, -- win/play/join
  goal_count INT NOT NULL,
  reward_coins INT NOT NULL DEFAULT 0,
  reward_badge_id INT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE arcade_player_mission_progress (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES arcade_daily_missions(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (student_id, mission_id, date)
);

CREATE TABLE arcade_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE NOT NULL,
  name_he VARCHAR NOT NULL,
  description_he TEXT,
  condition_type VARCHAR NOT NULL,
  condition_value INT NOT NULL,
  reward_badge_id INT
);

CREATE TABLE arcade_player_achievements (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES arcade_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, achievement_id)
);
-- RLS: enabled, service-role only
```

**API:**
- `GET /api/arcade/missions/today`
- `POST /api/arcade/missions/progress`
- `GET /api/arcade/achievements`

**שינויים בקיים:** `pages/api/arcade/games/*/action.js` — hook async (non-blocking) לעדכון missions

---

## יג. פרק ביצוע 6 — הודעות מוכנות / emotes בטוחים

**מטרה:** תקשורת חברתית בטוחה בתוך משחק.

**עקרון:** הרשאות אורח נשלטות ב-Admin (`guest_feature_permissions.safe_messages`). ברירת מחדל: פתוח.
כמות/קטגוריית הודעות לאורח לעומת רשום — נשלטת ב-Admin, לא hardcoded.
**אין צ'אט חופשי בשום שלב.**

**מה יפותח:**
- preset messages בעברית מנוהלות ב-Admin
- emote חזותי (emoji / animation קצרה)
- הודעה ב-state JSONB של session, TTL 10 שניות

**DB migration נדרש:**
```sql
CREATE TABLE arcade_safe_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_he VARCHAR NOT NULL,
  emoji VARCHAR,
  category VARCHAR,
  min_permission_level VARCHAR NOT NULL DEFAULT 'guest', -- guest/registered
  active BOOLEAN NOT NULL DEFAULT TRUE
);
-- RLS: enabled, service-role only
```

**API:**
- `GET /api/arcade/safe-messages`
- `POST /api/arcade/rooms/{roomId}/send-message`

**Components חדשים:** `EmoteBar`, `EmoteBubble`, `SafeMessagePicker`

---

## יד. פרק ביצוע 7 — חנות קוסמטית למשחקים

**מטרה:** רכישת עיצובים קוסמטיים במטבעות. אין יתרון משחקי.

**עקרון:** הרשאות אורח נשלטות ב-Admin (`guest_feature_permissions.shop`). ברירת מחדל: סגור.
בעת קישור אורח — `arcade_player_cosmetics` עובר re-link.

**מה יפותח:**
- קטגוריות: avatar frames, board themes, dice skins
- רכישה server-side דרך `arcade_coin_apply`
- skin מוצג לשני השחקנים בחדר (דרך snapshot)

**DB migration נדרש:**
```sql
CREATE TABLE arcade_cosmetic_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE NOT NULL,
  name_he VARCHAR NOT NULL,
  category VARCHAR NOT NULL, -- avatar_frame/board_theme/dice_skin
  price_coins INT NOT NULL,
  rarity VARCHAR,
  preview_url VARCHAR,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE arcade_player_cosmetics (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  item_id UUID REFERENCES arcade_cosmetic_items(id) ON DELETE CASCADE,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, item_id)
);
-- RLS: enabled, service-role only
```

**API:**
- `GET /api/arcade/shop/items`
- `POST /api/arcade/shop/purchase`
- `POST /api/arcade/shop/equip`
- `GET /api/arcade/shop/my-items`

**שינויים בקיים:** [`pages/api/arcade/rooms/[roomId]/snapshot.js`](pages/api/arcade/rooms/%5BroomId%5D/snapshot.js) — הוספת `cosmetics` לנתוני שחקן

**Components חדשים:** `CosmeticShop`, `ShopItemCard`, `EquipButton`

---

## טו. פרק ביצוע 8 — טורנירים ואירועים

**מטרה:** אירועים מיוחדים שמגבירים מעורבות.

**עקרון:** הרשאות אורח נשלטות ב-Admin (`guest_feature_permissions.events`, `guest_feature_permissions.tournaments`).

**מה יפותח:**
- אירוע יומי: "אתגר היום" → bonus מטבעות
- טורניר שבועי: 8–16 משתתפים, single elimination, admin-managed
- bracket ויזואלי פשוט
- פרסי טורניר: badge + מטבעות

**DB migration נדרש:**
```sql
CREATE TABLE arcade_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_he VARCHAR NOT NULL,
  game_key VARCHAR,
  event_type VARCHAR NOT NULL, -- daily/weekly
  reward_coins INT NOT NULL DEFAULT 0,
  reward_badge_id INT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE arcade_event_participation (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  event_id UUID REFERENCES arcade_events(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (student_id, event_id)
);

CREATE TABLE arcade_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_he VARCHAR NOT NULL,
  game_key VARCHAR NOT NULL,
  max_players INT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'registration', -- registration/active/finished
  starts_at TIMESTAMPTZ,
  bracket_data JSONB,
  created_by UUID REFERENCES students(id)
);

CREATE TABLE arcade_tournament_players (
  tournament_id UUID REFERENCES arcade_tournaments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  seed INT,
  result VARCHAR,
  PRIMARY KEY (tournament_id, student_id)
);
-- RLS: enabled, service-role only
```

**API:**
- `GET /api/arcade/events/active`
- `POST /api/arcade/events/claim`
- `GET /api/arcade/tournaments/active`
- `POST /api/arcade/tournaments/register`
- `GET /api/arcade/tournaments/{id}/bracket`

**Components חדשים:** `DailyEventBanner`, `TournamentBracket`, `TournamentRegistrationCard`

---

## טז. פרק ביצוע 9 — חדר אישי

**מטרה:** מרחב אישי לכל שחקן — decorations, גביעים, הזמנת חברים.

**עקרון:** הרשאות אורח נשלטות ב-Admin (`guest_feature_permissions.personal_room`). בעת קישור — החלטת בעלים.

**מה יפותח:**
- `/student/arcade/my-room`
- תצוגת decorations מהחנות, גביעים על "מדף"
- "הזמן חבר לחדרי" → חדר פרטי מהיר

**DB migration נדרש:**
```sql
CREATE TABLE arcade_personal_rooms (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  room_name VARCHAR,
  background_id INT,
  decoration_slots JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: enabled, service-role only
```

**API:**
- `GET /api/arcade/my-room`
- `PUT /api/arcade/my-room`

**Components חדשים:** `PersonalRoom`, `TrophyShelf`, `RoomDecoration`

---

## יז. פרק ביצוע 10 — שדרוג תשתית אונליין (Realtime)

**מטרה:** מעבר מ-polling ל-Supabase Realtime — **רק אחרי שפרקי ביצוע 1–9 יציבים.**

**מה יפותח:**
- `useArcadeSnapshotPollEffect` → Supabase Realtime subscription על `arcade_game_sessions`
- Presence channel ב-Realtime במקום heartbeat polling
- הפחתת עומס שרת, שיפור latency

**קבצים שיושפעו:**
- [`hooks/arcade/useArcadeSnapshotPollEffect.js`](hooks/arcade/useArcadeSnapshotPollEffect.js)
- `lib/supabase/` — client config

**DB migration:** לא (Realtime על טבלאות קיימות)

---

## יח. טבלת הרשאות — רשום / אורח / הורה / Admin

"לפי Admin" = ברירת המחדל ניתנת לשינוי ב-`/admin/guest/index.js` דרך `guest_feature_permissions`.

| פיצ'ר | ילד רשום | ילד אורח | הורה | Admin |
|--------|----------|----------|------|-------|
| יצירת חדר ציבורי | פתוח | לפי Admin (ברירה: פתוח) | — | פתוח |
| יצירת חדר פרטי | פתוח | לפי Admin (ברירה: פתוח) | — | פתוח |
| הצטרפות לפי קוד | פתוח | לפי Admin (ברירה: פתוח) | — | פתוח |
| משחק מהיר | פתוח | לפי Admin (ברירה: פתוח) | — | פתוח |
| שליחת הזמנה | פתוח | לפי Admin (ברירה: סגור) | — | — |
| קבלת הזמנה | פתוח | לפי Admin (ברירה: סגור) | — | — |
| הוספת חבר | פתוח | לפי Admin (ברירה: סגור) | — | — |
| הודעות מוכנות | פתוח | לפי Admin (ברירה: פתוח) | — | — |
| רכישת קוסמטיקה | פתוח | לפי Admin (ברירה: סגור) | — | פתוח |
| משימות ארקייד | פתוח | לפי Admin (ברירה: סגור) | — | פתוח (הגדרה) |
| טורנירים | פתוח | לפי Admin (ברירה: סגור) | — | פתוח (ניהול) |
| אירוע יומי | פתוח | לפי Admin (ברירה: פתוח) | — | פתוח (הגדרה) |
| חדר אישי | פתוח | לפי Admin (ברירה: סגור) | — | — |
| דיווח/חסימה | פתוח | פתוח (דיווח בלבד) | — | פתוח (טיפול) |
| כרטיס שחקן | מלא | לפי Admin (ברירה: session) | צפייה | פתוח |
| היסטוריית משחקים | פתוח | לפי Admin (ברירה: סגור) | צפייה | פתוח |
| שינוי display_name | פתוח | פתוח | — | פתוח |

---

## יט. UX למסכים המרכזיים

### ראש /student/arcade
```
[display_name + avatar]  [מטבעות: 1,234]  [באנר אירוע יומי]
[טאבים: משחקים | חברים | חנות | פרופיל]

--- גריד משחקים ---
[ארבע בשורה | 2 שחקנים | X בחדרים | [משחק מהיר]]
[לודו | 2-4 | Y בחדרים | [משחק מהיר]]
...

--- חדרים פתוחים ---
[display_name מארח] [משחק] [שחקנים: 1/4] [הצטרף]
```

### banner אורח (לא חוסם — מציע בלבד)
```
[אתה שחקן אורח — display_name | מספר ליאו: 123456]
[קשר עם הורה כדי לשמור התקדמות ולפתוח תכונות נוספות →]
```

### כרטיס שחקן
```
[avatar frame]
display_name [עריכה ✎]
תואר: לוחם הארקייד
ניצחונות: 47 | משחקים: 120 | אהוב: לודו
[badges / גביעים]
[ראה היסטוריה]
```

### עריכת שם תצוגה
```
שם תצוגה: [_____________] (עד 20 תווים)
שם הורה (לא ניתן לשינוי): דניאל כהן
[שמור]  [ביטול]
```

### Admin Guest Controls (/admin/guest/index.js)
```
--- ארקייד לאורחים ---
[פתח הכל]  [סגור הכל]
[ארבע בשורה  ● פתוח  ○ סגור]
[לודו         ● פתוח  ○ סגור]
[שחמט        ○ פתוח  ● סגור]

--- תכונות חברתיות לאורחים ---
[הוספת חבר       ○ פתוח  ● סגור (ברירה: סגור)]
[שליחת הזמנה    ○ פתוח  ● סגור (ברירה: סגור)]
[הודעות מוכנות  ● פתוח  ○ סגור (ברירה: פתוח)]
[חנות קוסמטיקה  ○ פתוח  ● סגור (ברירה: סגור)]
[אירוע יומי      ● פתוח  ○ סגור (ברירה: פתוח)]
```

### הזמנה למשחק
```
[banner בראש המסך]
display_name של מיכל מזמינה אותך לשחק דמקה!
[קבל]  [דחה]   [פג בעוד 1:47]
```

### מסך סיום משחק
```
[ניצחת! / הפסדת]
+500 מטבעות
[emote: "כל הכבוד!"]  [שחק שוב?]
[חזור ללובי]
[הזמן לסיבוב נוסף] ← אם יש חברים
```

---

## כ. בדיקות נדרשות

**פרק 0A:**
- שחקן מנסה quick-game על משחק מכובה ב-Admin → חסום
- שחקן מנסה join-by-code על משחק מכובה → חסום
- אורח על משחק סגור ב-guest_game_access → חסום
- אורח על משחק פתוח → עובד
- ילד רשום — כל כפתורי לובי עובדים כרגיל
- חדרי waiting ישנים לא מוצגים

**פרק 0B:**
- Admin מכבה משחק לאורח → אורח לא יכול
- Admin פותח שליחת הזמנה לאורח → אורח יכול
- שינויי Admin בתוקף ללא build

**פרק 0C:**
- שם ריק נדחה | שם ארוך מ-20 תווים נדחה
- שינוי שם כפול בפחות מ-24 שעות נדחה
- Admin רואה full_name בנפרד | display_name מוצג בחדר לשחקן השני

**פרק 0D:**
- קישור אורח → מטבעות, קלפים, profiles עוברים
- `guest_status = linked`, session מבוטל

**פרקים 1–10 (כלליות):**
- registered child: כל תכונה עובדת
- guest child: תכונות נשלטות ב-Admin
- insufficient coins: 402 + UX ברור
- private room: לא גלוי ברשימה, גלוי עם קוד
- public room: גלוי, ניתן להצטרף
- quick game: מוצא חדר פתוח או יוצר חדש
- leaving waiting room: מטבעות מוחזרים
- reward payout: מנצח מקבל פרס
- mobile UI: responsive בכל מסך
- old room cleanup: חדרים ישנים לא מוצגים

---

## כא. סיכונים

1. **`guest_feature_permissions` חסרה** — כל feature guard חייב לבדוק אותה לפני deploy
2. **display_name moderation** — שמות פוגעניים; נדרש basic filter + Admin יכול לאפס
3. **Polling עומס** — heartbeat + invites polling + snapshot — לנהל בזהירות
4. **re-link בקישור אורח** — כל טבלה חדשה → חובה לוודא re-link בפונקציית הקישור
5. **legacy code** — `arcade_quick_match_queue`, `arcadePlaceholderGame.js` — לא למחוק בלי החלטת בעלים
6. **UI שחמט/בינגו** — עדיין "יגיע בהמשך" עד תיקון בפרק 0A
7. **rate limiting** — display_name, friends request, invites — rate limit לכל אחד

---

## כב. שאלות פתוחות לבעלים

| שאלה | פרק רלוונטי |
|------|-------------|
| guest_mode_enabled ב-production — להפעיל? | 0A |
| ברירות מחדל של guest_feature_permissions — לאשר | 0B |
| filter על display_name — מה מותר/אסור? | 0C |
| האם חברים עוברים בקישור אורח? | 0D |
| האם חדר אישי עובר בקישור? | 0D |
| מה חבר רואה בכרטיס שחקן? | 2 |
| אילו משימות בדיוק? מי מגדיר? | 5 |
| רשימת הודעות מוכנות — לאשר טקסטים | 6 |
| רשימת פריטי קוסמטיקה ומחירים — לאשר | 7 |
| מי מנהל טורנירים? admin UI? | 8 |
| Supabase plan/cost ל-Realtime — לבדוק | 10 |
| legacy code — למחוק / לתעד / להשאיר? | 0A |

---

## כג. מה לא עושים

- **לא** מוסיפים משחקים חדשים
- **לא** מוסיפים צ'אט חופשי בשום שלב
- **לא** מחברים ללמידה, דוחות הורים, מנוע אבחוני, Copilot
- **לא** עוברים ל-Realtime לפני שפרקים 1–9 יציבים
- **לא** מוחקים legacy code בלי החלטת בעלים
- **לא** עושים refactor רחב — שינויים ממוקדים בלבד
- **לא** מוסיפים leaderboard ציבורי מבייש
- **לא** מוסיפים יתרון משחקי בקוסמטיקה
- **לא** מקשיחים מגבלות אורח בקוד — הכל דרך Admin

---

## כד. סדר ביצוע מומלץ

1. **0A** — אכיפת הרשאות אחידה + lazy cleanup + תיקון UI
2. **0B** — Admin UI לשליטת אורחים ופיצ'רים חברתיים
3. **0C** — שם תצוגה ציבורי
4. **0D** — תיעוד מדיניות העברה (לא קוד)
5. **1** — לובי מועדון
6. **2** — כרטיס שחקן (נתונים קיימים ב-`arcade_results`)
7. **3** — חברים
8. **4** — הזמנות
9. **5–9** — לפי עדיפות מוצר
10. **10** — Realtime בלבד אחרי יציבות מלאה

---

## אישורים

- האם שונו קבצים: **לא**
- האם היה commit/push: **לא**
- האם נגעת ב-LEO-KIDS: **לא**
- האם הורץ build: **לא**
