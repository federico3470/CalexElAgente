# Activa el conector de Spotify (isla de música) en Calex. Se hace UNA sola vez; después cualquier persona solo toca «Vincular».
# Uso:  powershell -ExecutionPolicy Bypass -File .\activar-spotify.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$url = "https://calex.federicoreta773.workers.dev"
Write-Host @"

1) Entra en https://developer.spotify.com/dashboard e inicia sesión con tu cuenta de Spotify.
2) «Create app»: nombre Calex, y en «Redirect URI» pon exactamente:
       $url/connectors/callback
   Marca «Web API» y guarda.
3) En la app > Settings copia el «Client ID» (es público, no es una clave secreta).
4) En la app > User Management agrega el correo de Spotify de cada persona que lo vaya a usar (en modo desarrollo Spotify solo deja entrar a 25 personas agregadas).

Pega el Client ID cuando wrangler lo pida:
"@
npx wrangler secret put SPOTIFY_CLIENT_ID
Write-Host "`nListo. En Calex: Conectores > Spotify > Vincular. (Para controlar la música hace falta Spotify Premium.)" -ForegroundColor Green
