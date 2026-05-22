# Virtual-Student QA — Nightly Scheduler Setup

> Operator runbook for running the Phase D2 daily learning simulator
> automatically every night against the live Vercel deployment using
> Windows Task Scheduler.
>
> **Scope:** the QA / simulation tooling under `scripts/virtual-student-qa/`.
> No product code, no Hebrew copy, no parent-report logic, no learning
> engine, no Supabase schema is modified by anything in this runbook.

---

## What this runbook delivers

1. A **private env file** under `%LOCALAPPDATA%`, *outside the repo*,
   that holds the QA parent password and the AAA1–AAA12 student
   credentials. This file is never committed.
2. A **wrapper script** at `scripts/virtual-student-qa/scripts/run-nightly.ps1`
   that loads that env file, invokes the Node runner with the right
   flags, tees output to a log file under `%LOCALAPPDATA%\liosh-qa\nightly-logs\`,
   and propagates the runner's exit code so Task Scheduler shows
   PASS / FAIL correctly.
3. A **Windows Task Scheduler trigger** that runs the wrapper every
   night at a chosen local time (recommended: 22:30 → 02:00 window).
4. A **two-step controlled validation** procedure (dry-run +
   preflight-only) that proves the wrapper works **without** advancing
   the longitudinal state, so you can stage the scheduler safely
   before turning it loose for a full nightly run.

---

## Who this is for

The single operator (the project owner) running the simulator on their
own Windows machine. The owner is expected to:

- Have admin / their own user account on the machine that will run the
  scheduler.
- Be comfortable opening **Task Scheduler** and pasting one or two
  PowerShell commands.
- Treat the env file as credentials. Never email it, never paste it
  in chat, never commit it.

---

## Prerequisites

| Component | Required version | How to verify |
|---|---|---|
| **Windows** | 10 / 11 with Task Scheduler | `schtasks /query /tn "*"` shows existing tasks |
| **PowerShell** | 5.1 (built-in) **or** 7+ | `$PSVersionTable.PSVersion` |
| **Node.js** | LTS (≥ 18) on the **system** PATH | `node --version` from a fresh `cmd` window |
| **Repo** | This repo cloned and previously bootstrapped (`npm i`) | `node scripts/virtual-student-qa/run.mjs --help` succeeds |
| **Network** | Outbound HTTPS to `liosh-website.vercel.app` | The D2.5 realtime smoke completed in the most recent session |

If `node` is not visible from a fresh `cmd` window without manual PATH
adjustment, **Task Scheduler will not see it either** — fix the system
PATH first.

---

## Step 1 — Create the private env file

Path (default, hard-coded into `run-nightly.ps1`):

```text
%LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1
```

This expands to something like
`C:\Users\<you>\AppData\Local\liosh-qa\env\virtual-student-qa.env.ps1`.

> **Why outside the repo?** Two reasons:
> 1. Repo files are world-readable and get backed up / synced. Credentials
>    must not be either.
> 2. The longitudinal state file `state.json` already lives in
>    `%LOCALAPPDATA%\liosh-qa\virtual-student-state\`. Co-locating env
>    next to state means a single folder owns "everything that survives
>    `git clean -fdx`".

Create the folder, then create the file with this exact content
(replace `<parent-password-here>` with the real QA parent password):

```powershell
# scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md — env file template
#
# This is a PowerShell script. run-nightly.ps1 dot-sources it BEFORE
# invoking node. Anything you `$env:Foo = "..."` here becomes visible
# to the Node runner.
#
# DO NOT commit this file. DO NOT paste it in chat / email / screenshots.

$env:E2E_PARENT_EMAIL = "admin@admin.com"
$env:E2E_PARENT_PASSWORD = "<parent-password-here>"

# JSON list of all 12 AAA student accounts. Each entry must have
# label / username / pin. PIN is a 4-digit string ("1234"), NOT a number.
$env:VIRTUAL_STUDENT_ACCOUNTS = '[{"label":"AAA1","username":"AAA1","pin":"1234"},{"label":"AAA2","username":"AAA2","pin":"1234"},{"label":"AAA3","username":"AAA3","pin":"1234"},{"label":"AAA4","username":"AAA4","pin":"1234"},{"label":"AAA5","username":"AAA5","pin":"1234"},{"label":"AAA6","username":"AAA6","pin":"1234"},{"label":"AAA7","username":"AAA7","pin":"1234"},{"label":"AAA8","username":"AAA8","pin":"1234"},{"label":"AAA9","username":"AAA9","pin":"1234"},{"label":"AAA10","username":"AAA10","pin":"1234"},{"label":"AAA11","username":"AAA11","pin":"1234"},{"label":"AAA12","username":"AAA12","pin":"1234"}]'

# Optional: pin a specific deployment URL. The wrapper defaults to
# https://liosh-website.vercel.app — uncomment to override (e.g. for a
# preview deployment).
# $env:VIRTUAL_STUDENT_BASE_URL = "https://liosh-website.vercel.app"
```

A one-liner to create the directory if it doesn't exist:

```powershell
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\liosh-qa\env" | Out-Null
notepad "$env:LOCALAPPDATA\liosh-qa\env\virtual-student-qa.env.ps1"
```

---

## Step 2 — Validate the env file (no UI, no state)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\virtual-student-qa\scripts\run-nightly.ps1 `
  -DryRun
```

Expected:

- Console + log file both contain a `[run-nightly] env loaded = OK ...`
  line and an `[run-nightly] node = ...` line.
- The Node runner reaches `status: PASS, slice: D2.1, stage: dry-run`.
- A new file appears in `%LOCALAPPDATA%\liosh-qa\nightly-logs\`
  named `<timestamp>__realtime__<today>__dry-run.log`.
- `%LOCALAPPDATA%\liosh-qa\virtual-student-state\state.json` is
  **NOT** modified (check by comparing `lastRunDate` before and after).

Common failures and fixes:

| Symptom | Fix |
|---|---|
| `FATAL: env file not found at ...` | Create the env file at the path the error reports. |
| `FATAL: required env vars missing -> E2E_PARENT_PASSWORD` | The env file is missing the line; or you used `=` with curly quotes; or the file is saved as UTF-16 with BOM (save as UTF-8). |
| `FATAL: VIRTUAL_STUDENT_ACCOUNTS is not a JSON array` | The value isn't a valid JSON array. The wrapper validates this before launching a browser. |
| `FATAL: 'node' is not on PATH` | Fix the system PATH; reopen `cmd` and verify `node --version` works. |

---

## Step 3 — Validate against the live Vercel UI (no learning, no state)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\virtual-student-qa\scripts\run-nightly.ps1 `
  -PreflightOnly
```

This actually drives Playwright against `liosh-website.vercel.app` and
performs:

1. Parent UI login (`admin@admin.com` via the real `/parent/login` page).
2. `/api/parent/list-students` validation that the parent owns
   AAA1–AAA12 with non-empty `full_name` + `grade_level`.
3. 12 student UI logins (`AAA1`..`AAA12` via `/student/login`).

Expected:

- Console + log show `slice: D2.2, stage: preflight-only, status: PASS`.
- Vercel reachable: `preflight: GET https://liosh-website.vercel.app/ -> HTTP 200`.
- Each AAA student logs in OK in ~1.5–2 s.
- `state.json` still **NOT** modified.

If preflight fails here, fix it **before** wiring the scheduler. The
nightly run will fail at the same step, just at 02:00.

---

## Step 4 — Configure Windows Task Scheduler

You can use either the GUI or `schtasks`. The trigger should match the
Vercel-deployed app's expected nightly window.

### Option A: schtasks one-liner

Run this once in an elevated `cmd` (Run as administrator), substituting
your repo path:

```bat
schtasks /Create ^
  /TN "Liosh QA — virtual student nightly" ^
  /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\ERAN YOSEF\Desktop\final projects\FINAL-WEB\LIOSH-WEB-TRY\scripts\virtual-student-qa\scripts\run-nightly.ps1\"" ^
  /SC DAILY ^
  /ST 22:30 ^
  /RL LIMITED ^
  /F
```

Notes:
- `/RL LIMITED` runs as the current user without elevation — sufficient
  because everything writes only to `%LOCALAPPDATA%`.
- `/ST 22:30` is the daily start time. Change this if 22:30 conflicts
  with your own Vercel usage.
- `/F` overwrites an existing task with the same name (safe to rerun).

### Option B: Task Scheduler GUI

1. Open **Task Scheduler** (`taskschd.msc`).
2. **Create Basic Task** → name it `Liosh QA — virtual student nightly`.
3. **Trigger:** Daily, 22:30 (or your chosen time).
4. **Action:** Start a program.
   - **Program/script:** `powershell.exe`
   - **Add arguments:**
     ```
     -NoProfile -ExecutionPolicy Bypass -File "C:\Users\ERAN YOSEF\Desktop\final projects\FINAL-WEB\LIOSH-WEB-TRY\scripts\virtual-student-qa\scripts\run-nightly.ps1"
     ```
   - **Start in:** *(leave empty — the wrapper auto-cd's to the repo
     root)*
5. Finish the wizard.
6. Open the task's **Properties → Settings**:
   - ☑ "Allow task to be run on demand" (so you can right-click → Run).
   - ☑ "If the running task does not end when requested, force it to
     stop" (a 480-min hard cap is already enforced by the runner; this
     is just a Windows-side belt-and-suspenders).
   - **If the task is already running:** "Do not start a new instance".
   - **If the task fails, restart every:** *Leave unchecked* — the
     runner has its own idempotency / state-safety. Restart-on-fail
     would re-run a partial day and confuse `state.json`.
7. **Conditions:**
   - **Wake the computer to run this task:** ☑ if you want it to run
     even if the laptop is asleep at 22:30.
   - **Start the task only if the computer is on AC power:** *Operator's
     choice. Recommended ☑ for laptops.*

---

## Step 5 — First scheduled run (the moment you stop being unattended-safe)

> **This is the single point of no return.** Up to here, nothing has
> ever advanced `state.json` from this runbook. The first scheduled
> run will.

Recommended approach: **stage it once with eyes on the screen first.**

1. In Task Scheduler, right-click your task → **Run**.
2. Watch the most recent file under `%LOCALAPPDATA%\liosh-qa\nightly-logs\`
   stream lines (e.g. `Get-Content -Wait <path>`).
3. Confirm:
   - Preflight passes (parent + 12 students).
   - The plan reports `studied=...` (some non-zero count) and the
     daily orchestrator works through each student in turn.
   - For each studied student you see `verdict=pass` (or the suite
     summary at the end shows `pass + partial = total studied` and
     `fail = 0`).
   - `state-advance: state.json updated atomically (rowsAppended=N, ...)`
     appears at the end.
4. Open
   `reports\virtual-student-daily\<today>\run-summary.md` from the
   repo and confirm it looks right.
5. Open `state.json` in
   `%LOCALAPPDATA%\liosh-qa\virtual-student-state\` and confirm
   `lastRunDate` is today, `lastRunStatus = pass`, `lastRunMode = realtime`.
6. Confirm `state.json.bak` exists and contains the **previous**
   `lastRunDate`. (Atomic rotation is what protects you from a corrupt
   half-write.)

If anything in the above is off, **disable the task** in Task
Scheduler before the next 22:30 trigger and investigate from the log
file.

---

## Step 6 — Operations and monitoring

### Daily flow once it's stable

The morning after each run, do **one** of these spot-checks (a 30-second
glance, not a full audit):

1. Open the newest file in `%LOCALAPPDATA%\liosh-qa\nightly-logs\`.
   Skim for `suite verdict=` and `state-advance:` near the end.
2. Open `reports\virtual-student-daily\<yesterday>\run-summary.md`
   in the repo.
3. Open
   `%LOCALAPPDATA%\liosh-qa\virtual-student-state\timeline.md`
   and look at the most recent rows — one row per studied student per
   day.

The parent dashboard at
`https://liosh-website.vercel.app/parent/dashboard`, signed in as
`admin@admin.com`, is the human-friendly truth: each AAA student's
report should reflect cumulative activity over the days the simulator
has run.

### Re-running a failed or partial day

The runner's idempotency check **blocks** a same-day re-run by default
(no duplicate activity inside one calendar date). If you want to
re-run after fixing an issue, pass `-Force`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts\virtual-student-qa\scripts\run-nightly.ps1 `
  -Force -Date 2026-05-26
```

This is intentionally an **explicit operator action** — Task Scheduler
should never do it automatically.

### Disabling temporarily

```bat
schtasks /Change /TN "Liosh QA — virtual student nightly" /Disable
schtasks /Change /TN "Liosh QA — virtual student nightly" /Enable
```

Or in the GUI: right-click the task → **Disable** / **Enable**.

### Removing entirely

```bat
schtasks /Delete /TN "Liosh QA — virtual student nightly" /F
```

The longitudinal state and logs under `%LOCALAPPDATA%\liosh-qa\` are
left in place — delete that folder manually if you also want to wipe
the simulation history.

---

## Failure modes and what they mean

| Symptom in log | Cause | Action |
|---|---|---|
| `FATAL: env file not found / required env vars missing` | Env file deleted or moved. | Recreate per Step 1. |
| `preflight: ... HTTP 5xx` or timeout reaching `/` | Vercel down, deployment broken, network / DNS. | Skip the night; the runner will not advance state. Investigate Vercel separately. |
| `preflight: list-students FAIL — missing labels: AAA?` | A QA student was deleted in Supabase, or `login_username` was changed. | Restore the account; rerun preflight. |
| `preflight: student AAAx FAIL — pin mismatch / locked` | Student PIN changed in Supabase. | Reset to `1234` (or update env file accordingly). |
| `suite verdict=fail` | One or more student sessions failed mid-run. | Read the per-student log under `reports/virtual-student-daily/<date>/`. State is **not** advanced on fail. |
| `state-advance: ... succeeded=false, error=...` | Disk full / permission issue writing `state.json`. | Free space, fix permissions, then `-Force` rerun the date. |
| Task ran but no log file appeared | Task Scheduler couldn't even find PowerShell, OR a typo in the `-File` path. | Check **Task Scheduler → History** for the launch error. |
| Task ran, log says exit 2, no `runnerExit` line | Wrapper-level fatal. The reason is the line just above `exit 2`. | Fix the wrapper-level prerequisite (env file / node / repo path). |
| Task ran, log says exit 1 in `runnerExit` | Runner-level fail (preflight or per-student). | Investigate the per-day `reports/virtual-student-daily/<date>/run-summary.md`. |

---

## What this is **not**

- Not a replacement for the static QA suites (`npm run qa:*`). Those
  validate the simulator engine; this nightly drives the **real**
  product UI on Vercel.
- Not a load test. Pacing (realtime mode, 30 s – 3 min between
  students, 3 – 25 min between same-student sessions) is deliberately
  human-shaped to keep a small Vercel footprint.
- Not a product-correctness gate. If something on Vercel breaks, the
  simulator surfaces it (preflight or per-student fail), but the
  fix is in the product, not here.
- Not allowed to advance state on FAIL. The state-advance gate inside
  the runner guarantees `state.json` only changes when the day's run
  actually passed (or partial-passed); this wrapper does not override
  that.

---

## Reference: what gets created where

```text
%LOCALAPPDATA%\liosh-qa\
  env\
    virtual-student-qa.env.ps1        ← you create this in Step 1 (private)
  virtual-student-state\
    state.json                        ← longitudinal state (the runner owns)
    state.json.bak                    ← atomic-write previous version
    timeline.md                       ← human-readable append-only log
  nightly-logs\
    2026-05-22_223005__realtime__2026-05-22__full-run.log
    2026-05-22_223005__realtime__2026-05-22__dry-run.log     (validation runs)
    ...

<repo>\reports\virtual-student-daily\
  2026-05-22\
    run-summary.json
    run-summary.md
    plan.json
    state-snapshot.json               ← snapshot of state.json after the run
    failure-repro.md                  ← only present if the run failed
    s01-AAA1\, s02-AAA5\, ...         ← per-student screenshots & logs
```

The repo only ever stores **artifacts**, not credentials and not the
longitudinal state file. The two are deliberately separated so a
`git clean -fdx` cannot wipe the simulation history.
