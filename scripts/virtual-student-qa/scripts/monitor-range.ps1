$monitorLog = Join-Path $env:LOCALAPPDATA 'liosh-qa\range-logs\range-monitor.log'
$rangeLog = Join-Path $env:LOCALAPPDATA 'liosh-qa\range-logs\range_2026-04-03__2026-06-15__20260616_020017.log'
$statePath = Join-Path $env:LOCALAPPDATA 'liosh-qa\virtual-student-state\state.json'

while ($true) {
  Start-Sleep -Seconds 600
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $tail = if (Test-Path $rangeLog) { (Get-Content $rangeLog -Tail 5) -join ' | ' } else { 'missing' }
  $lastRunDate = '?'
  if (Test-Path $statePath) {
    $m = [regex]::Match((Get-Content $statePath -Raw), '"lastRunDate"\s*:\s*"([^"]+)"')
    if ($m.Success) { $lastRunDate = $m.Groups[1].Value }
  }
  $nodes = @(Get-Process node -ErrorAction SilentlyContinue).Count
  $line = "[$ts] nodes=$nodes lastRunDate=$lastRunDate tail=$tail"
  Add-Content -Path $monitorLog -Value $line
  Write-Output 'AGENT_LOOP_TICK_RANGE_MONITOR {"prompt":"Range monitor tick: check range log and monitor log; report only on failure or milestone."}'
}
