# Activa los modelos avanzados de Calex por OpenRouter. Se hace UNA vez, después de cargar el saldo.
# Uso:  powershell -ExecutionPolicy Bypass -File .\activar-openrouter.ps1
# Las claves las pegas tú cuando wrangler las pide: no se guardan en ningún archivo ni se muestran en pantalla.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host @"

1) En https://openrouter.ai: inicia sesión y carga US`$5 de crédito (Credits > Add credits).
2) En https://openrouter.ai/settings/keys crea DOS claves con «Create key» y ponle a cada una su tope («Credit limit»):
     - «calex-glm»       con límite de US`$3   (diseña páginas y código con GLM-5.3)
     - «calex-deepseek»  con límite de US`$2   (charla y revisión de páginas con DeepSeek 4.1)
   Copia cada clave en cuanto se crea (después ya no se puede ver).

Pega ahora cada clave cuando se pida:
"@
Write-Host "`n>> Clave «calex-glm» (tope US`$3):" -ForegroundColor Cyan
npx wrangler secret put OPENROUTER_KEY_ZAI
Write-Host "`n>> Clave «calex-deepseek» (tope US`$2):" -ForegroundColor Cyan
npx wrangler secret put OPENROUTER_KEY_DEEPSEEK
Write-Host "`nListo. Calex ya usa GLM-5.3 y DeepSeek 4.1 (si falla una clave o se acaba el saldo, sigue con los modelos gratuitos)." -ForegroundColor Green
