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
  'marca.nombre': 'Planificador Mental-Casa',
  'marca.sub': 'Mind Planner Home',
  'nav.entrar': 'Entrar',
  'nav.descargar': 'Descargar',
  'pie.inicio': 'Inicio',
  'pie.privacidad': 'Privacidad',
  'pie.terminos': 'Términos',
  'pie.cuenta': 'Mi cuenta',
  'pie.contacto': 'Contacto',
  'tema.boton': 'Modo claro u oscuro',

  // ─── Portada ─────────────────────────────────────────────────────────────
  'meta.titulo': 'Mind Planner Home — Tu mente, en una casa 3D',
  'meta.desc':
    'Organiza tus hábitos, metas, finanzas, comidas y más en una casa isométrica 3D donde cada cuarto es una app. Un solo pago de 8.89 USD con el primer mes de IA y sincronización incluido; demo gratis.',
  'og.desc':
    'Tu vida, en una casa 3D: hábitos, metas, finanzas, comidas y más. Un pago de 8.89 USD con el primer mes de IA incluido; demo gratis.',

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
  'hero.demo': 'Probar la demo gratis',
  'hero.nota':
    'La app se compra una vez en la tienda de tu dispositivo y funciona sin conexión. La IA y la sincronización son opcionales — y si las dejas, no pierdes nada.',
  'hero.video': 'Aquí va tu video o capturas de la casa',

  // Lo que trae la casa, en cifras (el número lo pone el HTML).
  'cifras.apps': 'apps',
  'cifras.infra': 'infraestructuras',
  'cifras.ra': 'apps de RA',
  'cifras.calendario': 'calendario',
  'cifras.chat': 'chat',

  'como.h2': 'Cómo funciona',
  'como.sub': 'Un espacio donde levantas tu casa y luego le metes tu vida dentro.',
  'como.1.t': 'Levantas tu casa',
  'como.1.p':
    'Insertas cuartos, pisos y hasta un sótano, y alrededor la infraestructura: huerto, granja, canchas, circuitos de carreras. Los muros, los colores, los muebles y tu avatar los eliges tú.',
  'como.2.t': 'Cada cuarto es una app completa',
  'como.2.p':
    'Le asignas una de las 17 apps —nutrición, ejercicio, descanso, finanzas, biblioteca, idiomas, ideas, agenda, viajes, hobbies, metas…— o te fabricas la tuya. Con ellas archivas lo que ya viviste, planeas lo que viene y creas lo que todavía no existe: rutinas, recetas, presupuestos, apuntes, mapas mentales y cronogramas. Todo a mano, o con la IA a tu lado.',
  'como.3.t': 'Todo cae en el mismo sitio',
  'como.3.p':
    'Las 17 apps comparten un calendario, una lista de misiones diarias y tus metas personales. Y tu casa entera te sigue del teléfono a la computadora.',

  'car.h2': 'Una casa, muchas apps',
  // Las tres primeras tarjetas: el argumento de compra.
  'car.todo.t': 'Todo en uno, de verdad',
  'car.todo.p':
    'Una sola app en lugar de veinte: comida, dinero, descanso, estudio, hábitos y metas bajo el mismo techo — y hablándose entre ellas, que es justo lo que ninguna app suelta puede hacer.',
  'car.nocaduca.t': 'No caduca si dejas de pagar',
  'car.nocaduca.p':
    'La compras una vez y es tuya. Las apps de suscripción se apagan en cuanto dejas de pagarlas; aquí, si dejas la IA, conservas la casa entera y todos tus datos en tu dispositivo.',
  'car.nuevas.t': 'Actualizaciones nuevas',
  'car.nuevas.p': 'La casa sigue creciendo: cuartos, apps y mejoras que van llegando sin volver a pagar por ellas.',
  'car.1.t': 'Cuartos que son apps',
  'car.1.p':
    'Ejercicio, cocina, finanzas, descanso, biblioteca, idiomas, viajes, hobbies, mindfulness y más: cada cuarto guarda una mini-app completa.',
  'car.2.t': 'Asistente con IA',
  'car.2.p':
    'Chatea con tu asistente: captura comidas, crea rutinas, planea metas, genera imágenes y modelos 3D. Tu primer mes trae 700 créditos incluidos; después la IA es opcional.',
  'car.3.t': 'Sincronización total',
  'car.3.p':
    'Tu casa te sigue al teléfono, la tablet y la computadora. Todo cifrado en tránsito y respaldado en la nube.',
  'car.4.t': 'Se siente como un juego',
  'car.4.p':
    'Tu personaje vive de tu actividad real: rachas, insignias, la Montaña de Sísifo, vehículos, carreras y minijuegos.',
  'car.5.t': 'Calendario y metas',
  'car.5.p':
    'Rutinas de 24 horas, metas anidadas, cronogramas con IA y métricas de cumplimiento que sí se entienden.',
  'car.6.t': 'Tus datos, contigo',
  'car.6.p':
    'La app es local-first: todo vive primero en tu dispositivo. Si cancelas, no pierdes tus datos — sigues en modo local.',


  'mani.h2': 'Tu vida, hecha videojuego',
  'mani.p1':
    'MPH es la representación de tu vida convertida en videojuego, jugada desde el lugar más cómodo que existe: tu propia casa. Subir de nivel y ganar rangos no es un adorno — es lo que hiciste allá afuera, contado aquí dentro.',
  'mani.p2':
    'Aquí expandes habilidades nuevas, llevas el control de tus recursos y pones la tecnología a tu favor. Contra el consumismo inconsciente del formato corto. Contra el deterioro cognitivo que dejan los hábitos de consumo que imponen las grandes corporaciones.',
  'mani.cierre': 'La misma dopamina. Esta vez, para tu vida real.',

  'precio.h2': 'Un solo pago en la tienda, tu casa para siempre',
  'precio.demo.nombre': 'Demo',
  'precio.demo.cifra': 'Gratis',
  'precio.demo.1': 'La casa de Pep@ con un año de vida dentro: pruébalo todo',
  'precio.demo.2': 'Sin cuenta, sin tarjeta y sin conexión',
  'precio.demo.3': 'Nada se guarda: al recargar, la casa vuelve a empezar',
  'precio.demo.cta': 'Probar la demo',
  'precio.demo.pie': 'La app completa, para conocerla sin compromiso.',
  'precio.app.nombre': 'La app',
  'precio.app.cifra': '8.89 USD',
  'precio.app.pagoUnico': 'pago único',
  'precio.app.1': 'Tu propia casa, para siempre: todas las apps, tus datos en tu dispositivo',
  'precio.app.2':
    'Primer mes incluido: 700 créditos de IA + sincronización, sin tarjeta y sin suscripción',
  'precio.app.3':
    'Al terminar el mes conservas la app entera y tus datos; los créditos de IA son opcionales',
  'precio.app.cta': 'Comprar la casa',
  'precio.app.pie':
    'Cómprala aquí mismo, sin pasar por ninguna tienda, o dentro de la app en tu móvil. Un pago, sin renovaciones, y vale en todos tus dispositivos.',

  'ia.t': 'IA y sincronización · opcional',
  'ia.precios': '6 USD al mes<span>·</span>60 USD al año<span>·</span>o 6 USD por 700 créditos sueltos',
  'ia.p':
    'Solo si quieres seguir con la IA y la sincronización cuando termine tu primer mes. Se contrata aquí o dentro de la app, y vale para todos tus dispositivos. Sin permanencia: si lo dejas, conservas la app y todos tus datos en modo local.',
  'ia.cta': 'Ver los planes →',

  'desc.h2': 'Descargar la app',
  'desc.sub':
    'Descárgala gratis y compra la casa dentro de la app —o aquí en la web—. Con tu cuenta, tu casa aparece en cualquier otro sitio, incluido el navegador.',
  'desc.pronto': 'Próximamente',
  'desc.android': 'Gratis en Google Play. La casa se compra dentro.',
  'desc.ios.t': 'iPhone y iPad',
  'desc.ios': 'Gratis en el App Store. La casa se compra dentro.',
  'desc.web.t': 'En tu navegador',
  'desc.web': 'Sin instalar nada: entra con tu cuenta y tu casa te espera. Sin cuenta puedes probar la demo.',
  'desc.web.cta': 'Abrir la app',
  'desc.windows': 'Instalador para Windows 10/11.',
  'desc.mac': 'Imagen .dmg para Mac.',

  'faq.h2': 'Preguntas frecuentes',
  'faq.1.q': '¿Dónde se compra la app?',
  'faq.1.a':
    'Donde prefieras: aquí en la web, desde <a href="/cuenta">tu cuenta</a>, o dentro de la app de Android y iPhone. Es un pago único que se guarda en tu cuenta, así que la compres donde la compres, tu casa aparece en todos tus dispositivos.',
  'faq.2.q': '¿Qué incluye el pago único?',
  'faq.2.a':
    'La casa entera: todos los cuartos, todas las apps y tus datos en tu dispositivo, para siempre y sin renovaciones. Además, el primer mes trae 700 créditos de IA y la sincronización incluidos, sin tarjeta. Antes de comprarla puedes probar la demo completa, que no pide cuenta.',
  'faq.3.q': '¿Cuánto cuesta la IA después del primer mes?',
  'faq.3.a':
    'Lo que tú elijas, o nada. La suscripción son 6 USD al mes (700 créditos y sincronización), o 60 USD al año — dos meses de regalo. Si se te queda corta, los niveles ×2 y ×3 dan 1400 o 2100 créditos por 12 o 18 USD al mes. Y si prefieres no suscribirte, hay recargas sueltas: 6 USD por 700 créditos que no caducan y se usan solo cuando los pides. Esto sí se paga aquí, en <a href="/cuenta">tu cuenta</a>, y vale para todos tus dispositivos.',
  'faq.4.q': '¿Qué son los créditos de IA?',
  'faq.4.a':
    'La unidad con la que se cobra cada petición al asistente, según lo que cuesta atenderla: una respuesta normal vale 1 crédito, un plan largo 4, una imagen 3 (10 en calidad alta) y un modelo 3D 10. Nunca se cobra automático: solo se gasta cuando tú pides algo.',
  'faq.5.q': '¿Qué pasa si cancelo?',
  'faq.5.a':
    'Conservas la app entera y todos tus datos en tus dispositivos, en modo local. Solo pierdes los créditos mensuales y la sincronización. Si renuevas, todo se reactiva tal como lo dejaste.',
  'faq.6.q': '¿Dónde se guardan mis datos?',
  'faq.6.a':
    'Primero en tu dispositivo (la app es local-first) y, con la sincronización activa, también en la nube para pasar de un dispositivo a otro. En modo local no sale nada de tu dispositivo. Los pagos los procesan RevenueCat y Stripe —o la tienda, si compras desde el móvil—: nunca vemos tu tarjeta. Más detalles en la <a href="/privacidad">política de privacidad</a>.',
  'faq.7.q': '¿En qué dispositivos funciona?',
  'faq.7.a':
    'Hoy: en cualquier navegador moderno. Muy pronto: Android (Google Play), iPhone/iPad (App Store), Windows y macOS. Tu cuenta vale para todos: compras una vez, donde te venga bien, y tanto la casa como la suscripción de IA funcionan en cualquier dispositivo donde entres con tu correo.',
  'faq.8.q': '¿Cómo cancelo o borro mi cuenta?',
  'faq.8.a':
    'Para cancelar el cobro, «Gestionar suscripción» en <a href="/cuenta">tu cuenta</a>. Para borrar tu cuenta y todos tus datos de nuestros servidores, desde la app: Editor → Configuraciones → Cuenta.',

  // ─── Legales, comunes ────────────────────────────────────────────────────
  'legal.fecha': 'Última actualización: agosto de 2026.',
  // Vacío en el ORIGINAL: el aviso de «esto es una traducción» solo lo llevan
  // los demás idiomas. `.fecha:empty` no se pinta (estilos.css).
  'legal.original': '',

  // ─── Privacidad ──────────────────────────────────────────────────────────
  'priv.titulo': 'Política de privacidad',
  'priv.quienes.h': 'Quiénes somos',
  'priv.quienes.p':
    'Mind Planner Home («la app») es una aplicación de organización personal. Contacto: <a href="mailto:mindplannerhome@gmail.com">mindplannerhome@gmail.com</a> · <a href="tel:5510132542">55 1013 2542</a>.',
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
  'priv.uso.h': 'Para qué los usamos',
  'priv.uso.1': 'Darte acceso a tu cuenta, a tu compra y a tu suscripción.',
  'priv.uso.2': 'Sincronizar tus datos entre dispositivos y respaldarlos.',
  'priv.uso.3': 'Operar las funciones de IA con tu cuota de créditos.',
  'priv.uso.4': 'No vendemos tus datos ni los compartimos con terceros para publicidad.',
  'priv.cancelas.h': 'Si cancelas tu suscripción',
  'priv.cancelas.p':
    'Tus datos locales siguen en tus dispositivos. Los datos sincronizados quedan almacenados (inaccesibles hasta que renueves) y puedes borrarlos definitivamente eliminando tu cuenta.',
  'priv.borrar.h': 'Cómo borrar tu cuenta y tus datos',
  'priv.borrar.p':
    'Desde la app: Editor → Configuraciones → Cuenta. El borrado elimina tu usuario, tus datos sincronizados y tus archivos de nuestros servidores; se conservan solo los registros de facturación que la ley exige guardar.',
  'priv.proveedores.h': 'Proveedores',
  'priv.proveedores.1': 'Supabase (base de datos, autenticación y archivos).',
  'priv.proveedores.2': 'RevenueCat y Stripe (compras, suscripciones y pagos).',
  'priv.proveedores.3': 'Anthropic y Google (respuestas e imágenes de IA, bajo demanda).',
  'priv.proveedores.4':
    'OpenAI (transcripción de voz y respaldo de imágenes de IA, bajo demanda).',
  'priv.cambios.h': 'Cambios',
  'priv.cambios.p':
    'Si esta política cambia, publicaremos aquí la versión nueva con su fecha. Las dudas se atienden en el correo de contacto.',

  // ─── Términos ────────────────────────────────────────────────────────────
  'term.titulo': 'Términos del servicio',
  'term.servicio.h': 'El servicio',
  'term.servicio.p':
    'Mind Planner Home es una app de organización personal. La demo es gratuita y no requiere cuenta. La app se compra con un pago único; las funciones recurrentes (créditos de IA y sincronización) se contratan únicamente en esta página web; las apps de escritorio y de tienda son clientes de esa misma cuenta.',
  'term.app.h': 'La app (pago único)',
  'term.app.1':
    'Desbloqueo de la app: 8.89 USD, pago único. Desbloquea tu casa para siempre en tu cuenta, sin renovaciones.',
  'term.app.2':
    'Incluye el primer mes: 30 días con los 700 créditos de IA mensuales y la sincronización, sin tarjeta y sin suscripción. Al terminar, conservas la app y tus datos; los créditos mensuales y la sincronización requieren la suscripción.',
  'term.app.3': 'La demo gratuita no guarda nada: es para conocer la app antes de comprarla.',
  'term.local.h': 'Modo local',
  'term.local.p':
    'Con la app desbloqueada, todas sus funciones offline se usan sin costos recurrentes. Los datos se guardan en tu dispositivo, y su respaldo es responsabilidad tuya (Configuraciones → Respaldo de datos).',
  'term.precio.h': 'Suscripción y precio',
  'term.precio.1':
    'Suscripción: 6 USD al mes en el nivel ×1 (o su equivalente en tu moneda), con renovación automática. Los niveles ×2 y ×3 multiplican los créditos y el precio: 12 y 18 USD al mes. También puedes pagar el nivel ×1 por años: 60 USD, con renovación anual automática y los mismos créditos cada mes.',
  'term.precio.2':
    'Incluye 700 créditos de IA al mes por nivel (700 / 1400 / 2100) y sincronización entre dispositivos. Los créditos mensuales no usados no se acumulan al mes siguiente.',
  'term.precio.3':
    'Créditos por operación: 1 por respuesta de texto, 4 por un plan largo, 3 por una imagen (10 en calidad alta) y 10 por un modelo 3D. La tarifa puede ajustarse si cambian los costos de los proveedores de IA; el precio vigente se muestra en la app antes de cada petición.',
  'term.precio.4':
    'Recargas: 6 USD por 700 créditos sueltos, pago único que puedes hacer con o sin suscripción, cuando tú lo pidas — nunca se compran solas. No caducan y se usan cuando los créditos del mes se agotan.',
  'term.precio.5':
    'Límite de uso justo: los créditos cubren un uso normal de la IA. Si en un mes el costo real de tus peticiones supera con mucho el valor de los créditos consumidos, la IA se pausa hasta que el límite se restablece el mes siguiente.',
  'term.precio.6': 'Los pagos los procesan RevenueCat y Stripe.',
  'term.cancelacion.h': 'Cancelación',
  'term.cancelacion.p':
    'Puedes cancelar cuando quieras desde «Gestionar suscripción» en <a href="/cuenta">tu cuenta</a>; conservas el plan hasta el final del periodo pagado. Después, la app sigue funcionando en tus dispositivos en modo local, sin créditos mensuales ni sincronización. Los créditos de recarga que te queden siguen siendo utilizables, y puedes renovar cuando quieras.',
  'term.datos.h': 'Tus datos',
  'term.datos.p':
    'Tus datos son tuyos. La app es local-first: todo vive primero en tu dispositivo. El detalle de qué guardamos y cómo borrarlo está en la <a href="/privacidad">política de privacidad</a>.',
  'term.razonable.h': 'Uso razonable',
  'term.razonable.p':
    'La cuota de créditos de IA es por cuenta personal. No está permitido revender el servicio, compartir la cuenta de forma masiva ni automatizar el consumo de IA fuera de la app.',
  'term.cambios.h': 'Cambios en el servicio',
  'term.cambios.p':
    'Podemos actualizar la app y estos términos; los cambios de precio se avisan con anticipación y nunca se aplican retroactivamente a un periodo ya pagado.',
  'term.contacto.h': 'Contacto',
  'term.contacto.p':
    'Dudas y soporte: <a href="mailto:mindplannerhome@gmail.com">mindplannerhome@gmail.com</a> · <a href="tel:5510132542">55 1013 2542</a>.',
}
