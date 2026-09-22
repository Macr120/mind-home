import { abrirApp } from '../../core/abrirApp'
import type {
  CamaraPelicula,
  ClipAvatar,
  ClipFondo,
  ClipImagen,
  ClipMusica,
  ClipPrincipal,
  ClipSfx,
  ClipTexto,
  ClipVideo,
  ClipVoz,
  EfectoCamaraId,
  Encuadre,
  EscenaActor,
  EstiloTexto,
  FiltroEscena,
  FiltroVoz,
  MedioVideo,
  NarradorVideo,
  PistaId,
  ProyectoVideo,
  Transicion,
} from '../../core/data/db'
import { idMedioPorRemotoId, mediosVideoRepo, proyectosVideoRepo } from '../../core/data/repository'
import * as api from '../../core/espacios/api'
import { refrescarEspacios } from '../../core/espacios/conectar'
import { nombreTipo } from '../../core/espacios/enlaces'
import {
  descargarMedio,
  leerMediosRemotos,
  subirMedio,
  TOPE_MEDIO,
  TOPE_PROYECTO,
  type MedioRemoto,
} from '../../core/espacios/medios'
import type { Espacio } from '../../core/espacios/tipos'
import { espacioLocal } from '../../core/espacios/transporte'
import { tGlobal } from '../../core/i18n/useT'
import { notificar } from '../../core/notificaciones'
import { useDiseño } from '../../core/state/disenoStore'
import { miniaturaFoto } from '../_shared/fotos'
import {
  ASPECTOS,
  CALIDADES,
  FILTROS,
  MAX_CLIPS,
  MAX_CLIPS_PRINCIPAL,
  MAX_ESCENA,
  MAX_NARRADORES,
  MIN_CLIP,
  nuevoClipId,
  ORDEN_PISTAS,
} from './constantes'
import { completarGrabacion } from './importar'
import { medioIdDe, mediosUsados, migrarProyecto, normalizar } from './modelo'

/**
 * El Studio de video por enlace: compartir un proyecto y recibir los que otras
 * personas comparten.
 *
 * Como en audio, el proyecto entero viaja como SNAPSHOT bajo el turno de
 * edición (video tampoco usa el log de cambios). La diferencia está en los
 * MEDIOS: `mediosVideo` es una tabla local de blobs, así que el `medioId` de un
 * clip no significa nada en otro dispositivo. Lo que viaja es un `medioRef`, el
 * nombre del objeto en el bucket del espacio, y una lista con la ficha de cada
 * uno; quien recibe se los baja y los guarda con ese `remotoId`.
 *
 * Lo que no se pudo subir (o aún no se ha bajado) deja el clip marcado como
 * «medio no disponible», la misma UX que ya existía para un proyecto que llega
 * por el sync personal a un dispositivo sin los blobs.
 */

export const SNAPSHOT_VIDEO_V = 1

/**
 * `medioId` de un clip cuyo medio no está aquí: ningún autoincremento de Dexie
 * lo produce, así que la timeline y el render lo pintan como ausente («Medio no
 * disponible en este dispositivo») en vez de perder el clip.
 */
export const MEDIO_AUSENTE = -1

const MAX_NOMBRE = 80
const MAX_TEXTO = 2000
/** Duración tope de cualquier clip: el proyecto entero, si alguien lo estira. */
const MAX_SEG = MAX_CLIPS * MAX_ESCENA
/** Muestras de la envolvente de boca de un avatar (10 min a 20 Hz). */
const MAX_ENVOLVENTE = 12_000

const sinTitulo = () => tGlobal('esp.sinTitulo', 'Sin título')

/**
 * La clave con la que un medio local recuerda su objeto en el bucket:
 * `<espacioId>/<ref>`. Lleva el espacio porque el bucket solo deja leer a sus
 * miembros: el mismo archivo compartido en dos espacios son dos objetos.
 */
const claveRemota = (espacioId: string, ref: string) => `${espacioId}/${ref}`

// ─── lo que viaja ────────────────────────────────────────────────────────────

/** Fuente visual con la referencia del bucket en lugar del id local. */
type FuenteRemota =
  | { tipo: 'color'; color: string }
  | { tipo: 'imagen'; medioRef?: string }
  | { tipo: 'video'; medioRef?: string }
  | { tipo: 'escena3d'; cam: CamaraPelicula; camFin?: CamaraPelicula; efecto?: EfectoCamaraId; seguir?: string }
type FuenteFondoRemota = Extract<FuenteRemota, { tipo: 'color' } | { tipo: 'imagen' }>
type FuenteSonidoRemota = { tipo: 'fabrica'; clave: string } | { tipo: 'medio'; medioRef?: string }

type ConRef<T extends { medioId?: number }> = Omit<T, 'medioId'> & { medioRef?: string }

/** Un clip tal como viaja: mismo contenido, con `medioRef` donde iba `medioId`. */
export type ClipRemoto =
  | (Omit<ClipPrincipal, 'fuente'> & { fuente: FuenteRemota })
  | (Omit<ClipFondo, 'fuente'> & { fuente: FuenteFondoRemota })
  | ConRef<ClipImagen>
  | ClipTexto
  | ConRef<ClipVoz>
  | ConRef<ClipMusica>
  | (Omit<ClipSfx, 'fuente'> & { fuente: FuenteSonidoRemota })
  | ConRef<ClipAvatar>

/** Campos del proyecto que viajan: ni ids locales, ni publicaciones, ni el ejemplo de fábrica. */
type ProyectoRemoto = Pick<
  ProyectoVideo,
  'nombre' | 'aspecto' | 'calidad' | 'pistasSilenciadas' | 'volumenPistas' | 'vozNarrador' | 'narradores' | 'escenario'
> & { clips: ClipRemoto[] }

export interface SnapshotVideo {
  v: typeof SNAPSHOT_VIDEO_V
  proyecto: ProyectoRemoto
  medios: MedioRemoto[]
}

/** Lo que devuelve la lectura defensiva de un snapshot ajeno. */
export interface SnapshotVideoLeido {
  proyecto: ProyectoRemoto
  medios: MedioRemoto[]
}

// ─── proyección (lo mío hacia el espacio) ────────────────────────────────────

function sinMedioId<T extends { medioId?: number }>(c: T, medioRef: string | undefined): ConRef<T> {
  const { medioId: _id, ...resto } = c
  return { ...resto, ...(medioRef ? { medioRef } : {}) }
}

function proyectarClip(c: ClipVideo, ref: (medioId: number | undefined) => string | undefined): ClipRemoto {
  switch (c.pista) {
    case 'video': {
      const f = c.fuente
      const fuente: FuenteRemota =
        f.tipo === 'imagen' || f.tipo === 'video' ? { tipo: f.tipo, medioRef: ref(f.medioId) } : f
      return { ...c, fuente }
    }
    case 'fondo': {
      const f = c.fuente
      const fuente: FuenteFondoRemota = f.tipo === 'imagen' ? { tipo: 'imagen', medioRef: ref(f.medioId) } : f
      return { ...c, fuente }
    }
    case 'sfx':
      return {
        ...c,
        fuente: c.fuente.tipo === 'medio' ? { tipo: 'medio', medioRef: ref(c.fuente.medioId) } : c.fuente,
      }
    case 'imagen':
      return sinMedioId(c, ref(c.medioId))
    case 'musica':
      return sinMedioId(c, ref(c.medioId))
    case 'voz':
      return sinMedioId(c, ref(c.medioId))
    case 'avatar':
      return sinMedioId(c, ref(c.medioId))
    default:
      return c
  }
}

/**
 * El proyecto listo para subir. `refs` trae la ficha del bucket de cada medio
 * local que se pudo subir (`subirMediosDelProyecto`); los que falten dejan el
 * clip sin referencia, y quien lo reciba verá «medio no disponible».
 */
export function proyectarSnapshot(p: ProyectoVideo, refs: Map<number, MedioRemoto>): SnapshotVideo {
  const ref = (medioId: number | undefined) => (medioId != null ? refs.get(medioId)?.ref : undefined)
  const clips = (p.clips ?? []).map((c) => proyectarClip(c, ref))
  const usados = new Set(mediosUsados(p))
  return {
    v: SNAPSHOT_VIDEO_V,
    proyecto: {
      nombre: p.nombre,
      aspecto: p.aspecto,
      calidad: p.calidad,
      clips,
      pistasSilenciadas: p.pistasSilenciadas,
      volumenPistas: p.volumenPistas,
      vozNarrador: p.vozNarrador,
      narradores: p.narradores,
      escenario: p.escenario,
    },
    medios: [...refs.entries()].filter(([id]) => usados.has(id)).map(([, m]) => m),
  }
}

// ─── lectura defensiva (esto viene de OTRA persona) ──────────────────────────

const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const num = (v: unknown, min: number, max: number, def: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def

const numOpc = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined

const texto = (v: unknown, tope: number, def: string): string => (typeof v === 'string' ? v.slice(0, tope) : def)

const textoOpc = (v: unknown, tope: number): string | undefined =>
  typeof v === 'string' && v ? v.slice(0, tope) : undefined

const uno = <T extends string>(v: unknown, validos: ReadonlySet<string>, def: T): T =>
  typeof v === 'string' && validos.has(v) ? (v as T) : def

const unoOpc = <T extends string>(v: unknown, validos: ReadonlySet<string>): T | undefined =>
  typeof v === 'string' && validos.has(v) ? (v as T) : undefined

/** Un `ref` es un nombre de objeto, nunca una ruta: ni barras ni saltos de carpeta. */
const refOpc = (v: unknown): string | undefined =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : undefined

const color = (v: unknown, def: string): string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : def

const PISTAS_VALIDAS: ReadonlySet<string> = new Set(ORDEN_PISTAS)
const FILTROS_VALIDOS: ReadonlySet<string> = new Set(Object.keys(FILTROS))
const ASPECTOS_VALIDOS: ReadonlySet<string> = new Set(ASPECTOS)
const CALIDADES_VALIDAS: ReadonlySet<string> = new Set(Object.keys(CALIDADES))
// Listas blancas en línea (como en audio): el lector no debe arrastrar módulos
// de UI ni de 3D solo para saber qué cadenas son válidas.
const TIPOS_TRANSICION: ReadonlySet<string> = new Set(['corte', 'fundido', 'disolver', 'deslizar', 'barrido', 'zoom', 'desenfoque'])
const DIRECCIONES: ReadonlySet<string> = new Set(['izq', 'der', 'arriba', 'abajo'])
const ESQUINAS: ReadonlySet<string> = new Set(['supIzq', 'supDer', 'infIzq', 'infDer', 'centro'])
const TAMANOS: ReadonlySet<string> = new Set(['S', 'M', 'L'])
const PLANOS: ReadonlySet<string> = new Set(['busto', 'cuerpo'])
const POSICIONES_TEXTO: ReadonlySet<string> = new Set(['arriba', 'centro', 'abajo'])
const FUENTES_TEXTO: ReadonlySet<string> = new Set(['sans', 'serif', 'mono', 'display'])
const ANIMACIONES_TEXTO: ReadonlySet<string> = new Set(['ninguna', 'fundido', 'subir', 'maquina'])
const FILTROS_VOZ_VALIDOS: ReadonlySet<string> = new Set(['ardilla', 'grave', 'robot', 'eco', 'radio', 'cueva'])
const VISTAS_CAMARA: ReadonlySet<string> = new Set(['iso', 'tercera', 'primera'])
const EFECTOS_CAMARA: ReadonlySet<string> = new Set(['fijo', 'zoomIn', 'zoomOut', 'panIzq', 'panDer', 'orbita', 'picado', 'contrapicado', 'seguir'])
const EMOCIONES: ReadonlySet<string> = new Set(['felicidad', 'enojo', 'sorpresa', 'aprobacion', 'gusto', 'tristeza'])
const ANIMS_ACTOR: ReadonlySet<string> = new Set(['girar', 'flotar', 'pulsar', 'mecerse', 'rebotar', 'temblar'])

function leerCamara(v: unknown): CamaraPelicula | undefined {
  const c = objeto(v)
  if (!c || typeof c.vista !== 'string' || !VISTAS_CAMARA.has(c.vista)) return undefined
  const foco = Array.isArray(c.focus) ? c.focus : []
  return {
    vista: c.vista as CamaraPelicula['vista'],
    focus: [num(foco[0], -1e4, 1e4, 0), num(foco[1], -1e4, 1e4, 0), num(foco[2], -1e4, 1e4, 0)],
    az: num(c.az, -1e4, 1e4, 0),
    el: num(c.el, -1e4, 1e4, 0),
    zoom: num(c.zoom, 0.01, 1000, 1),
    yaw: num(c.yaw, -1e4, 1e4, 0),
    pitch: num(c.pitch, -1e4, 1e4, 0),
    dist3p: num(c.dist3p, 0, 1e4, 5),
    fov1p: num(c.fov1p, 1, 179, 60),
  }
}

function leerFuenteVisual(v: unknown, conVideo: boolean): FuenteRemota {
  const f = objeto(v)
  const tipo = f && typeof f.tipo === 'string' ? f.tipo : ''
  if (f && tipo === 'imagen') return { tipo: 'imagen', medioRef: refOpc(f.medioRef) }
  if (f && tipo === 'video' && conVideo) return { tipo: 'video', medioRef: refOpc(f.medioRef) }
  if (f && tipo === 'escena3d' && conVideo) {
    const cam = leerCamara(f.cam)
    if (cam) {
      return {
        tipo: 'escena3d',
        cam,
        camFin: leerCamara(f.camFin),
        efecto: unoOpc<EfectoCamaraId>(f.efecto, EFECTOS_CAMARA),
        seguir: textoOpc(f.seguir, 40),
      }
    }
  }
  return { tipo: 'color', color: color(f?.color, '#0f1115') }
}

function leerTransicion(v: unknown): Transicion | undefined {
  const tr = objeto(v)
  if (!tr || typeof tr.tipo !== 'string' || !TIPOS_TRANSICION.has(tr.tipo)) return undefined
  return {
    tipo: tr.tipo as Transicion['tipo'],
    duracion: numOpc(tr.duracion, 0, MAX_ESCENA),
    direccion: unoOpc<Transicion['direccion'] & string>(tr.direccion, DIRECCIONES),
  }
}

function leerEncuadre(v: unknown): Encuadre {
  const e = objeto(v)
  return {
    x: num(e?.x, -1, 2, 0.04),
    y: num(e?.y, -1, 2, 0.04),
    ancho: num(e?.ancho, 0.01, 2, 0.32),
    alto: num(e?.alto, 0.01, 2, 0.32),
  }
}

function leerEstiloTexto(v: unknown): EstiloTexto {
  const x = objeto(v)
  const fuente = unoOpc<NonNullable<EstiloTexto['fuente']>>(x?.fuente, FUENTES_TEXTO)
  const animacion = unoOpc<NonNullable<EstiloTexto['animacion']>>(x?.animacion, ANIMACIONES_TEXTO)
  return {
    contenido: texto(x?.contenido, MAX_TEXTO, ''),
    posicion: uno<EstiloTexto['posicion']>(x?.posicion, POSICIONES_TEXTO, 'abajo'),
    tamano: uno<EstiloTexto['tamano']>(x?.tamano, TAMANOS, 'M'),
    color: color(x?.color, '#ffffff'),
    ...(typeof x?.subtitulo === 'string' ? { subtitulo: x.subtitulo.slice(0, MAX_TEXTO) } : {}),
    ...(fuente ? { fuente } : {}),
    ...(x?.caja === true ? { caja: true } : {}),
    ...(animacion ? { animacion } : {}),
  }
}

function leerEscenaActor(v: unknown): EscenaActor | undefined {
  const e = objeto(v)
  if (!e) return undefined
  const mirar = objeto(e.mirar)
  return {
    x: num(e.x, -1e4, 1e4, 0),
    z: num(e.z, -1e4, 1e4, 0),
    ...(mirar && typeof mirar.actor === 'string'
      ? { mirar: { actor: mirar.actor.slice(0, 40) } }
      : e.mirar === 'rumbo' || e.mirar === 'camara'
        ? { mirar: e.mirar }
        : {}),
    ...(e.llegar === true ? { llegar: true } : {}),
    ...(typeof e.emocion === 'string' && EMOCIONES.has(e.emocion)
      ? { emocion: e.emocion as NonNullable<EscenaActor['emocion']> }
      : {}),
    ...(typeof e.anim === 'string' && ANIMS_ACTOR.has(e.anim)
      ? { anim: e.anim as NonNullable<EscenaActor['anim']> }
      : {}),
  }
}

function leerEnvolvente(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined
  const datos: number[] = []
  for (const x of v.slice(0, MAX_ENVOLVENTE)) datos.push(num(x, 0, 1, 0))
  return datos.length ? datos : undefined
}

function leerClip(bruto: unknown): ClipRemoto | null {
  const c = objeto(bruto)
  if (!c || typeof c.pista !== 'string' || !PISTAS_VALIDAS.has(c.pista)) return null
  const pista = c.pista as PistaId
  const id = texto(c.id, 40, '') || nuevoClipId()
  const inicio = num(c.inicio, 0, MAX_SEG, 0)
  const duracion = num(c.duracion, MIN_CLIP, MAX_SEG, MIN_CLIP)
  const desde = numOpc(c.desde, 0, MAX_SEG)
  const base = { id, inicio, duracion, ...(desde != null ? { desde } : {}) }
  const medioRef = refOpc(c.medioRef)
  switch (pista) {
    case 'video': {
      const transicion = leerTransicion(c.transicion)
      return {
        ...base,
        pista,
        fuente: leerFuenteVisual(c.fuente, true),
        filtro: uno<FiltroEscena>(c.filtro, FILTROS_VALIDOS, 'ninguno'),
        volumen: num(c.volumen, 0, 1, 1),
        ...(c.ajuste === 'encajar' ? { ajuste: 'encajar' as const } : {}),
        ...(transicion ? { transicion } : {}),
      }
    }
    case 'fondo':
      return {
        ...base,
        pista,
        fuente: leerFuenteVisual(c.fuente, false) as FuenteFondoRemota,
        ...(typeof c.filtro === 'string' && FILTROS_VALIDOS.has(c.filtro) ? { filtro: c.filtro as FiltroEscena } : {}),
      }
    case 'imagen':
      return { ...base, pista, ...(medioRef ? { medioRef } : {}), encuadre: leerEncuadre(c.encuadre), opacidad: num(c.opacidad, 0, 1, 1) }
    case 'texto': {
      const deClipId = textoOpc(c.deClipId, 40)
      return {
        ...base,
        pista,
        texto: leerEstiloTexto(c.texto),
        ...(c.origen === 'narracion' ? { origen: 'narracion' as const } : {}),
        ...(deClipId ? { deClipId } : {}),
      }
    }
    case 'voz': {
      const linea = textoOpc(c.texto, MAX_TEXTO)
      const voz = textoOpc(c.voz, 60)
      const narradorId = textoOpc(c.narradorId, 40)
      const filtroVoz = unoOpc<FiltroVoz>(c.filtroVoz, FILTROS_VOZ_VALIDOS)
      return {
        ...base,
        pista,
        ...(medioRef ? { medioRef } : {}),
        ...(linea ? { texto: linea } : {}),
        ...(voz ? { voz } : {}),
        ...(narradorId ? { narradorId } : {}),
        ...(filtroVoz ? { filtroVoz } : {}),
        volumen: num(c.volumen, 0, 1, 1),
      }
    }
    case 'musica':
      return { ...base, pista, ...(medioRef ? { medioRef } : {}), volumen: num(c.volumen, 0, 1, 1), bucle: c.bucle === true }
    case 'sfx': {
      const f = objeto(c.fuente)
      const clave = f && f.tipo === 'fabrica' ? textoOpc(f.clave, 40) : undefined
      return {
        ...base,
        pista,
        fuente: clave ? { tipo: 'fabrica', clave } : { tipo: 'medio', medioRef: refOpc(f?.medioRef) },
        volumen: num(c.volumen, 0, 1, 1),
      }
    }
    default: {
      const envolvente = leerEnvolvente(c.envolvente)
      const envolventeHz = numOpc(c.envolventeHz, 1, 100)
      const escena = leerEscenaActor(c.escena)
      const filtroVoz = unoOpc<FiltroVoz>(c.filtroVoz, FILTROS_VOZ_VALIDOS)
      const narradorId = textoOpc(c.narradorId, 40)
      return {
        ...base,
        pista: 'avatar',
        asistenteId: texto(c.asistenteId, 40, 'jugador'),
        ...(narradorId ? { narradorId } : {}),
        esquina: uno<ClipAvatar['esquina']>(c.esquina, ESQUINAS, 'infDer'),
        tamano: uno<ClipAvatar['tamano']>(c.tamano, TAMANOS, 'M'),
        plano: uno<ClipAvatar['plano']>(c.plano, PLANOS, 'busto'),
        texto: texto(c.texto, MAX_TEXTO, ''),
        ...(medioRef ? { medioRef } : {}),
        ...(envolvente ? { envolvente } : {}),
        ...(envolventeHz != null ? { envolventeHz } : {}),
        volumen: num(c.volumen, 0, 1, 1),
        ...(filtroVoz ? { filtroVoz } : {}),
        ...(c.modo === 'escena' ? { modo: 'escena' as const } : {}),
        ...(escena ? { escena } : {}),
      }
    }
  }
}

function leerNarradores(v: unknown): NarradorVideo[] | undefined {
  if (!Array.isArray(v)) return undefined
  const lista: NarradorVideo[] = []
  for (const bruto of v.slice(0, MAX_NARRADORES)) {
    const n = objeto(bruto)
    if (!n || typeof n.id !== 'string' || !n.id) continue
    const nombre = textoOpc(n.nombre, MAX_NOMBRE)
    const voz = textoOpc(n.voz, 60)
    const asistenteId = textoOpc(n.asistenteId, 40)
    lista.push({
      id: n.id.slice(0, 40),
      ...(nombre ? { nombre } : {}),
      ...(voz ? { voz } : {}),
      ...(asistenteId ? { asistenteId } : {}),
    })
  }
  return lista
}

function leerVolumenPistas(v: unknown): ProyectoVideo['volumenPistas'] | undefined {
  const x = objeto(v)
  if (!x) return undefined
  const vol: Partial<Record<PistaId, number>> = {}
  for (const pista of ORDEN_PISTAS) {
    const n = numOpc(x[pista], 0, 1)
    if (n != null) vol[pista] = n
  }
  return vol
}

/** El proyecto y los medios de un snapshot ajeno, ya saneados; null si no lo es. */
export function leerSnapshot(bruto: unknown): SnapshotVideoLeido | null {
  const s = objeto(bruto)
  const p = s && objeto(s.proyecto)
  if (!p) return null
  const clips: ClipRemoto[] = []
  const vistos = new Set<string>()
  let principales = 0
  for (const x of Array.isArray(p.clips) ? p.clips.slice(0, MAX_CLIPS) : []) {
    const c = leerClip(x)
    if (!c || vistos.has(c.id)) continue
    if (c.pista === 'video' && ++principales > MAX_CLIPS_PRINCIPAL) continue
    vistos.add(c.id)
    clips.push(c)
  }
  const calidad = unoOpc<NonNullable<ProyectoVideo['calidad']>>(p.calidad, CALIDADES_VALIDAS)
  const silenciadas = Array.isArray(p.pistasSilenciadas)
    ? ORDEN_PISTAS.filter((x) => (p.pistasSilenciadas as unknown[]).includes(x))
    : undefined
  const volumenPistas = leerVolumenPistas(p.volumenPistas)
  const narradores = leerNarradores(p.narradores)
  const vozNarrador = textoOpc(p.vozNarrador, 60)
  return {
    proyecto: {
      nombre: texto(p.nombre, MAX_NOMBRE, sinTitulo()),
      aspecto: uno<ProyectoVideo['aspecto']>(p.aspecto, ASPECTOS_VALIDOS, '16:9'),
      ...(calidad ? { calidad } : {}),
      clips,
      ...(silenciadas ? { pistasSilenciadas: silenciadas } : {}),
      ...(volumenPistas ? { volumenPistas } : {}),
      ...(vozNarrador ? { vozNarrador } : {}),
      ...(narradores ? { narradores } : {}),
      ...(p.escenario === '3d' ? { escenario: '3d' as const } : {}),
    },
    medios: leerMediosRemotos(s.medios),
  }
}

// ─── del snapshot al proyecto local ──────────────────────────────────────────

/**
 * Los campos del proyecto local que dicta un snapshot ajeno. Cada `medioRef` se
 * resuelve con `refALocal` (los medios ya bajados); lo que falte se queda en
 * `MEDIO_AUSENTE`, salvo que el clip ya tuviera medio aquí — mientras la
 * descarga va en camino, lo que se veía se sigue viendo.
 */
export function aplicarSnapshot(
  local: ProyectoVideo,
  s: SnapshotVideoLeido,
  refALocal: Map<string, number>,
): Partial<ProyectoVideo> {
  const previos = new Map((local.clips ?? []).map((c) => [c.id, c]))
  const resolver = (c: ClipRemoto, medioRef: string | undefined): number => {
    const id = medioRef ? refALocal.get(medioRef) : undefined
    if (id != null) return id
    const previo = previos.get(c.id)
    const medioPrevio = previo && previo.pista === c.pista ? medioIdDe(previo) : undefined
    return medioPrevio ?? MEDIO_AUSENTE
  }
  const clips = s.proyecto.clips.map<ClipVideo>((c) => {
    switch (c.pista) {
      case 'video': {
        const f = c.fuente
        return {
          ...c,
          fuente:
            f.tipo === 'imagen' || f.tipo === 'video' ? { tipo: f.tipo, medioId: resolver(c, f.medioRef) } : f,
        }
      }
      case 'fondo': {
        const f = c.fuente
        return { ...c, fuente: f.tipo === 'imagen' ? { tipo: 'imagen', medioId: resolver(c, f.medioRef) } : f }
      }
      case 'sfx':
        return {
          ...c,
          fuente:
            c.fuente.tipo === 'medio' ? { tipo: 'medio', medioId: resolver(c, c.fuente.medioRef) } : c.fuente,
        }
      case 'imagen':
        return { ...sinMedioRef(c), medioId: resolver(c, c.medioRef) }
      case 'musica':
        return { ...sinMedioRef(c), medioId: resolver(c, c.medioRef) }
      // Sin referencia no hay audio (la línea aún no se ha generado); con ella
      // pero sin bajar, el clip queda marcado como ausente.
      case 'voz':
        return { ...sinMedioRef(c), ...(c.medioRef ? { medioId: resolver(c, c.medioRef) } : {}) }
      case 'avatar':
        return { ...sinMedioRef(c), ...(c.medioRef ? { medioId: resolver(c, c.medioRef) } : {}) }
      default:
        return c
    }
  })
  return {
    ...s.proyecto,
    clips: normalizar(clips),
    // Formato 2: lo legado se queda vacío (el snapshot nunca lo trae).
    escenas: [],
    musica: undefined,
  }
}

function sinMedioRef<T extends { medioRef?: string }>(c: T): Omit<T, 'medioRef'> {
  const { medioRef: _ref, ...resto } = c
  return resto
}

// ─── medios: subir y bajar ───────────────────────────────────────────────────

const fichaDe = (m: MedioVideo, ref: string): MedioRemoto => ({
  ref,
  nombre: m.nombre,
  tipo: m.tipo,
  mime: m.blob.type,
  size: m.blob.size,
  ...(m.duracion != null ? { duracion: m.duracion } : {}),
  ...(m.ancho != null ? { ancho: m.ancho } : {}),
  ...(m.alto != null ? { alto: m.alto } : {}),
  ...(m.sonido ? { sonido: true } : {}),
})

export interface SubidaMedios {
  /** `medioId` local → su ficha en el bucket. */
  refs: Map<number, MedioRemoto>
  /** Cuántos medios se quedaron fuera por los topes (o por un fallo de subida). */
  saltados: number
}

/**
 * Deja en el bucket los medios que el proyecto usa y todavía no están ahí.
 * Idempotente: cada medio recuerda su objeto (`remotoId`) y no se vuelve a
 * subir. Lo que pase de `TOPE_MEDIO`, o haga pasar al proyecto de
 * `TOPE_PROYECTO`, se salta (el clip llegará sin medio).
 */
export async function subirMediosDelProyecto(
  esp: { espacioId: string },
  p: ProyectoVideo,
  opciones?: {
    medios?: MedioVideo[]
    /** Lo subido en esta sesión: la lista de medios puede no traer aún el `remotoId` recién escrito. */
    yaSubidos?: Map<number, MedioRemoto>
    onProgreso?: (i: number, n: number) => void
  },
): Promise<SubidaMedios> {
  const refs = new Map<number, MedioRemoto>()
  const usados = mediosUsados(p)
  usados.delete(MEDIO_AUSENTE)
  if (usados.size === 0) return { refs, saltados: 0 }
  // En el modo local de pruebas el «bucket» son 5 MB de localStorage: los
  // medios no caben ni de lejos, así que solo viaja el JSON del proyecto.
  if (espacioLocal()) {
    if (import.meta.env.DEV) {
      console.warn('[MPH] espacioLocal: los medios no se suben (el bucket local son 5 MB); el proyecto viaja sin ellos')
    }
    return { refs, saltados: 0 }
  }
  const lista = opciones?.medios ?? (await mediosVideoRepo.list())
  const prefijo = `${esp.espacioId}/`
  let ocupado = 0
  const pendientes: (MedioVideo & { id: number })[] = []
  for (const m of lista) {
    if (m.id == null || !usados.has(m.id)) continue
    const ya = opciones?.yaSubidos?.get(m.id)
    const ref = ya?.ref ?? (m.remotoId?.startsWith(prefijo) ? m.remotoId.slice(prefijo.length) : null)
    if (ref) {
      refs.set(m.id, ya ?? fichaDe(m, ref))
      ocupado += m.blob.size
    } else {
      pendientes.push(m as MedioVideo & { id: number })
    }
  }
  let saltados = 0
  let i = 0
  for (const m of pendientes) {
    opciones?.onProgreso?.(++i, pendientes.length)
    if (m.blob.size > TOPE_MEDIO || ocupado + m.blob.size > TOPE_PROYECTO) {
      saltados += 1
      continue
    }
    try {
      const remoto = await subirMedio(esp, m.blob, {
        nombre: m.nombre,
        tipo: m.tipo,
        duracion: m.duracion,
        ancho: m.ancho,
        alto: m.alto,
        ...(m.sonido ? { sonido: true } : {}),
      })
      ocupado += m.blob.size
      refs.set(m.id, remoto)
      // El mismo archivo en dos espacios son dos objetos: la clave lleva el espacio.
      await mediosVideoRepo.update(m.id, { remotoId: claveRemota(esp.espacioId, remoto.ref) })
    } catch {
      saltados += 1
    }
  }
  return { refs, saltados }
}

/** `medioRef` → id local, de los medios del espacio que ya están en este dispositivo. */
export async function resolverRefs(espacioId: string, medios: MedioRemoto[]): Promise<Map<string, number>> {
  const mapa = new Map<string, number>()
  for (const m of medios) {
    const id = await idMedioPorRemotoId(claveRemota(espacioId, m.ref))
    if (id != null) mapa.set(m.ref, id)
  }
  return mapa
}

const tipoDe = (m: MedioRemoto): MedioVideo['tipo'] => {
  if (m.mime.startsWith('video/')) return 'video'
  if (m.mime.startsWith('audio/')) return 'audio'
  if (m.mime.startsWith('image/')) return 'imagen'
  return m.tipo === 'video' || m.tipo === 'audio' ? m.tipo : 'imagen'
}

async function bajarMedio(esp: { espacioId: string }, m: MedioRemoto): Promise<void> {
  const blob = await descargarMedio(esp, m.ref)
  if (blob.size > TOPE_MEDIO) return
  const tipo = tipoDe(m)
  const fila: Omit<MedioVideo, 'id'> = {
    tipo,
    nombre: m.nombre || sinTitulo(),
    blob,
    ...(m.duracion != null ? { duracion: m.duracion } : {}),
    ...(m.ancho != null ? { ancho: m.ancho } : {}),
    ...(m.alto != null ? { alto: m.alto } : {}),
    origen: 'importado',
    ...(m.sonido ? { sonido: true as const } : {}),
    remotoId: claveRemota(esp.espacioId, m.ref),
    creadoEn: new Date().toISOString(),
  }
  if (tipo === 'imagen') fila.miniatura = await miniaturaFoto(blob).catch(() => undefined)
  const id = await mediosVideoRepo.add(fila)
  // Miniatura y dimensiones del video, en segundo plano (como al grabar).
  if (tipo === 'video') void completarGrabacion({ ...fila, id })
}

/**
 * Trae del bucket los medios del snapshot que faltan aquí, de dos en dos (más
 * en paralelo solo alargaría el primero). Idempotente: los que ya están se
 * saltan, y lo que falle lo reintenta la próxima recepción.
 */
export async function descargarMediosFaltantes(
  esp: { espacioId: string },
  medios: MedioRemoto[],
  onProgreso?: (i: number, n: number) => void,
): Promise<void> {
  const ya = await resolverRefs(esp.espacioId, medios)
  const cola = medios.filter((m) => !ya.has(m.ref))
  if (cola.length === 0) return
  const total = cola.length
  let hechos = 0
  const obrero = async () => {
    for (;;) {
      const m = cola.shift()
      if (!m) return
      try {
        await bajarMedio(esp, m)
      } catch {
        // Sin red o sin permiso: el clip se queda como «medio no disponible».
      }
      onProgreso?.(++hechos, total)
    }
  }
  await Promise.all([obrero(), obrero()])
}

// ─── compartir / recibir ─────────────────────────────────────────────────────

/**
 * Crea el espacio del proyecto, sube sus medios y deja el estado de ahora como
 * snapshot. Devuelve el `espacioId`, cuántos medios se quedaron fuera y las
 * fichas de los subidos (el editor las hereda para no resubirlos).
 */
export async function compartirProyecto(
  id: number,
  onProgreso?: (i: number, n: number) => void,
): Promise<{ espacioId: string; saltados: number; refs: Map<number, MedioRemoto> }> {
  const fila = (await proyectosVideoRepo.list()).find((x) => x.id === id)
  if (!fila) throw new Error('proyecto inexistente')
  const medios = await mediosVideoRepo.list()
  // Un proyecto en formato 1 (nunca abierto en este editor) se migra en memoria.
  const { proyecto: p } = migrarProyecto(fila, (mid) => medios.find((m) => m.id === mid)?.duracion)
  const espacio = await api.crear('video', p.nombre || sinTitulo(), { aspecto: p.aspecto })
  const { refs, saltados } = await subirMediosDelProyecto(espacio, p, { medios, onProgreso })
  // `hastaSeq: 0` — video no escribe en el log: el snapshot ES el estado.
  await api.guardarSnapshot(espacio.espacioId, proyectarSnapshot(p, refs), 0)
  await proyectosVideoRepo.update(id, { espacioId: espacio.espacioId })
  await refrescarEspacios()
  return { espacioId: espacio.espacioId, saltados, refs }
}

/** El proyecto local de un espacio de video: el que ya existe, o una copia del snapshot. */
export async function asegurarProyectoLocal(e: Pick<Espacio, 'espacioId' | 'titulo'>): Promise<number> {
  const ya = (await proyectosVideoRepo.list()).find((p) => p.espacioId === e.espacioId)
  if (ya?.id != null) return ya.id
  let s: SnapshotVideoLeido | null = null
  try {
    s = leerSnapshot((await api.leerSnapshot(e.espacioId)).snapshot)
  } catch {
    // Sin snapshot legible se estrena vacío: el primer guardado ajeno lo llenará.
  }
  const ahora = new Date().toISOString()
  const vacio: ProyectoVideo = { nombre: '', aspecto: '16:9', clips: [], escenas: [], creadoEn: ahora, actualizadoEn: ahora }
  // Los medios NO se bajan aquí: lo hace el editor, con el progreso a la vista.
  const campos = s ? aplicarSnapshot(vacio, s, new Map()) : null
  return proyectosVideoRepo.add({
    aspecto: '16:9',
    clips: [],
    ...campos,
    escenas: [],
    // El nombre del espacio manda: es el que ve quien lo comparte.
    nombre: e.titulo || campos?.nombre || sinTitulo(),
    espacioId: e.espacioId,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}

/**
 * Entrar por el enlace: el proyecto queda listo y el Studio se abre encima.
 * Como en audio, esto puede correr ANTES de que la casa haya leído sus objetos:
 * sin esperarlos, `abrirApp` no encontraría el cuarto del Studio.
 */
export async function aterrizarProyecto(e: Espacio): Promise<void> {
  const id = await asegurarProyectoLocal(e)
  for (let i = 0; i < 50 && !useDiseño.getState().cargado; i++) {
    await new Promise((r) => setTimeout(r, 100))
  }
  if (abrirApp('video', 'videos', `proyecto:${id}`) !== null) return
  void notificar({
    clave: `espacio:${e.espacioId}`,
    titulo: e.titulo || sinTitulo(),
    cuerpo: tGlobal('esp.aterrizar.sinApp', 'Coloca la app {n} en tu casa para abrirlo', { n: nombreTipo('video') }),
    efimero: true,
  })
}
