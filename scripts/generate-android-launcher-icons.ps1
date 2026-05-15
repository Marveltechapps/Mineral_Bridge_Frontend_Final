# Generates mipmap PNGs from the Mineral Bridge logo (Windows + .NET Framework).
# Adaptive foreground: transparent canvas, logo scaled to ~72% (launcher safe zone).
# Legacy mipmaps: solid icon background + centered logo (no transparent “black square” on old launchers).
$ErrorActionPreference = "Stop"
$sourcePath = Join-Path $PSScriptRoot "..\assets\mb_1.png"
if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source image not found: $sourcePath"
}

Add-Type -AssemblyName System.Drawing

$iconBg = [System.Drawing.Color]::FromArgb(255, 17, 17, 17) # #111111

function Save-ForegroundPng {
    param([string]$SrcPath, [string]$OutPath, [int]$Size)
    $src = [System.Drawing.Image]::FromFile($SrcPath)
    try {
        $inner = [int][Math]::Floor($Size * 0.72)
        $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $g.Clear([System.Drawing.Color]::Transparent)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            $ratio = [Math]::Min($inner / $src.Width, $inner / $src.Height)
            $w = [int][Math]::Round($src.Width * $ratio)
            $h = [int][Math]::Round($src.Height * $ratio)
            $x = [int](($Size - $w) / 2)
            $y = [int](($Size - $h) / 2)
            $g.DrawImage($src, $x, $y, $w, $h)
        }
        finally { $g.Dispose() }

        $dir = Split-Path -Parent $OutPath
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    finally { $src.Dispose() }
}

function Save-LegacyLauncherPng {
    param([string]$SrcPath, [string]$OutPath, [int]$Size)
    $src = [System.Drawing.Image]::FromFile($SrcPath)
    try {
        $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $g.Clear($iconBg)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            $ratio = [Math]::Min($Size / $src.Width, $Size / $src.Height)
            $w = [int][Math]::Round($src.Width * $ratio)
            $h = [int][Math]::Round($src.Height * $ratio)
            $x = [int](($Size - $w) / 2)
            $y = [int](($Size - $h) / 2)
            $g.DrawImage($src, $x, $y, $w, $h)
        }
        finally { $g.Dispose() }

        $dir = Split-Path -Parent $OutPath
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    finally { $src.Dispose() }
}

$resRoot = Join-Path $PSScriptRoot "..\android\app\src\main\res"

$launcher = @(
    @{ folder = "mipmap-mdpi";    px = 48  },
    @{ folder = "mipmap-hdpi";    px = 72  },
    @{ folder = "mipmap-xhdpi";   px = 96  },
    @{ folder = "mipmap-xxhdpi";  px = 144 },
    @{ folder = "mipmap-xxxhdpi"; px = 192 }
)

$foreground = @(
    @{ folder = "mipmap-mdpi";    px = 108 },
    @{ folder = "mipmap-hdpi";    px = 162 },
    @{ folder = "mipmap-xhdpi";   px = 216 },
    @{ folder = "mipmap-xxhdpi";  px = 324 },
    @{ folder = "mipmap-xxxhdpi"; px = 432 }
)

foreach ($row in $launcher) {
    $dir = Join-Path $resRoot $row.folder
    Save-LegacyLauncherPng -SrcPath $sourcePath -OutPath (Join-Path $dir "ic_launcher.png") -Size $row.px
    Copy-Item -LiteralPath (Join-Path $dir "ic_launcher.png") -Destination (Join-Path $dir "ic_launcher_round.png") -Force
}

foreach ($row in $foreground) {
    $dir = Join-Path $resRoot $row.folder
    Save-ForegroundPng -SrcPath $sourcePath -OutPath (Join-Path $dir "ic_launcher_foreground.png") -Size $row.px
}

Write-Host "Done. Launcher + adaptive foreground PNGs written under $resRoot"
