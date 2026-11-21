# Activa el inicio de sesion de Calex (Google y Apple) guardando TUS claves como secretos de Cloudflare.
# Uso:  powershell -ExecutionPolicy Bypass -File .\activar-logins.ps1
# Las claves las escribes tu cuando wrangler las pide: no se guardan en ningun archivo ni se muestran en pantalla.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$url = "https://calex.federicoreta773.workers.dev"
$host_ = ([uri]$url).Host
Write-Host "`nCalex: $url`n"

function Poner($nombre) { npx wrangler secret put $nombre }

Write-Host "== Apple ==" -ForegroundColor Cyan
Write-Host @"
Antes necesitas una cuenta de Apple Developer (de pago) y crear en developer.apple.com > Certificates, Identifiers & Profiles:
  1. Identifiers > App IDs: crea uno y activa 'Sign in with Apple'.
  2. Identifiers > Services IDs: crea uno (por ejemplo com.tufamilia.calex). Ese es el APPLE_CLIENT_ID.
     Entra en el Services ID > 'Sign in with Apple' > Configure:
       Dominio:            $host_
       URL de retorno:     $url/auth/callback/apple
     Si Apple pide verificar el dominio, descarga su archivo y guarda su contenido con la opcion de abajo.
  3. Keys: crea una clave con 'Sign in with Apple' y descarga el archivo .p8 (solo se puede descargar una vez).
     Anota el Key ID (APPLE_KEY_ID). Tu Team ID (APPLE_TEAM_ID) sale arriba a la derecha en la cuenta.
"@
$r = Read-Host "¿Configurar Apple ahora? (s/n)"
if ($r -eq "s") {
  Poner "APPLE_CLIENT_ID"; Poner "APPLE_TEAM_ID"; Poner "APPLE_KEY_ID"
  $f = Read-Host "Ruta del archivo .p8 (se lee y se sube sin mostrarlo)"
  if (Test-Path $f) { Get-Content $f -Raw | npx wrangler secret put APPLE_PRIVATE_KEY } else { Write-Host "No existe ese archivo; APPLE_PRIVATE_KEY queda sin poner." -ForegroundColor Yellow }
  $v = Read-Host "¿Apple te pidio verificar el dominio con un archivo? (s/n)"
  if ($v -eq "s") {
    $a = Read-Host "Ruta del archivo apple-developer-domain-association.txt que descargaste"
    if (Test-Path $a) { Get-Content $a -Raw | npx wrangler secret put APPLE_DOMAIN_ASSOCIATION } else { Write-Host "No existe ese archivo." -ForegroundColor Yellow }
  }
}

Write-Host "`n== Google ==" -ForegroundColor Cyan
Write-Host "URL de redireccion que debes registrar en tu cliente web de Google Cloud:  $url/auth/callback/google"
Write-Host "El APPLE/GOOGLE CLIENT_ID no es secreto; el secreto de Google crealo nuevo (Agregar secreto) si has pegado el anterior en algun chat."
$r = Read-Host "¿Configurar Google ahora? (s/n)"
if ($r -eq "s") { Poner "GOOGLE_CLIENT_ID"; Poner "GOOGLE_CLIENT_SECRET" }

Write-Host "`nComprobando..."
Start-Sleep 4
$st = Invoke-RestMethod "$url/auth/status"
$st.providers.PSObject.Properties | ForEach-Object { "{0,-8} {1}" -f $_.Value.label, $(if ($_.Value.configured) { "activo" } else { "sin configurar" }) }
