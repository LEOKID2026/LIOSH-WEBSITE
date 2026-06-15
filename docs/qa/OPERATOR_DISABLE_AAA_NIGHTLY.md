# Operator: Disable AAA Virtual-Student Nightly

The 12-student AAA Phase D2 nightly is superseded by the full-school simulation (`npm run qa:school:daily:write` for real runs).

> **מדריך הרצה מלא (dry-run / write):** [SIMULATION_RUNBOOK.md](./SIMULATION_RUNBOOK.md)

**Disable Task Scheduler task (run once on the operator machine):**

```bat
schtasks /Change /TN "Liosh QA — virtual student nightly" /Disable
```

If the task does not exist, no action is required.

**Preserved in repo:** `scripts/virtual-student-qa/`, `scripts/launch-readiness/`, all `npm run qa:launch:*` scripts.

**Manual AAA smoke (still available):**

```powershell
node scripts/virtual-student-qa/run.mjs --phase d2 --students AAA1 --mode fast
```

See also: [SCHOOL_SIM_CREDENTIALS.md](./SCHOOL_SIM_CREDENTIALS.md) for credential model (no global student PIN).
