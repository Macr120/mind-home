/**
 * Esqueleto estático del temario: temas genéricos por nivel MCER, aplicables a
 * cualquier idioma (equivalente a pilares.ts de biblioteca). Los ids se
 * comparten entre idiomas porque tarjetas, charlas y nodos dinámicos llevan
 * su propio `idiomaId`. Los títulos son datos, no UI (mismo criterio que
 * los pilares de biblioteca).
 */

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

/** Todos los temas estáticos aplanados con su nivel. */
export function todosLosTemas(): (TemaTemario & { nivel: string })[] {
  return TEMARIO.flatMap((n) => n.temas.map((t) => ({ ...t, nivel: n.nivel })))
}

export function temasDeNivel(nivel: string): TemaTemario[] {
  return TEMARIO.find((n) => n.nivel === nivel)?.temas ?? []
}

export function getTema(id: string): (TemaTemario & { nivel: string }) | undefined {
  return todosLosTemas().find((t) => t.id === id)
}
