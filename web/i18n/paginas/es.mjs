/**
 * Textos de las páginas estáticas de la web, en español — el ORIGINAL: los
 * demás idiomas de esta carpeta son traducción de este archivo, con las mismas
 * claves. Los valores pueden traer HTML en línea (un enlace dentro de la frase);
 * las claves marcadas `|attr` en la plantilla se escapan solas.
 *
 * Las plantillas están en web/*.html y las expande scripts/web-i18n.mjs.
 */
export const TEXTOS = {
  // ─── Cabecera y pie, comunes a las tres páginas ──────────────────────────
  'marca.nombre': 'MindHaOS',
  'marca.sub': 'Casa Mental OS',
  'nav.entrar': 'Entrar',
  'nav.descargar': 'Descargar',
  'pie.inicio': 'Inicio',
  'pie.privacidad': 'Privacidad',
  'pie.terminos': 'Términos',
  'pie.cuenta': 'Mi cuenta',
  'pie.contacto': 'Contacto',
  'tema.boton': 'Modo claro u oscuro',

  // ─── Portada ─────────────────────────────────────────────────────────────
  'meta.titulo': 'MindHaOS — Tu mente, en una casa 3D',
  'meta.desc':
    'Organiza tus hábitos, metas, finanzas, comidas y más en una casa isométrica 3D donde cada cuarto es una app. Gratis con tu cuenta; la IA, la sincronización y la nube, desde 7 USD al mes.',
  'og.desc':
    'Tu vida, en una casa 3D: hábitos, metas, finanzas, comidas y más. Gratis con tu cuenta; la IA y la sincronización, desde 7 USD al mes.',

  'hero.h1': 'Tu mente,<br />en una casa 3D',
  // La frase de la portada, con TRES huecos que rotan solos y a la vez: la
  // terna tiene que cuadrar en orden (cocina → nutrición → recetas), y los
  // ejemplos de un mismo hueco convienen parecidos de largo (se queda con el
  // ancho del más largo). Un trozo fijo puede ir vacío si el idioma lo pide.
  'hero.sub.1': 'Es un espacio donde creas una casa insertando',
  'hero.sub.ej1.1': 'una cocina o un huerto',
  'hero.sub.ej1.2': 'un despacho o una cancha',
  'hero.sub.ej1.3': 'una biblioteca o un circuito',
  'hero.sub.ej1.4': 'un jardín o una granja',
  'hero.sub.2': 'y en cada cuarto integras una aplicación completa, como la de',
  'hero.sub.ej2.1': 'nutrición',
  'hero.sub.ej2.2': 'finanzas',
  'hero.sub.ej2.3': 'aprendizaje',
  'hero.sub.ej2.4': 'calma',
  'hero.sub.3': 'para archivar, planear o crear tus',
  'hero.sub.ej3.1': 'comidas, macros y recetas',
  'hero.sub.ej3.2': 'presupuestos y metas de ahorro',
  'hero.sub.ej3.3': 'apuntes y sesiones de estudio',
  'hero.sub.ej3.4': 'meditaciones y agradecimientos',
  'hero.sub.4':
    'ya sea totalmente a mano o con ayuda de la IA. Y todas están integradas a un calendario, a un sistema de misiones diarias y a tus metas personales, sincronizadas en tu teléfono y en tu computadora.',
  'hero.cta': 'Descargar la app',
  'hero.probar': 'Probar hacer tu MindHaOS gratis',
  'hero.nota':
    'La MindHaOS (Casa Mental OS) es gratis con tu cuenta y funciona sin conexión. La IA, la sincronización y la nube vienen con la suscripción — y si la dejas, no pierdes nada.',
  'hero.video': 'Aquí va tu video o capturas de la MindHaOS (Casa Mental OS)',

  // Lo que trae la casa, en cifras (el número lo pone el HTML).
  'cifras.apps': 'apps',
  'cifras.studio': 'del Studio',
  'cifras.infra': 'infraestructuras',
  'cifras.ra': 'apps de RA',
  'cifras.calendario': 'calendario',
  'cifras.chat': 'chat',

  'como.h2': 'Cómo funciona',
  'como.sub': 'Un espacio donde levantas tu MindHaOS (Casa Mental OS) y luego le metes tu vida dentro.',
  'como.1.t': 'Levantas tu MindHaOS',
  'como.1.p':
    'Insertas cuartos, pisos y hasta un sótano, y alrededor la infraestructura: huerto, granja, canchas, circuitos de carreras. Los muros, los colores, los muebles y tu avatar los eliges tú.',
  'como.2.t': 'Cada cuarto es una app completa',
  'como.2.p':
    'Le asignas una de las 17 apps —nutrición, ejercicio, descanso, finanzas, biblioteca, idiomas, ideas, agenda, viajes, hobbies, metas…—, una de las cuatro del Studio —audio, arte, escritura y video— o te fabricas la tuya. Con ellas archivas lo que ya viviste, planeas lo que viene y creas lo que todavía no existe: rutinas, recetas, presupuestos, apuntes, mapas mentales, cronogramas, canciones y libros. Todo a mano, o con la IA a tu lado.',
  'como.3.t': 'Todo cae en el mismo sitio',
  'como.3.p':
    'Las 17 apps y las cuatro del Studio comparten un calendario, una lista de misiones diarias y tus metas personales. Y tu MindHaOS (Casa Mental OS) entera te sigue del teléfono a la computadora.',

  'car.h2': 'Una MindHaOS, muchas apps',
  // Las tres primeras tarjetas: el argumento de compra.
  'car.todo.t': 'Todo en uno, de verdad',
  'car.todo.p':
    'Una sola app en lugar de veinte: comida, dinero, descanso, estudio, hábitos y metas bajo el mismo techo — y hablándose entre ellas, que es justo lo que ninguna app suelta puede hacer.',
  'car.nocaduca.t': 'Gratis, y no caduca',
  'car.nocaduca.p':
    'Tu MindHaOS es gratis con tu cuenta, y es tuya. Las apps de suscripción se apagan en cuanto dejas de pagarlas; aquí la suscripción solo trae la IA, la sincronización y la nube: si la dejas, conservas la MindHaOS entera y todos tus datos en tu dispositivo.',
  'car.nuevas.t': 'Actualizaciones nuevas',
  'car.nuevas.p': 'La MindHaOS sigue creciendo: cuartos, apps y mejoras que van llegando sin volver a pagar por ellas.',
  'car.1.t': 'Cuartos que son apps',
  'car.1.p':
    'Ejercicio, cocina, finanzas, descanso, biblioteca, idiomas, viajes, hobbies, mindfulness y más: cada cuarto guarda una mini-app completa.',
  'car.studio.t': 'Un Studio para crear',
  'car.studio.p':
    'Cuatro apps aparte: Audio, Arte, Escritura y Video. Compones con piano roll y teclado MIDI, pintas y retocas fotos, escribes libros por capítulos y montas videos por guion — y exportas lo que hagas, o publicas un video directo en tu propia cuenta de YouTube, TikTok, Facebook o Instagram.',
  'car.2.t': 'Asistente con IA',
  'car.2.p':
    'Chatea con tu asistente: captura comidas, crea rutinas, planea metas, genera imágenes y modelos 3D. Cada nivel de la suscripción trae 700, 1400 o 2100 créditos al mes.',
  'car.3.t': 'Sincronización total',
  'car.3.p':
    'Tu MindHaOS te sigue al teléfono, la tablet y la computadora. Todo cifrado en tránsito y respaldado en la nube. Con Pro, además, tu nube (el cuarto Archivo) guarda 10, 30 o 100 GB de archivos.',
  'car.4.t': 'Se siente como un juego',
  'car.4.p':
    'Tu personaje vive de tu actividad real: rachas, insignias, la Montaña de Sísifo, vehículos, carreras y minijuegos.',
  'car.5.t': 'Calendario y metas',
  'car.5.p':
    'Rutinas de 24 horas, metas anidadas, cronogramas con IA y métricas de cumplimiento que sí se entienden.',
  'car.6.t': 'Tus datos, contigo',
  'car.6.p':
    'La app es local-first: todo vive primero en tu dispositivo. Si cancelas, no pierdes tus datos — sigues en modo local.',


  // La sección de IA (#ia): qué hace y con quién. OJO, no confundir con las
  // claves `ia.t/p/precios/cta` de más abajo, que son la franja de PRECIOS.
  'ia.h2': 'Tu asistente, con o sin nube',
  'ia.sub':
    'La IA de la MindHaOS registra, planea y crea contigo. Y tú decides quién la mueve: un proveedor de nube o tu propia computadora.',
  'ia.cap.1.t': 'Registra hablando',
  'ia.cap.1.p':
    'Cuéntale lo que comiste, gastaste o entrenaste y lo apunta en el cuarto que le toca, con sus campos y su fecha.',
  'ia.cap.2.t': 'Planea tus metas',
  'ia.cap.2.p':
    'Le pides una meta y te propone el cronograma: pasos, fechas y misiones diarias que después editas a mano.',
  'ia.cap.3.t': 'Crea imágenes y objetos 3D',
  'ia.cap.3.p':
    'Ilustra tus recetas, tu ropa y tus ideas, y fabrica muebles y objetos nuevos para tu MindHaOS.',
  'ia.cap.4.t': 'Habla y te escucha',
  'ia.cap.4.p':
    'Tus asistentes responden con voz, y el dictado te deja registrar el día sin escribir una palabra.',
  'ia.nube.t': 'En la nube, con quien tú elijas',
  'ia.nube.p':
    'Claude, Gemini o ChatGPT: eliges quién piensa, quién pone la voz y quién dibuja. Con los créditos de tu plan o con tus propias claves.',
  'ia.local.t': 'O en tu máquina, con Ollama',
  'ia.local.p':
    'Instala Ollama y la MindHaOS habla con el modelo que corre en tu computadora: sin créditos, sin conexión y sin que nada salga de ahí.',
  'ia.local.nota':
    'La voz y las imágenes siguen necesitando un proveedor de nube, salvo que tu modelo local sepa generarlas.',

  'mani.h2': 'Tu vida, hecha videojuego',
  'mani.p1':
    'MindHaOS es la representación de tu vida convertida en videojuego, jugada desde el lugar más cómodo que existe: tu propia MindHaOS. Subir de nivel y ganar rangos no es un adorno — es lo que hiciste allá afuera, contado aquí dentro.',
  'mani.p2':
    'Aquí expandes habilidades nuevas, llevas el control de tus recursos y pones la tecnología a tu favor. Contra el consumismo inconsciente del formato corto. Contra el deterioro cognitivo que dejan los hábitos de consumo que imponen las grandes corporaciones.',
  'mani.cierre': 'La misma dopamina. Esta vez, para tu vida real.',

  'precio.h2':
    'Tu MindHaOS es gratis; la IA, la sincronización y la nube, por suscripción',
  'precio.probar.nombre': 'Pruébala',
  'precio.probar.cifra': 'Gratis',
  'precio.probar.1': 'Tu propia MindHaOS con todas las apps, y tus datos en tu dispositivo',
  'precio.probar.2': 'Buzón, partidas y espacios compartidos con tus amigos',
  'precio.probar.3': 'Pruébala sin cuenta; crea tu cuenta gratis para guardarla',
  'precio.probar.cta': 'Probar la app',
  'precio.probar.pie': 'Sin tarjeta y sin fecha de caducidad.',
  'precio.app.nombre': 'Suscripción',
  'precio.app.cifra': 'desde 7 USD',
  'precio.app.pagoUnico': 'al mes',
  'precio.app.1':
    'Nivel 1, 2 o 3: 700, 1400 o 2100 créditos de IA al mes',
  'precio.app.2': 'Sincronización entre todos tus dispositivos',
  'precio.app.3': 'Tu nube: 10, 30 o 100 GB para tus archivos',
  'precio.app.cta': 'Suscribirme',
  'precio.app.pie':
    'Sin permanencia: subes, bajas o cancelas cuando quieras. Se contrata aquí o dentro de la app, y vale en todos tus dispositivos.',

  'ia.t': 'Créditos de IA',
  'ia.precios':
    'Nivel 1: 700 créditos<span>·</span>Nivel 2: 1400<span>·</span>Nivel 3: 2100',
  'ia.p':
    'Una respuesta del asistente cuesta 1 crédito; una imagen, 3; un modelo 3D, 10. Se renuevan cada mes y solo se gastan cuando tú pides algo.',
  'ia.cta': '¿Qué puedes hacer con los créditos? →',
  'creditos.h2': '¿Qué puedes hacer con tus créditos?',
  'creditos.sub':
    'Cada cosa que le pides a la IA cuesta unos créditos, según lo que cuesta atenderla. Solo se gastan cuando tú pides algo, y se renuevan cada mes.',
  'creditos.col.que': 'Lo que pides',
  'creditos.col.cuesta': 'Créditos',
  'creditos.chat': 'Una respuesta del asistente',
  'creditos.foto': 'Leer una foto: una comida, un ticket, un documento',
  'creditos.voz': 'Dictar por voz (hasta 30 segundos)',
  'creditos.ruta': 'Una ruta en transporte público',
  'creditos.plan': 'Un plan largo: metas, rutinas, recetas de la semana',
  'creditos.pdf': 'Conversar con un PDF',
  'creditos.tts': 'Que tu asistente te conteste en voz alta',
  'creditos.imagen': 'Una imagen (rápida / buena calidad)',
  'creditos.modelo': 'Un modelo 3D para tu casa',
  'creditos.rinde.t': 'Lo que rinde cada nivel al mes',
  'creditos.rinde.1': 'Nivel 1 · 700 créditos: unas 700 respuestas, o 230 imágenes rápidas',
  'creditos.rinde.2':
    'Nivel 2 · 1400 créditos: unas 1400 respuestas, o 140 imágenes de buena calidad',
  'creditos.rinde.3': 'Nivel 3 · 2100 créditos: unas 2100 respuestas, o 210 modelos 3D',
  'creditos.nota':
    'Con tus propias claves de IA, o con Ollama en tu computadora, la IA no gasta créditos.',
  'creditos.cta': 'Ver los niveles',

  'desc.h2': 'Descargar la app',
  'desc.sub':
    'Descárgala gratis y entra con tu cuenta: tu MindHaOS aparece en cualquier dispositivo, incluido el navegador. La suscripción se contrata dentro de la app o aquí en la web.',
  'desc.pronto': 'Próximamente',
  'desc.android': 'Gratis en Google Play.',
  'desc.android.cta': 'Descargar para Android',
  'desc.ios.t': 'iPhone, iPad y Mac',
  'desc.ios': 'Gratis en el App Store.',
  'desc.web.t': 'En tu navegador',
  'desc.web': 'Sin instalar nada: entra con tu cuenta y tu MindHaOS te espera. Sin cuenta puedes probar la app.',
  'desc.web.cta': 'Abrir la app',
  'desc.windows': 'Gratis en Microsoft Store.',
  'desc.windows.cta': 'Descargar para Windows',

  'faq.h2': 'Preguntas frecuentes',
  'faq.1.q': '¿La app es gratis?',
  'faq.1.a':
    'Sí. Creas tu cuenta y tu MindHaOS es tuya, con todas las apps, sin pagar nada. Solo se paga la suscripción si quieres la IA, la sincronización entre dispositivos y la nube; se contrata aquí, en <a href="/cuenta">tu cuenta</a>, o dentro de la app de Android y iPhone, y vale en todos tus dispositivos.',
  'faq.2.q': '¿Qué incluye la suscripción?',
  'faq.2.a':
    'Tres niveles: el Nivel 1 por 7 USD al mes trae 700 créditos de IA y 10 GB de nube; el Nivel 2, por 14 USD, 1400 créditos y 30 GB; y el Nivel 3, por 20 USD, 2100 créditos y 100 GB. Los tres incluyen la sincronización entre todos tus dispositivos. Sin permanencia: subes, bajas o cancelas cuando quieras.',
  'faq.3.q': '¿Qué puedo hacer sin suscribirme?',
  'faq.3.a':
    'Todo lo que no gasta en servidores de IA: todos los cuartos y sus apps, el calendario, las metas, tus datos en tu dispositivo, y además el buzón, las partidas y los espacios compartidos con tus amigos. Cuando tocas algo de la IA, la sincronización o la nube, la app te ofrece la suscripción.',
  'faq.4.q': '¿Qué son los créditos de IA?',
  'faq.4.a':
    'La unidad con la que se cobra cada petición al asistente, según lo que cuesta atenderla: una respuesta normal vale 1 crédito, un plan largo 4, una imagen 3 (10 en calidad alta) y un modelo 3D 10. Nunca se cobra automático: solo se gasta cuando tú pides algo. Mira <a href="#creditos">todo lo que puedes hacer con ellos</a>.',
  'faq.5.q': '¿Qué pasa si cancelo?',
  'faq.5.a':
    'Conservas la app entera y todos tus datos en tus dispositivos, en modo local. Solo pierdes los créditos mensuales, la sincronización y la nube. Si renuevas, todo se reactiva tal como lo dejaste. Tus archivos de la nube quedan 90 días en solo lectura para que los bajes; después se borran.',
  'faq.6.q': '¿Dónde se guardan mis datos?',
  'faq.6.a':
    'Primero en tu dispositivo (la app es local-first) y, con la sincronización activa, también en la nube para pasar de un dispositivo a otro. En modo local no sale nada de tu dispositivo. Los pagos los procesan RevenueCat y Stripe —o la tienda, si compras desde el móvil—: nunca vemos tu tarjeta. Más detalles en la <a href="/privacidad">política de privacidad</a>. Los archivos grandes (tu nube y los medios del Studio) se guardan en Cloudflare R2.',
  'faq.7.q': '¿En qué dispositivos funciona?',
  'faq.7.a':
    'Hoy: en cualquier navegador moderno. Muy pronto: Android (Google Play), iPhone/iPad (App Store), Windows y macOS. Tu cuenta vale para todos: tu MindHaOS y tu suscripción funcionan en cualquier dispositivo donde entres con tu correo.',
  'faq.8.q': '¿Cómo cancelo o borro mi cuenta?',
  'faq.8.a':
    'Para cancelar el cobro, «Gestionar suscripción» en <a href="/cuenta">tu cuenta</a>. Para borrar tu cuenta y todos tus datos de nuestros servidores, desde la app: Editor → Configuraciones → Cuenta.',

  // ─── Legales, comunes ────────────────────────────────────────────────────
  'legal.fecha': 'Última actualización: octubre de 2026.',
  // Vacío en el ORIGINAL: el aviso de «esto es una traducción» solo lo llevan
  // los demás idiomas. `.fecha:empty` no se pinta (estilos.css).
  'legal.original': '',

  // ─── Privacidad ──────────────────────────────────────────────────────────
  'priv.titulo': 'Política de privacidad',
  'priv.quienes.h': 'Quiénes somos',
  'priv.quienes.p':
    'MindHaOS («la app») es una aplicación de organización personal. Contacto: <a href="mailto:mindplannerhome@gmail.com">mindplannerhome@gmail.com</a> · <a href="tel:5510132542">55 1013 2542</a>.',
  'priv.quienes.dir': 'Domicilio: Calle Riff 1036, código postal 03340, Ciudad de México, México.',
  'priv.datos.h': 'Qué datos recopilamos',
  'priv.datos.1':
    '<strong>Cuenta:</strong> tu correo electrónico y una contraseña cifrada, gestionados por Supabase (nuestro proveedor de backend).',
  'priv.datos.2':
    '<strong>Datos de la app:</strong> lo que registras en tus cuartos (rutinas, comidas, finanzas, notas, fotos…). Viven primero en tu dispositivo y, con la sincronización activa, se sincronizan cifrados en tránsito con nuestros servidores para que tu casa te siga entre dispositivos.',
  'priv.datos.3':
    '<strong>Pagos:</strong> los procesan RevenueCat y Stripe. Nunca vemos ni almacenamos tu tarjeta; recibimos solo el estado de tu compra y de tu suscripción.',
  'priv.datos.4':
    '<strong>Uso de IA:</strong> contadores de créditos consumidos (no el contenido de tus conversaciones, que se envía a los proveedores de IA únicamente para generar cada respuesta y no se usa para entrenar).',
  'priv.datos.5':
    '<strong>Cámara y micrófono:</strong> solo cuando los activas (máscara AR, foto para el chat, dictado por voz). La máscara se procesa en tu dispositivo; el audio del dictado y las fotos que adjuntas al chat se envían a los proveedores de IA únicamente para generar esa respuesta.',
  'priv.datos.6':
    '<strong>Datos de salud y bienestar:</strong> lo que registras sobre ejercicio, alimentación, medicamentos, citas médicas o ciclo se guarda para ti como cualquier otro dato de la app; nunca se vende ni se usa para publicidad.',
  'priv.datos.7':
    '<strong>Ubicación:</strong> solo cuando la usas. Para calcular una ruta y durante la navegación, tu ubicación precisa y tu destino se envían a HERE Technologies; el cardio con GPS guarda el recorrido del entrenamiento con tus datos. Nunca la compartimos con otros usuarios.',
  'priv.datos.8':
    '<strong>Mensajes y contenido compartido:</strong> si eliges un alias y agregas contactos, guardamos tu alias, tu nombre visible, tu emoji y el retrato de tu personaje, y los mensajes, archivos y espacios compartidos que envías, para entregarlos a las personas que eliges. Solo los ven quienes participan en esa conversación o espacio. Si reportas algo, guardamos una copia de lo reportado para revisarlo.',
  'priv.datos.9':
    '<strong>Navegador:</strong> el historial y el tiempo en cada sitio se guardan en tu dispositivo. Solo se suben a nuestros servidores si activas su sincronización, y los dominios se envían a la IA solo si pides clasificarlos.',
  'priv.salud.h': 'Alcance de las funciones de salud',
  'priv.salud.p':
    'MindHaOS es una agenda personal, no una aplicación médica. Sus funciones de salud son un registro que escribes tú y unos recordatorios: la app no diagnostica, no interpreta síntomas, no recomienda dosis ni tratamientos, no comprueba interacciones entre medicamentos y no sustituye la consulta con un profesional sanitario. Las estimaciones del ciclo salen solo de los datos que introduces y son orientativas. No es un producto sanitario ni un dispositivo médico, y no se conecta con expedientes clínicos, aseguradoras ni proveedores de salud.',
  'priv.uso.h': 'Para qué los usamos',
  'priv.uso.1': 'Darte acceso a tu cuenta, a tu compra y a tu suscripción.',
  'priv.uso.2': 'Sincronizar tus datos entre dispositivos y respaldarlos.',
  'priv.uso.3': 'Operar las funciones de IA con tu cuota de créditos.',
  'priv.uso.4': 'No vendemos tus datos ni los compartimos con terceros para publicidad.',
  // ─── Cuentas de redes conectadas (lo exigen YouTube, TikTok y Meta) ──────
  'priv.dispositivo.h': 'Almacenamiento en tu dispositivo',
  'priv.dispositivo.p':
    'La app guarda información en tu propio dispositivo y la lee para funcionar: una base de datos local (IndexedDB) con los datos de tu casa y tus archivos, y el almacenamiento local del navegador con tus preferencias —idioma, tema, estado de la bienvenida— y con el testigo de sesión que mantiene tu cuenta abierta. No usamos cookies propias ni tecnologías similares para publicidad, analítica ni seguimiento. Puedes borrarlo todo desde los ajustes de tu navegador o desinstalando la app.',
  'priv.dispositivo.terceros':
    'Los servicios que integramos pueden guardar o leer información en tu dispositivo cuando los usas: Google al iniciar sesión y al autorizar YouTube API Services (ver la <a href="https://policies.google.com/technologies/cookies">política de cookies de Google</a>), y lo mismo TikTok y Meta al conectar esas cuentas. Esa información la gestionan ellos conforme a sus propias políticas.',
  'priv.redes.h': 'Cuentas de redes sociales conectadas',
  'priv.redes.p':
    'Si conectas tu cuenta de YouTube, TikTok, Facebook o Instagram, guardamos cifrados en nuestro servidor los tokens de acceso que esa red nos entrega, junto con el nombre y la foto de la cuenta o Página que elijas. Los usamos únicamente para publicar en tu propia cuenta los videos que tú decides publicar desde el editor de video, en el momento en que pulsas Publicar. No leemos tus videos, publicaciones, comentarios, mensajes ni ningún otro dato de esas cuentas, y nunca publicamos nada por nuestra cuenta. Los tokens se conservan hasta que desconectas la cuenta en Configuraciones → Cuentas conectadas o eliminas tu cuenta de MindHaOS; también puedes revocar el acceso desde los ajustes de seguridad de cada red (Google: <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>).',
  'priv.redes.youtube':
    'Para YouTube, la app utiliza YouTube API Services; al conectar tu cuenta aceptas los <a href="https://www.youtube.com/t/terms">Términos de servicio de YouTube</a> y se aplica la <a href="https://policies.google.com/privacy">Política de privacidad de Google</a>.',

  'priv.seguridad.h': 'Cómo protegemos tus datos',
  'priv.seguridad.p':
    'Todo lo que viaja entre la app y nuestros servidores va cifrado en tránsito con HTTPS/TLS, y los datos que sincronizas quedan cifrados en reposo en la infraestructura de Supabase. Tu contraseña nunca se guarda en claro: Supabase Auth almacena solo su hash. Cada cuenta está aislada de las demás —las tablas llevan activado el aislamiento por fila y solo las funciones del servidor, tras comprobar tu sesión, pueden leer o escribir lo tuyo—, el acceso administrativo se limita a las personas que operan el servicio y nadie revisa el contenido de tu casa. Tus datos no se venden, no se usan para publicidad ni se emplean para entrenar modelos de IA.',
  'priv.seguridad.tokens':
    'Los tokens de las cuentas de redes sociales que conectas reciben una protección adicional por ser datos sensibles: antes de guardarse se cifran con AES-GCM de 256 bits mediante una clave que existe únicamente como secreto del servidor, no está en el código, no viaja a tu dispositivo y no puede leerse desde la base de datos. La app nunca recibe un token: al consultar tus cuentas conectadas solo le llegan el nombre, la foto y la fecha de caducidad. El token se descifra dentro del servidor, en el instante de publicar el video que tú pediste, y no se usa para nada más. Se borra en cuanto desconectas la cuenta o eliminas la tuya, y un proceso diario revisa las conexiones inactivas y elimina las que ya no son válidas.',

  'priv.cancelas.h': 'Si cancelas tu suscripción',
  'priv.cancelas.p':
    'Tus datos locales siguen en tus dispositivos. Los datos sincronizados quedan almacenados (inaccesibles hasta que renueves) y puedes borrarlos definitivamente eliminando tu cuenta.',
  'priv.boletin.h': 'Boletín diario por correo',
  'priv.boletin.p':
    'Solo si aceptas recibirlo —con la casilla al crear tu cuenta o respondiendo a la pregunta de la app—, te enviamos un correo al día con un consejo de salud mental, promociones y noticias importantes de MindHaOS. Para eso usamos únicamente tu correo electrónico y tu idioma. El consejo lo redacta una IA de forma general e igual para todos los suscriptores de cada idioma: no se usan tus datos de la app para escribirlo, y no sustituye la ayuda profesional. Puedes darte de baja cuando quieras con el enlace de cada correo o desde Cuenta, en la app o en la web; sin tu consentimiento no te enviamos nada de esto.',
  'priv.borrar.h': 'Cómo borrar tu cuenta y tus datos',
  'priv.borrar.p':
    'Desde la app: Editor → Configuraciones → Cuenta. El borrado elimina tu usuario, tus datos sincronizados y tus archivos de nuestros servidores; se conservan solo los registros de facturación que la ley exige guardar.',
  'priv.proveedores.h': 'Proveedores',
  'priv.proveedores.1': 'Supabase (base de datos, autenticación y archivos).',
  'priv.proveedores.2': 'RevenueCat y Stripe (compras, suscripciones y pagos).',
  'priv.proveedores.3': 'Anthropic y Google (respuestas e imágenes de IA, bajo demanda).',
  'priv.proveedores.4':
    'OpenAI (transcripción de voz y respaldo de imágenes de IA, bajo demanda).',
  'priv.proveedores.5':
    'HERE Technologies (mapas, búsqueda de lugares y rutas, bajo demanda).',
  'priv.proveedores.6': "Cloudflare (almacenamiento de archivos en la nube, R2).",
  'priv.proveedores.7': 'Resend (envío del boletín por correo, solo si lo aceptas).',
  'priv.cambios.h': 'Cambios',
  'priv.cambios.p':
    'Si esta política cambia, publicaremos aquí la versión nueva con su fecha. Las dudas se atienden en el correo de contacto.',

  // ─── Términos ────────────────────────────────────────────────────────────
  'term.titulo': 'Términos del servicio',
  'term.servicio.h': 'El servicio',
  'term.servicio.p':
    'MindHaOS es una app de organización personal. La prueba sin cuenta y la app con cuenta son gratuitas. Las funciones recurrentes (créditos de IA, sincronización y nube) se contratan como suscripción, aquí en la web o dentro de la app; todas las versiones son clientes de esa misma cuenta.',
  'term.local.h': 'Modo local',
  'term.local.p':
    'Con tu cuenta, todas las funciones offline de la app se usan sin costo. Los datos se guardan en tu dispositivo, y su respaldo es responsabilidad tuya (Configuraciones → Respaldo de datos).',
  'term.precio.h': 'Suscripción y precio',
  'term.precio.1':
    'Suscripción mensual con renovación automática en tres niveles: Nivel 1, 7 USD al mes; Nivel 2, 14 USD; Nivel 3, 20 USD (o su equivalente en tu moneda).',
  'term.precio.2':
    'Incluye 700, 1400 o 2100 créditos de IA al mes según el nivel, sincronización entre dispositivos y espacio en tu nube: 10, 30 o 100 GB. Los créditos mensuales no usados no se acumulan al mes siguiente.',
  'term.precio.3':
    'Créditos por operación: 1 por respuesta de texto, 4 por un plan largo, 3 por una imagen (10 en calidad alta) y 10 por un modelo 3D. La tarifa puede ajustarse si cambian los costos de los proveedores de IA; el precio vigente se muestra en la app antes de cada petición.',
  'term.precio.4':
    'Puedes subir o bajar de nivel cuando quieras; el cambio se cobra a prorrata.',
  'term.precio.5':
    'Límite de uso justo: los créditos cubren un uso normal de la IA. Si en un mes el costo real de tus peticiones supera con mucho el valor de los créditos consumidos, la IA se pausa hasta que el límite se restablece el mes siguiente.',
  'term.precio.6': 'Los pagos los procesan RevenueCat y Stripe.',
  'term.cancelacion.h': 'Cancelación',
  'term.cancelacion.p':
    'Puedes cancelar cuando quieras desde «Gestionar suscripción» en <a href="/cuenta">tu cuenta</a>; conservas el plan hasta el final del periodo pagado. Después, la app sigue funcionando en tus dispositivos en modo local, sin créditos mensuales, sincronización ni nube, y puedes renovar cuando quieras. Tus archivos en la nube quedan 90 días en solo lectura para que los descargues; pasado ese plazo se borran de nuestros servidores.',
  'term.datos.h': 'Tus datos',
  'term.datos.p':
    'Tus datos son tuyos. La app es local-first: todo vive primero en tu dispositivo. El detalle de qué guardamos y cómo borrarlo está en la <a href="/privacidad">política de privacidad</a>.',
  'term.alojado.h': "Archivos que guardas en la nube",
  'term.alojado.p':
    "Eres responsable de los archivos que subes a tu nube y debes tener derecho a guardarlos. No se permite alojar contenido ilegal, que infrinja derechos de terceros o que viole las normas de la comunidad; podemos retirarlo y suspender la cuenta. La nube es un servicio de almacenamiento, no un respaldo garantizado: conserva copia de lo que no quieras perder. Si compartes un archivo con un enlace, eres responsable de a quién se lo mandas; el enlace vence solo y retiramos los que nos denuncien.",
  'term.razonable.h': 'Uso razonable',
  'term.razonable.p':
    'La cuota de créditos de IA es por cuenta personal. No está permitido revender el servicio, compartir la cuenta de forma masiva ni automatizar el consumo de IA fuera de la app.',
  'term.comunidad.h':
    'Normas de la comunidad',
  'term.comunidad.p':
    'MindHaOS te deja escribir a tus contactos, compartir contenido de tus cuartos, visitar otras casas y trabajar en espacios compartidos. Para usar estas funciones aceptas estas normas:',
  'term.comunidad.1':
    'No envíes acoso, amenazas, odio o discriminación, contenido sexual, violencia, spam, estafas ni nada ilegal.',
  'term.comunidad.2':
    'No toleramos el contenido abusivo. Desde la app puedes reportar cualquier mensaje, contacto o miembro de un espacio, y bloquear a quien quieras.',
  'term.comunidad.3':
    'Revisamos cada reporte en menos de 24 horas: retiramos el contenido que incumple estas normas y expulsamos del servicio a quien lo envió.',
  'term.comunidad.4':
    'Eres responsable de lo que envías y compartes. También puedes avisarnos por correo (ver Contacto).',
  'term.cambios.h': 'Cambios en el servicio',
  'term.cambios.p':
    'Podemos actualizar la app y estos términos; los cambios de precio se avisan con anticipación y nunca se aplican retroactivamente a un periodo ya pagado.',
  'term.contacto.h': 'Contacto',
  'term.contacto.p':
    'Dudas y soporte: <a href="mailto:mindplannerhome@gmail.com">mindplannerhome@gmail.com</a> · <a href="tel:5510132542">55 1013 2542</a>.',

  // ── Soporte (web/soporte.html) ──
  'pie.soporte': 'Soporte',
  'sop.titulo': 'Soporte',
  'sop.p': 'Si algo no funciona o tienes una duda, escríbenos y te respondemos lo antes posible.',
  'sop.correo.h': 'Escríbenos',
  'sop.datos.h': 'Qué incluir en tu mensaje',
  'sop.datos.1': 'Tu dispositivo y sistema (por ejemplo: Android 14, iPhone 15, Windows 11).',
  'sop.datos.2': 'Qué estabas haciendo cuando apareció el problema.',
  'sop.datos.3': 'Una captura de pantalla, si se puede.',
  'sop.faq.h': 'Preguntas frecuentes',
  'sop.faq.p': 'Las dudas más comunes — precios, dispositivos, IA y tus datos — están respondidas en la página principal.',
  'sop.faq.enlace': 'Ver preguntas frecuentes',
  'sop.cuenta.h': 'Eliminar tu cuenta',
  'sop.cuenta.p':
    'Puedes borrar tu cuenta y todos tus datos en la nube desde la app (Editor → Configuraciones → Cuenta) o desde tu cuenta en la web. Al eliminarla se borran también las conexiones con tus redes sociales (YouTube, TikTok, Facebook e Instagram): los tokens guardados se destruyen y dejan de ser válidos.',
  'sop.cuenta.enlace': 'Ir a tu cuenta',

  // ─── Portada de las guías (/guias) ──────────────────────────────────────
  'guias.titulo': "Guías MindHaOS — Respuestas claras a preguntas básicas",
  'guias.desc': "Guías interactivas narradas por Pep@: preguntas básicas como cómo hacer ejercicio, respondidas a fondo, con fuentes y herramientas, en 16 idiomas.",
  'guias.h1': "Guías MindHaOS",
  'guias.p': "Preguntas básicas respondidas a fondo, paso a paso y con fuentes. Cada guía la narra Pep@ y trae herramientas para ponerla en práctica.",
  'guias.partes': "partes",
  'guias.min': "min",

  // ─── Archivo compartido por enlace (descarga.html) ───────────────────
  'desc.titulo': "Archivo compartido",
  'desc.cargando': "Buscando el archivo…",
  'desc.compartido': "Te compartieron este archivo:",
  'desc.bajar': "Descargar",
  'desc.nota': "El enlace dura un tiempo limitado. MindHaOS no revisa el contenido que comparten sus usuarios: ábrelo solo si confías en quien te lo mandó.",
  'desc.noExiste.h': "Este enlace no existe",
  'desc.noExiste.p': "Puede que su dueño haya dejado de compartirlo o que el archivo ya no esté en su nube.",
  'desc.vencido.h': "Este enlace venció",
  'desc.vencido.p': "Pídele a quien te lo mandó un enlace nuevo.",
  'desc.tope.h': "Demasiadas descargas por hoy",
  'desc.tope.p': "Este enlace llegó a su límite diario. Vuelve a intentarlo mañana.",
  'desc.error.h': "No se pudo abrir",
  'desc.error.p': "Revisa tu conexión y vuelve a cargar la página.",
  'desc.cta': "¿Quieres tu propia casa para organizar tu vida y tus archivos?",
  'desc.cta.enlace': "Prueba MindHaOS",
  'desc.reportar': "Reportar este archivo",
}
