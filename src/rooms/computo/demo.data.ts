/**
 * Contenido bilingüe del año demo de la sala de cómputo.
 *
 * Escrito a mano y no generado: son fórmulas y hojas con `expresion` y
 * referencias A1 que tienen que CUADRAR entre sí (una hoja con `=SUMA(B2:B15)`
 * necesita que B2..B15 existan). El generador de `scripts/generar-demo.mjs`
 * concatena arrays de primer nivel y llegaría con las referencias rotas.
 */
import type { VariableFormula } from '../../core/data/db'
import type { Celdas } from './hoja'

export interface FormulaDemo {
  /** `formulaId` fijo; con prefijo `cat-` si es una copia real del catálogo. */
  id: string
  nombre: string
  expresion: string
  resultado: string
  tex?: string
  descripcion?: string
  variables: VariableFormula[]
  /** Día en que Pep@ la guardó. */
  dia: number
}

export interface CarpetaDemo {
  id: string
  nombre: string
  emoji?: string
  /** `carpetaId` de la madre, o null. */
  padre: string | null
  formulas: FormulaDemo[]
}

export interface HojaDemo {
  nombre: string
  celdas: Celdas
  filas: number
  cols: number
  dia: number
}

export interface DatosComputo {
  carpetas: CarpetaDemo[]
  hojas: HojaDemo[]
  /** Historial: lo que Pep@ tecleó a lo largo del año. */
  calculos: { entrada: string; salida: string; tipo: string; dia: number }[]
}

const v = (simbolo: string, nombre: string, unidad?: string, valor?: number): VariableFormula => ({
  simbolo,
  nombre,
  unidad,
  valor,
})

const G = (nombre: string): VariableFormula => ({
  simbolo: 'g',
  nombre,
  unidad: 'm/s²',
  valor: 9.81,
  constante: true,
})

// ── Las hojas: mismas celdas en los dos idiomas salvo los rótulos ───────────

const japon = (r: string[]): Celdas => {
  const celdas: Celdas = {
    A1: { crudo: r[0], fmt: { neg: true } },
    B1: { crudo: r[1], fmt: { neg: true } },
    C1: { crudo: r[2], fmt: { neg: true } },
    D1: { crudo: r[3], fmt: { neg: true } },
    E1: { crudo: r[4], fmt: { neg: true } },
  }
  // Catorce días de viaje con su gasto por categoría.
  const gastos = [
    [4200, 1800, 900, 0],
    [3800, 2400, 1200, 2500],
    [3800, 2100, 800, 1800],
    [5200, 2600, 1500, 3200],
    [3800, 1900, 700, 0],
    [4600, 2800, 2100, 4100],
    [3800, 2200, 900, 1500],
    [6100, 3100, 1800, 2800],
    [3800, 1700, 600, 0],
    [4400, 2500, 1400, 3600],
    [3800, 2000, 1100, 900],
    [5800, 2900, 1600, 2200],
    [3800, 1800, 800, 0],
    [4200, 3400, 2600, 1200],
  ]
  gastos.forEach((dia, i) => {
    const f = i + 2
    celdas[`A${f}`] = { crudo: `${r[5]} ${i + 1}` }
    celdas[`B${f}`] = { crudo: String(dia[0]), fmt: { dec: 0 } }
    celdas[`C${f}`] = { crudo: String(dia[1]), fmt: { dec: 0 } }
    celdas[`D${f}`] = { crudo: String(dia[2]), fmt: { dec: 0 } }
    celdas[`E${f}`] = { crudo: String(dia[3]), fmt: { dec: 0 } }
  })
  celdas.A17 = { crudo: r[6], fmt: { neg: true } }
  celdas.B17 = { crudo: '=SUMA(B2:B15)', fmt: { dec: 0 } }
  celdas.C17 = { crudo: '=SUMA(C2:C15)', fmt: { dec: 0 } }
  celdas.D17 = { crudo: '=SUMA(D2:D15)', fmt: { dec: 0 } }
  celdas.E17 = { crudo: '=SUMA(E2:E15)', fmt: { dec: 0 } }
  celdas.A18 = { crudo: r[7] }
  celdas.B18 = { crudo: '=PROMEDIO(B2:B15)', fmt: { dec: 0 } }
  celdas.A20 = { crudo: r[8], fmt: { neg: true } }
  celdas.B20 = { crudo: '=B17+C17+D17+E17', fmt: { dec: 0 } }
  celdas.A21 = { crudo: r[9] }
  celdas.B21 = { crudo: '0.126', fmt: { dec: 3 } }
  celdas.A22 = { crudo: r[10], fmt: { neg: true } }
  celdas.B22 = { crudo: '=REDONDEAR(B20*B21,2)', fmt: { dec: 2 } }
  return celdas
}

const maraton = (r: string[]): Celdas => {
  const celdas: Celdas = {
    A1: { crudo: r[0], fmt: { neg: true } },
    B1: { crudo: r[1], fmt: { neg: true } },
    C1: { crudo: r[2], fmt: { neg: true } },
    D1: { crudo: r[3], fmt: { neg: true } },
  }
  const km = [32, 35, 38, 34, 42, 46, 50, 44, 54, 58, 62, 50, 66, 70, 74, 58, 42, 26]
  km.forEach((k, i) => {
    const f = i + 2
    celdas[`A${f}`] = { crudo: `${r[4]} ${i + 1}` }
    celdas[`B${f}`] = { crudo: String(k), fmt: { dec: 0 } }
    if (i > 0) celdas[`C${f}`] = { crudo: `=REDONDEAR((B${f}-B${f - 1})/B${f - 1}*100,1)`, fmt: { dec: 1 } }
    celdas[`D${f}`] = { crudo: `=REDONDEAR(B${f}/4,1)`, fmt: { dec: 1 } }
  })
  celdas.A21 = { crudo: r[5], fmt: { neg: true } }
  celdas.B21 = { crudo: '=SUMA(B2:B19)', fmt: { dec: 0 } }
  celdas.A22 = { crudo: r[6] }
  celdas.B22 = { crudo: '=MAX(B2:B19)', fmt: { dec: 0 } }
  celdas.A23 = { crudo: r[7] }
  celdas.B23 = { crudo: '=PROMEDIO(B2:B19)', fmt: { dec: 1 } }
  return celdas
}

const fisica = (r: string[]): Celdas => ({
  A1: { crudo: r[0], fmt: { neg: true } },
  B1: { crudo: r[1], fmt: { neg: true } },
  C1: { crudo: r[2], fmt: { neg: true } },
  D1: { crudo: r[3], fmt: { neg: true } },
  A2: { crudo: r[4] },
  B2: { crudo: '0.2', fmt: { dec: 2 } },
  C2: { crudo: '8.4', fmt: { dec: 1 } },
  D2: { crudo: '=B2*C2', fmt: { dec: 2 } },
  A3: { crudo: r[5] },
  B3: { crudo: '0.2', fmt: { dec: 2 } },
  C3: { crudo: '7.1', fmt: { dec: 1 } },
  D3: { crudo: '=B3*C3', fmt: { dec: 2 } },
  A4: { crudo: r[6] },
  B4: { crudo: '0.15', fmt: { dec: 2 } },
  C4: { crudo: '9.5', fmt: { dec: 1 } },
  D4: { crudo: '=B4*C4', fmt: { dec: 2 } },
  A5: { crudo: r[7] },
  B5: { crudo: '0.15', fmt: { dec: 2 } },
  C5: { crudo: '9', fmt: { dec: 1 } },
  D5: { crudo: '=B5*C5', fmt: { dec: 2 } },
  A6: { crudo: r[8] },
  B6: { crudo: '0.3', fmt: { dec: 2 } },
  A8: { crudo: r[9], fmt: { neg: true } },
  B8: { crudo: '=SUMA(B2:B6)', fmt: { dec: 2 } },
  A9: { crudo: r[10], fmt: { neg: true } },
  D9: { crudo: '=SUMA(D2:D5)', fmt: { dec: 2 } },
  A10: { crudo: r[11] },
  D10: { crudo: '=REDONDEAR((6-D9)/B6,1)', fmt: { dec: 1 } },
})

export const DEMO_COMPUTO: Record<'es' | 'en', DatosComputo> = {
  es: {
    carpetas: [
      {
        id: 'demo-fisica',
        nombre: 'Física II',
        emoji: '⚛️',
        padre: null,
        formulas: [],
      },
      {
        id: 'demo-parciales',
        nombre: 'Parciales',
        emoji: '📐',
        padre: 'demo-fisica',
        formulas: [
          {
            id: 'cat-fisica-mrua-posicion',
            nombre: 'Posición con aceleración constante',
            expresion: 'x0 + v0 * t + a * t^2 / 2',
            resultado: 'x',
            tex: 'x = x_{0} + v_{0}t + \\tfrac{1}{2}a\\,t^{2}',
            variables: [
              v('x0', 'posición inicial', 'm', 0),
              v('v0', 'velocidad inicial', 'm/s', 0),
              v('a', 'aceleración', 'm/s²', 9.81),
              v('t', 'tiempo', 's', 3),
            ],
            dia: -38,
          },
          {
            id: 'cat-fisica-torricelli',
            nombre: 'Torricelli (velocidad sin tiempo)',
            expresion: 'sqrt(v0^2 + 2 * a * d)',
            resultado: 'v',
            tex: 'v = \\sqrt{v_{0}^{2} + 2a\\,\\Delta x}',
            variables: [
              v('v0', 'velocidad inicial', 'm/s', 0),
              v('a', 'aceleración', 'm/s²', 9.81),
              v('d', 'desplazamiento', 'm', 20),
            ],
            dia: -38,
          },
          {
            id: 'cat-fisica-energia-cinetica',
            nombre: 'Energía cinética',
            expresion: 'm * v^2 / 2',
            resultado: 'Ek',
            tex: 'E_{k} = \\tfrac{1}{2}m\\,v^{2}',
            descripcion: 'Con mi masa fija: casi siempre la calculo para mí corriendo.',
            variables: [v('m', 'masa', 'kg', 62), v('v', 'velocidad', 'm/s', 3.2)],
            dia: -36,
          },
          {
            id: 'cat-fisica-hooke',
            nombre: 'Ley de Hooke',
            expresion: 'k * x',
            resultado: 'F',
            tex: 'F = k\\,x',
            variables: [v('k', 'constante del resorte', 'N/m', 200), v('x', 'deformación', 'm', 0.05)],
            dia: -30,
          },
          {
            id: 'cat-fisica-periodo-pendulo',
            nombre: 'Periodo del péndulo simple',
            expresion: '2 * pi * sqrt(L / g)',
            resultado: 'T',
            tex: 'T = 2\\pi\\sqrt{\\dfrac{L}{g}}',
            variables: [v('L', 'longitud', 'm', 1), G('gravedad')],
            dia: -24,
          },
        ],
      },
      {
        id: 'demo-cafeteria',
        nombre: 'La cafetería',
        emoji: '☕',
        padre: null,
        formulas: [
          {
            id: 'demo-costo-taza',
            nombre: 'Costo por taza',
            expresion: 'precioKg / 1000 * gramos + leche + vaso',
            resultado: 'costo',
            descripcion: 'Lo que cuesta servir una taza, sin contar el tiempo.',
            variables: [
              v('precioKg', 'precio del kilo de café', '$', 420),
              v('gramos', 'gramos por taza', 'g', 18),
              v('leche', 'costo de la leche', '$', 4.5),
              v('vaso', 'vaso y tapa', '$', 2.8),
            ],
            dia: -112,
          },
          {
            id: 'demo-margen',
            nombre: 'Margen sobre el precio',
            expresion: '(pv - costo) / pv * 100',
            resultado: 'margen',
            tex: 'margen = \\dfrac{pv - costo}{pv} \\times 100',
            variables: [v('pv', 'precio de venta', '$', 45), v('costo', 'costo de la taza', '$', 14.9)],
            dia: -110,
          },
        ],
      },
      {
        id: 'demo-correr',
        nombre: 'Correr',
        emoji: '🏃',
        padre: null,
        formulas: [
          {
            id: 'demo-ritmo',
            nombre: 'Ritmo por kilómetro',
            expresion: 'minutos / km',
            resultado: 'ritmo',
            tex: 'ritmo = \\dfrac{minutos}{km}',
            variables: [v('minutos', 'minutos totales', 'min', 58), v('km', 'kilómetros', 'km', 10)],
            dia: -205,
          },
          {
            id: 'demo-paso-objetivo',
            nombre: 'Ritmo para la meta del maratón',
            expresion: 'metaMin / 42.195',
            resultado: 'paso',
            variables: [v('metaMin', 'meta en minutos', 'min', 240)],
            dia: -200,
          },
          {
            id: 'demo-vo2',
            nombre: 'VO₂ máx aproximado',
            expresion: '15.3 * fcmax / fcrep',
            resultado: 'VO2',
            tex: 'VO_{2}\\,m\\acute{a}x \\approx 15.3\\,\\dfrac{FC_{m\\acute{a}x}}{FC_{reposo}}',
            descripcion: 'La fórmula de Uth: aproximada, pero sirve para ver si mejoro.',
            variables: [
              v('fcmax', 'frecuencia máxima', 'ppm', 189),
              v('fcrep', 'frecuencia en reposo', 'ppm', 52),
            ],
            dia: -186,
          },
        ],
      },
    ],
    hojas: [
      {
        nombre: 'Presupuesto Japón',
        celdas: japon([
          'Día',
          'Comida',
          'Transporte',
          'Entradas',
          'Compras',
          'Día',
          'Total ¥',
          'Media diaria',
          'Total del viaje ¥',
          'Tipo de cambio (MXN/¥)',
          'Total en pesos',
        ]),
        filas: 30,
        cols: 6,
        dia: -46,
      },
      {
        nombre: 'Plan de 18 semanas',
        celdas: maraton(['Semana', 'Kilómetros', 'Cambio %', 'Tirada larga', 'Semana', 'Total', 'Semana pico', 'Media']),
        filas: 30,
        cols: 5,
        dia: -158,
      },
      {
        nombre: 'Notas de Física II',
        celdas: fisica([
          'Evaluación',
          'Peso',
          'Nota',
          'Aporta',
          'Parcial 1',
          'Parcial 2',
          'Tareas',
          'Laboratorio',
          'Final',
          'Peso acumulado',
          'Llevo',
          'Necesito en el final',
        ]),
        filas: 20,
        cols: 5,
        dia: -33,
      },
    ],
    calculos: [
      { entrada: '62 * 3.2^2 / 2', salida: '317.44', tipo: 'formula', dia: -36 },
      { entrada: 'x^2 - 5*x + 6 = 0', salida: '2, 3', tipo: 'ecuacion', dia: -35 },
      { entrada: 'sqrt(2 * 9.81 * 20)', salida: '19.809088818226', tipo: 'calculo', dia: -34 },
      { entrada: '2 * pi * sqrt(0.8 / 9.81)', salida: '1.7942528231932', tipo: 'formula', dia: -24 },
      { entrada: '420 / 1000 * 18 + 4.5 + 2.8', salida: '14.86', tipo: 'formula', dia: -112 },
      { entrada: '(45 - 14.86) / 45 * 100', salida: '66.977777777778', tipo: 'formula', dia: -110 },
      { entrada: '240 / 42.195', salida: '5.6877591634080', tipo: 'formula', dia: -200 },
      { entrada: '58 / 10', salida: '5.8', tipo: 'calculo', dia: -205 },
      { entrada: '15.3 * 189 / 52', salida: '55.609615384615', tipo: 'formula', dia: -186 },
      { entrada: '74 * 18', salida: '1332', tipo: 'calculo', dia: -158 },
      { entrada: '3800 * 14', salida: '53200', tipo: 'calculo', dia: -46 },
      { entrada: '0.126 * 194500', salida: '24507', tipo: 'calculo', dia: -46 },
      { entrada: 'x^2 - 4 = 0', salida: '-2, 2', tipo: 'ecuacion', dia: -33 },
      { entrada: '0.2*8.4 + 0.2*7.1 + 0.15*9.5 + 0.15*9', salida: '5.855', tipo: 'calculo', dia: -33 },
      { entrada: '(6 - 5.855) / 0.3', salida: '0.48333333333333', tipo: 'calculo', dia: -33 },
    ],
  },

  en: {
    carpetas: [
      { id: 'demo-fisica', nombre: 'Physics II', emoji: '⚛️', padre: null, formulas: [] },
      {
        id: 'demo-parciales',
        nombre: 'Midterms',
        emoji: '📐',
        padre: 'demo-fisica',
        formulas: [
          {
            id: 'cat-fisica-mrua-posicion',
            nombre: 'Position under constant acceleration',
            expresion: 'x0 + v0 * t + a * t^2 / 2',
            resultado: 'x',
            tex: 'x = x_{0} + v_{0}t + \\tfrac{1}{2}a\\,t^{2}',
            variables: [
              v('x0', 'initial position', 'm', 0),
              v('v0', 'initial velocity', 'm/s', 0),
              v('a', 'acceleration', 'm/s²', 9.81),
              v('t', 'time', 's', 3),
            ],
            dia: -38,
          },
          {
            id: 'cat-fisica-torricelli',
            nombre: "Torricelli's equation",
            expresion: 'sqrt(v0^2 + 2 * a * d)',
            resultado: 'v',
            tex: 'v = \\sqrt{v_{0}^{2} + 2a\\,\\Delta x}',
            variables: [
              v('v0', 'initial velocity', 'm/s', 0),
              v('a', 'acceleration', 'm/s²', 9.81),
              v('d', 'displacement', 'm', 20),
            ],
            dia: -38,
          },
          {
            id: 'cat-fisica-energia-cinetica',
            nombre: 'Kinetic energy',
            expresion: 'm * v^2 / 2',
            resultado: 'Ek',
            tex: 'E_{k} = \\tfrac{1}{2}m\\,v^{2}',
            descripcion: 'With my own mass fixed: I nearly always work it out for myself running.',
            variables: [v('m', 'mass', 'kg', 62), v('v', 'velocity', 'm/s', 3.2)],
            dia: -36,
          },
          {
            id: 'cat-fisica-hooke',
            nombre: "Hooke's law",
            expresion: 'k * x',
            resultado: 'F',
            tex: 'F = k\\,x',
            variables: [v('k', 'spring constant', 'N/m', 200), v('x', 'displacement', 'm', 0.05)],
            dia: -30,
          },
          {
            id: 'cat-fisica-periodo-pendulo',
            nombre: 'Period of a simple pendulum',
            expresion: '2 * pi * sqrt(L / g)',
            resultado: 'T',
            tex: 'T = 2\\pi\\sqrt{\\dfrac{L}{g}}',
            variables: [v('L', 'length', 'm', 1), G('gravity')],
            dia: -24,
          },
        ],
      },
      {
        id: 'demo-cafeteria',
        nombre: 'The café',
        emoji: '☕',
        padre: null,
        formulas: [
          {
            id: 'demo-costo-taza',
            nombre: 'Cost per cup',
            expresion: 'precioKg / 1000 * gramos + leche + vaso',
            resultado: 'costo',
            descripcion: 'What it costs to serve one cup, not counting my time.',
            variables: [
              v('precioKg', 'price per kilo of coffee', '$', 420),
              v('gramos', 'grams per cup', 'g', 18),
              v('leche', 'milk cost', '$', 4.5),
              v('vaso', 'cup and lid', '$', 2.8),
            ],
            dia: -112,
          },
          {
            id: 'demo-margen',
            nombre: 'Margin on the price',
            expresion: '(pv - costo) / pv * 100',
            resultado: 'margen',
            tex: 'margin = \\dfrac{price - cost}{price} \\times 100',
            variables: [v('pv', 'selling price', '$', 45), v('costo', 'cost per cup', '$', 14.9)],
            dia: -110,
          },
        ],
      },
      {
        id: 'demo-correr',
        nombre: 'Running',
        emoji: '🏃',
        padre: null,
        formulas: [
          {
            id: 'demo-ritmo',
            nombre: 'Pace per kilometre',
            expresion: 'minutos / km',
            resultado: 'ritmo',
            tex: 'pace = \\dfrac{minutes}{km}',
            variables: [v('minutos', 'total minutes', 'min', 58), v('km', 'kilometres', 'km', 10)],
            dia: -205,
          },
          {
            id: 'demo-paso-objetivo',
            nombre: 'Pace for the marathon target',
            expresion: 'metaMin / 42.195',
            resultado: 'paso',
            variables: [v('metaMin', 'target in minutes', 'min', 240)],
            dia: -200,
          },
          {
            id: 'demo-vo2',
            nombre: 'Approximate VO₂ max',
            expresion: '15.3 * fcmax / fcrep',
            resultado: 'VO2',
            tex: 'VO_{2}\\,max \\approx 15.3\\,\\dfrac{HR_{max}}{HR_{rest}}',
            descripcion: "Uth's formula: rough, but good enough to see whether I am improving.",
            variables: [v('fcmax', 'maximum heart rate', 'bpm', 189), v('fcrep', 'resting heart rate', 'bpm', 52)],
            dia: -186,
          },
        ],
      },
    ],
    hojas: [
      {
        nombre: 'Japan budget',
        celdas: japon([
          'Day',
          'Food',
          'Transport',
          'Tickets',
          'Shopping',
          'Day',
          'Total ¥',
          'Daily average',
          'Trip total ¥',
          'Exchange rate (MXN/¥)',
          'Total in pesos',
        ]),
        filas: 30,
        cols: 6,
        dia: -46,
      },
      {
        nombre: '18-week plan',
        celdas: maraton(['Week', 'Kilometres', 'Change %', 'Long run', 'Week', 'Total', 'Peak week', 'Average']),
        filas: 30,
        cols: 5,
        dia: -158,
      },
      {
        nombre: 'Physics II grades',
        celdas: fisica([
          'Assessment',
          'Weight',
          'Grade',
          'Contributes',
          'Midterm 1',
          'Midterm 2',
          'Homework',
          'Lab',
          'Final',
          'Weight so far',
          'Running total',
          'Needed in the final',
        ]),
        filas: 20,
        cols: 5,
        dia: -33,
      },
    ],
    calculos: [
      { entrada: '62 * 3.2^2 / 2', salida: '317.44', tipo: 'formula', dia: -36 },
      { entrada: 'x^2 - 5*x + 6 = 0', salida: '2, 3', tipo: 'ecuacion', dia: -35 },
      { entrada: 'sqrt(2 * 9.81 * 20)', salida: '19.809088818226', tipo: 'calculo', dia: -34 },
      { entrada: '2 * pi * sqrt(0.8 / 9.81)', salida: '1.7942528231932', tipo: 'formula', dia: -24 },
      { entrada: '420 / 1000 * 18 + 4.5 + 2.8', salida: '14.86', tipo: 'formula', dia: -112 },
      { entrada: '(45 - 14.86) / 45 * 100', salida: '66.977777777778', tipo: 'formula', dia: -110 },
      { entrada: '240 / 42.195', salida: '5.6877591634080', tipo: 'formula', dia: -200 },
      { entrada: '58 / 10', salida: '5.8', tipo: 'calculo', dia: -205 },
      { entrada: '15.3 * 189 / 52', salida: '55.609615384615', tipo: 'formula', dia: -186 },
      { entrada: '74 * 18', salida: '1332', tipo: 'calculo', dia: -158 },
      { entrada: '3800 * 14', salida: '53200', tipo: 'calculo', dia: -46 },
      { entrada: '0.126 * 194500', salida: '24507', tipo: 'calculo', dia: -46 },
      { entrada: 'x^2 - 4 = 0', salida: '-2, 2', tipo: 'ecuacion', dia: -33 },
      { entrada: '0.2*8.4 + 0.2*7.1 + 0.15*9.5 + 0.15*9', salida: '5.855', tipo: 'calculo', dia: -33 },
      { entrada: '(6 - 5.855) / 0.3', salida: '0.48333333333333', tipo: 'calculo', dia: -33 },
    ],
  },
}
