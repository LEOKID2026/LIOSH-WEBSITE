# Builds school-portal-implementation-review-FINAL-CHECK.zip from explicit repo paths only.
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$outDir = Join-Path $root "docs\school-portal\review-packages"
$staging = Join-Path $outDir "_staging_FINAL_CHECK"
$extract = Join-Path $outDir "_extract_FINAL_CHECK"
$zip = Join-Path $outDir "school-portal-implementation-review-FINAL-CHECK.zip"
$individual = Join-Path $outDir "FINAL-CHECK-individual"
$verifyLog = Join-Path $outDir "FINAL-CHECK-VERIFY-OUTPUT.txt"

$criticalFiles = @(
  "components\parent\ParentTeacherCodeReport.jsx",
  "pages\api\guardian\me.js",
  "pages\api\parent\mini-report.js",
  "lib\teacher-server\teacher-parent-messages.server.js",
  "lib\school-server\resolve-teacher-parent-message-school-id.server.js",
  "components\parent\GuardianChildSelectForm.jsx",
  "supabase\migrations\033_teacher_parent_messages_school_context.sql",
  "docs\school-portal\SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md",
  "docs\school-portal\REVIEW_PACKAGE_FILE_MANIFEST.md",
  "scripts\school-portal\sql-prechecks\034_teacher_access_audit_precheck.sql"
)

$packageFiles = @(
  "supabase\migrations\030_school_code.sql",
  "supabase\migrations\031_school_account_management.sql",
  "supabase\migrations\032_school_messaging.sql",
  "supabase\migrations\034_school_account_audit_actions.sql",
  "lib\school-portal\school-communication.he.js",
  "lib\school-portal\school-messaging-ui.js",
  "lib\guardian-server\guardian-login.server.js",
  "lib\guardian-server\guardian-session.server.js",
  "lib\parent-client\parent-teacher-code-access.js",
  "components\parent\ParentMustChangePinGate.jsx",
  "components\school-portal\SchoolCredentialShownOnceBox.jsx",
  "components\school-portal\SchoolStudentAccessPanel.jsx",
  "components\school-portal\SchoolReportModal.jsx",
  "lib\school-portal\school-report-view-model.js",
  "components\school-portal\SchoolStudentParentAccessRow.jsx",
  "components\school-portal\SchoolPortalShell.jsx",
  "components\school-portal\SchoolInboxMessageCard.jsx",
  "components\school-portal\SchoolMessageConfirmationActions.jsx",
  "components\teacher-portal\TeacherPortalShell.jsx",
  "pages\api\guardian\login.js",
  "pages\api\guardian\change-pin.js",
  "pages\guardian\login.js",
  "pages\parent\login.js",
  "pages\school\dashboard.js",
  "pages\school\messages.js",
  "pages\school\students\index.js",
  "pages\parent\school-inbox.js",
  "pages\teacher\school-messages.js",
  "docs\school-portal\SCHOOL_PORTAL_PHASE4_PLAN.md",
  "docs\school-portal\SCHOOL_PORTAL_SQL_REVIEW_PACKAGE.md",
  "docs\school-portal\BLOCKER_FIXES_CHANGELOG.md",
  "scripts\school-portal\test-school-messaging.mjs",
  "scripts\school-portal\test-school-account-management.mjs"
)

function Copy-RepoFile([string]$rel) {
  $src = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing source file: $rel ($src)"
  }
  $dest = Join-Path $staging $rel
  $destParent = Split-Path $dest -Parent
  if (-not (Test-Path $destParent)) {
    New-Item -ItemType Directory -Force -Path $destParent | Out-Null
  }
  Copy-Item -LiteralPath $src -Destination $dest -Force
  return (Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
}

function Copy-RepoTree([string]$relDir) {
  $srcDir = Join-Path $root $relDir
  if (-not (Test-Path -LiteralPath $srcDir)) {
    throw "Missing source dir: $relDir"
  }
  Get-ChildItem -LiteralPath $srcDir -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart('\', '/')
    Copy-RepoFile $rel | Out-Null
  }
}

if (Test-Path $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
if (Test-Path $extract) { Remove-Item -LiteralPath $extract -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

$hashes = @{}
$allFiles = ($criticalFiles + $packageFiles | Select-Object -Unique)
foreach ($rel in $allFiles) {
  $hashes[$rel] = Copy-RepoFile $rel
}

Copy-RepoTree "pages\api\guardian\school-messages"
Copy-RepoTree "pages\api\school\messages"
Copy-RepoTree "pages\api\school\students"
Copy-RepoTree "pages\api\teacher\school-messages"
Copy-RepoTree "lib\school-server"

$fpDir = Join-Path $staging "docs\school-portal\review-packages"
New-Item -ItemType Directory -Force -Path $fpDir | Out-Null
$m033 = Get-Content -LiteralPath (Join-Path $staging "supabase\migrations\033_teacher_parent_messages_school_context.sql") -Raw
$rep = Get-Content -LiteralPath (Join-Path $staging "docs\school-portal\SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md") -Raw
$fingerprint = @"
build_script=build-final-check-zip.ps1
repo_root=$root
build_utc=$(Get-Date -Format o)
zip_name=school-portal-implementation-review-FINAL-CHECK.zip
033_uses_array_agg: $(if ($m033 -match 'ARRAY_AGG\(DISTINCT school_id\)') { 'true' } else { 'false' })
033_uses_min_as: $(if ($m033 -match 'MIN\(school_id\)\s+AS\s+school_id') { 'true' } else { 'false' })
completion_post_sql: $(if ($rep -match 'POST-SQL COMPLETE') { 'true' } else { 'false' })
critical_file_count=$($criticalFiles.Count)
"@
Set-Content -LiteralPath (Join-Path $fpDir "ZIP_CONTENT_FINGERPRINT.txt") -Value $fingerprint -Encoding UTF8

if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
$zipTmp = "$zip.part"
if (Test-Path $zipTmp) { Remove-Item -LiteralPath $zipTmp -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipTmp, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Move-Item -LiteralPath $zipTmp -Destination $zip -Force

# Individual copies for ChatGPT upload
if (Test-Path $individual) { Remove-Item -LiteralPath $individual -Recurse -Force }
New-Item -ItemType Directory -Force -Path $individual | Out-Null
foreach ($rel in $criticalFiles) {
  $src = Join-Path $root $rel
  $dest = Join-Path $individual ($rel -replace '[\\/]', '__')
  Copy-Item -LiteralPath $src -Destination $dest -Force
}

# Extract ZIP to fresh folder and verify EXTRACTED content only
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extract)

function Test-Extracted([string]$rel, [string[]]$must, [string[]]$mustNot) {
  $path = Join-Path $extract $rel
  if (-not (Test-Path -LiteralPath $path)) {
    return "MISSING FILE: $rel"
  }
  $text = Get-Content -LiteralPath $path -Raw
  foreach ($m in $must) {
    if ($text -notmatch [regex]::Escape($m)) { return "FAIL $rel missing: $m" }
  }
  foreach ($b in $mustNot) {
    if ($text -match [regex]::Escape($b)) { return "FAIL $rel has forbidden: $b" }
  }
  return "PASS: $rel"
}

$checks = @(
  (Test-Extracted "supabase\migrations\033_teacher_parent_messages_school_context.sql" @("ARRAY_AGG(DISTINCT school_id)") @("MIN(school_id) AS school_id")),
  (Test-Extracted "docs\school-portal\SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md" @("POST-SQL COMPLETE") @("Status: pre-SQL")),
  (Test-Extracted "components\parent\ParentTeacherCodeReport.jsx" @("isSchoolLinked") @()),
  (Test-Extracted "pages\api\guardian\me.js" @("isSchoolLinked") @()),
  (Test-Extracted "pages\api\parent\mini-report.js" @("data: { miniReport }") @()),
  (Test-Extracted "lib\teacher-server\teacher-parent-messages.server.js" @("resolveTeacherParentMessageSchoolId") @()),
  (Test-Extracted "lib\school-server\resolve-teacher-parent-message-school-id.server.js" @("resolveTeacherParentMessageSchoolId") @()),
  (Test-Extracted "components\parent\GuardianChildSelectForm.jsx" @("guardian_multiple_students") @()),
  (Test-Extracted "scripts\school-portal\sql-prechecks\034_teacher_access_audit_precheck.sql" @("teacher_access_audit") @()),
  (Test-Extracted "docs\school-portal\review-packages\ZIP_CONTENT_FINGERPRINT.txt" @("033_uses_array_agg: true", "033_uses_min_as: false") @())
)

$zipInfo = Get-Item -LiteralPath $zip
$entryCount = [IO.Compression.ZipFile]::OpenRead($zip).Entries.Count
$log = @(
  "FINAL-CHECK ZIP verification (extracted folder only)",
  "extract_path=$extract",
  "zip_path=$zip",
  "zip_size_bytes=$($zipInfo.Length)",
  "zip_entry_count=$entryCount",
  "repo_root=$root",
  "",
  "--- per-file checks ---"
) + $checks + @("", "--- source SHA256 (critical) ---")
foreach ($rel in $criticalFiles) {
  $log += "$rel $($hashes[$rel])"
}
$logText = $log -join "`n"
Set-Content -LiteralPath $verifyLog -Value $logText -Encoding UTF8
Write-Host $logText

$fail = $checks | Where-Object { $_ -notmatch '^PASS:' }
if ($fail.Count -gt 0) {
  throw "Extract verification failed:`n$($fail -join "`n")"
}

Write-Host ""
Write-Host "ZIP: $zip"
Write-Host "Individual files: $individual"
Write-Host "Verify log: $verifyLog"
