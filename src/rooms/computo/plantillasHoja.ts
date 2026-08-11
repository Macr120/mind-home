/**
 * Hojas de arranque. Una hoja en blanco intimida; estas ya traen sus fórmulas
 * puestas, que además es la mejor manera de enseñar que las fórmulas existen.
 */
import type { CeldaHoja } from '../../core/data/db'
import { COLS_INICIO, FILAS_INICIO } from './constantes'
import type { Celdas } from './hoja'

export interface PlantillaHoja {
  id: string
  nombreEs: string
  claveNombre: string
  celdas: Celdas
  filas: number
  cols: number
}

const txt = (crudo: string, neg = false): CeldaHoja => ({ crudo, ...(neg ? { fmt: { neg: true } } : {}) })
const num = (crudo: string, dec = 2): CeldaHoja => ({ crudo, fmt: { dec } })

const presupuesto: Celdas = {
  A1: txt('Concepto', true),
  B1: txt('Previsto', true),
  C1: txt('Real', true),
  D1: txt('Diferencia', true),
  A2: txt('Vuelo'),
  A3: txt('Alojamiento'),
  A4: txt('Transporte'),
  A5: txt('Comida'),
  A6: txt('Entradas'),
  A7: txt('Extras'),
  A9: txt('Total', true),
  B9: num('=SUMA(B2:B7)'),
  C9: num('=SUMA(C2:C7)'),
  D9: num('=B9-C9'),
  D2: num('=B2-C2'),
  D3: num('=B3-C3'),
  D4: num('=B4-C4'),
  D5: num('=B5-C5'),
  D6: num('=B6-C6'),
  D7: num('=B7-C7'),
}

const notas: Celdas = {
  A1: txt('Evaluación', true),
  B1: txt('Peso', true),
  C1: txt('Nota', true),
  D1: txt('Aporta', true),
  A2: txt('Parcial 1'),
  B2: num('0.25', 2),
  A3: txt('Parcial 2'),
  B3: num('0.25', 2),
  A4: txt('Tareas'),
  B4: num('0.2', 2),
  A5: txt('Final'),
  B5: num('0.3', 2),
  D2: num('=B2*C2'),
  D3: num('=B3*C3'),
  D4: num('=B4*C4'),
  D5: num('=B5*C5'),
  A7: txt('Promedio', true),
  D7: num('=SUMA(D2:D5)'),
  A8: txt('Peso total'),
  B8: num('=SUMA(B2:B5)'),
}

const mediciones: Celdas = {
  A1: txt('Fecha', true),
  B1: txt('Medida', true),
  C1: txt('Nota', true),
  A2: txt('=HOY()'),
  A5: txt('Promedio', true),
  B5: num('=PROMEDIO(B2:B4)'),
  A6: txt('Máximo', true),
  B6: num('=MAX(B2:B4)'),
  A7: txt('Mínimo', true),
  B7: num('=MIN(B2:B4)'),
}

export const PLANTILLAS_HOJA: PlantillaHoja[] = [
  {
    id: 'blanco',
    nombreEs: 'En blanco',
    claveNombre: 'computo.hojas.plantilla.blanco',
    celdas: {},
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
  {
    id: 'presupuesto',
    nombreEs: 'Presupuesto',
    claveNombre: 'computo.hojas.plantilla.presupuesto',
    celdas: presupuesto,
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
  {
    id: 'notas',
    nombreEs: 'Promedio ponderado',
    claveNombre: 'computo.hojas.plantilla.notas',
    celdas: notas,
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
  {
    id: 'mediciones',
    nombreEs: 'Registro de mediciones',
    claveNombre: 'computo.hojas.plantilla.mediciones',
    celdas: mediciones,
    filas: FILAS_INICIO,
    cols: COLS_INICIO,
  },
]
