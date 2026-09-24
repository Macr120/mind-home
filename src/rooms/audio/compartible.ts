import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { extension, nombreArchivo } from '../../core/buzon/exportar'
import { normalizar } from '../../core/chat/dispatcher'
import type { AjustesVivo, PistaAudio, ProyectoAudio } from '../../core/data/db'
import { proyectosAudioRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'

/**
 * Lo que el Studio de audio manda por el buzón: una COPIA de una canción, que
 * quien la recibe edita como suya (colaborar sobre la misma es otra cosa: el
 * espacio compartido). Viajan las pistas de notas; las de micrófono no, porque
 * sus tomas viven solo en este dispositivo y pesarían megas.
 *
 * Fuera de la app sale como WAV, renderizado con los mismos instrumentos.
 */

interface CancionDatos {
  nombre: string
  bpm: number
  compases: number
  pulsos?: number
  swing?: number
  volumenMaestro?: number
  vivo?: AjustesVivo
  album?: string
  pistas: PistaAudio[]
}

/** Solo las pistas de notas, sin clips (y sin nada que apunte a este dispositivo). */
const pistasDeNotas = (p: ProyectoAudio) =>
  p.pistas.filter((x) => x.tipo !== 'audio').map(({ clips: _tomas, tipo: _tipo, ...x }) => x)

const detalleCancion = (d: { bpm: number; pistas: unknown[] }) =>
  tGlobal('buzon.cancion.detalle', '{n} pistas · {bpm} BPM', { n: String(d.pistas.length), bpm: String(d.bpm) })

/** ¿Tiene algo que sonar? Una canción de solo micrófono no se puede enviar. */
const conNotas = (p: ProyectoAudio) => !p.oculto && pistasDeNotas(p).some((x) => x.notas.length > 0)

export async function empaquetarCancion(p: ProyectoAudio): Promise<Paquete | null> {
  const pistas = pistasDeNotas(p)
  if (!pistas.some((x) => x.notas.length > 0)) return null
  const datos: CancionDatos = {
    nombre: p.nombre,
    bpm: p.bpm,
    compases: p.compases,
    ...(p.pulsos ? { pulsos: p.pulsos } : {}),
    ...(p.swing ? { swing: p.swing } : {}),
    ...(p.volumenMaestro != null ? { volumenMaestro: p.volumenMaestro } : {}),
    ...(p.vivo ? { vivo: p.vivo } : {}),
    ...(p.album ? { album: p.album } : {}),
    pistas,
  }
  return { app: 'audio', tipo: 'cancion', version: 1, nombre: p.nombre, resumen: detalleCancion(datos), emoji: '🎵', datos }
}

export async function listarCanciones(): Promise<ItemCompartible[]> {
  return (await proyectosAudioRepo.list())
    .filter((p) => p.id != null && conNotas(p))
    .map((p) => ({ clave: `cancion:${p.id}`, nombre: p.nombre, detalle: detalleCancion({ bpm: p.bpm, pistas: pistasDeNotas(p) }) }))
}

export async function empaquetarCancionPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const p = (await proyectosAudioRepo.list()).find((x) => x.id === id)
  return p ? empaquetarCancion(p) : null
}

/** El proyecto que arma el paquete, tal cual lo entienden el editor y el render. */
function proyectoDe(d: CancionDatos, ahora: string): Omit<ProyectoAudio, 'id'> {
  return {
    nombre: d.nombre,
    bpm: Number(d.bpm) || 120,
    compases: Number(d.compases) || 4,
    ...(d.pulsos ? { pulsos: d.pulsos } : {}),
    ...(d.swing ? { swing: d.swing } : {}),
    ...(d.volumenMaestro != null ? { volumenMaestro: d.volumenMaestro } : {}),
    ...(d.vivo ? { vivo: d.vivo } : {}),
    ...(typeof d.album === 'string' ? { album: d.album } : {}),
    pistas: d.pistas,
    creadoEn: ahora,
    actualizadoEn: ahora,
  }
}

export async function importarCancion(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<CancionDatos> | null
  if (!d || typeof d.nombre !== 'string' || !Array.isArray(d.pistas)) throw new Error('Canción inválida')
  const existe = (await proyectosAudioRepo.list()).some((x) => !x.oculto && normalizar(x.nombre) === normalizar(d.nombre!))
  if (existe && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  const id = (await proyectosAudioRepo.add(proyectoDe(d as CancionDatos, new Date().toISOString()))) as number
  return { seccion: 'canciones', dato: `proyecto:${id}` }
}

/** Fuera de la app: la canción renderizada a WAV (se oye en cualquier reproductor). */
export async function exportarCancion(p: Paquete): Promise<File[]> {
  const { renderizarWav } = await import('./exportarWav')
  const wav = await renderizarWav({ ...proyectoDe(p.datos as CancionDatos, new Date().toISOString()) })
  return [new File([wav], `${nombreArchivo(p.nombre)}.${extension(wav.type)}`, { type: wav.type })]
}
