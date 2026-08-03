/**
 * Año demo de Ideas: el diario de ideas de Pep@ (~90 sueltas + 5 lluvias
 * temáticas, del contenido generado) y sus mapas/diagramas del año (escritos a
 * mano en demo.mapas.ts), materializados con su fecha real vía
 * `materializarMapa` — cada nodo cuenta en la gamificación el día que se creó.
 */
import { ideasRepo } from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { materializarMapa } from './crear'
import { DEMO_IDEAS } from './demo.data'
import { MAPAS_PEP } from './demo.mapas'

export async function construirDemoIdeas(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_IDEAS[ctx.idioma]
  const r = rngDemo(29061912)
  const enHora = (off: number) => {
    const h = 8 + Math.floor(r() * 12) // entre 8:00 y 19:xx
    return `${ctx.fecha(off)}T${String(h).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00.000Z`
  }

  // Ideas sueltas: cada una con su fecha; unas pocas favoritas.
  await ideasRepo.bulkAdd(
    datos.sueltas.map((s) => ({
      texto: s.texto,
      ...('detalle' in s && s.detalle ? { detalle: s.detalle } : {}),
      ...('favorita' in s && s.favorita ? { favorita: true } : {}),
      fecha: ctx.fecha(s.dia),
      creadoEn: enHora(s.dia),
    })),
  )

  // Lluvias: todas las ideas de una lluvia comparten tema y creadoEn (así la
  // app las agrupa igual que si hubieran salido de la caja de captura).
  for (const lluvia of datos.lluvias) {
    const creadoEn = enHora(lluvia.dia)
    await ideasRepo.bulkAdd(
      lluvia.textos.map((texto) => ({
        texto,
        tema: lluvia.tema,
        fecha: ctx.fecha(lluvia.dia),
        creadoEn,
      })),
    )
  }

  // Los mapas del año, fechados el día que Pep@ los dibujó.
  for (const m of MAPAS_PEP[ctx.idioma]) {
    await materializarMapa(m.nombre, m.tipo, m.propuesta, false, ctx.fecha(m.dia), enHora(m.dia))
  }
}
