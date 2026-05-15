param(
  [Parameter(Mandatory = $true)]
  [string]$InputPng,

  [Parameter(Mandatory = $true)]
  [string]$OutputPng,

  # Percent of the 1024x1024 canvas the image should occupy.
  # 0.84 => ~8% padding on each side.
  [double]$Scale = 0.84
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile($InputPng)
try {
  $size = 1024
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.Clear([System.Drawing.Color]::Transparent)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

      $targetW = [int]($size * $Scale)
      $targetH = [int]($size * $Scale)
      $x = [int](($size - $targetW) / 2)
      $y = [int](($size - $targetH) / 2)

      $g.DrawImage($src, $x, $y, $targetW, $targetH)
    } finally {
      $g.Dispose()
    }

    $bmp.Save($OutputPng, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $bmp.Dispose()
  }
} finally {
  $src.Dispose()
}

Write-Output ("Wrote {0}" -f $OutputPng)

