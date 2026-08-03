/**
 * Qué texto tiene que escribir la IA para el ejemplo de fábrica de cada cuarto.
 *
 * Solo va aquí el TEXTO libre (nombres, títulos, notas). Los números, las fechas
 * y los enums los pone el `ejemplos.ts` de cada cuarto: son la parte que tiene
 * que encajar con el modelo de datos y no debe salir de un modelo de lenguaje.
 *
 * Cada clave lleva su descripción: es lo único que ve la IA de ese campo, así
 * que dice para qué sirve, dónde se pinta y cuánto puede medir.
 */

/** Contexto común: cómo tiene que sonar todo lo que se genere. */
export const VOZ = `
Mind Planner Home es una casa isométrica 3D donde cada cuarto es una mini-app de
la vida diaria. Esto es el EJEMPLO DE FÁBRICA de una de esas apps: lo que ve
alguien que la abre por primera vez y le da a «Ver un ejemplo».

Cómo tiene que ser:
- Concreto y creíble, de una persona real: «Sacar el punteo de Blackbird», no
  «Aprender a tocar la guitarra». Los detalles pequeños son los que enseñan para
  qué sirve el campo.
- Cálido y cotidiano, sin sonar a manual ni a texto de relleno. Nada de «Ejemplo
  1», «Lorem ipsum» ni «Mi primera nota».
- Neutro: nada de marcas, personas reales, política, religión, dinero ajeno ni
  nada que pueda incomodar a quien abra la app por primera vez.
- El inglés NO es una traducción literal del español: es el mismo ejemplo escrito
  por alguien que vive en inglés (nombres, comidas y costumbres que peguen).
- Respeta el límite de longitud de cada campo; si dudas, quédate corto.
- Sin emojis (los pone la app) y sin comillas decorativas.
`.trim()

/**
 * @typedef {{ [clave: string]: string }} Claves
 * @typedef {{ cuarto: string, constante: string, app: string, seccion: string, claves: Claves, imagenes?: { clave: string, prompt: string }[] }} Especificacion
 */

/** @type {Especificacion[]} */
export const ESPECIFICACIONES = [
  {
    cuarto: 'hobbies',
    constante: 'TEXTOS_HOBBIES',
    app: 'Hobbies: pasatiempos con sesiones de práctica, racha, heatmap anual y proyectos dentro de cada hobby.',
    seccion: 'Un hobby con tres semanas de práctica y un proyecto en curso.',
    claves: {
      hobby: 'Nombre del hobby. Una o dos palabras, algo que se practique a ratos en casa.',
      proyecto: 'Proyecto concreto dentro de ese hobby, con final visible. Máx. 40 caracteres.',
      notaProyecto:
        'Nota del proyecto: por qué lo hace y qué le falta. Dos frases, máx. 140 caracteres.',
      sesionCorta: 'Nota de una sesión corta de práctica. Máx. 40 caracteres.',
      sesionLarga: 'Nota de una sesión larga y más técnica. Máx. 40 caracteres.',
      sesionHoy: 'Nota de la sesión de hoy, de repaso. Máx. 40 caracteres.',
    },
    imagenes: [
      {
        clave: 'proyecto',
        prompt:
          'Foto cenital de un proyecto casero a medio hacer sobre una mesa de madera clara, luz natural suave, sin personas, sin texto, estilo fotografía real de un cuaderno de proyectos.',
      },
    ],
  },
  {
    cuarto: 'anecdotario',
    constante: 'TEXTOS_ANECDOTARIO',
    app: 'Anecdotario: diario de recuerdos con título, texto, ánimo del día y fotos, más un calendario de ánimo.',
    seccion: 'Tres recuerdos de días distintos de las últimas dos semanas.',
    claves: {
      tituloPaseo: 'Título de un recuerdo tranquilo al aire libre. Máx. 35 caracteres.',
      textoPaseo: 'El recuerdo contado en primera persona. Tres frases, máx. 220 caracteres.',
      tituloCena: 'Título de un recuerdo de una comida con gente querida. Máx. 35 caracteres.',
      textoCena: 'El recuerdo contado en primera persona. Tres frases, máx. 220 caracteres.',
      tituloBache: 'Título de un día regular, de esos que también se apuntan. Máx. 35 caracteres.',
      textoBache:
        'El día contado en primera persona, sin dramatismo y con algo que lo salvó. Tres frases, máx. 220 caracteres.',
    },
    imagenes: [
      {
        clave: 'paseo',
        prompt:
          'Fotografía de un sendero de parque al atardecer con hojas en el suelo, luz dorada, sin personas reconocibles, sin texto, estilo foto de móvil.',
      },
      {
        clave: 'cena',
        prompt:
          'Fotografía cenital de una mesa de cena casera compartida, platos a medio terminar y vasos, luz cálida de interior, sin personas, sin texto.',
      },
    ],
  },
  {
    cuarto: 'jardin',
    constante: 'TEXTOS_JARDIN',
    app: 'Jardín: meditación, respiración y agradecimientos. Suma «calma» acumulada, sin rachas ni puntos.',
    seccion: 'Tres sesiones de práctica y dos días de agradecimientos.',
    claves: {
      sesionManana: 'Nota de una meditación corta de mañana. Máx. 60 caracteres.',
      sesionRespiracion: 'Nota de un ejercicio de respiración en un momento tenso. Máx. 60 caracteres.',
      sesionNoche: 'Nota de una meditación de antes de dormir. Máx. 60 caracteres.',
      graciasA1: 'Primer agradecimiento de un día: algo pequeño y concreto. Máx. 50 caracteres.',
      graciasA2: 'Segundo agradecimiento del mismo día. Máx. 50 caracteres.',
      graciasA3: 'Tercer agradecimiento del mismo día. Máx. 50 caracteres.',
      graciasB1: 'Primer agradecimiento de otro día distinto. Máx. 50 caracteres.',
      graciasB2: 'Segundo agradecimiento de ese día. Máx. 50 caracteres.',
      graciasB3: 'Tercer agradecimiento de ese día. Máx. 50 caracteres.',
    },
  },
  {
    cuarto: 'descanso',
    constante: 'TEXTOS_DESCANSO',
    app: 'Descanso: registro de sueño por noche (horas, calidad 1-5, hora de acostarse y de despertar, interrupciones) con su puntuación.',
    seccion: 'Cinco noches de la última semana, unas buenas y otras malas.',
    claves: {
      notaBuena: 'Nota de una noche que se durmió bien. Máx. 50 caracteres.',
      notaRegular: 'Nota de una noche normalita. Máx. 50 caracteres.',
      notaMala: 'Nota de una noche mala, con el motivo. Máx. 50 caracteres.',
      notaCorta: 'Nota de una noche corta por acostarse tarde. Máx. 50 caracteres.',
      notaSiesta: 'Nota de una noche que se recuperó con una siesta al día siguiente. Máx. 50 caracteres.',
    },
  },
  {
    cuarto: 'entretenimiento',
    constante: 'TEXTOS_ENTRETENIMIENTO',
    app: 'Entretenimiento: archivo de películas, series, libros y videojuegos con género, estado, estrellas y reseña.',
    seccion: 'Cuatro fichas del archivo, una de cada tipo y en estados distintos.',
    claves: {
      peliTitulo: 'Título INVENTADO de una película vista hace poco. Máx. 40 caracteres.',
      peliGenero: 'Género de esa película. Una o dos palabras.',
      peliAutor: 'Nombre INVENTADO de quien la dirige. Máx. 30 caracteres.',
      peliResena: 'Reseña corta en primera persona. Dos frases, máx. 160 caracteres.',
      serieTitulo: 'Título INVENTADO de una serie que se está viendo. Máx. 40 caracteres.',
      serieGenero: 'Género de esa serie. Una o dos palabras.',
      serieResena: 'Reseña corta, va por la mitad. Dos frases, máx. 160 caracteres.',
      libroTitulo: 'Título INVENTADO de un libro terminado. Máx. 40 caracteres.',
      libroGenero: 'Género de ese libro. Una o dos palabras.',
      libroAutor: 'Nombre INVENTADO de quien lo escribe. Máx. 30 caracteres.',
      libroResena: 'Reseña corta en primera persona. Dos frases, máx. 160 caracteres.',
      juegoTitulo: 'Título INVENTADO de un videojuego pendiente. Máx. 40 caracteres.',
      juegoGenero: 'Género de ese videojuego. Una o dos palabras.',
    },
    imagenes: [
      {
        clave: 'pelicula',
        formato: 'vertical',
        prompt:
          'Cartel de cine ficticio que llena todo el lienzo: ilustración gráfica de una carretera de montaña al anochecer con dos coches diminutos, formas planas, tres colores, sin ningún texto ni letra.',
      },
      {
        clave: 'libro',
        formato: 'vertical',
        prompt:
          'Portada de libro ficticia que llena todo el lienzo: ilustración plana y elegante de una casa junto al mar entre acantilados, fondo de color liso, sin ningún texto ni letra.',
      },
    ],
  },
  {
    cuarto: 'sala',
    constante: 'TEXTOS_SALA',
    app: 'Sala (viajes): mapamundi con pines, lugares por conocer con su hoja de plan día a día, rutas y bitácora de lo ya vivido.',
    seccion: 'Un viaje por conocer con tres días de plan, un lugar ya visitado con su recuerdo y una ruta que los une.',
    claves: {
      lugarPendiente: 'Ciudad REAL que se quiere conocer. Solo el nombre de la ciudad.',
      paisPendiente: 'País de esa ciudad.',
      notaPendiente: 'Por qué se quiere ir. Dos frases, máx. 130 caracteres.',
      dia1Destino: 'Destino del primer día del plan. Máx. 30 caracteres.',
      dia1Actividades: 'Qué se hace ese día. Máx. 90 caracteres.',
      dia1Hospedaje: 'Dónde se duerme (tipo de alojamiento, no una marca). Máx. 30 caracteres.',
      dia2Destino: 'Destino del segundo día. Máx. 30 caracteres.',
      dia2Actividades: 'Qué se hace el segundo día. Máx. 90 caracteres.',
      dia3Destino: 'Destino del tercer día. Máx. 30 caracteres.',
      dia3Actividades: 'Qué se hace el tercer día. Máx. 90 caracteres.',
      lugarVisitado: 'Ciudad REAL de otro país que ya se visitó. Solo el nombre.',
      paisVisitado: 'País de esa ciudad.',
      recuerdo: 'Recuerdo de ese viaje, en primera persona. Tres frases, máx. 200 caracteres.',
      ruta: 'Nombre de una ruta que encadena varios lugares. Máx. 35 caracteres.',
    },
    imagenes: [
      {
        clave: 'recuerdo',
        prompt:
          'Fotografía de viaje de una calle estrecha de casco antiguo con balcones y ropa tendida, luz de media tarde, sin personas reconocibles y sin ningún texto ni cartel legible.',
      },
    ],
  },
  {
    cuarto: 'biblioteca',
    constante: 'TEXTOS_BIBLIOTECA',
    app: 'Biblioteca: enciclopedia personal por pilares del conocimiento. Cada entrada tiene título, resumen y puntos clave, y se estudia con un temporizador.',
    seccion: 'Dos entradas de enciclopedia del pilar de filosofía y tres sesiones de estudio.',
    claves: {
      entrada1Titulo: 'Título de una entrada sobre un concepto filosófico conocido. Máx. 45 caracteres.',
      entrada1Resumen: 'Resumen claro de ese concepto, para alguien que empieza. Tres frases, máx. 260 caracteres.',
      entrada1Punto1: 'Punto clave de la entrada. Máx. 90 caracteres.',
      entrada1Punto2: 'Otro punto clave. Máx. 90 caracteres.',
      entrada1Punto3: 'Tercer punto clave. Máx. 90 caracteres.',
      entrada2Titulo: 'Título de otra entrada, sobre una idea distinta del mismo campo. Máx. 45 caracteres.',
      entrada2Resumen: 'Resumen de esa segunda idea. Tres frases, máx. 260 caracteres.',
      entrada2Punto1: 'Punto clave de la segunda entrada. Máx. 90 caracteres.',
      entrada2Punto2: 'Otro punto clave. Máx. 90 caracteres.',
      notaEstudio1: 'Nota de una sesión de estudio: qué se repasó. Máx. 60 caracteres.',
      notaEstudio2: 'Nota de otra sesión, con lo que costó entender. Máx. 60 caracteres.',
      notaEstudio3: 'Nota de una tercera sesión, más corta. Máx. 60 caracteres.',
    },
    imagenes: [
      {
        clave: 'entrada',
        prompt:
          'Ilustración conceptual y abstracta para una entrada de enciclopedia: formas geométricas simples y una figura humana diminuta mirando un horizonte, paleta de tres colores apagados, sin ningún texto.',
      },
    ],
  },
  {
    cuarto: 'idiomas',
    constante: 'TEXTOS_IDIOMAS',
    app: 'Idiomas: un idioma por perfil, tarjetas de vocabulario con repaso espaciado (cajas Leitner), temario por niveles MCER y tutor por chat.',
    seccion:
      'Seis tarjetas de vocabulario de nivel A2 y dos temas del temario. En español el usuario estudia INGLÉS; en inglés, estudia ESPAÑOL.',
    claves: {
      termino1: 'Palabra o expresión cotidiana en el IDIOMA ESTUDIADO (inglés para es, español para en).',
      traduccion1: 'Su traducción al idioma del usuario.',
      ejemplo1: 'Frase de ejemplo en el IDIOMA ESTUDIADO usando ese término. Máx. 70 caracteres.',
      termino2: 'Otra palabra del día a día, en el idioma estudiado.',
      traduccion2: 'Su traducción.',
      ejemplo2: 'Frase de ejemplo en el idioma estudiado. Máx. 70 caracteres.',
      termino3: 'Un verbo corriente, en el idioma estudiado.',
      traduccion3: 'Su traducción.',
      ejemplo3: 'Frase de ejemplo en el idioma estudiado. Máx. 70 caracteres.',
      termino4: 'Una expresión hecha de uso diario, en el idioma estudiado.',
      traduccion4: 'Qué significa, en el idioma del usuario.',
      ejemplo4: 'Frase de ejemplo en el idioma estudiado. Máx. 70 caracteres.',
      termino5: 'Una palabra de comida o casa, en el idioma estudiado.',
      traduccion5: 'Su traducción.',
      ejemplo5: 'Frase de ejemplo en el idioma estudiado. Máx. 70 caracteres.',
      termino6: 'Una palabra de viajes o transporte, en el idioma estudiado.',
      traduccion6: 'Su traducción.',
      ejemplo6: 'Frase de ejemplo en el idioma estudiado. Máx. 70 caracteres.',
      tema1Titulo: 'Título de un tema del temario de nivel A2. Máx. 40 caracteres.',
      tema1Desc: 'Qué se aprende en ese tema. Máx. 110 caracteres.',
      tema2Titulo: 'Título de otro tema de A2, distinto. Máx. 40 caracteres.',
      tema2Desc: 'Qué se aprende en ese tema. Máx. 110 caracteres.',
    },
    imagenes: [
      {
        clave: 'tarjeta',
        prompt:
          'Ilustración mnemotécnica sencilla y luminosa de una taza de café humeante sobre una mesa junto a una ventana, estilo plano de dos colores, sin ningún texto ni letra.',
      },
    ],
  },
  {
    cuarto: 'calendario',
    constante: 'TEXTOS_CALENDARIO',
    app: 'Calendario: rejilla de 0 a 24 h donde se proyectan las rutinas, con sus pasos y su aviso.',
    seccion: 'Dos rutinas: una diaria de mañana y otra semanal de tarde.',
    claves: {
      rutinaManana: 'Nombre de una rutina diaria de primera hora. Máx. 30 caracteres.',
      pasoManana1: 'Primer paso de esa rutina. Máx. 30 caracteres.',
      pasoManana2: 'Segundo paso. Máx. 30 caracteres.',
      pasoManana3: 'Tercer paso. Máx. 30 caracteres.',
      rutinaSemanal: 'Nombre de una rutina de una vez por semana, por la tarde. Máx. 30 caracteres.',
      pasoSemanal1: 'Primer paso de la rutina semanal. Máx. 30 caracteres.',
      pasoSemanal2: 'Segundo paso. Máx. 30 caracteres.',
    },
  },
]

/** La especificación de un cuarto por su id. */
export const especDe = (cuarto) => ESPECIFICACIONES.find((e) => e.cuarto === cuarto)
