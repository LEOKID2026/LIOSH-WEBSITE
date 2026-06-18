<#
.SYNOPSIS
  Run Phase D2 virtual-student simulation across a date range (sequential).

.PARAMETER StartDate
  First calendar date (YYYY-MM-DD), inclusive.

.PARAMETER EndDate
  Last calendar date (YYYY-MM-DD), inclusive.

.PARAMETER Mode
  'fast' (default for catch-up) or 'realtime'.

.PARAMETER Students
  Optional comma-separated student subset; default all AAA1–AAA12 in plan.

.PARAMETER CheckpointDates
  Comma-separated YYYY-MM-DD dates that emit an extra checkpoint banner in the log.

.EXAMPLE
  .\run-range.ps1 -StartDate 2026-04-03 -EndDate 2026-06-15 -Mode fast
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
  [string]$StartDate,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
  [string]$EndDate,

  [ValidateSet('realtime', 'fast')]
  [string]$Mode = 'realtime',

  [string]$Students = '',

  [string]$CheckpointDates = '2026-04-07'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nightly = Join-Path $scriptDir 'run-nightly.ps1'
if (-not (Test-Path $nightly)) {
  Write-Error "run-nightly.ps1 not found at $nightly"
}

$checkpoints = @{}
foreach ($d in ($CheckpointDates -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
  $checkpoints[$d] = $true
}

$current = [datetime]::ParseExact($StartDate, 'yyyy-MM-dd', $null)
$end = [datetime]::ParseExact($EndDate, 'yyyy-MM-dd', $null)
if ($current -gt $end) {
  Write-Error "StartDate ($StartDate) must be <= EndDate ($EndDate)"
}

$logRoot = Join-Path $env:LOCALAPPDATA 'liosh-qa\range-logs'
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$rangeLog = Join-Path $logRoot ("range_{0}__{1}__{2}.log" -f $StartDate, $EndDate, (Get-Date -Format 'yyyyMMdd_HHmmss'))

function Write-RangeLog([string]$Message) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $rangeLog -Value $line
  Write-Host $line
}

Write-RangeLog ('range start: {0} through {1} mode={2} students={3} log={4}' -f $StartDate, $EndDate, $Mode, $Students, $rangeLog)

$dayIndex = 0
while ($current -le $end) {
  $dayIso = $current.ToString('yyyy-MM-dd')
  $dayIndex += 1
  $weekNum = [Math]::Floor(($dayIndex - 1) / 7) + 1

  if ($checkpoints.ContainsKey($dayIso)) {
    Write-RangeLog ('CHECKPOINT date={0} (configured checkpoint)' -f $dayIso)
  }
  if ($dayIndex % 7 -eq 0) {
    Write-RangeLog ('CHECKPOINT week={0} completed through date={1}' -f $weekNum, $dayIso)
  }

  Write-RangeLog ('running day {0} ({1})...' -f $dayIso, $dayIndex)
  $nightlyParams = @{
    Mode = $Mode
    Date = $dayIso
  }
  if ($Students) { $nightlyParams.Students = $Students }

  & $nightly @nightlyParams
  $exit = $LASTEXITCODE
  if ($exit -ne 0) {
    Write-RangeLog ('FAIL on {0} exit={1} — range halted' -f $dayIso, $exit)
    exit $exit
  }
  Write-RangeLog ('PASS on {0}' -f $dayIso)
  $current = $current.AddDays(1)
}

Write-RangeLog ('range complete: {0} through {1}' -f $StartDate, $EndDate)
exit 0
