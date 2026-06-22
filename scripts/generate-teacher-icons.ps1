Add-Type -AssemblyName System.Drawing

# Clone parent-icons → teacher-icons: same shield, teacher gradient, P → T (matched size/position).

function Test-WhitePixel {
    param([System.Drawing.Color]$Color)
    return $Color.R -gt 235 -and $Color.G -gt 235 -and $Color.B -gt 235
}

function New-ShieldPath {
    param([int]$Size)

    $shieldW = [single]($Size * 0.367)
    $shieldH = [single]($Size * 0.359)
    $shieldX = [single](($Size - $shieldW) / 2)
    $shieldY = [single]($Size * 0.547)
    $topInset = $shieldW * 0.16
    $shoulderY = $shieldY + ($shieldH * 0.1)
    $bottomY = $shieldY + $shieldH

    $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shield.AddLine(($shieldX + $topInset), $shieldY, ($shieldX + $shieldW - $topInset), $shieldY)
    $shield.AddBezier(
        ($shieldX + $shieldW - $topInset), $shieldY,
        ($shieldX + $shieldW + ($shieldW * 0.035)), $shoulderY,
        ($shieldX + $shieldW + ($shieldW * 0.035)), ($bottomY - ($shieldH * 0.16)),
        ($shieldX + ($shieldW / 2)), $bottomY
    )
    $shield.AddBezier(
        ($shieldX + ($shieldW / 2)), $bottomY,
        ($shieldX - ($shieldW * 0.035)), ($bottomY - ($shieldH * 0.16)),
        ($shieldX - ($shieldW * 0.035)), $shoulderY,
        ($shieldX + $topInset), $shieldY
    )
    return $shield
}

function Get-ParentLetterMetrics {
    param([System.Drawing.Bitmap]$Parent)

    $size = $Parent.Width
    $shieldTop = [int]($size * 0.545)
    $minY = $size
    $maxY = 0

    for ($y = [int]($size * 0.16); $y -lt $shieldTop; $y++) {
        for ($x = [int]($size * 0.28); $x -lt [int]($size * 0.79); $x++) {
            if (-not (Test-WhitePixel ($Parent.GetPixel($x, $y)))) { continue }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }

    for ($y = $shieldTop; $y -lt [int]($size * 0.58); $y++) {
        for ($x = [int]($size * 0.30); $x -lt [int]($size * 0.44); $x++) {
            if (-not (Test-WhitePixel ($Parent.GetPixel($x, $y)))) { continue }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }

    return @{
        CenterY = ($minY + $maxY) / 2.0
        Height  = ($maxY - $minY)
    }
}

function Resolve-FontSizeForLetter {
    param(
        [string]$Char,
        [int]$Size,
        [single]$CenterX,
        [single]$CenterY,
        [int]$TargetHeight
    )

    $probe = New-Object System.Drawing.Bitmap 1, 1
    $g = [System.Drawing.Graphics]::FromImage($probe)
    $lo = [single]($Size * 0.35)
    $hi = [single]($Size * 0.85)

    for ($i = 0; $i -lt 12; $i++) {
        $mid = ($lo + $hi) / 2.0
        $font = New-Object System.Drawing.Font "Arial", $mid, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
        $h = [single]$g.MeasureString($Char, $font).Height
        $font.Dispose()
        if ($h -lt $TargetHeight) { $lo = $mid } else { $hi = $mid }
    }

    $g.Dispose()
    $probe.Dispose()
    return ($lo + $hi) / 2.0
}

function New-LetterMask {
    param(
        [string]$Char,
        [int]$Size,
        [System.Drawing.Font]$Font,
        [single]$CenterX,
        [single]$CenterY
    )

    $mask = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($mask)
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($Char, $Font, [System.Drawing.Brushes]::White, $CenterX, $CenterY, $sf)
    $g.Dispose()
    return $mask
}

function Get-TeacherGradientColor {
    param([int]$X, [int]$Y, [int]$Size)

    $t = ($X + $Y) / (2.0 * [Math]::Max(1, ($Size - 1)))
    if ($t -lt 0) { $t = 0 }
    if ($t -gt 1) { $t = 1 }

    $r = [int](55 + ((234 - 55) * $t))
    $g = [int](48 + ((88 - 48) * $t))
    $b = [int](163 + ((12 - 163) * $t))
    return [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function New-TeacherIconFromParent {
    param([int]$Size)

    $parentPath = Join-Path $PSScriptRoot "..\public\images\parent-icons\icon-$Size.png"
    if (-not (Test-Path $parentPath)) {
        throw "Missing parent icon: $parentPath"
    }

    $parent = [System.Drawing.Bitmap]::FromFile($parentPath)
    $metrics = Get-ParentLetterMetrics -Parent $parent
    $letterCenterX = [single]($Size / 2)
    $letterCenterY = [single]$metrics.CenterY
    $letterFontSize = Resolve-FontSizeForLetter -Char "T" -Size $Size -CenterX $letterCenterX -CenterY $letterCenterY -TargetHeight ([int]$metrics.Height)
    $pFontSize = Resolve-FontSizeForLetter -Char "P" -Size $Size -CenterX $letterCenterX -CenterY $letterCenterY -TargetHeight ([int]$metrics.Height)

    $out = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect,
        ([System.Drawing.Color]::FromArgb(255, 55, 48, 163)),
        ([System.Drawing.Color]::FromArgb(255, 234, 88, 12)),
        45
    $g.FillRectangle($bgBrush, $rect)
    $g.Dispose()

    $pFont = New-Object System.Drawing.Font "Arial", $pFontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $tFont = New-Object System.Drawing.Font "Arial", $letterFontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $pMask = New-LetterMask -Char "P" -Size $Size -Font $pFont -CenterX $letterCenterX -CenterY $letterCenterY
    $shieldPath = New-ShieldPath -Size $Size

    for ($y = 0; $y -lt $Size; $y++) {
        for ($x = 0; $x -lt $Size; $x++) {
            if (-not $shieldPath.IsVisible($x, $y)) { continue }
            if (-not (Test-WhitePixel ($parent.GetPixel($x, $y)))) { continue }
            $out.SetPixel($x, $y, [System.Drawing.Color]::White)
        }
    }

    for ($y = 0; $y -lt $Size; $y++) {
        for ($x = 0; $x -lt $Size; $x++) {
            $pMaskPx = $pMask.GetPixel($x, $y)
            if ($pMaskPx.A -gt 0 -and (Test-WhitePixel $pMaskPx)) {
                $out.SetPixel($x, $y, (Get-TeacherGradientColor -X $x -Y $y -Size $Size))
            }
        }
    }

    $shieldPath.Dispose()
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("T", $tFont, [System.Drawing.Brushes]::White, $letterCenterX, $letterCenterY, $sf)

    $outDir = Join-Path $PSScriptRoot "..\public\images\teacher-icons"
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    $outPath = Join-Path $outDir "icon-$Size.png"
    $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    Write-Output ("Saved {0} (T font={1:N1}, centerY={2:N1})" -f $outPath, $letterFontSize, $letterCenterY)

    $pFont.Dispose()
    $tFont.Dispose()
    $bgBrush.Dispose()
    $pMask.Dispose()
    $parent.Dispose()
    $g.Dispose()
    $out.Dispose()
}

foreach ($size in @(192, 512)) {
    New-TeacherIconFromParent -Size $size
}
