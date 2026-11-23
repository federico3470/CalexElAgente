# Lista de verificación: todo cambio llega a todas las plataformas

Antes de publicar una versión, confirmar cada punto.

## Interfaz web compartida (D:\dot-agent\public → build.mjs → D:\dot-cloudflare\public)
- [ ] Funciona en celular (`body` normal), TV (`body.tv`), asistente (`body.assist`) y modo coche (`?auto=1`).
- [ ] Presentaciones iOS, Material You Expressive, Atelier y Clásica: cada una tiene su capa para TV en `tvskins.js`.
- [ ] Todo archivo nuevo de la interfaz está en la lista de `build.mjs` y en el `<script>` de `index.html`.
- [ ] Probado en el navegador a tamaño de celular y de TV (`?tv=1`, 1280x720).

## Apps nativas
- [ ] `apps\android` (celular, Calex Auto): versión, Java, manifiesto.
- [ ] `apps\androidtv` (Google TV y Android TV): misma versión; los cambios de voz, TTS y puente `CalexNative` se portan también aquí.
- [ ] `apps\windows\Calex.cs` (exe): versión.
- [ ] iPhone: `Calex-iPhone.mobileconfig` (carga la web).

## Publicación
- [ ] Prueba de funcionamiento del worker (`node test/worker-check.mjs`).
- [ ] Notas de la release: novedades, no correcciones.
- [ ] Archivos: celular, GTV, ATV, exe, Calex Auto, iPhone, SHA256SUMS.
