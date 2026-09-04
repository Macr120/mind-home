import { dibujosRepo } from '../../core/data/repository'
import type { ContenidoRecurso, RecursoStudio } from '../../core/recursosStudio'

/**
 * Lo que el Studio de arte presta a otras apps (el panel de medios del Studio
 * de video): cada dibujo como imagen. `imagen` es SIEMPRE la composición final
 * aplanada (ver `Dibujo` en db.ts), así que no hay que componer capas.
 */

export async function listarRecursos(): Promise<RecursoStudio[]> {
  return (await dibujosRepo.list())
    .filter((d) => d.id != null)
    .map((d) => ({
      clave: `dibujo:${d.id}`,
      tipo: 'imagen' as const,
      nombre: d.nombre,
      detalle: `${d.ancho}×${d.alto}`,
      miniatura: d.miniatura,
      actualizadoEn: d.actualizadoEn,
    }))
}

export async function obtenerRecurso(clave: string): Promise<ContenidoRecurso | null> {
  const id = Number(clave.split(':')[1])
  const d = (await dibujosRepo.list()).find((x) => x.id === id)
  return d ? { tipo: 'imagen', blob: d.imagen, nombre: d.nombre, ancho: d.ancho, alto: d.alto, miniatura: d.miniatura } : null
}
