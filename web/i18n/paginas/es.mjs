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
  'marca.nombre': 'Planificador Mental-Casa MPH',
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
  'meta.titulo': 'Mind Planner Home — Tu vida, en una casa 3D',
  'meta.desc':
    'Organiza tus hábitos, metas, finanzas, comidas y más en una casa isométrica 3D donde cada cuarto es una app. Un solo pago de 6.99 USD con el primer mes de IA y sincronización incluido; demo gratis.',
  'og.desc':
    'Tu vida, en una casa 3D: hábitos, metas, finanzas, comidas y más. Un pago de 6.99 USD con el primer mes de IA incluido; demo gratis.',

  'hero.h1': 'Tu vida entera,<br />en una casa 3D',
  'hero.sub':
    'Cada cuarto de tu casa es una app: ejercicio, comidas, finanzas, descanso, idiomas, hobbies, metas… Un solo lugar, con un asistente con IA que te acompaña y tu progreso sincronizado en todos tus dispositivos.',
  'hero.cta': 'Descargar la app',
  'hero.demo': 'Probar la demo gratis',
  'hero.nota':
    'La app se compra una vez en la tienda de tu dispositivo y funciona sin conexión. La IA y la sincronización son opcionales — y si las dejas, no pierdes nada.',
  'hero.video': 'Aquí va tu video o capturas de la casa',

  'car.h2': 'Una casa, muchas apps',
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

  'precio.h2': 'Un solo pago en la tienda, tu casa para siempre',
  'precio.demo.nombre': 'Demo',
  'precio.demo.cifra': 'Gratis',
  'precio.demo.1': 'La casa de Pep@ con un año de vida dentro: pruébalo todo',
  'precio.demo.2': 'Sin cuenta, sin tarjeta y sin conexión',
  'precio.demo.3': 'Nada se guarda: al recargar, la casa vuelve a empezar',
  'precio.demo.cta': 'Probar la demo',
  'precio.demo.pie': 'La app completa, para conocerla sin compromiso.',
  'precio.app.nombre': 'La app',
  'precio.app.pagoUnico': 'pago único',
  'precio.app.1': 'Tu propia casa, para siempre: todas las apps, tus datos en tu dispositivo',
  'precio.app.2':
    'Primer mes incluido: 700 créditos de IA + sincronización, sin tarjeta y sin suscripción',
  'precio.app.3':
    'Al terminar el mes conservas la app entera y tus datos; los créditos de IA son opcionales',
  'precio.app.cta': 'Ver dónde descargarla',
  'precio.app.pie':
    'Se compra en Google Play o el App Store, y con tu cuenta la abres también en el navegador. Un pago, sin renovaciones.',

  'ia.t': 'IA y sincronización · opcional',
  'ia.precios': '6 USD al mes<span>·</span>60 USD al año<span>·</span>o 6 USD por 700 créditos sueltos',
  'ia.p':
    'Solo si quieres seguir con la IA y la sincronización cuando termine tu primer mes. Esto sí se contrata aquí, en la web, y vale para todos tus dispositivos. Sin permanencia: si lo dejas, conservas la app y todos tus datos en modo local.',
  'ia.cta': 'Ver los planes →',

  'desc.h2': 'Descargar la app',
  'desc.sub':
    'La app se compra en la tienda de tu dispositivo. Al abrirla registras tu correo, y esa misma cuenta te devuelve tu casa en cualquier otro sitio — incluido el navegador.',
  'desc.pronto': 'Próximamente',
  'desc.android': 'En Google Play, 6.99 USD.',
  'desc.ios.t': 'iPhone y iPad',
  'desc.ios': 'En el App Store, 6.99 USD.',
  'desc.web.t': 'En tu navegador',
  'desc.web':
    'Sin instalar nada: entra con la cuenta con la que compraste la app y tu casa te espera. Sin cuenta puedes probar la demo.',
  'desc.web.cta': 'Abrir la app',
  'desc.windows': 'Instalador para Windows 10/11.',
  'desc.mac': 'Imagen .dmg para Mac.',

  'faq.h2': 'Preguntas frecuentes',
  'faq.1.q': '¿Dónde se compra la app?',
  'faq.1.a':
    'En la tienda de tu dispositivo: Google Play o el App Store. Aquí en la web no se vende — lo único que se paga en esta página son la suscripción de IA y las recargas de créditos. Al abrir la app registras tu correo, y con esa cuenta tu casa aparece en cualquier otro dispositivo, también en el <a href="#descargas">navegador</a>.',
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
    'Primero en tu dispositivo (la app es local-first) y, con la sincronización activa, también en la nube para pasar de un dispositivo a otro. En modo local no sale nada de tu dispositivo. La compra de la app la cobra la tienda (Google Play o App Store) y la suscripción la procesan RevenueCat y Stripe: nunca vemos tu tarjeta. Más detalles en la <a href="/privacidad">política de privacidad</a>.',
  'faq.7.q': '¿En qué dispositivos funciona?',
  'faq.7.a':
    'Hoy: en cualquier navegador moderno. Muy pronto: Android (Google Play), iPhone/iPad (App Store), Windows y macOS. Tu cuenta vale para todos — compras la app una vez en la tienda y la suscripción de IA se contrata aquí en la web; las dos funcionan en cualquier dispositivo donde entres con tu correo.',
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
    'Mind Planner Home («la app») es una aplicación de organización personal. Contacto: <a href="mailto:macr120cme@gmail.com">macr120cme@gmail.com</a>.',
  'priv.datos.h': 'Qué datos recopilamos',
  'priv.datos.1':
    '<strong>Cuenta:</strong> tu correo electrónico y una contraseña cifrada, gestionados por Supabase (nuestro proveedor de backend).',
  'priv.datos.2':
    '<strong>Datos de la app:</strong> lo que registras en tus cuartos (rutinas, comidas, finanzas, notas, fotos…). Viven primero en tu dispositivo y, con la sincronización activa, se sincronizan cifrados en tránsito con nuestros servidores para que tu casa te siga entre dispositivos.',
  'priv.datos.3':
    '<strong>Pagos:</strong> los procesan RevenueCat y Stripe. Nunca vemos ni almacenamos tu tarjeta; recibimos solo el estado de tu compra y de tu suscripción.',
  'priv.datos.4':
    '<strong>Uso de IA:</strong> contadores de créditos consumidos (no el contenido de tus conversaciones, que se envía a los proveedores de IA únicamente para generar cada respuesta y no se usa para entrenar).',
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
    'Desbloqueo de la app: 6.99 USD, pago único. Desbloquea tu casa para siempre en tu cuenta, sin renovaciones.',
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
    'Dudas y soporte: <a href="mailto:macr120cme@gmail.com">macr120cme@gmail.com</a>.',
}
