/**
 * Los mapas y diagramas que Pep@ dibujó durante su año (casa demo). Escritos a
 * mano —la estructura importa más que el volumen— y bilingües: `porIdioma`
 * elige el juego completo al materializar. Los días son offsets −364..0; el
 * builder los resuelve con `ctx.fecha()` y los materializa vía
 * `materializarMapa` (SIN marca `ejemplo`: la gamificación debe contarlos).
 */
import type { TipoMapa } from '../../core/data/db'
import type { MapaPropuesto } from './ia'
import type { NodoPropuesto } from './layouts'

export interface MapaDemo {
  dia: number
  nombre: string
  tipo: TipoMapa
  propuesta: MapaPropuesto
}

const n = (texto: string, ...hijos: NodoPropuesto[]): NodoPropuesto => ({ texto, hijos })

/** Encadena los pasos de un flujo: cada uno cuelga del anterior. */
function cadena(pasos: NodoPropuesto[]): NodoPropuesto[] {
  for (let i = pasos.length - 1; i > 0; i--) pasos[i - 1].hijos = [pasos[i]]
  return pasos[0] ? pasos[0].hijos : []
}

const paso = (texto: string, forma?: NodoPropuesto['forma']): NodoPropuesto => ({ texto, hijos: [], forma })

const ES: MapaDemo[] = [
  // M1 — el arranque: vaciar la cabeza sobre la vida que quiere.
  {
    dia: -358,
    nombre: 'Mi vida ideal',
    tipo: 'mental',
    propuesta: {
      raiz: 'Mi vida ideal',
      ramas: [
        n('Cuerpo', n('Correr sin ahogarme'), n('Dormir antes de las 12')),
        n('Cabeza', n('Terminar Física'), n('Leer más, scrollear menos')),
        n('Música', n('Aprender piano de una vez')),
        n('Mundo', n('Conocer Japón'), n('Salir de la ciudad seguido')),
        n('Dinero', n('Dejar de vivir al día'), n('Un colchón de 3 meses')),
      ],
    },
  },
  // M2 — la rutina de mañana que por fin lo ordenó.
  {
    dia: -330,
    nombre: 'Rutina de mañana',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Suena la alarma (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Suena la alarma (6:30)', 'inicio'),
        paso('Agua + estirar 5 min'),
        paso('¿Toca correr hoy?', 'decision'),
        paso('Correr o piano 20 min'),
        paso('Ducha y desayuno de verdad'),
        paso('Salir a la cafetería', 'fin'),
      ]),
    },
  },
  // M4 — decidir la cámara para la astrofoto con puntajes.
  {
    dia: -258,
    nombre: '¿Qué cámara para la luna?',
    tipo: 'matriz',
    propuesta: {
      raiz: '¿Qué cámara para la luna?',
      ramas: [],
      criterios: [
        { texto: 'Precio', peso: 5 },
        { texto: 'Zoom real', peso: 4 },
        { texto: 'Fácil de cargar', peso: 2 },
      ],
      opciones: [
        { texto: 'Réflex usada', puntajes: [4, 4, 2] },
        { texto: 'Mirrorless nueva', puntajes: [1, 5, 4] },
        { texto: 'Solo el teléfono', puntajes: [5, 1, 5] },
      ],
    },
  },
  // M5 — la semana de parciales, ordenada por urgencia.
  {
    dia: -228,
    nombre: 'Semana de parciales',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Semana de parciales',
      ramas: [],
      conjuntos: ['Hacer ya', 'Agendar', 'Delegar', 'Quitar'],
      elementos: [
        { texto: 'Repasar termodinámica', zona: 'hacer' },
        { texto: 'Entregar el lab atrasado', zona: 'hacer' },
        { texto: 'Sesión de piano corta', zona: 'agendar' },
        { texto: 'Correr suave 2 veces', zona: 'agendar' },
        { texto: 'Cambiar mi turno del viernes', zona: 'delegar' },
        { texto: 'Series hasta las 2 am', zona: 'quitar' },
      ],
    },
  },
  // M5 — apuntes de física en árbol.
  {
    dia: -214,
    nombre: 'Termodinámica',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Termodinámica',
      ramas: [
        n('Ley cero', n('Equilibrio térmico')),
        n('Primera ley', n('Energía interna'), n('Trabajo y calor')),
        n('Segunda ley', n('Entropía'), n('Máquinas térmicas')),
        n('Tercera ley', n('Cero absoluto')),
      ],
    },
  },
  // M6 — balance honesto a mitad de año.
  {
    dia: -186,
    nombre: 'Medio año',
    tipo: 'foda',
    propuesta: {
      raiz: 'Medio año',
      ramas: [],
      conjuntos: ['Fortalezas', 'Debilidades', 'Oportunidades', 'Amenazas'],
      elementos: [
        { texto: 'La constancia ya es hábito', zona: 'f' },
        { texto: 'El ahorro va al 50 %', zona: 'f' },
        { texto: 'Duermo tarde en exámenes', zona: 'd' },
        { texto: 'Me disperso con el teléfono', zona: 'd' },
        { texto: 'Beca de posgrado abre en otoño', zona: 'o' },
        { texto: 'Japón: idioma en la vida real', zona: 'o' },
        { texto: 'La rodilla se queja al subir ritmo', zona: 'a' },
        { texto: 'Renta podría subir', zona: 'a' },
      ],
    },
  },
  // M8 — lo que la física y la música comparten.
  {
    dia: -140,
    nombre: 'Física y música',
    tipo: 'venn',
    propuesta: {
      raiz: 'Física y música',
      ramas: [],
      conjuntos: ['Física', 'Música'],
      elementos: [
        { texto: 'Ecuaciones y modelos', zona: 'a' },
        { texto: 'Laboratorio', zona: 'a' },
        { texto: 'Repertorio y estilo', zona: 'b' },
        { texto: 'Tocar para alguien', zona: 'b' },
        { texto: 'Ondas y armónicos', zona: 'ab' },
        { texto: 'Práctica deliberada', zona: 'ab' },
        { texto: 'Paciencia', zona: 'ab' },
      ],
    },
  },
  // M11 — la decisión ABIERTA del cierre del año.
  {
    dia: -24,
    nombre: '¿Posgrado o trabajo?',
    tipo: 'proscontras',
    propuesta: {
      raiz: '¿Posgrado o trabajo?',
      ramas: [],
      conjuntos: ['Posgrado', 'Trabajo'],
      elementos: [
        { texto: 'Especializarme en lo que amo', zona: 'izq', peso: 5 },
        { texto: 'La beca cubriría lo básico', zona: 'izq', peso: 3 },
        { texto: 'Dos años más de vida austera', zona: 'izq', peso: 2 },
        { texto: 'Sueldo completo desde ya', zona: 'der', peso: 4 },
        { texto: 'Pagar el viaje a Corea', zona: 'der', peso: 2 },
        { texto: 'Riesgo de no volver a estudiar', zona: 'der', peso: 4 },
      ],
    },
  },
]

const EN: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'My ideal life',
    tipo: 'mental',
    propuesta: {
      raiz: 'My ideal life',
      ramas: [
        n('Body', n('Run without gasping'), n('Sleep before midnight')),
        n('Mind', n('Finish the Physics degree'), n('Read more, scroll less')),
        n('Music', n('Finally learn piano')),
        n('World', n('See Japan'), n('Leave the city more often')),
        n('Money', n('Stop living paycheck to paycheck'), n('A 3-month cushion')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Morning routine',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Alarm rings (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Alarm rings (6:30)', 'inicio'),
        paso('Water + 5 min stretch'),
        paso('Running day?', 'decision'),
        paso('Run or 20 min of piano'),
        paso('Shower and a real breakfast'),
        paso('Off to the coffee shop', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Which camera for the moon?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Which camera for the moon?',
      ramas: [],
      criterios: [
        { texto: 'Price', peso: 5 },
        { texto: 'Real zoom', peso: 4 },
        { texto: 'Easy to carry', peso: 2 },
      ],
      opciones: [
        { texto: 'Used DSLR', puntajes: [4, 4, 2] },
        { texto: 'New mirrorless', puntajes: [1, 5, 4] },
        { texto: 'Just my phone', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Midterms week',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Midterms week',
      ramas: [],
      conjuntos: ['Do now', 'Schedule', 'Delegate', 'Drop'],
      elementos: [
        { texto: 'Review thermodynamics', zona: 'hacer' },
        { texto: 'Turn in the late lab report', zona: 'hacer' },
        { texto: 'Short piano session', zona: 'agendar' },
        { texto: 'Two easy runs', zona: 'agendar' },
        { texto: 'Swap my Friday shift', zona: 'delegar' },
        { texto: 'Shows until 2 am', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Thermodynamics',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Thermodynamics',
      ramas: [
        n('Zeroth law', n('Thermal equilibrium')),
        n('First law', n('Internal energy'), n('Work and heat')),
        n('Second law', n('Entropy'), n('Heat engines')),
        n('Third law', n('Absolute zero')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Half-year check',
    tipo: 'foda',
    propuesta: {
      raiz: 'Half-year check',
      ramas: [],
      conjuntos: ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'],
      elementos: [
        { texto: 'Consistency is a habit now', zona: 'f' },
        { texto: 'Savings at 50%', zona: 'f' },
        { texto: 'Late nights during exams', zona: 'd' },
        { texto: 'Phone eats my focus', zona: 'd' },
        { texto: 'Grad scholarship opens in fall', zona: 'o' },
        { texto: 'Japan: the language for real', zona: 'o' },
        { texto: 'Knee complains at higher pace', zona: 'a' },
        { texto: 'Rent might go up', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Physics and music',
    tipo: 'venn',
    propuesta: {
      raiz: 'Physics and music',
      ramas: [],
      conjuntos: ['Physics', 'Music'],
      elementos: [
        { texto: 'Equations and models', zona: 'a' },
        { texto: 'Lab work', zona: 'a' },
        { texto: 'Repertoire and style', zona: 'b' },
        { texto: 'Playing for someone', zona: 'b' },
        { texto: 'Waves and harmonics', zona: 'ab' },
        { texto: 'Deliberate practice', zona: 'ab' },
        { texto: 'Patience', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Grad school or a job?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Grad school or a job?',
      ramas: [],
      conjuntos: ['Grad school', 'Job'],
      elementos: [
        { texto: 'Specialize in what I love', zona: 'izq', peso: 5 },
        { texto: 'The scholarship covers basics', zona: 'izq', peso: 3 },
        { texto: 'Two more lean years', zona: 'izq', peso: 2 },
        { texto: 'Full salary right away', zona: 'der', peso: 4 },
        { texto: 'Pay for the Korea trip', zona: 'der', peso: 2 },
        { texto: 'Risk of never going back', zona: 'der', peso: 4 },
      ],
    },
  },
]

export const MAPAS_PEP = { es: ES, en: EN }
