/**
 * Especificaciones del CONTENIDO del año demo (la vida de Pep@), por app.
 *
 * `PERSONAJE` es el canon compartido: todas las apps generan contra la misma
 * biografía y el mismo arco mes a mes, para que la historia cruce entre apps
 * (el diario menciona el maratón, las finanzas pagan Japón, etc.).
 *
 * Cada especificación declara su ESQUEMA tipado (arrays de objetos con `dia`
 * como offset −364..0 respecto a hoy; los builders lo resuelven contra la
 * fecha real al construir). Para colecciones largas se declara `trozos`: cada
 * trozo se genera en una llamada aparte (recibiendo un resumen de lo previo
 * para continuidad) y el script concatena los arrays.
 *
 * Las especificaciones se van llenando POR GRUPOS (G1: ejercicio, cocina,
 * descanso; G2: anecdotario, jardín, hobbies, ideas; …) — ver el plan.
 */

export const PERSONAJE = `Eres el autor del contenido demo de Mind Planner Home:
un año de vida REGISTRADA por Pep@ en su app. Escribe como Pep@ (primera persona
en diarios y notas), concreto y humano, sin cursilería ni frases de póster.

QUIÉN ES PEP@ (canon fijo, no lo contradigas):
- 25 años, género neutro (nunca uses palabras con género para Pep@; en inglés, they).
- Barista de medio tiempo en una cafetería (turnos L/M/V, sueldo quincenal
  modesto + propinas variables). Estudia Física medio tiempo (labs, parciales,
  proyecto semestral).
- Arco del año: llegó FRUSTRAD@ por la vida moderna y decidió reconectarse
  consigo mism@ registrando su progreso. El año de datos empieza hace 12 meses,
  cuando empezó a usar la app, y termina HOY.
- Cuerpo: de cero a correr; bajó 7 kg (74 → 67). Corrió 5K (mes 4), 10K (mes 5),
  medio maratón (mes 11) y el MARATÓN COMPLETO hace ~2 semanas.
- Piano desde cero (teclado usado, mes 2): proyecto del año «Clair de Lune»
  completa, tocada para su familia en el mes 12. Hobby menor: astrofotografía.
- Idiomas: si la interfaz está en español, Pep@ aprende INGLÉS (A2→B1); si está
  en inglés, aprende ESPAÑOL. Además, «japonés de supervivencia» antes del viaje.
- Viaje: JAPÓN, 3 semanas, mes 9 (Tokio – Hakone/Fuji – Kioto – Nara – Osaka –
  Hiroshima), ahorrado durante todo el año. Bitácora diaria con fotos.
- Gustos: cine de ciencia ficción, té y café de especialidad. Gata: Laika.
- Vehículos: bici diaria + un coche usado viejo (talleres, trámites).

EL AÑO MES A MES (M1 = hace 12 meses … M12 = hoy):
M1 frustración, primeras entradas crudas, duerme a la 1–2 am, finanzas caóticas.
M2 primer orden: presupuesto, rutina de sueño, trote suelto, llega el teclado.
M3 plan 5K, meditación 3×/sem, dieta arranca (74 kg), tarjetas de idioma diarias.
M4 primera carrera 5K ✓; decide Japón (mes 9) → ahorro formal + japonés básico.
M5 10K ✓, −2 kg, primera pieza fácil al piano completa.
M6 tracción: 15K en plan, −3 kg, ahorro al 50 %, renueva el pasaporte.
M7 EL BACHE: lesión de rodilla (3 semanas sin correr), gasto imprevisto del
   coche, diario frustrado; lo sostienen la meditación y el piano.
M8 recuperación con fisioterapia, vuelve a correr progresivo, itinerario cerrado.
M9 JAPÓN (3 semanas): bitácora diaria, gasto del ahorro, práctica del idioma;
   las rutinas de casa en pausa (huecos honestos en las rachas).
M10 vuelta renovada: plan de medio maratón, −5 kg, «Clair de Lune» por secciones.
M11 medio maratón ✓ (21K), −6 kg, diagrama «¿posgrado o trabajo?».
M12 maratón ✓ hace ~2 semanas, −7 kg (67), «Clair de Lune» para la familia.
    Metas vivas: fondo de emergencia, siguiente pieza, «próximo viaje: Corea».

REGLAS DE FORMA:
- Los días son OFFSETS: \`dia\` es un entero −364..0 (0 = hoy). Mes N ≈ días
  −364+30(N−1) .. −364+30N. Respeta el arco (nada de correr en el bache M7 ni
  rutinas de casa durante Japón).
- Español (es) e inglés (en) cuentan la MISMA historia, cada uno escrito con
  naturalidad en su idioma (no traducción literal).
- Nada de emojis. Nombres propios verosímiles y neutros.`

/**
 * @typedef {Object} EspecDemo
 * @property {string} app         plantillaId y carpeta src/rooms/<app>/
 * @property {string} constante   nombre del export en demo.data.ts (DEMO_X)
 * @property {string} descripcion qué contiene y cómo lo usa el builder
 * @property {object} esquema     JSON Schema del contenido de UN idioma
 * @property {{id: string, instrucciones: string}[]} [trozos] generación por partes
 * @property {{clave: string, prompt: string, formato?: 'cuadrada'|'vertical'}[]} [imagenes]
 */

// Sin minimum/maximum: structured outputs no los soporta en enteros; el rango
// −364..0 lo revisa `validar()` del script.
const dia = { type: 'integer', description: 'offset del día, entero −364..0 (0 = hoy)' }

/** @type {EspecDemo[]} */
export const ESPECIFICACIONES_DEMO = [
  // ── G2 · Anecdotario: la columna vertebral narrativa del año ─────────────
  {
    app: 'anecdotario',
    constante: 'DEMO_ANECDOTARIO',
    descripcion:
      'El diario personal de Pep@: ~120 entradas (2-3 por semana) que cuentan TODO el arco en primera persona. ' +
      'Cada entrada: titulo corto (máx 8 palabras), texto de 3-6 frases, animo del catálogo. ' +
      'El campo opcional `foto` marca la entrada del HITO correspondiente (una sola entrada por clave en todo el año): ' +
      'teclado = llega el teclado usado (mes 2); laika = llega la gata Laika (mes 3); ' +
      'japon-torii = primer día en Japón (mes 9); japon-mercado = un mercado callejero japonés (mes 9); ' +
      'medalla = el maratón completado (día ≈ -14).',
    esquema: {
      type: 'object',
      properties: {
        entradas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              titulo: { type: 'string' },
              texto: { type: 'string', description: '3-6 frases en primera persona, concretas' },
              animo: { type: 'string', enum: ['😀', '🙂', '😐', '😔', '😣', '🤩', '😴'] },
              foto: {
                type: 'string',
                enum: ['teclado', 'laika', 'japon-torii', 'japon-mercado', 'medalla'],
                description: 'SOLO en la entrada del hito correspondiente',
              },
            },
            required: ['dia', 'titulo', 'texto', 'animo'],
            additionalProperties: false,
          },
        },
      },
      required: ['entradas'],
      additionalProperties: false,
    },
    trozos: [
      {
        id: 'q1',
        instrucciones:
          'Meses 1-3 (días -364..-274): frustración inicial (ánimos 😔😣😐), primer orden, llega el teclado (foto), ' +
          'llega Laika (foto), arranca la meditación y el plan 5K. ~30 entradas.',
      },
      {
        id: 'q2',
        instrucciones:
          'Meses 4-6 (días -273..-184): primera carrera 5K, decide Japón, 10K, primera pieza al piano, ' +
          'ahorro al 50 %, pasaporte. Ánimos que mejoran (🙂😀). ~30 entradas.',
      },
      {
        id: 'q3',
        instrucciones:
          'Meses 7-9 (días -183..-94): EL BACHE (lesión de rodilla, gasto del coche, ánimos 😣😔; la meditación y el ' +
          'piano sostienen), recuperación con fisio, y JAPÓN (días ≈ -124..-99, entradas casi diarias del viaje, ' +
          'fotos japon-torii y japon-mercado, ánimos 🤩😀). ~32 entradas.',
      },
      {
        id: 'q4',
        instrucciones:
          'Meses 10-12 (días -93..0): remontada, medio maratón, MARATÓN (día ≈ -14, foto medalla, ánimo 🤩), ' +
          '«Clair de Lune» para la familia, cierre reflexivo mirando el año y metas nuevas. ~28 entradas.',
      },
    ],
    imagenes: [
      { clave: 'teclado', prompt: 'Used electric piano keyboard in a small cozy apartment corner, warm lamp light, slightly worn keys, no people' },
      { clave: 'laika', prompt: 'Small gray cat curled on a windowsill next to physics textbooks, soft morning light, no people' },
      { clave: 'japon-torii', prompt: 'Red torii gates path in Japan, early morning mist, travel photo style, no people', formato: 'vertical' },
      { clave: 'japon-mercado', prompt: 'Japanese street food market at dusk, lanterns and steam, travel snapshot, no people' },
      { clave: 'medalla', prompt: 'Marathon finisher medal with ribbon on a wooden desk next to worn running shoes, soft light, no people' },
    ],
  },

  // ── G2 · Jardín: notas de práctica y gratitudes ──────────────────────────
  {
    app: 'jardin',
    constante: 'DEMO_JARDIN',
    descripcion:
      'Mindfulness de Pep@ (empieza en el mes 3). `notasSesion`: ~24 notas breves (1-2 frases) de sesiones de ' +
      'meditación o respiración repartidas por el año — el builder crea las demás sesiones sin nota. ' +
      'Más notas durante el bache del mes 7 (la meditación lo sostiene). ' +
      '`gratitudes`: ~90 días (2-3 por semana desde el mes 3, pausa en Japón) con 3 agradecimientos cortos y ' +
      'concretos cada uno (item3 puede ir vacío a veces); que reflejen el momento del año (el teclado, Laika, ' +
      'la rodilla sanando, Japón al volver, la medalla).',
    esquema: {
      type: 'object',
      properties: {
        notasSesion: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tipo: { type: 'string', enum: ['meditacion', 'respiracion'] },
              nota: { type: 'string', description: '1-2 frases sobre cómo se sintió la práctica' },
            },
            required: ['dia', 'tipo', 'nota'],
            additionalProperties: false,
          },
        },
        gratitudes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              item1: { type: 'string' },
              item2: { type: 'string' },
              item3: { type: 'string', description: 'puede ir vacío' },
            },
            required: ['dia', 'item1', 'item2', 'item3'],
            additionalProperties: false,
          },
        },
      },
      required: ['notasSesion', 'gratitudes'],
      additionalProperties: false,
    },
    trozos: [
      {
        id: 's1',
        instrucciones:
          'Meses 3-7 (días -304..-154): arranque tímido, y el BACHE del mes 7 donde la práctica se vuelve casi ' +
          'diaria y las notas más honestas. ~12 notasSesion y ~45 gratitudes.',
      },
      {
        id: 's2',
        instrucciones:
          'Meses 8-12 (días -153..0): recuperación, pausa en Japón (sin gratitudes días -124..-99), y cierre ' +
          'agradecido del año. ~12 notasSesion y ~45 gratitudes.',
      },
    ],
  },

  // ── G2 · Hobbies: notas de piano/astrofoto y sus proyectos ───────────────
  {
    app: 'hobbies',
    constante: 'DEMO_HOBBIES',
    descripcion:
      'Los dos hobbies de Pep@. `notasPiano`: ~30 notas breves (1 frase) de sesiones de piano del mes 2 al 12 ' +
      '(progresión real: de no saber nada a tocar «Clair de Lune»; pausa en Japón). ' +
      '`sesionesAstro`: ~15 salidas de astrofotografía (≈1 por mes desde el mes 3, cerca de luna llena), cada una ' +
      'CON nota de 1-2 frases (qué fotografió, cómo salió; alguna nublada y fallida). ' +
      '`proyectos`: la nota descriptiva de cada proyecto (2-4 frases): primeraPieza (Himno a la alegría, terminado ' +
      'mes 5), clairDeLune (el proyecto del año, terminado hace ~1 semana) y doceLunas (fotografiar 12 lunas llenas, ' +
      'en curso, 10 de 12).',
    esquema: {
      type: 'object',
      properties: {
        notasPiano: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, nota: { type: 'string' } },
            required: ['dia', 'nota'],
            additionalProperties: false,
          },
        },
        sesionesAstro: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, nota: { type: 'string' } },
            required: ['dia', 'nota'],
            additionalProperties: false,
          },
        },
        proyectos: {
          type: 'object',
          properties: {
            primeraPieza: { type: 'string' },
            clairDeLune: { type: 'string' },
            doceLunas: { type: 'string' },
          },
          required: ['primeraPieza', 'clairDeLune', 'doceLunas'],
          additionalProperties: false,
        },
      },
      required: ['notasPiano', 'sesionesAstro', 'proyectos'],
      additionalProperties: false,
    },
    imagenes: [
      { clave: 'partitura', prompt: 'Sheet music of Clair de Lune on an electric keyboard stand, pencil marks on the pages, warm evening light, no people' },
      { clave: 'luna-1', prompt: 'Detailed full moon photographed with a telephoto lens, craters visible, black sky, amateur astrophotography' },
      { clave: 'luna-2', prompt: 'Full moon rising over city rooftops at night, amateur astrophotography, slight grain, no people' },
    ],
  },

  // ── G2 · Ideas: diario de ideas y lluvias temáticas ──────────────────────
  {
    app: 'ideas',
    constante: 'DEMO_IDEAS',
    descripcion:
      'El diario de ideas de Pep@. `sueltas`: ~90 ideas cortas (1 frase, a veces con `detalle` de 1-2 frases) ' +
      'repartidas todo el año: ocurrencias de física, de la cafetería, del entrenamiento, del piano, de Japón, de ' +
      'la vida. Unas 10 marcadas `favorita`. ' +
      '`lluvias`: exactamente 5 lluvias temáticas, cada una con `tema` corto y 6-9 ideas: ' +
      'nombres para la gata (mes 3, gana Laika), cómo pagar Japón (mes 4), ideas para el proyecto semestral de ' +
      'física (mes 5), qué llevar a Japón (mes 8) y regalos de fin de año (mes 11).',
    esquema: {
      type: 'object',
      properties: {
        sueltas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              texto: { type: 'string' },
              detalle: { type: 'string' },
              favorita: { type: 'boolean' },
            },
            required: ['dia', 'texto'],
            additionalProperties: false,
          },
        },
        lluvias: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tema: { type: 'string', description: 'máx 4 palabras' },
              textos: { type: 'array', items: { type: 'string' }, description: '6-9 ideas' },
            },
            required: ['dia', 'tema', 'textos'],
            additionalProperties: false,
          },
        },
      },
      required: ['sueltas', 'lluvias'],
      additionalProperties: false,
    },
    trozos: [
      {
        id: 's1',
        instrucciones:
          'Meses 1-6 (días -364..-184): ~45 sueltas + las lluvias de la gata (mes 3), Japón (mes 4) y el proyecto ' +
          'semestral (mes 5).',
      },
      {
        id: 's2',
        instrucciones:
          'Meses 7-12 (días -183..0): ~45 sueltas + las lluvias de qué llevar a Japón (mes 8) y regalos (mes 11).',
      },
    ],
  },

  // ── G3 · Biblioteca: la carrera de Física de Pep@ ────────────────────────
  {
    app: 'biblioteca',
    constante: 'DEMO_BIBLIOTECA',
    descripcion:
      'Lo que Pep@ estudió y guardó en su enciclopedia personal durante el año de la carrera de Física. ' +
      '`entradas`: ~20 fichas de wiki propias, cada una con titulo, resumen (2-4 frases con voz propia, no de manual) ' +
      'y 3 puntosClave breves. Siguen el temario del año: mecánica (meses 1-3), termodinámica (meses 4-6), ' +
      'relatividad y astrofísica (meses 8-12), más estadística/análisis sueltos y UNA sobre la física del sonido del ' +
      'piano (mes 10, cruza con su hobby). El campo `foto` marca solo dos: agujero-negro (una entrada de relatividad ' +
      'del mes 11) y ondas (la del sonido del piano). ' +
      '`charlas`: 5 conversaciones con el tutor IA — pregunta real de Pep@ (1-2 frases, con sus dudas concretas) y ' +
      'respuesta clara de 3-5 frases; cada una con 2 `ramas`: títulos cortos de subtemas que la charla le abrió. ' +
      '`notasEstudio`: ~16 notas de una frase de sesiones de estudio (qué repasó, cómo le fue), repartidas todo el ' +
      'año salvo las 3 semanas de Japón. ' +
      '`metas`: nombre de dos metas de estudio — `termo` (terminar termodinámica antes del parcial del mes 6, ' +
      'cumplida) y `posgrado` (preparar la solicitud de posgrado, en curso desde el mes 10).',
    esquema: {
      type: 'object',
      properties: {
        entradas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tema: {
                type: 'string',
                enum: [
                  'nat-mecanica',
                  'nat-termodinamica',
                  'nat-relatividad',
                  'nat-cuantica',
                  'mat-analisis',
                  'mat-stats',
                ],
              },
              titulo: { type: 'string' },
              resumen: { type: 'string', description: '2-4 frases, voz de Pep@' },
              puntosClave: { type: 'array', items: { type: 'string' }, description: 'exactamente 3' },
              foto: {
                type: 'string',
                enum: ['agujero-negro', 'ondas'],
                description: 'SOLO en las dos entradas del hito',
              },
            },
            required: ['dia', 'tema', 'titulo', 'resumen', 'puntosClave'],
            additionalProperties: false,
          },
        },
        charlas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              titulo: { type: 'string', description: 'máx 6 palabras' },
              pregunta: { type: 'string' },
              respuesta: { type: 'string', description: '3-5 frases' },
              ramas: { type: 'array', items: { type: 'string' }, description: 'exactamente 2 títulos cortos' },
            },
            required: ['dia', 'titulo', 'pregunta', 'respuesta', 'ramas'],
            additionalProperties: false,
          },
        },
        notasEstudio: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, nota: { type: 'string' } },
            required: ['dia', 'nota'],
            additionalProperties: false,
          },
        },
        metas: {
          type: 'object',
          properties: { termo: { type: 'string' }, posgrado: { type: 'string' } },
          required: ['termo', 'posgrado'],
          additionalProperties: false,
        },
      },
      required: ['entradas', 'charlas', 'notasEstudio', 'metas'],
      additionalProperties: false,
    },
    imagenes: [
      {
        clave: 'agujero-negro',
        prompt:
          'Hand-drawn notebook diagram of a black hole with its accretion disk and light bending, pencil and blue ink on grid paper, no people',
      },
      {
        clave: 'ondas',
        prompt:
          'Notebook page with hand-drawn sound wave and harmonic series diagrams next to a piano key sketch, pencil on grid paper, no people',
      },
    ],
  },

  // ── G3 · Idiomas: el idioma principal y el japonés del viaje ─────────────
  {
    app: 'idiomas',
    constante: 'DEMO_IDIOMAS',
    descripcion:
      'El vocabulario que Pep@ estudió en el año. OJO al idioma de salida: en la versión `es` Pep@ aprende INGLÉS ' +
      '(termino en inglés, traduccion en español); en la versión `en` aprende ESPAÑOL (termino en español, ' +
      'traduccion en inglés). En AMBAS versiones el segundo idioma es japonés de supervivencia. ' +
      '`tarjetas`: ~50 del idioma principal repartidas de mes 1 a mes 12, subiendo de nivel (A2 al principio, B1 al ' +
      'final) y de tema. `ejemplo` es una frase natural que DEBE CONTENER el término tal cual (se usa para huecos). ' +
      '`tarjetasJa`: ~18 de japonés de supervivencia (romaji en `termino`, p. ej. "sumimasen"; `lectura` con los ' +
      'caracteres japoneses), creadas entre el mes 4 y el mes 9, útiles para el viaje. ' +
      '`temas`: 3 temas propios que Pep@ añadió a su temario (titulo + descripcion de 1 frase). ' +
      '`charla`: una conversación con el tutor (pregunta de Pep@ y respuesta del tutor, 3-5 frases, en la lengua del ' +
      'usuario con ejemplos en el idioma meta). `materiales`: 2 apuntes propios (titulo máx 6 palabras + texto de ' +
      '3-5 líneas) — uno de frases para el check-in del hotel y otro de vocabulario de la cafetería.',
    esquema: {
      type: 'object',
      properties: {
        tarjetas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              termino: { type: 'string' },
              traduccion: { type: 'string' },
              ejemplo: { type: 'string', description: 'frase que CONTIENE el término tal cual' },
              tipo: { type: 'string', enum: ['palabra', 'frase', 'expresion'] },
              nivel: { type: 'string', enum: ['A2', 'B1'] },
              tema: {
                type: 'string',
                enum: [
                  'a2-compras',
                  'a2-direcciones',
                  'a2-salud',
                  'a2-pasado',
                  'b1-trabajo',
                  'b1-opiniones',
                  'b1-historias',
                  'b1-viajes',
                ],
              },
            },
            required: ['dia', 'termino', 'traduccion', 'ejemplo', 'tipo', 'nivel', 'tema'],
            additionalProperties: false,
          },
        },
        tarjetasJa: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              termino: { type: 'string', description: 'romaji' },
              lectura: { type: 'string', description: 'los caracteres japoneses' },
              traduccion: { type: 'string' },
              tipo: { type: 'string', enum: ['palabra', 'frase', 'expresion'] },
            },
            required: ['dia', 'termino', 'lectura', 'traduccion', 'tipo'],
            additionalProperties: false,
          },
        },
        temas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              titulo: { type: 'string' },
              descripcion: { type: 'string' },
              nivel: { type: 'string', enum: ['A2', 'B1'] },
            },
            required: ['dia', 'titulo', 'descripcion', 'nivel'],
            additionalProperties: false,
          },
        },
        charla: {
          type: 'object',
          properties: {
            dia,
            titulo: { type: 'string' },
            pregunta: { type: 'string' },
            respuesta: { type: 'string' },
          },
          required: ['dia', 'titulo', 'pregunta', 'respuesta'],
          additionalProperties: false,
        },
        materiales: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tema: { type: 'string', enum: ['b1-viajes', 'b1-trabajo'] },
              titulo: { type: 'string' },
              texto: { type: 'string' },
            },
            required: ['dia', 'tema', 'titulo', 'texto'],
            additionalProperties: false,
          },
        },
      },
      required: ['tarjetas', 'tarjetasJa', 'temas', 'charla', 'materiales'],
      additionalProperties: false,
    },
    trozos: [
      {
        id: 's1',
        instrucciones:
          'Meses 1-6 (días -364..-184): ~25 tarjetas del idioma principal (nivel A2, temas a2-*), las primeras ~8 ' +
          'de japonés (desde el mes 4, cuando decide el viaje), los 3 temas propios y la charla del tutor.',
      },
      {
        id: 's2',
        instrucciones:
          'Meses 7-12 (días -183..0): ~25 tarjetas más del principal (ya nivel B1, temas b1-*, varias nacidas EN ' +
          'Japón sobre viajar), ~10 de japonés (meses 7-9, ninguna después del viaje) y los 2 materiales propios.',
      },
    ],
  },

  // ── G3 · Agenda: trabajo, salud y personas del año ───────────────────────
  {
    app: 'agenda',
    constante: 'DEMO_AGENDA',
    descripcion:
      'La agenda real de Pep@ durante el año. `trabajo`: ~18 eventos entre turnos especiales de la cafetería, ' +
      'parciales y entregas de laboratorio (meses 2, 5, 8 y 11), reuniones del proyecto semestral y trámites; ' +
      'títulos concretos de máx 6 palabras, con `lugar` cuando tenga sentido. ' +
      '`salud`: ~12 citas — nutrición cada pocos meses, las 6 sesiones de fisioterapia del bache (mes 7-8), ' +
      'dentista, revisión general y las visitas al veterinario de Laika. ' +
      '`personas`: ~12 planes con gente (cafés, cenas familiares, cumpleaños, el concierto para la familia del mes ' +
      '12) con el nombre de la persona en `con`. ' +
      '`pendientes`: 5 tareas de trabajo SIN fecha (bandeja de pendientes), texto corto. ' +
      '`contactos`: 8 personas del círculo de Pep@ con nombre completo verosímil y `relacion` (Familia, Amistades, ' +
      'Trabajo o Universidad).',
    esquema: {
      type: 'object',
      properties: {
        trabajo: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, titulo: { type: 'string' }, lugar: { type: 'string' } },
            required: ['dia', 'titulo'],
            additionalProperties: false,
          },
        },
        salud: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, titulo: { type: 'string' }, lugar: { type: 'string' } },
            required: ['dia', 'titulo'],
            additionalProperties: false,
          },
        },
        personas: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, titulo: { type: 'string' }, con: { type: 'string' } },
            required: ['dia', 'titulo', 'con'],
            additionalProperties: false,
          },
        },
        pendientes: { type: 'array', items: { type: 'string' } },
        contactos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              relacion: { type: 'string', enum: ['Familia', 'Amistades', 'Trabajo', 'Universidad'] },
            },
            required: ['nombre', 'relacion'],
            additionalProperties: false,
          },
        },
      },
      required: ['trabajo', 'salud', 'personas', 'pendientes', 'contactos'],
      additionalProperties: false,
    },
  },

  // ── G4 · Despacho: la voz de las finanzas (los números los pone el builder) ─
  {
    app: 'despacho',
    constante: 'DEMO_DESPACHO',
    descripcion:
      'Las notas de las finanzas de Pep@ (México, pesos). NUNCA menciones montos ni fechas: los pone el builder. ' +
      '`plantillas`: para cada categoría, 6-10 notas cortísimas (máx 5 palabras) que el builder ROTA sobre las ' +
      'cientos de transacciones del año — tienen que sonar a lo que un barista estudiante apunta de verdad ' +
      '(«despensa de la semana», «café de grano», «recarga del metro»), no a etiquetas de contabilidad. ' +
      '`hitos`: la nota de los movimientos que CUENTAN la historia, una frase cada uno, con emoción cuando toca; ' +
      'la de `averiaCoche` es el golpe del mes 7 y debe doler, la de `vueloJapon` es el momento en que se hizo real. ' +
      '`metas`: el nombre de las cuatro metas del despacho (la de Japón ya cumplida, el fondo de emergencia en curso, ' +
      'una inversión pequeña en CETES y la deuda de la avería ya saldada).',
    esquema: {
      type: 'object',
      properties: {
        plantillas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoria: {
                type: 'string',
                enum: ['comida', 'transporte', 'hogar', 'ocio', 'salud', 'compras', 'servicios', 'propinas'],
              },
              notas: { type: 'array', items: { type: 'string' }, description: '6-10 notas de máx 5 palabras' },
            },
            required: ['categoria', 'notas'],
            additionalProperties: false,
          },
        },
        hitos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: {
                type: 'string',
                enum: [
                  'sueldoQuincena', 'clasesFisica', 'renta', 'internetLuz', 'celular', 'streaming', 'polizaMensual',
                  'tenisCorrer', 'insc5k', 'insc10k', 'insc21k', 'inscMaraton', 'pasaporte', 'mochilaViaje',
                  'vueloJapon', 'jrPass', 'hospedajeJapon', 'gastoJapon', 'averiaCoche', 'fisioterapia',
                  'llantas', 'servicioMayor', 'tenencia', 'aguinaldo', 'regaloFamilia', 'veterinarioLaika',
                ],
              },
              nota: { type: 'string', description: 'una frase, máx 12 palabras' },
            },
            required: ['clave', 'nota'],
            additionalProperties: false,
          },
        },
        metas: {
          type: 'object',
          properties: {
            japon: { type: 'string' },
            emergencia: { type: 'string' },
            inversion: { type: 'string' },
            deuda: { type: 'string' },
          },
          required: ['japon', 'emergencia', 'inversion', 'deuda'],
          additionalProperties: false,
        },
      },
      required: ['plantillas', 'hitos', 'metas'],
      additionalProperties: false,
    },
  },

  // ── G4 · Sala: el viaje de su vida y el que viene ────────────────────────
  {
    app: 'sala',
    constante: 'DEMO_SALA',
    descripcion:
      'El viaje de Pep@ a Japón y lo que sueña después. ' +
      '`itinerarioJapon`: EXACTAMENTE 21 filas (n = 1..21) del viaje real de tres semanas: Tokio (1-5), ' +
      'Hakone y el lago Kawaguchi (6-7), Kioto (8-13, con Nara de excursión), Osaka (14-15), Hiroshima y ' +
      'Miyajima (16-17), vuelta por Osaka y Tokio (18-20) y el vuelo de regreso (21). `destino` es ' +
      '«Ciudad · barrio o sitio», `hospedaje` un nombre verosímil de hostal, ryokan o machiya, `actividades` ' +
      '1-2 frases de lo que HIZO (no lista de guía turística) y `transporte` corto. ' +
      '`itinerarioCorea`: 8 filas del próximo viaje (Seúl y Busan) en tono de PLAN, no de recuerdo. ' +
      '`recuerdos`: 10 entradas de bitácora en primera persona (4-7 frases, sensoriales y concretas: olores, ' +
      'comida, lo que salió mal, la gente); 8 son de Japón (cada una con su `foto`) y 2 de México ' +
      '(Oaxaca en el mes 3, Valle de Bravo en el mes 11). ' +
      '`lugares`: la nota de una frase de cada lugar del mapa, incluidos los tres por conocer.',
    esquema: {
      type: 'object',
      properties: {
        itinerarioJapon: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              n: { type: 'integer', description: 'número de día del plan, 1..21' },
              inicio: { type: 'string' },
              destino: { type: 'string' },
              hospedaje: { type: 'string' },
              actividades: { type: 'string' },
              transporte: { type: 'string' },
            },
            required: ['n', 'inicio', 'destino', 'hospedaje', 'actividades', 'transporte'],
            additionalProperties: false,
          },
        },
        itinerarioCorea: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              n: { type: 'integer', description: 'número de día del plan, 1..8' },
              inicio: { type: 'string' },
              destino: { type: 'string' },
              hospedaje: { type: 'string' },
              actividades: { type: 'string' },
              transporte: { type: 'string' },
            },
            required: ['n', 'inicio', 'destino', 'hospedaje', 'actividades', 'transporte'],
            additionalProperties: false,
          },
        },
        recuerdos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              lugar: {
                type: 'string',
                enum: ['tokio', 'hakone', 'kioto', 'nara', 'osaka', 'hiroshima', 'oaxaca', 'valle'],
              },
              texto: { type: 'string', description: '4-7 frases en primera persona' },
              foto: {
                type: 'string',
                enum: [
                  'japon-fuji', 'japon-shibuya', 'japon-kioto-bambu', 'japon-nara',
                  'japon-hiroshima', 'japon-kioto-calle', 'japon-osaka-noche',
                  'mexico-oaxaca', 'mexico-valle',
                ],
              },
            },
            required: ['dia', 'lugar', 'texto'],
            additionalProperties: false,
          },
        },
        lugares: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: {
                type: 'string',
                enum: [
                  'tokio', 'hakone', 'kawaguchiko', 'kioto', 'nara', 'osaka', 'hiroshima',
                  'oaxaca', 'valle', 'seul', 'patagonia', 'islandia',
                ],
              },
              nota: { type: 'string', description: 'una frase' },
            },
            required: ['clave', 'nota'],
            additionalProperties: false,
          },
        },
      },
      required: ['itinerarioJapon', 'itinerarioCorea', 'recuerdos', 'lugares'],
      additionalProperties: false,
    },
    trozos: [
      {
        id: 'viaje',
        instrucciones:
          'Genera SOLO `itinerarioJapon` (las 21 filas) y los 8 `recuerdos` de Japón (días -124..-104, cada uno ' +
          'con su `foto` distinta). En `itinerarioCorea`, `lugares` y los recuerdos de México deja un único ' +
          'elemento mínimo: se completan en el segundo trozo.',
      },
      {
        id: 'resto',
        instrucciones:
          'Ahora `itinerarioCorea` (8 filas del plan a Seúl y Busan), los 12 `lugares` con su nota y los 2 ' +
          '`recuerdos` de México: Oaxaca (día ≈ -280, con foto mexico-oaxaca) y Valle de Bravo (día ≈ -40, ' +
          'con foto mexico-valle). Deja `itinerarioJapon` con un solo elemento mínimo.',
      },
    ],
    imagenes: [
      { clave: 'japon-fuji', prompt: 'Mount Fuji across Lake Kawaguchi at dawn, still water, amateur travel photo, no people' },
      { clave: 'japon-shibuya', prompt: 'Shibuya crossing at night in the rain, neon reflections on wet asphalt, travel snapshot, no recognizable faces', formato: 'vertical' },
      { clave: 'japon-kioto-bambu', prompt: 'Arashiyama bamboo grove path, early morning light through the stalks, empty, no people', formato: 'vertical' },
      { clave: 'japon-nara', prompt: 'Sika deer standing on a gravel path near a wooden temple gate in Nara, soft light, no people' },
      { clave: 'japon-hiroshima', prompt: 'Floating torii gate of Itsukushima shrine at high tide, overcast sky, calm sea, no people' },
      { clave: 'japon-kioto-calle', prompt: 'Narrow machiya street in Kyoto at dusk, wooden facades and paper lanterns, wet stones, no people', formato: 'vertical' },
      { clave: 'japon-osaka-noche', prompt: 'Dotonbori canal in Osaka at night, glowing signs reflected in the water, no recognizable faces' },
      { clave: 'mexico-oaxaca', prompt: 'Colonial street in Oaxaca, Mexico, ochre and blue facades, papel picado strung overhead, no people' },
      { clave: 'mexico-valle', prompt: 'Pine-lined reservoir at sunrise in central Mexico, mist on the water, small rowboat, no people' },
    ],
  },

  // ── G4 · Entretenimiento: un año de ciencia ficción ──────────────────────
  {
    app: 'entretenimiento',
    constante: 'DEMO_ENTRETENIMIENTO',
    descripcion:
      'El archivo de cine, series, libros y videojuegos de Pep@: 30 fichas de OBRAS REALES de ciencia ficción ' +
      '(con algo de anime y divulgación). La `resena` es la OPINIÓN de Pep@ en primera persona (2-4 frases: qué ' +
      'le movió, con qué de su año lo conectó, qué no le funcionó) — NUNCA un resumen de la trama ni una ficha de ' +
      'enciclopedia. Ritmo: 2-3 al mes; MÁS en el mes 7 (con la rodilla lesionada ve mucho más cine); NINGUNA ' +
      'entre los días -124 y -104 (Japón) salvo un libro leído en el avión; cine japonés en el mes 8 preparando ' +
      'el viaje. Estados: casi todas `completado`; 2 `en_curso` (una serie a media temporada y un libro grueso) ' +
      'y 4 `pendiente` recientes con calificacion 0 y resena vacía. ' +
      '`programa`: el programa «clásicos de ciencia ficción por ver» con 10 títulos y su detalle de una línea ' +
      '(por qué está en la lista).',
    esquema: {
      type: 'object',
      properties: {
        fichas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tipo: { type: 'string', enum: ['pelicula', 'serie', 'libro', 'videojuego'] },
              titulo: { type: 'string' },
              autor: { type: 'string', description: 'director, autor o estudio' },
              genero: {
                type: 'string',
                enum: ['Ciencia ficción', 'Sci-fi clásico', 'Anime', 'Divulgación', 'Drama', 'Terror'],
              },
              estado: { type: 'string', enum: ['pendiente', 'en_curso', 'completado'] },
              calificacion: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
              resena: { type: 'string', description: '2-4 frases en primera persona; vacío si es pendiente' },
            },
            required: ['dia', 'tipo', 'titulo', 'autor', 'genero', 'estado', 'calificacion', 'resena'],
            additionalProperties: false,
          },
        },
        programa: {
          type: 'object',
          properties: {
            nombre: { type: 'string', description: 'máx 5 palabras' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  titulo: { type: 'string' },
                  detalle: { type: 'string', description: 'una línea: por qué está en la lista' },
                },
                required: ['titulo', 'detalle'],
                additionalProperties: false,
              },
            },
          },
          required: ['nombre', 'items'],
          additionalProperties: false,
        },
      },
      required: ['fichas', 'programa'],
      additionalProperties: false,
    },
    trozos: [
      {
        id: 's1',
        instrucciones:
          'Meses 1-6 (días -364..-185): ~14 fichas, el descubrimiento del cine de ciencia ficción como refugio ' +
          'de la frustración. En `programa` deja el nombre y un solo item mínimo: se completa en el trozo 2.',
      },
      {
        id: 's2',
        instrucciones:
          'Meses 7-12 (días -184..0): ~16 fichas — el atracón del mes 7 con la rodilla lesionada, cine japonés ' +
          'en el mes 8, hueco total entre -124 y -104, remontada al final y las 4 pendientes con fecha reciente. ' +
          'Y ahora sí el `programa` completo con sus 10 títulos.',
      },
    ],
  },

  // ── G4 · Garage: la bici de diario y el coche heredado ───────────────────
  {
    app: 'garage',
    constante: 'DEMO_GARAGE',
    descripcion:
      'El garaje real de Pep@: la bici con la que se mueve todos los días y un coche viejo heredado que se usa ' +
      'poco y falla mucho. NO inventes costos ni kilometrajes: los pone el builder. ' +
      '`vehiculos`: un nombre con cariño y una nota de 1-2 frases para cada uno. ' +
      '`servicios`: 16 entradas del historial con `titulo` (máx 5 palabras) y `nota` de una frase; 9 de la bici ' +
      '(cadena, cámaras, llantas, frenos, afinación — la frecuencia sube al entrenar para el maratón) y 7 del ' +
      'coche. La del día -178 es LA AVERÍA del mes 7 (se quedó tirado, grúa, bomba de gasolina): su nota debe ' +
      'transmitir el golpe, no describir la reparación. ' +
      '`talleres`: 5 contactos verosímiles de Ciudad de México (taller de confianza, aseguradora, verificentro, ' +
      'ciclería de barrio y una grúa) con dirección y una nota de por qué los guarda. ' +
      '`tramites`: el título y la nota de los 5 trámites programados.',
    esquema: {
      type: 'object',
      properties: {
        vehiculos: {
          type: 'object',
          properties: {
            biciNombre: { type: 'string' },
            biciNota: { type: 'string' },
            autoNombre: { type: 'string' },
            autoNota: { type: 'string' },
          },
          required: ['biciNombre', 'biciNota', 'autoNombre', 'autoNota'],
          additionalProperties: false,
        },
        servicios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              vehiculo: { type: 'string', enum: ['bici', 'auto'] },
              tipo: {
                type: 'string',
                enum: ['aceite', 'filtros', 'frenos', 'llantas', 'cadena', 'transmision', 'bateria', 'revision', 'lavado', 'otro'],
              },
              titulo: { type: 'string' },
              nota: { type: 'string' },
            },
            required: ['dia', 'vehiculo', 'tipo', 'titulo', 'nota'],
            additionalProperties: false,
          },
        },
        talleres: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: { type: 'string', enum: ['taller', 'aseguradora', 'verificentro', 'ciclos', 'grua'] },
              nombre: { type: 'string' },
              direccion: { type: 'string' },
              notas: { type: 'string' },
            },
            required: ['clave', 'nombre', 'direccion', 'notas'],
            additionalProperties: false,
          },
        },
        tramites: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: { type: 'string', enum: ['verificacion', 'seguro', 'tenencia', 'circulacion', 'afinacionBici'] },
              titulo: { type: 'string' },
              nota: { type: 'string' },
            },
            required: ['clave', 'titulo', 'nota'],
            additionalProperties: false,
          },
        },
      },
      required: ['vehiculos', 'servicios', 'talleres', 'tramites'],
      additionalProperties: false,
    },
  },

  // ── G1 · Ejercicio: de cero al maratón ───────────────────────────────────
  {
    app: 'ejercicio',
    constante: 'DEMO_EJERCICIO',
    descripcion:
      'El entrenamiento de Pep@ durante el año, de no correr nada a terminar un maratón. ' +
      'REGLA DURA: no menciones NUNCA kilómetros, pesos, minutos, ritmos ni fechas concretas — todos los ' +
      'números los calcula el builder; tú pones la voz. Tampoco inventes nombres de ejercicio (salen del ' +
      'catálogo de la app). ' +
      '`titulos`: títulos cortos de sesión (máx 4 palabras) que se rotan por modalidad. ' +
      '`enfoquesFlex`: 6 zonas del cuerpo para las sesiones de movilidad. ' +
      '`actividades`: cómo se llama cada tramo de un entrenamiento por intervalos. ' +
      '`hitos`: las 17 sesiones con nombre propio del año, cada una con su título y una nota de 1-2 frases ' +
      'en primera persona (el primer trote, la primera carrera, el día que se lesionó la rodilla, la primera ' +
      'sesión de fisioterapia, la vuelta progresiva, las caminatas de Japón, el medio maratón, la tirada larga, ' +
      'la bajada de carga y EL MARATÓN). ' +
      '`notas`: ~45 notas sueltas de cómo se sintió ese día, repartidas por el año y por modalidad. ' +
      '`metas`: el nombre de las 5 metas del cronograma (4 cumplidas y una viva hacia el año que viene).',
    esquema: {
      type: 'object',
      properties: {
        titulos: {
          type: 'object',
          properties: {
            fuerza: { type: 'array', items: { type: 'string' }, description: '8 títulos de sesión de pesas' },
            resistencia: { type: 'array', items: { type: 'string' }, description: '10 títulos de carrera o cardio' },
            flexibilidad: { type: 'array', items: { type: 'string' }, description: '8 títulos de movilidad o yoga' },
          },
          required: ['fuerza', 'resistencia', 'flexibilidad'],
          additionalProperties: false,
        },
        enfoquesFlex: { type: 'array', items: { type: 'string' }, description: '6 zonas del cuerpo' },
        actividades: {
          type: 'object',
          properties: {
            correr: { type: 'string' },
            caminar: { type: 'string' },
            trote: { type: 'string' },
            bici: { type: 'string' },
            cuerda: { type: 'string' },
          },
          required: ['correr', 'caminar', 'trote', 'bici', 'cuerda'],
          additionalProperties: false,
        },
        hitos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: {
                type: 'string',
                enum: [
                  'primerTrote', 'plan5k', 'carrera5k', 'carrera10k', 'tirada15k', 'ultimaAntesLesion',
                  'diaLesion', 'primeraFisio', 'vueltaProgresiva', 'japonCaminata', 'primer16k',
                  'medioMaraton', 'tirada32k', 'ritmoRecord', 'taper', 'maraton', 'vueltaTrasMaraton',
                ],
              },
              titulo: { type: 'string', description: 'máx 4 palabras' },
              nota: { type: 'string', description: '1-2 frases en primera persona' },
            },
            required: ['clave', 'titulo', 'nota'],
            additionalProperties: false,
          },
        },
        notas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tipo: { type: 'string', enum: ['fuerza', 'resistencia', 'flexibilidad'] },
              nota: { type: 'string', description: '1-2 frases, cómo se sintió' },
            },
            required: ['dia', 'tipo', 'nota'],
            additionalProperties: false,
          },
        },
        metas: {
          type: 'object',
          properties: {
            cinco: { type: 'string' },
            diez: { type: 'string' },
            medio: { type: 'string' },
            maraton: { type: 'string' },
            siguiente: { type: 'string' },
          },
          required: ['cinco', 'diez', 'medio', 'maraton', 'siguiente'],
          additionalProperties: false,
        },
      },
      required: ['titulos', 'enfoquesFlex', 'actividades', 'hitos', 'notas', 'metas'],
      additionalProperties: false,
    },
  },

  // ── G1 · Cocina: la dieta que acompañó al maratón ────────────────────────
  {
    app: 'cocina',
    constante: 'DEMO_COCINA',
    descripcion:
      'Lo que Pep@ comió durante el año. ' +
      '`comidas` es un POOL que el builder reparte por el año y cuyos macros ESCALA para cuadrar el objetivo ' +
      'del día: da valores realistas por ración. `etapa` marca el momento del año: `inicio` = meses 1-3 (come ' +
      'de prisa, porciones grandes, mucho pan y refresco), `dieta` = meses 4-8 (ya cuida proteína y verdura), ' +
      '`japon` = mes 9 (ramen, okonomiyaki, onigiri, matcha, izakaya), `maraton` = meses 10-12 (carga de ' +
      'carbohidratos y recuperación). Escribe 4-5 comidas por cada combinación de momento y etapa. ' +
      '`notasDia`: ~16 notas de días que cuentan algo (el primer día de dieta, la carga de carbos antes del ' +
      'maratón, el primer ramen en Japón, la comida de después de la carrera).',
    esquema: {
      type: 'object',
      properties: {
        comidas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              momento: { type: 'string', enum: ['desayuno', 'comida', 'cena', 'snack'] },
              etapa: { type: 'string', enum: ['inicio', 'dieta', 'japon', 'maraton'] },
              nombre: { type: 'string', description: 'máx 6 palabras' },
              calorias: { type: 'integer' },
              proteinas: { type: 'integer' },
              carbohidratos: { type: 'integer' },
              grasas: { type: 'integer' },
            },
            required: ['momento', 'etapa', 'nombre', 'calorias', 'proteinas', 'carbohidratos', 'grasas'],
            additionalProperties: false,
          },
        },
        notasDia: {
          type: 'array',
          items: {
            type: 'object',
            properties: { dia, nota: { type: 'string', description: '1 frase' } },
            required: ['dia', 'nota'],
            additionalProperties: false,
          },
        },
      },
      required: ['comidas', 'notasDia'],
      additionalProperties: false,
    },
  },

  // ── G1 · Cocina (2/2): el recetario propio ───────────────────────────────
  // Va aparte porque la gramática de structured outputs tiene un tope de
  // tamaño y el esquema completo de cocina no cabía en una sola pasada.
  {
    app: 'cocina',
    destino: 'demo.recetas.data.ts',
    constante: 'DEMO_COCINA_RECETAS',
    descripcion:
      'El recetario propio de Pep@ (barista de medio tiempo que estudia física y entrena para un maratón). ' +
      '`recetas`: 10 recetas completas y cocinables (ingredientes CON cantidad, pasos claros, macros por ' +
      'porción). El campo `emoji` es un dato de la app, no texto de interfaz: ahí sí va un emoji. `carpeta` ' +
      'agrupa el recetario (por ejemplo: Corredor, Batch cooking, De Japón, Dulce). Las 10 `clave` son ' +
      'EXACTAMENTE estas, una por receta y en este orden, iguales en los dos idiomas: avena-corredor (avena ' +
      'de la noche anterior), pasta-carga (pasta de carga la víspera de una carrera), bowl-pollo (bowl de ' +
      'pollo para batch cooking), curry-japones, ramen-casero, pan-platano (pan de plátano), crema-lentejas, ' +
      'salmon-teriyaki, tacos-lentejas, smoothie-recuperacion. ' +
      '`dietas`: 2 planes propios con su descripción y qué recetas los componen (nombres EXACTOS de `recetas`); ' +
      'uno de carga para la semana del maratón y otro ligero de vuelta de Japón. ' +
      '`listas`: 2 listas de súper con 10-14 items cada una (texto con cantidad).',
    esquema: {
      type: 'object',
      properties: {
        recetas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: { type: 'string', description: 'una de las claves listadas en la descripción, tal cual' },
              nombre: { type: 'string' },
              emoji: { type: 'string', description: 'un solo emoji de comida (es un dato, no interfaz)' },
              carpeta: { type: 'string' },
              porciones: { type: 'integer' },
              minutos: { type: 'integer' },
              ingredientes: { type: 'array', items: { type: 'string' }, description: 'CON cantidad' },
              pasos: { type: 'array', items: { type: 'string' } },
              calorias: { type: 'integer' },
              proteinas: { type: 'integer' },
              carbohidratos: { type: 'integer' },
              grasas: { type: 'integer' },
            },
            required: [
              'clave', 'nombre', 'emoji', 'carpeta', 'porciones', 'minutos',
              'ingredientes', 'pasos', 'calorias', 'proteinas', 'carbohidratos', 'grasas',
            ],
            additionalProperties: false,
          },
        },
        dietas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              descripcion: { type: 'string' },
              recetas: { type: 'array', items: { type: 'string' }, description: 'nombres EXACTOS de `recetas`' },
            },
            required: ['nombre', 'descripcion', 'recetas'],
            additionalProperties: false,
          },
        },
        listas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              nombre: { type: 'string' },
              items: { type: 'array', items: { type: 'string' }, description: 'texto con cantidad: «2 kg de arroz»' },
            },
            required: ['dia', 'nombre', 'items'],
            additionalProperties: false,
          },
        },
      },
      required: ['recetas', 'dietas', 'listas'],
      additionalProperties: false,
    },
    imagenes: [
      { clave: 'avena-corredor', prompt: 'Overnight oats in a glass jar with banana slices and peanut butter, on a wooden table, soft morning light, overhead food photo, no people' },
      { clave: 'pasta-carga', prompt: 'Big bowl of spaghetti with tomato sauce and basil on a rustic wooden table, warm light, overhead food photo, no people' },
      { clave: 'bowl-pollo', prompt: 'Meal prep bowl with grilled chicken, brown rice, broccoli and cherry tomatoes, wooden table, natural light, overhead food photo, no people' },
      { clave: 'curry-japones', prompt: 'Japanese curry rice with carrots and potatoes on a ceramic plate, dark wooden table, warm light, food photo, no people' },
      { clave: 'ramen-casero', prompt: 'Homemade ramen bowl with soft egg, nori and green onion, dark wooden table, steam, food photo, no people' },
      { clave: 'pan-platano', prompt: 'Sliced banana bread loaf with walnuts on parchment paper, rustic wooden table, warm light, food photo, no people' },
      { clave: 'crema-lentejas', prompt: 'Bowl of creamy lentil soup with a swirl of cream and fresh herbs, rustic table, cozy light, food photo, no people' },
      { clave: 'salmon-teriyaki', prompt: 'Teriyaki salmon fillet with sesame seeds, white rice and green beans on a plate, wooden table, food photo, no people' },
      { clave: 'tacos-lentejas', prompt: 'Three lentil tacos on corn tortillas with avocado, cilantro and lime, on a rustic plate, warm light, food photo, no people' },
      { clave: 'smoothie-recuperacion', prompt: 'Post-workout smoothie in a tall glass with berries and oats on a wooden table, bright morning light, food photo, no people' },
    ],
  },

  // ── G1 · Descanso: de la una de la madrugada a las 23:30 ─────────────────
  {
    app: 'descanso',
    constante: 'DEMO_DESCANSO',
    descripcion:
      'Las noches de Pep@ durante el año, del insomnio del mes 1 al horario estable del mes 12. ' +
      'REGLA DURA: no digas NUNCA cuántas horas durmió ni a qué hora se acostó — los números los pone el ' +
      'builder. Tú escribes cómo fue esa noche. ' +
      '`tono` es el contrato con el builder: él ajusta las horas, la calidad y las interrupciones de ese día ' +
      'para que el número no contradiga a la nota. ' +
      '`notas`: ~50 notas de una frase repartidas por el año (más `mala` al principio, más `buena` al final). ' +
      '`hitos`: las 8 noches con nombre propio (la peor del mes 1, la primera con horario fijo, el día que ' +
      'dejó las pantallas, el jet lag de ida y el de vuelta de Japón, la víspera del maratón, la noche de ' +
      'después y la mejor noche del año).',
    esquema: {
      type: 'object',
      properties: {
        notas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia,
              tono: { type: 'string', enum: ['mala', 'regular', 'buena', 'excelente'] },
              nota: { type: 'string', description: '1 frase, máx 14 palabras' },
            },
            required: ['dia', 'tono', 'nota'],
            additionalProperties: false,
          },
        },
        hitos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clave: {
                type: 'string',
                enum: [
                  'peorNoche', 'primerHorario', 'pantallasFuera', 'jetLagIda', 'jetLagVuelta',
                  'visperaMaraton', 'trasMaraton', 'mejorNoche',
                ],
              },
              dia,
              nota: { type: 'string' },
            },
            required: ['clave', 'dia', 'nota'],
            additionalProperties: false,
          },
        },
      },
      required: ['notas', 'hitos'],
      additionalProperties: false,
    },
  },
]
