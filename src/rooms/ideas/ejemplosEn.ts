import type { TipoMapa } from '../../core/data/db'
import type { ContenidoEjemplo } from './ejemplos'
import type { NodoPropuesto } from './layouts'

/**
 * Los mismos ejemplos de `ejemplos.ts`, en inglés.
 *
 * Van en un catálogo aparte y no en `dict.ts` porque son CONTENIDO: en cuanto
 * el usuario toca «Ver un ejemplo» eso pasa a ser un mapa suyo que edita y
 * borra, no texto de interfaz. Se elige el catálogo entero según el idioma
 * activo (`ejemploDe`), así que ambos deben cubrir los mismos formatos — el
 * `Record<TipoMapa, …>` obliga.
 *
 * Los ayudantes están duplicados a propósito: importarlos de `ejemplos.ts`
 * crearía un ciclo de módulos (aquel ya importa este) y reventaría al arrancar.
 */

const n = (texto: string, ...hijos: NodoPropuesto[]): NodoPropuesto => ({ texto, hijos })

function cadena(pasos: NodoPropuesto[]): NodoPropuesto[] {
  for (let i = pasos.length - 1; i > 0; i--) pasos[i - 1].hijos = [pasos[i]]
  return pasos[0] ? pasos[0].hijos : []
}

const paso = (texto: string, forma?: NodoPropuesto['forma']): NodoPropuesto => ({ texto, hijos: [], forma })

export const EJEMPLOS_EN: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Trip to Japan',
    propuesta: {
      raiz: 'Trip to Japan',
      ramas: [
        n('Route', n('Tokyo'), n('Kyoto'), n('Osaka')),
        n('Budget', n('Flights'), n('Hotel'), n('Food per day')),
        n('What to pack', n('Adapter'), n('JR Pass'), n('Comfy shoes')),
        n('Before leaving', n('Check the passport'), n('Get some yen')),
      ],
    },
  },

  arbol: {
    titulo: 'Energy sources',
    propuesta: {
      raiz: 'Energy sources',
      ramas: [
        n('Renewable', n('Solar'), n('Wind'), n('Hydro')),
        n('Fossil', n('Coal'), n('Oil'), n('Natural gas')),
        n('Nuclear', n('Fission'), n('Fusion')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idea',
    propuesta: {
      raiz: 'Idea',
      ramas: [
        n('Origin', n('Gr. idéa: ‘form, pattern’'), n('From ideîn: ‘to see’'), n('Into English via Latin')),
        n('Meanings', n('Mental picture'), n('Plan or intention'), n('Concept or opinion')),
        n('Usage', n('“Have a bright idea”'), n('“No idea”'), n('“Toy with an idea”')),
        n('Word family', n('Ideal'), n('Ideate'), n('Ideology')),
      ],
    },
  },

  llaves: {
    titulo: 'Parts of a bicycle',
    propuesta: {
      raiz: 'Bicycle',
      ramas: [
        n('Frame', n('Top tube'), n('Fork'), n('Saddle')),
        n('Drivetrain', n('Pedals'), n('Chain'), n('Sprockets')),
        n('Wheels', n('Rim'), n('Spokes'), n('Inner tube')),
        n('Brakes', n('Levers'), n('Pads')),
      ],
    },
  },

  circulo: {
    titulo: 'Coffee',
    propuesta: {
      raiz: 'Coffee',
      ramas: [
        n('It has caffeine'),
        n('Grows in the tropics'),
        n('Arabica and robusta'),
        n('Light or dark roast'),
        n('Espresso'),
        n('Picked by hand'),
        n('Decaf'),
        n('Second most drunk drink'),
      ],
    },
  },

  flujo: {
    titulo: 'Booking a doctor visit',
    propuesta: {
      raiz: 'I need a check-up',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('I need a check-up', 'inicio'),
        paso("Open the insurer's app"),
        paso('Any slot this week?', 'decision'),
        paso('Pick a day and time'),
        paso('Confirm and save'),
        paso('Put it in the calendar', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'History of the internet',
    propuesta: {
      raiz: 'History of the internet',
      ramas: [
        n('1969 · ARPANET is born', n('Four universities')),
        n('1983 · TCP/IP is adopted'),
        n('1991 · First public website', n('Tim Berners-Lee')),
        n('2004 · Social networks arrive'),
        n('2007 · Mobile takes over'),
      ],
    },
  },

  ciclo: {
    titulo: 'The water cycle',
    propuesta: {
      raiz: 'The water cycle',
      ramas: [
        n('Evaporation', n('The sun heats the sea')),
        n('Condensation', n('Clouds form')),
        n('Precipitation', n('Rain or snow')),
        n('Runoff', n('Rivers back to the sea')),
      ],
    },
  },

  piramide: {
    titulo: "Maslow's pyramid",
    propuesta: {
      raiz: "Maslow's pyramid",
      ramas: [],
      conjuntos: ['Self-actualisation', 'Esteem', 'Love and safety', 'Basic needs'],
      elementos: [
        { texto: 'Create and find meaning', zona: 'p1' },
        { texto: 'Respect and achievement', zona: 'p2' },
        { texto: 'Friends and partner', zona: 'p3' },
        { texto: 'A home and a job', zona: 'p3' },
        { texto: 'Eating and sleeping', zona: 'p4' },
        { texto: 'Health', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Dogs and cats',
    propuesta: {
      raiz: 'Dogs and cats',
      ramas: [],
      conjuntos: ['Dogs', 'Cats'],
      elementos: [
        { texto: 'Go for walks', zona: 'a' },
        { texto: 'Follow commands', zona: 'a' },
        { texto: 'Groom themselves', zona: 'b' },
        { texto: 'Use a litter box', zona: 'b' },
        { texto: 'Mammals', zona: 'ab' },
        { texto: 'Need vaccines', zona: 'ab' },
        { texto: 'Live indoors', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Coffee or tea',
    propuesta: {
      raiz: 'Coffee or tea',
      ramas: [],
      conjuntos: ['Coffee', 'Tea'],
      elementos: [
        { texto: 'More caffeine', zona: 'izq' },
        { texto: 'Roasted flavour', zona: 'izq' },
        { texto: 'Both drunk hot', zona: 'centro' },
        { texto: 'Full of antioxidants', zona: 'centro' },
        { texto: 'Gentler', zona: 'der' },
        { texto: 'Endless varieties', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Working from home',
    propuesta: {
      raiz: 'Working from home',
      ramas: [],
      elementos: [
        { texto: 'No commute', zona: 'izq', peso: 5 },
        { texto: 'Flexible hours', zona: 'izq', peso: 4 },
        { texto: 'I eat at home', zona: 'izq', peso: 2 },
        { texto: 'Less time with the team', zona: 'der', peso: 4 },
        { texto: 'Hard to switch off', zona: 'der', peso: 3 },
        { texto: 'Higher power bill', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Running in the mornings',
    propuesta: {
      raiz: 'Running in the mornings',
      ramas: [],
      elementos: [
        { texto: 'I want to sleep better', zona: 'izq', peso: 4 },
        { texto: "There's a park nearby", zona: 'izq', peso: 3 },
        { texto: 'A friend joins me', zona: 'izq', peso: 4 },
        { texto: 'I go to bed late', zona: 'der', peso: 5 },
        { texto: "It's cold at dawn", zona: 'der', peso: 3 },
        { texto: 'My trainers are done', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Opening a coffee shop',
    propuesta: {
      raiz: 'Opening a coffee shop',
      ramas: [],
      elementos: [
        { texto: 'I know coffee well', zona: 'f' },
        { texto: 'My own bread recipe', zona: 'f' },
        { texto: 'Little capital', zona: 'd' },
        { texto: "I've never hired anyone", zona: 'd' },
        { texto: 'No cafés in the area', zona: 'o' },
        { texto: 'Offices two streets away', zona: 'o' },
        { texto: 'Rent keeps rising', zona: 'a' },
        { texto: 'A chain is opening nearby', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'My week',
    propuesta: {
      raiz: 'My week',
      ramas: [],
      elementos: [
        { texto: 'Send the report today', zona: 'hacer' },
        { texto: 'Call the dentist', zona: 'hacer' },
        { texto: 'Prepare the presentation', zona: 'agendar' },
        { texto: 'Exercise', zona: 'agendar' },
        { texto: 'Order the supplies', zona: 'delegar' },
        { texto: 'Reply to the supplier', zona: 'delegar' },
        { texto: 'Checking my phone all day', zona: 'quitar' },
        { texto: 'Meeting with no agenda', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Should I take the new job?',
    propuesta: {
      raiz: 'Should I take the new job?',
      ramas: [
        n('Accept', n('Higher salary'), n('Moving city'), n('Starting from scratch')),
        n('Stay', n('A team I already know'), n('Salary ceiling')),
        n('Negotiate staying', n('It could work out'), n('It could get awkward')),
      ],
    },
  },

  tier: {
    titulo: 'My breakfasts',
    propuesta: {
      raiz: 'My breakfasts',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Ranch-style eggs', zona: 's' },
        { texto: 'Fruit and yoghurt', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Toast', zona: 'b' },
        { texto: 'Boxed cereal', zona: 'c' },
        { texto: 'Just coffee', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Which laptop do I buy?',
    propuesta: {
      raiz: 'Which laptop do I buy?',
      ramas: [],
      criterios: [
        { texto: 'Price', peso: 5 },
        { texto: 'Battery', peso: 4 },
        { texto: 'Weight', peso: 3 },
        { texto: 'Screen', peso: 2 },
      ],
      opciones: [
        { texto: 'The cheap one', puntajes: [5, 3, 3, 2] },
        { texto: 'The light one', puntajes: [3, 4, 5, 3] },
        { texto: 'The powerful one', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: "The cake didn't rise",
    propuesta: {
      raiz: "The cake didn't rise",
      ramas: [
        n('Ingredients', n('Expired baking powder'), n('Cold eggs')),
        n('Method', n('Overmixed the batter'), n('Opened the oven too early')),
        n('Equipment', n('Oven out of calibration'), n('Tin too big')),
        n('Measuring', n('Used a cup, not scales')),
      ],
    },
  },
}
