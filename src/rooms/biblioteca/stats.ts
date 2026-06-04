import type { ProgresoTema } from '../../core/data/db'
import { contarIndice, PILARES } from './pilares'

export function estadisticasEnciclopedia(progreso: ProgresoTema[]) {
  const indice = contarIndice()
  const porEstado = {
    explorado: 0,
    en_estudio: 0,
    revisado: 0,
  }
  for (const p of progreso) porEstado[p.estado] += 1

  const marcados = progreso.length
  const cobertura =
    indice.temas > 0 ? Math.round((marcados / indice.temas) * 100) : 0

  const porPilar = PILARES.map((pilar) => {
    const temaIds = new Set(
      pilar.ramas.flatMap((r) => r.temas.map((t) => t.id)),
    )
    const delPilar = progreso.filter((p) => temaIds.has(p.temaId))
    return {
      id: pilar.id,
      titulo: pilar.titulo,
      icon: pilar.icon,
      total: temaIds.size,
      marcados: delPilar.length,
      revisados: delPilar.filter((p) => p.estado === 'revisado').length,
    }
  }).sort((a, b) => b.marcados - a.marcados)

  const recientes = [...progreso]
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))
    .slice(0, 5)

  return {
    ...indice,
    marcados,
    cobertura,
    porEstado,
    porPilar,
    recientes,
  }
}
