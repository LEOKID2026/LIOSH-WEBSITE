# QA visual output (pinned artifacts)

This folder contains **checked-in snapshots** from parent-report PDF / signoff runs (`git add -f` per root `.gitignore` comment). They are useful as regression references but may show **older verdicts** (e.g. `"verdict": "FAIL"` in `real-output-signoff-report.json`).

## Launch status

For current certified launch readiness, use:

**[`docs/FULL_LAUNCH_READINESS_STATUS.md`](../docs/FULL_LAUNCH_READINESS_STATUS.md)**

—not the JSON/PDF files in this directory.

To refresh signoff artifacts locally (does not change launch certification by itself):

```bash
npm run test:parent-report-real-output-signoff
```

Output may update `real-output-signoff-report.json` and PDFs here; commit only after an intentional baseline refresh.
