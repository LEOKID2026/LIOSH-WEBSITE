---
name: Guest Child Mode
overview: "תוכנית פשוטה v2: אורch עם מספר 6 ספרות, resume במכשיר בלבד, שיוך הורה מעביר רק מטבעות+קלפים. מבוסס על docs/guest-child-mode/MASTER_PLAN.md v2.0."
todos:
  - id: approve-plan
    content: אישור MASTER_PLAN.md v2 לפני פיתוח
    status: completed
  - id: sql-migration
    content: migration SQL פשוט + System Guest Parent — רק הבעלים מריץ
    status: completed
  - id: guest-auth
    content: guest/start + guest/resume + הרחבת student-auth (ללא recover API)
    status: completed
  - id: guest-policy
    content: guest-access-policy + /api/student/me (displayName אורch XXXXXX)
    status: completed
  - id: admin-guest
    content: /admin/guest — ON/OFF, games, topics, economy, רשימה+חיפוש
    status: completed
  - id: student-ui
    content: login כפתור אורch + home שלום אורch + tiles נעולים
    status: completed
  - id: locks-economy
    content: games/learning guest_locked + box=1 + shop/cards
    status: completed
  - id: parent-link
    content: parent link — transferGuestCoinsAndCards בלבד + guest=linked
    status: completed
  - id: report-guards
    content: סינון אורchים מדוחות/מנוע (ללא העברת learning data)
    status: completed
  - id: qa
    content: בדיקות אורch + רגרסיה ילדים רשומים
    status: completed
isProject: false
---

# תוכנית ביצוע — מצב אורch (גרסה פשוטה v2)

**מסמך מלא:** [docs/guest-child-mode/MASTER_PLAN.md](docs/guest-child-mode/MASTER_PLAN.md)

**לא בוצע פיתוח. לא הורץ SQL. תוכנית פשוטה לאישור בלבד.**

---

## סיכום

| נושא | החלטה |
|------|--------|
| מספר ליאו | **6 ספרות**, ייחודי, אוטומטי |
| תצוגה | `שלום אורch 482913` |
| Resume | localStorage + cookie — **בלי סיסמה, בלי recovery API** |
| localStorage נמחק | אורch **חדש** — מספיק |
| שיוך הורה | **רק מטבעות + קלפים** |
| אחרי שיוך | logout → login רגיל; `guest_status=linked` |
| לא מעבירים | התקדמות, sessions, אבחון, דוחות, המלצות |
| לא בונים | QR, recovery, merge מורכב, בחירת כיתה |

---

## ארכיטקטורה

```mermaid
flowchart LR
  GuestStart[guest/start] --> GuestStudent["students guest"]
  GuestStudent --> ChildWorld["עולם ילד קיים"]
  Policy[guest-access-policy] --> ChildWorld
  ParentLink["parent/guest/link"] --> Transfer["coins + cards only"]
  Transfer --> Linked["guest_status=linked"]
```

**SSOT:** [`lib/guest/guest-access-policy.server.js`](lib/guest/guest-access-policy.server.js)

**הרחבות קיימות:**
- [`lib/games/server/game-access.server.js`](lib/games/server/game-access.server.js) — `guest_locked`
- [`components/games/GameHubCard.jsx`](components/games/GameHubCard.jsx) — נעילה visible
- [`pages/student/home.js`](pages/student/home.js) — tiles נעולים + שם אורch

---

## API (מינימום)

| Route | תפקיד |
|-------|--------|
| `POST /api/student/guest/start` | יצירה |
| `POST /api/student/guest/resume` | resume במכשיר |
| `POST /api/parent/guest/link` | coins+cards + linked |
| `GET/PUT /api/admin/guest/*` | Admin |

**אין:** `guest/recover`, `parent/guest/preview` (אופציונלי)

---

## SQL (בעלים מריץ)

`supabase/migrations/NNN_guest_child_mode.sql`:

- `students`: `account_kind`, `leo_number` (6), `guest_status`, `guest_linked_*`
- `guest_device_bindings`
- `guest_mode_settings`, `guest_game_access`, `guest_learning_access` (subject+topic, **ללא כיתה**)
- `student_sessions.session_kind`
- System Guest Parent

---

## שלבי ביצוע

1. אישור v2
2. SQL (עצירה)
3. guest auth (start/resume)
4. policy + /me
5. Admin
6. UI login + home
7. locks + economy
8. parent link — `transferGuestCoinsAndCards` (עצירה)
9. report guards
10. QA

**מאמץ:** ~2–3 שבועות

---

**לא בוצע פיתוח. לא הורץ SQL. זו תוכנית פשוטה לאישור בלבד.**
