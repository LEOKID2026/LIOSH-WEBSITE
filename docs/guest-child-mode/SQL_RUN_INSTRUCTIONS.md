# הוראות הרצת SQL — מצב אורch (v2)

**סטטוס:** מאושר להרצה — רק אחרי יצירת System Guest Parent (סעיף 1).  
**חשוב:** רק הבעלים מריץ. לא להריץ אוטומטית מ-CI או מסקריפטים.

## 1. לפני ה-migration

### יצירת System Guest Parent

1. פתח Supabase Dashboard → Authentication → Users
2. צור משתמש (או השתמש בקיים):
   - Email: `guest-system@liosh.invalid` (או ערך `GUEST_SYSTEM_PARENT_EMAIL` ב-`.env.local`)
3. ודא שיש שורה ב-`parent_profiles` עם `id` = `auth.users.id` של המשתמש

```sql
-- אחרי יצירת auth user, החלף <GUEST_PARENT_UUID>:
insert into public.parent_profiles (id, display_name)
values ('<GUEST_PARENT_UUID>', 'Guest System')
on conflict (id) do nothing;
```

### גיבוי

מומלץ: snapshot / backup לפני migration על production.

## 2. הרצת ה-migration

**קובץ:** `supabase/migrations/086_guest_child_mode.sql`

### דרך Supabase SQL Editor

1. העתק את כל תוכן הקובץ
2. Supabase → SQL Editor → New query
3. הדבק והרץ
4. ודא שאין שגיאות — `COMMIT` בסוף

### דרך CLI (אופציונלי)

```bash
supabase db push
```

(רק אם זה workflow שאתה משתמש בו בפרויקט)

## 3. אחרי ההרצה — בדיקות מהירות

```sql
-- עמודות students
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'students'
  and column_name in ('account_kind', 'leo_number', 'guest_status');

-- ילדים רשומים: guest_status חייב להיות NULL
select count(*) as bad_registered_guest_status
from public.students
where account_kind = 'registered' and guest_status is not null;

-- guest_mode כבוי כברירת מחדל
select setting_value_json
from public.guest_mode_settings
where setting_key = 'guest_mode_enabled';

-- access_code_id ב-student_sessions — חייב להיות nullable (session אורch)
select is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'student_sessions'
  and column_name = 'access_code_id';

-- טבלאות guest
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'guest_%';

-- seed settings
select setting_key from public.guest_mode_settings;
```

צפוי:
- `bad_registered_guest_status = 0`
- `guest_mode_enabled` → `{"enabled": false}`
- `access_code_id` → `is_nullable = YES`

## 4. משתני סביבה (אופציונלי)

```env
GUEST_SYSTEM_PARENT_EMAIL=guest-system@liosh.invalid
```

## 5. Rollback

ראה הערות rollback בראש קובץ `086_guest_child_mode.sql`.

**אזהרה:** rollback מוחק עמודות — רק אם לא נוצרו אורchים ב-production.
