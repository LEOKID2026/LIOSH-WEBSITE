# Teacher Classroom Daily Simulation — Nightly wrapper (NOT auto-registered)
# Mirrors virtual-student-qa run-nightly.ps1 pattern. Run manually or register Task Scheduler only when approved.
param(
  [string]$Grade = "g3",
  [string]$Subject = "",
  [string]$BaseUrl = "https://liosh-website.vercel.app",
  [switch]$Force,
  [switch]$DryRun,
  [string]$EnvFile = "$env:LOCALAPPDATA\liosh-qa\env\teacher-classroom-sim.env.ps1",
  [string]$LogDir = "$env:LOCALAPPDATA\liosh-qa\logs\teacher-classroom-daily"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Date = (Get-Date -Format "yyyy-MM-dd")
$LogFile = Join-Path $LogDir "$Date-run.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (Test-Path $EnvFile) { . $EnvFile }

$args = @(
  "--env-file=.env.local",
  "scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs",
  "--grade=$Grade",
  "--base-url=$BaseUrl"
)
if ($Subject) { $args += "--subject=$Subject" }
if ($Force) { $args += "--force=true" }
if ($DryRun) { $args += "--dry-run=true" }

Push-Location $RepoRoot
try {
  node @args 2>&1 | Tee-Object -FilePath $LogFile -Append
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
