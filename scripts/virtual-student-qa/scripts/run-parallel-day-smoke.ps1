# Parallel day smoke — one simulation day, verify budget + worker overlap.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path
$date = '2026-05-01'
$students = 'AAA1,AAA2,AAA3,AAA4,AAA5,AAA6,AAA7,AAA8,AAA9,AAA10,AAA11,AAA12'
$maxStudentMin = 35
$maxParallelMin = 45
$maxWallMin = 45

$envFile = Join-Path $env:LOCALAPPDATA 'liosh-qa\env\virtual-student-qa.env.ps1'
if (Test-Path $envFile) { . $envFile }
$env:VIRTUAL_STUDENT_IN_SESSION_PACING = '1'
$env:VIRTUAL_STUDENT_PRACTICE_ONLY = '1'
$env:VIRTUAL_STUDENT_MAX_PLANNED_MINUTES_PER_DAY = "$maxStudentMin"
$env:VIRTUAL_STUDENT_MAX_PARALLEL_DAY_ESTIMATE_MIN = "$maxParallelMin"

Write-Host "[parallel-smoke] prepare state baseline 2026-04-30..."
node (Join-Path $scriptDir 'prepare-smoke-state.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[parallel-smoke] single day $date all students..."
$started = Get-Date
& (Join-Path $scriptDir 'run-nightly.ps1') -Mode realtime -Date $date -Students $students
$exit = $LASTEXITCODE
$elapsedMin = ((Get-Date) - $started).TotalMinutes

$logDir = Join-Path $env:LOCALAPPDATA 'liosh-qa\nightly-logs'
$latest = Get-ChildItem $logDir -Filter "*__realtime__${date}__full-run.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latest) {
  Write-Host "FAIL: no log for $date"
  exit 1
}

$content = Get-Content $latest.FullName -Raw
function Get-LogMatch([string]$pattern) {
  $m = [regex]::Match($content, $pattern)
  if ($m.Success) { return $m.Groups[1].Value }
  return ''
}

$maxPlanned = [int](Get-LogMatch 'maxStudentPlannedMinutes=(\d+)')
if (-not $maxPlanned) { $maxPlanned = 999 }
$parallelEst = [int](Get-LogMatch 'parallelDayEstimateMin=(\d+)')
if (-not $parallelEst) { $parallelEst = [int](Get-LogMatch 'parallelDayEstimate=(\d+)min') }
$efficiency = [double](Get-LogMatch 'parallelismEfficiency=([\d.]+)')
$workerStarts = ([regex]::Matches($content, 'worker-start AAA')).Count
$studied = [int](Get-LogMatch 'plan: studied=(\d+)')
$totalSum = [int](Get-LogMatch 'totalMinutes=(\d+)')

Write-Host ""
Write-Host "=== PARALLEL DAY SMOKE ==="
Write-Host "log=$($latest.FullName)"
Write-Host "runnerExit=$exit"
Write-Host "actualWallClockMin=$([math]::Round($elapsedMin, 1))"
Write-Host "studentsStudied=$studied"
Write-Host "totalPlannedMinutesSum=$totalSum"
Write-Host "maxStudentPlannedMinutes=$maxPlanned"
Write-Host "parallelDayEstimate=$parallelEst"
Write-Host "workerStartCount=$workerStarts"
Write-Host "parallelismEfficiency=$efficiency"

$budgetOk = ($maxPlanned -le $maxStudentMin) -and ($parallelEst -le $maxParallelMin)
$wallOk = $elapsedMin -le $maxWallMin
$effOk = $efficiency -ge 3.0
$workersOk = $workerStarts -ge 8
$pass = ($exit -eq 0) -and $budgetOk -and $wallOk -and $effOk -and $workersOk

if (-not $budgetOk) { Write-Host "FAIL: planner budget maxStudent<=$maxStudentMin parallelEst<=$maxParallelMin" }
if (-not $wallOk) { Write-Host "FAIL: wall-clock > ${maxWallMin}min" }
if (-not $effOk) { Write-Host "FAIL: parallelismEfficiency < 3.0" }
if (-not $workersOk) { Write-Host "FAIL: too few worker-start lines" }
Write-Host "verdict=$(if ($pass) { 'PASS' } else { 'FAIL' })"
exit $(if ($pass) { 0 } else { 1 })
