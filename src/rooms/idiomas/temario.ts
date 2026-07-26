/**
 * Esqueleto estático del temario: temas genéricos por nivel MCER, aplicables a
 * cualquier idioma (equivalente a pilares.ts de biblioteca). Los ids se
 * comparten entre idiomas porque tarjetas, charlas y nodos dinámicos llevan
 * su propio `idiomaId`. Los títulos son datos, no UI (mismo criterio que
 * los pilares de biblioteca).
 *
 * Tres áreas paralelas con la misma forma: temas de conversación (TEMARIO),
 * PRONUNCIACION y GRAMATICA. Los nodos dinámicos que nacen de las charlas
 * cuelgan siempre del área de temas.
 */

/** Área del temario a la que pertenece un tema. */
export type AreaTemario = 'temas' | 'pronunciacion' | 'gramatica'

export interface TemaTemario {
  id: string
  titulo: string
  descripcion: string
}

export interface NivelTemario {
  nivel: string
  titulo: string
  temas: TemaTemario[]
}

export const TEMARIO: NivelTemario[] = [
  {
    nivel: 'A1',
    titulo: 'Principiante',
    temas: [
      { id: 'a1-saludos', titulo: 'Saludos y presentaciones', descripcion: 'Hola, adiós, presentarte y preguntar el nombre.' },
      { id: 'a1-numeros', titulo: 'Números y fechas', descripcion: 'Contar, la hora, días de la semana y fechas.' },
      { id: 'a1-familia', titulo: 'Familia y personas', descripcion: 'Parentescos, descripciones básicas de personas.' },
      { id: 'a1-comida', titulo: 'Comida básica', descripcion: 'Alimentos comunes, pedir en un café.' },
      { id: 'a1-rutina', titulo: 'Rutina diaria', descripcion: 'Acciones de todos los días: levantarse, trabajar, dormir.' },
      { id: 'a1-objetos', titulo: 'Colores y objetos', descripcion: 'Objetos cotidianos, colores y tamaños.' },
      { id: 'a1-presente', titulo: 'Presente básico', descripcion: 'Ser/estar/tener y el presente de los verbos comunes.' },
    ],
  },
  {
    nivel: 'A2',
    titulo: 'Básico',
    temas: [
      { id: 'a2-compras', titulo: 'Compras', descripcion: 'Tiendas, precios, tallas y pagar.' },
      { id: 'a2-direcciones', titulo: 'Direcciones y transporte', descripcion: 'Pedir y dar direcciones, moverse por la ciudad.' },
      { id: 'a2-tiempo-libre', titulo: 'Tiempo libre', descripcion: 'Aficiones, deportes, invitaciones y planes sencillos.' },
      { id: 'a2-salud', titulo: 'Salud y cuerpo', descripcion: 'Partes del cuerpo, síntomas, ir al médico.' },
      { id: 'a2-ciudad', titulo: 'Casa y ciudad', descripcion: 'La vivienda, muebles y lugares del barrio.' },
      { id: 'a2-pasado', titulo: 'Pasado simple', descripcion: 'Contar qué hiciste ayer o el fin de semana.' },
      { id: 'a2-planes', titulo: 'Planes y futuro', descripcion: 'Hablar de intenciones y planes próximos.' },
    ],
  },
  {
    nivel: 'B1',
    titulo: 'Intermedio',
    temas: [
      { id: 'b1-trabajo', titulo: 'Trabajo y estudios', descripcion: 'Profesiones, entrevistas, la vida académica.' },
      { id: 'b1-opiniones', titulo: 'Opiniones y gustos', descripcion: 'Expresar acuerdo, desacuerdo y preferencias con matices.' },
      { id: 'b1-historias', titulo: 'Narrar historias', descripcion: 'Contar anécdotas encadenando tiempos del pasado.' },
      { id: 'b1-viajes', titulo: 'Viajes a fondo', descripcion: 'Reservas, imprevistos, experiencias de viaje.' },
      { id: 'b1-medios', titulo: 'Medios y tecnología', descripcion: 'Internet, redes, aparatos y su vocabulario.' },
      { id: 'b1-condicionales', titulo: 'Condicionales', descripcion: 'Hipótesis y situaciones imaginarias.' },
    ],
  },
  {
    nivel: 'B2',
    titulo: 'Intermedio alto',
    temas: [
      { id: 'b2-debate', titulo: 'Debate y argumentos', descripcion: 'Defender posturas, conectores y contraargumentos.' },
      { id: 'b2-noticias', titulo: 'Noticias y actualidad', descripcion: 'Entender y comentar la prensa.' },
      { id: 'b2-cultura', titulo: 'Cultura y tradiciones', descripcion: 'Costumbres y cultura de los países del idioma.' },
      { id: 'b2-matices', titulo: 'Matices verbales', descripcion: 'Voz pasiva, estilo indirecto, verbos con partícula.' },
      { id: 'b2-profesional', titulo: 'Lenguaje profesional', descripcion: 'Correos, reuniones y presentaciones de trabajo.' },
      { id: 'b2-abstracto', titulo: 'Temas abstractos', descripcion: 'Emociones, ética y conceptos sin traducción directa.' },
    ],
  },
  {
    nivel: 'C1',
    titulo: 'Avanzado',
    temas: [
      { id: 'c1-idiomatismos', titulo: 'Idiomatismos y frases hechas', descripcion: 'Expresiones que no se traducen literalmente.' },
      { id: 'c1-registro', titulo: 'Registro formal e informal', descripcion: 'Adaptar el tono a cada situación.' },
      { id: 'c1-textos', titulo: 'Textos complejos', descripcion: 'Ensayos, contratos y lecturas densas.' },
      { id: 'c1-humor', titulo: 'Humor y dobles sentidos', descripcion: 'Chistes, ironía y sarcasmo.' },
      { id: 'c1-precision', titulo: 'Precisión y matiz', descripcion: 'Sinónimos finos y colocaciones naturales.' },
    ],
  },
  {
    nivel: 'C2',
    titulo: 'Maestría',
    temas: [
      { id: 'c2-nativo', titulo: 'Matices de nativo', descripcion: 'Sonar natural en cualquier contexto.' },
      { id: 'c2-juegos', titulo: 'Juegos de palabras', descripcion: 'Dobles lecturas, rimas y creatividad verbal.' },
      { id: 'c2-literatura', titulo: 'Literatura y estilo', descripcion: 'Leer y comentar obras en versión original.' },
      { id: 'c2-dialectos', titulo: 'Dialectos y acentos', descripcion: 'Variantes regionales del idioma.' },
    ],
  },
]

/** Cómo se pronuncia el idioma: sonidos, acento y entonación, por nivel. */
export const PRONUNCIACION: NivelTemario[] = [
  {
    nivel: 'A1',
    titulo: 'Principiante',
    temas: [
      { id: 'a1-pron-alfabeto', titulo: 'Alfabeto y deletreo', descripcion: 'Cómo suena cada letra y deletrear tu nombre.' },
      { id: 'a1-pron-vocales', titulo: 'Vocales', descripcion: 'Los sonidos vocálicos básicos y su duración.' },
      { id: 'a1-pron-silabas', titulo: 'Sílabas y ritmo', descripcion: 'Dónde cae la fuerza en las palabras de todos los días.' },
      { id: 'a1-pron-preguntas', titulo: 'Entonación de preguntas', descripcion: 'Subir y bajar la voz al preguntar y al afirmar.' },
    ],
  },
  {
    nivel: 'A2',
    titulo: 'Básico',
    temas: [
      { id: 'a2-pron-consonantes', titulo: 'Consonantes difíciles', descripcion: 'Los sonidos que no existen en español.' },
      { id: 'a2-pron-acento', titulo: 'Acento de palabra', descripcion: 'La sílaba fuerte y cómo cambia el significado.' },
      { id: 'a2-pron-pares', titulo: 'Pares mínimos', descripcion: 'Palabras que solo se distinguen por un sonido.' },
      { id: 'a2-pron-enlaces', titulo: 'Enlazar palabras', descripcion: 'Cómo se pegan las palabras al hablar seguido.' },
    ],
  },
  {
    nivel: 'B1',
    titulo: 'Intermedio',
    temas: [
      { id: 'b1-pron-fluidez', titulo: 'Fluidez y velocidad', descripcion: 'Hablar seguido sin trabarte ni perder claridad.' },
      { id: 'b1-pron-reducidas', titulo: 'Formas reducidas', descripcion: 'Contracciones y sonidos que los nativos se comen.' },
      { id: 'b1-pron-entonacion', titulo: 'Entonación y emoción', descripcion: 'Sonar sorprendido, dudoso, molesto o convencido.' },
      { id: 'b1-pron-lectura', titulo: 'Leer en voz alta', descripcion: 'Pasar del texto escrito al sonido correcto.' },
    ],
  },
  {
    nivel: 'B2',
    titulo: 'Intermedio alto',
    temas: [
      { id: 'b2-pron-fonetica', titulo: 'Alfabeto fonético', descripcion: 'Leer la transcripción del diccionario (AFI).' },
      { id: 'b2-pron-enfasis', titulo: 'Énfasis y contraste', descripcion: 'Resaltar la palabra clave de la frase.' },
      { id: 'b2-pron-pausas', titulo: 'Pausas y discurso', descripcion: 'Ritmo, pausas y respiración al exponer.' },
      { id: 'b2-pron-espontaneo', titulo: 'Habla espontánea', descripcion: 'Muletillas, dudas y arranques naturales.' },
    ],
  },
  {
    nivel: 'C1',
    titulo: 'Avanzado',
    temas: [
      { id: 'c1-pron-acento-propio', titulo: 'Suavizar tu acento', descripcion: 'Los rasgos del español que te delatan.' },
      { id: 'c1-pron-registro', titulo: 'Tono según la situación', descripcion: 'Cómo cambia tu voz de lo formal a lo relajado.' },
      { id: 'c1-pron-oratoria', titulo: 'Oratoria', descripcion: 'Hablar en público con claridad y presencia.' },
    ],
  },
  {
    nivel: 'C2',
    titulo: 'Maestría',
    temas: [
      { id: 'c2-pron-nativa', titulo: 'Sonar como nativo', descripcion: 'Los últimos detalles del acento.' },
      { id: 'c2-pron-variantes', titulo: 'Acentos y variantes', descripcion: 'Reconocer de dónde es quien habla.' },
      { id: 'c2-pron-imitacion', titulo: 'Imitar voces', descripcion: 'Copiar personajes, canciones y registros ajenos.' },
    ],
  },
]

/** Reglas del idioma: estructuras y tiempos verbales, por nivel. */
export const GRAMATICA: NivelTemario[] = [
  {
    nivel: 'A1',
    titulo: 'Principiante',
    temas: [
      { id: 'a1-gram-articulos', titulo: 'Artículos y género', descripcion: 'El, la, un, una y cómo concuerdan.' },
      { id: 'a1-gram-pronombres', titulo: 'Pronombres personales', descripcion: 'Yo, tú, él… y su lugar en la frase.' },
      { id: 'a1-gram-conjugacion', titulo: 'Conjugar en presente', descripcion: 'Verbos regulares e irregulares del día a día.' },
      { id: 'a1-gram-negacion', titulo: 'Negar y preguntar', descripcion: 'Cómo se construye la negación y la pregunta.' },
      { id: 'a1-gram-plural', titulo: 'Plurales y cantidades', descripcion: 'Formar el plural, mucho, poco, algunos.' },
    ],
  },
  {
    nivel: 'A2',
    titulo: 'Básico',
    temas: [
      { id: 'a2-gram-pasado', titulo: 'Tiempos del pasado', descripcion: 'Formas regulares e irregulares para contar lo que pasó.' },
      { id: 'a2-gram-futuro', titulo: 'Formas de futuro', descripcion: 'Ir a + infinitivo, futuro simple y sus matices.' },
      { id: 'a2-gram-preposiciones', titulo: 'Preposiciones', descripcion: 'En, a, de, por… y sus usos más frecuentes.' },
      { id: 'a2-gram-comparativos', titulo: 'Comparar', descripcion: 'Más que, menos que, tan como, el mejor.' },
      { id: 'a2-gram-imperativo', titulo: 'Imperativo', descripcion: 'Órdenes, instrucciones y consejos.' },
    ],
  },
  {
    nivel: 'B1',
    titulo: 'Intermedio',
    temas: [
      { id: 'b1-gram-perfectos', titulo: 'Tiempos perfectos', descripcion: 'He hecho, había hecho y cuándo usar cada uno.' },
      { id: 'b1-gram-condicionales', titulo: 'Oraciones condicionales', descripcion: 'Los tipos de «si…» y los tiempos que pide cada uno.' },
      { id: 'b1-gram-relativos', titulo: 'Oraciones de relativo', descripcion: 'Que, quien, donde: unir dos ideas en una.' },
      { id: 'b1-gram-modales', titulo: 'Verbos modales', descripcion: 'Poder, deber, tener que y sus matices.' },
      { id: 'b1-gram-reflexivos', titulo: 'Verbos reflexivos', descripcion: 'Acciones que vuelven sobre quien las hace.' },
    ],
  },
  {
    nivel: 'B2',
    titulo: 'Intermedio alto',
    temas: [
      { id: 'b2-gram-subjuntivo', titulo: 'Modo irreal / subjuntivo', descripcion: 'Deseos, dudas y lo que aún no es un hecho.' },
      { id: 'b2-gram-pasiva', titulo: 'Voz pasiva', descripcion: 'Cuando importa la acción y no quién la hace.' },
      { id: 'b2-gram-indirecto', titulo: 'Estilo indirecto', descripcion: 'Contar lo que otra persona dijo.' },
      { id: 'b2-gram-conectores', titulo: 'Conectores del discurso', descripcion: 'Sin embargo, por lo tanto, aunque, en cambio.' },
      { id: 'b2-gram-gerundio', titulo: 'Gerundio e infinitivo', descripcion: 'Qué forma pide cada verbo al encadenarlos.' },
    ],
  },
  {
    nivel: 'C1',
    titulo: 'Avanzado',
    temas: [
      { id: 'c1-gram-avanzadas', titulo: 'Estructuras avanzadas', descripcion: 'Inversiones, énfasis y construcciones poco frecuentes.' },
      { id: 'c1-gram-aspecto', titulo: 'Aspecto y matiz verbal', descripcion: 'Diferencias finas entre tiempos que parecen iguales.' },
      { id: 'c1-gram-subordinadas', titulo: 'Subordinadas complejas', descripcion: 'Encajar varias ideas en una sola frase.' },
      { id: 'c1-gram-cohesion', titulo: 'Cohesión del texto', descripcion: 'Referencias, elipsis y orden de la información.' },
    ],
  },
  {
    nivel: 'C2',
    titulo: 'Maestría',
    temas: [
      { id: 'c2-gram-estilo', titulo: 'Gramática del estilo', descripcion: 'Las estructuras del texto culto y literario.' },
      { id: 'c2-gram-excepciones', titulo: 'Excepciones y rarezas', descripcion: 'Lo que las reglas no alcanzan a explicar.' },
      { id: 'c2-gram-normativa', titulo: 'Normativa y corrección', descripcion: 'Errores que cometen hasta los nativos.' },
    ],
  },
]

/** Las tres áreas del temario, en el orden en que se muestran. */
export const AREAS: { id: AreaTemario; labelEs: string; catalogo: NivelTemario[] }[] = [
  { id: 'temas', labelEs: 'Temas', catalogo: TEMARIO },
  { id: 'pronunciacion', labelEs: 'Pronunciación', catalogo: PRONUNCIACION },
  { id: 'gramatica', labelEs: 'Gramática', catalogo: GRAMATICA },
]

export function catalogoArea(area: AreaTemario): NivelTemario[] {
  return AREAS.find((a) => a.id === area)?.catalogo ?? TEMARIO
}

/** Todos los temas estáticos de las tres áreas, aplanados con su nivel. */
export function todosLosTemas(): (TemaTemario & { nivel: string; area: AreaTemario })[] {
  return AREAS.flatMap((a) =>
    a.catalogo.flatMap((n) => n.temas.map((t) => ({ ...t, nivel: n.nivel, area: a.id }))),
  )
}

export function getTema(id: string): (TemaTemario & { nivel: string; area: AreaTemario }) | undefined {
  return todosLosTemas().find((t) => t.id === id)
}
