Add-Type -AssemblyName System.Drawing

function New-TeacherIcon {
    param([int]$Size)

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect,
        ([System.Drawing.Color]::FromArgb(255, 55, 48, 163)),
        ([System.Drawing.Color]::FromArgb(255, 234, 88, 12)),
        45
    $g.FillRectangle($bgBrush, $rect)

    $softGlow = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowSize = [int]($Size * 0.72)
    $glowX = [int](($Size - $glowSize) / 2)
    $glowY = [int]($Size * 0.08)
    $softGlow.AddEllipse($glowX, $glowY, $glowSize, [int]($glowSize * 0.55))
    $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
    $g.FillPath($glowBrush, $softGlow)

    $fontSize = [single]($Size * 0.54)
    $font = New-Object System.Drawing.Font Arial, $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $tY = $Size * 0.36
    $g.DrawString("T", $font, [System.Drawing.Brushes]::White, ($Size / 2), $tY, $sf)

    $shieldW = [int]($Size * 0.42)
    $shieldH = [int]($Size * 0.46)
    $shieldX = [int](($Size - $shieldW) / 2)
    $shieldY = [int]($Size * 0.54)

    $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $topInset = [int]($shieldW * 0.18)
    $shoulderY = $shieldY + [int]($shieldH * 0.12)
    $bottomY = $shieldY + $shieldH
    $shield.AddLine($shieldX + $topInset, $shieldY, $shieldX + $shieldW - $topInset, $shieldY)
    $shield.AddBezier(
        $shieldX + $shieldW - $topInset, $shieldY,
        $shieldX + $shieldW + [int]($shieldW * 0.04), $shoulderY,
        $shieldX + $shieldW + [int]($shieldW * 0.04), $bottomY - [int]($shieldH * 0.18),
        $shieldX + ($shieldW / 2), $bottomY
    )
    $shield.AddBezier(
        $shieldX + ($shieldW / 2), $bottomY,
        $shieldX - [int]($shieldW * 0.04), $bottomY - [int]($shieldH * 0.18),
        $shieldX - [int]($shieldW * 0.04), $shoulderY,
        $shieldX + $topInset, $shieldY
    )
    $g.FillPath([System.Drawing.Brushes]::White, $shield)

    $boardW = [int]($shieldW * 0.62)
    $boardH = [int]($shieldH * 0.58)
    $boardX = [int](($Size - $boardW) / 2)
    $boardY = $shieldY + [int]($shieldH * 0.2)
    $boardRect = New-Object System.Drawing.RectangleF $boardX, $boardY, $boardW, $boardH
    $boardPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = [single]($boardW * 0.08)
    $boardPath.AddArc($boardX, $boardY, $radius * 2, $radius * 2, 180, 90)
    $boardPath.AddArc($boardX + $boardW - $radius * 2, $boardY, $radius * 2, $radius * 2, 270, 90)
    $boardPath.AddArc($boardX + $boardW - $radius * 2, $boardY + $boardH - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $boardPath.AddArc($boardX, $boardY + $boardH - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $boardPath.CloseFigure()
    $boardFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 67, 56, 202))
    $g.FillPath($boardFill, $boardPath)

    $clipW = [int]($boardW * 0.34)
    $clipH = [int]($boardH * 0.16)
    $clipX = [int](($Size - $clipW) / 2)
    $clipY = $boardY - [int]($clipH * 0.55)
    $clipRect = New-Object System.Drawing.Rectangle $clipX, $clipY, $clipW, $clipH
    $g.FillRectangle([System.Drawing.Brushes]::White, $clipRect)
    $clipInner = New-Object System.Drawing.Rectangle ($clipX + [int]($clipW * 0.18)), ($clipY + [int]($clipH * 0.22)), ([int]($clipW * 0.64)), ([int]($clipH * 0.56))
    $g.FillRectangle($boardFill, $clipInner)

    $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 255, 255)), ([single]($Size * 0.018))
    $lineStartX = $boardX + [int]($boardW * 0.16)
    $lineEndX = $boardX + $boardW - [int]($boardW * 0.16)
    $lineY1 = $boardY + [int]($boardH * 0.34)
    $lineY2 = $boardY + [int]($boardH * 0.52)
    $lineY3 = $boardY + [int]($boardH * 0.70)
    $g.DrawLine($linePen, $lineStartX, $lineY1, $lineEndX, $lineY1)
    $g.DrawLine($linePen, $lineStartX, $lineY2, $lineEndX, $lineY2)
    $g.DrawLine($linePen, $lineStartX, $lineY3, [int]($lineEndX - $boardW * 0.18), $lineY3)

    $tickPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), ([single]($Size * 0.022))
    $tickPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $tickPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $tickX = $lineStartX - [int]($boardW * 0.02)
    $g.DrawLine($tickPen, ($tickX - [int]($boardW * 0.06)), ($lineY1 + [int]($boardH * 0.02)), $tickX, ($lineY1 + [int]($boardH * 0.08)))
    $g.DrawLine($tickPen, $tickX, ($lineY1 + [int]($boardH * 0.08)), ($tickX + [int]($boardW * 0.12)), ($lineY1 - [int]($boardH * 0.06)))

    $outDir = Join-Path $PSScriptRoot "..\public\images\teacher-icons"
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    $outPath = Join-Path $outDir "icon-$Size.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $font.Dispose()
    $bgBrush.Dispose()
    $glowBrush.Dispose()
    $boardFill.Dispose()
    $linePen.Dispose()
    $tickPen.Dispose()
    $g.Dispose()
    $bmp.Dispose()

    Write-Output "Saved $outPath"
}

foreach ($size in @(192, 512)) {
    New-TeacherIcon -Size $size
}
