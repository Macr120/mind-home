import { abrirApp } from '../../core/abrirApp'
import type {
  AjustesVivo,
  ClipAudio,
  EfectosPista,
  InstrumentoAudio,
  NotaAudio,
  PistaAudio,
  ProyectoAudio,
  SintePista,
} from '../../core/data/db'
import { proyectosAudioRepo } from '../../core/data/repository'
import * as api from '../../core/espacios/api'
import { refrescarEspacios } from '../../core/espacios/conectar'
import { nombreTipo } from '../../core/espacios/enlaces'
import type { Espacio } from '../../core/espacios/tipos'
import { tGlobal } from '../../core/i18n/useT'
import { notificar } from '../../core/notificaciones'
import { useDiseño } from '../../core/state/disenoStore'
import {
  BPM_MAX,
  BPM_MIN,
  CARPETAS_INSTRUMENTOS,
  MAESTRO_DEFAULT,
  MAX_CLIPS_POR_PISTA,
  MAX_COMPASES,
  MAX_NOTAS_PISTA,
  MAX_PISTAS,
  nuevaPistaId,
} from './constantes'

/**
 * El Studio de audio por enlace: compartir un proyecto y recibir los que otras
 * personas comparten.
 *
 * El proyecto entero viaja como SNAPSHOT (unos KB de JSON) bajo el turno de
 * edición: audio no usa el log de cambios del espacio, así que cada guardado
 * reemplaza el estado y quien no tiene el turno solo recibe.
 *
 * Las tomas de micrófono (`grabacionesAudio`) NO se comparten: el clip viaja
 * embebido en la pista y, sin su blob, el roll ya pinta el aviso de siempre.
 */

export const SNAPSHOT_AUDIO_V = 1

const MAX_NOMBRE = 80
const MAX_NOMBRE_PISTA = 40

const INSTRUMENTOS = new Set<string>(CARPETAS_INSTRUMENTOS.flatMap((c) => c.instrumentos))
const PATRONES_ARP = new Set(['sube', 'baja', 'subeBaja', 'azar'])
const TIPOS_ESCALA = new Set(['mayor', 'menor', 'pentaMayor', 'pentaMenor', 'blues'])
const TIPOS_ACORDE = new Set(['mayor', 'menor', 'septima', 'diatonico'])

const sinTitulo = () => tGlobal('esp.sinTitulo', 'Sin título')

/** Lo que del proyecto viaja al espacio: ni ids locales ni metadatos de la casa. */
export interface SnapshotAudio {
  v: typeof SNAPSHOT_AUDIO_V
  proyecto: Pick<
    ProyectoAudio,
    'nombre' | 'bpm' | 'compases' | 'pulsos' | 'swing' | 'volumenMaestro' | 'vivo' | 'pistas' | 'cancion'
  >
}

export function proyectarSnapshot(p: ProyectoAudio): SnapshotAudio {
  return {
    v: SNAPSHOT_AUDIO_V,
    proyecto: {
      nombre: p.nombre,
      bpm: p.bpm,
      compases: p.compases,
      pulsos: p.pulsos,
      swing: p.swing,
      volumenMaestro: p.volumenMaestro,
      vivo: p.vivo,
      pistas: p.pistas,
      cancion: p.cancion,
    },
  }
}

// ─── lectura defensiva (esto viene de OTRA persona) ──────────────────────────

const num = (v: unknown, min: number, max: number, def: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def

const numOpc = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined

const texto = (v: unknown, tope: number, def: string): string => (typeof v === 'string' ? v.slice(0, tope) : def)

const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

function leerNotas(v: unknown): NotaAudio[] {
  if (!Array.isArray(v)) return []
  const notas: NotaAudio[] = []
  for (const n of v) {
    if (!Array.isArray(n) || n.length < 4) continue
    if (!n.slice(0, 4).every((x) => typeof x === 'number' && Number.isFinite(x))) continue
    const [inicio, dur, tono, vel] = n as number[]
    if (dur <= 0) continue
    notas.push([
      Math.max(0, Math.min(MAX_COMPASES * 16, inicio)),
      Math.min(MAX_COMPASES * 16, dur),
      Math.round(Math.max(0, Math.min(127, tono))),
      Math.round(Math.max(1, Math.min(127, vel))),
    ])
    if (notas.length >= MAX_NOTAS_PISTA) break
  }
  return notas
}

function leerClips(v: unknown): ClipAudio[] | undefined {
  if (!Array.isArray(v)) return undefined
  const clips: ClipAudio[] = []
  for (const bruto of v.slice(0, MAX_CLIPS_POR_PISTA)) {
    const c = objeto(bruto)
    if (!c || typeof c.clipId !== 'string' || typeof c.grabacionId !== 'number') continue
    clips.push({
      clipId: c.clipId.slice(0, 40),
      grabacionId: c.grabacionId,
      sello: texto(c.sello, 40, ''),
      inicio: num(c.inicio, 0, MAX_COMPASES * 16, 0),
      duracionSeg: num(c.duracionSeg, 0, 3600, 0),
      recorteSeg: num(c.recorteSeg, 0, 3600, 0),
      nombre: texto(c.nombre, MAX_NOMBRE_PISTA, ''),
    })
  }
  return clips
}

function leerEfectos(v: unknown): EfectosPista | undefined {
  const fx = objeto(v)
  if (!fx) return undefined
  return {
    reverb: num(fx.reverb, 0, 1, 0),
    delay: num(fx.delay, 0, 1, 0),
    chorus: num(fx.chorus, 0, 1, 0),
    dist: num(fx.dist, 0, 1, 0),
  }
}

function leerSinte(v: unknown): SintePista | undefined {
  const s = objeto(v)
  if (!s) return undefined
  return {
    ataque: numOpc(s.ataque, 0, 10),
    liberacion: numOpc(s.liberacion, 0, 10),
    filtroHz: numOpc(s.filtroHz, 20, 20_000),
    resonancia: numOpc(s.resonancia, 0, 40),
    glide: numOpc(s.glide, 0, 5),
    vibrato: numOpc(s.vibrato, 0, 1),
  }
}

function leerVivo(v: unknown): AjustesVivo | undefined {
  const x = objeto(v)
  if (!x) return undefined
  const arp = objeto(x.arp)
  const escala = objeto(x.escala)
  return {
    arp:
      arp && typeof arp.patron === 'string' && PATRONES_ARP.has(arp.patron)
        ? { patron: arp.patron as NonNullable<AjustesVivo['arp']>['patron'], velocidad: arp.velocidad === 2 ? 2 : 1 }
        : null,
    acorde:
      typeof x.acorde === 'string' && TIPOS_ACORDE.has(x.acorde)
        ? (x.acorde as NonNullable<AjustesVivo['acorde']>)
        : null,
    escala:
      escala && typeof escala.tipo === 'string' && TIPOS_ESCALA.has(escala.tipo)
        ? {
            tonica: Math.round(num(escala.tonica, 0, 11, 0)),
            tipo: escala.tipo as NonNullable<AjustesVivo['escala']>['tipo'],
          }
        : null,
  }
}

function leerPistas(v: unknown): PistaAudio[] {
  if (!Array.isArray(v)) return []
  const pistas: PistaAudio[] = []
  for (const bruto of v.slice(0, MAX_PISTAS)) {
    const p = objeto(bruto)
    if (!p) continue
    const instrumento = typeof p.instrumento === 'string' && INSTRUMENTOS.has(p.instrumento) ? p.instrumento : 'piano'
    pistas.push({
      pistaId: typeof p.pistaId === 'string' && p.pistaId ? p.pistaId.slice(0, 40) : nuevaPistaId(),
      nombre: texto(p.nombre, MAX_NOMBRE_PISTA, 'Pista'),
      instrumento: instrumento as InstrumentoAudio,
      volumen: num(p.volumen, 0, 1, 0.8),
      silenciada: p.silenciada === true,
      solo: p.solo === true,
      efectos: leerEfectos(p.efectos),
      sinte: leerSinte(p.sinte),
      notas: leerNotas(p.notas),
      ...(p.tipo === 'audio' ? { tipo: 'audio' as const, clips: leerClips(p.clips) ?? [] } : {}),
    })
  }
  return pistas
}

/** Los campos del proyecto que trae un snapshot ajeno, ya saneados; null si no es uno. */
export function leerSnapshot(bruto: unknown): Partial<ProyectoAudio> | null {
  const s = objeto(bruto)
  const p = s && objeto(s.proyecto)
  if (!p) return null
  return {
    nombre: texto(p.nombre, MAX_NOMBRE, sinTitulo()),
    bpm: Math.round(num(p.bpm, BPM_MIN, BPM_MAX, 100)),
    compases: Math.round(num(p.compases, 1, MAX_COMPASES, 4)),
    pulsos: [2, 4, 8, 16].includes(p.pulsos as number) ? (p.pulsos as number) : 4,
    swing: num(p.swing, 0, 60, 0),
    volumenMaestro: num(p.volumenMaestro, 0, 1, MAESTRO_DEFAULT),
    vivo: leerVivo(p.vivo),
    pistas: leerPistas(p.pistas),
    ...(typeof p.cancion === 'string' ? { cancion: p.cancion.slice(0, 40) } : {}),
  }
}

// ─── compartir / recibir ─────────────────────────────────────────────────────

/** Crea el espacio de un proyecto y sube su estado de ahora. Devuelve el `espacioId`. */
export async function compartirProyecto(id: number): Promise<string> {
  const p = (await proyectosAudioRepo.list()).find((x) => x.id === id)
  if (!p) throw new Error('proyecto inexistente')
  const espacio = await api.crear('audio', p.nombre || sinTitulo(), {})
  // `hastaSeq: 0` — audio no escribe en el log: el snapshot ES el estado.
  await api.guardarSnapshot(espacio.espacioId, proyectarSnapshot(p), 0)
  await proyectosAudioRepo.update(id, { espacioId: espacio.espacioId })
  await refrescarEspacios()
  return espacio.espacioId
}

/** El proyecto local de un espacio de audio: el que ya existe, o una copia del snapshot. */
export async function asegurarProyectoLocal(e: Pick<Espacio, 'espacioId' | 'titulo'>): Promise<number> {
  const ya = (await proyectosAudioRepo.list()).find((p) => p.espacioId === e.espacioId)
  if (ya?.id != null) return ya.id
  let campos: Partial<ProyectoAudio> | null = null
  try {
    campos = leerSnapshot((await api.leerSnapshot(e.espacioId)).snapshot)
  } catch {
    // Sin snapshot legible se estrena vacío: el primer guardado ajeno lo llenará.
  }
  const ahora = new Date().toISOString()
  return proyectosAudioRepo.add({
    bpm: 100,
    compases: 4,
    ...campos,
    pistas: campos?.pistas?.length
      ? campos.pistas
      : [{ pistaId: nuevaPistaId(), nombre: 'Pista 1', instrumento: 'piano', volumen: 0.8, notas: [] }],
    // El nombre del espacio manda: es el que ve quien lo comparte.
    nombre: e.titulo || campos?.nombre || sinTitulo(),
    espacioId: e.espacioId,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}

/**
 * Entrar por el enlace: el proyecto queda listo y el Studio se abre encima.
 *
 * Como en escritura, esto puede correr ANTES de que la casa haya leído sus
 * objetos: sin esperarlos, `abrirApp` no encontraría el cuarto del Studio.
 */
export async function aterrizarProyecto(e: Espacio): Promise<void> {
  const id = await asegurarProyectoLocal(e)
  for (let i = 0; i < 50 && !useDiseño.getState().cargado; i++) {
    await new Promise((r) => setTimeout(r, 100))
  }
  if (abrirApp('audio', 'canciones', `proyecto:${id}`) !== null) return
  void notificar({
    clave: `espacio:${e.espacioId}`,
    titulo: e.titulo || sinTitulo(),
    cuerpo: tGlobal('esp.aterrizar.sinApp', 'Coloca la app {n} en tu casa para abrirlo', { n: nombreTipo('audio') }),
    efimero: true,
  })
}
