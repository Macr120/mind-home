import { entradasBiblioRepo, sesionesEstudioRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { fotoEjemplo } from '../_shared/ejemplos/fotos'
import { porIdioma, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_BIBLIOTECA } from './ejemplos.data'

/**
 * Ejemplo de fábrica de la biblioteca: dos entradas de la enciclopedia y tres
 * sesiones de estudio de la última semana.
 *
 * Las dos entradas cuelgan de temas REALES del índice de `pilares.ts`, así que
 * el árbol las enseña donde toca en vez de dejarlas sueltas en «general». Las
 * sesiones apuntan a la primera entrada: con eso el heatmap y el resumen del
 * pilar tienen algo que contar.
 */

const ID = 'biblioteca.enciclopedia'

const PILAR = 'filosofia'

export const ejemploBiblioteca: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => entradasBiblioRepo.list())) return
    const T = porIdioma(TEXTOS_BIBLIOTECA)
    const hoy = fechaLocalISO()
    const cuando = (dias: number) => `${isoMasDias(hoy, dias)}T18:00:00.000Z`

    const imagen = await fotoEjemplo('biblioteca.entrada')
    const entradaId = await entradasBiblioRepo.add({
      pilarId: PILAR,
      temaId: 'fil-libre',
      titulo: T.entrada1Titulo,
      resumen: T.entrada1Resumen,
      puntosClave: [T.entrada1Punto1, T.entrada1Punto2, T.entrada1Punto3],
      imagen,
      creadoEn: cuando(-8),
      actualizadoEn: cuando(-2),
      ejemploDe: ID,
    })
    // La segunda va sin ilustración: se ve que la imagen es opcional.
    await entradasBiblioRepo.add({
      pilarId: PILAR,
      temaId: 'fil-ser',
      titulo: T.entrada2Titulo,
      resumen: T.entrada2Resumen,
      puntosClave: [T.entrada2Punto1, T.entrada2Punto2],
      creadoEn: cuando(-3),
      actualizadoEn: cuando(-3),
      ejemploDe: ID,
    })

    const sesiones: { dias: number; minutos: number; nota: string }[] = [
      { dias: -6, minutos: 25, nota: T.notaEstudio1 },
      { dias: -4, minutos: 20, nota: T.notaEstudio2 },
      { dias: -1, minutos: 10, nota: T.notaEstudio3 },
    ]
    for (const s of sesiones) {
      await sesionesEstudioRepo.add({
        pilarId: PILAR,
        entradaId,
        minutos: s.minutos,
        fecha: isoMasDias(hoy, s.dias),
        nota: s.nota,
        ejemploDe: ID,
      })
    }
  },
}
