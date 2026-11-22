# Calex 1.6

Una versión centrada en la elegancia: colores formales, cien diseños de interfaz, un asistente digital estilo Siri y una voz propia.

## Descargas

| Para | Archivo | Descripción |
|---|---|---|
| Celular y tableta (Android 6 o superior) | `Calex-1.6.apk` | Aplicación completa. Puede elegirse como asistente digital del teléfono. |
| Google TV | `Calex-1.6v-GTV.apk` | Para el control remoto, con vinculación por código. |
| Android TV | `Calex-1.6v-ATV.apk` | La misma aplicación de TV, con otro nombre para encontrarla fácilmente. |
| Windows 10 y 11 | `Calex-1.6.exe` | Se abre como una aplicación. `Calex.exe --voz` abre directamente el panel de voz. |
| Calex Auto (Android) | `Calex-Auto-1.6.apk` | Modo coche: texto grande, barras que reaccionan a la voz y controles de música. |
| iPhone | `Calex-iPhone.mobileconfig` | Perfil que agrega Calex a la pantalla de inicio, a pantalla completa. Guía en `calex.federicoreta773.workers.dev/iphone`. |

Las dos versiones de TV son la misma aplicación publicada con dos nombres.

## Novedades

**Asistente digital estilo Siri**
- Al invocar al asistente, un brillo continuo recorre los bordes de la pantalla y una cápsula superior muestra la esfera animada, el estado, la respuesta y las barras de voz, que reaccionan a la voz real.
- En Ajustes puede alternarse con el panel de cristal inferior.
- Campo para escribir, sugerencias rápidas y botón para abrir la aplicación completa.

**Voz propia y más confiable**
- Calex habla con el sintetizador del teléfono (voz en español rioplatense cuando está disponible) y avisa con exactitud cuándo termina, para no escucharse a sí mismo.
- Corrige un fallo grave: al elegir Calex como asistente, Android lo usaba como reconocedor de todo el sistema. Ahora reenvía al reconocedor de Google, por lo que el dictado de otras aplicaciones sigue funcionando y Calex sí escucha.
- Se muestra lo que entiende mientras usted habla y el estado real del micrófono, con un aviso claro si el reconocedor no responde.

**Interfaz**
- Colores formales por defecto: azul marino, o marfil y azul en modo claro. Ocho temas formales nuevos (grafito, burdeos, verde inglés, carbón y oro viejo, pizarra, perla).
- Fondos animados sobrios, derivados del color de acento.
- Cien diseños de forma y material (vidrio líquido, esmerilado, editorial, cápsulas, aurora y otros) en Ajustes, combinables con cualquier tema.
- Se retiraron los emojis; los íconos son de línea y algunos están animados.
- Movimiento estilo iOS (curvas de resorte, hojas, pulsaciones) calculado por tiempo, por lo que se ve igual a 48, 50, 60, 90, 120 y 144 Hz. La calidad se adapta si el equipo no alcanza la fluidez.

**Funciones**
- Nuevo botón Funciones con más de 130 plantillas en 14 categorías (correspondencia, estudio, trabajo, finanzas, hogar, salud, viajes, tecnología, creatividad, familia, fe y reflexión, productividad y más), con búsqueda en vivo.

**Uso responsable**
- Calex responde con naturalidad a las consultas legítimas, pero no ayuda a causar daño. Si detecta un uso malicioso, lo advierte; ante un uso grave o reiterado, la sesión queda bloqueada hasta que el administrador la reactive.
- Protección silenciosa contra el uso automatizado excesivo (40 mensajes por minuto).
- Sin límite diario de mensajes ni aviso de cupos. La inteligencia artificial gratuita de Cloudflare conserva su propio tope diario; si se agota, Calex continúa con modelos de respaldo.

## Notas
- iPhone: Apple solo permite instalar aplicaciones fuera de la App Store con una cuenta de desarrollador de pago, por lo que Calex se instala como aplicación web. No puede reemplazar a Siri.
- Android Auto solo admite Google Assistant y aplicaciones aprobadas por Google. Con Bluetooth, el botón del volante invoca al asistente predeterminado del teléfono.
- La frase de activación «Ok Google» no puede reemplazarse.

Elegir Calex como asistente: Ajustes, Aplicaciones, Aplicaciones predeterminadas, App de asistente digital, Calex.

Verifique las descargas con `SHA256SUMS.txt`.
