# Calex 1.5

Un asistente que se siente como el del sistema: **panel flotante de vidrio líquido, voz que sí te escucha y sin límites de uso.**

## Descargas

| Para | Archivo | Qué es |
|---|---|---|
| 📱 **Celular y tableta** (Android 6+) | `Calex-1.5.apk` | App completa. Se puede elegir como **asistente digital** del teléfono. |
| 📺 **Google TV** | `Calex-1.5v-GTV.apk` | Hecha para el control remoto, con vinculación por código. |
| 📺 **Android TV** | `Calex-1.5v-ATV.apk` | La misma app de TV, con otro nombre para encontrarla fácil. |
| 🖥️ **Windows 10/11** | `Calex-1.5.exe` | Se abre como una aplicación. `Calex.exe --voz` abre directo el panel de voz. |
| 🚗 **Calex Auto** (Android) | `Calex-Auto-1.5.apk` | Modo coche: letras enormes, barras que reaccionan a tu voz y controles de música. |
| 🍎 **iPhone** | `Calex-iPhone.mobileconfig` | Perfil que agrega Calex a tu pantalla de inicio, a pantalla completa. Guía en `calex.federicoreta773.workers.dev/iphone` |

## Novedades

**Panel de asistente tipo Gemini**
- Al llamar al asistente (botón lateral, pulsación larga de inicio) ya no se abre la app: aparece un **panel flotante abajo**, ancho, de **vidrio líquido multicolor** que desenfoca lo que hay detrás.
- **Barras de colores animadas** que se mueven con tu voz (nivel real del micrófono), cuando Calex piensa y cuando habla. Tocá las barras para interrumpirlo.
- Campo de texto para escribir y botón ⤢ para abrir la app completa. Si no iniciaste sesión, abre la app para que entres.

**El modo de voz ahora te escucha**
- En el celular se usa solo el reconocedor de Android (antes la página abría el micrófono a la vez y lo dejaba sordo).
- Ves lo que entiende **mientras hablás** y el micrófono se pausa mientras Calex habla (antes se oía a sí mismo).
- Errores del reconocedor mejor manejados (ocupado, red, permisos) y reinicio limpio.

**Sin límites**
- Se quitó el límite diario por persona y el aviso de cupo. Los mensajes pueden tener hasta 24.000 caracteres.
- Importante: la IA gratuita de Cloudflare tiene su propio tope diario de 10.000 neuronas. Si se agota, Calex sigue con los modelos de respaldo; para uso realmente ilimitado hace falta Workers Paid u OpenRouter.

## Sobre iPhone y el auto
- **iPhone:** Apple solo deja instalar apps fuera de la App Store con una cuenta de desarrollador de pago, así que se instala como app web (Web Clip). No puede reemplazar a Siri.
- **Android Auto** solo acepta Google Assistant y apps aprobadas por Google. Con Bluetooth, el botón del volante llama al asistente predeterminado del teléfono: si elegiste Calex, abre Calex.

## Cómo elegir Calex como asistente
**Ajustes → Aplicaciones → Aplicaciones predeterminadas → App de asistente digital → Calex**

Verificá las descargas con `SHA256SUMS.txt`.
