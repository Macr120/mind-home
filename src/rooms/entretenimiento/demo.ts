/**
 * Año demo del archivo: la ciencia ficción como refugio.
 *
 * Las fichas vienen escritas (título real, reseña en primera persona) y el
 * builder solo las fecha; el programa «clásicos por ver» se siembra como árbol
 * de metas, que es como lo guarda la app de verdad.
 */
import { mediaArchivoRepo, rutinasRepo } from '../../core/data/repository'
import { colorPorProfundidad } from '../../core/ui/coloresRutina'
import type { CtxDemo } from '../../demo/builders'
import { sembrarMetasApp } from '../../demo/metasPep'
import { DEMO_ENTRETENIMIENTO } from './demo.data'
import { PROGRAMA_DEMO } from './demo.programa'
import { PORTADAS_DEMO } from './portadasDemo'
import { enIdioma } from '../../core/i18n/porIdioma'

const COLOR_PROGRAMA = '#34d399'

export async function construirDemoEntretenimiento(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_ENTRETENIMIENTO, () => import('./demo.data.i18n'))
  const programa = enIdioma(PROGRAMA_DEMO, ctx.idioma)

  // ── El archivo del año ───────────────────────────────────────────────────
  // `creadoEn` es lo que ordena la lista Y lo que cuenta la gamificación: sin
  // él las fichas desaparecerían de la pantalla sin dar error.
  //
  // Solo entran las que tienen carátula: una tarjeta con su emoji suelto entre
  // treinta portadas se lee como un fallo de la app. Hoy quedan fuera las series
  // que ni Wikipedia ni Open Library indexan con ese título.
  const fichas = datos.fichas.filter((f) => PORTADAS_DEMO[f.titulo])
  await mediaArchivoRepo.bulkAdd(
    fichas.map((f) => ({
      tipo: f.tipo,
      titulo: f.titulo,
      genero: f.genero,
      estado: f.estado,
      calificacion: f.estado === 'pendiente' ? 0 : f.calificacion,
      resena: f.estado === 'pendiente' ? '' : f.resena,
      autor: f.autor,
      // Carátula ya resuelta: el visitante ve el archivo con sus portadas sin
      // esperar a la búsqueda en lote (y sin depender de tener red).
      ...(PORTADAS_DEMO[f.titulo] ? { portada: PORTADAS_DEMO[f.titulo] } : {}),
      fecha: ctx.fecha(f.dia),
      creadoEn: `${ctx.fecha(f.dia)}T22:00:00.000Z`,
    })),
  )

  // ── El programa: raíz + un título por meta hija ──────────────────────────
  const nacio = `${ctx.fecha(-30)}T18:00:00.000Z`
  const raizId = await rutinasRepo.add({
    nombre: programa.nombre,
    emoji: '🎯',
    dias: [],
    pasos: [],
    activa: true,
    esMeta: true,
    repeticion: 'una_vez',
    color: COLOR_PROGRAMA,
    orden: 0,
    plantillaId: 'entretenimiento',
    creadoEn: nacio,
  })
  await rutinasRepo.bulkAdd(
    programa.items.map((item, i) => ({
      nombre: item.titulo,
      emoji: '🎯',
      dias: [],
      pasos: [],
      activa: true,
      esMeta: true,
      repeticion: 'una_vez' as const,
      color: colorPorProfundidad(COLOR_PROGRAMA, 1),
      padreId: raizId,
      orden: i,
      nota: item.detalle,
      plantillaId: 'entretenimiento',
      // Las tres primeras ya vistas: el programa está empezado, no intacto.
      // Sin fecha en el calendario, una meta se marca con `completada`.
      ...(i < 3 ? { completada: true } : {}),
      creadoEn: nacio,
    })),
  )

  // La otra meta del cuarto: vaciar los pendientes del archivo, con su plan aún
  // sin aceptar. Va detrás del programa (`ordenDesde`).
  await sembrarMetasApp(ctx, 'entretenimiento', { ordenDesde: 1 })
}
