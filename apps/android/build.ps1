# Compila Calex.apk sin Gradle. Necesita D:\Android (JDK 17 + SDK con platforms;android-34 y build-tools;34.0.0).
param([string]$Variant = "main")  # main = Calex (con asistente digital) · auto = Calex Auto (modo coche, paquete com.calex.auto)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$jh = (Get-ChildItem D:\Android\jdk -Directory | Select-Object -First 1).FullName; $env:JAVA_HOME = $jh; $env:Path = "$jh\bin;" + $env:Path
$sdk = "D:\Android\sdk"; $bt = "$sdk\build-tools\34.0.0"; $jar = "$sdk\platforms\android-34\android.jar"
$b = "$PSScriptRoot\build"; if (Test-Path $b) { Remove-Item $b -Recurse -Force }; New-Item -ItemType Directory -Force $b, "$b\gen", "$b\classes" | Out-Null
function Run($exe, $a) { & $exe @a; if ($LASTEXITCODE -ne 0) { throw "falló: $exe" } }

# iconos
Add-Type -AssemblyName System.Drawing
$logo = [Drawing.Image]::FromFile("$PSScriptRoot\..\icon-256.png")
New-Item -ItemType Directory -Force res\mipmap-xxxhdpi, res\drawable-xhdpi | Out-Null
$ic = New-Object Drawing.Bitmap 192,192; $g = [Drawing.Graphics]::FromImage($ic); $g.InterpolationMode='HighQualityBicubic'; $g.DrawImage($logo,0,0,192,192); $g.Dispose(); $ic.Save("$PSScriptRoot\res\mipmap-xxxhdpi\ic_launcher.png",[Drawing.Imaging.ImageFormat]::Png); $ic.Dispose()
$bn = New-Object Drawing.Bitmap 320,180; $g = [Drawing.Graphics]::FromImage($bn); $g.SmoothingMode='AntiAlias'; $g.TextRenderingHint='AntiAliasGridFit'
$br = New-Object Drawing.Drawing2D.LinearGradientBrush ([Drawing.Point]::new(0,0)),([Drawing.Point]::new(320,180)),([Drawing.Color]::FromArgb(15,17,21)),([Drawing.Color]::FromArgb(24,60,90)); $g.FillRectangle($br,0,0,320,180)
$g.DrawImage($logo,28,42,96,96); $f = New-Object Drawing.Font "Segoe UI Semibold",30; $g.DrawString("Calex",$f,[Drawing.Brushes]::White,140,52); $f2 = New-Object Drawing.Font "Segoe UI",12; $g.DrawString("Asistente de la familia",$f2,[Drawing.Brushes]::LightGray,142,100); $g.Dispose()
$bn.Save("$PSScriptRoot\res\drawable-xhdpi\banner.png",[Drawing.Imaging.ImageFormat]::Png); $bn.Dispose(); $logo.Dispose()

Run "$bt\aapt2.exe" @("compile", "--dir", "res", "-o", "$b\res.zip")
$mf = "$PSScriptRoot\AndroidManifest.xml"
if ($Variant -eq "auto") { $m = Get-Content $mf -Raw -Encoding UTF8; $m = [regex]::Replace($m, "(?s)\s*<!--ASSIST-->.*?<!--/ASSIST-->", ""); $m = $m.Replace('package="com.calex.app"', 'package="com.calex.auto"').Replace('android:label="Calex" android:icon', 'android:label="Calex Auto" android:icon'); $mf = "$b\AndroidManifest.xml"; [IO.File]::WriteAllText($mf, $m, (New-Object Text.UTF8Encoding $false)) }
Run "$bt\aapt2.exe" @("link", "-o", "$b\base.apk", "-I", $jar, "--manifest", $mf, "--min-sdk-version", "23", "--target-sdk-version", "34", "--version-code", "9", "--version-name", "1.4", "$b\res.zip", "--java", "$b\gen")
$src = @(Get-ChildItem src -Recurse -Filter *.java | ForEach-Object FullName) + @(Get-ChildItem "$b\gen" -Recurse -Filter *.java | ForEach-Object FullName)
Run "javac" (@("-source", "8", "-target", "8", "-Xlint:-options", "-bootclasspath", $jar, "-d", "$b\classes") + $src)
$cls = @(Get-ChildItem "$b\classes" -Recurse -Filter *.class | ForEach-Object FullName)
Run "$bt\d8.bat" (@("--lib", $jar, "--output", $b, "--min-api", "23") + $cls)
Push-Location $b; Run "$bt\aapt.exe" @("add", "base.apk", "classes.dex"); Pop-Location
Run "$bt\zipalign.exe" @("-f", "-p", "4", "$b\base.apk", "$b\aligned.apk")
$apkName = if ($Variant -eq "auto") { "Calex-Auto.apk" } else { "Calex.apk" }
$ks = "$PSScriptRoot\calex-release.jks"
if (-not (Test-Path $ks)) { Run "keytool" @("-genkeypair", "-keystore", $ks, "-alias", "calex", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-storepass", "calex-familia", "-keypass", "calex-familia", "-dname", "CN=Calex, O=Familia") }
New-Item -ItemType Directory -Force "$PSScriptRoot\..\dist" | Out-Null
Run "$bt\apksigner.bat" @("sign", "--ks", $ks, "--ks-pass", "pass:calex-familia", "--key-pass", "pass:calex-familia", "--out", "$PSScriptRoot\..\dist\$apkName", "$b\aligned.apk")
Run "$bt\apksigner.bat" @("verify", "--verbose", "$PSScriptRoot\..\dist\$apkName")
Get-Item "$PSScriptRoot\..\dist\$apkName" | Select-Object FullName, Length
