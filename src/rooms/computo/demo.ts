/**
 * Año demo de la sala de cómputo: el formulario de Pep@ (tres carpetas, con
 * copias reales del catálogo entre ellas), sus tres hojas y el historial de lo
 * que fue calculando.
 *
 * Las horas salen de `rngDemo` dentro de la franja de estudio de Pep@ (19:30 a
 * 20:30 de lunes a jueves, ver `horarioPep.ts`): el builder no inventa horarios.
 */
import { calculosComputoRepo, carpetasFormulaRepo, formulasRepo, hojasRepo } from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { sembrarMetasApp } from '../../demo/metasPep'
import { DEMO_COMPUTO } from './demo.data'

export async function construirDemoComputo(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_COMPUTO[ctx.idioma]
  const r = rngDemo(31415926)
  const enHora = (off: number) => {
    // 19:30–20:29, la franja de estudio de Pep@.
    const min = 30 + Math.floor(r() * 60)
    const h = 19 + Math.floor(min / 60)
    return `${ctx.fecha(off)}T${String(h).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00.000Z`
  }

  // Las carpetas primero: las fórmulas cuelgan de ellas por `carpetaId`.
  for (const [i, carpeta] of datos.carpetas.entries()) {
    await carpetasFormulaRepo.add({
      carpetaId: carpeta.id,
      padreId: carpeta.padre,
      nombre: carpeta.nombre,
      emoji: carpeta.emoji,
      orden: i,
      creadoEn: enHora(-220 + i * 3),
    })
  }

  for (const carpeta of datos.carpetas) {
    for (const [i, f] of carpeta.formulas.entries()) {
      await formulasRepo.add({
        formulaId: f.id,
        carpetaId: carpeta.id,
        nombre: f.nombre,
        expresion: f.expresion,
        resultado: f.resultado,
        tex: f.tex,
        descripcion: f.descripcion,
        variables: f.variables,
        orden: i,
        fecha: ctx.fecha(f.dia),
        creadoEn: enHora(f.dia),
      })
    }
  }

  for (const h of datos.hojas) {
    await hojasRepo.add({
      nombre: h.nombre,
      celdas: h.celdas,
      filas: h.filas,
      cols: h.cols,
      creadoEn: enHora(h.dia),
      actualizadoEn: enHora(h.dia + 2),
    })
  }

  await calculosComputoRepo.bulkAdd(
    datos.calculos.map((c) => ({
      tipo: c.tipo,
      entrada: c.entrada,
      salida: c.salida,
      fecha: ctx.fecha(c.dia),
      creadoEn: enHora(c.dia),
    })),
  )

  // El parcial que viene, el costeo que ya cerró y la duda que arrastra.
  await sembrarMetasApp(ctx, 'computo')
}
