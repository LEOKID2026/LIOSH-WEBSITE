# Builds docs/school-portal/review-packages/school-portal-implementation-review.zip
# Copies from repo root only; verifies ZIP entry contents before finishing.
$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root

$staging = Join-Path $root "docs\school-portal\review-packages\_staging"
$zip = Join-Path $root "docs\school-portal\review-packages\school-portal-implementation-review.zip"

$paths = @(
  "supabase\migrations\030_school_code.sql",
  "supabase\migrations\031_school_account_management.sql",
  "supabase\migrations\032_school_messaging.sql",
  "supabase\migrations\033_teacher_parent_messages_school_context.sql",
  "supabase\migrations\034_school_account_audit_actions.sql",
  "scripts\school-portal\sql-prechecks\034_teacher_access_audit_precheck.sql",
  "lib\school-server",
  "lib\school-portal\school-communication.he.js",
  "lib\guardian-server\guardian-login.server.js",
  "lib\guardian-server\guardian-session.server.js",
  "lib\parent-client\parent-teacher-code-access.js",
  "lib\teacher-server\teacher-parent-messages.server.js",
  "lib\school-server\resolve-teacher-parent-message-school-id.server.js",
  "components\parent\GuardianChildSelectForm.jsx",
  "components\parent\ParentMustChangePinGate.jsx",
  "components\parent\ParentTeacherCodeReport.jsx",
  "components\school-portal\SchoolCredentialShownOnceBox.jsx",
  "components\school-portal\SchoolStudentAccessPanel.jsx",
  "components\school-portal\SchoolStudentParentAccessRow.jsx",
  "components\school-portal\SchoolPortalShell.jsx",
  "components\school-portal\SchoolReportModal.jsx",
  "components\teacher-portal\TeacherPortalShell.jsx",
  "pages\api\guardian\login.js",
  "pages\api\guardian\change-pin.js",
  "pages\api\guardian\me.js",
  "pages\api\guardian\school-messages",
  "pages\api\parent\mini-report.js",
  "pages\api\school\messages",
  "pages\api\school\students",
  "pages\api\teacher\school-messages",
  "pages\guardian\login.js",
  "pages\parent\login.js",
  "pages\school\dashboard.js",
  "pages\school\messages.js",
  "pages\school\students\index.js",
  "pages\parent\school-inbox.js",
  "pages\teacher\school-messages.js",
  "docs\school-portal\SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md",
  "docs\school-portal\SCHOOL_PORTAL_PHASE4_PLAN.md",
  "docs\school-portal\SCHOOL_PORTAL_SQL_REVIEW_PACKAGE.md",
  "docs\school-portal\REVIEW_PACKAGE_FILE_MANIFEST.md",
  "docs\school-portal\BLOCKER_FIXES_CHANGELOG.md",
  "scripts\school-portal\test-school-messaging.mjs"
)

$contentChecks = @(
  @{
    Entry = "components/parent/ParentTeacherCodeReport.jsx"
    MustContain = @("isSchoolLinked", "if (schoolLinked)")
    MustNotContain = @()
  },
  @{
    Entry = "pages/api/guardian/me.js"
    MustContain = @("isSchoolLinked")
    MustNotContain = @()
  },
  @{
    Entry = "pages/api/parent/mini-report.js"
    MustContain = @("data: { miniReport }")
    MustNotContain = @("json({ data: buildMiniReportFromPayload")
  },
  @{
    Entry = "lib/teacher-server/teacher-parent-messages.server.js"
    MustContain = @("resolveTeacherParentMessageSchoolId")
    MustNotContain = @("loadTeacherSchoolMembership(")
  },
  @{
    Entry = "supabase/migrations/033_teacher_parent_messages_school_context.sql"
    MustContain = @("ARRAY_AGG(DISTINCT school_id)")
    MustNotContain = @("MIN(school_id) AS school_id")
  },
  @{
    Entry = "docs/school-portal/SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md"
    MustContain = @("POST-SQL COMPLETE", "Owner SQL apply record", "033_teacher_parent_messages_school_context.sql")
    MustNotContain = @("Status: pre-SQL", "Do not apply migrations until", "pre-SQL, pre")
  },
  @{
    Entry = "docs/school-portal/review-packages/ZIP_CONTENT_FINGERPRINT.txt"
    MustContain = @("033_uses_array_agg: true", "033_uses_min_school_id: false")
    MustNotContain = @()
  }
)

function Normalize-ZipPath([string]$p) {
  return ($p -replace '\\', '/').TrimStart('/')
}

function Read-ZipEntryText([System.IO.Compression.ZipArchive]$archive, [string]$entryPath) {
  $norm = Normalize-ZipPath $entryPath
  $entry = $archive.Entries | Where-Object { (Normalize-ZipPath $_.FullName) -eq $norm } | Select-Object -First 1
  if (-not $entry) { return $null }
  $stream = $entry.Open()
  try {
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } finally {
    $stream.Dispose()
  }
}

foreach ($rel in $paths) {
  $src = Join-Path $root $rel
  if (-not (Test-Path $src)) {
    throw "Missing required path: $rel"
  }
}

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

foreach ($rel in $paths) {
  $src = Join-Path $root $rel
  $dest = Join-Path $staging $rel
  if (Test-Path $src -PathType Container) {
    Copy-Item -Path $src -Destination $dest -Recurse -Force
  } else {
    $destDir = Split-Path $dest -Parent
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Copy-Item -Path $src -Destination $dest -Force
  }
}

$staging033 = Get-Content (Join-Path $staging "supabase\migrations\033_teacher_parent_messages_school_context.sql") -Raw
$stagingReport = Get-Content (Join-Path $staging "docs\school-portal\SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md") -Raw
if ($staging033 -match "MIN\(school_id\)\s+AS\s+school_id") {
  throw "Staging 033 still contains MIN(school_id) AS school_id - fix repo file first"
}
if ($staging033 -notmatch "ARRAY_AGG\(DISTINCT school_id\)") {
  throw "Staging 033 missing ARRAY_AGG backfill"
}
if ($stagingReport -notmatch "POST-SQL COMPLETE") {
  throw "Staging completion report missing POST-SQL COMPLETE status"
}

$fingerprintDir = Join-Path $staging "docs\school-portal\review-packages"
New-Item -ItemType Directory -Force -Path $fingerprintDir | Out-Null
$fingerprintPath = Join-Path $fingerprintDir "ZIP_CONTENT_FINGERPRINT.txt"
$hasArrayAgg = $staging033 -match 'ARRAY_AGG\(DISTINCT school_id\)'
$hasMin = $staging033 -match 'MIN\(school_id\)\s+AS\s+school_id'
$hasPostSql = $stagingReport -match 'POST-SQL COMPLETE'
$fingerprintText = @"
# Generated by build-review-zip.ps1 - verify after upload
build_utc=$(Get-Date -Format o)
zip_name=school-portal-implementation-review.zip
033_uses_array_agg: $(if ($hasArrayAgg) { 'true' } else { 'false' })
033_uses_min_school_id: $(if ($hasMin) { 'true' } else { 'false' })
completion_post_sql: $(if ($hasPostSql) { 'true' } else { 'false' })
owner_sql_030_031_034_032_033: documented in completion report
"@
Set-Content -Path $fingerprintPath -Value $fingerprintText -Encoding UTF8

$zipTmp = "$zip.new"
if (Test-Path $zipTmp) { Remove-Item $zipTmp -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipTmp, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Move-Item -Path $zipTmp -Destination $zip -Force

$archive = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
  $entries = @($archive.Entries | ForEach-Object { Normalize-ZipPath $_.FullName })
  $fileCount = ($entries | Where-Object { $_ -and -not $_.EndsWith('/') }).Count

  foreach ($check in $contentChecks) {
    $text = Read-ZipEntryText $archive $check.Entry
    if ($null -eq $text) {
      throw "ZIP content check failed: missing entry $($check.Entry)"
    }
    foreach ($needle in $check.MustContain) {
      if ($text -notmatch [regex]::Escape($needle)) {
        throw "ZIP content check failed: $($check.Entry) missing: $needle"
      }
    }
    foreach ($bad in $check.MustNotContain) {
      if ($text -match [regex]::Escape($bad)) {
        throw "ZIP content check failed: $($check.Entry) must not contain: $bad"
      }
    }
  }

  $docHits = @()
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName -match '\.md$') {
      $t = Read-ZipEntryText $archive $entry.FullName
      if ($t -match 'docs/school-portal/SQL_034_PRECHECK\.sql|SQL_034_PRECHECK\.sql') {
        $docHits += $entry.FullName
      }
    }
  }
  if ($docHits.Count -gt 0) {
    throw "ZIP docs still reference old precheck path: $($docHits -join ', ')"
  }

  Write-Host "Created: $zip"
  Write-Host "  Size: $((Get-Item $zip).Length) bytes"
  Write-Host "  Entries: $fileCount files"
  Write-Host "  Content checks: PASS ($($contentChecks.Count) files verified inside ZIP)"
} finally {
  $archive.Dispose()
}

Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
