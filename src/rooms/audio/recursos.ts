import { contextoAudio } from '../../core/audio/motor'
import type { ProyectoAudio } from '../../core/data/db'
import { grabacionesAudioRepo, leerGrabacionAudio, musicaImportadaRepo, proyectosAudioRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import type { ContenidoRecurso, RecursoStudio } from '../../core/recursosStudio'
import { renderizarWav } from './exportarWav'
import { buffersDeClipsProyecto } from './platos'

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
  if (tipo === 'grab') {
    const g = await leerGrabacionAudio(id)
    return g ? { tipo: 'audio', blob: g.blob, nombre: g.nombre, duracion: g.duracionSeg } : null
  }
  if (tipo === 'musica') {
    const m = (await musicaImportadaRepo.list()).find((x) => x.id === id)
    return m ? { tipo: 'audio', blob: m.blob, nombre: m.nombre, duracion: m.duracionSeg } : null
  }
  return null
}
