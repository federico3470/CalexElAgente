# Nixel en Cloudflare (con servidor, sin que nadie ponga claves y sin tu PC encendido)

Es la versión pública completa: cuentas con **Google y Apple**, conversaciones guardadas y sincronizadas entre dispositivos, **botón de modelos**, imágenes, lectura de PDF, guía "Guíame", y la IA corre en Cloudflare (Workers AI). **Nadie necesita una clave**, y tu PC puede estar apagada.

## Qué modelos ofrece (se cambian en `MODELS` de `wrangler.toml`)
| Etiqueta | Modelo | Peso en el límite diario | Velocidad medida |
|---|---|---|---|
| Rápido | `@cf/meta/llama-3.2-3b-instruct` | 1 | ~0,9 s al primer texto, 130-200 palabras/s |
| Equilibrado | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 2 | 1,3-9 s al primer texto, ~35-65 tok/s (variable) |
| Potente (predeterminado) | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 3 | ~0,9 s al primer texto, ~55 tok/s |
| Imágenes (automático al adjuntar una foto) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 2 | ~2,5 s |

- **Los nombres de modelo cambian con el tiempo:** el 20/11/2026 Cloudflare retiró Llama 3.1 8B, Qwen3 30B, Nemotron y Kimi K2.6; GPT-OSS y Gemma 4 gastan todo el límite de texto «pensando» y a veces responden vacío, por eso no están. Confírmalos en https://developers.cloudflare.com/workers-ai/models/ . Si el modelo elegido falla o no existe, Nixel vuelve solo al predeterminado.
- **Límite diario por persona** (`DAILY_LIMIT`, por defecto 80 puntos). Los modelos grandes gastan más puntos, así que nadie agota tu cupo gratuito de golpe.
- **Coste:** Cloudflare da 10.000 "neurons" gratis al día; después cobra por uso ($0,011 por 1.000 neurons según su página de precios). Revisa https://developers.cloudflare.com/workers-ai/platform/pricing/ antes de abrirlo al público.

## Subirla (unos 20 minutos, lo haces tú con tu cuenta)
En una terminal, dentro de `D:\dot-cloudflare`:
1. `npx wrangler login` → se abre el navegador; autoriza tu cuenta de Cloudflare.
2. `npx wrangler d1 create dot-db` → copia el `database_id` que muestra y pégalo en `wrangler.toml` (donde dice `PEGA_AQUI_EL_DATABASE_ID`).
3. En `wrangler.toml` completa `LEGAL_OWNER`, `LEGAL_EMAIL` y `LEGAL_COUNTRY` (salen en los términos y la privacidad).
4. `npx wrangler deploy` → la primera vez te pide elegir un subdominio. Te da una dirección tipo `https://nixel.TU-SUBDOMINIO.workers.dev`.

## Activar el inicio con Google (sin pegar el secreto en ningún chat ni archivo)
1. En Google Cloud → tu cliente web → **URI de redireccionamiento autorizados** → añade `https://nixel.TU-SUBDOMINIO.workers.dev/auth/callback/google`. Guarda.
2. Crea un secreto **nuevo** (Agregar secreto) y bórrales los viejos que pegaste en chats.
3. En la terminal (te pide pegar el valor, no lo escribas en ningún archivo):
   - `npx wrangler secret put GOOGLE_CLIENT_ID`
   - `npx wrangler secret put GOOGLE_CLIENT_SECRET`
4. Apple: necesita cuenta de Apple Developer (de pago). Mira los pasos que imprime `activar-logins.ps1` (Services ID, URL de retorno, clave .p8, Team ID y Key ID) y las variables `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` y, si Apple pide verificar el dominio, `APPLE_DOMAIN_ASSOCIATION`. Todo se hace con `powershell -ExecutionPolicy Bypass -File .\activar-logins.ps1`.

## Primera vez con imágenes
Las fotos las lee Mistral Small, que no pide licencia (probado: describió bien una imagen).

## Qué está probado y qué no
- ✅ 53 pruebas automáticas del servidor (`node test\worker-check.mjs`): cuentas, sesiones, aislamiento entre usuarios, catálogo de modelos, peso en el límite, respaldo si un modelo falla, imágenes, documentos, borrar y exportar datos.
- ✅ Probado en Cloudflare real el 20/11/2026 (cuenta temporal): página, invitado, D1, chat con streaming, imágenes y catálogo. ⚠️ Sin probar con inicios de sesión reales de Google y Apple (necesitan tus claves).
- Prueba real: `node test\live-check.mjs https://TU-URL.workers.dev`
- ⚠️ No tiene las herramientas del PC (abrir programas, controlar ventanas, ADB). Eso solo existe en Dot, en tu PC.

## Probar la interfaz en tu PC antes de subir (sin cuenta)
`node test\dev-server.mjs` → http://localhost:8787 (la IA responde de mentira).

## Actualizar después
Si cambias la interfaz de `D:\dot-agent\public`, ejecuta `node build.mjs` y vuelve a `npx wrangler deploy`.
