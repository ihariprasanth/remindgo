Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $projectRoot "assets\logo-source.png"
$assetsDir = Join-Path $projectRoot "assets"
$srcAssetsDir = Join-Path $projectRoot "src\assets"
$docsDir = Join-Path $projectRoot "docs"
$desktopAppDir = "C:\Users\HARIPRASANTH\Desktop\RemindGo App"

if (-not (Test-Path $sourceFile)) {
    Write-Error "Source file not found: $sourceFile"
    exit 1
}

if (-not (Test-Path $srcAssetsDir)) {
    New-Item -ItemType Directory -Force -Path $srcAssetsDir | Out-Null
}

$sourceBmp = [System.Drawing.Bitmap]::FromFile($sourceFile)
Write-Host "[IconGen] Source image loaded: $($sourceBmp.Width)x$($sourceBmp.Height)"

# Helper function to create rounded rectangle path
function Get-RoundedRectPath([System.Drawing.RectangleF]$rect, [float]$radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2.0
    $arc = New-Object System.Drawing.RectangleF($rect.X, $rect.Y, $diameter, $diameter)

    $path.AddArc($arc, 180, 90)
    $arc.X = $rect.Right - $diameter
    $path.AddArc($arc, 270, 90)
    $arc.Y = $rect.Bottom - $diameter
    $path.AddArc($arc, 0, 90)
    $arc.X = $rect.Left
    $path.AddArc($arc, 90, 90)
    $path.CloseFigure()
    return $path
}

# 1. Generate Squircle (Soft Rounded Corners - Apple macOS standard)
function Generate-Squircle([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Padding ~2.5% for anti-aliasing margin
    $pad = [Math]::Max(1.0, [float]$size * 0.025)
    $w = [float]$size - (2.0 * $pad)
    $h = [float]$size - (2.0 * $pad)
    # Squircle corner radius is ~21.5% of dimension
    $radius = $w * 0.215

    $rect = New-Object System.Drawing.RectangleF($pad, $pad, $w, $h)
    $path = Get-RoundedRectPath $rect $radius

    # Soft subtle drop shadow/glow behind squircle
    if ($size -ge 128) {
        $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 0, 0, 0))
        $shadowY = [float]($pad + ($size * 0.015))
        $shadowRect = New-Object System.Drawing.RectangleF([float]$pad, $shadowY, [float]$w, [float]$h)
        $shadowPath = Get-RoundedRectPath $shadowRect $radius
        $g.FillPath($shadowBrush, $shadowPath)
        $shadowBrush.Dispose()
        $shadowPath.Dispose()
    }

    # Set clip to rounded rect
    $g.SetClip($path)

    # Fill white base
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, 0, 0, $size, $size)
    $whiteBrush.Dispose()

    # Draw source logo inside squircle with high quality
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $sourceBmp.Width, $sourceBmp.Height)
    $destRect = New-Object System.Drawing.Rectangle([int]$pad, [int]$pad, [int]$w, [int]$h)
    $g.DrawImage($sourceBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $g.ResetClip()

    # Draw refined border stroke for squircle
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 0, 0, 0), [Math]::Max(1.0, [float]$size * 0.006))
    $g.DrawPath($pen, $path)
    $pen.Dispose()

    $path.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "  -> Generated Squircle: $outputPath ($($size)x$($size))"
    return $bmp
}

# 2. Generate Circle
function Generate-Circle([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $pad = [Math]::Max(1.0, [float]$size * 0.02)
    $w = [float]$size - (2.0 * $pad)
    $h = [float]$size - (2.0 * $pad)
    $rect = New-Object System.Drawing.RectangleF($pad, $pad, $w, $h)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($rect)

    # Set clip to circle
    $g.SetClip($path)

    # Fill white base
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, 0, 0, $size, $size)
    $whiteBrush.Dispose()

    # Draw source logo inside circle
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $sourceBmp.Width, $sourceBmp.Height)
    $destRect = New-Object System.Drawing.Rectangle([int]$pad, [int]$pad, [int]$w, [int]$h)
    $g.DrawImage($sourceBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $g.ResetClip()

    # Draw crisp outer ring
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 0, 0, 0), [Math]::Max(1.0, [float]$size * 0.008))
    $g.DrawEllipse($pen, $rect)
    $pen.Dispose()

    $path.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "  -> Generated Circle: $outputPath ($($size)x$($size))"
    return $bmp
}

# 3. Generate Transparent Vector-like Cutout
function Generate-Transparent([int]$size, [string]$outputPath) {
    # Convert white background to transparent, keeping crisp black text
    $scaled = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($scaled)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($sourceBmp, 0, 0, $size, $size)
    $g.Dispose()

    # Process pixels for transparent background
    for ($y = 0; $y -lt $size; $y++) {
        for ($x = 0; $x -lt $size; $x++) {
            $col = $scaled.GetPixel($x, $y)
            $brightness = [int]($col.R * 0.299 + $col.G * 0.587 + $col.B * 0.114)
            if ($brightness -gt 240) {
                # Pure background -> transparent
                $scaled.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } elseif ($brightness -gt 180) {
                # Anti-aliased edge -> semi-transparent
                $alpha = 255 - [int](($brightness - 180) * (255.0 / 60.0))
                $scaled.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 0, 0, 0))
            }
        }
    }

    $scaled.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "  -> Generated Transparent Cutout: $outputPath ($($size)x$($size))"
    $scaled.Dispose()
}

Write-Host "`n[1/4] Generating Squircles (Soft-square app icons)..."
$squircle1024 = Generate-Squircle 1024 (Join-Path $assetsDir "logo-squircle.png")
$squircle512  = Generate-Squircle 512 (Join-Path $assetsDir "icon.png")
$squircle256  = Generate-Squircle 256 (Join-Path $assetsDir "logo-squircle-256.png")
$squircle128  = Generate-Squircle 128 (Join-Path $assetsDir "logo-squircle-128.png")
$squircle64   = Generate-Squircle 64  (Join-Path $assetsDir "logo-squircle-64.png")
$squircle48   = Generate-Squircle 48  (Join-Path $assetsDir "logo-squircle-48.png")
$squircle32   = Generate-Squircle 32  (Join-Path $assetsDir "tray-icon.png")
$squircle16   = Generate-Squircle 16  (Join-Path $assetsDir "logo-squircle-16.png")

Write-Host "`n[2/4] Generating Circles..."
$circle1024 = Generate-Circle 1024 (Join-Path $assetsDir "logo-circle.png")
$circle256  = Generate-Circle 256  (Join-Path $assetsDir "logo-circle-256.png")
$circle64   = Generate-Circle 64   (Join-Path $assetsDir "logo-circle-64.png")

Write-Host "`n[3/4] Generating Transparent cutouts for dark & light UI placeholders..."
Generate-Transparent 512 (Join-Path $assetsDir "logo-transparent.png")
Generate-Transparent 256 (Join-Path $assetsDir "logo-transparent-256.png")

Write-Host "`n[4/4] Packing Windows Multi-Resolution .ICO file (Soft Squircle)..."
# Create standard Windows ICO containing PNGs for 256, 128, 64, 48, 32, 16
$icoSizes = @(256, 128, 64, 48, 32, 16)
$pngBytesList = @()

foreach ($sz in $icoSizes) {
    $tempBmp = Generate-Squircle $sz ([System.IO.Path]::GetTempFileName())
    $ms = New-Object System.IO.MemoryStream
    $tempBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
    $tempBmp.Dispose()
}

$icoPath = Join-Path $assetsDir "icon.ico"
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR header
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Type 1 = ICO
$bw.Write([UInt16]$icoSizes.Count) # Number of images

# Calculate offset: header (6) + entries (16 * count)
$offset = 6 + (16 * $icoSizes.Count)

for ($i = 0; $i -lt $icoSizes.Count; $i++) {
    $sz = $icoSizes[$i]
    $data = $pngBytesList[$i]
    $bWidth = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $bHeight = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $bw.Write($bWidth)
    $bw.Write($bHeight)
    $bw.Write([byte]0)       # Color count
    $bw.Write([byte]0)       # Reserved
    $bw.Write([UInt16]1)     # Planes
    $bw.Write([UInt16]32)    # Bit count
    $bw.Write([UInt32]$data.Length) # Size of image data
    $bw.Write([UInt32]$offset)      # Offset of image data
    $offset += $data.Length
}

# Write PNG payloads
for ($i = 0; $i -lt $icoSizes.Count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$bw.Dispose()
$fs.Dispose()

Write-Host "  -> Generated Multi-resolution Windows ICO: $icoPath"

# Copy assets to src/assets, docs/, and desktop app folder
Copy-Item (Join-Path $assetsDir "logo-squircle.png") (Join-Path $srcAssetsDir "logo-squircle.png") -Force
Copy-Item (Join-Path $assetsDir "logo-squircle.png") (Join-Path $docsDir "logo-squircle.png") -Force
Copy-Item (Join-Path $assetsDir "logo-circle.png") (Join-Path $srcAssetsDir "logo-circle.png") -Force
Copy-Item (Join-Path $assetsDir "logo-circle.png") (Join-Path $docsDir "logo-circle.png") -Force
Copy-Item (Join-Path $assetsDir "logo-transparent.png") (Join-Path $srcAssetsDir "logo-transparent.png") -Force
Copy-Item (Join-Path $assetsDir "logo-transparent.png") (Join-Path $docsDir "logo-transparent.png") -Force
Copy-Item (Join-Path $assetsDir "icon.png") (Join-Path $srcAssetsDir "icon.png") -Force
Copy-Item (Join-Path $assetsDir "icon.png") (Join-Path $docsDir "icon.png") -Force

Write-Host "`n[Success] All icons, squircles, circles, and Windows .ico generated and distributed successfully!"

$sourceBmp.Dispose()
$squircle1024.Dispose()
$squircle512.Dispose()
$squircle256.Dispose()
$squircle128.Dispose()
$squircle64.Dispose()
$squircle48.Dispose()
$squircle32.Dispose()
$squircle16.Dispose()
$circle1024.Dispose()
$circle256.Dispose()
$circle64.Dispose()
