# Builds school-portal-implementation-review-QA2-FIXED.zip with explicit QA2 file list + extract verification.
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$outDir = Join-Path $root "docs\school-portal\review-packages"
$staging = Join-Path $outDir "_staging_QA2_FIXED"
$extract = Join-Path $outDir "_extract_QA2_FIXED"
$zip = Join-Path $outDir "school-portal-implementation-review-QA2-FIXED.zip"
$individual = Join-Path $outDir "QA2-FIXED-individual"
$verifyLog = Join-Path $outDir "QA2-FIXED-VERIFY-OUTPUT.txt"

# Prior blocker/critical files (unchanged baseline)
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

# QA round 2 — must be present in package (explicit paths)
$qa2Files = @(
  "components\school-portal\SchoolInboxMessageCard.jsx",
  "components\school-portal\SchoolMessageConfirmationActions.jsx",
  "pages\teacher\school-messages.js",
  "pages\parent\school-inbox.js",
  "pages\school\messages.js",
  "components\school-portal\SchoolStudentAccessPanel.jsx",
  "components\school-portal\SchoolStudentParentAccessRow.jsx",
  "lib\school-server\school-messaging.server.js",
  "lib\school-server\school-account-management.server.js",
  "lib\school-portal\school-messaging-ui.js",
  "lib\school-portal\school-communication.he.js",
  "pages\api\school\messages\index.js",
  "pages\api\teacher\school-messages\index.js",
  "pages\api\guardian\school-messages\index.js"
)

$packageFiles = @(
  "supabase\migrations\030_school_code.sql",
  "supabase\migrations\031_school_account_management.sql",
  "supabase\migrations\032_school_messaging.sql",
  "supabase\migrations\034_school_account_audit_actions.sql",
  "lib\school-portal\school-report-view-model.js",
  "components\school-portal\SchoolCredentialShownOnceBox.jsx",
  "components\school-portal\SchoolReportModal.jsx",
  "components\school-portal\SchoolPortalShell.jsx",
  "components\teacher-portal\TeacherPortalShell.jsx",
  "pages\school\dashboard.js",
  "pages\school\students\index.js",
  "pages\school\classes\index.js",
  "scripts\school-portal\test-school-messaging.mjs",
  "scripts\school-portal\test-school-account-management.mjs",
  "docs\school-portal\BLOCKER_FIXES_CHANGELOG.md"
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

if (Test-Path $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
if (Test-Path $extract) { Remove-Item -LiteralPath $extract -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

$hashes = @{}
$allExplicit = ($criticalFiles + $qa2Files + $packageFiles | Select-Object -Unique)
foreach ($rel in $allExplicit) {
  $hashes[$rel] = Copy-RepoFile $rel
}

Copy-RepoTree "pages\api\guardian\school-messages"
Copy-RepoTree "pages\api\school\messages"
Copy-RepoTree "pages\api\school\students"
Copy-RepoTree "pages\api\teacher\school-messages"
Copy-RepoTree "lib\school-server"

$fpDir = Join-Path $staging "docs\school-portal\review-packages"
New-Item -ItemType Directory -Force -Path $fpDir | Out-Null
$fingerprint = @"
build_script=build-qa2-fixed-zip.ps1
build_utc=$(Get-Date -Format o)
zip_name=school-portal-implementation-review-QA2-FIXED.zip
qa2_file_count=$($qa2Files.Count)
explicit_file_count=$($allExplicit.Count)
"@
Set-Content -LiteralPath (Join-Path $fpDir "ZIP_CONTENT_FINGERPRINT_QA2.txt") -Value $fingerprint -Encoding UTF8

if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
$zipTmp = "$zip.part"
if (Test-Path $zipTmp) { Remove-Item -LiteralPath $zipTmp -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipTmp, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Move-Item -LiteralPath $zipTmp -Destination $zip -Force

# Individual copies for owner/ChatGPT (QA2 list + critical)
if (Test-Path $individual) { Remove-Item -LiteralPath $individual -Recurse -Force }
New-Item -ItemType Directory -Force -Path $individual | Out-Null
foreach ($rel in ($qa2Files + $criticalFiles | Select-Object -Unique)) {
  $src = Join-Path $root $rel
  $flat = $rel -replace '[\\/]', '__'
  Copy-Item -LiteralPath $src -Destination (Join-Path $individual $flat) -Force
}

[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extract)

$checks = @(
  (Test-Extracted "components\school-portal\SchoolInboxMessageCard.jsx" @("SC_BTN_OPEN", "export default function SchoolInboxMessageCard") @()),
  (Test-Extracted "components\school-portal\SchoolMessageConfirmationActions.jsx" @("SC_BTN_MARK_RECEIVED", "SC_CONFIRMED_RECEIPT", "SchoolMessageConfirmationActions") @()),
  (Test-Extracted "pages\teacher\school-messages.js" @("SchoolInboxMessageCard", "SchoolMessageConfirmationActions") @()),
  (Test-Extracted "pages\parent\school-inbox.js" @("SchoolInboxMessageCard", "SchoolMessageConfirmationActions") @()),
  (Test-Extracted "pages\school\messages.js" @("SchoolInboxMessageCard", "SC_BTN_OPEN", "SC_FILTER_LAST_7_DAYS", "SC_FILTER_LAST_30_DAYS", "SC_FILTER_CUSTOM_RANGE", "md:hidden") @()),
  (Test-Extracted "components\school-portal\SchoolStudentAccessPanel.jsx" @("SC_SECTION_LEGACY_ACCESS", "SC_BTN_CREATE_NEW_ACCOUNT", "SC_BTN_UNBLOCK", "SC_REVOKE_RECOVERY_HINT", "legacyStudentAccess") @()),
  (Test-Extracted "lib\school-server\school-messaging.server.js" @("resolveMessageSentBounds", "sentAfter", "sentBefore") @()),
  (Test-Extracted "lib\school-server\school-account-management.server.js" @("pickSchoolStudentAccessRow", "legacyStudentAccess", "created_by_school_id") @()),
  (Test-Extracted "lib\school-portal\school-messaging-ui.js" @("buildSchoolMessagesListQuery", "sentAfter") @()),
  (Test-Extracted "lib\school-portal\school-communication.he.js" @("SC_BTN_OPEN", "SC_FILTER_LAST_7_DAYS", "SC_CONFIRMED_RECEIPT") @()),
  (Test-Extracted "pages\api\school\messages\index.js" @("sentAfter", "sentBefore", "days") @())
)

$zipInfo = Get-Item -LiteralPath $zip
$zipArchive = [IO.Compression.ZipFile]::OpenRead($zip)
$entryCount = $zipArchive.Entries.Count
$zipArchive.Dispose()

$hasInboxCard = Test-Path (Join-Path $extract "components\school-portal\SchoolInboxMessageCard.jsx")
$hasConfirm = Test-Path (Join-Path $extract "components\school-portal\SchoolMessageConfirmationActions.jsx")

$log = @(
  "QA2-FIXED ZIP verification (extracted folder only - do not trust zip without this log)",
  "extract_path=$extract",
  "zip_path=$zip",
  "zip_size_bytes=$($zipInfo.Length)",
  "zip_entry_count=$entryCount",
  "SchoolInboxMessageCard_in_zip=$hasInboxCard",
  "SchoolMessageConfirmationActions_in_zip=$hasConfirm",
  "individual_folder=$individual",
  "repo_root=$root",
  "",
  "--- QA2 content checks (extracted) ---"
) + $checks

$fail = $checks | Where-Object { $_ -notmatch '^PASS:' }
if ($fail.Count -gt 0) {
  $log += @("", "--- FAILED ---") + $fail
}

$logText = $log -join "`n"
Set-Content -LiteralPath $verifyLog -Value $logText -Encoding UTF8
Write-Host $logText

if ($fail.Count -gt 0) {
  throw "QA2 extract verification failed:`n$($fail -join "`n")"
}

Write-Host ""
Write-Host "ZIP: $zip"
Write-Host "Individual: $individual"
Write-Host "Verify log: $verifyLog"
