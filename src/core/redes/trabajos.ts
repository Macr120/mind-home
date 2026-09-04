/**
 * El trabajo de publicación: la subida vive AQUÍ (en el store) y no en el
 * diálogo, para que sobreviva a cerrarlo, a salir del proyecto y al cuarto.
 * Uno a la vez. Al terminar anota la publicación en el proyecto de video (es el
 * ÚNICO que escribe `ProyectoVideo.publicaciones`: el patch de guardado del
 * Editor la omite a propósito para no pisarla) y avisa con `notificar`.
 *
 * Los textos llegan traducidos de quien lanza (un componente con `t`): este
 * módulo no tiene React.
 */
import { proyectosVideoRepo } from '../data/repository'
import type { PublicacionVideo } from '../data/db'
import { notificar } from '../notificaciones'
import { publicar } from './api'
import { useRedes } from './redesStore'
import { ErrorRedes, type MetaPublicacion, type Plataforma, type TrabajoPublicacion } from './tipos'

export interface OpcionesTrabajo {
  proyectoId: number
  proyectoNombre: string
  plataforma: Plataforma
  blob: Blob
  mime: string
  meta: MetaPublicacion
  titulo: string
  /** Canal, Página o @cuenta, para el historial. */
  destinoNombre?: string
  textos: { publicado: string; fallo: string }
}

let abortActual: AbortController | null = null

function actualizar(id: string, patch: Partial<TrabajoPublicacion>): void {
  const t = useRedes.getState().trabajo
  if (t?.id === id) useRedes.setState({ trabajo: { ...t, ...patch } })
}

/** Lanza la subida en segundo plano y devuelve el id del trabajo; si ya hay uno activo, devuelve null. */
export function lanzarTrabajo(o: OpcionesTrabajo): string | null {
  if (useRedes.getState().trabajo?.estado === 'activo') return null
  const id = `pub-${Date.now().toString(36)}`
  const abort = new AbortController()
  abortActual = abort
  useRedes.setState({
    trabajo: {
      id,
      proyectoId: o.proyectoId,
      proyectoNombre: o.proyectoNombre,
      plataforma: o.plataforma,
      titulo: o.titulo,
      fase: 'subiendo',
      fraccion: 0,
      estado: 'activo',
      visto: false,
    },
  })
  void correr(id, o, abort)
  return id
}

async function correr(id: string, o: OpcionesTrabajo, abort: AbortController): Promise<void> {
  // Best-effort: en móvil la pantalla apagada corta la subida.
  type NavegadorConWakeLock = Navigator & { wakeLock?: { request(tipo: 'screen'): Promise<{ release(): Promise<void> }> } }
  const wakeLock = await (navigator as NavegadorConWakeLock).wakeLock?.request('screen').catch(() => null)
  try {
    const r = await publicar({
      plataforma: o.plataforma,
      blob: o.blob,
      mime: o.mime,
      meta: o.meta,
      senal: abort.signal,
      onProgreso: (f, fase) => actualizar(id, { fraccion: f, fase: fase === 'procesando' ? 'publicando' : 'subiendo' }),
    })
    await anotar(o.proyectoId, {
      id,
      plataforma: o.plataforma,
      fecha: new Date().toISOString(),
      titulo: o.titulo,
      idRemoto: r.id,
      url: r.url,
      estado: r.privado ? 'privado' : 'publicado',
      destinoNombre: o.destinoNombre,
    })
    actualizar(id, { estado: 'listo', resultado: r, fraccion: 1 })
    void notificar({ clave: `redes:${id}`, titulo: o.textos.publicado, cuerpo: o.proyectoNombre, plantillaId: 'video', seccion: 'videos' })
  } catch (e) {
    if (abort.signal.aborted || (e instanceof ErrorRedes && e.codigo === 'cancelado')) {
      actualizar(id, { estado: 'cancelado' })
      return
    }
    const error = e instanceof Error ? e.message : String(e)
    actualizar(id, { estado: 'error', error })
    void notificar({ clave: `redes:${id}`, titulo: o.textos.fallo, cuerpo: error, plantillaId: 'video', seccion: 'videos' })
  } finally {
    void wakeLock?.release().catch(() => {})
    if (abortActual === abort) abortActual = null
  }
}

async function anotar(proyectoId: number, pub: PublicacionVideo): Promise<void> {
  const fila = (await proyectosVideoRepo.list()).find((p) => p.id === proyectoId)
  if (!fila) return
  await proyectosVideoRepo.update(proyectoId, { publicaciones: [...(fila.publicaciones ?? []), pub] })
}

export function cancelarTrabajo(): void {
  abortActual?.abort()
}

/** Quita el trabajo terminado del store (la píldora y el diálogo dejan de enseñarlo). */
export function descartarTrabajo(): void {
  const t = useRedes.getState().trabajo
  if (t && t.estado !== 'activo') useRedes.setState({ trabajo: null })
}

/** El diálogo ya enseñó el resultado: la píldora no lo repite. */
export function marcarVisto(): void {
  const t = useRedes.getState().trabajo
  if (t && !t.visto) useRedes.setState({ trabajo: { ...t, visto: true } })
}
