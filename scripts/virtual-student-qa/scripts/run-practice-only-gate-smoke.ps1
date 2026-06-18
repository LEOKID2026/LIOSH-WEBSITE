# Practice-only gate smoke — all 6 subjects, in-session pacing ON, no --force.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path

$envFile = Join-Path $env:LOCALAPPDATA 'liosh-qa\env\virtual-student-qa.env.ps1'
if (Test-Path $envFile) {
  Write-Host "[practice-gate] loading env from $envFile"
  . $envFile
}

Write-Host "[practice-gate] static + runtime + answer guards; 6 subjects; pacing ON..."
Push-Location $repoRoot
try {
  node (Join-Path $scriptDir '..\tools\practice-only-gate-smoke.mjs') `
    --students 'AAA1' `
    --date '2026-05-01'
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
