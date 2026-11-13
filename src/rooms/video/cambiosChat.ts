import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { ClipVideo, ClipTexto, EstiloTexto, FiltroEscena, MovimientoClip, TipoTransicion } from '../../core/data/db'
import { MIN_CLIP } from './constantes'
import { COLOR_OK, DIRECCIONES, EFECTOS, estiloTexto, FILTROS, lista, num } from './iaEdicion'
import { fin, normalizar, redondear } from './modelo'
import { ID_TRANSCRIPCION } from './subtitulos'

/**
 * «Pedir cambios por chat»: el usuario dice qué cambiar («títulos más grandes»,
 * «quita el zoom del final») y la IA devuelve CAMBIOS sobre los clips que ya
 * existen, nunca clips nuevos ni la edición entera. Cada cambio se valida
 * campo a campo (lista blanca por pista) antes de tocar el proyecto. Una
 * llamada de texto: 1 crédito.
 */

const MOVS = new Set<MovimientoClip>(['zoomIn', 'zoomOut', 'punch', 'panIzq', 'panDer'])
const MAX_LINEAS = 160
/** Tope de salida: por debajo del corte de `texto`, así cuesta 1 crédito. */
const TOKENS = 1200

// Booleano y no guarda de tipo: descartar un subtítulo no debe descartar a todos los textos.
const esSubtitulo = (c: ClipVideo): boolean => c.pista === 'texto' && c.origen === 'narracion' && c.deClipId === ID_TRANSCRIPCION

const estiloCorto = (e: EstiloTexto) =>
  `posicion=${e.posicion} tamano=${e.tamano} color=${e.color} fuente=${e.fuente ?? 'sans'} animacion=${e.animacion ?? 'ninguna'} caja=${!!e.caja}${e.resaltado ? ` resaltado=${e.resaltado}` : ''}`

/** El proyecto en líneas cortas con alias (c1, c2…): lo que la IA puede tocar. */
function describir(clips: ClipVideo[]): { texto: string; alias: Map<string, string> } {
  const alias = new Map<string, string>()
  const lineas: string[] = []
  const rango = (c: ClipVideo) => `${c.inicio.toFixed(1)}–${fin(c).toFixed(1)} s`
  const subs = clips.filter((c): c is ClipTexto => esSubtitulo(c))
  if (subs.length) lineas.push(`subtitulos · ${subs.length} subtítulos de la transcripción · ${estiloCorto(subs[0].texto)}`)
  for (const c of clips) {
    if (lineas.length >= MAX_LINEAS || esSubtitulo(c)) continue
    const id = `c${alias.size + 1}`
    let datos: string | null = null
    switch (c.pista) {
      case 'texto':
        datos = `título «${c.texto.contenido.slice(0, 60)}» · ${estiloCorto(c.texto)}`
        break
      case 'video':
        datos = [
          `video (${c.fuente.tipo})`,
          `movimiento=${c.movimiento ?? 'ninguno'}`,
          `filtro=${c.filtro}`,
          `transicion=${c.transicion?.tipo ?? 'corte'}`,
          `velocidad=${c.velocidad ?? 1}`,
          `volumen=${c.volumen}`,
          c.color ? `color=${JSON.stringify(c.color)}` : '',
          c.limpiarVoz ? 'limpiarVoz' : '',
        ]
          .filter(Boolean)
          .join(' ')
        break
      case 'imagen':
        datos = `imagen${c.cubrir ? ' de apoyo a pantalla completa' : ' superpuesta'} movimiento=${c.movimiento ?? 'ninguno'} opacidad=${c.opacidad}`
        break
      case 'musica':
        datos = `música volumen=${c.volumen} agachar=${!!c.agachar}`
        break
      case 'sfx':
        datos = `efecto de sonido ${c.fuente.tipo === 'fabrica' ? c.fuente.clave : ''} volumen=${c.volumen}`
        break
      case 'voz':
        datos = `narración «${(c.texto ?? '').slice(0, 40)}» volumen=${c.volumen}`
        break
    }
    if (!datos) continue
    alias.set(id, c.id)
    lineas.push(`${id} · ${rango(c)} · ${datos}`)
  }
  return { texto: lineas.join('\n'), alias }
}

function system(): string {
  return [
    'Eres el asistente de un editor de video. El usuario pide un cambio sobre un video YA editado. Te doy sus clips (id · tiempo · datos).',
    'Responde ÚNICAMENTE con JSON: {"resumen":"<una frase, en el idioma del usuario, de lo que cambiaste>","cambios":[...]}.',
    'Cada cambio es {"id":"c3", ...campos a cambiar} o {"id":"c3","quitar":true}. Ids de grupo: "subtitulos" (todos los subtítulos), "titulos" (todos los títulos) y "videos" (todos los clips de video).',
    'Campos por tipo (pon solo los que cambian):',
    '- título/subtítulos: posicion (arriba|centro|abajo), tamano (S|M|L), color (#rrggbb), fuente (sans|serif|mono|display), animacion (ninguna|fundido|subir|maquina), caja (true/false), resaltado (#rrggbb); un título suelto también contenido, inicio y duracion.',
    '- video: movimiento (ninguno|zoomIn|zoomOut|punch|panIzq|panDer), filtro (ninguno|bn|sepia|calido|frio|oscuro), transicion (corte|fundido|disolver|deslizar|barrido|zoom|desenfoque), volumen (0–1), limpiarVoz (true/false), color ({"brillo":0.1,"contraste":0,"saturacion":0.2} de -1 a 1, o null).',
    '- imagen: movimiento, opacidad (0–1), inicio, duracion, quitar.',
    '- música: volumen (0–1), agachar (true = baja cuando alguien habla), quitar.',
    '- efecto de sonido y narración: volumen; los efectos también quitar.',
    'No inventes clips ni ids. Los videos no se quitan (eso es cortar). Si no se puede hacer lo que pide, "cambios":[] y explícalo en el resumen.',
  ].join('\n')
}

export interface ResultadoCambios {
  clips: ClipVideo[]
  resumen: string
  /** Clips que cambiaron o se quitaron. */
  tocados: number
}

/** Aplica UN cambio validado a un clip; null = quitarlo; el mismo objeto = nada válido que cambiar. */
function aplicarA(c: ClipVideo, x: Record<string, unknown>, suelto: boolean): ClipVideo | null {
  const vol = num(x.volumen)
  const volumen = vol != null ? Math.max(0, Math.min(1, vol)) : undefined
  const tiempo = (): { inicio?: number; duracion?: number } => {
    const ini = num(x.inicio)
    const dur = num(x.duracion)
    return {
      ...(ini != null && suelto ? { inicio: redondear(Math.max(0, ini)) } : {}),
      ...(dur != null && suelto ? { duracion: redondear(Math.max(MIN_CLIP, Math.min(60, dur))) } : {}),
    }
  }
  const mov = (v: unknown): MovimientoClip | undefined | null =>
    v === undefined ? null : v === 'ninguno' || v === null ? undefined : MOVS.has(v as MovimientoClip) ? (v as MovimientoClip) : null
  switch (c.pista) {
    case 'texto': {
      if (x.quitar === true && suelto && !esSubtitulo(c)) return null
      const texto: EstiloTexto = {
        ...estiloTexto(x, c.texto),
        ...(typeof x.resaltado === 'string' && COLOR_OK.test(x.resaltado) ? { resaltado: x.resaltado } : {}),
        ...(suelto && typeof x.contenido === 'string' && x.contenido.trim() ? { contenido: x.contenido.trim().slice(0, 120) } : {}),
      }
      return { ...c, ...tiempo(), texto }
    }
    case 'video': {
      let nuevo = { ...c }
      const m = mov(x.movimiento)
      if (m !== null) nuevo = { ...nuevo, movimiento: m }
      if (FILTROS.has(x.filtro as FiltroEscena)) nuevo = { ...nuevo, filtro: x.filtro as FiltroEscena }
      if (x.transicion === 'corte') delete nuevo.transicion
      else if (EFECTOS.has(x.transicion as TipoTransicion)) {
        const tipo = x.transicion as TipoTransicion
        const dir = DIRECCIONES.has(String(nuevo.transicion?.direccion)) ? nuevo.transicion?.direccion : undefined
        nuevo = { ...nuevo, transicion: { tipo, duracion: tipo === 'zoom' || tipo === 'barrido' ? 0.3 : 0.5, ...(dir ? { direccion: dir } : {}) } }
      }
      if (volumen != null) nuevo = { ...nuevo, volumen }
      if (typeof x.limpiarVoz === 'boolean') nuevo = { ...nuevo, limpiarVoz: x.limpiarVoz || undefined }
      if (x.color === null) delete nuevo.color
      else if (x.color && typeof x.color === 'object') {
        const col = x.color as Record<string, unknown>
        const v = (k: string) => {
          const n = num(col[k])
          return n == null || Math.abs(n) < 0.02 ? undefined : Math.max(-1, Math.min(1, n))
        }
        const color = { brillo: v('brillo'), contraste: v('contraste'), saturacion: v('saturacion') }
        if (color.brillo || color.contraste || color.saturacion) nuevo = { ...nuevo, color }
        else delete nuevo.color
      }
      return nuevo
    }
    case 'imagen': {
      if (x.quitar === true) return null
      const m = mov(x.movimiento)
      const op = num(x.opacidad)
      return { ...c, ...tiempo(), ...(m !== null ? { movimiento: m } : {}), ...(op != null ? { opacidad: Math.max(0, Math.min(1, op)) } : {}) }
    }
    case 'musica':
      if (x.quitar === true) return null
      return { ...c, ...(volumen != null ? { volumen } : {}), ...(typeof x.agachar === 'boolean' ? { agachar: x.agachar || undefined } : {}) }
    case 'sfx':
      if (x.quitar === true) return null
      return volumen != null ? { ...c, volumen } : c
    case 'voz':
      return volumen != null ? { ...c, volumen } : c
    default:
      return c
  }
}

/** Pide los cambios a la IA y los aplica (no guarda: devuelve los clips nuevos). */
export async function pedirCambios(clips: ClipVideo[], pedido: string): Promise<ResultadoCambios> {
  const { texto, alias } = describir(clips)
  const mensaje = `Clips del video:\n${texto || '(sin clips editables)'}\n\nLo que pide el usuario: ${pedido.trim().slice(0, 600)}`
  let crudo: Record<string, unknown> | null = null
  let ultimo: unknown = null
  for (let intento = 0; intento < 2 && !crudo; intento++) {
    const respuesta = await conversarIA(system(), [{ rol: 'usuario', texto: mensaje }], TOKENS)
    try {
      crudo = extraerJSON(respuesta)
    } catch (e) {
      ultimo = e
    }
  }
  if (!crudo) throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió un JSON usable')

  const porId = new Map(clips.map((c) => [c.id, c] as const))
  const destinos = (id: string): { ids: string[]; suelto: boolean } => {
    if (id === 'subtitulos') return { ids: clips.filter(esSubtitulo).map((c) => c.id), suelto: false }
    if (id === 'titulos') return { ids: clips.filter((c) => c.pista === 'texto' && !esSubtitulo(c)).map((c) => c.id), suelto: false }
    if (id === 'videos') return { ids: clips.filter((c) => c.pista === 'video').map((c) => c.id), suelto: false }
    const real = alias.get(id)
    return { ids: real ? [real] : [], suelto: true }
  }
  const tocados = new Set<string>()
  for (const x of lista(crudo.cambios).slice(0, 60)) {
    if (typeof x.id !== 'string') continue
    const { ids, suelto } = destinos(x.id)
    for (const id of ids) {
      const c = porId.get(id)
      if (!c) continue
      const nuevo = aplicarA(c, x, suelto)
      if (nuevo === c) continue
      if (nuevo === null) porId.delete(id)
      else if (JSON.stringify(nuevo) === JSON.stringify(c)) continue
      else porId.set(id, nuevo)
      tocados.add(id)
    }
  }
  return {
    clips: normalizar([...porId.values()]),
    resumen: typeof crudo.resumen === 'string' ? crudo.resumen.trim().slice(0, 300) : '',
    tocados: tocados.size,
  }
}
