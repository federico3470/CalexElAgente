# Calex 2.4 · Voz sin repeticiones

Corrige un fallo del modo de voz: lo que usted decía llegaba repetido muchas veces («hola hola hola…»).

## Descargas

| Para | Archivo |
|---|---|
| Celular y tableta (Android 6 o superior) | `Calex-2.4.apk` |
| Google TV | `Calex-2.4v-GTV.apk` |
| Android TV | `Calex-2.4v-ATV.apk` (la misma aplicación que la de Google TV) |
| Windows 10 y 11 | `Calex-2.4.exe` (`Calex.exe --voz` abre el panel de voz) |
| Calex Auto (Android) | `Calex-Auto-2.4.apk` |
| iPhone | `Calex-iPhone.mobileconfig` (guía en `calex.federicoreta773.workers.dev/iphone`) |

## Correcciones

- El reconocedor de Android podía devolver el mismo resultado varias veces al reiniciarse y la aplicación lo sumaba como si usted lo hubiera dicho de nuevo. Ahora se ignoran los resultados repetidos que no vienen acompañados de voz nueva, tanto en la aplicación como en la página.
- Nunca se inicia más de una escucha a la vez, lo que evitaba resultados duplicados por escuchas superpuestas.
- Las frases consecutivas se unen sin repetir lo ya dicho.
- El reinicio de la escucha espera un instante más, para no recibir el eco del resultado anterior.

Se mantiene todo lo anterior: asistente con el logo de gelatina, presentación iOS, Atelier y Clásica, funciones, moderación y movimiento estilo iOS.

Verifique las descargas con `SHA256SUMS.txt`.
