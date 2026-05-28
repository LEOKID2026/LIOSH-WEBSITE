# School Simulation — Credential Model (Operator)

The Full School Active Daily Simulation uses **existing** demo teacher/school-manager email accounts for teacher/admin/report flows. For **student UI sampling**, it must use the **actual generated student username + PIN** from the managed-school credential system — **not** a hardcoded global PIN.

This repo includes **tracked QA fixtures** so a fresh laptop clone can run preflight without manually copying local artifacts. **No real secrets are committed.**

---

## 1. Laptop setup from Git

After `git clone` and `npm install`:

1. Create `.env.local` at repo root (never committed) with Supabase env + staff passwords — see section 2.
2. Pull gives you tracked demo fixtures under `scripts/school-portal/fixtures/`:
   - `demo-school-sim-state.json` — demo school IDs, classes, student list
   - `demo-student-access-credentials.json` — fake demo student usernames + PINs (QA only)
3. Run preflight:

```powershell
npm run qa:school:daily:preflight
```

### Local overrides (optional)

If you have richer local state from seeding on this machine, these **gitignored** files take precedence:

| Priority | Sim state | Student credentials |
|----------|-----------|---------------------|
| 1 (first) | `scripts/school-portal/sim-state.json` | `scripts/school-portal/.local/student-access-credentials.json` |
| 2 (fallback) | `scripts/school-portal/fixtures/demo-school-sim-state.json` | `scripts/school-portal/fixtures/demo-student-access-credentials.json` |

Fixture fallback is **limited to demo school simulation scripts only** (`scripts/school-portal/`). It does not affect product auth, routes, or UI.

Re-seed or export still writes to the gitignored local paths only.

---

## 2. Teacher / school manager (email + password)

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

Required Supabase env (in `.env.local`, never committed):

- `NEXT_PUBLIC_LEARNING_SUPABASE_URL`
- `LEARNING_SUPABASE_SERVICE_ROLE_KEY`
- `LEARNING_STUDENT_ACCESS_SECRET`

---

## 3. Students (username + PIN per child)

Managed-school students log in with **generated** `login_username` + PIN (see `/student/login`). The database stores `login_username`, `code_hash`, and `pin_hash` only.

**PIN cannot be recovered from `pin_hash`.** The nightly runner does not guess a global `DEMO_STUDENT_PIN=1234` unless your seed run explicitly used that value and recorded it locally or in the tracked demo fixture.

### Tracked demo fixture (committed)

Path:

`scripts/school-portal/fixtures/demo-student-access-credentials.json`

Contains fake demo student usernames (`demo-*`) and PINs for the leo-k QA school only. Safe to commit — not production credentials.

### Gitignored local artifact (optional override)

Path:

`scripts/school-portal/.local/student-access-credentials.json`

Written automatically when you run:

```powershell
node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=students
```

(requires `DEMO_STUDENT_PIN` in env **at seed time**)

### If the school was seeded earlier without a local artifact

Either:

1. Use the tracked demo fixture (automatic fallback), **or**
2. Re-run `--phase=students` with `DEMO_STUDENT_PIN` set to the PIN used originally, **or**
3. Export via:

```powershell
# Only if you confirm DEMO_STUDENT_PIN matches the original seed:
# $env:SCHOOL_SIM_ASSUME_SEED_PIN='1'
# $env:DEMO_STUDENT_PIN='<pin used at seed>'
node --env-file=.env.local scripts/school-portal/export-demo-student-credentials.mjs
```

Do **not** create new auth users. Do **not** change student/parent login product behavior.

---

## 4. Parents — scaffolding vs school parents

| Account | Purpose |
|---------|---------|
| `demofamily@leo-k.com` | **Scaffolding** demo parent for the 398 seeded children under one `parent_id`. Used only for limited **R1** sanity (Phase 2 `learning_sessions` on those students). |
| Real school parents | Use managed-school **generated** username + PIN (same model as students), not this email. |

R1 validation in the nightly sim is **not** proof that every school parent can log in with email/password.

Staff/parent password for scaffolding R1 checks: `DEMO_PARENT_PASSWORD` or fall back to teacher QA env vars above.

---

## 5. Running the nightly sim

```powershell
# .env.local — Supabase env + staff passwords (values not documented here)
# NEXT_PUBLIC_LEARNING_SUPABASE_URL=...
# LEARNING_SUPABASE_SERVICE_ROLE_KEY=...
# LEARNING_STUDENT_ACCESS_SECRET=...
# DEMO_TEACHER_PASSWORD=...
# DEMO_PARENT_PASSWORD=...   # optional; scaffolding parent
# SCHOOL_QA_PASSWORD=...     # alternative

npm run qa:school:daily
```

Student UI phase requires student credentials (≥12 entries) from local file or demo fixture. Preflight fails with a clear path if both are missing.

---

## 6. What we do not do

- No new users
- No real Supabase keys or service role keys in tracked files
- No teacher/admin passwords in tracked files
- No auth logic changes
- No assumption that all 398 students share one PIN unless seed + artifact prove it
