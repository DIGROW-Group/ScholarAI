$zip = Join-Path $env:TEMP ('ffmpeg_' + ([guid]::NewGuid().ToString()) + '.zip')
$url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
Write-Host "Downloading to $zip"
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
Add-Type -AssemblyName System.IO.Compression.FileSystem
$extract = Join-Path $PSScriptRoot '..\tools\ffmpeg_tmp' | Resolve-Path -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue
if (-not $extract) { $extract = Join-Path $PSScriptRoot '..\tools\ffmpeg_tmp' }
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
Write-Host "Extracting to $extract"
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extract)
$ff = Get-ChildItem -Path $extract -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $ff) {
    $dest = Join-Path $PSScriptRoot '..\tools\ffmpeg'
    if (!(Test-Path $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }
    Copy-Item -Path $ff.FullName -Destination (Join-Path $dest 'ffmpeg.exe') -Force
    Write-Host "ffmpeg-copied to" (Join-Path $dest 'ffmpeg.exe')
} else {
    Write-Error 'ffmpeg not found after extract'
    exit 1
}
