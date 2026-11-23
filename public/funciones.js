/* Calex - catalogo de funciones y panel. Sin dependencias. */
(function () {
  'use strict';

  var CATS = {
    escritura: 'Escritura y correspondencia',
    idiomas: 'Traducción e idiomas',
    estudio: 'Estudio y educación',
    trabajo: 'Trabajo y negocios',
    finanzas: 'Finanzas personales',
    hogar: 'Hogar y cocina',
    salud: 'Salud y bienestar',
    viajes: 'Viajes',
    tecnologia: 'Tecnología y programación',
    creatividad: 'Creatividad',
    familia: 'Vida familiar',
    fe: 'Fe y reflexión',
    productividad: 'Productividad',
    analisis: 'Análisis de documentos e imágenes'
  };

  var AVISO_SALUD = ' Incluir al final un aviso claro de que esta información es orientativa y no sustituye la consulta con un profesional de la salud.';

  /* [titulo, descripcion, prompt, enviarDirecto] */
  var DATA = {
    escritura: [
      ['Carta formal', 'Redactar una carta formal y cortés.', 'Redactar una carta formal dirigida a {destinatario} sobre {asunto}. Tono respetuoso, claro y bien estructurado.'],
      ['Correo profesional', 'Escribir un correo electrónico profesional.', 'Redactar un correo electrónico profesional para {destinatario} con el siguiente propósito: {propósito}. Incluir asunto sugerido.'],
      ['Reclamo cordial', 'Presentar un reclamo firme y respetuoso.', 'Redactar un reclamo formal a {empresa} por {problema}. Mantener un tono cordial pero firme y solicitar {solución}.'],
      ['Carta de recomendación', 'Elaborar una carta de recomendación.', 'Redactar una carta de recomendación para {persona}, quien se desempeñó como {rol}. Destacar estas cualidades: {cualidades}.'],
      ['Mensaje de agradecimiento', 'Expresar gratitud con calidez y elegancia.', 'Redactar un mensaje de agradecimiento a {persona} por {motivo}. Tono sincero y sobrio.'],
      ['Mensaje de condolencias', 'Acompañar con palabras de consuelo.', 'Redactar un mensaje de condolencias para {persona} por el fallecimiento de {allegado}. Que sea respetuoso, breve y consolador.'],
      ['Invitación formal', 'Crear una invitación para un evento.', 'Redactar una invitación formal para {evento} que se realizará el {fecha} en {lugar}. Incluir confirmación de asistencia.'],
      ['Discurso breve', 'Preparar unas palabras para una ocasión.', 'Redactar un discurso de {duración} minutos para {ocasión}, dirigido a {público}. Tono cálido y ordenado.'],
      ['Corregir ortografía y estilo', 'Revisar un texto y proponer mejoras.', 'Corregir la ortografía, la gramática y el estilo del siguiente texto, y explicar brevemente los cambios principales:\n\n{texto}'],
      ['Reescribir con otro tono', 'Cambiar el tono de un texto.', 'Reescribir el siguiente texto con un tono {tono} sin alterar su significado:\n\n{texto}']
    ],
    idiomas: [
      ['Traducir un texto', 'Traducir con fidelidad y naturalidad.', 'Traducir al {idioma} el siguiente texto, conservando el sentido y el registro:\n\n{texto}'],
      ['Traducción con matices', 'Explicar alternativas de traducción.', 'Traducir al {idioma} la siguiente frase y ofrecer dos alternativas con una nota sobre los matices de cada una:\n\n{frase}'],
      ['Practicar conversación', 'Simular un diálogo para practicar.', 'Actuar como interlocutor para practicar {idioma} en nivel {nivel}. Tema: {tema}. Corregir mis errores al final de cada intervención.'],
      ['Explicar gramática', 'Aclarar una regla gramatical.', 'Explicar con ejemplos claros la regla gramatical de {regla} en {idioma}, y proponer tres ejercicios breves.'],
      ['Vocabulario temático', 'Armar una lista de palabras útiles.', 'Preparar una lista de 20 palabras y expresiones de {idioma} sobre {tema}, con traducción y una frase de ejemplo.'],
      ['Diferencias entre palabras', 'Distinguir términos parecidos.', 'Explicar la diferencia entre {palabra1} y {palabra2} en {idioma}, con ejemplos de uso.'],
      ['Plan de estudio de un idioma', 'Organizar el aprendizaje semana a semana.', 'Diseñar un plan de estudio de {semanas} semanas para aprender {idioma}, con {minutos} minutos diarios, partiendo de nivel {nivel}.'],
      ['Corregir un texto en otro idioma', 'Revisar redacción en un idioma extranjero.', 'Corregir el siguiente texto escrito en {idioma}, señalar los errores y explicar cada corrección:\n\n{texto}'],
      ['Expresiones idiomáticas', 'Conocer modismos y su equivalente.', 'Explicar el significado de la expresión {expresión} y ofrecer equivalentes en {idioma}.']
    ],
    estudio: [
      ['Explicar un tema', 'Explicación clara y graduada.', 'Explicar {tema} de forma sencilla, como para un estudiante de {nivel}, con ejemplos cotidianos.'],
      ['Resumen de un texto', 'Sintetizar lo esencial.', 'Resumir el siguiente texto en {cantidad} puntos principales:\n\n{texto}'],
      ['Preguntas de examen', 'Generar un cuestionario de práctica.', 'Elaborar {cantidad} preguntas de práctica sobre {tema}, con las respuestas correctas al final.'],
      ['Plan de estudio', 'Organizar la preparación de un examen.', 'Armar un plan de estudio para preparar {materia} en {días} días, con {horas} horas diarias disponibles.'],
      ['Fichas de memoria', 'Crear tarjetas pregunta y respuesta.', 'Crear {cantidad} fichas de estudio (pregunta y respuesta) sobre {tema}.'],
      ['Resolver paso a paso', 'Resolver un problema explicando cada paso.', 'Resolver paso a paso el siguiente problema y explicar el razonamiento:\n\n{problema}'],
      ['Esquema de un capítulo', 'Estructurar contenidos en un esquema.', 'Elaborar un esquema jerárquico del tema {tema} con ideas principales y secundarias.'],
      ['Ayuda con una redacción escolar', 'Orientar la redacción de un trabajo.', 'Orientar la redacción de un trabajo sobre {tema} para {nivel}: sugerir estructura, ideas por apartado y una introducción de ejemplo.'],
      ['Línea de tiempo histórica', 'Ordenar hechos cronológicamente.', 'Elaborar una línea de tiempo con los hechos más importantes de {tema}.'],
      ['Explicar con una analogía', 'Comprender mediante comparaciones.', 'Explicar {concepto} mediante una analogía fácil de recordar.']
    ],
    trabajo: [
      ['Currículum vitae', 'Redactar o mejorar un currículum.', 'Elaborar un currículum profesional para el puesto de {puesto}, con base en esta experiencia: {experiencia}.'],
      ['Carta de presentación', 'Acompañar una postulación.', 'Redactar una carta de presentación para postularme al puesto de {puesto} en {empresa}, destacando: {fortalezas}.'],
      ['Preparar una entrevista', 'Practicar preguntas frecuentes.', 'Simular una entrevista de trabajo para el puesto de {puesto}. Formular las preguntas una por una y evaluar mis respuestas.'],
      ['Plan de negocio', 'Estructurar una idea de negocio.', 'Elaborar un esquema de plan de negocio para {idea}, con público objetivo, propuesta de valor, costos y primeros pasos.'],
      ['Propuesta comercial', 'Presentar una oferta profesional.', 'Redactar una propuesta comercial para {cliente} ofreciendo {servicio}, con alcance, plazos y condiciones.'],
      ['Acta de reunión', 'Ordenar las notas de una reunión.', 'Convertir las siguientes notas en un acta de reunión formal con acuerdos y responsables:\n\n{notas}'],
      ['Agenda de reunión', 'Planificar una reunión eficaz.', 'Preparar una agenda para una reunión de {duración} minutos sobre {tema}, con objetivos y tiempos por punto.'],
      ['Respuesta a un cliente difícil', 'Responder con profesionalismo.', 'Redactar una respuesta profesional y empática al siguiente mensaje de un cliente molesto:\n\n{mensaje}'],
      ['Análisis FODA', 'Evaluar fortalezas y debilidades.', 'Realizar un análisis FODA para {proyecto} y proponer tres acciones prioritarias.'],
      ['Presentación en diapositivas', 'Estructurar una presentación.', 'Proponer la estructura de una presentación de {cantidad} diapositivas sobre {tema}, con título y puntos clave de cada una.']
    ],
    finanzas: [
      ['Presupuesto mensual', 'Organizar ingresos y gastos.', 'Armar un presupuesto mensual con ingresos de {ingresos} y estos gastos fijos: {gastos}. Proponer una distribución razonable y margen de ahorro.'],
      ['Reducir gastos', 'Detectar ahorros posibles.', 'Analizar la siguiente lista de gastos y sugerir dónde reducir sin afectar lo esencial:\n\n{gastos}'],
      ['Plan para saldar deudas', 'Ordenar el pago de deudas.', 'Proponer un plan ordenado para saldar estas deudas, priorizando según tasa y monto:\n\n{deudas}'],
      ['Fondo de emergencia', 'Calcular y planificar un fondo.', 'Explicar cuánto conviene reservar como fondo de emergencia con gastos mensuales de {gastos} y proponer un plan para alcanzarlo en {meses} meses.'],
      ['Meta de ahorro', 'Planificar un objetivo concreto.', 'Planificar cómo ahorrar {monto} para {meta} en {plazo}, con aportes periódicos sugeridos.'],
      ['Comparar dos opciones de compra', 'Decidir con criterio.', 'Comparar con ventajas y desventajas las opciones {opción1} y {opción2} considerando el costo total y mi situación: {situación}.'],
      ['Entender un concepto financiero', 'Explicación sencilla de términos.', 'Explicar de forma sencilla qué es {concepto} y cómo afecta a las finanzas de una familia.'],
      ['Lista de control para fin de mes', 'Revisar cuentas con orden.', 'Elaborar una lista de control para revisar las finanzas del hogar al cierre de cada mes.', true],
      ['Diezmos y ofrendas en el presupuesto', 'Incorporar el dar de forma ordenada.', 'Incorporar en un presupuesto mensual de {ingresos} el diezmo y las ofrendas con orden, junto con los demás gastos: {gastos}.']
    ],
    hogar: [
      ['Menú semanal', 'Planificar comidas de la semana.', 'Armar un menú semanal para {personas} personas, con presupuesto {presupuesto}, considerando: {restricciones}. Incluir lista de compras.'],
      ['Receta con lo que hay', 'Cocinar con ingredientes disponibles.', 'Proponer tres recetas posibles con estos ingredientes: {ingredientes}. Indicar pasos y tiempos.'],
      ['Adaptar una receta', 'Modificar según necesidades.', 'Adaptar la receta de {plato} para que sea {adaptación}, con las cantidades para {personas} personas.'],
      ['Lista de compras', 'Ordenar las compras por sección.', 'Preparar una lista de compras ordenada por secciones del supermercado para: {platos}.'],
      ['Plan de limpieza', 'Repartir tareas del hogar.', 'Diseñar un plan semanal de limpieza y orden para una casa de {ambientes} ambientes, repartiendo tareas entre {personas} personas.'],
      ['Organizar un espacio', 'Ordenar con método.', 'Proponer un método para ordenar {espacio}, con pasos concretos y criterios para decidir qué conservar.'],
      ['Solución a un problema doméstico', 'Orientar ante una avería o mancha.', 'Indicar cómo resolver el siguiente problema doméstico paso a paso y con precauciones: {problema}.'],
      ['Cuidado de plantas', 'Mantener el jardín o las macetas.', 'Explicar los cuidados de {planta}: riego, luz, sustrato y problemas frecuentes.'],
      ['Conservar alimentos', 'Evitar el desperdicio.', 'Explicar cómo conservar {alimento} y por cuánto tiempo, y qué hacer para aprovecharlo.'],
      ['Ideas de cena para hoy', 'Sugerencias rápidas y sencillas.', 'Sugerir cinco ideas de cena sencillas, económicas y rápidas para esta noche.', true]
    ],
    salud: [
      ['Rutina de ejercicio', 'Plan de actividad física adaptable.', 'Proponer una rutina de ejercicio de {minutos} minutos, {días} días por semana, para una persona con nivel {nivel} y estas limitaciones: {limitaciones}.' + AVISO_SALUD],
      ['Hábitos de sueño', 'Mejorar el descanso.', 'Sugerir hábitos prácticos para mejorar el sueño de una persona que {situación}.' + AVISO_SALUD],
      ['Alimentación equilibrada', 'Orientación general de comidas.', 'Explicar los principios de una alimentación equilibrada y proponer un día de comidas de ejemplo para {perfil}.' + AVISO_SALUD],
      ['Manejo del estrés', 'Técnicas sencillas de calma.', 'Presentar cinco técnicas sencillas para manejar el estrés cotidiano y cómo aplicarlas en {situación}.' + AVISO_SALUD],
      ['Preparar una consulta médica', 'Ordenar preguntas y datos.', 'Ayudar a preparar una consulta médica: listar los datos que conviene llevar y preguntas útiles para el profesional, sobre {motivo}.' + AVISO_SALUD],
      ['Entender un término médico', 'Explicación en lenguaje claro.', 'Explicar en lenguaje claro qué significa {término} y qué preguntas conviene hacer al médico.' + AVISO_SALUD],
      ['Pausas activas', 'Movimiento durante la jornada.', 'Proponer una serie de pausas activas de cinco minutos para una persona que pasa {horas} horas sentada por día.' + AVISO_SALUD],
      ['Hidratación y hábitos diarios', 'Rutina saludable cotidiana.', 'Armar una rutina diaria de hábitos saludables simples para {perfil}.' + AVISO_SALUD],
      ['Botiquín del hogar', 'Qué tener a mano.', 'Elaborar una lista de elementos básicos para un botiquín del hogar y cómo mantenerlo ordenado.' + AVISO_SALUD, true]
    ],
    viajes: [
      ['Itinerario de viaje', 'Planificar días y recorridos.', 'Armar un itinerario de {días} días en {destino} para {personas}, con presupuesto {presupuesto} e intereses en {intereses}.'],
      ['Lista de equipaje', 'No olvidar nada.', 'Preparar una lista de equipaje para un viaje de {días} días a {destino} en {época}.'],
      ['Presupuesto de viaje', 'Estimar costos.', 'Estimar un presupuesto de viaje a {destino} por {días} días, desglosando transporte, alojamiento, comidas y actividades.'],
      ['Frases útiles para viajar', 'Comunicarse en destino.', 'Preparar frases útiles en {idioma} para viajar a {destino}, con pronunciación aproximada.'],
      ['Qué ver en un día', 'Aprovechar una jornada.', 'Proponer un recorrido de un día en {ciudad} con horarios, traslados y pausas para comer.'],
      ['Costumbres y etiqueta locales', 'Viajar con respeto.', 'Explicar las costumbres, normas de cortesía y advertencias prácticas para visitar {destino}.'],
      ['Viaje con niños', 'Planificar en familia.', 'Sugerir un plan de viaje a {destino} con niños de {edades} años, con actividades y recomendaciones de descanso.'],
      ['Documentos y trámites', 'Verificar requisitos.', 'Listar los documentos y trámites que suele requerir un viaje de {origen} a {destino}, indicando que debo verificar la información oficial vigente.'],
      ['Plan B ante imprevistos', 'Prever contratiempos.', 'Preparar una guía de acciones ante imprevistos durante un viaje: pérdida de documentos, demoras y problemas de salud.', true]
    ],
    tecnologia: [
      ['Explicar código', 'Comprender un fragmento.', 'Explicar línea por línea qué hace el siguiente código y señalar posibles mejoras:\n\n{código}'],
      ['Depurar un error', 'Encontrar la causa de un fallo.', 'Ayudar a depurar el siguiente error. Describir las causas probables y la solución paso a paso.\n\nError: {error}\n\nCódigo: {código}'],
      ['Escribir una función', 'Generar código para una necesidad.', 'Escribir en {lenguaje} una función que {objetivo}, con comentarios y ejemplos de uso.'],
      ['Revisión de código', 'Detectar problemas y riesgos.', 'Revisar el siguiente código en busca de errores, problemas de seguridad y oportunidades de simplificación:\n\n{código}'],
      ['Consulta SQL', 'Construir o explicar una consulta.', 'Escribir una consulta SQL que {objetivo}, con el siguiente esquema de tablas: {esquema}.'],
      ['Expresión regular', 'Crear y explicar una regex.', 'Crear una expresión regular que {objetivo} y explicar cada parte con ejemplos.'],
      ['Configurar un dispositivo', 'Guía para resolver un ajuste.', 'Explicar paso a paso cómo {tarea} en {dispositivo}.'],
      ['Seguridad digital básica', 'Proteger cuentas y datos.', 'Elaborar una guía sencilla de seguridad digital para una familia: contraseñas, copias de respaldo y estafas frecuentes.', true],
      ['Comparar tecnologías', 'Elegir con fundamento.', 'Comparar {opción1} y {opción2} para {uso}, con ventajas, desventajas y una recomendación.'],
      ['Automatizar una tarea', 'Ahorrar trabajo repetitivo.', 'Proponer cómo automatizar la siguiente tarea repetitiva y, si corresponde, escribir un guion de ejemplo: {tarea}.']
    ],
    creatividad: [
      ['Cuento breve', 'Inventar un relato.', 'Escribir un cuento breve sobre {tema} con personajes {personajes} y un final {final}.'],
      ['Poema', 'Componer versos con un tema.', 'Componer un poema de estilo {estilo} sobre {tema}.'],
      ['Nombre para un proyecto', 'Lluvia de ideas de nombres.', 'Proponer diez nombres originales para {proyecto}, con una breve justificación de cada uno.'],
      ['Ideas de regalo', 'Elegir con acierto.', 'Sugerir diez ideas de regalo para {persona} con presupuesto de {presupuesto}, considerando sus gustos: {gustos}.'],
      ['Letra de canción', 'Escribir una canción original.', 'Escribir la letra de una canción de estilo {estilo} sobre {tema}, con estrofas y estribillo.'],
      ['Guion para un video', 'Estructurar un breve guion.', 'Escribir un guion de {duración} minutos para un video sobre {tema}, con escenas y texto de locución.'],
      ['Juego o acertijo', 'Entretener con ingenio.', 'Inventar cinco acertijos con sus soluciones, de dificultad {nivel}.'],
      ['Ideas para un proyecto manual', 'Manualidades y bricolaje.', 'Proponer ideas de manualidades con {materiales}, con instrucciones simples para {edad}.'],
      ['Descripción de un personaje', 'Construir personajes sólidos.', 'Crear la ficha de un personaje de ficción: nombre, historia, carácter, virtudes y conflictos, ambientado en {época}.'],
      ['Ideas para una celebración', 'Organizar un festejo sobrio y alegre.', 'Proponer ideas para organizar {celebración} con {personas} invitados, presupuesto {presupuesto} y un ambiente {ambiente}.']
    ],
    familia: [
      ['Actividades con niños', 'Ideas para compartir tiempo.', 'Sugerir diez actividades para hacer con niños de {edades} años en {lugar}, con pocos materiales.'],
      ['Cuento para dormir', 'Relato breve y tranquilo.', 'Escribir un cuento para dormir dirigido a un niño de {edad} años llamado {nombre}, con una enseñanza sobre {valor}.'],
      ['Conversación difícil con un hijo', 'Orientación para dialogar.', 'Orientar cómo conversar con un hijo de {edad} años sobre {tema}, con frases sugeridas y errores que evitar.'],
      ['Tareas del hogar por edades', 'Repartir responsabilidades.', 'Proponer un reparto de tareas del hogar adecuado a las edades de {integrantes}.'],
      ['Rutina familiar', 'Ordenar la semana.', 'Armar una rutina semanal para una familia con {integrantes}, contemplando horarios de {actividades}.'],
      ['Celebración de cumpleaños', 'Planificar un festejo.', 'Planificar un cumpleaños para {edad} años con {invitados} invitados, presupuesto {presupuesto}, con juegos y menú.'],
      ['Tiempo en pareja', 'Cuidar el matrimonio.', 'Sugerir ideas para fortalecer la relación matrimonial con poco presupuesto, considerando {situación}.'],
      ['Cuidado de adultos mayores', 'Acompañar con dignidad.', 'Ofrecer recomendaciones para acompañar a un familiar mayor que {situación}, con ideas de organización y cuidados cotidianos.'],
      ['Uso sano de pantallas', 'Acuerdos familiares.', 'Proponer acuerdos familiares para el uso de pantallas en niños de {edades} años.'],
      ['Carta para un hijo', 'Expresar cariño y consejo.', 'Redactar una carta afectuosa para mi hijo {nombre} con motivo de {ocasión}, con palabras de ánimo y consejo.']
    ],
    fe: [
      ['Devocional del día', 'Una meditación breve.', 'Preparar un devocional breve basado en {pasaje}, con lectura, reflexión y aplicación práctica.'],
      ['Estudio bíblico', 'Guía de estudio de un pasaje.', 'Elaborar un estudio bíblico sobre {pasaje} con contexto histórico, ideas principales, preguntas para discusión y aplicación.'],
      ['Oración guiada', 'Orar con orden y sencillez.', 'Redactar una oración respetuosa y sencilla por {motivo}, conforme a la tradición cristiana evangélica.'],
      ['Reflexión sobre un tema', 'Meditar desde la Escritura.', 'Escribir una reflexión cristiana sobre {tema}, apoyada en pasajes bíblicos, con tono sobrio y esperanzador.'],
      ['Versículos para una situación', 'Palabra para cada momento.', 'Sugerir versículos bíblicos para acompañar a una persona que atraviesa {situación}, con una breve explicación de cada uno.'],
      ['Bosquejo de un mensaje', 'Estructurar una predicación.', 'Elaborar el bosquejo de un mensaje de {minutos} minutos sobre {pasaje}, con introducción, puntos, ilustraciones y conclusión.'],
      ['Clase para escuela dominical', 'Enseñar a los niños.', 'Preparar una clase de escuela dominical para niños de {edades} años sobre {pasaje}, con actividad y versículo para memorizar.'],
      ['Plan de lectura bíblica', 'Leer la Biblia con constancia.', 'Diseñar un plan de lectura bíblica de {días} días que recorra {libros}, con lecturas breves y diarias.'],
      ['Explicar un pasaje difícil', 'Comprender con fidelidad al texto.', 'Explicar el pasaje {pasaje} atendiendo a su contexto, a las interpretaciones principales y a su aplicación actual.'],
      ['Diario de gratitud', 'Agradecer con intención.', 'Proponer una guía de diario de gratitud semanal con preguntas y versículos de apoyo.', true],
      ['Mensaje de ánimo cristiano', 'Fortalecer a un hermano.', 'Redactar un mensaje de ánimo y aliento para {persona}, que está pasando por {situación}, con una cita bíblica adecuada.']
    ],
    productividad: [
      ['Plan del día', 'Ordenar prioridades.', 'Organizar mi día con estas tareas y horarios disponibles, priorizando lo importante:\n\n{tareas}'],
      ['Dividir un proyecto', 'Pasos concretos.', 'Dividir el proyecto {proyecto} en etapas y tareas concretas, con plazos estimados y primer paso inmediato.'],
      ['Matriz de prioridades', 'Distinguir urgente de importante.', 'Clasificar las siguientes tareas según urgencia e importancia y sugerir el orden de ejecución:\n\n{tareas}'],
      ['Hábito nuevo', 'Incorporar una costumbre.', 'Diseñar un plan de cuatro semanas para incorporar el hábito de {hábito}, con pasos pequeños y seguimiento.'],
      ['Revisión semanal', 'Cerrar y planificar la semana.', 'Guiarme en una revisión semanal con preguntas sobre logros, pendientes y prioridades de la próxima semana.', true],
      ['Recordatorios y fechas', 'Organizar compromisos.', 'Ordenar cronológicamente los siguientes compromisos y señalar posibles conflictos:\n\n{compromisos}'],
      ['Decidir entre opciones', 'Tomar decisiones con criterio.', 'Ayudar a decidir entre {opción1} y {opción2} con una lista de criterios, ponderación y una recomendación.'],
      ['Superar la postergación', 'Empezar lo que se demora.', 'Proponer estrategias concretas para comenzar la tarea {tarea}, que vengo postergando.'],
      ['Lista de verificación', 'Crear una lista para una actividad.', 'Elaborar una lista de verificación completa para {actividad}.'],
      ['Preparar una mudanza', 'Organizar una mudanza.', 'Armar un cronograma de mudanza con {semanas} semanas de anticipación, con tareas por semana.']
    ],
    analisis: [
      ['Resumir un documento', 'Obtener lo esencial.', 'Resumir el siguiente documento, destacando puntos clave, fechas, montos y compromisos:\n\n{documento}'],
      ['Extraer datos', 'Ordenar información en una tabla.', 'Extraer del siguiente texto los datos relevantes y presentarlos en una tabla:\n\n{texto}'],
      ['Revisar un contrato', 'Detectar cláusulas importantes.', 'Revisar el siguiente contrato, señalar las cláusulas relevantes o riesgosas y las preguntas que convendría consultar con un abogado (no sustituye asesoramiento legal):\n\n{contrato}'],
      ['Explicar una factura', 'Comprender cargos y conceptos.', 'Explicar los conceptos y cargos de esta factura e indicar si algo parece inusual:\n\n{factura}'],
      ['Describir una imagen', 'Describir lo que se observa.', 'Describir con detalle la imagen adjunta, señalando elementos principales, texto visible y contexto.'],
      ['Leer el texto de una imagen', 'Transcribir texto visible.', 'Transcribir el texto que aparece en la imagen adjunta y ordenarlo con claridad.', true],
      ['Interpretar un gráfico', 'Entender datos visuales.', 'Interpretar el gráfico adjunto: explicar qué muestra, tendencias y conclusiones principales.', true],
      ['Comparar dos textos', 'Encontrar diferencias.', 'Comparar los siguientes dos textos y señalar coincidencias, diferencias y cambios importantes.\n\nTexto A:\n{textoA}\n\nTexto B:\n{textoB}'],
      ['Analizar un argumento', 'Evaluar la solidez de un razonamiento.', 'Analizar el siguiente argumento: identificar premisas, conclusión, posibles falacias y puntos débiles:\n\n{argumento}'],
      ['Resumen de un artículo con fuentes', 'Síntesis crítica.', 'Resumir el siguiente artículo, distinguir hechos de opiniones y señalar qué afirmaciones convendría verificar:\n\n{artículo}']
    ]
  };

  function slug(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  var FUNCS = [];
  Object.keys(DATA).forEach(function (cat) {
    DATA[cat].forEach(function (r) {
      FUNCS.push({
        id: cat + '-' + slug(r[0]),
        cat: cat,
        title: r[0],
        desc: r[1],
        prompt: r[2],
        send: r[3] === true && !/\{[^}]+\}/.test(r[2])
      });
    });
  });

  window.CALEX_FUNCS = FUNCS;
  window.CALEX_CATS = CATS;

  window.funcionesAlAzar = function (n) {
    var a = FUNCS.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, Math.max(0, n | 0));
  };

  /* ------------------------------ Panel ------------------------------ */
  if (typeof document === 'undefined') return;

  var ICONS = {
    escritura: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
    idiomas: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    estudio: '<path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11.5V16c0 1.5 2.5 3 5 3s5-1.500 5-3v-4.500"/>',
    trabajo: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
    finanzas: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.500"/><path d="M6 9v.01M18 15v.01"/>',
    hogar: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    salud: '<path d="M12 20s-7-4.500-7-10a4 4 0 017-2.500A4 4 0 0119 10c0 5.500-7 10-7 10z"/>',
    viajes: '<path d="M3 11l18-7-7 18-2.500-7.500L3 11z"/>',
    tecnologia: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.500 5l-3 14"/>',
    creatividad: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800L12 3z"/><path d="M19 17v4M17 19h4"/>',
    familia: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="10" r="2.500"/><path d="M2.500 20c0-3.500 2.500-6 5.500-6s5.500 2.500 5.500 6M14 20c0-2.500 1.500-4.500 3.500-4.500S21 17.500 21 20"/>',
    fe: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1V5z"/><path d="M12 6v13"/>',
    productividad: '<circle cx="12" cy="12" r="9"/><path d="M8 12.500l2.800 2.800L16 9.500"/>',
    analisis: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8.500 11.500l2 2 3.500-4"/>'
  };
  function icon(cat) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[cat] || '') + '</svg>';
  }

  function norm(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  FUNCS.forEach(function (f) {
    f._k = norm(f.title + ' ' + f.desc + ' ' + CATS[f.cat] + ' ' + f.prompt);
  });

  var CSS = [
    '.cxf-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0);visibility:hidden;transition:background-color .38s cubic-bezier(.32,.72,0,1),visibility 0s linear .38s;-webkit-tap-highlight-color:transparent}',
    '.cxf-ov.cxf-on{background:rgba(0,0,0,.5);visibility:visible;transition:background-color .38s cubic-bezier(.32,.72,0,1),visibility 0s}',
    '.cxf-sheet{position:relative;width:100%;max-width:640px;height:min(88vh,860px);height:min(88dvh,860px);display:flex;flex-direction:column;background:var(--panel,#1b1b1f);color:var(--txt,#eee);border:1px solid var(--line,#333);border-bottom:0;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.35);transform:translate3d(0,100%,0);transition:transform .42s cubic-bezier(.32,.72,0,1);will-change:transform;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}',
    '.cxf-on .cxf-sheet{transform:translate3d(0,0,0)}',
    '.cxf-sheet.cxf-drag{transition:none}',
    '.cxf-head{flex:none;padding:8px 16px 10px;touch-action:none;cursor:grab}',
    '.cxf-grab{width:38px;height:5px;border-radius:3px;background:var(--line,#333);margin:0 auto 10px}',
    '.cxf-top{display:flex;align-items:center;justify-content:space-between;gap:12px}',
    '.cxf-title{margin:0;font-size:18px;font-weight:600;letter-spacing:.1px}',
    '.cxf-x{appearance:none;border:0;background:transparent;color:var(--acc,#4f8bff);font:inherit;font-weight:600;padding:8px 6px;min-height:44px;cursor:pointer;border-radius:8px}',
    '.cxf-search{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:11px 14px;font:inherit;color:var(--txt,#eee);background:var(--bg,#111);border:1px solid var(--line,#333);border-radius:12px;outline:0;-webkit-appearance:none;appearance:none}',
    '.cxf-search:focus{border-color:var(--acc,#4f8bff)}',
    '.cxf-chips{flex:none;display:flex;gap:8px;overflow-x:auto;padding:4px 16px 10px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}',
    '.cxf-chips::-webkit-scrollbar{display:none}',
    '.cxf-chip{flex:none;appearance:none;cursor:pointer;font:inherit;font-size:13px;white-space:nowrap;padding:8px 13px;min-height:36px;color:var(--txt,#eee);background:transparent;border:1px solid var(--line,#333);border-radius:999px;transition:background-color .2s,border-color .2s,color .2s}',
    '.cxf-chip[aria-pressed="true"]{background:var(--acc,#4f8bff);border-color:var(--acc,#4f8bff);color:#fff}',
    '.cxf-count{flex:none;padding:0 16px 6px;font-size:12.5px;color:var(--mut,#999)}',
    '.cxf-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:2px 12px max(20px,env(safe-area-inset-bottom));display:grid;gap:8px;align-content:start;contain:content}',
    '.cxf-card{display:flex;gap:12px;align-items:flex-start;text-align:left;width:100%;box-sizing:border-box;appearance:none;cursor:pointer;font:inherit;color:inherit;padding:12px;background:var(--bg,#111);border:1px solid var(--line,#333);border-radius:14px;content-visibility:auto;contain-intrinsic-size:auto 74px;transition:border-color .2s,transform .2s}',
    '.cxf-card:active{transform:scale(.97);transition-duration:.12s}',
    '.cxf-list{grid-auto-rows:max-content}.cxf-card{border-radius:18px!important;align-self:start!important;overflow:visible!important;height:auto!important;min-height:64px;content-visibility:visible!important;contain:none!important;contain-intrinsic-size:auto!important;animation:cxfin .6s var(--spr,cubic-bezier(.32,.72,0,1)) both;animation-delay:calc(var(--i,0) * 32ms);transition:transform .5s var(--spr,cubic-bezier(.34,1.56,.64,1)),border-color .3s,background .3s}',
    '.cxf-chip{transition:transform .45s var(--spr,cubic-bezier(.34,1.56,.64,1)),background .3s,color .3s,border-color .3s}.cxf-chip:active{transform:scale(.94)}',
    '@keyframes cxfin{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}',
    '.cxf-ico{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:10px;color:var(--acc,#4f8bff);border:1px solid var(--line,#333)}',
    '.cxf-ct{display:block;font-weight:600;font-size:15px}',
    '.cxf-cd{display:block;margin-top:2px;font-size:13px;color:var(--mut,#999)}',
    '.cxf-cc{display:block;margin-top:4px;font-size:11.5px;letter-spacing:.3px;color:var(--mut,#999);opacity:.85}',
    '.cxf-empty{padding:32px 16px;text-align:center;color:var(--mut,#999)}',
    '.cxf-x:focus-visible,.cxf-chip:focus-visible,.cxf-card:focus-visible{outline:2px solid var(--acc,#4f8bff);outline-offset:2px}',
    '@media (hover:hover){.cxf-card:hover{border-color:var(--acc,#4f8bff)}}',
    '@media (min-width:700px){.cxf-ov{align-items:center}.cxf-sheet{border-radius:20px;border-bottom:1px solid var(--line,#333);transform:translate3d(0,24px,0);opacity:0;transition:transform .42s cubic-bezier(.32,.72,0,1),opacity .3s}.cxf-on .cxf-sheet{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.cxf-ov,.cxf-ov.cxf-on{transition:none}.cxf-sheet{transition:opacity .01s}.cxf-chip,.cxf-card{transition:none}.cxf-card:active{transform:none}}'
  ].join('\n');

  var ov, sheet, input, chipsEl, listEl, countEl, lastFocus, activeCat = '', rafId = 0, built = false;

  function build() {
    if (built) return;
    built = true;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    ov = document.createElement('div');
    ov.className = 'cxf-ov';
    ov.innerHTML =
      '<div class="cxf-sheet" role="dialog" aria-modal="true" aria-labelledby="cxf-t">' +
      '<div class="cxf-head"><div class="cxf-grab"></div>' +
      '<div class="cxf-top"><h2 class="cxf-title" id="cxf-t">Funciones</h2>' +
      '<button type="button" class="cxf-x" aria-label="Cerrar el panel de funciones">Cerrar</button></div>' +
      '<input type="search" class="cxf-search" placeholder="Buscar una función" aria-label="Buscar una función" autocomplete="off" enterkeyhint="search"></div>' +
      '<div class="cxf-chips" role="group" aria-label="Categorías"></div>' +
      '<div class="cxf-count" role="status" aria-live="polite"></div>' +
      '<div class="cxf-list"></div></div>';
    document.body.appendChild(ov);

    sheet = ov.firstChild;
    input = ov.querySelector('.cxf-search');
    chipsEl = ov.querySelector('.cxf-chips');
    listEl = ov.querySelector('.cxf-list');
    countEl = ov.querySelector('.cxf-count');

    var h = '<button type="button" class="cxf-chip" data-c="" aria-pressed="true">Todas</button>';
    Object.keys(CATS).forEach(function (k) {
      h += '<button type="button" class="cxf-chip" data-c="' + k + '" aria-pressed="false">' + CATS[k] + '</button>';
    });
    chipsEl.innerHTML = h;

    chipsEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.cxf-chip') : null;
      if (!b) return;
      activeCat = b.getAttribute('data-c');
      var cs = chipsEl.children;
      for (var i = 0; i < cs.length; i++) cs[i].setAttribute('aria-pressed', cs[i] === b ? 'true' : 'false');
      render();
      listEl.scrollTop = 0;
    });
    input.addEventListener('input', function () {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () { rafId = 0; render(); });
    });
    listEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.cxf-card') : null;
      if (b) elegir(b.getAttribute('data-id'));
    });
    ov.querySelector('.cxf-x').addEventListener('click', cerrar);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) cerrar(); });
    ov.addEventListener('touchstart', function (e) { if (e.target === ov) cerrar(); }, { passive: true });
    ov.addEventListener('keydown', onKey);
    dragSetup(ov.querySelector('.cxf-head'));
  }

  function render() {
    var q = norm(input.value).trim().split(/\s+/).filter(Boolean);
    var out = [], i, j, f, ok, html = '';
    for (i = 0; i < FUNCS.length; i++) {
      f = FUNCS[i];
      if (activeCat && f.cat !== activeCat) continue;
      ok = true;
      for (j = 0; j < q.length; j++) if (f._k.indexOf(q[j]) < 0) { ok = false; break; }
      if (ok) out.push(f);
    }
    for (i = 0; i < out.length; i++) {
      f = out[i];
      html += '<button type="button" class="cxf-card" style="--i:' + Math.min(i, 14) + '" data-id="' + f.id + '"><span class="cxf-ico">' + icon(f.cat) +
        '</span><span><span class="cxf-ct">' + f.title + '</span><span class="cxf-cd">' + f.desc +
        '</span><span class="cxf-cc">' + CATS[f.cat] + '</span></span></button>';
    }
    listEl.innerHTML = html || '<div class="cxf-empty">No se encontraron funciones. Pruebe con otras palabras o elija otra categoría.</div>';
    countEl.textContent = out.length === 1 ? '1 función' : out.length + ' funciones';
  }

  function focusables() {
    var n = ov.querySelectorAll('button,input'), a = [], i;
    for (i = 0; i < n.length; i++) if (n[i].offsetParent !== null || n[i] === document.activeElement) a.push(n[i]);
    return a;
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    var a = focusables();
    if (!a.length) return;
    var first = a[0], last = a[a.length - 1];
    if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  function dragSetup(head) {
    var y0 = 0, dy = 0, on = false, t0 = 0;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('button,input')) return;
      on = true; y0 = e.clientY; dy = 0; t0 = Date.now();
      sheet.classList.add('cxf-drag');
      try { head.setPointerCapture(e.pointerId); } catch (x) {}
    });
    head.addEventListener('pointermove', function (e) {
      if (!on) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = 'translate3d(0,' + dy + 'px,0)';
    });
    function end() {
      if (!on) return;
      on = false;
      sheet.classList.remove('cxf-drag');
      var v = dy / Math.max(1, Date.now() - t0);
      sheet.style.transform = '';
      if (dy > 110 || (dy > 40 && v > 0.5)) cerrar();
    }
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  }

  function abrir() {
    build();
    lastFocus = document.activeElement;
    input.value = '';
    activeCat = '';
    var cs = chipsEl.children;
    for (var i = 0; i < cs.length; i++) cs[i].setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    render();
    listEl.scrollTop = 0;
    sheet.style.transform = '';
    ov.style.display = '';
    void ov.offsetWidth;
    ov.classList.add('cxf-on');
    document.addEventListener('keydown', onDocKey, true);
    setTimeout(function () {
      if (!ov.classList.contains('cxf-on')) return;
      try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); }
    }, 60);
  }

  function onDocKey(e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && !ov.contains(e.target)) { e.preventDefault(); cerrar(); }
  }

  function cerrar() {
    if (!ov || !ov.classList.contains('cxf-on')) return;
    ov.classList.remove('cxf-on');
    document.removeEventListener('keydown', onDocKey, true);
    sheet.style.transform = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (x) {} }
  }

  function elegir(id) {
    var f = null, i;
    for (i = 0; i < FUNCS.length; i++) if (FUNCS[i].id === id) { f = FUNCS[i]; break; }
    if (!f) return;
    ov.classList.remove('cxf-on');
    document.removeEventListener('keydown', onDocKey, true);
    sheet.style.transform = '';
    var q = document.getElementById('q');
    if (!q) {
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (x4) {} }
      return;
    }
    q.value = f.prompt;
    try { q.dispatchEvent(new Event('input', { bubbles: true })); } catch (x) {}
    try { q.focus({ preventScroll: true }); } catch (x2) { q.focus(); }
    var m = /\{[^}]*\}/.exec(f.prompt);
    try {
      if (m) q.setSelectionRange(m.index, m.index + m[0].length);
      else q.setSelectionRange(f.prompt.length, f.prompt.length);
    } catch (x3) {}
    if (f.send) {
      var g = document.getElementById('go');
      if (g) g.click();
    }
  }

  window.openFunciones = abrir;
  window.closeFunciones = cerrar;
})();
