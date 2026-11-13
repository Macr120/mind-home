import { analizarImagenIA, conversarIA, extraerJSON, type ImagenAdjunta } from '../../core/chat/ia'
import { MOODS_LISTA } from '../../core/audio/temas'
import { ErrorIA } from '../../core/cuenta/api'
import type {
  AnimacionTexto,
  ClipImagen,
  ClipPrincipal,
  ClipSfx,
  ClipTexto,
  ClipVideo,
  EstiloTexto,
  FiltroEscena,
  FuenteTexto,
  MovimientoClip,
  ProyectoVideo,
  TipoTransicion,
} from '../../core/data/db'
import type { MoodMusica } from '../../core/state/ajustesStore'
import { describirAnalisis, type AnalisisLinea, type FraseVideo, type PalabraVideo } from './analisis'
import { MAX_CLIPS, MAX_CLIPS_PRINCIPAL, MIN_CLIP, nuevoClipId } from './constantes'
import { clipsDe, dividirClip, fin, finPrincipal, normalizar, redondear, tiempoMedio, velocidadDe, type ProyectoAbierto } from './modelo'
import { SONIDOS_FABRICA, sonidoFabrica } from './sonidos'
import { ID_TRANSCRIPCION, normalizarPalabra, SUBTITULO_TRANSCRIPCION, subtitulosDeFrases, subtitulosDePalabras } from './subtitulos'

/**
 * Las dos funciones de IA que trabajan sobre el video YA grabado:
 *
 * - **Editar con IA**: la IA oye la transcripción, ve la hoja de contactos y
 *   devuelve un PLAN (cortes, títulos, filtros por tramo, efectos en los cortes,
 *   sonidos, estilo de subtítulos). El plan se aplica EN CÓDIGO sobre la línea:
 *   la IA nunca escribe clips. Los silencios se recortan sin IA (medidos).
 * - **Clipear**: la IA elige los mejores momentos de un video largo; cada uno
 *   se convierte en un proyecto propio listo para editar.
 *
 * Mismo esqueleto que `ia.ts`: contrato JSON estricto, validación defensiva y
 * un reintento solo por formato.
 */

export const FILTROS = new Set<FiltroEscena>(['ninguno', 'bn', 'sepia', 'calido', 'frio', 'oscuro'])
export const EFECTOS = new Set<TipoTransicion>(['fundido', 'disolver', 'deslizar', 'barrido', 'zoom', 'desenfoque'])
export const DIRECCIONES = new Set(['izq', 'der', 'arriba', 'abajo'])
const POSICIONES = new Set(['arriba', 'centro', 'abajo'])
const TAMANOS = new Set(['S', 'M', 'L'])
const FUENTES = new Set<FuenteTexto>(['sans', 'serif', 'mono', 'display'])
const ANIMACIONES = new Set<AnimacionTexto>(['ninguna', 'fundido', 'subir', 'maquina'])
export const COLOR_OK = /^#[0-9a-f]{6}$/i

const MAX_CORTES_IA = 15
const MAX_EFECTOS = 10
const MAX_TITULOS = 8
const MAX_FILTROS = 4
const MAX_SFX = 8
const MAX_DESTACADOS = 8
const MAX_APOYOS = 4
const MAX_FOTOS_IA = 40
const MAX_MOVIMIENTOS = 8
const MAX_VELOCIDADES = 3
/** Lo que queda tras recortar nunca baja de esta fracción del original (la IA no puede «borrar» el video). */
const MIN_QUEDA = 0.3

export type EstiloEdicion = 'dinamico' | 'elegante' | 'divertido' | 'profesional' | 'cine'
export const ESTILOS_EDICION: EstiloEdicion[] = ['dinamico', 'elegante', 'divertido', 'profesional', 'cine']
const DESCRIPCION_ESTILO: Record<EstiloEdicion, string> = {
  dinamico: 'dinámico para redes (TikTok/Reels): ritmo rápido, cortes con zoom, títulos con gancho',
  elegante: 'elegante y sobrio: pocas transiciones suaves (disolver/fundido), tipografía serif, filtros discretos',
  divertido: 'divertido: efectos de sonido, títulos con emojis, transiciones llamativas',
  profesional: 'profesional/corporativo: limpio, títulos claros, sin efectos de sonido',
  cine: 'cinematográfico: filtros con carácter (cálido, frío, oscuro, bn), fundidos, títulos tipo película',
}

/** Música de fondo por estilo si la IA no elige (o elige un vibe que no existe). */
const VIBE_ESTILO: Record<EstiloEdicion, MoodMusica> = {
  dinamico: 'energia',
  elegante: 'acogedor',
  divertido: 'festivo',
  profesional: 'oficina',
  cine: 'nocturno',
}

export interface OpcionesEdicion {
  instrucciones: string
  estilo: EstiloEdicion
  subtitulos: boolean
  silencios: boolean
  titulos: boolean
  efectos: boolean
  filtros: boolean
  sonidos: boolean
  /** Música de fondo (un vibe del Studio de audio) que baja sola cuando alguien habla. */
  musica: boolean
  /** Limpiar el audio del video (local, sin IA). */
  limpiarVoz: boolean
  /** Imágenes de apoyo a pantalla completa (tus fotos o generadas con IA, a la tarifa de imagen). */
  apoyos: boolean
}

/** Imagen de apoyo ya en la línea nueva, a falta de su medio (la foto elegida o la que se genere con `idea`). */
export interface ApoyoPendiente {
  inicio: number
  duracion: number
  idea: string
  fotoId?: number
}

export interface ResultadoEdicion {
  clips: ClipVideo[]
  resumen: string
  cortes: number
  segundosQuitados: number
  subtitulos: number
  titulos: number
  efectos: number
  sonidos: number
  /** Nombre de la música de fondo puesta (lo pone quien la trae). */
  musica?: string
  /** Clips de video que quedaron siguiendo la cara (lo pone quien reencuadra). */
  reencuadrados?: number
  /** Imágenes de apoyo por poner (quien aplica trae o genera cada una y las pone con `clipApoyo`). */
  apoyos: ApoyoPendiente[]
  /** Las que quedaron puestas (lo pone quien las trae). */
  apoyosPuestos?: number
}

/** Pregunta a la IA mirando la hoja de contactos; sin hoja (o si el modelo no ve imágenes), solo con el texto. */
async function pedirJSON(system: string, texto: string, hoja: ImagenAdjunta | null): Promise<Record<string, unknown>> {
  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    let respuesta: string
    if (hoja) {
      try {
        respuesta = await analizarImagenIA(system, texto, hoja)
      } catch (e) {
        if (e instanceof ErrorIA) throw e
        // Modelo sin visión (p. ej. uno local): sigue a ciegas con la transcripción.
        hoja = null
        respuesta = await conversarIA(system, [{ rol: 'usuario', texto }], 2500)
      }
    } else respuesta = await conversarIA(system, [{ rol: 'usuario', texto }], 2500)
    try {
      return extraerJSON(respuesta)
    } catch (e) {
      ultimo = e
      console.warn('[video] respuesta de IA no usable, reintentando:', respuesta.slice(0, 300))
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió un JSON usable')
}

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null)
export const lista = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [])

export function estiloTexto(o: Record<string, unknown>, base: EstiloTexto): EstiloTexto {
  return {
    ...base,
    posicion: POSICIONES.has(String(o.posicion)) ? (String(o.posicion) as EstiloTexto['posicion']) : base.posicion,
    tamano: TAMANOS.has(String(o.tamano)) ? (String(o.tamano) as EstiloTexto['tamano']) : base.tamano,
    color: typeof o.color === 'string' && COLOR_OK.test(o.color) ? o.color : base.color,
    fuente: FUENTES.has(o.fuente as FuenteTexto) ? (o.fuente as FuenteTexto) : base.fuente,
    animacion: ANIMACIONES.has(o.animacion as AnimacionTexto) ? (o.animacion as AnimacionTexto) : base.animacion,
    caja: typeof o.caja === 'boolean' ? o.caja : base.caja,
  }
}

/** Une rangos solapados o separados por menos de `hueco` s (no deja trocitos sueltos entre dos cortes) y los ordena. */
function unir(rangos: [number, number][], hueco = 0.05): [number, number][] {
  const orden = [...rangos].sort((a, b) => a[0] - b[0])
  const salida: [number, number][] = []
  for (const r of orden) {
    const u = salida[salida.length - 1]
    if (u && r[0] <= u[1] + hueco) u[1] = Math.max(u[1], r[1])
    else salida.push([r[0], r[1]])
  }
  return salida
}

// ─── Editar con IA ──────────────────────────────────────────────────────────

/** Lo que la IA propone, ya validado; la pantalla deja desmarcar cada cosa antes de aplicar. */
export interface PlanEdicion {
  resumen: string
  /** Pausas largas medidas (sin IA): se aplican todas o ninguna. */
  silencios: [number, number][]
  /** Cortes de contenido (muletillas, repeticiones…), ya ajustados al borde de las palabras. */
  cortes: { desde: number; hasta: number; motivo: string }[]
  /** Estilo de los subtítulos (el texto sale de la transcripción); null = sin subtítulos. */
  subtitulos: { estilo: EstiloTexto; karaoke: boolean } | null
  /** Palabras clave de los subtítulos: van en color y, si traen emoji, con él. */
  destacados: { palabra: string; emoji: string }[]
  titulos: { inicio: number; duracion: number; texto: EstiloTexto }[]
  efectos: { en: number; tipo: TipoTransicion; direccion?: 'izq' | 'der' | 'arriba' | 'abajo' }[]
  filtros: { desde: number; hasta: number; filtro: FiltroEscena }[]
  sonidos: { en: number; clave: string }[]
  /** Movimiento de cámara dentro de un tramo (zoom lento, golpe de zoom, paneo). */
  movimientos: { desde: number; hasta: number; tipo: MovimientoClip }[]
  /** Cámara lenta o rápida en un tramo (la duración en la línea cambia). */
  velocidades: { desde: number; hasta: number; velocidad: number }[]
  /** Corrección de color de todo el video; null = sin tocar. */
  color: { brillo?: number; contraste?: number; saturacion?: number } | null
  /** Música de fondo: un vibe del Studio de audio y su volumen; la trae y la pone quien aplica (es asíncrono). */
  musica: { vibe: MoodMusica; volumen: number } | null
  /** Limpiar el audio de los clips de video (no lo decide la IA: es la opción del usuario). */
  limpiarVoz: boolean
  /** Imágenes de apoyo: una foto del usuario (`fotoId`) o una `idea` para generarla. */
  apoyos: { desde: number; hasta: number; idea: string; fotoId?: number }[]
}

function systemEdicion(o: OpcionesEdicion, aspecto: ProyectoVideo['aspecto']): string {
  const partes: string[] = [
    `Eres editor de video profesional. Estilo pedido: ${DESCRIPCION_ESTILO[o.estilo]}. Formato ${aspecto}.`,
    'Te doy la transcripción con tiempos, el volumen del audio por segundo y (si hay) una hoja de contactos con cuadros rotulados.',
    'Decide la edición. Todos los tiempos en SEGUNDOS del video actual (los de la transcripción). Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor:',
    '{',
    '"resumen":"<una frase, en el idioma del usuario, de lo que hiciste>",',
    o.silencios || o.instrucciones.trim()
      ? `"cortes":[{"desde":12.3,"hasta":14.1,"motivo":"<muletilla, repetición, toma falsa…>"}],  // tramos a QUITAR. Máximo ${MAX_CORTES_IA}. Los silencios largos ya los quito yo: no los incluyas. Nunca quites más de la mitad del video.`
      : '"cortes":[],',
    o.subtitulos
      ? '"subtitulos":{"posicion":"abajo|centro","tamano":"S|M|L","color":"#ffffff","fuente":"sans|serif|mono|display","animacion":"ninguna|fundido|subir","caja":true,"karaoke":true,"resaltado":"#ffd400"},  // solo el ESTILO (el texto sale de la transcripción); karaoke = la palabra que suena en el color de resaltado' +
        `\n"destacados":[{"palabra":"secreto","emoji":"🤫"}],  // máximo ${MAX_DESTACADOS} palabras clave EXACTAS de la transcripción que irán en color; emoji opcional ("" sin emoji)`
      : '',
    o.titulos
      ? `"titulos":[{"inicio":0,"duracion":3,"texto":"<breve, con gancho>","subtitulo":"<opcional>","posicion":"arriba|centro|abajo","tamano":"S|M|L","color":"#ffffff","fuente":"sans|serif|mono|display","animacion":"ninguna|fundido|subir|maquina","caja":false}],  // máximo ${MAX_TITULOS}: un gancho al principio y rótulos en los momentos clave; no tapes los subtítulos (usa arriba)`
      : '',
    o.efectos
      ? `"efectos":[{"en":8.5,"tipo":"zoom|fundido|disolver|deslizar|barrido|desenfoque","direccion":"izq|der|arriba|abajo"}],  // máximo ${MAX_EFECTOS}: transición en ese segundo (cambio de tema, golpe de efecto, remate de un chiste)`
      : '',
    o.efectos
      ? `"movimientos":[{"desde":3.0,"hasta":7.5,"tipo":"zoomIn|zoomOut|punch|panIzq|panDer"}],  // máximo ${MAX_MOVIMIENTOS}: zoom lento para dar tensión, golpe de zoom (punch) en el remate, paneo en planos largos
"velocidades":[{"desde":10,"hasta":13,"velocidad":0.5}],  // máximo ${MAX_VELOCIDADES}: cámara lenta (0.5) en un momento épico SIN voz, rápida (1.5 o 2) en partes lentas sin voz; nunca sobre alguien hablando`
      : '',
    o.filtros
      ? `"filtros":[{"desde":0,"hasta":20,"filtro":"bn|sepia|calido|frio|oscuro"}],  // máximo ${MAX_FILTROS} tramos con color; solo si aporta
"color":{"brillo":0.1,"contraste":0.1,"saturacion":0.15},  // corrección general de -0.4 a 0.4 si la imagen está oscura, lavada o apagada; omítelo si se ve bien`
      : '',
    o.musica
      ? `"musica":{"vibe":"${MOODS_LISTA.map((m) => m.id).join('|')}","volumen":0.3},  // música de fondo de todo el video, que baja sola cuando alguien habla: el ambiente que encaje con el tono; volumen 0.15–0.5 (más bajo si se habla mucho)`
      : '',
    o.apoyos
      ? `"apoyos":[{"desde":12,"hasta":15.5,"idea":"<descripción visual concreta de la imagen, en inglés, sin texto escrito>","foto":2}],  // máximo ${MAX_APOYOS} imágenes de apoyo a pantalla completa (2–5 s, sin solaparse) que ilustran lo que se dice en momentos clave; no en los 3 primeros segundos. "foto" = número de una foto del usuario si alguna encaja por su nombre; si no, omítelo y se genera con "idea"`
      : '',
    o.sonidos
      ? `"sonidos":[{"en":5.2,"clave":"${SONIDOS_FABRICA.map((s) => s.clave).join('|')}"}]  // máximo ${MAX_SFX} efectos de sonido en momentos graciosos o sorprendentes`
      : '',
    '}',
    'Omite las claves que no uses. Los comentarios // son solo para ti: no los escribas en el JSON.',
    'Escribe títulos, motivos y resumen en el idioma de la transcripción (o el del usuario si no hay voz).',
  ]
  return partes.filter(Boolean).join('\n')
}

/**
 * Un corte de la IA al borde de las palabras: empieza donde empieza la primera
 * palabra que cae mayormente dentro y acaba donde acaba la última. Sin tiempos
 * por palabra, queda como vino.
 */
function ajustarCorte(desde: number, hasta: number, palabras: PalabraVideo[]): [number, number] {
  const dentro = palabras.filter((w) => (w.i + w.f) / 2 > desde && (w.i + w.f) / 2 < hasta)
  if (!dentro.length) return [desde, hasta]
  const antes = palabras.filter((w) => w.f <= dentro[0].i).pop()
  const despues = palabras.find((w) => w.i >= dentro[dentro.length - 1].f)
  // Un pelo de aire a cada lado, sin morder a la palabra vecina.
  const a = Math.max(antes ? antes.f : 0, dentro[0].i - 0.04)
  const b = Math.min(despues ? despues.i : Infinity, dentro[dentro.length - 1].f + 0.04)
  return [redondear(a), redondear(b)]
}

/** Pide la edición a la IA y la valida (no toca el proyecto). */
export async function planearEdicion(
  p: ProyectoAbierto,
  a: AnalisisLinea,
  o: OpcionesEdicion,
  /** Fotos de Medios que la IA puede usar como imágenes de apoyo (la elige por el nombre). */
  fotos: { id: number; nombre: string }[] = [],
): Promise<PlanEdicion> {
  const fotosIA = o.apoyos ? fotos.slice(0, MAX_FOTOS_IA) : []
  const principal = clipsDe(p.clips, 'video')
  const cortesPrincipal = principal.map((c) => `[${c.inicio.toFixed(1)}–${fin(c).toFixed(1)}] ${c.fuente.tipo}`).join(', ')
  const texto = [
    o.instrucciones.trim() ? `Indicaciones del usuario: ${o.instrucciones.trim()}` : 'Sin indicaciones extra: aplica el estilo.',
    `Clips actuales de la pista principal: ${cortesPrincipal}.`,
    fotosIA.length ? `Fotos del usuario: ${fotosIA.map((f, i) => `${i + 1} «${f.nombre.slice(0, 60)}»`).join(', ')}.` : '',
    describirAnalisis(a),
  ].join('\n')
  const crudo = await pedirJSON(systemEdicion(o, p.aspecto), texto, a.hoja)

  const total = finPrincipal(p.clips)
  const dentro = (t: number) => Math.max(0, Math.min(total, t))
  const cortes = lista(crudo.cortes)
    .slice(0, MAX_CORTES_IA)
    .map((c) => ({ desde: num(c.desde), hasta: num(c.hasta), motivo: typeof c.motivo === 'string' ? c.motivo.trim().slice(0, 80) : '' }))
    .filter((c): c is { desde: number; hasta: number; motivo: string } => c.desde != null && c.hasta != null && c.hasta - c.desde >= 0.3)
    .map((c) => {
      const [x, y] = ajustarCorte(dentro(c.desde), dentro(c.hasta), a.palabras)
      return { ...c, desde: x, hasta: y }
    })
    .filter((c) => c.hasta - c.desde >= MIN_CLIP)

  const sub = (crudo.subtitulos ?? {}) as Record<string, unknown>
  const karaoke = sub.karaoke !== false && a.palabras.length > 0
  const resaltado = typeof sub.resaltado === 'string' && COLOR_OK.test(sub.resaltado) ? sub.resaltado : '#ffd400'
  const estiloSub = estiloTexto(sub, { ...SUBTITULO_TRANSCRIPCION, posicion: p.aspecto === '9:16' ? 'centro' : 'abajo' })
  const destacados = o.subtitulos
    ? lista(crudo.destacados)
        .slice(0, MAX_DESTACADOS)
        .map((d) => ({ palabra: typeof d.palabra === 'string' ? normalizarPalabra(d.palabra) : '', emoji: typeof d.emoji === 'string' ? d.emoji.trim().slice(0, 4) : '' }))
        .filter((d) => d.palabra && a.frases.some((f) => f.texto.toLowerCase().includes(d.palabra)))
    : []

  const titulos = o.titulos
    ? lista(crudo.titulos)
        .slice(0, MAX_TITULOS)
        .flatMap((x) => {
          const ini = num(x.inicio)
          const contenido = typeof x.texto === 'string' ? x.texto.trim().slice(0, 90) : ''
          if (ini == null || ini < 0 || ini >= total || !contenido) return []
          const subtitulo = typeof x.subtitulo === 'string' && x.subtitulo.trim() ? x.subtitulo.trim().slice(0, 90) : undefined
          return [
            {
              inicio: ini,
              duracion: Math.max(1, Math.min(6, num(x.duracion) ?? 3)),
              texto: {
                ...estiloTexto(x, { contenido: '', posicion: 'arriba', tamano: 'L', color: '#ffffff', fuente: 'display', animacion: 'subir' }),
                contenido,
                ...(subtitulo ? { subtitulo } : {}),
              },
            },
          ]
        })
    : []

  const efectos = o.efectos
    ? lista(crudo.efectos)
        .slice(0, MAX_EFECTOS)
        .map((e) => ({ en: num(e.en), tipo: e.tipo as TipoTransicion, direccion: e.direccion }))
        .filter((e): e is { en: number; tipo: TipoTransicion; direccion: unknown } => e.en != null && e.en > 0.5 && e.en < total - 0.5 && EFECTOS.has(e.tipo))
        .map((e) => ({
          en: e.en,
          tipo: e.tipo,
          ...(DIRECCIONES.has(String(e.direccion)) && (e.tipo === 'deslizar' || e.tipo === 'barrido')
            ? { direccion: String(e.direccion) as 'izq' | 'der' | 'arriba' | 'abajo' }
            : {}),
        }))
    : []

  const filtros = o.filtros
    ? lista(crudo.filtros)
        .slice(0, MAX_FILTROS)
        .map((f) => ({ desde: dentro(num(f.desde) ?? -1), hasta: dentro(num(f.hasta) ?? -1), filtro: f.filtro as FiltroEscena }))
        .filter((f) => f.hasta - f.desde >= 1 && FILTROS.has(f.filtro) && f.filtro !== 'ninguno')
    : []

  const sonidos = o.sonidos
    ? lista(crudo.sonidos)
        .slice(0, MAX_SFX)
        .map((x) => ({ en: num(x.en), clave: typeof x.clave === 'string' && sonidoFabrica(x.clave) ? x.clave : '' }))
        .filter((x): x is { en: number; clave: string } => x.en != null && x.en >= 0 && x.en < total && !!x.clave)
    : []

  const MOVS = new Set<MovimientoClip>(['zoomIn', 'zoomOut', 'punch', 'panIzq', 'panDer'])
  const movimientos = o.efectos
    ? lista(crudo.movimientos)
        .slice(0, MAX_MOVIMIENTOS)
        .map((m) => ({ desde: dentro(num(m.desde) ?? -1), hasta: dentro(num(m.hasta) ?? -1), tipo: m.tipo as MovimientoClip }))
        .filter((m) => m.hasta - m.desde >= 0.8 && MOVS.has(m.tipo))
    : []
  const velocidades = o.efectos
    ? lista(crudo.velocidades)
        .slice(0, MAX_VELOCIDADES)
        .map((v) => ({ desde: dentro(num(v.desde) ?? -1), hasta: dentro(num(v.hasta) ?? -1), velocidad: num(v.velocidad) ?? 1 }))
        .filter((v) => v.hasta - v.desde >= 1 && v.velocidad >= 0.25 && v.velocidad <= 4 && Math.abs(v.velocidad - 1) > 0.05)
        // Nunca sobre alguien hablando (la voz se oiría rara): se descarta el tramo con palabras dentro.
        .filter((v) => !a.frases.some((f) => f.inicio < v.hasta && f.fin > v.desde))
    : []
  const c0 = (crudo.color ?? null) as Record<string, unknown> | null
  const ajuste = (v: unknown) => {
    const n = num(v)
    return n == null || Math.abs(n) < 0.02 ? undefined : Math.max(-0.5, Math.min(0.5, n))
  }
  const color = o.filtros && c0 ? { brillo: ajuste(c0.brillo), contraste: ajuste(c0.contraste), saturacion: ajuste(c0.saturacion) } : null

  const apoyos: PlanEdicion['apoyos'] = []
  if (o.apoyos) {
    const brutos = lista(crudo.apoyos)
      .slice(0, MAX_APOYOS * 2)
      .map((x) => {
        const desde = dentro(num(x.desde) ?? -1)
        const hasta = Math.min(dentro(num(x.hasta) ?? -1), desde + 6)
        const foto = num(x.foto)
        const fotoId = foto != null ? fotosIA[Math.round(foto) - 1]?.id : undefined
        const idea = typeof x.idea === 'string' ? x.idea.trim().slice(0, 300) : ''
        return { desde: redondear(desde), hasta: redondear(hasta), idea, ...(fotoId != null ? { fotoId } : {}) }
      })
      .filter((x) => x.hasta - x.desde >= 1.5 && (x.idea || x.fotoId != null))
      .sort((x, y) => x.desde - y.desde)
    for (const x of brutos) {
      if (apoyos.length >= MAX_APOYOS) break
      if (apoyos.some((y) => x.desde < y.hasta && x.hasta > y.desde)) continue
      apoyos.push(x)
    }
  }
  const m0 = (crudo.musica ?? null) as Record<string, unknown> | null
  const vibe = MOODS_LISTA.find((m) => m.id === m0?.vibe)?.id ?? VIBE_ESTILO[o.estilo]
  const musica = o.musica ? { vibe, volumen: Math.max(0.1, Math.min(0.6, num(m0?.volumen) ?? 0.3)) } : null

  return {
    apoyos,
    musica,
    limpiarVoz: o.limpiarVoz && a.frases.length > 0,
    movimientos,
    velocidades,
    color: color && (color.brillo || color.contraste || color.saturacion) ? color : null,
    resumen: typeof crudo.resumen === 'string' ? crudo.resumen.trim().slice(0, 300) : '',
    silencios: o.silencios ? a.silencios : [],
    cortes,
    subtitulos: o.subtitulos && a.frases.length ? { estilo: karaoke ? { ...estiloSub, resaltado } : destacados.length ? { ...estiloSub, resaltado } : estiloSub, karaoke } : null,
    destacados,
    titulos,
    efectos,
    filtros,
    sonidos,
  }
}

/** Texto que se dice entre dos segundos (para enseñar qué quita un corte). */
export function dichoEntre(a: AnalisisLinea, desde: number, hasta: number): string {
  const ws = a.palabras.filter((w) => w.i < hasta && w.f > desde)
  if (ws.length) return ws.map((w) => w.p).join(' ')
  return a.frases
    .filter((f) => f.inicio < hasta && f.fin > desde)
    .map((f) => f.texto)
    .join(' ')
}

/** Aplica (lo marcado de) un plan sobre la línea. */
export function aplicarPlan(p: ProyectoAbierto, a: AnalisisLinea, plan: PlanEdicion): ResultadoEdicion {
  const total = finPrincipal(p.clips)

  // 1) Rangos a quitar, con tope de lo que se puede quitar.
  let cortes = unir([...plan.silencios, ...plan.cortes.map((c) => [c.desde, c.hasta] as [number, number])], 0.5).filter(([x, y]) => y - x >= MIN_CLIP)
  const quitado = (rs: [number, number][]) => rs.reduce((s, [x, y]) => s + y - x, 0)
  if (total - quitado(cortes) < total * MIN_QUEDA) cortes = unir(plan.silencios)
  if (total - quitado(cortes) < total * MIN_QUEDA) cortes = []

  // 2) Un efecto pegado a un corte (o a un borde de clip) va JUSTO en la unión: si no, deja un trocito suelto.
  const efectos = plan.efectos.map((e) => ({ ...e }))
  const bordes = [...cortes.map(([, y]) => y), ...clipsDe(p.clips, 'video').map((c) => c.inicio), ...a.planos]
  for (const e of efectos) {
    const cerca = bordes.find((b) => Math.abs(b - e.en) < 0.6)
    if (cerca != null) e.en = cerca
  }

  // 3) Partir la principal en todos esos puntos (respetando el tope de clips principales).
  let clips = p.clips.filter((c) => !(c.pista === 'texto' && c.origen === 'narracion' && c.deClipId === ID_TRANSCRIPCION))
  const puntos = [
    ...cortes.flat(),
    ...efectos.map((e) => e.en),
    ...plan.filtros.flatMap((f) => [f.desde, f.hasta]),
    ...plan.movimientos.flatMap((m) => [m.desde, m.hasta]),
    ...plan.velocidades.flatMap((v) => [v.desde, v.hasta]),
  ]
  for (const t of puntos) {
    if (clipsDe(clips, 'video').length >= MAX_CLIPS_PRINCIPAL) break
    const c = clipsDe(clips, 'video').find((x) => t - x.inicio >= MIN_CLIP && fin(x) - t >= MIN_CLIP)
    if (c) clips = dividirClip(clips, c.id, redondear(t))
  }

  // 4) Filtros, efectos, movimientos, velocidad y color por trozo; quitar los trozos de los cortes.
  const enCorte = (t: number) => cortes.some(([x, y]) => t > x && t < y)
  const quitados: [number, number][] = []
  let nEfectos = 0
  const usados = new Set<(typeof efectos)[number]>()
  const principal: ClipPrincipal[] = []
  /** Cada trozo viejo y en qué se convierte: el mapa del segundo viejo al nuevo (cortes y velocidad). */
  const tramos: { ini: number; fin: number; escala: number; queda: boolean }[] = []
  for (const c of clipsDe(clips, 'video')) {
    const medio = c.inicio + c.duracion / 2
    if (enCorte(medio)) {
      quitados.push([c.inicio, fin(c)])
      tramos.push({ ini: c.inicio, fin: fin(c), escala: 0, queda: false })
      continue
    }
    let nuevo: ClipPrincipal = c
    if (c.fuente.tipo === 'video') {
      // Dónde se habla, en segundos del medio: la música con `agachar` baja ahí aunque luego se corte o se mueva.
      const voz = a.frases
        .filter((x) => x.fin > c.inicio && x.inicio < fin(c))
        .map((x): [number, number] => [redondear(tiempoMedio(c, Math.max(0, x.inicio - c.inicio))), redondear(tiempoMedio(c, Math.min(c.duracion, x.fin - c.inicio)))])
      nuevo = { ...nuevo, ...(voz.length ? { voz } : {}), ...(plan.limpiarVoz ? { limpiarVoz: true } : {}) }
    }
    const f = plan.filtros.find((x) => medio >= x.desde && medio < x.hasta)
    if (f) nuevo = { ...nuevo, filtro: f.filtro }
    const m = plan.movimientos.find((x) => medio >= x.desde && medio < x.hasta)
    if (m) nuevo = { ...nuevo, movimiento: m.tipo }
    if (plan.color && !nuevo.color) nuevo = { ...nuevo, color: plan.color }
    const v = c.fuente.tipo === 'video' ? plan.velocidades.find((x) => medio >= x.desde && medio < x.hasta) : undefined
    let escala = 1
    if (v) {
      // Mismo tramo del medio a otra velocidad: la duración cambia en la línea.
      escala = velocidadDe(c) / v.velocidad
      nuevo = { ...nuevo, velocidad: v.velocidad, duracion: redondear(Math.max(MIN_CLIP, c.duracion * escala)) }
    }
    tramos.push({ ini: c.inicio, fin: fin(c), escala, queda: true })
    const e = efectos.find((x) => !usados.has(x) && Math.abs(x.en - c.inicio) < 0.35)
    if (e) {
      usados.add(e)
      nEfectos++
      nuevo = {
        ...nuevo,
        transicion: { tipo: e.tipo, duracion: e.tipo === 'zoom' || e.tipo === 'barrido' ? 0.3 : 0.5, ...(e.direccion ? { direccion: e.direccion } : {}) },
      }
    }
    principal.push(nuevo)
  }
  if (principal.length === 0) throw new Error('La edición dejaría el video vacío')

  // Segundo viejo → segundo nuevo, por trozos: lo de dentro de un corte se pega al inicio del
  // siguiente; dentro de un trozo con velocidad, el tiempo se estira o encoge con él.
  const quitadosU = unir(quitados)
  const inicioNuevo: number[] = []
  let acumulado = 0
  for (const tr of tramos) {
    inicioNuevo.push(acumulado)
    if (tr.queda) acumulado += (tr.fin - tr.ini) * tr.escala
  }
  const aNuevo = (t: number) => {
    const i = tramos.findIndex((tr) => t >= tr.ini && t < tr.fin)
    if (i < 0) return redondear(t >= (tramos[tramos.length - 1]?.fin ?? 0) ? acumulado + (t - (tramos[tramos.length - 1]?.fin ?? 0)) : 0)
    const tr = tramos[i]
    return redondear(tr.queda ? inicioNuevo[i] + (t - tr.ini) * tr.escala : inicioNuevo[i])
  }
  const resto: ClipVideo[] = []
  for (const c of clips) {
    if (c.pista === 'video') continue
    const ini = aNuevo(c.inicio)
    const dur = aNuevo(fin(c)) - ini
    if (dur >= MIN_CLIP) resto.push({ ...c, inicio: ini, duracion: redondear(dur) })
  }
  clips = [...principal, ...resto]

  // 5) Subtítulos desde la transcripción, ya en la línea nueva: palabra a palabra si hay tiempos (karaoke).
  let nSub = 0
  if (plan.subtitulos) {
    const destacadas = new Map(plan.destacados.map((d) => [d.palabra, d.emoji] as const))
    let subs: ClipTexto[]
    if (a.palabras.length) {
      const palabras = a.palabras
        .filter((w) => !enCorte((w.i + w.f) / 2))
        .map((w) => ({ p: w.p, i: aNuevo(w.i), f: aNuevo(w.f) }))
      subs = subtitulosDePalabras(palabras, plan.subtitulos.estilo, destacadas)
      // Sin karaoke, el tiempo por palabra solo sirve para las claves.
      if (!plan.subtitulos.karaoke) subs = subs.map(({ tiempos: _t, ...c }) => c)
    } else {
      const frases: FraseVideo[] = a.frases.map((f) => ({ inicio: aNuevo(f.inicio), fin: aNuevo(f.fin), texto: f.texto })).filter((f) => f.fin - f.inicio >= 0.3)
      subs = subtitulosDeFrases(frases, plan.subtitulos.estilo)
    }
    nSub = subs.length
    clips.push(...subs)
  }

  // 6) Títulos.
  let nTit = 0
  for (const x of plan.titulos) {
    if (enCorte(x.inicio)) continue
    clips.push({ id: nuevoClipId(), pista: 'texto', inicio: aNuevo(x.inicio), duracion: x.duracion, texto: x.texto })
    nTit++
  }

  // 7) Efectos de sonido de fábrica.
  let nSfx = 0
  for (const x of plan.sonidos) {
    const s = sonidoFabrica(x.clave)
    if (!s || enCorte(x.en)) continue
    const clip: ClipSfx = { id: nuevoClipId(), pista: 'sfx', inicio: aNuevo(x.en), duracion: s.duracion, fuente: { tipo: 'fabrica', clave: s.clave }, volumen: 0.7 }
    clips.push(clip)
    nSfx++
  }

  // 8) Imágenes de apoyo: solo su sitio en la línea nueva (el medio lo pone quien aplica).
  const apoyos: ApoyoPendiente[] = plan.apoyos
    .filter((x) => !enCorte(x.desde))
    .map((x) => ({
      inicio: aNuevo(x.desde),
      duracion: redondear(Math.max(1, aNuevo(x.hasta) - aNuevo(x.desde))),
      idea: x.idea,
      ...(x.fotoId != null ? { fotoId: x.fotoId } : {}),
    }))

  return {
    apoyos,
    clips: normalizar(clips).slice(0, MAX_CLIPS),
    resumen: plan.resumen,
    cortes: quitadosU.length,
    segundosQuitados: redondear(quitado(quitadosU)),
    subtitulos: nSub,
    titulos: nTit,
    efectos: nEfectos,
    sonidos: nSfx,
  }
}

/** Clip de una imagen de apoyo: a pantalla completa, con zoom lento y fundido. */
export const clipApoyo = (x: ApoyoPendiente, medioId: number): ClipImagen => ({
  id: nuevoClipId(),
  pista: 'imagen',
  inicio: x.inicio,
  duracion: x.duracion,
  medioId,
  encuadre: { x: 0, y: 0, ancho: 1, alto: 1 },
  opacidad: 1,
  cubrir: true,
  movimiento: 'zoomIn',
})

// ─── Clipear los mejores momentos ───────────────────────────────────────────

export type LargoClip = 'corto' | 'medio' | 'largo'
export const LARGOS_CLIP: Record<LargoClip, [number, number]> = { corto: [15, 30], medio: [30, 60], largo: [60, 90] }

export interface Momento {
  inicio: number
  fin: number
  titulo: string
  gancho: string
  motivo: string
  /** 1–10. */
  puntuacion: number
}

function systemMomentos(cantidad: number, [min, max]: [number, number]): string {
  return [
    'Eres editor de clips virales: encuentras en un video largo los momentos que funcionan solos en redes (una idea completa, un chiste con remate, un dato sorprendente, una emoción fuerte, una acción espectacular).',
    'Te doy la transcripción con tiempos, el volumen por segundo y (si hay) una hoja de contactos con cuadros rotulados.',
    'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor:',
    '{"momentos":[{"inicio":12.5,"fin":41.0,"titulo":"<título corto del clip>","gancho":"<frase de gancho para la pantalla, máx 60 caracteres>","motivo":"<por qué funciona, una frase>","puntuacion":8}]}',
    `Hasta ${cantidad} momentos que NO se solapen, de ${min} a ${max} segundos cada uno, ordenados del mejor al peor; puntuación 1–10 honesta.`,
    'Cada clip empieza al inicio de una frase y termina al acabar una idea: que no corte a nadie a media palabra.',
    'Escribe título, gancho y motivo en el idioma de la transcripción (o el del usuario si no hay voz).',
  ].join('\n')
}

/**
 * Acerca un borde al de la frase que lo contiene (empezar al inicio de la
 * frase, terminar a su final); si no cae en ninguna (video sin voz), al cambio
 * de plano más cercano a menos de 3 s.
 */
function ajustarAFrases(m: { inicio: number; fin: number }, frases: FraseVideo[], max: number, planos: number[] = []): { inicio: number; fin: number } {
  let { inicio, fin: f } = m
  const planoCerca = (t: number) => planos.reduce<number | null>((mejor, p) => (Math.abs(p - t) < 3 && (mejor == null || Math.abs(p - t) < Math.abs(mejor - t)) ? p : mejor), null)
  const enIni = frases.find((x) => inicio > x.inicio && inicio < x.fin)
  if (enIni && inicio - enIni.inicio < 4) inicio = enIni.inicio
  else if (!enIni) inicio = planoCerca(inicio) ?? inicio
  const enFin = frases.find((x) => f > x.inicio && f < x.fin)
  if (enFin && enFin.fin - inicio <= max + 8) f = enFin.fin
  else if (!enFin) {
    const p = planoCerca(f)
    if (p != null && p > inicio) f = p
  }
  return { inicio: redondear(inicio), fin: redondear(f) }
}

export async function buscarMomentos(
  analisis: AnalisisLinea,
  opciones: { cantidad: number; largo: LargoClip; instrucciones: string },
): Promise<Momento[]> {
  const [min, max] = LARGOS_CLIP[opciones.largo]
  const texto = [
    opciones.instrucciones.trim() ? `Lo que busca el usuario: ${opciones.instrucciones.trim()}` : '',
    describirAnalisis(analisis),
  ]
    .filter(Boolean)
    .join('\n')
  const obj = await pedirJSON(systemMomentos(opciones.cantidad, [min, max]), texto, analisis.hoja)
  const dur = analisis.duracion
  const salida: Momento[] = []
  for (const x of lista(obj.momentos)) {
    let ini = num(x.inicio)
    let f = num(x.fin)
    if (ini == null || f == null) continue
    ini = Math.max(0, Math.min(dur, ini))
    f = Math.max(0, Math.min(dur, f))
    if (f - ini < Math.min(min * 0.5, dur * 0.5)) continue
    const ajustado = ajustarAFrases({ inicio: ini, fin: f }, analisis.frases, max, analisis.planos)
    // Sin solaparse más de la mitad con uno mejor ya elegido.
    const choca = salida.some((m) => Math.min(m.fin, ajustado.fin) - Math.max(m.inicio, ajustado.inicio) > (ajustado.fin - ajustado.inicio) / 2)
    if (choca) continue
    const titulo = typeof x.titulo === 'string' && x.titulo.trim() ? x.titulo.trim().slice(0, 80) : `${salida.length + 1}`
    salida.push({
      ...ajustado,
      titulo,
      gancho: typeof x.gancho === 'string' ? x.gancho.trim().slice(0, 90) : '',
      motivo: typeof x.motivo === 'string' ? x.motivo.trim().slice(0, 200) : '',
      puntuacion: Math.max(1, Math.min(10, Math.round(num(x.puntuacion) ?? 5))),
    })
    if (salida.length >= opciones.cantidad) break
  }
  if (salida.length === 0) throw new Error('La IA no encontró momentos usables')
  return salida.sort((a, b) => b.puntuacion - a.puntuacion)
}

const vozDe = (frases: FraseVideo[], a: number, b: number): [number, number][] =>
  frases.filter((f) => f.fin > a && f.inicio < b).map((f): [number, number] => [redondear(Math.max(a, f.inicio)), redondear(Math.min(b, f.fin))])

/** Proyecto nuevo con el momento: el trozo del video en la principal, el gancho arriba y (opcional) subtítulos. */
export function proyectoDeMomento(
  medioId: number,
  m: Momento,
  frases: FraseVideo[],
  opciones: { aspecto: ProyectoVideo['aspecto']; subtitulos: boolean; gancho: boolean; palabras?: PalabraVideo[] },
): Omit<ProyectoVideo, 'id'> {
  const dur = redondear(m.fin - m.inicio)
  const clips: ClipVideo[] = [
    {
      id: nuevoClipId(),
      pista: 'video',
      inicio: 0,
      duracion: dur,
      desde: m.inicio,
      fuente: { tipo: 'video', medioId },
      filtro: 'ninguno',
      volumen: 1,
      // El análisis fue del video entero (línea = medio): dónde se habla, para que la música baje ahí.
      ...(vozDe(frases, m.inicio, m.fin).length ? { voz: vozDe(frases, m.inicio, m.fin) } : {}),
    },
  ]
  if (opciones.gancho && m.gancho) {
    clips.push({
      id: nuevoClipId(),
      pista: 'texto',
      inicio: 0,
      duracion: Math.min(3, dur),
      texto: { contenido: m.gancho, posicion: 'arriba', tamano: 'M', color: '#ffffff', fuente: 'display', animacion: 'subir', caja: true },
    })
  }
  if (opciones.subtitulos) {
    const estilo = { ...SUBTITULO_TRANSCRIPCION, posicion: opciones.aspecto === '9:16' ? ('centro' as const) : ('abajo' as const) }
    const palabras = (opciones.palabras ?? []).filter((w) => w.i >= m.inicio && w.f <= m.fin + 0.05)
    if (palabras.length) {
      // Con tiempos por palabra: subtítulos karaoke.
      const relativas = palabras.map((w) => ({ p: w.p, i: Math.max(0, w.i - m.inicio), f: Math.min(dur, w.f - m.inicio) }))
      clips.push(...subtitulosDePalabras(relativas, { ...estilo, resaltado: '#ffd400' }))
    } else {
      const propias = frases
        .filter((f) => f.fin > m.inicio && f.inicio < m.fin)
        .map((f) => ({ inicio: Math.max(0, f.inicio - m.inicio), fin: Math.min(dur, f.fin - m.inicio), texto: f.texto }))
      clips.push(...subtitulosDeFrases(propias, estilo))
    }
  }
  const ahora = new Date().toISOString()
  return { nombre: m.titulo, aspecto: opciones.aspecto, clips: normalizar(clips), escenas: [], creadoEn: ahora, actualizadoEn: ahora }
}
