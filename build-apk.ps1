$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$localToolRoot = Join-Path $projectRoot '..\..\work\android-toolchain'
$localJdk = Join-Path $localToolRoot 'jdk\jdk-21.0.13+9'
$localSdk = Join-Path $localToolRoot 'android-sdk'

$jdk = $env:JAVA_HOME
if (-not $jdk -and (Test-Path (Join-Path $localJdk 'bin\java.exe'))) {
  $jdk = $localJdk
}

$sdk = $env:ANDROID_SDK_ROOT
if (-not $sdk) { $sdk = $env:ANDROID_HOME }
if (-not $sdk -and (Test-Path (Join-Path $localSdk 'platforms\android-36\android.jar'))) {
  $sdk = $localSdk
}

if (-not $jdk -or -not (Test-Path (Join-Path $jdk 'bin\java.exe'))) {
  throw 'JDK 21 not found. Set JAVA_HOME to a JDK 21 installation.'
}
if (-not $sdk -or -not (Test-Path (Join-Path $sdk 'platforms\android-36\android.jar'))) {
  throw 'Android SDK 36 not found. Set ANDROID_SDK_ROOT (or ANDROID_HOME) to an Android SDK installation.'
}

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$jdk\bin;$env:PATH"

Set-Content -Path (Join-Path $projectRoot 'android\local.properties') `
  -Value "sdk.dir=$($sdk.Replace('\', '/'))" -Encoding Ascii

Push-Location $projectRoot
try {
  pnpm run mobile:sync
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }

  Push-Location (Join-Path $projectRoot 'android')
  try {
    .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'Gradle APK build failed.' }
  } finally {
    Pop-Location
  }

  $builtApk = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
  Copy-Item -LiteralPath $builtApk -Destination (Join-Path $projectRoot '毛泽东选集.apk') -Force
  Write-Output "APK saved to $(Join-Path $projectRoot '毛泽东选集.apk')"
} finally {
  Pop-Location
}
