$outDir = "$PSScriptRoot\..\tools\ffmpeg\bin"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

$ffmpegZip = "$env:TEMP\ffmpeg-win64-static.zip"
$ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'

Write-Host "Downloading ffmpeg from $ffmpegUrl ..."
Invoke-WebRequest -Uri $ffmpegUrl -OutFile $ffmpegZip -UseBasicParsing
Write-Host "Extracting..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
${extractTo} = "$PSScriptRoot\..\tools\ffmpeg"
[System.IO.Compression.ZipFile]::ExtractToDirectory($ffmpegZip, $extractTo)
Write-Host "Searching for ffmpeg.exe under $extractTo ..."
$ffmpegExe = Get-ChildItem -Path $extractTo -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $ffmpegExe) {
	Write-Error "ffmpeg.exe not found after extraction"
	exit 1
}

$destBin = "$PSScriptRoot\..\tools\ffmpeg"
if (!(Test-Path $destBin)) { New-Item -ItemType Directory -Force -Path $destBin | Out-Null }
Copy-Item -Path $ffmpegExe.FullName -Destination (Join-Path $destBin 'ffmpeg.exe') -Force
Write-Host "ffmpeg.exe copied to $destBin\ffmpeg.exe"