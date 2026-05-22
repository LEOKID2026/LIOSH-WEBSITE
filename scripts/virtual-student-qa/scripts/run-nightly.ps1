<#
.SYNOPSIS
  Task Scheduler-friendly wrapper for the Virtual-Student QA Phase D2 daily
  runner.

.DESCRIPTION
  Loads private credentials from a private env file
  (default %LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1, never
  committed to git), invokes the Node runner under
  scripts/virtual-student-qa/run.mjs with the appropriate flags, tees the
  full output to a per-run log file under
  %LOCALAPPDATA%\liosh-qa\nightly-logs\, and propagates the runner's
  exit code so Task Scheduler's "last result" column reflects PASS / FAIL.

  The runner itself enforces all D2 invariants (state-advance gate,
  idempotency without --force, atomic .json + .json.bak rotation,
  preflight-only / dry-run never touching state). This wrapper only
  arranges environment, working directory, logging, and exit-code
  propagation; it never duplicates that logic.

  See scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md for the operator
  runbook (env file template, Task Scheduler configuration, validation
  steps, troubleshooting).

.PARAMETER Mode
  'realtime' (default — what nightly Task Scheduler runs should use) or
  'fast' (smoke / validation). Realtime applies human-like pauses between
  sessions and students; fast is essentially zero-pause with a 2 s
  Vercel-politeness floor between students.

.PARAMETER Date
  YYYY-MM-DD. Defaults to today in the system's local timezone (which is
  what Task Scheduler treats as "tonight's run"). The runner uses this
  date as both the seed for deterministic plan generation and the key in
  the longitudinal state's attendance table.

.PARAMETER Students
  Comma-separated subset of student labels (e.g. 'AAA1,AAA5,AAA11').
  Default: empty — every studied student in the day's plan participates.
  Useful for smoke validation against a small subset before turning a new
  Task Scheduler trigger loose on all 12 students.

.PARAMETER BaseUrl
  Optional override of the deployment URL. Default:
  https://liosh-website.vercel.app.

.PARAMETER Force
  Pass --force to the runner. Allows intentional reruns of the same date
  after fixing an issue. Without --force the runner's idempotency check
  blocks duplicate same-day activity. The wrapper does NOT default to
  --force — nightly Task Scheduler runs should never need it.

.PARAMETER PreflightOnly
  Pass --preflight-only. Runs parent UI login + list-students + 12 student
  UI logins. No learning, no state advancement. Use to validate that the
  env file + Vercel still let the QA accounts log in.

.PARAMETER DryRun
  Pass --dry-run. Generates the daily plan only. No UI, no state
  advancement. Use to validate that the env file + node toolchain are
  wired up correctly.

.PARAMETER EnvFile
  Path to the private env file to dot-source. Default:
  %LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1. The file must
  set $env:E2E_PARENT_EMAIL, $env:E2E_PARENT_PASSWORD, and
  $env:VIRTUAL_STUDENT_ACCOUNTS at minimum. NEVER place this file inside
  the repository.

.PARAMETER LogDir
  Directory for per-run log files. Default:
  %LOCALAPPDATA%\liosh-qa\nightly-logs. The wrapper creates the directory
  if needed and writes one log file per invocation, named
  '<yyyy-MM-dd_HHmmss>__<mode>__<date>__<stage>.log'.

.EXAMPLE
  # Standard nightly invocation (what Task Scheduler runs):
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File run-nightly.ps1

.EXAMPLE
  # Validation step 1: env + plan only, no UI.
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File run-nightly.ps1 -DryRun

.EXAMPLE
  # Validation step 2: env + parent UI + 12 student UI logins, no learning.
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File run-nightly.ps1 -PreflightOnly

.NOTES
  Exit codes:
    0   PASS (or PARTIAL — same as run.mjs exit policy).
    1   FAIL inside the Node runner.
    2   Wrapper-level error: missing env file, missing critical env vars,
        node not on PATH, or repo root not resolvable.

  This script is safe to invoke directly OR through Task Scheduler. It
  has no side effects beyond writing the log file when invoked with
  -DryRun or -PreflightOnly (the runner itself guarantees no state
  advancement under those flags).
#>

[CmdletBinding()]
param(
  [ValidateSet('realtime', 'fast')]
  [string]$Mode = 'realtime',

  [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
  [string]$Date = (Get-Date -Format 'yyyy-MM-dd'),

  [string]$Students,

  [string]$BaseUrl = 'https://liosh-website.vercel.app',

  [switch]$Force,

  [switch]$PreflightOnly,

  [switch]$DryRun,

  [string]$EnvFile,

  [string]$LogDir
)

$ErrorActionPreference = 'Continue'

# ---------------------------------------------------------------------------
# 0. Resolve script-anchored paths.
# ---------------------------------------------------------------------------

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
# This script lives at scripts/virtual-student-qa/scripts/run-nightly.ps1.
# Repo root is three levels up.
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path

if (-not $EnvFile) {
  $EnvFile = Join-Path $env:LOCALAPPDATA 'liosh-qa\env\virtual-student-qa.env.ps1'
}

if (-not $LogDir) {
  $LogDir = Join-Path $env:LOCALAPPDATA 'liosh-qa\nightly-logs'
}

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Stage label is the first switch among PreflightOnly / DryRun / full-run.
# Used in the log file name so an operator scanning the folder can tell at
# a glance which kind of run produced each log.
$stageLabel = if ($DryRun) { 'dry-run' }
              elseif ($PreflightOnly) { 'preflight-only' }
              else { 'full-run' }

$invokedAt = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$logName = "$invokedAt`__$Mode`__$Date`__$stageLabel.log"
$logPath = Join-Path $LogDir $logName

# ---------------------------------------------------------------------------
# 1. Tee helper: write to log file AND console.
#
# We use Out-File -Append (instead of `Tee-Object`) so individual lines
# don't get buffered when a long Node run streams its progress lines.
# ---------------------------------------------------------------------------

function Write-Tee {
  param([Parameter(Mandatory = $true, ValueFromPipeline = $true)] $line)
  process {
    $text = if ($null -eq $line) { '' } else { [string]$line }
    $text | Out-File -FilePath $logPath -Append -Encoding utf8
    Write-Host $text
  }
}

Write-Tee "============================================================"
Write-Tee "[run-nightly] startedAt    = $(Get-Date -Format 's')"
Write-Tee "[run-nightly] script       = $scriptPath"
Write-Tee "[run-nightly] repoRoot     = $repoRoot"
Write-Tee "[run-nightly] envFile      = $EnvFile"
Write-Tee "[run-nightly] logDir       = $LogDir"
Write-Tee "[run-nightly] logPath      = $logPath"
Write-Tee "[run-nightly] mode         = $Mode"
Write-Tee "[run-nightly] date         = $Date"
Write-Tee "[run-nightly] baseUrl      = $BaseUrl"
Write-Tee "[run-nightly] students     = $(if ($Students) { $Students } else { '(all participating)' })"
Write-Tee "[run-nightly] force        = $Force"
Write-Tee "[run-nightly] preflightOnly= $PreflightOnly"
Write-Tee "[run-nightly] dryRun       = $DryRun"
Write-Tee "[run-nightly] stage        = $stageLabel"
Write-Tee "============================================================"

# ---------------------------------------------------------------------------
# 2. Repo-root sanity check.
# ---------------------------------------------------------------------------

$runnerPath = Join-Path $repoRoot 'scripts\virtual-student-qa\run.mjs'
if (-not (Test-Path $runnerPath)) {
  Write-Tee "[run-nightly] FATAL: cannot find runner at $runnerPath."
  Write-Tee "[run-nightly] The wrapper expects to live at scripts/virtual-student-qa/scripts/run-nightly.ps1."
  exit 2
}

# ---------------------------------------------------------------------------
# 3. Load private env file.
# ---------------------------------------------------------------------------

if (-not (Test-Path $EnvFile)) {
  Write-Tee "[run-nightly] FATAL: env file not found at $EnvFile."
  Write-Tee "[run-nightly] See scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md for the env file template."
  exit 2
}

try {
  . $EnvFile
} catch {
  Write-Tee "[run-nightly] FATAL: env file failed to dot-source: $($_.Exception.Message)"
  exit 2
}

# Validate critical env vars after sourcing.
$required = @('E2E_PARENT_EMAIL', 'E2E_PARENT_PASSWORD', 'VIRTUAL_STUDENT_ACCOUNTS')
$missing = @()
foreach ($v in $required) {
  $val = [System.Environment]::GetEnvironmentVariable($v)
  if (-not $val) { $missing += $v }
}

if ($missing.Count -gt 0) {
  Write-Tee "[run-nightly] FATAL: required env vars missing after loading $EnvFile -> $($missing -join ', ')"
  Write-Tee "[run-nightly] The env file must set all three. See SCHEDULER-SETUP.md."
  exit 2
}

# Light sanity probe on VIRTUAL_STUDENT_ACCOUNTS — must be parseable JSON
# array. The runner does its own validation; this is just a fast-fail at
# the wrapper boundary so an operator misreading "JSON" as "comma list"
# gets a clear error before launching a browser.
try {
  $accountsParsed = $env:VIRTUAL_STUDENT_ACCOUNTS | ConvertFrom-Json -ErrorAction Stop
  if (-not ($accountsParsed -is [System.Array])) { throw 'not an array' }
} catch {
  Write-Tee "[run-nightly] FATAL: VIRTUAL_STUDENT_ACCOUNTS is not a JSON array: $($_.Exception.Message)"
  Write-Tee "[run-nightly] Expected: [{`"label`":`"AAA1`",`"username`":`"AAA1`",`"pin`":`"1234`"}, ...]"
  exit 2
}

Write-Tee "[run-nightly] env loaded   = OK (parent=$($env:E2E_PARENT_EMAIL.Substring(0,1))***@..., accounts=$($accountsParsed.Count))"

# ---------------------------------------------------------------------------
# 4. Locate node.
# ---------------------------------------------------------------------------

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Tee "[run-nightly] FATAL: 'node' is not on PATH."
  Write-Tee "[run-nightly] Install Node.js LTS and ensure the install adds node to the system PATH."
  Write-Tee "[run-nightly] If running under Task Scheduler, the task must inherit the system PATH."
  exit 2
}

try {
  $nodeVersion = (& node --version) 2>$null
} catch {
  $nodeVersion = '(version probe failed)'
}
Write-Tee "[run-nightly] node         = $($nodeCmd.Source) (version=$nodeVersion)"

# ---------------------------------------------------------------------------
# 5. Build CLI args and invoke.
# ---------------------------------------------------------------------------

$nodeArgs = @(
  'scripts/virtual-student-qa/run.mjs',
  '--phase', 'd2',
  '--mode', $Mode,
  '--date', $Date,
  '--base-url', $BaseUrl
)
if ($Force) { $nodeArgs += '--force' }
if ($PreflightOnly) { $nodeArgs += '--preflight-only' }
if ($DryRun) { $nodeArgs += '--dry-run' }
if ($Students) { $nodeArgs += @('--students', $Students) }

Write-Tee "[run-nightly] cwd          = $repoRoot"
Write-Tee "[run-nightly] cmd          = node $($nodeArgs -join ' ')"
Write-Tee "------------------------------------------------------------"

Push-Location $repoRoot
try {
  # Stream node's stdout+stderr line-by-line to the log file and the
  # console. Using `2>&1` then a piped `ForEach-Object { Write-Tee }`
  # ensures real-time progress is visible during long realtime runs
  # AND is preserved on disk if Task Scheduler's console is closed.
  & node @nodeArgs 2>&1 | ForEach-Object { Write-Tee $_ }
  $runnerExit = $LASTEXITCODE
} finally {
  Pop-Location
}

Write-Tee "------------------------------------------------------------"
Write-Tee "[run-nightly] finishedAt   = $(Get-Date -Format 's')"
Write-Tee "[run-nightly] runnerExit   = $runnerExit"
Write-Tee "[run-nightly] log          = $logPath"
Write-Tee "============================================================"

exit $runnerExit
