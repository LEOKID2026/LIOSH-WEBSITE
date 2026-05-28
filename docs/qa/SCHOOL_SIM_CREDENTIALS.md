# School Simulation — Credential Model (Operator)

No new passwords are required in repo. The simulation uses **existing** demo teacher/school-manager email accounts for teacher/admin/report flows. For **student UI sampling**, it must use the **actual generated student username + PIN** from the managed-school credential system — **not** a hardcoded global PIN.

---

## 1. Teacher / school manager (email + password)

Use known QA/demo accounts already in Supabase auth:

| Role | Example email |
|------|----------------|
| School manager | `school@leo-k.com` |
| Teachers | `dan@leo-k.com`, `vered@leo-k.com`, … (see `demo-school-data.mjs`) |

Password is read at runtime from **one** of these env vars (first set wins in scripts):

- `DEMO_TEACHER_PASSWORD`
- `SCHOOL_QA_PASSWORD`
- `SCHOOL_SECURITY_TEST_PASSWORD` (fallback in some QA scripts)
- `TEACHER_PORTAL_VERIFY_PASSWORD` (fallback)

Do **not** hardcode passwords in code. Do **not** commit `.env.local`. Do **not** print password values in logs or reports.

---

## 2. Students (username + PIN per child)

Managed-school students log in with **generated** `login_username` + PIN (see `/student/login`). The database stores `login_username`, `code_hash`, and `pin_hash` only.

**PIN cannot be recovered from `pin_hash`.** The nightly runner does not guess a global `DEMO_STUDENT_PIN=1234` unless your seed run explicitly used that value and recorded it locally.

### Gitignored local artifact

Path (never committed):

`scripts/school-portal/.local/student-access-credentials.json`

Written automatically when you run:

```powershell
node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=students
```

(requires `DEMO_STUDENT_PIN` in env **at seed time** — that plaintext is stored only in the gitignored file, not in the repo)

### If the school was seeded earlier without an artifact

Either:

1. Re-run `--phase=students` with `DEMO_STUDENT_PIN` set to the PIN that was used originally (if you know it), **or**
2. Use the school manager UI credential reset flow for sampled students, then record results in the gitignored artifact via export helper:

```powershell
# Only if you confirm DEMO_STUDENT_PIN matches the original seed:
# $env:SCHOOL_SIM_ASSUME_SEED_PIN='1'
# $env:DEMO_STUDENT_PIN='<pin used at seed>'
node --env-file=.env.local scripts/school-portal/export-demo-student-credentials.mjs
```

Do **not** create new auth users. Do **not** change student/parent login product behavior.

---

## 3. Parents — scaffolding vs school parents

| Account | Purpose |
|---------|---------|
| `demofamily@leo-k.com` | **Scaffolding** demo parent for the 398 seeded children under one `parent_id`. Used only for limited **R1** sanity (Phase 2 `learning_sessions` on those students). |
| Real school parents | Use managed-school **generated** username + PIN (same model as students), not this email. |

R1 validation in the nightly sim is **not** proof that every school parent can log in with email/password.

Staff/parent password for scaffolding R1 checks: `DEMO_PARENT_PASSWORD` or fall back to teacher QA env vars above.

---

## 4. Running the nightly sim

```powershell
# .env.local — staff passwords only (names only; values not documented here)
# DEMO_TEACHER_PASSWORD=...
# DEMO_PARENT_PASSWORD=...   # optional; scaffolding parent
# SCHOOL_QA_PASSWORD=...     # alternative

npm run qa:school:daily
```

Student UI phase requires the gitignored credential artifact (≥12 entries). Preflight fails with a clear path if it is missing.

---

## 5. What we do not do

- No new users
- No invented passwords in tracked files
- No auth logic changes
- No assumption that all 398 students share one PIN unless seed + artifact prove it
