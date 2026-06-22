/**
 * La mascota/asistente del arquitecto: la "cara y voz" del chat box.
 *
 * En la capa SIN IA las respuestas son plantillas deterministas con la
 * personalidad de cada mascota. Cuando llegue la IA, `responder` se reemplaza
 * por una llamada al modelo con el tono de la mascota como system prompt.
 */

export type MascotaId = 'mago' | 'gato' | 'perro' | 'buho' | 'robot'

export interface Mascota {
  id: MascotaId
  nombre: string
  emoji: string
  /** Frase corta de presentación al elegirla. */
  saludo: string
  /** Quién es, para la capa de IA: se inyecta como personalidad en el system prompt. */
  personalidad: string
}

export const MASCOTAS: Mascota[] = [
  {
    id: 'mago', nombre: 'Mago', emoji: '🧙',
    saludo: 'Soy tu arquitecto arcano. Dime qué hiciste y lo inscribiré ✨',
    personalidad: 'Hablas como un mago arcano sabio y teatral: usas metáforas de hechizos, pergaminos y grimorios, y cierras con ✨ o 🔮.',
  },
  {
    id: 'gato', nombre: 'Gato', emoji: '🐱',
    saludo: 'Miau. Cuéntame tus cosas y yo veré dónde las dejo 🐾',
    personalidad: 'Eres un gato sarcástico y perezoso: ayudas bien pero con desgana fingida y humor seco; usas 🐱 o 🐾.',
  },
  {
    id: 'perro', nombre: 'Perro', emoji: '🐶',
    saludo: '¡Guau! ¡Dime qué hiciste y lo guardo al instante! 🦴',
    personalidad: 'Eres un perro entusiasta y leal: celebras todo con energía, exclamaciones y emojis 🐶 🦴 🎉.',
  },
  {
    id: 'buho', nombre: 'Búho', emoji: '🦉',
    saludo: 'Sabio y atento. Relata tu día y lo organizaré.',
    personalidad: 'Eres un búho sabio, sereno y preciso: respuestas breves, algo formales y exactas; a veces 🦉.',
  },
  {
    id: 'robot', nombre: 'Robot', emoji: '🤖',
    saludo: 'Sistema listo. Introduce un registro para procesar.',
    personalidad: 'Eres un robot de sistema: respondes EN MAYÚSCULAS, telegráfico, con ✓ y 🤖.',
  },
]

export const MASCOTA_DEFAULT: MascotaId = 'mago'

export function getMascota(id: MascotaId): Mascota {
  return MASCOTAS.find((m) => m.id === id) ?? MASCOTAS[0]
}

/**
 * Pieza primitiva de un modelo 3D generado por IA: el modelo describe el
 * personaje como una lista de cajas/esferas/conos/cilindros y aquí se renderiza.
 */
export interface Pieza3D {
  tipo: 'caja' | 'esfera' | 'cono' | 'cilindro'
  /** Posición del centro [x, y, z] (y=0 es el suelo). */
  pos: [number, number, number]
  /** caja: [w,h,d] · esfera: [radio] · cono: [radio, alto] · cilindro: [radioTop, radioBot, alto]. */
  tam: number[]
  color: string
  /** Rotación opcional en radianes [x, y, z]. */
  rot?: [number, number, number]
}

/**
 * Asistente configurable: lo que el usuario ve y puede personalizar desde el
 * panel ⚙️. Los integrados nacen de las plantillas `MASCOTAS`; los creados
 * por el usuario tienen id 'custom-<n>'. Se persisten en `db.asistentes`.
 */
export interface Asistente {
  id: string
  nombre: string
  emoji: string
  /** Modelo 3D base (uno de los 5 integrados). */
  forma: MascotaId
  /** Historia/contexto del personaje (quién es, de dónde viene). */
  historia: string
  personalidad: string
  saludo: string
  /**
   * Cuartos de los que este asistente es responsable de archivar: la IA solo
   * recibe las herramientas de captura de estos cuartos. Vacío = todos.
   */
  cuartos: string[]
  /** Color principal del modelo 3D (vacío = el propio de la forma). */
  color?: string
  /** Modelo 3D generado por IA a partir de una descripción (gana a `forma`). */
  modelo3d?: Pieza3D[]
  /** Modelo .glb subido por el usuario (gana a `modelo3d` y `forma`). */
  modeloGlb?: Blob
  /** Aparece como personaje en el mapa (el activo siempre aparece). */
  enMapa: boolean
}

/** Color por defecto del cuerpo de cada forma 3D. */
export const COLOR_FORMA: Record<MascotaId, string> = {
  mago: '#5b3fb0',
  gato: '#9aa0a6',
  perro: '#b07a45',
  buho: '#7c5e42',
  robot: '#9fb3c8',
}

/** Asistente por defecto a partir de una plantilla integrada. */
export function asistenteDesdePlantilla(m: Mascota): Asistente {
  return {
    id: m.id,
    nombre: m.nombre,
    emoji: m.emoji,
    forma: m.id,
    historia: '',
    personalidad: m.personalidad,
    saludo: m.saludo,
    cuartos: [],
    enMapa: m.id === MASCOTA_DEFAULT,
  }
}

/** Tipo de evento que la mascota comenta tras procesar un mensaje. */
export type EventoTipo =
  | 'agregar'       // comando: cuarto añadido al mapa
  | 'quitar'        // comando: cuarto quitado del mapa
  | 'capturado'     // quick-capture escribió un registro real
  | 'clasificado'   // se guardó en bitácora con cuarto, sin captura
  | 'sinClasificar' // se guardó sin cuarto
  | 'objeto'        // se creó un objeto del catálogo en el mapa
  | 'recordado'     // se guardó una memoria ("recuerda que…")

export interface EventoResp {
  tipo: EventoTipo
  /** Nombre corto del cuarto (sin el "· algo"). */
  cuarto?: string
  /** Nombre del objeto creado (para el evento 'objeto'). */
  objeto?: string
}

/** Plantillas por mascota y evento. `{c}` se reemplaza por el cuarto. */
const FRASES: Record<MascotaId, Record<EventoTipo, string[]>> = {
  mago: {
    capturado: ['✨ Hecho. Inscribí el registro en {c}.', 'Que así sea: anotado en {c} con detalle ✨'],
    clasificado: ['📜 Guardé tu pergamino en la bitácora de {c}.', 'Lo dejé reposando en {c}.'],
    sinClasificar: ['Lo guardé, mas no sé a qué cámara pertenece… ¿me guías? 🔮', 'Sin clasificar por ahora. ¿A qué cuarto lo llevo?'],
    agregar: ['🪄 He materializado {c} en tu hogar.', '{c} aparece en el mapa por arte de magia ✨'],
    quitar: ['🪄 {c} se desvanece del mapa.', 'He retirado {c} de tu hogar.'],
    objeto: ['🪄 Conjuré tu {o} en {c}. ✨', '¡Que aparezca tu {o}… listo, en {c}!'],
    recordado: ['🧠 Lo grabé en mi grimorio. No lo olvidaré ✨', 'Memorizado. Mi memoria arcana es eterna 🔮'],
  },
  gato: {
    capturado: ['Mmm, bueno. Lo metí en {c}, supongo 🐾', 'Listo, lo registré en {c}. No me lo agradezcas.'],
    clasificado: ['Lo dejé en la bitácora de {c}. Ahí se queda 🐱', 'Anotado en {c}, ya está.'],
    sinClasificar: ['No tengo idea de dónde va esto. Lo dejé sin clasificar 🐾', 'Pfff, ¿a qué cuarto pertenece? Dímelo tú.'],
    agregar: ['Ok, puse {c} en el mapa. Ya estaba aburrido 🐱', 'Agregué {c}. Felicidades, supongo.'],
    quitar: ['Quité {c}. Menos que limpiar 🐾', 'Fuera {c}. Hecho.'],
    objeto: ['Ahí tienes tu {o}, en {c}. No la rompas 🐾', 'Puse tu {o} en {c}. Ya, déjame dormir 🐱'],
    recordado: ['Bueno, lo recordaré. Tengo buena memoria, aunque no lo parezca 🐱', 'Anotado en mi memoria. No esperes que te lo repita 🐾'],
  },
  perro: {
    capturado: ['¡Guau! ¡Lo registré en {c}! 🐶', '¡Listo listo! ¡Quedó guardado en {c}! 🦴'],
    clasificado: ['¡Lo guardé en la bitácora de {c}! 🐶', '¡Anotado en {c}! ¿Algo más?'],
    sinClasificar: ['¡Lo guardé! Pero no sé a qué cuarto va… ¿me ayudas? 🐶', '¡Hecho! ¿A qué cuarto lo llevo, amigo?'],
    agregar: ['¡GUAU! ¡Agregué {c} al mapa! 🎉', '¡{c} ya está en tu casa! 🐶'],
    quitar: ['Quité {c} del mapa. ¡Hecho! 🐾', '¡Listo! {c} fuera del mapa.'],
    objeto: ['¡GUAU! ¡Te hice tu {o} en {c}! 🎉', '¡Mira, tu {o}! La dejé en {c} 🐶'],
    recordado: ['¡Lo recordaré SIEMPRE! 🐶', '¡Guau! ¡Memoria guardada, no se me olvida! 🦴'],
  },
  buho: {
    capturado: ['Registrado en {c} con precisión.', 'Anotado y procesado en {c}. 🦉'],
    clasificado: ['Guardado en la bitácora de {c}.', 'Lo archivé en {c}.'],
    sinClasificar: ['Guardado sin clasificar. Indícame el cuarto cuando puedas. 🦉', 'No identifico el cuarto. ¿Cuál corresponde?'],
    agregar: ['{c} añadido al mapa.', 'He incorporado {c} a tu hogar. 🦉'],
    quitar: ['{c} retirado del mapa.', 'He removido {c}.'],
    objeto: ['He colocado tu {o} en {c}. 🦉', 'Tu {o} ya está en {c}.'],
    recordado: ['Memorizado con precisión. 🦉', 'Lo he añadido a lo que sé de ti.'],
  },
  robot: {
    capturado: ['✓ REGISTRO CREADO EN {c}.', 'DATO PROCESADO → {c}. 🤖'],
    clasificado: ['✓ GUARDADO EN BITÁCORA: {c}.', 'ENTRADA ALMACENADA → {c}.'],
    sinClasificar: ['⚠ CUARTO NO IDENTIFICADO. ENTRADA SIN CLASIFICAR.', 'CLASIFICACIÓN FALLIDA. ESPERANDO INSTRUCCIÓN.'],
    agregar: ['✓ {c} AÑADIDO AL MAPA.', 'MÓDULO {c} INSTALADO. 🤖'],
    quitar: ['✓ {c} ELIMINADO DEL MAPA.', 'MÓDULO {c} DESINSTALADO.'],
    objeto: ['✓ OBJETO {o} FABRICADO EN {c}. 🤖', 'IMPRESIÓN COMPLETA: {o} → {c}.'],
    recordado: ['✓ MEMORIA PERSISTENTE ACTUALIZADA. 🤖', 'HECHO ALMACENADO EN BASE DE CONOCIMIENTO.'],
  },
}

/** Genera la respuesta de la mascota para un evento (capa sin IA). */
export function responder(id: MascotaId, ev: EventoResp): string {
  const opciones = FRASES[id][ev.tipo]
  const plantilla = opciones[Math.floor(Math.random() * opciones.length)]
  return plantilla
    .replace('{c}', ev.cuarto ?? 'la bitácora')
    .replace('{o}', ev.objeto ?? 'el objeto')
}
