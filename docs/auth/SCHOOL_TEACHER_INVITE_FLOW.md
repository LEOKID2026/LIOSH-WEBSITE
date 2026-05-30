# School teacher / staff invite — current product flow

## School Manager adds teacher by email

**Route:** `/school/teachers`  
**UI:** `SchoolStaffEmailInviteForm` (email-first; UUID under «אפשרויות מתקדמות»)  
**API:** `POST /api/school/teachers` with `{ email }` or advanced `{ teacherUserId }`

### What happens today

1. Manager enters staff email.
2. Server resolves email → Supabase auth user id (`parseStaffInviteBody` → `resolveAuthUserIdByEmail`).
3. If **no auth user** → `404 staff_user_not_found` with Hebrew UI message explaining the user must register/login to the teacher portal first.
4. If **user exists** → `inviteSchoolTeacherByManager` → `assignTeacherToSchool` with `school_teacher` membership + `school_teacher` persona entitlement (within school teacher quota).
5. Manager assigns subjects/classes on the teacher detail page (`POST /api/school/teachers/[id]/subjects`).

### Not implemented (deferred)

- Automatic creation of auth accounts for unknown emails.
- Email invitation links / magic-link onboarding for school staff.
- School-issued username+PIN staff login (see `SCHOOL_STAFF_LOGIN_MODEL_PROPOSAL.md`).

### Operator invite

Same pattern on `/school/operators` → `POST /api/school/operators` → `school_operator` membership + entitlement + grant panel.

## Manager step-by-step (teacher)

1. Ensure the teacher has a Supabase account (self-register at `/teacher/login` or admin-created private teacher account — school staff should use teacher portal login, not parent).
2. Open **מורים** → **הוספת מורה לבית הספר**.
3. Enter teacher email → **הזמנת מורה**.
4. Open teacher card → assign **מקצועות** and ensure **כיתות** exist for roster visibility.
