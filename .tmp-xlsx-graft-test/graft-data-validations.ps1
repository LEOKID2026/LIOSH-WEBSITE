param([string]$OrigPath, [string]$TargetPath)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$origZip = [System.IO.Compression.ZipFile]::OpenRead($OrigPath)
$origEntry = $origZip.GetEntry('xl/worksheets/sheet1.xml')
if ($null -eq $origEntry) { $origZip.Dispose(); exit 0 }
$origReader = New-Object System.IO.StreamReader($origEntry.Open())
$origXml = $origReader.ReadToEnd()
$origReader.Close()
$origZip.Dispose()
$dvMatch = [regex]::Match($origXml, '<dataValidations[\s\S]*?</dataValidations>')
if (-not $dvMatch.Success) { Write-Error 'no dv in orig'; exit 1 }
$zip = [System.IO.Compression.ZipFile]::Open($TargetPath, [System.IO.Compression.ZipArchiveMode]::Update)
$entry = $zip.GetEntry('xl/worksheets/sheet1.xml')
if ($null -eq $entry) { $zip.Dispose(); Write-Error 'no sheet in target'; exit 1 }
$newReader = New-Object System.IO.StreamReader($entry.Open())
$newXml = $newReader.ReadToEnd()
$newReader.Close()
$entry.Delete()
if ($newXml -match '<dataValidations') {
  $newXml = [regex]::Replace($newXml, '<dataValidations[\s\S]*?</dataValidations>', $dvMatch.Value)
} else {
  $newXml = $newXml.Replace('</worksheet>', ($dvMatch.Value + '</worksheet>'))
}
$newEntry = $zip.CreateEntry('xl/worksheets/sheet1.xml')
$newWriter = New-Object System.IO.StreamWriter($newEntry.Open())
$newWriter.Write($newXml)
$newWriter.Close()
$zip.Dispose()
Write-Output 'ok'
