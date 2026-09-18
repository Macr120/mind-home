import { db, type ClipVideo, type MedioVideo, type ProyectoVideo, type Transicion } from '../../core/data/db'
import { esSeedIntacta, filaSeed } from '../../core/data/sync/syncables'
import { claveLS, esDemo } from '../../core/edicion'
import type { Idioma } from '../../core/i18n/idiomas'
import { enIdioma } from '../../core/i18n/porIdioma'
import { idiomaActual } from '../../core/i18n/useT'
import { miniaturaFoto } from '../_shared/fotos'
import { MIN_CLIP } from './constantes'
import { medioIdDe, normalizar, redondear } from './modelo'
import { PROMO, PROMO_MEDIOS, PROMO_NOMBRES, type PlanPromo } from './promo.data'
import { sonidoFabrica } from './sonidos'

/**
 * El anuncio de MPH como proyecto de fábrica del Studio de video: las tomas
 * grabadas en la app en la pista principal (con transiciones y la ráfaga de
 * idiomas), la captura de escritorio encajada sobre un fondo, los rótulos, la
 * voz en off línea a línea, un clic en cada corte y el cierre en tres líneas.
 * Es una fila normal: se abre, se edita, se exporta y se BORRA como cualquier
 * video, y no vuelve (bandera) salvo en el demo, donde la BD se repone.
 *
 * Los binarios (`public/promo/`, empaquetados por
 * `marketing/promo/empaquetar-studio.mjs`) entran como medios locales con
 * `fuente: 'promo:<idioma>:<clave>'`; el español ve los clips en español y
 * el resto en inglés, cada uno con su voz. Si cambia el idioma y nadie tocó el
 * proyecto, se rehace en el nuevo; si ya se editó, solo se reponen los medios
 * que falten en este dispositivo (los binarios no sincronizan).
 */

const CLAVE_SEED = 'video-promo'
const UID = `seed-${CLAVE_SEED}`
const LS_SEMBRADO = claveLS('video.promoSembrado')
const VERSION = '1'
/** La sección del ejemplo viejo (el interruptor «Ver un ejemplo»), ya retirado. */
const EJEMPLO_VIEJO = 'video.proyecto'
const PREFIJO_FUENTE = 'promo:'
const DOMINIO = 'mindhaos.com'
const OLIVA = '#52630e'
const OLIVA_OSCURO = '#232b06'
const COLORES_CIERRE = ['#ffb319', '#ff505f', '#e4c6ff']
/** Transición de ENTRADA de cada toma; las demás son cortes. */
const TRANSICIONES: Record<string, Transicion> = {
  '01-avatar': { tipo: 'fundido' },
  '02-casa-gira': { tipo: 'zoom', duracion: 0.3 },
  '04-mosaico': { tipo: 'deslizar', direccion: 'izq', duracion: 0.3 },
  '04-temas': { tipo: 'disolver', duracion: 0.3 },
  '05-calendario': { tipo: 'deslizar', direccion: 'arriba', duracion: 0.3 },
  '06-avatar-asistente': { tipo: 'disolver', duracion: 0.3 },
  '06-chat': { tipo: 'barrido', direccion: 'der', duracion: 0.3 },
  '07-sisifo': { tipo: 'zoom', duracion: 0.3 },
  '07-baile': { tipo: 'disolver', duracion: 0.3 },
  '07-panel-ia': { tipo: 'disolver', duracion: 0.3 },
  '09-atardecer': { tipo: 'disolver', duracion: 0.5 },
}

type Fila = ProyectoVideo & { uid?: string }

let sembradoPara: string | null = null

/** Siembra (o repone) el anuncio en el idioma activo; al fallar la descarga se reintenta en la próxima apertura. */
export async function sembrarPromo(): Promise<void> {
  const idioma = idiomaActual()
  if (sembradoPara === idioma) return
  sembradoPara = idioma
  try {
    await sembrar(idioma)
  } catch (e) {
    sembradoPara = null
    if (import.meta.env.DEV) console.warn('[MPH] anuncio de fábrica del Studio de video', e)
  }
}

async function sembrar(idioma: Idioma): Promise<void> {
  const filas = (await db.proyectosVideo.toArray()) as Fila[]
  // Las filas del ejemplo viejo vivían escondidas tras el interruptor: fuera.
  const viejos = filas.filter((p) => p.ejemploDe === EJEMPLO_VIEJO && p.id != null).map((p) => p.id!)
  if (viejos.length) await db.proyectosVideo.bulkDelete(viejos)

  const actual = filas.find((p) => p.uid === UID)
  if (actual?.id != null) {
    const intacta = esSeedIntacta(actual)
    const faltan = clavesFaltantes(actual, await db.mediosVideo.toArray(), intacta ? idioma : null)
    if (faltan.length === 0) return
    if (intacta) {
      // Otro idioma, o binarios perdidos, y nadie lo ha tocado: se rehace entero
      // sobre la MISMA fila (borrarla y crear otra viajaría por el sync como baja).
      const promo = await db.mediosVideo.filter((m) => m.fuente?.startsWith(PREFIJO_FUENTE) === true).toArray()
      if (promo.length) await db.mediosVideo.bulkDelete(promo.map((m) => m.id!))
      const plan = enIdioma(PROMO, idioma)
      const ids = await materializar(plan, idioma, clavesDe(plan))
      await db.proyectosVideo.update(actual.id, { nombre: plan.nombre, clips: montar(plan, ids) })
    } else {
      // Editado: se conserva tal cual y solo se reponen los medios que faltan aquí.
      const ids = await materializar(enIdioma(PROMO, idioma), idioma, faltan)
      await db.proyectosVideo.update(actual.id, { clips: actual.clips?.map((c) => reapuntar(c, ids)) ?? [] })
    }
    return
  }
  // El usuario lo borró de su casa: no vuelve. En el demo la BD se repone al recargar.
  if (!esDemo() && localStorage.getItem(LS_SEMBRADO) === VERSION) return
  const plan = enIdioma(PROMO, idioma)
  const ids = await materializar(plan, idioma, clavesDe(plan))
  const ahora = new Date().toISOString()
  const proyecto: ProyectoVideo = {
    nombre: plan.nombre,
    aspecto: '9:16',
    calidad: '1080p',
    clips: montar(plan, ids),
    escenas: [],
    creadoEn: ahora,
    actualizadoEn: ahora,
  }
  await db.proyectosVideo.add(filaSeed(CLAVE_SEED, proyecto))
  if (!esDemo()) localStorage.setItem(LS_SEMBRADO, VERSION)
}

// ─── Medios ──────────────────────────────────────────────────────────────────
// Clave de medio: 'clip:<toma>' | 'cal:<idioma>' (calendario de la ráfaga) |
// 'escritorio' | 'voz:<línea>' | 'musica'. Va en el id del clip que lo usa
// ('promo-<clave>-<n>') y en la `fuente` del medio ('promo:<idioma>:<clave>').

const fuenteDe = (idioma: string, clave: string) => `${PREFIJO_FUENTE}${idioma}:${clave}`
const esClaveMedio = (clave: string) =>
  clave.startsWith('clip:') || clave.startsWith('cal:') || clave.startsWith('voz:') || clave === 'escritorio' || clave === 'musica'

/** La clave de medio del anuncio que lleva un clip en su id, si es de los que referencian uno. */
function claveDe(c: ClipVideo): string | null {
  const m = /^promo-(.+)-\d+$/.exec(c.id)
  return m && esClaveMedio(m[1]) ? m[1] : null
}

function clavesDe(plan: PlanPromo): string[] {
  const claves = new Set<string>()
  for (const t of plan.tomas) {
    if (t.tipo === 'clip') claves.add(`clip:${t.clip}`)
    else if (t.tipo === 'rafaga') claves.add(`cal:${t.idioma}`)
    else if (t.tipo === 'escritorio') claves.add('escritorio')
  }
  for (const v of plan.voces) claves.add(`voz:${v.linea}`)
  if (PROMO_MEDIOS.musica) claves.add('musica')
  return [...claves]
}

/**
 * Claves cuyo medio no está en este dispositivo; con `idioma`, también las que
 * apuntan a un medio de otro idioma (solo se mira en la fila intacta).
 */
function clavesFaltantes(p: ProyectoVideo, medios: MedioVideo[], idioma: string | null): string[] {
  const porId = new Map(medios.map((m) => [m.id, m]))
  const faltan = new Set<string>()
  for (const c of p.clips ?? []) {
    const clave = claveDe(c)
    const id = medioIdDe(c)
    if (!clave || id == null) continue
    const m = porId.get(id)
    if (!m || (idioma && m.fuente !== fuenteDe(idioma, clave))) faltan.add(clave)
  }
  return [...faltan]
}

async function bajar(ruta: string): Promise<Blob> {
  const r = await fetch(`${import.meta.env.BASE_URL}promo/${ruta}`)
  if (!r.ok) throw new Error(`promo/${ruta}: ${r.status}`)
  return r.blob()
}

async function medioDe(plan: PlanPromo, idioma: string, clave: string): Promise<MedioVideo> {
  const set = plan.clips
  const nombres = PROMO_NOMBRES[set]
  const base = { fuente: fuenteDe(idioma, clave), creadoEn: new Date().toISOString() }
  const toma = { ...base, tipo: 'video' as const, origen: 'grabacion' as const, ancho: 1080, alto: 1920 }
  if (clave.startsWith('clip:')) {
    const clip = clave.slice(5)
    const [blob, miniatura] = await Promise.all([bajar(`clips/${set}/${clip}.mp4`), bajar(`clips/${set}/${clip}.jpg`)])
    return { ...toma, nombre: nombres[clip] ?? clip, blob, miniatura, duracion: PROMO_MEDIOS.clips[set][clip] }
  }
  if (clave.startsWith('cal:')) {
    const otro = clave.slice(4)
    const [blob, miniatura] = await Promise.all([bajar(`clips/${otro}/05-calendario.mp4`), bajar(`clips/${otro}/05-calendario.jpg`)])
    return { ...toma, nombre: `${nombres['05-calendario']} · ${otro}`, blob, miniatura, duracion: PROMO_MEDIOS.calendarios[otro] }
  }
  if (clave === 'escritorio') {
    const blob = await bajar(`escritorio-${set}.jpg`)
    return { ...base, tipo: 'imagen', origen: 'importado', nombre: nombres.escritorio, blob, miniatura: await miniaturaFoto(blob), ...PROMO_MEDIOS.escritorio[set] }
  }
  if (clave.startsWith('voz:')) {
    const linea = clave.slice(4)
    const v = plan.voces.find((x) => x.linea === linea)
    // `tts`: al reescribir el guion en su panel, el audio se suelta para regenerarlo.
    return { ...base, tipo: 'audio', origen: 'tts', nombre: plan.lineas[linea]?.slice(0, 48) ?? linea, blob: await bajar(`voz/${idioma}/${linea}.mp3`), duracion: v?.seg }
  }
  return { ...base, tipo: 'audio', origen: 'importado', nombre: nombres.musica, blob: await bajar('musica.mp3'), duracion: PROMO_MEDIOS.musica ?? undefined }
}

/** Descarga y guarda los medios pedidos (todo o nada); devuelve clave → id. */
async function materializar(plan: PlanPromo, idioma: string, claves: string[]): Promise<Map<string, number>> {
  const filas = await Promise.all(claves.map((clave) => medioDe(plan, idioma, clave)))
  const ids = await db.mediosVideo.bulkAdd(filas, { allKeys: true })
  return new Map(claves.map((clave, i) => [clave, ids[i]]))
}

function reapuntar(c: ClipVideo, ids: Map<string, number>): ClipVideo {
  const clave = claveDe(c)
  const medioId = clave ? ids.get(clave) : undefined
  if (medioId == null) return c
  if (c.pista === 'video' && (c.fuente.tipo === 'video' || c.fuente.tipo === 'imagen')) return { ...c, fuente: { ...c.fuente, medioId } }
  if (c.pista === 'fondo' && c.fuente.tipo === 'imagen') return { ...c, fuente: { ...c.fuente, medioId } }
  if (c.pista === 'voz' || c.pista === 'musica') return { ...c, medioId }
  return c
}

// ─── Montaje ─────────────────────────────────────────────────────────────────

/** «Construye a tu personaje, construyendo tus hábitos.» → título hasta la primera coma (también la china, japonesa o árabe) y el resto de subtítulo. */
function partirEnComa(linea: string): [string, string | undefined] {
  const i = linea.search(/[,，、،]/)
  if (i < 0) return [linea, undefined]
  return [linea.slice(0, i + 1).trim(), linea.slice(i + 1).trim() || undefined]
}

function montar(plan: PlanPromo, ids: Map<string, number>): ClipVideo[] {
  const clips: ClipVideo[] = []
  let n = 0
  const id = (clave: string) => `promo-${clave}-${n++}`
  const medio = (clave: string) => {
    const m = ids.get(clave)
    if (m == null) throw new Error(`sin medio ${clave}`)
    return m
  }
  let t = 0
  for (const toma of plan.tomas) {
    const inicio = redondear(t)
    const base = { pista: 'video' as const, inicio, duracion: toma.seg, filtro: 'ninguno' as const, volumen: 0 }
    // El efecto de la carpeta de fábrica que entra con la toma (clics en los cortes rápidos, «wow», «nice»…).
    const sfx = toma.sfx ? sonidoFabrica(toma.sfx) : null
    if (sfx) clips.push({ id: id('sfx'), pista: 'sfx', inicio, duracion: sfx.duracion, fuente: { tipo: 'fabrica', clave: sfx.clave }, volumen: 0.6 })
    if (toma.tipo === 'clip') {
      const clave = `clip:${toma.clip}`
      const transicion = TRANSICIONES[toma.clip]
      clips.push({ ...base, id: id(clave), fuente: { tipo: 'video', medioId: medio(clave) }, ...(transicion && { transicion }) })
      // La llamada a probar, abajo, mientras la voz la dice sobre el atardecer.
      if (toma.clip === '09-atardecer') {
        clips.push({
          id: id('gratis'),
          pista: 'texto',
          inicio: redondear(inicio + 0.3),
          duracion: redondear(toma.seg - 0.3),
          texto: { contenido: plan.gratis, subtitulo: DOMINIO, posicion: 'abajo', tamano: 'M', color: '#ffffff', fuente: 'display', caja: true, animacion: 'subir' },
        })
      }
    } else if (toma.tipo === 'rafaga') {
      const clave = `cal:${toma.idioma}`
      clips.push({ ...base, id: id(clave), fuente: { tipo: 'video', medioId: medio(clave) } })
    } else if (toma.tipo === 'escritorio') {
      // La captura apaisada, encajada sobre un fondo de la marca (pista fondo).
      clips.push({ ...base, id: id('escritorio'), fuente: { tipo: 'imagen', medioId: medio('escritorio') }, ajuste: 'encajar', transicion: { tipo: 'zoom', duracion: 0.3 } })
      clips.push({ id: id('fondo'), pista: 'fondo', inicio, duracion: toma.seg, fuente: { tipo: 'color', color: OLIVA_OSCURO } })
    } else {
      clips.push({ ...base, id: id('cierre'), fuente: { tipo: 'color', color: OLIVA }, transicion: { tipo: 'fundido' } })
      // Cada línea del eslogan es «X, Y»: X de título y Y de subtítulo, en su tercio.
      const posiciones = ['arriba', 'centro', 'abajo'] as const
      plan.cierre.forEach((linea, i) => {
        const desde = 0.2 + i * 0.7
        const [contenido, subtitulo] = partirEnComa(linea)
        clips.push({
          id: id('eslogan'),
          pista: 'texto',
          inicio: redondear(inicio + desde),
          duracion: redondear(toma.seg - desde),
          texto: { contenido, subtitulo, posicion: posiciones[i] ?? 'centro', tamano: 'S', color: COLORES_CIERRE[i % COLORES_CIERRE.length], animacion: 'subir' },
        })
      })
    }
    t += toma.seg
  }
  for (const v of plan.voces) {
    const clave = `voz:${v.linea}`
    clips.push({ id: id(clave), pista: 'voz', inicio: v.desde, duracion: v.seg, medioId: medio(clave), texto: plan.lineas[v.linea], volumen: 1 })
  }
  // Los sonidos que rematan un argumento («faa», «aaa»): nunca encima de la voz, se cortan si entra la siguiente línea.
  for (const e of plan.efectos) {
    const s = sonidoFabrica(e.clave)
    if (!s) continue
    const siguiente = plan.voces.find((v) => v.desde > e.desde)
    const duracion = Math.min(s.duracion, siguiente ? siguiente.desde - 0.05 - e.desde : s.duracion)
    if (duracion < MIN_CLIP) continue
    clips.push({ id: id('sfx'), pista: 'sfx', inicio: e.desde, duracion: redondear(duracion), fuente: { tipo: 'fabrica', clave: s.clave }, volumen: 0.6 })
  }
  for (const r of plan.rotulos) {
    const contenido = plan.titulares[r.clave] ?? ''
    clips.push({
      id: id('rotulo'),
      pista: 'texto',
      inicio: r.desde,
      duracion: redondear(r.hasta - r.desde),
      // El gancho se escribe a máquina (la pregunta va apareciendo); el resto sube.
      texto: {
        contenido,
        posicion: 'arriba',
        tamano: contenido.length <= 14 ? 'M' : 'S',
        color: '#ffffff',
        fuente: 'display',
        caja: true,
        animacion: r.clave === 'gancho' ? 'maquina' : 'subir',
      },
    })
  }
  if (PROMO_MEDIOS.musica) {
    clips.push({ id: id('musica'), pista: 'musica', inicio: 0, duracion: redondear(t), medioId: medio('musica'), volumen: 0.25, bucle: true })
  }
  return normalizar(clips)
}
