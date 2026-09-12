import { EMOCIONES, type EmocionId } from '../../core/chat/emociones'
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { ClipVideo, EscenaVideo, FiltroEscena, MedioVideo, NarradorVideo, TextoEscena } from '../../core/data/db'
import type { PresetAnimacionId } from '../../core/house/animacion'
import { EN_OFF, MAX_ESCENAS_IA, MAX_LINEAS_OBRA, nuevaEscenaId, PALETA_VIDEO } from './constantes'
import { asignarNarrador, clampDuracion, clipsDe, escenasAClips, serializarGuion, type ProyectoAbierto } from './modelo'

/** Un narrador del proyecto con su nombre visible (la IA lo referencia por nombre). */
export interface NarradorIA {
  narrador: NarradorVideo
  nombre: string
}

/**
 * IA del Studio de video: escribe (o rehace) el guion y mejora los títulos.
 * Mismo esqueleto que `rooms/ideas/ia.ts`: contrato JSON estricto en el system,
 * validación defensiva EN CÓDIGO, lanza con el motivo real y reintenta UNA vez
 * solo por error de formato. La IA referencia los medios POR NOMBRE exacto (los
 * ids no le dicen nada); lo no reconocido cae a fondo de color.
 */

const FILTROS_VALIDOS = new Set<FiltroEscena>(['ninguno', 'bn', 'sepia', 'calido', 'frio', 'oscuro'])
const POSICIONES = new Set(['arriba', 'centro', 'abajo'])
const TAMANOS = new Set(['S', 'M', 'L'])
const COLOR_OK = /^#[0-9a-f]{6}$/i

function system(medios: MedioVideo[], narradores: NarradorIA[]): string {
  const lista = medios
    .map((m) => `"${m.nombre}" (${m.tipo}${m.duracion ? `, ${Math.round(m.duracion)}s` : ''})`)
    .join(', ')
  const voces = narradores
    .map((n) => `"${n.nombre}"${n.narrador.asistenteId ? ' (personaje: aparece en pantalla)' : ' (voz en off)'}`)
    .join(', ')
  return [
    'Eres guionista de videos cortos. Diseñas una secuencia de escenas clara y con ritmo.',
    'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor, con esta forma:',
    '{"escenas":[{"duracion":5,"fondo":{"tipo":"medio","nombre":"<nombre EXACTO de la lista>","desde":0}|{"tipo":"color","color":"#112233"},' +
      '"texto":{"contenido":"<título breve o vacío>","posicion":"arriba|centro|abajo","tamano":"S|M|L","color":"#ffffff"},' +
      '"transicion":"corte|fundido","filtro":"ninguno|bn|sepia|calido|frio|oscuro","narracion":"<frase a narrar o vacío>"' +
      (voces ? ',"narrador":"<nombre EXACTO de la lista de voces>"' : '') +
      '}]}',
    `Máximo ${MAX_ESCENAS_IA} escenas, duraciones de 1 a 30 segundos.`,
    lista
      ? `Medios disponibles (solo puedes usarlos por su nombre exacto): ${lista}.`
      : 'No hay medios: usa fondos de color con títulos.',
    voces
      ? `Voces (quién dice cada narración; usa el nombre exacto): ${voces}. Si hay varios personajes, reparte las líneas entre ellos como un diálogo.`
      : '',
    'Escribe títulos y narración en el idioma del usuario.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Valida y traduce el JSON del modelo a clips (nombre → medioId, narrador → narradorId). El contrato sigue siendo por escenas. */
function validarGuion(obj: Record<string, unknown>, medios: MedioVideo[], narradores: NarradorIA[]): ClipVideo[] {
  const porNombre = new Map(medios.map((m) => [m.nombre.trim().toLowerCase(), m]))
  const narradorPorNombre = new Map(narradores.map((n) => [n.nombre.trim().toLowerCase(), n.narrador]))
  const crudas = Array.isArray(obj.escenas) ? (obj.escenas as unknown[]) : []
  const escenas: EscenaVideo[] = []
  // Escena → narrador de su línea (se aplica sobre los clips, ya convertidos).
  const quienDice = new Map<string, NarradorVideo>()
  for (const cruda of crudas.slice(0, MAX_ESCENAS_IA)) {
    const o = (cruda ?? {}) as Record<string, unknown>
    const duracion = clampDuracion(Number(o.duracion) || 4)
    // Fondo: medio por nombre exacto, o color.
    let fondo: EscenaVideo['fondo'] = { tipo: 'color', color: PALETA_VIDEO[1] }
    const f = (o.fondo ?? {}) as Record<string, unknown>
    if (f.tipo === 'color' && typeof f.color === 'string' && COLOR_OK.test(f.color)) {
      fondo = { tipo: 'color', color: f.color }
    } else if (typeof f.nombre === 'string') {
      const medio = porNombre.get(f.nombre.trim().toLowerCase())
      if (medio?.id != null && medio.tipo === 'imagen') fondo = { tipo: 'imagen', medioId: medio.id }
      else if (medio?.id != null && medio.tipo === 'video') {
        const desde = Math.max(0, Number(f.desde) || 0)
        fondo = { tipo: 'video', medioId: medio.id, desde: Math.min(desde, Math.max(0, (medio.duracion ?? 0) - 1)) }
      }
    }
    // Texto opcional.
    let texto: TextoEscena | undefined
    const tx = (o.texto ?? {}) as Record<string, unknown>
    if (typeof tx.contenido === 'string' && tx.contenido.trim()) {
      texto = {
        contenido: tx.contenido.trim().slice(0, 90),
        posicion: POSICIONES.has(String(tx.posicion)) ? (String(tx.posicion) as TextoEscena['posicion']) : 'centro',
        tamano: TAMANOS.has(String(tx.tamano)) ? (String(tx.tamano) as TextoEscena['tamano']) : 'M',
        color: typeof tx.color === 'string' && COLOR_OK.test(tx.color) ? tx.color : '#ffffff',
      }
    }
    const narracion = typeof o.narracion === 'string' ? o.narracion.trim().slice(0, 300) : ''
    const id = nuevaEscenaId()
    const narrador = typeof o.narrador === 'string' ? narradorPorNombre.get(o.narrador.trim().toLowerCase()) : undefined
    if (narracion && narrador) quienDice.set(id, narrador)
    escenas.push({
      id,
      duracion,
      fondo,
      texto,
      guionNarracion: narracion || undefined,
      transicion: o.transicion === 'fundido' ? 'fundido' : 'corte',
      filtro: FILTROS_VALIDOS.has(o.filtro as FiltroEscena) ? (o.filtro as FiltroEscena) : 'ninguno',
      volumen: 1,
    })
  }
  if (escenas.length === 0) throw new Error('La IA no devolvió escenas usables')
  const durMedio = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m.duracion]))
  let clips = escenasAClips(escenas, 0, (id) => durMedio.get(id))
  // La narración de cada escena nace como clip `<escena>-voz`; con personaje pasa a la pista avatar.
  for (const [escenaId, n] of quienDice) clips = asignarNarrador(clips, `${escenaId}-voz`, n)
  return clips
}

/**
 * Genera (o rehace, si se pasa `actual`) el guion como clips: pista principal
 * compacta + textos + narraciones (con guion, sin audio). El resultado NUNCA
 * pisa sin preguntar: quien llama confirma antes de reemplazar.
 */
export async function generarGuion(
  descripcion: string,
  medios: MedioVideo[],
  actual?: ProyectoAbierto,
  narradores: NarradorIA[] = [],
): Promise<ClipVideo[]> {
  const partes = [descripcion.trim()]
  if (actual && actual.clips.length > 0) {
    const quien = (c: { narradorId?: string }) => narradores.find((n) => n.narrador.id === c.narradorId)?.nombre
    partes.push('', 'Guion actual (rehazlo siguiendo la instrucción):', serializarGuion(actual, medios, quien))
  }
  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await conversarIA(system(medios, narradores), [{ rol: 'usuario', texto: partes.join('\n') }], 3000)
    try {
      return validarGuion(extraerJSON(respuesta), medios, narradores)
    } catch (e) {
      ultimo = e
      console.warn('[video] respuesta de IA no usable, reintentando:', respuesta.slice(0, 300))
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió un guion usable')
}

// ─── La obra del estudio de cine ─────────────────────────────────────────────

/** Una marioneta con su nombre visible (la IA la referencia por nombre). */
export interface PersonajeIA {
  id: string
  nombre: string
}

/** Una línea de la obra tal como la devuelve la IA, ya validada: `personaje` es un id de actor o `EN_OFF`. */
export interface LineaIA {
  personaje: string
  texto: string
  emocion?: EmocionId
  gesto?: Exclude<PresetAnimacionId, 'vida'>
}

const EMOCIONES_OK = new Set<string>(Object.keys(EMOCIONES))
// Exhaustivo por el tipo (un preset nuevo obliga a decidir aquí), sin arrastrar `animacion.ts` (three) a la IA.
const GESTOS_OK: Record<Exclude<PresetAnimacionId, 'vida'>, true> = { girar: true, flotar: true, pulsar: true, mecerse: true, rebotar: true, temblar: true }

function systemObra(personajes: PersonajeIA[]): string {
  return [
    'Eres dramaturgo: escribes obras de teatro cortas para marionetas, con diálogos vivos, humor y un pequeño arco (planteamiento, giro y cierre).',
    'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor, con esta forma:',
    '{"lineas":[{"personaje":"<nombre EXACTO de la lista, o \\"Narrador\\" para la voz en off>","texto":"<lo que dice>",' +
      '"emocion":"felicidad|enojo|sorpresa|aprobacion|gusto|tristeza|","gesto":"girar|flotar|pulsar|mecerse|rebotar|temblar|"}]}',
    `Máximo ${MAX_LINEAS_OBRA} líneas, de hasta 200 caracteres cada una; reparte las líneas como un diálogo; el narrador solo si hace falta.`,
    `Personajes: ${personajes.map((p) => `"${p.nombre}"`).join(', ')}.`,
    'Deja emocion y gesto vacíos cuando no aporten. Escribe en el idioma del usuario.',
  ].join('\n')
}

/** Valida el JSON del modelo: nombre → id de actor (desconocido o «Narrador» → en off), emoción y gesto por catálogo. */
function validarObra(obj: Record<string, unknown>, personajes: PersonajeIA[]): LineaIA[] {
  const porNombre = new Map(personajes.map((p) => [p.nombre.trim().toLowerCase(), p.id]))
  const crudas = Array.isArray(obj.lineas) ? (obj.lineas as unknown[]) : []
  const lineas: LineaIA[] = []
  for (const l of crudas.slice(0, MAX_LINEAS_OBRA)) {
    if (!l || typeof l !== 'object') continue
    const o = l as Record<string, unknown>
    const texto = typeof o.texto === 'string' ? o.texto.trim().slice(0, 200) : ''
    if (!texto) continue
    const nombre = typeof o.personaje === 'string' ? o.personaje.trim().toLowerCase() : ''
    const linea: LineaIA = { personaje: porNombre.get(nombre) ?? EN_OFF, texto }
    if (typeof o.emocion === 'string' && EMOCIONES_OK.has(o.emocion)) linea.emocion = o.emocion as EmocionId
    if (typeof o.gesto === 'string' && o.gesto in GESTOS_OK) linea.gesto = o.gesto as LineaIA['gesto']
    lineas.push(linea)
  }
  if (lineas.length === 0) throw new Error('La IA no devolvió líneas')
  return lineas
}

/** Escribe la obra desde una idea: las líneas, quién las dice y con qué emoción y gesto. Quien llama decide si reemplaza o añade. */
export async function generarObra(idea: string, personajes: PersonajeIA[]): Promise<LineaIA[]> {
  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await conversarIA(systemObra(personajes), [{ rol: 'usuario', texto: idea.trim() }], 3000)
    try {
      return validarObra(extraerJSON(respuesta), personajes)
    } catch (e) {
      ultimo = e
      console.warn('[video] respuesta de IA no usable, reintentando:', respuesta.slice(0, 300))
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió una obra usable')
}

/** Mejora los títulos (clips de texto escritos a mano, no los subtítulos generados) en una sola llamada. */
export async function mejorarTitulos(clips: ClipVideo[]): Promise<Map<string, string>> {
  const conTexto = clipsDe(clips, 'texto').filter((c) => c.texto.contenido.trim() && c.origen !== 'narracion')
  if (conTexto.length === 0) return new Map()
  const sys = [
    'Eres editor de títulos de video: los haces breves, claros y con gancho, sin cambiar el sentido.',
    'Responde ÚNICAMENTE con JSON: {"titulos":["<título 1>","<título 2>",...]} en el MISMO orden y cantidad.',
    'Escribe en el idioma del usuario.',
  ].join('\n')
  const texto = conTexto.map((c, i) => `${i + 1}. ${c.texto.contenido}`).join('\n')
  const respuesta = await conversarIA(sys, [{ rol: 'usuario', texto }], 800)
  const obj = extraerJSON(respuesta)
  const titulos = Array.isArray(obj.titulos) ? (obj.titulos as unknown[]) : []
  const salida = new Map<string, string>()
  conTexto.forEach((e, i) => {
    const nuevo = titulos[i]
    if (typeof nuevo === 'string' && nuevo.trim()) salida.set(e.id, nuevo.trim().slice(0, 90))
  })
  if (salida.size === 0) throw new Error('La IA no devolvió títulos usables')
  return salida
}

/** Traduce textos del video (una narración o un rótulo con su subtítulo) a un idioma, en una llamada: mismo orden y cantidad. */
export async function traducirTextos(textos: string[], idioma: string): Promise<string[]> {
  const sys = [
    `Eres traductor profesional. Traduce cada texto al idioma «${idioma}» conservando el tono, los saltos de línea y los emojis, sin añadir ni quitar nada.`,
    'Responde ÚNICAMENTE con JSON: {"textos":["<texto 1>","<texto 2>",...]} en el MISMO orden y cantidad; un texto vacío se devuelve vacío.',
  ].join('\n')
  const cuerpo = textos.map((x, i) => `${i + 1}. ${x}`).join('\n')
  const respuesta = await conversarIA(sys, [{ rol: 'usuario', texto: cuerpo }], 1200)
  const obj = extraerJSON(respuesta)
  const salida = Array.isArray(obj.textos) ? (obj.textos as unknown[]) : []
  if (salida.length !== textos.length || !salida.every((x) => typeof x === 'string')) throw new Error('La IA no devolvió la traducción completa')
  return (salida as string[]).map((x) => x.trim())
}
