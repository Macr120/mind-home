import { contextoAudio } from '../../core/audio/motor'
import type { ProyectoAudio } from '../../core/data/db'
import { asegurarBlob, grabacionesAudioRepo, leerGrabacionAudio, musicaImportadaRepo, proyectosAudioRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import type { ContenidoRecurso, RecursoStudio } from '../../core/recursosStudio'
import { renderizarWav } from './exportarWav'
import { buffersDeClipsProyecto } from './platos'
import { SEMILLAS_CANCIONES } from './canciones'
import { proyectoDeSemilla } from './Albumes'

/**
 * Lo que el Studio de audio presta a otras apps (el panel de medios del Studio
 * de video): canciones/proyectos (renderizados a WAV al pedirlos), tomas de
 * micrófono y «Tu música» del mezclador. Se carga con `import()` desde
 * `index.tsx`: el render arrastra el motor offline.
 */

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/** Compases × pulsos a su tempo (el render añade la cola de los efectos). */
const duracionProyecto = (p: ProyectoAudio) => (p.compases * (p.pulsos ?? 4) * 60) / p.bpm

/** Las semillas materializadas conservan su título retraducible (como en Albumes). */
const nombreProyecto = (p: ProyectoAudio) =>
  p.cancion?.startsWith('sem-') ? tGlobal(`audio.cancion.${p.cancion.slice(4)}`, p.nombre) : p.nombre

export async function listarRecursos(): Promise<RecursoStudio[]> {
  const [proyectos, grabaciones, musica] = await Promise.all([
    proyectosAudioRepo.list(),
    grabacionesAudioRepo.list(),
    musicaImportadaRepo.list(),
  ])
  const gCanciones = tGlobal('audio.recursos.canciones', 'Canciones')
  const gGrab = tGlobal('audio.recursos.grabaciones', 'Grabaciones')
  const gMusica = tGlobal('audio.recursos.musica', 'Tu música')
  const out: RecursoStudio[] = []
  for (const p of proyectos) {
    if (p.id == null || p.oculto || p.pistas.length === 0) continue
    const dur = Math.round(duracionProyecto(p) * 10) / 10
    out.push({ clave: `proyecto:${p.id}`, tipo: 'audio', nombre: nombreProyecto(p), detalle: `${gCanciones} · ${fmt(dur)}`, grupo: gCanciones, duracion: dur, actualizadoEn: p.actualizadoEn })
  }
  // Las canciones de ejemplo que aún no se abrieron (sin fila, ni borrada): también se prestan.
  const conFila = new Set(proyectos.map((p) => p.cancion).filter(Boolean))
  for (const sem of SEMILLAS_CANCIONES) {
    if (conFila.has(sem.id)) continue
    const dur = Math.round(((sem.compases * 4 * 60) / sem.bpm) * 10) / 10
    out.push({ clave: `semilla:${sem.id}`, tipo: 'audio', nombre: tGlobal(`audio.cancion.${sem.id.slice(4)}`, sem.tituloEs), detalle: `${gCanciones} · ${fmt(dur)}`, grupo: gCanciones, duracion: dur, actualizadoEn: 'semilla' })
  }
  for (const g of grabaciones) {
    if (g.id == null) continue
    out.push({ clave: `grab:${g.id}`, tipo: 'audio', nombre: g.nombre, detalle: `${gGrab} · ${fmt(g.duracionSeg)}`, grupo: gGrab, duracion: g.duracionSeg, actualizadoEn: g.creadoEn })
  }
  for (const m of musica) {
    if (m.id == null) continue
    out.push({ clave: `musica:${m.id}`, tipo: 'audio', nombre: m.nombre, detalle: `${gMusica} · ${fmt(m.duracionSeg)}`, grupo: gMusica, duracion: m.duracionSeg, actualizadoEn: m.creadoEn })
  }
  return out
}

export async function obtenerRecurso(clave: string): Promise<ContenidoRecurso | null> {
  const [tipo, idStr] = clave.split(':')
  const id = Number(idStr)
  if (tipo === 'proyecto') {
    const p = (await proyectosAudioRepo.list()).find((x) => x.id === id)
    if (!p) return null
    // Mismo camino que el mezclador: clips de micrófono validados por sello y render offline con efectos.
    const ctx = contextoAudio()
    const clips = ctx ? await buffersDeClipsProyecto(ctx, p) : undefined
    return { tipo: 'audio', blob: await renderizarWav(p, clips), nombre: nombreProyecto(p) }
  }
  if (tipo === 'semilla') {
    const sem = SEMILLAS_CANCIONES.find((x) => x.id === idStr)
    if (!sem) return null
    return { tipo: 'audio', blob: await renderizarWav(proyectoDeSemilla(sem)), nombre: tGlobal(`audio.cancion.${sem.id.slice(4)}`, sem.tituloEs) }
  }
  if (tipo === 'grab') {
    const g = await leerGrabacionAudio(id)
    const blob = g && (g.blob ?? (await asegurarBlob('grabacionesAudio', id)))
    return g && blob ? { tipo: 'audio', blob, nombre: g.nombre, duracion: g.duracionSeg } : null
  }
  if (tipo === 'musica') {
    const m = (await musicaImportadaRepo.list()).find((x) => x.id === id)
    const blob = m && (m.blob ?? (await asegurarBlob('musicaImportada', id)))
    return m && blob ? { tipo: 'audio', blob, nombre: m.nombre, duracion: m.duracionSeg } : null
  }
  return null
}
