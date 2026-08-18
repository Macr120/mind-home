/**
 * La mascota/asistente del arquitecto: la "cara y voz" del chat box.
 *
 * En la capa SIN IA las respuestas son plantillas deterministas con la
 * personalidad de cada mascota. Cuando llegue la IA, `responder` se reemplaza
 * por una llamada al modelo con el tono de la mascota como system prompt.
 */

import type { Ropa, ExpresionId, PeinadoId } from '../house/apariencia'
import type { AnimacionModelo } from '../house/animacion'
import type { TFunc } from '../i18n/useT'
import { CUERPOS_PRESET } from '../house/cuerpos'

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

/**
 * Pieza primitiva de un modelo 3D generado por IA: el modelo describe el
 * personaje como una lista de cajas/esferas/conos/cilindros y aquí se renderiza.
 */
export interface Pieza3D {
  tipo: 'caja' | 'esfera' | 'cono' | 'cilindro' | 'plano'
  /** Posición del centro [x, y, z] (y=0 es el suelo). */
  pos: [number, number, number]
  /** caja: [w,h,d] · esfera: [radio] · cono: [radio, alto] · cilindro: [radioTop, radioBot, alto] · plano: [ancho, alto]. */
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
  /** Tamaño del personaje (1 = normal). */
  escala?: number
  /** Ropa que lleva puesta (mismas prendas que el personaje principal). */
  ropa?: Ropa
  /** Modelo 3D generado por IA a partir de una descripción (gana a `forma`). */
  modelo3d?: Pieza3D[]
  /** Modelo .glb subido por el usuario (gana a `modelo3d` y `forma`). */
  modeloGlb?: Blob
  /**
   * Qué preset de `CUERPOS_PRESET` (o `'base'`) originó `modelo3d`, mientras no
   * se edite (pieza movida/recoloreada, pose aplicada): así el ícono y la
   * animación de marcha saben qué cuerpo concreto es. Se limpia en cualquier
   * edición posterior.
   */
  cuerpoPresetId?: string
  /** Expresión dibujada (ojos + boca) — solo tiene efecto en Base/Princesa. */
  expresion?: ExpresionId
  /** Foto que tapa el frente de la cabeza (manda sobre la expresión). */
  rostro?: Blob
  /** Peinado dibujado sobre la cabeza — solo tiene efecto en Base. */
  peinado?: PeinadoId
  /** Color del peinado. */
  peloColor?: string
  /** Animación del personaje (preset idle y/o poses de sus piezas). */
  animacion?: AnimacionModelo
  /** Aparece como personaje en el mapa (el activo siempre aparece). */
  enMapa: boolean
  /** Lee en voz alta lo que dice, sin pedírselo (ausente = no). */
  vozLeer?: boolean
  /** Voz TTS: nombre exacto de una voz del sistema (vacío = automática por idioma). */
  vozNombre?: string
  /** Voz TTS: tono 0.5–1.5 (ausente = el de su forma). */
  vozPitch?: number
  /** Voz TTS: velocidad 0.6–1.4 (ausente = la de su forma). */
  vozRate?: number
  /** Voz TTS: volumen 0–1 (ausente = 1). */
  vozVolumen?: number
  /** Voz con IA (OpenAI o Gemini, según proveedorVoz) en vez de la del sistema (ausente = no). */
  vozIA?: boolean
  /** Voz TTS IA: una de `VOCES_IA` del proveedor (vacío = la primera). Solo aplica con `vozIA`. */
  vozIaVoz?: string
  /** Comenta cosas por su cuenta mientras pasea (ausente = sí). */
  espontaneo?: boolean
  /** Corazón 0–1: qué tan seguido comenta por su cuenta (0 = nunca). */
  corazon?: number
}

/** Voz por defecto de cada forma (rate/pitch del TTS del navegador). */
export const VOZ_FORMA: Record<MascotaId, { rate: number; pitch: number }> = {
  mago: { rate: 0.9, pitch: 0.75 },
  gato: { rate: 1.06, pitch: 1.25 },
  perro: { rate: 1.12, pitch: 1.15 },
  buho: { rate: 0.85, pitch: 0.7 },
  robot: { rate: 0.95, pitch: 0.35 },
}

/** Color por defecto del cuerpo de cada forma 3D. */
export const COLOR_FORMA: Record<MascotaId, string> = {
  mago: '#5b3fb0',
  gato: '#9aa0a6',
  perro: '#b07a45',
  buho: '#7c5e42',
  robot: '#9fb3c8',
}

/** Ícono del cuerpo Base (box-man, sin forma ni modelo propio). */
const EMOJI_BASE = '🧍'
/** Ícono de un modelo de piezas propio sin preset reconocible (IA, manual, o un preset ya editado). */
const EMOJI_MODELO_PROPIO = '🧩'
/** Ícono de un modelo .glb subido por el usuario. */
const EMOJI_MODELO_GLB = '📦'

/**
 * Ícono que refleja el modelo/forma REAL actual de un personaje (avatar o
 * asistente), para los tiles del selector — nunca un emoji guardado aparte
 * que pueda desincronizarse del cuerpo real.
 */
export function iconoModelo(p: {
  forma?: MascotaId
  cuerpoPresetId?: string
  modelo3d?: Pieza3D[]
  modeloGlb?: Blob
}): string {
  if (p.modeloGlb) return EMOJI_MODELO_GLB
  if ((p.modelo3d?.length ?? 0) > 0) {
    if (p.cuerpoPresetId === 'base') return EMOJI_BASE
    return CUERPOS_PRESET.find((c) => c.id === p.cuerpoPresetId)?.emoji ?? EMOJI_MODELO_PROPIO
  }
  if (p.forma) return MASCOTAS.find((m) => m.id === p.forma)!.emoji
  return EMOJI_BASE
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
export function responder(id: MascotaId, ev: EventoResp, t: TFunc): string {
  const opciones = FRASES[id][ev.tipo]
  const i = Math.floor(Math.random() * opciones.length)
  const plantilla = t(`mascota.${id}.${ev.tipo}.${i}`, opciones[i])
  return plantilla
    .replace('{c}', ev.cuarto ?? t('mascota.bitacora', 'la bitácora'))
    .replace('{o}', ev.objeto ?? t('mascota.elObjeto', 'el objeto'))
}

/**
 * Nombre/saludo traducidos de un asistente, SOLO si sigue siendo el valor por
 * defecto de su plantilla integrada (así nunca se pisa lo que el usuario
 * escribió a mano en el panel de personalización, que es texto 100% suyo).
 * Los asistentes creados por el usuario (id `custom-*`) no tienen plantilla:
 * se devuelven tal cual.
 */
function campoBase(t: TFunc, a: Pick<Asistente, 'id' | 'nombre' | 'saludo'>, campo: 'nombre' | 'saludo'): string {
  const base = MASCOTAS.find((m) => m.id === a.id)
  if (!base || a[campo] !== base[campo]) return a[campo]
  return t(`mascota.${a.id}.${campo}`, base[campo])
}

export const nombreAsistente = (t: TFunc, a: Pick<Asistente, 'id' | 'nombre' | 'saludo'>): string =>
  campoBase(t, a, 'nombre')
export const saludoAsistente = (t: TFunc, a: Pick<Asistente, 'id' | 'nombre' | 'saludo'>): string =>
  campoBase(t, a, 'saludo')

/** Nombre de una forma/plantilla integrada (para pickers de solo lectura). */
export const nombreForma = (t: TFunc, m: Mascota): string => t(`mascota.${m.id}.nombre`, m.nombre)
