/**
 * Hojas de arranque. Una hoja en blanco intimida; estas ya traen sus fórmulas
 * puestas, que además es la mejor manera de enseñar que las fórmulas existen.
 *
 * Se arman en el momento de sembrar (`crear`): los rótulos salen en el idioma
 * activo y las fechas del registro son las de las últimas semanas. Solo las usa
 * `siembra.ts`; al cambiar de idioma, `ejemploHojas.retraducir` reescribe los
 * rótulos que sigan siendo de fábrica (lo demás de las hojas no se toca).
 */
import type { CeldaHoja, GraficaHoja } from '../../core/data/db'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { porIdioma } from '../../core/i18n/porIdioma'
import { COLS_INICIO, FILAS_INICIO } from './constantes'
import type { Celdas } from './hoja'
import { ROTULOS_HOJA, type RotulosHoja } from './rotulosHoja'

export interface PlantillaHoja {
  id: string
  nombreEs: string
  claveNombre: string
  /** Nombre de la hoja sembrada en `ROTULOS_HOJA` (la de `blanco` no se siembra). */
  rotuloNombre?: keyof RotulosHoja
  /** `R`: los rótulos a usar; sin él, los del idioma activo. */
  crear: (R?: RotulosHoja) => { celdas: Celdas; graficas?: GraficaHoja[] }
  filas: number
  cols: number
}

const txt = (crudo: string, neg = false): CeldaHoja => ({ crudo, ...(neg ? { fmt: { neg: true } } : {}) })
const num = (crudo: string, dec = 2): CeldaHoja => ({ crudo, fmt: { dec } })

function presupuesto(R: RotulosHoja): Celdas {
  const partidas: [string, number, number][] = [
    [R.vuelo, 450, 482],
    [R.alojamiento, 600, 560],
    [R.transporte, 120, 145],
    [R.comida, 300, 338],
    [R.entradas, 90, 75],
    [R.extras, 100, 64],
  ]
  const celdas: Celdas = {
    A1: txt(R.concepto, true),
    B1: txt(R.previsto, true),
    C1: txt(R.real, true),
    D1: txt(R.diferencia, true),
    A9: txt(R.total, true),
    B9: num('=SUMA(B2:B7)'),
    C9: num('=SUMA(C2:C7)'),
    D9: num('=B9-C9'),
  }
  partidas.forEach(([concepto, previsto, real], i) => {
    const f = i + 2
    celdas[`A${f}`] = txt(concepto)
    celdas[`B${f}`] = num(String(previsto))
    celdas[`C${f}`] = num(String(real))
    celdas[`D${f}`] = num(`=B${f}-C${f}`)
  })
  return celdas
}

function notas(R: RotulosHoja): Celdas {
  const evaluaciones: [string, number, number][] = [
    [R.parcial1, 7.5, 0.25],
    [R.parcial2, 8.2, 0.25],
    [R.tareas, 9.4, 0.2],
    [R.final, 8, 0.3],
  ]
  const celdas: Celdas = {
    A1: txt(R.evaluacion, true),
    B1: txt(R.nota, true),
    C1: txt(R.peso, true),
    D1: txt(R.aporta, true),
    A7: txt(R.promedio, true),
    D7: num('=SUMA(D2:D5)'),
    A8: txt(R.pesoTotal),
    C8: num('=SUMA(C2:C5)'),
  }
  evaluaciones.forEach(([nombre, nota, peso], i) => {
    const f = i + 2
    celdas[`A${f}`] = txt(nombre)
    celdas[`B${f}`] = num(String(nota), 1)
    celdas[`C${f}`] = num(String(peso))
    celdas[`D${f}`] = num(`=B${f}*C${f}`)
  })
  return celdas
}

/** Seis pesadas semanales que acaban hoy. */
function mediciones(R: RotulosHoja): Celdas {
  const hoy = fechaLocalISO()
  const pesos = [72.4, 72.1, 71.8, 71.9, 71.5, 71.2]
  const celdas: Celdas = {
    A1: txt(R.fecha, true),
    B1: txt(R.medida, true),
    C1: txt(R.apunte, true),
    A9: txt(R.promedio, true),
    B9: num('=PROMEDIO(B2:B7)', 1),
    A10: txt(R.maximo, true),
    B10: num('=MAX(B2:B7)', 1),
    A11: txt(R.minimo, true),
    B11: num('=MIN(B2:B7)', 1),
  }
  pesos.forEach((kg, i) => {
    celdas[`A${i + 2}`] = txt(isoMasDias(hoy, (i - pesos.length + 1) * 7))
    celdas[`B${i + 2}`] = num(String(kg), 1)
  })
  return celdas
}

export const PLANTILLAS_HOJA: PlantillaHoja[] = [
  {
    id: 'blanco',
    nombreEs: 'En blanco',
    claveNombre: 'computo.hojas.plantilla.blanco',
    crear: () => ({ celdas: {} }),
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
  {
    id: 'presupuesto',
    nombreEs: 'Presupuesto',
    claveNombre: 'computo.hojas.plantilla.presupuesto',
    rotuloNombre: 'nombrePresupuesto',
    crear: (R = porIdioma(ROTULOS_HOJA)) => {
      return {
        celdas: presupuesto(R),
        graficas: [
          { id: 'seed-presupuesto', tipo: 'barras', titulo: R.graficaPresupuesto, rango: 'A1:C7', encabezadoFila: true, encabezadoCol: true },
        ],
      }
    },
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
  {
    id: 'notas',
    nombreEs: 'Promedio ponderado',
    claveNombre: 'computo.hojas.plantilla.notas',
    rotuloNombre: 'nombreNotas',
    crear: (R = porIdioma(ROTULOS_HOJA)) => {
      return {
        celdas: notas(R),
        graficas: [
          { id: 'seed-notas', tipo: 'barras', titulo: R.graficaNotas, rango: 'A1:B5', encabezadoFila: true, encabezadoCol: true },
        ],
      }
    },
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
  {
    id: 'mediciones',
    nombreEs: 'Registro de mediciones',
    claveNombre: 'computo.hojas.plantilla.mediciones',
    rotuloNombre: 'nombreMediciones',
    crear: (R = porIdioma(ROTULOS_HOJA)) => {
      return {
        celdas: mediciones(R),
        graficas: [
          { id: 'seed-mediciones', tipo: 'lineas', titulo: R.graficaMediciones, rango: 'A1:B7', encabezadoFila: true, encabezadoCol: true },
        ],
      }
    },
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
]
