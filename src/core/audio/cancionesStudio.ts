import { proveedorRecursos, type RecursoStudio } from '../recursosStudio'
import { pistasMusicaRepo } from '../data/repository'
import { useAjustes } from '../state/ajustesStore'
import { detenerPista, iniciarPista } from './pistas'

/**
 * Puente Studio de audio → música de fondo. La canción se renderiza a WAV con el
 * proveedor de recursos del Studio (el mismo que usa el Studio de video) y se
 * guarda como una pista más de «Mis pistas»: así suena con el mismo reproductor,
 * sube sola a la nube y sirve también de tono del despertador.
 *
 * La pista recuerda de qué canción salió (`studioClave`) y de qué versión
 * (`studioVersion` = su `actualizadoEn`): elegirla otra vez solo re-renderiza si
 * la canción cambió en el Studio.
 */

/** Las canciones del Studio de audio (las tuyas y las de ejemplo); las tomas y la música importada no. */
export async function listarCancionesStudio(): Promise<RecursoStudio[]> {
  const todos = (await proveedorRecursos('audio')?.listar()) ?? []
  return todos.filter((r) => r.clave.startsWith('proyecto:') || r.clave.startsWith('semilla:'))
}

/** Renderiza (si hace falta) la canción y la deja sonando de fondo. Devuelve el id de la pista. */
export async function usarCancionDeFondo(cancion: RecursoStudio): Promise<number | null> {
  const proveedor = proveedorRecursos('audio')
  if (!proveedor) return null
  const existente = (await pistasMusicaRepo.list()).find((p) => p.studioClave === cancion.clave)
  let id = existente?.id ?? null
  if (!existente || existente.studioVersion !== cancion.actualizadoEn || !existente.blob) {
    const contenido = await proveedor.obtener(cancion.clave)
    if (!contenido || contenido.tipo !== 'audio') return null
    const datos = {
      nombre: cancion.nombre,
      blob: contenido.blob,
      duracionSeg: cancion.duracion,
      studioClave: cancion.clave,
      studioVersion: cancion.actualizadoEn,
    }
    if (id != null) await pistasMusicaRepo.update(id, datos)
    else id = (await pistasMusicaRepo.add({ ...datos, creadoEn: new Date().toISOString() })) as number
  }
  if (id == null) return null
  const ajustes = useAjustes.getState()
  const yaSonaba = ajustes.musicaFuente === 'pistas' && ajustes.musicaPistaId === id && ajustes.musicaAmbiental
  ajustes.setMusicaFuente('pistas')
  ajustes.setMusicaPistaId(id)
  ajustes.setMusicaAmbiental(true)
  // Misma pista con audio nuevo: el reproductor no la reinicia solo (es idempotente por id).
  if (yaSonaba) {
    const fila = (await pistasMusicaRepo.list()).find((p) => p.id === id)
    if (fila) {
      detenerPista()
      await iniciarPista(fila, { loop: true })
    }
  }
  return id
}
