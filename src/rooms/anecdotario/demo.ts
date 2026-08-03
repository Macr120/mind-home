/**
 * Año demo del diario personal: las ~120 entradas de Pep@ (demo.data.ts,
 * generado offline) con las fotos de los hitos. La columna vertebral narrativa
 * de la casa demo.
 */
import { anecdotasRepo } from '../../core/data/repository'
import type { CtxDemo } from '../../demo/builders'
import { DEMO_ANECDOTARIO } from './demo.data'

export async function construirDemoAnecdotario(ctx: CtxDemo): Promise<void> {
  const { entradas } = DEMO_ANECDOTARIO[ctx.idioma]
  // Cada clave de foto se usa UNA vez aunque el generador la repitiera.
  const usadas = new Set<string>()
  for (const e of entradas) {
    let fotos: Blob[] | undefined
    const clave = 'foto' in e ? e.foto : undefined
    if (clave && !usadas.has(clave)) {
      usadas.add(clave)
      const blob = await ctx.foto(`anecdotario/${clave}`)
      if (blob) fotos = [blob]
    }
    await anecdotasRepo.add({
      fecha: ctx.fecha(e.dia),
      titulo: e.titulo,
      contenido: e.texto,
      animo: e.animo,
      ...(fotos ? { fotos } : {}),
    })
  }
}
