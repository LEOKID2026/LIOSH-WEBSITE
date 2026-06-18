# Realistic smoke — 2 students, production QA, in-session pacing required.
# Prepares local state (lastRunDate=2026-04-30) then runs one day.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path

Write-Host "[smoke] preparing local state for date-guard (2026-04-30 baseline)..."
node (Join-Path $scriptDir 'prepare-smoke-state.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[smoke] running 2026-05-01 realtime smoke AAA1,AAA2..."
& (Join-Path $scriptDir 'run-nightly.ps1') `
  -Mode realtime `
  -Date '2026-05-01' `
  -Students 'AAA1,AAA2'

exit $LASTEXITCODE
