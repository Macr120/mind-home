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
import type { PorIdioma } from '../../core/i18n/porIdioma'

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

const PT: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Minha vida ideal',
    tipo: 'mental',
    propuesta: {
      raiz: 'Minha vida ideal',
      ramas: [
        n('Corpo', n('Correr sem ficar ofegante'), n('Dormir antes da meia-noite')),
        n('Mente', n('Terminar a faculdade de Física'), n('Ler mais, rolar menos a tela')),
        n('Música', n('Aprender piano de uma vez por todas')),
        n('Mundo', n('Conhecer o Japão'), n('Sair da cidade com mais frequência')),
        n('Dinheiro', n('Parar de viver no limite'), n('Uma reserva de 3 meses')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Rotina da manhã',
    tipo: 'flujo',
    propuesta: {
      raiz: 'O despertador toca (6h30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('O despertador toca (6h30)', 'inicio'),
        paso('Água + 5 min de alongamento'),
        paso('Dia de correr?', 'decision'),
        paso('Correr ou 20 min de piano'),
        paso('Banho e um café da manhã de verdade'),
        paso('Sair para a cafeteria', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Qual câmera para a lua?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Qual câmera para a lua?',
      ramas: [],
      criterios: [
        { texto: 'Preço', peso: 5 },
        { texto: 'Zoom de verdade', peso: 4 },
        { texto: 'Fácil de carregar', peso: 2 },
      ],
      opciones: [
        { texto: 'DSLR usada', puntajes: [4, 4, 2] },
        { texto: 'Mirrorless nova', puntajes: [1, 5, 4] },
        { texto: 'Só o celular', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Semana de provas',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Semana de provas',
      ramas: [],
      conjuntos: ['Fazer agora', 'Agendar', 'Delegar', 'Descartar'],
      elementos: [
        { texto: 'Revisar termodinâmica', zona: 'hacer' },
        { texto: 'Entregar o relatório de laboratório atrasado', zona: 'hacer' },
        { texto: 'Sessão curta de piano', zona: 'agendar' },
        { texto: 'Duas corridas leves', zona: 'agendar' },
        { texto: 'Trocar meu turno de sexta', zona: 'delegar' },
        { texto: 'Séries até as 2 da manhã', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Termodinâmica',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Termodinâmica',
      ramas: [
        n('Lei zero', n('Equilíbrio térmico')),
        n('Primeira lei', n('Energia interna'), n('Trabalho e calor')),
        n('Segunda lei', n('Entropia'), n('Máquinas térmicas')),
        n('Terceira lei', n('Zero absoluto')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Balanço de meio de ano',
    tipo: 'foda',
    propuesta: {
      raiz: 'Balanço de meio de ano',
      ramas: [],
      conjuntos: ['Forças', 'Fraquezas', 'Oportunidades', 'Ameaças'],
      elementos: [
        { texto: 'A constância já virou hábito', zona: 'f' },
        { texto: 'A poupança está em 50%', zona: 'f' },
        { texto: 'Noites mal dormidas nas provas', zona: 'd' },
        { texto: 'O celular rouba meu foco', zona: 'd' },
        { texto: 'Bolsa de pós-graduação abre no outono', zona: 'o' },
        { texto: 'Japão: o idioma na vida real', zona: 'o' },
        { texto: 'O joelho reclama em ritmo mais forte', zona: 'a' },
        { texto: 'O aluguel pode subir', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Física e música',
    tipo: 'venn',
    propuesta: {
      raiz: 'Física e música',
      ramas: [],
      conjuntos: ['Física', 'Música'],
      elementos: [
        { texto: 'Equações e modelos', zona: 'a' },
        { texto: 'Trabalho de laboratório', zona: 'a' },
        { texto: 'Repertório e estilo', zona: 'b' },
        { texto: 'Tocar para alguém', zona: 'b' },
        { texto: 'Ondas e harmônicos', zona: 'ab' },
        { texto: 'Prática deliberada', zona: 'ab' },
        { texto: 'Paciência', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Pós-graduação ou emprego?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Pós-graduação ou emprego?',
      ramas: [],
      conjuntos: ['Pós-graduação', 'Emprego'],
      elementos: [
        { texto: 'Me especializar no que eu amo', zona: 'izq', peso: 5 },
        { texto: 'A bolsa cobriria o básico', zona: 'izq', peso: 3 },
        { texto: 'Mais dois anos de vida apertada', zona: 'izq', peso: 2 },
        { texto: 'Salário integral já', zona: 'der', peso: 4 },
        { texto: 'Pagar a viagem à Coreia', zona: 'der', peso: 2 },
        { texto: 'Risco de nunca mais voltar a estudar', zona: 'der', peso: 4 },
      ],
    },
  },
]

const FR: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Ma vie idéale',
    tipo: 'mental',
    propuesta: {
      raiz: 'Ma vie idéale',
      ramas: [
        n('Corps', n('Courir sans être essoufflé'), n('Dormir avant minuit')),
        n('Tête', n('Finir la licence de physique'), n('Lire plus, scroller moins')),
        n('Musique', n('Enfin apprendre le piano')),
        n('Monde', n('Découvrir le Japon'), n('Sortir plus souvent de la ville')),
        n('Argent', n('Arrêter de vivre au jour le jour'), n('Un matelas de 3 mois')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Routine du matin',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Le réveil sonne (6h30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Le réveil sonne (6h30)', 'inicio'),
        paso('Eau + 5 min d’étirements'),
        paso('Jour de course ?', 'decision'),
        paso('Course ou 20 min de piano'),
        paso('Douche et un vrai petit-déjeuner'),
        paso('Direction le café', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Quel appareil photo pour la lune ?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Quel appareil photo pour la lune ?',
      ramas: [],
      criterios: [
        { texto: 'Prix', peso: 5 },
        { texto: 'Vrai zoom', peso: 4 },
        { texto: 'Facile à transporter', peso: 2 },
      ],
      opciones: [
        { texto: 'Reflex d’occasion', puntajes: [4, 4, 2] },
        { texto: 'Hybride neuf', puntajes: [1, 5, 4] },
        { texto: 'Juste le téléphone', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Semaine de partiels',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Semaine de partiels',
      ramas: [],
      conjuntos: ['À faire maintenant', 'Planifier', 'Déléguer', 'Abandonner'],
      elementos: [
        { texto: 'Réviser la thermodynamique', zona: 'hacer' },
        { texto: 'Rendre le rapport de labo en retard', zona: 'hacer' },
        { texto: 'Petite séance de piano', zona: 'agendar' },
        { texto: 'Deux joggings tranquilles', zona: 'agendar' },
        { texto: 'Échanger mon service de vendredi', zona: 'delegar' },
        { texto: 'Séries jusqu’à 2h du matin', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Thermodynamique',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Thermodynamique',
      ramas: [
        n('Principe zéro', n('Équilibre thermique')),
        n('Premier principe', n('Énergie interne'), n('Travail et chaleur')),
        n('Deuxième principe', n('Entropie'), n('Machines thermiques')),
        n('Troisième principe', n('Zéro absolu')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Bilan à mi-année',
    tipo: 'foda',
    propuesta: {
      raiz: 'Bilan à mi-année',
      ramas: [],
      conjuntos: ['Forces', 'Faiblesses', 'Opportunités', 'Menaces'],
      elementos: [
        { texto: 'La régularité est devenue une habitude', zona: 'f' },
        { texto: 'L’épargne est à 50 %', zona: 'f' },
        { texto: 'Couche-tard pendant les examens', zona: 'd' },
        { texto: 'Le téléphone bouffe ma concentration', zona: 'd' },
        { texto: 'Bourse de master ouverte à l’automne', zona: 'o' },
        { texto: 'Japon : la langue en vrai', zona: 'o' },
        { texto: 'Le genou proteste à allure plus rapide', zona: 'a' },
        { texto: 'Le loyer pourrait augmenter', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Physique et musique',
    tipo: 'venn',
    propuesta: {
      raiz: 'Physique et musique',
      ramas: [],
      conjuntos: ['Physique', 'Musique'],
      elementos: [
        { texto: 'Équations et modèles', zona: 'a' },
        { texto: 'Travail de labo', zona: 'a' },
        { texto: 'Répertoire et style', zona: 'b' },
        { texto: 'Jouer pour quelqu’un', zona: 'b' },
        { texto: 'Ondes et harmoniques', zona: 'ab' },
        { texto: 'Pratique délibérée', zona: 'ab' },
        { texto: 'Patience', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Master ou travail ?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Master ou travail ?',
      ramas: [],
      conjuntos: ['Master', 'Travail'],
      elementos: [
        { texto: 'Me spécialiser dans ce que j’aime', zona: 'izq', peso: 5 },
        { texto: 'La bourse couvrirait l’essentiel', zona: 'izq', peso: 3 },
        { texto: 'Deux années de plus à vivre serré', zona: 'izq', peso: 2 },
        { texto: 'Salaire complet tout de suite', zona: 'der', peso: 4 },
        { texto: 'Payer le voyage en Corée', zona: 'der', peso: 2 },
        { texto: 'Le risque de ne jamais reprendre les études', zona: 'der', peso: 4 },
      ],
    },
  },
]

const DE: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Mein ideales Leben',
    tipo: 'mental',
    propuesta: {
      raiz: 'Mein ideales Leben',
      ramas: [
        n('Körper', n('Laufen, ohne außer Atem zu sein'), n('Vor Mitternacht schlafen')),
        n('Kopf', n('Das Physikstudium beenden'), n('Mehr lesen, weniger scrollen')),
        n('Musik', n('Endlich Klavier lernen')),
        n('Welt', n('Japan kennenlernen'), n('Öfter aus der Stadt raus')),
        n('Geld', n('Nicht mehr von der Hand in den Mund leben'), n('Ein Polster für 3 Monate')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Morgenroutine',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Der Wecker klingelt (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Der Wecker klingelt (6:30)', 'inicio'),
        paso('Wasser + 5 Min. dehnen'),
        paso('Ist heute Lauftag?', 'decision'),
        paso('Laufen oder 20 Min. Klavier'),
        paso('Duschen und ein richtiges Frühstück'),
        paso('Ab ins Café', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Welche Kamera für den Mond?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Welche Kamera für den Mond?',
      ramas: [],
      criterios: [
        { texto: 'Preis', peso: 5 },
        { texto: 'Echter Zoom', peso: 4 },
        { texto: 'Leicht zu tragen', peso: 2 },
      ],
      opciones: [
        { texto: 'Gebrauchte Spiegelreflex', puntajes: [4, 4, 2] },
        { texto: 'Neue spiegellose Kamera', puntajes: [1, 5, 4] },
        { texto: 'Nur das Handy', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Klausurenwoche',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Klausurenwoche',
      ramas: [],
      conjuntos: ['Jetzt erledigen', 'Einplanen', 'Delegieren', 'Streichen'],
      elementos: [
        { texto: 'Thermodynamik wiederholen', zona: 'hacer' },
        { texto: 'Den verspäteten Laborbericht abgeben', zona: 'hacer' },
        { texto: 'Kurze Klaviersitzung', zona: 'agendar' },
        { texto: 'Zwei lockere Laufrunden', zona: 'agendar' },
        { texto: 'Meine Freitagsschicht tauschen', zona: 'delegar' },
        { texto: 'Serien bis 2 Uhr nachts', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Thermodynamik',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Thermodynamik',
      ramas: [
        n('Nullter Hauptsatz', n('Thermisches Gleichgewicht')),
        n('Erster Hauptsatz', n('Innere Energie'), n('Arbeit und Wärme')),
        n('Zweiter Hauptsatz', n('Entropie'), n('Wärmekraftmaschinen')),
        n('Dritter Hauptsatz', n('Absoluter Nullpunkt')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Halbjahresbilanz',
    tipo: 'foda',
    propuesta: {
      raiz: 'Halbjahresbilanz',
      ramas: [],
      conjuntos: ['Stärken', 'Schwächen', 'Chancen', 'Risiken'],
      elementos: [
        { texto: 'Beständigkeit ist jetzt eine Gewohnheit', zona: 'f' },
        { texto: 'Die Ersparnisse liegen bei 50 %', zona: 'f' },
        { texto: 'Späte Nächte in der Prüfungszeit', zona: 'd' },
        { texto: 'Das Handy frisst meine Konzentration', zona: 'd' },
        { texto: 'Promotionsstipendium öffnet im Herbst', zona: 'o' },
        { texto: 'Japan: die Sprache im echten Leben', zona: 'o' },
        { texto: 'Das Knie meldet sich bei höherem Tempo', zona: 'a' },
        { texto: 'Die Miete könnte steigen', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Physik und Musik',
    tipo: 'venn',
    propuesta: {
      raiz: 'Physik und Musik',
      ramas: [],
      conjuntos: ['Physik', 'Musik'],
      elementos: [
        { texto: 'Gleichungen und Modelle', zona: 'a' },
        { texto: 'Laborarbeit', zona: 'a' },
        { texto: 'Repertoire und Stil', zona: 'b' },
        { texto: 'Für jemanden spielen', zona: 'b' },
        { texto: 'Wellen und Obertöne', zona: 'ab' },
        { texto: 'Bewusstes Üben', zona: 'ab' },
        { texto: 'Geduld', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Master oder Job?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Master oder Job?',
      ramas: [],
      conjuntos: ['Master', 'Job'],
      elementos: [
        { texto: 'Mich in dem spezialisieren, was ich liebe', zona: 'izq', peso: 5 },
        { texto: 'Das Stipendium würde das Nötigste decken', zona: 'izq', peso: 3 },
        { texto: 'Zwei weitere Jahre auf Sparflamme', zona: 'izq', peso: 2 },
        { texto: 'Volles Gehalt sofort', zona: 'der', peso: 4 },
        { texto: 'Die Reise nach Korea bezahlen', zona: 'der', peso: 2 },
        { texto: 'Risiko, nie wieder zu studieren', zona: 'der', peso: 4 },
      ],
    },
  },
]

const IT: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'La mia vita ideale',
    tipo: 'mental',
    propuesta: {
      raiz: 'La mia vita ideale',
      ramas: [
        n('Corpo', n('Correre senza restare senza fiato'), n('Dormire prima di mezzanotte')),
        n('Testa', n('Finire la laurea in Fisica'), n('Leggere di più, scrollare di meno')),
        n('Musica', n('Imparare finalmente il piano')),
        n('Mondo', n('Scoprire il Giappone'), n('Uscire più spesso dalla città')),
        n('Soldi', n('Smettere di vivere alla giornata'), n('Un cuscinetto di 3 mesi')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Routine del mattino',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Suona la sveglia (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Suona la sveglia (6:30)', 'inicio'),
        paso('Acqua + 5 min di stretching'),
        paso('Oggi si corre?', 'decision'),
        paso('Corsa o 20 min di piano'),
        paso('Doccia e una vera colazione'),
        paso('Via verso il bar', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Quale fotocamera per la luna?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Quale fotocamera per la luna?',
      ramas: [],
      criterios: [
        { texto: 'Prezzo', peso: 5 },
        { texto: 'Zoom vero', peso: 4 },
        { texto: 'Facile da portare', peso: 2 },
      ],
      opciones: [
        { texto: 'Reflex usata', puntajes: [4, 4, 2] },
        { texto: 'Mirrorless nuova', puntajes: [1, 5, 4] },
        { texto: 'Solo il telefono', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Settimana di esami',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Settimana di esami',
      ramas: [],
      conjuntos: ['Da fare subito', 'Da programmare', 'Da delegare', 'Da eliminare'],
      elementos: [
        { texto: 'Ripassare termodinamica', zona: 'hacer' },
        { texto: 'Consegnare la relazione di laboratorio in ritardo', zona: 'hacer' },
        { texto: 'Breve sessione di piano', zona: 'agendar' },
        { texto: 'Due corse leggere', zona: 'agendar' },
        { texto: 'Cambiare il mio turno di venerdì', zona: 'delegar' },
        { texto: 'Serie TV fino alle 2 di notte', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Termodinamica',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Termodinamica',
      ramas: [
        n('Principio zero', n('Equilibrio termico')),
        n('Primo principio', n('Energia interna'), n('Lavoro e calore')),
        n('Secondo principio', n('Entropia'), n('Macchine termiche')),
        n('Terzo principio', n('Zero assoluto')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Bilancio di metà anno',
    tipo: 'foda',
    propuesta: {
      raiz: 'Bilancio di metà anno',
      ramas: [],
      conjuntos: ['Punti di forza', 'Punti deboli', 'Opportunità', 'Minacce'],
      elementos: [
        { texto: 'La costanza è ormai un’abitudine', zona: 'f' },
        { texto: 'I risparmi sono al 50%', zona: 'f' },
        { texto: 'Notti in bianco durante gli esami', zona: 'd' },
        { texto: 'Il telefono mi ruba la concentrazione', zona: 'd' },
        { texto: 'La borsa di dottorato apre in autunno', zona: 'o' },
        { texto: 'Giappone: la lingua nella vita reale', zona: 'o' },
        { texto: 'Il ginocchio protesta a ritmo più alto', zona: 'a' },
        { texto: 'L’affitto potrebbe aumentare', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Fisica e musica',
    tipo: 'venn',
    propuesta: {
      raiz: 'Fisica e musica',
      ramas: [],
      conjuntos: ['Fisica', 'Musica'],
      elementos: [
        { texto: 'Equazioni e modelli', zona: 'a' },
        { texto: 'Lavoro in laboratorio', zona: 'a' },
        { texto: 'Repertorio e stile', zona: 'b' },
        { texto: 'Suonare per qualcuno', zona: 'b' },
        { texto: 'Onde e armoniche', zona: 'ab' },
        { texto: 'Pratica deliberata', zona: 'ab' },
        { texto: 'Pazienza', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Dottorato o lavoro?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Dottorato o lavoro?',
      ramas: [],
      conjuntos: ['Dottorato', 'Lavoro'],
      elementos: [
        { texto: 'Specializzarmi in ciò che amo', zona: 'izq', peso: 5 },
        { texto: 'La borsa coprirebbe il necessario', zona: 'izq', peso: 3 },
        { texto: 'Altri due anni di vita frugale', zona: 'izq', peso: 2 },
        { texto: 'Stipendio pieno da subito', zona: 'der', peso: 4 },
        { texto: 'Pagare il viaggio in Corea', zona: 'der', peso: 2 },
        { texto: 'Il rischio di non tornare più a studiare', zona: 'der', peso: 4 },
      ],
    },
  },
]

// ja: título de M1 ya citado en dict.ja.tut.ts (tut.app-ideas--mapas.2.titulo); destino
// del viaje cambiado a México (glosario.mjs DECISIONES.viaje.ja).
const JA: MapaDemo[] = [
  {
    dia: -358,
    nombre: '理想の暮らし',
    tipo: 'mental',
    propuesta: {
      raiz: '理想の暮らし',
      ramas: [
        n('体', n('息切れせずに走る'), n('日付が変わる前に眠る')),
        n('頭', n('物理の学位を終える'), n('スクロールを減らして、もっと読む')),
        n('音楽', n('とうとうピアノを習う')),
        n('世界', n('メキシコを知る'), n('もっと頻繁に街を出る')),
        n('お金', n('その日暮らしをやめる'), n('3か月分の備え')),
      ],
    },
  },
  {
    dia: -330,
    nombre: '朝のルーティン',
    tipo: 'flujo',
    propuesta: {
      raiz: 'アラームが鳴る（6:30）',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('アラームが鳴る（6:30）', 'inicio'),
        paso('水を飲んで5分ストレッチ'),
        paso('今日は走る日？', 'decision'),
        paso('ランニングか20分のピアノ'),
        paso('シャワーを浴びてちゃんとした朝食'),
        paso('カフェへ出発', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: '月を撮るならどのカメラ？',
    tipo: 'matriz',
    propuesta: {
      raiz: '月を撮るならどのカメラ？',
      ramas: [],
      criterios: [
        { texto: '価格', peso: 5 },
        { texto: '実際のズーム', peso: 4 },
        { texto: '持ち運びやすさ', peso: 2 },
      ],
      opciones: [
        { texto: '中古の一眼レフ', puntajes: [4, 4, 2] },
        { texto: '新品のミラーレス', puntajes: [1, 5, 4] },
        { texto: 'スマホだけ', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: '中間試験の週',
    tipo: 'eisenhower',
    propuesta: {
      raiz: '中間試験の週',
      ramas: [],
      conjuntos: ['今すぐやる', '予定に入れる', '任せる', 'やめる'],
      elementos: [
        { texto: '熱力学を復習する', zona: 'hacer' },
        { texto: '遅れているレポートを提出する', zona: 'hacer' },
        { texto: '短いピアノの練習', zona: 'agendar' },
        { texto: '軽いランニングを2回', zona: 'agendar' },
        { texto: '金曜日のシフトを交代する', zona: 'delegar' },
        { texto: '夜中の2時まで海外ドラマ', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: '熱力学',
    tipo: 'arbol',
    propuesta: {
      raiz: '熱力学',
      ramas: [
        n('熱力学第零法則', n('熱平衡')),
        n('熱力学第一法則', n('内部エネルギー'), n('仕事と熱')),
        n('熱力学第二法則', n('エントロピー'), n('熱機関')),
        n('熱力学第三法則', n('絶対零度')),
      ],
    },
  },
  {
    dia: -186,
    nombre: '半年の振り返り',
    tipo: 'foda',
    propuesta: {
      raiz: '半年の振り返り',
      ramas: [],
      conjuntos: ['強み', '弱み', '機会', '脅威'],
      elementos: [
        { texto: '継続がもう習慣になった', zona: 'f' },
        { texto: '貯金が50%に達した', zona: 'f' },
        { texto: '試験期間は夜更かししてしまう', zona: 'd' },
        { texto: 'スマホに気を取られる', zona: 'd' },
        { texto: '秋に大学院の奨学金が始まる', zona: 'o' },
        { texto: 'メキシコ：生きたスペイン語', zona: 'o' },
        { texto: 'ペースを上げると膝が痛む', zona: 'a' },
        { texto: '家賃が上がるかもしれない', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: '物理と音楽',
    tipo: 'venn',
    propuesta: {
      raiz: '物理と音楽',
      ramas: [],
      conjuntos: ['物理', '音楽'],
      elementos: [
        { texto: '方程式とモデル', zona: 'a' },
        { texto: '実験', zona: 'a' },
        { texto: 'レパートリーとスタイル', zona: 'b' },
        { texto: '誰かのために弾くこと', zona: 'b' },
        { texto: '波と倍音', zona: 'ab' },
        { texto: '意識的な練習', zona: 'ab' },
        { texto: '忍耐', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: '大学院か就職か？',
    tipo: 'proscontras',
    propuesta: {
      raiz: '大学院か就職か？',
      ramas: [],
      conjuntos: ['大学院', '就職'],
      elementos: [
        { texto: '好きな分野を極める', zona: 'izq', peso: 5 },
        { texto: '奨学金で基本的な生活費は賄える', zona: 'izq', peso: 3 },
        { texto: 'あと2年、質素な生活が続く', zona: 'izq', peso: 2 },
        { texto: 'すぐにフルの給料', zona: 'der', peso: 4 },
        { texto: '韓国旅行の費用を払える', zona: 'der', peso: 2 },
        { texto: 'もう勉強に戻れなくなるリスク', zona: 'der', peso: 4 },
      ],
    },
  },
]

// zh: título de M1 ya citado en dict.zh.tut.ts (tut.app-ideas--mapas.2.titulo).
const ZH: MapaDemo[] = [
  {
    dia: -358,
    nombre: '我理想的生活',
    tipo: 'mental',
    propuesta: {
      raiz: '我理想的生活',
      ramas: [
        n('身体', n('跑步不喘'), n('午夜前入睡')),
        n('头脑', n('读完物理专业'), n('多读书，少刷手机')),
        n('音乐', n('终于学会钢琴')),
        n('世界', n('去日本看看'), n('更常离开这座城市')),
        n('钱', n('不再过一天算一天'), n('存够三个月的缓冲金')),
      ],
    },
  },
  {
    dia: -330,
    nombre: '早晨的日常安排',
    tipo: 'flujo',
    propuesta: {
      raiz: '闹钟响了（6:30）',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('闹钟响了（6:30）', 'inicio'),
        paso('喝水，拉伸5分钟'),
        paso('今天要跑步吗？', 'decision'),
        paso('跑步或弹20分钟钢琴'),
        paso('洗澡，吃一顿正经的早餐'),
        paso('出门去咖啡馆', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: '拍月亮该用哪台相机？',
    tipo: 'matriz',
    propuesta: {
      raiz: '拍月亮该用哪台相机？',
      ramas: [],
      criterios: [
        { texto: '价格', peso: 5 },
        { texto: '真实变焦', peso: 4 },
        { texto: '便于携带', peso: 2 },
      ],
      opciones: [
        { texto: '二手单反', puntajes: [4, 4, 2] },
        { texto: '全新微单', puntajes: [1, 5, 4] },
        { texto: '只用手机', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: '期中考试周',
    tipo: 'eisenhower',
    propuesta: {
      raiz: '期中考试周',
      ramas: [],
      conjuntos: ['现在就做', '排进日程', '委托别人', '放弃'],
      elementos: [
        { texto: '复习热力学', zona: 'hacer' },
        { texto: '交迟交的实验报告', zona: 'hacer' },
        { texto: '一次简短的钢琴练习', zona: 'agendar' },
        { texto: '两次轻松的跑步', zona: 'agendar' },
        { texto: '和别人换周五的班', zona: 'delegar' },
        { texto: '追剧追到凌晨两点', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: '热力学',
    tipo: 'arbol',
    propuesta: {
      raiz: '热力学',
      ramas: [
        n('第零定律', n('热平衡')),
        n('第一定律', n('内能'), n('功和热')),
        n('第二定律', n('熵'), n('热机')),
        n('第三定律', n('绝对零度')),
      ],
    },
  },
  {
    dia: -186,
    nombre: '半年小结',
    tipo: 'foda',
    propuesta: {
      raiz: '半年小结',
      ramas: [],
      conjuntos: ['优势', '劣势', '机会', '威胁'],
      elementos: [
        { texto: '坚持已经变成习惯', zona: 'f' },
        { texto: '存款到了50%', zona: 'f' },
        { texto: '考试期间总熬夜', zona: 'd' },
        { texto: '手机偷走我的注意力', zona: 'd' },
        { texto: '研究生奖学金秋天开放申请', zona: 'o' },
        { texto: '日本：语言的真实运用', zona: 'o' },
        { texto: '配速一快膝盖就抗议', zona: 'a' },
        { texto: '房租可能会涨', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: '物理与音乐',
    tipo: 'venn',
    propuesta: {
      raiz: '物理与音乐',
      ramas: [],
      conjuntos: ['物理', '音乐'],
      elementos: [
        { texto: '方程与模型', zona: 'a' },
        { texto: '实验室工作', zona: 'a' },
        { texto: '曲目与风格', zona: 'b' },
        { texto: '为别人演奏', zona: 'b' },
        { texto: '波与谐波', zona: 'ab' },
        { texto: '刻意练习', zona: 'ab' },
        { texto: '耐心', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: '读研还是工作？',
    tipo: 'proscontras',
    propuesta: {
      raiz: '读研还是工作？',
      ramas: [],
      conjuntos: ['读研', '工作'],
      elementos: [
        { texto: '专攻自己热爱的领域', zona: 'izq', peso: 5 },
        { texto: '奖学金能覆盖基本开销', zona: 'izq', peso: 3 },
        { texto: '再过两年紧巴巴的日子', zona: 'izq', peso: 2 },
        { texto: '马上拿到全额工资', zona: 'der', peso: 4 },
        { texto: '能付得起韩国之行的钱', zona: 'der', peso: 2 },
        { texto: '可能再也不会回去读书的风险', zona: 'der', peso: 4 },
      ],
    },
  },
]

// ko: título de M1 ya citado en dict.ko.tut.ts (tut.app-ideas--mapas.2.titulo); el próximo
// viaje ya es Vietnam en esta rama (coherente con rooms/sala/demo.data.i18n.ts).
const KO: MapaDemo[] = [
  {
    dia: -358,
    nombre: '내가 바라는 삶',
    tipo: 'mental',
    propuesta: {
      raiz: '내가 바라는 삶',
      ramas: [
        n('몸', n('숨차지 않게 달리기'), n('자정 전에 잠들기')),
        n('머리', n('물리학 전공 끝내기'), n('더 읽고, 스크롤은 덜 하기')),
        n('음악', n('드디어 피아노 배우기')),
        n('세상', n('일본 가보기'), n('도시 밖으로 더 자주 나가기')),
        n('돈', n('그날 벌어 그날 사는 삶 그만두기'), n('3개월치 여유 자금')),
      ],
    },
  },
  {
    dia: -330,
    nombre: '아침 루틴',
    tipo: 'flujo',
    propuesta: {
      raiz: '알람이 울려요 (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('알람이 울려요 (6:30)', 'inicio'),
        paso('물 마시고 5분 스트레칭'),
        paso('오늘은 달리는 날?', 'decision'),
        paso('달리기 또는 20분 피아노'),
        paso('샤워하고 제대로 된 아침 식사'),
        paso('카페로 출발', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: '달 찍을 카메라, 뭐가 좋을까?',
    tipo: 'matriz',
    propuesta: {
      raiz: '달 찍을 카메라, 뭐가 좋을까?',
      ramas: [],
      criterios: [
        { texto: '가격', peso: 5 },
        { texto: '진짜 줌', peso: 4 },
        { texto: '들고 다니기 편함', peso: 2 },
      ],
      opciones: [
        { texto: '중고 DSLR', puntajes: [4, 4, 2] },
        { texto: '새 미러리스', puntajes: [1, 5, 4] },
        { texto: '그냥 폰', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: '중간고사 주간',
    tipo: 'eisenhower',
    propuesta: {
      raiz: '중간고사 주간',
      ramas: [],
      conjuntos: ['지금 하기', '일정에 넣기', '맡기기', '치우기'],
      elementos: [
        { texto: '열역학 복습하기', zona: 'hacer' },
        { texto: '밀린 실험 보고서 제출하기', zona: 'hacer' },
        { texto: '짧은 피아노 연습', zona: 'agendar' },
        { texto: '가벼운 달리기 두 번', zona: 'agendar' },
        { texto: '금요일 근무 바꾸기', zona: 'delegar' },
        { texto: '새벽 2시까지 드라마 보기', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: '열역학',
    tipo: 'arbol',
    propuesta: {
      raiz: '열역학',
      ramas: [
        n('열역학 제0법칙', n('열평형')),
        n('열역학 제1법칙', n('내부 에너지'), n('일과 열')),
        n('열역학 제2법칙', n('엔트로피'), n('열기관')),
        n('열역학 제3법칙', n('절대 영도')),
      ],
    },
  },
  {
    dia: -186,
    nombre: '반년 점검',
    tipo: 'foda',
    propuesta: {
      raiz: '반년 점검',
      ramas: [],
      conjuntos: ['강점', '약점', '기회', '위협'],
      elementos: [
        { texto: '꾸준함이 이제 습관이 됐어요', zona: 'f' },
        { texto: '저축이 50%에 도달했어요', zona: 'f' },
        { texto: '시험 기간엔 밤을 새워요', zona: 'd' },
        { texto: '휴대폰이 집중력을 빼앗아요', zona: 'd' },
        { texto: '가을에 대학원 장학금이 열려요', zona: 'o' },
        { texto: '일본: 실제로 써보는 언어', zona: 'o' },
        { texto: '페이스를 올리면 무릎이 아파요', zona: 'a' },
        { texto: '월세가 오를 수도 있어요', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: '물리학과 음악',
    tipo: 'venn',
    propuesta: {
      raiz: '물리학과 음악',
      ramas: [],
      conjuntos: ['물리학', '음악'],
      elementos: [
        { texto: '방정식과 모델', zona: 'a' },
        { texto: '실험실 작업', zona: 'a' },
        { texto: '레퍼토리와 스타일', zona: 'b' },
        { texto: '누군가를 위해 연주하기', zona: 'b' },
        { texto: '파동과 배음', zona: 'ab' },
        { texto: '의도적인 연습', zona: 'ab' },
        { texto: '인내심', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: '대학원 아니면 취업?',
    tipo: 'proscontras',
    propuesta: {
      raiz: '대학원 아니면 취업?',
      ramas: [],
      conjuntos: ['대학원', '취업'],
      elementos: [
        { texto: '좋아하는 분야를 전문적으로 파기', zona: 'izq', peso: 5 },
        { texto: '장학금이 기본 생활비는 채워줄 거예요', zona: 'izq', peso: 3 },
        { texto: '앞으로 2년 더 빠듯하게 살기', zona: 'izq', peso: 2 },
        { texto: '바로 받는 온전한 월급', zona: 'der', peso: 4 },
        { texto: '베트남 여행 비용 낼 수 있음', zona: 'der', peso: 2 },
        { texto: '다시는 공부로 못 돌아갈 위험', zona: 'der', peso: 4 },
      ],
    },
  },
]

// ru: título de M1 ya citado en dict.ru.tut.ts (tut.app-ideas--mapas.2.titulo).
const RU: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Идеальная жизнь',
    tipo: 'mental',
    propuesta: {
      raiz: 'Идеальная жизнь',
      ramas: [
        n('Тело', n('Бегать не задыхаясь'), n('Засыпать до полуночи')),
        n('Голова', n('Закончить физфак'), n('Больше читать, меньше листать ленту')),
        n('Музыка', n('Наконец научиться играть на пианино')),
        n('Мир', n('Побывать в Японии'), n('Чаще выбираться из города')),
        n('Деньги', n('Перестать жить от зарплаты до зарплаты'), n('Подушка на 3 месяца')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Утренний ритуал',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Звонит будильник (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Звонит будильник (6:30)', 'inicio'),
        paso('Вода + 5 минут растяжки'),
        paso('Сегодня бегаю?', 'decision'),
        paso('Бег или 20 минут пианино'),
        paso('Душ и настоящий завтрак'),
        paso('Выхожу в кофейню', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Какую камеру взять для луны?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Какую камеру взять для луны?',
      ramas: [],
      criterios: [
        { texto: 'Цена', peso: 5 },
        { texto: 'Настоящий зум', peso: 4 },
        { texto: 'Удобно носить', peso: 2 },
      ],
      opciones: [
        { texto: 'Б/у зеркалка', puntajes: [4, 4, 2] },
        { texto: 'Новая беззеркалка', puntajes: [1, 5, 4] },
        { texto: 'Только телефон', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Неделя коллоквиумов',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Неделя коллоквиумов',
      ramas: [],
      conjuntos: ['Сделать сейчас', 'Запланировать', 'Делегировать', 'Отбросить'],
      elementos: [
        { texto: 'Повторить термодинамику', zona: 'hacer' },
        { texto: 'Сдать просроченный отчёт по лабораторной', zona: 'hacer' },
        { texto: 'Короткая тренировка на пианино', zona: 'agendar' },
        { texto: 'Две лёгкие пробежки', zona: 'agendar' },
        { texto: 'Поменяться пятничной сменой', zona: 'delegar' },
        { texto: 'Сериалы до двух ночи', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Термодинамика',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Термодинамика',
      ramas: [
        n('Нулевое начало', n('Тепловое равновесие')),
        n('Первое начало', n('Внутренняя энергия'), n('Работа и теплота')),
        n('Второе начало', n('Энтропия'), n('Тепловые машины')),
        n('Третье начало', n('Абсолютный ноль')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Итоги полугодия',
    tipo: 'foda',
    propuesta: {
      raiz: 'Итоги полугодия',
      ramas: [],
      conjuntos: ['Сильные стороны', 'Слабые стороны', 'Возможности', 'Угрозы'],
      elementos: [
        { texto: 'Постоянство уже стало привычкой', zona: 'f' },
        { texto: 'Накопления дошли до 50%', zona: 'f' },
        { texto: 'Поздние ночи во время экзаменов', zona: 'd' },
        { texto: 'Телефон съедает всё внимание', zona: 'd' },
        { texto: 'Осенью открывается стипендия для аспирантуры', zona: 'o' },
        { texto: 'Япония: язык в реальной жизни', zona: 'o' },
        { texto: 'Колено жалуется на более быстром темпе', zona: 'a' },
        { texto: 'Аренда может подорожать', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Физика и музыка',
    tipo: 'venn',
    propuesta: {
      raiz: 'Физика и музыка',
      ramas: [],
      conjuntos: ['Физика', 'Музыка'],
      elementos: [
        { texto: 'Уравнения и модели', zona: 'a' },
        { texto: 'Работа в лаборатории', zona: 'a' },
        { texto: 'Репертуар и стиль', zona: 'b' },
        { texto: 'Играть для кого-то', zona: 'b' },
        { texto: 'Волны и обертоны', zona: 'ab' },
        { texto: 'Осознанная практика', zona: 'ab' },
        { texto: 'Терпение', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Аспирантура или работа?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Аспирантура или работа?',
      ramas: [],
      conjuntos: ['Аспирантура', 'Работа'],
      elementos: [
        { texto: 'Специализироваться в том, что люблю', zona: 'izq', peso: 5 },
        { texto: 'Стипендия покрыла бы самое необходимое', zona: 'izq', peso: 3 },
        { texto: 'Ещё два года скромной жизни', zona: 'izq', peso: 2 },
        { texto: 'Полная зарплата уже сейчас', zona: 'der', peso: 4 },
        { texto: 'Оплатить поездку в Корею', zona: 'der', peso: 2 },
        { texto: 'Риск больше никогда не вернуться к учёбе', zona: 'der', peso: 4 },
      ],
    },
  },
]

// hi: título de M1 ya citado en dict.hi.tut.ts (tut.app-ideas--mapas.2.titulo).
const HI: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'मेरी आदर्श ज़िंदगी',
    tipo: 'mental',
    propuesta: {
      raiz: 'मेरी आदर्श ज़िंदगी',
      ramas: [
        n('शरीर', n('बिना हांफे दौड़ना'), n('आधी रात से पहले सो जाना')),
        n('दिमाग़', n('फ़िज़िक्स की डिग्री पूरी करना'), n('ज़्यादा पढ़ना, कम स्क्रॉल करना')),
        n('संगीत', n('आख़िरकार पियानो सीखना')),
        n('दुनिया', n('जापान देखना'), n('शहर से ज़्यादा बार बाहर निकलना')),
        n('पैसा', n('दिन भर की कमाई पर जीना छोड़ना'), n('3 महीने का कुशन')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'सुबह की दिनचर्या',
    tipo: 'flujo',
    propuesta: {
      raiz: 'अलार्म बजता है (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('अलार्म बजता है (6:30)', 'inicio'),
        paso('पानी + 5 मिनट स्ट्रेचिंग'),
        paso('आज दौड़ने का दिन है?', 'decision'),
        paso('दौड़ या 20 मिनट पियानो'),
        paso('नहाना और असली नाश्ता'),
        paso('कैफ़े की ओर निकलना', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'चाँद के लिए कौन-सा कैमरा?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'चाँद के लिए कौन-सा कैमरा?',
      ramas: [],
      criterios: [
        { texto: 'क़ीमत', peso: 5 },
        { texto: 'असली ज़ूम', peso: 4 },
        { texto: 'ले जाने में आसान', peso: 2 },
      ],
      opciones: [
        { texto: 'पुराना DSLR', puntajes: [4, 4, 2] },
        { texto: 'नया मिररलेस', puntajes: [1, 5, 4] },
        { texto: 'बस फ़ोन', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'मिडटर्म का हफ़्ता',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'मिडटर्म का हफ़्ता',
      ramas: [],
      conjuntos: ['अभी करना', 'शेड्यूल करना', 'सौंपना', 'छोड़ना'],
      elementos: [
        { texto: 'थर्मोडायनामिक्स दोहराना', zona: 'hacer' },
        { texto: 'देर से जमा होने वाली लैब रिपोर्ट देना', zona: 'hacer' },
        { texto: 'छोटा पियानो अभ्यास', zona: 'agendar' },
        { texto: 'दो हल्की दौड़ें', zona: 'agendar' },
        { texto: 'शुक्रवार की शिफ़्ट बदलना', zona: 'delegar' },
        { texto: 'रात दो बजे तक शो देखना', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'थर्मोडायनामिक्स',
    tipo: 'arbol',
    propuesta: {
      raiz: 'थर्मोडायनामिक्स',
      ramas: [
        n('शून्यवाँ नियम', n('ऊष्मीय संतुलन')),
        n('पहला नियम', n('आंतरिक ऊर्जा'), n('कार्य और ऊष्मा')),
        n('दूसरा नियम', n('एन्ट्रॉपी'), n('ऊष्मा इंजन')),
        n('तीसरा नियम', n('परम शून्य')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'आधे साल का हिसाब',
    tipo: 'foda',
    propuesta: {
      raiz: 'आधे साल का हिसाब',
      ramas: [],
      conjuntos: ['ताक़त', 'कमज़ोरी', 'मौक़े', 'ख़तरे'],
      elementos: [
        { texto: 'निरंतरता अब आदत बन गई है', zona: 'f' },
        { texto: 'बचत 50% तक पहुँच गई', zona: 'f' },
        { texto: 'परीक्षाओं के दौरान देर रात तक जागना', zona: 'd' },
        { texto: 'फ़ोन ध्यान खींच लेता है', zona: 'd' },
        { texto: 'पतझड़ में ग्रैजुएट स्कॉलरशिप खुलती है', zona: 'o' },
        { texto: 'जापान: असल ज़िंदगी में भाषा', zona: 'o' },
        { texto: 'तेज़ रफ़्तार पर घुटना दर्द करता है', zona: 'a' },
        { texto: 'किराया बढ़ सकता है', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'फ़िज़िक्स और संगीत',
    tipo: 'venn',
    propuesta: {
      raiz: 'फ़िज़िक्स और संगीत',
      ramas: [],
      conjuntos: ['फ़िज़िक्स', 'संगीत'],
      elementos: [
        { texto: 'समीकरण और मॉडल', zona: 'a' },
        { texto: 'लैब का काम', zona: 'a' },
        { texto: 'रेपर्टोयर और शैली', zona: 'b' },
        { texto: 'किसी के लिए बजाना', zona: 'b' },
        { texto: 'तरंगें और हार्मोनिक्स', zona: 'ab' },
        { texto: 'सोच-समझकर अभ्यास', zona: 'ab' },
        { texto: 'धैर्य', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'ग्रैजुएट स्कूल या नौकरी?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'ग्रैजुएट स्कूल या नौकरी?',
      ramas: [],
      conjuntos: ['ग्रैजुएट स्कूल', 'नौकरी'],
      elementos: [
        { texto: 'जो पसंद है उसी में विशेषज्ञता हासिल करना', zona: 'izq', peso: 5 },
        { texto: 'स्कॉलरशिप ज़रूरी ख़र्च तो पूरा कर देगी', zona: 'izq', peso: 3 },
        { texto: 'दो और साल किफ़ायती ज़िंदगी', zona: 'izq', peso: 2 },
        { texto: 'अभी से पूरी तनख़्वाह', zona: 'der', peso: 4 },
        { texto: 'कोरिया की यात्रा का ख़र्च उठाना', zona: 'der', peso: 2 },
        { texto: 'फिर कभी पढ़ाई पर न लौट पाने का ख़तरा', zona: 'der', peso: 4 },
      ],
    },
  },
]

// tr: título de M1 citado en dict.tr.tut.ts (tut.app-ideas--mapas.2.titulo); M11 coincide
// con dict.tr.tut.ts (tut.app-ideas--decidir.2.titulo). El viaje sigue en Japón.
const TR: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'İdeal hayatım',
    tipo: 'mental',
    propuesta: {
      raiz: 'İdeal hayatım',
      ramas: [
        n('Vücut', n('Nefes nefese kalmadan koşmak'), n('Gece yarısından önce uyumak')),
        n('Kafa', n('Fizik bölümünü bitirmek'), n('Daha çok okumak, daha az ekran kaydırmak')),
        n('Müzik', n('Sonunda piyano öğrenmek')),
        n('Dünya', n('Japonya’yı görmek'), n('Şehirden daha sık çıkmak')),
        n('Para', n('Maaştan maaşa yaşamayı bırakmak'), n('3 aylık bir birikim')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Sabah rutini',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Alarm çalıyor (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Alarm çalıyor (6:30)', 'inicio'),
        paso('Su + 5 dakika esneme'),
        paso('Bugün koşu günü mü?', 'decision'),
        paso('Koşu ya da 20 dakika piyano'),
        paso('Duş ve gerçek bir kahvaltı'),
        paso('Kafeye gitmek', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Ay için hangi kamera?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Ay için hangi kamera?',
      ramas: [],
      criterios: [
        { texto: 'Fiyat', peso: 5 },
        { texto: 'Gerçek zoom', peso: 4 },
        { texto: 'Taşıması kolay', peso: 2 },
      ],
      opciones: [
        { texto: 'İkinci el DSLR', puntajes: [4, 4, 2] },
        { texto: 'Sıfır aynasız', puntajes: [1, 5, 4] },
        { texto: 'Sadece telefon', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Vize haftası',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Vize haftası',
      ramas: [],
      conjuntos: ['Hemen yap', 'Planla', 'Devret', 'Bırak'],
      elementos: [
        { texto: 'Termodinamiği tekrar et', zona: 'hacer' },
        { texto: 'Geciken lab raporunu teslim et', zona: 'hacer' },
        { texto: 'Kısa bir piyano seansı', zona: 'agendar' },
        { texto: 'İki hafif koşu', zona: 'agendar' },
        { texto: 'Cuma vardiyamı değiştir', zona: 'delegar' },
        { texto: 'Sabahın 2’sine kadar dizi izlemek', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Termodinamik',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Termodinamik',
      ramas: [
        n('Sıfırıncı yasa', n('Isıl denge')),
        n('Birinci yasa', n('İç enerji'), n('İş ve ısı')),
        n('İkinci yasa', n('Entropi'), n('Isı makineleri')),
        n('Üçüncü yasa', n('Mutlak sıfır')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Yılın ortası',
    tipo: 'foda',
    propuesta: {
      raiz: 'Yılın ortası',
      ramas: [],
      conjuntos: ['Güçlü yönler', 'Zayıf yönler', 'Fırsatlar', 'Tehditler'],
      elementos: [
        { texto: 'İstikrar artık bir alışkanlık', zona: 'f' },
        { texto: 'Birikim %50’ye ulaştı', zona: 'f' },
        { texto: 'Sınavlarda geç yatmak', zona: 'd' },
        { texto: 'Telefon dikkatimi dağıtıyor', zona: 'd' },
        { texto: 'Yüksek lisans bursu sonbaharda açılıyor', zona: 'o' },
        { texto: 'Japonya: gerçek hayatta bir dil', zona: 'o' },
        { texto: 'Tempo artınca diz şikayet ediyor', zona: 'a' },
        { texto: 'Kira artabilir', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Fizik ve müzik',
    tipo: 'venn',
    propuesta: {
      raiz: 'Fizik ve müzik',
      ramas: [],
      conjuntos: ['Fizik', 'Müzik'],
      elementos: [
        { texto: 'Denklemler ve modeller', zona: 'a' },
        { texto: 'Laboratuvar', zona: 'a' },
        { texto: 'Repertuvar ve stil', zona: 'b' },
        { texto: 'Birisi için çalmak', zona: 'b' },
        { texto: 'Dalgalar ve armonikler', zona: 'ab' },
        { texto: 'Bilinçli pratik', zona: 'ab' },
        { texto: 'Sabır', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Yüksek lisans mı, iş mi?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Yüksek lisans mı, iş mi?',
      ramas: [],
      conjuntos: ['Yüksek lisans', 'İş'],
      elementos: [
        { texto: 'Sevdiğim alanda uzmanlaşmak', zona: 'izq', peso: 5 },
        { texto: 'Burs temel giderleri karşılar', zona: 'izq', peso: 3 },
        { texto: 'İki yıl daha kısıtlı bir hayat', zona: 'izq', peso: 2 },
        { texto: 'Hemen tam maaş', zona: 'der', peso: 4 },
        { texto: 'Kore gezisini ödemek', zona: 'der', peso: 2 },
        { texto: 'Bir daha okula dönememe riski', zona: 'der', peso: 4 },
      ],
    },
  },
]

// id: título de M1 citado en dict.id.tut.ts (tut.app-ideas--mapas.2.titulo); M11 coincide
// con dict.id.tut.ts (tut.app-ideas--decidir.2.titulo). El viaje sigue en Japón.
const ID: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Hidup idealku',
    tipo: 'mental',
    propuesta: {
      raiz: 'Hidup idealku',
      ramas: [
        n('Tubuh', n('Lari tanpa ngos-ngosan'), n('Tidur sebelum tengah malam')),
        n('Pikiran', n('Menyelesaikan kuliah Fisika'), n('Lebih banyak baca, lebih sedikit scroll')),
        n('Musik', n('Akhirnya belajar piano')),
        n('Dunia', n('Melihat Jepang'), n('Lebih sering keluar kota')),
        n('Uang', n('Berhenti hidup pas-pasan'), n('Tabungan cadangan untuk 3 bulan')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Rutinitas pagi',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Alarm berbunyi (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Alarm berbunyi (6:30)', 'inicio'),
        paso('Minum air + peregangan 5 menit'),
        paso('Hari ini lari?', 'decision'),
        paso('Lari atau piano 20 menit'),
        paso('Mandi dan sarapan beneran'),
        paso('Berangkat ke kedai kopi', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Kamera apa buat motret bulan?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Kamera apa buat motret bulan?',
      ramas: [],
      criterios: [
        { texto: 'Harga', peso: 5 },
        { texto: 'Zoom asli', peso: 4 },
        { texto: 'Mudah dibawa', peso: 2 },
      ],
      opciones: [
        { texto: 'DSLR bekas', puntajes: [4, 4, 2] },
        { texto: 'Mirrorless baru', puntajes: [1, 5, 4] },
        { texto: 'Cuma HP', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Minggu ujian tengah semester',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Minggu ujian tengah semester',
      ramas: [],
      conjuntos: ['Kerjakan sekarang', 'Jadwalkan', 'Delegasikan', 'Buang'],
      elementos: [
        { texto: 'Ulang termodinamika', zona: 'hacer' },
        { texto: 'Kumpulkan laporan lab yang telat', zona: 'hacer' },
        { texto: 'Sesi piano singkat', zona: 'agendar' },
        { texto: 'Dua kali lari santai', zona: 'agendar' },
        { texto: 'Tukar shift hari Jumat', zona: 'delegar' },
        { texto: 'Nonton series sampai jam 2 pagi', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Termodinamika',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Termodinamika',
      ramas: [
        n('Hukum ke-nol', n('Kesetimbangan termal')),
        n('Hukum pertama', n('Energi dalam'), n('Kerja dan kalor')),
        n('Hukum kedua', n('Entropi'), n('Mesin kalor')),
        n('Hukum ketiga', n('Nol mutlak')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Pertengahan tahun',
    tipo: 'foda',
    propuesta: {
      raiz: 'Pertengahan tahun',
      ramas: [],
      conjuntos: ['Kekuatan', 'Kelemahan', 'Peluang', 'Ancaman'],
      elementos: [
        { texto: 'Konsistensi sudah jadi kebiasaan', zona: 'f' },
        { texto: 'Tabungan sudah 50%', zona: 'f' },
        { texto: 'Begadang pas ujian', zona: 'd' },
        { texto: 'HP menyita fokusku', zona: 'd' },
        { texto: 'Beasiswa S2 dibuka musim gugur', zona: 'o' },
        { texto: 'Jepang: bahasa dalam kehidupan nyata', zona: 'o' },
        { texto: 'Lutut protes kalau pace dinaikkan', zona: 'a' },
        { texto: 'Sewa bisa naik', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Fisika dan musik',
    tipo: 'venn',
    propuesta: {
      raiz: 'Fisika dan musik',
      ramas: [],
      conjuntos: ['Fisika', 'Musik'],
      elementos: [
        { texto: 'Persamaan dan model', zona: 'a' },
        { texto: 'Kerja laboratorium', zona: 'a' },
        { texto: 'Repertoar dan gaya', zona: 'b' },
        { texto: 'Main buat orang lain', zona: 'b' },
        { texto: 'Gelombang dan harmonik', zona: 'ab' },
        { texto: 'Latihan yang disengaja', zona: 'ab' },
        { texto: 'Kesabaran', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Lanjut S2 atau kerja?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Lanjut S2 atau kerja?',
      ramas: [],
      conjuntos: ['Lanjut S2', 'Kerja'],
      elementos: [
        { texto: 'Fokus mendalami yang aku suka', zona: 'izq', peso: 5 },
        { texto: 'Beasiswa menutupi kebutuhan dasar', zona: 'izq', peso: 3 },
        { texto: 'Dua tahun lagi hidup pas-pasan', zona: 'izq', peso: 2 },
        { texto: 'Gaji penuh dari sekarang', zona: 'der', peso: 4 },
        { texto: 'Bisa bayar perjalanan ke Korea', zona: 'der', peso: 2 },
        { texto: 'Risiko nggak balik kuliah lagi', zona: 'der', peso: 4 },
      ],
    },
  },
]

// pl: título de M1 citado en dict.pl.tut.ts (tut.app-ideas--mapas.2.titulo); M11 coincide
// con dict.pl.tut.ts (tut.app-ideas--decidir.2.titulo). El viaje sigue en Japón. Todo el
// texto evita el pasado/condicional en 1ª persona (marca género en polaco): solo
// infinitivos, presente y nominalizaciones con sujeto en 3ª persona.
const PL: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Moje idealne życie',
    tipo: 'mental',
    propuesta: {
      raiz: 'Moje idealne życie',
      ramas: [
        n('Ciało', n('Biegać bez zadyszki'), n('Spać przed północą')),
        n('Głowa', n('Skończyć fizykę'), n('Więcej czytać, mniej scrollować')),
        n('Muzyka', n('Nauczyć się w końcu grać na pianinie')),
        n('Świat', n('Zobaczyć Japonię'), n('Częściej wyjeżdżać z miasta')),
        n('Pieniądze', n('Przestać żyć od pierwszego do pierwszego'), n('Poduszka finansowa na 3 miesiące')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Poranna rutyna',
    tipo: 'flujo',
    propuesta: {
      raiz: 'Budzik dzwoni (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Budzik dzwoni (6:30)', 'inicio'),
        paso('Woda + 5 minut rozciągania'),
        paso('Dziś dzień biegania?', 'decision'),
        paso('Bieganie albo 20 minut pianina'),
        paso('Prysznic i porządne śniadanie'),
        paso('Wyjście do kawiarni', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Jaki aparat na księżyc?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Jaki aparat na księżyc?',
      ramas: [],
      criterios: [
        { texto: 'Cena', peso: 5 },
        { texto: 'Prawdziwy zoom', peso: 4 },
        { texto: 'Łatwy do noszenia', peso: 2 },
      ],
      opciones: [
        { texto: 'Używana lustrzanka', puntajes: [4, 4, 2] },
        { texto: 'Nowy bezlusterkowiec', puntajes: [1, 5, 4] },
        { texto: 'Tylko telefon', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Tydzień kolokwiów',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Tydzień kolokwiów',
      ramas: [],
      conjuntos: ['Zrobić teraz', 'Zaplanować', 'Zlecić', 'Odpuścić'],
      elementos: [
        { texto: 'Powtórzyć termodynamikę', zona: 'hacer' },
        { texto: 'Oddać spóźnione sprawozdanie z laboratorium', zona: 'hacer' },
        { texto: 'Krótka sesja przy pianinie', zona: 'agendar' },
        { texto: 'Dwa spokojne biegi', zona: 'agendar' },
        { texto: 'Zamienić się zmianą w piątek', zona: 'delegar' },
        { texto: 'Seriale do 2 w nocy', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Termodynamika',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Termodynamika',
      ramas: [
        n('Zasada zerowa', n('Równowaga termiczna')),
        n('Pierwsza zasada', n('Energia wewnętrzna'), n('Praca i ciepło')),
        n('Druga zasada', n('Entropia'), n('Silniki cieplne')),
        n('Trzecia zasada', n('Zero absolutne')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Połowa roku',
    tipo: 'foda',
    propuesta: {
      raiz: 'Połowa roku',
      ramas: [],
      conjuntos: ['Mocne strony', 'Słabe strony', 'Szanse', 'Zagrożenia'],
      elementos: [
        { texto: 'Systematyczność jest już nawykiem', zona: 'f' },
        { texto: 'Oszczędności sięgają 50%', zona: 'f' },
        { texto: 'Późne noce w czasie egzaminów', zona: 'd' },
        { texto: 'Telefon rozprasza moją uwagę', zona: 'd' },
        { texto: 'Stypendium doktoranckie otwiera się jesienią', zona: 'o' },
        { texto: 'Japonia: język w prawdziwym życiu', zona: 'o' },
        { texto: 'Kolano protestuje przy szybszym tempie', zona: 'a' },
        { texto: 'Czynsz może wzrosnąć', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Fizyka i muzyka',
    tipo: 'venn',
    propuesta: {
      raiz: 'Fizyka i muzyka',
      ramas: [],
      conjuntos: ['Fizyka', 'Muzyka'],
      elementos: [
        { texto: 'Równania i modele', zona: 'a' },
        { texto: 'Praca w laboratorium', zona: 'a' },
        { texto: 'Repertuar i styl', zona: 'b' },
        { texto: 'Grać dla kogoś', zona: 'b' },
        { texto: 'Fale i harmoniczne', zona: 'ab' },
        { texto: 'Świadoma praktyka', zona: 'ab' },
        { texto: 'Cierpliwość', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Magisterka czy praca?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Magisterka czy praca?',
      ramas: [],
      conjuntos: ['Magisterka', 'Praca'],
      elementos: [
        { texto: 'Specjalizacja w tym, co się kocha', zona: 'izq', peso: 5 },
        { texto: 'Stypendium pokryje podstawy', zona: 'izq', peso: 3 },
        { texto: 'Jeszcze dwa lata skromnego życia', zona: 'izq', peso: 2 },
        { texto: 'Pełna pensja od razu', zona: 'der', peso: 4 },
        { texto: 'Opłacenie wyjazdu do Korei', zona: 'der', peso: 2 },
        { texto: 'Ryzyko, że już nigdy nie wrócę do nauki', zona: 'der', peso: 4 },
      ],
    },
  },
]

// ar: título de M1 citado en dict.ar.tut.ts (tut.app-ideas--mapas.2.titulo); M11 coincide
// con dict.ar.tut.ts (tut.app-ideas--decidir.2.titulo). Registro: عربية فصحى (MSA), sin
// dialecto. Cifras occidentales (no arábigo-índicas). El viaje sigue en Japón.
const AR: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'حياتي المثالية',
    tipo: 'mental',
    propuesta: {
      raiz: 'حياتي المثالية',
      ramas: [
        n('الجسد', n('الركض دون لهاث'), n('النوم قبل منتصف الليل')),
        n('العقل', n('إنهاء تخصص الفيزياء'), n('قراءة أكثر وتصفح أقل')),
        n('الموسيقى', n('تعلّم البيانو أخيرًا')),
        n('العالم', n('زيارة اليابان'), n('الخروج من المدينة أكثر')),
        n('المال', n('التوقف عن العيش يومًا بيوم'), n('مدّخرات تكفي 3 أشهر')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'روتين الصباح',
    tipo: 'flujo',
    propuesta: {
      raiz: 'يرن المنبه (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('يرن المنبه (6:30)', 'inicio'),
        paso('ماء + تمدد 5 دقائق'),
        paso('هل اليوم يوم جري؟', 'decision'),
        paso('الجري أو 20 دقيقة بيانو'),
        paso('استحمام وإفطار حقيقي'),
        paso('الخروج إلى المقهى', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'أي كاميرا لتصوير القمر؟',
    tipo: 'matriz',
    propuesta: {
      raiz: 'أي كاميرا لتصوير القمر؟',
      ramas: [],
      criterios: [
        { texto: 'السعر', peso: 5 },
        { texto: 'التقريب الحقيقي', peso: 4 },
        { texto: 'سهولة الحمل', peso: 2 },
      ],
      opciones: [
        { texto: 'كاميرا DSLR مستعملة', puntajes: [4, 4, 2] },
        { texto: 'كاميرا mirrorless جديدة', puntajes: [1, 5, 4] },
        { texto: 'الهاتف فقط', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'أسبوع الامتحانات الجزئية',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'أسبوع الامتحانات الجزئية',
      ramas: [],
      conjuntos: ['افعله الآن', 'جدوله', 'فوّضه', 'تخلَّ عنه'],
      elementos: [
        { texto: 'مراجعة الديناميكا الحرارية', zona: 'hacer' },
        { texto: 'تسليم تقرير المختبر المتأخر', zona: 'hacer' },
        { texto: 'جلسة بيانو قصيرة', zona: 'agendar' },
        { texto: 'جريتان خفيفتان', zona: 'agendar' },
        { texto: 'تبديل مناوبة الجمعة', zona: 'delegar' },
        { texto: 'مسلسلات حتى الساعة 2 صباحًا', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'الديناميكا الحرارية',
    tipo: 'arbol',
    propuesta: {
      raiz: 'الديناميكا الحرارية',
      ramas: [
        n('القانون الصفري', n('التوازن الحراري')),
        n('القانون الأول', n('الطاقة الداخلية'), n('الشغل والحرارة')),
        n('القانون الثاني', n('الإنتروبيا'), n('المحركات الحرارية')),
        n('القانون الثالث', n('الصفر المطلق')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'منتصف السنة',
    tipo: 'foda',
    propuesta: {
      raiz: 'منتصف السنة',
      ramas: [],
      conjuntos: ['نقاط القوة', 'نقاط الضعف', 'الفرص', 'التهديدات'],
      elementos: [
        { texto: 'الاستمرارية صارت عادة الآن', zona: 'f' },
        { texto: 'المدّخرات وصلت إلى 50%', zona: 'f' },
        { texto: 'السهر أثناء الامتحانات', zona: 'd' },
        { texto: 'الهاتف يسرق تركيزي', zona: 'd' },
        { texto: 'منحة الدراسات العليا تُفتح في الخريف', zona: 'o' },
        { texto: 'اليابان: اللغة في الحياة الواقعية', zona: 'o' },
        { texto: 'الركبة تحتج عند رفع الوتيرة', zona: 'a' },
        { texto: 'الإيجار قد يرتفع', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'الفيزياء والموسيقى',
    tipo: 'venn',
    propuesta: {
      raiz: 'الفيزياء والموسيقى',
      ramas: [],
      conjuntos: ['الفيزياء', 'الموسيقى'],
      elementos: [
        { texto: 'المعادلات والنماذج', zona: 'a' },
        { texto: 'العمل في المختبر', zona: 'a' },
        { texto: 'الريبرتوار والأسلوب', zona: 'b' },
        { texto: 'العزف لشخص ما', zona: 'b' },
        { texto: 'الموجات والتوافقيات', zona: 'ab' },
        { texto: 'التدريب الواعي', zona: 'ab' },
        { texto: 'الصبر', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'الدراسات العليا أم العمل؟',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'الدراسات العليا أم العمل؟',
      ramas: [],
      conjuntos: ['الدراسات العليا', 'العمل'],
      elementos: [
        { texto: 'التخصص فيما أحب', zona: 'izq', peso: 5 },
        { texto: 'المنحة تغطي الأساسيات', zona: 'izq', peso: 3 },
        { texto: 'سنتان أخريان من حياة متقشفة', zona: 'izq', peso: 2 },
        { texto: 'راتب كامل من الآن', zona: 'der', peso: 4 },
        { texto: 'دفع تكلفة رحلة كوريا', zona: 'der', peso: 2 },
        { texto: 'خطر عدم العودة إلى الدراسة أبدًا', zona: 'der', peso: 4 },
      ],
    },
  },
]

// nl: título de M1 citado en dict.nl.tut.ts (tut.app-ideas--mapas.2.titulo); M11 coincide
// con dict.nl.tut.ts (tut.app-ideas--decidir.2.titulo). Reutiliza "ochtendroutine",
// "thermodynamica", "natuurkunde en muziek" y "tentamenweek" ya acuñados ahí. Je/jij.
const NL: MapaDemo[] = [
  {
    dia: -358,
    nombre: 'Mijn ideale leven',
    tipo: 'mental',
    propuesta: {
      raiz: 'Mijn ideale leven',
      ramas: [
        n('Lichaam', n('Rennen zonder buiten adem te raken'), n('Voor middernacht slapen')),
        n('Hoofd', n('De opleiding Natuurkunde afmaken'), n('Meer lezen, minder scrollen')),
        n('Muziek', n('Eindelijk piano leren')),
        n('Wereld', n('Japan zien'), n('Vaker de stad uit')),
        n('Geld', n('Stoppen met van dag tot dag leven'), n('Een buffer voor 3 maanden')),
      ],
    },
  },
  {
    dia: -330,
    nombre: 'Ochtendroutine',
    tipo: 'flujo',
    propuesta: {
      raiz: 'De wekker gaat (6:30)',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('De wekker gaat (6:30)', 'inicio'),
        paso('Water + 5 min rekken'),
        paso('Is het een hardloopdag?', 'decision'),
        paso('Hardlopen of 20 min piano'),
        paso('Douchen en een echt ontbijt'),
        paso('Naar het café', 'fin'),
      ]),
    },
  },
  {
    dia: -258,
    nombre: 'Welke camera voor de maan?',
    tipo: 'matriz',
    propuesta: {
      raiz: 'Welke camera voor de maan?',
      ramas: [],
      criterios: [
        { texto: 'Prijs', peso: 5 },
        { texto: 'Echte zoom', peso: 4 },
        { texto: 'Makkelijk mee te dragen', peso: 2 },
      ],
      opciones: [
        { texto: 'Tweedehands spiegelreflex', puntajes: [4, 4, 2] },
        { texto: 'Nieuwe systeemcamera', puntajes: [1, 5, 4] },
        { texto: 'Gewoon de telefoon', puntajes: [5, 1, 5] },
      ],
    },
  },
  {
    dia: -228,
    nombre: 'Tentamenweek',
    tipo: 'eisenhower',
    propuesta: {
      raiz: 'Tentamenweek',
      ramas: [],
      conjuntos: ['Nu doen', 'Inplannen', 'Delegeren', 'Laten vallen'],
      elementos: [
        { texto: 'Thermodynamica herhalen', zona: 'hacer' },
        { texto: 'Het te late labverslag inleveren', zona: 'hacer' },
        { texto: 'Korte pianosessie', zona: 'agendar' },
        { texto: 'Twee rustige hardloopsessies', zona: 'agendar' },
        { texto: 'Mijn dienst van vrijdag ruilen', zona: 'delegar' },
        { texto: 'Series kijken tot 2 uur ’s nachts', zona: 'quitar' },
      ],
    },
  },
  {
    dia: -214,
    nombre: 'Thermodynamica',
    tipo: 'arbol',
    propuesta: {
      raiz: 'Thermodynamica',
      ramas: [
        n('Nulde hoofdwet', n('Thermisch evenwicht')),
        n('Eerste hoofdwet', n('Interne energie'), n('Arbeid en warmte')),
        n('Tweede hoofdwet', n('Entropie'), n('Warmtemachines')),
        n('Derde hoofdwet', n('Absolute nulpunt')),
      ],
    },
  },
  {
    dia: -186,
    nombre: 'Halverwege het jaar',
    tipo: 'foda',
    propuesta: {
      raiz: 'Halverwege het jaar',
      ramas: [],
      conjuntos: ['Sterke punten', 'Zwakke punten', 'Kansen', 'Bedreigingen'],
      elementos: [
        { texto: 'Consistentie is nu een gewoonte', zona: 'f' },
        { texto: 'Spaargeld zit op 50%', zona: 'f' },
        { texto: 'Laat naar bed tijdens tentamens', zona: 'd' },
        { texto: 'Telefoon eet mijn focus op', zona: 'd' },
        { texto: 'Masterbeurs opent in het najaar', zona: 'o' },
        { texto: 'Japan: de taal in het echte leven', zona: 'o' },
        { texto: 'Knie klaagt bij een hoger tempo', zona: 'a' },
        { texto: 'Huur kan stijgen', zona: 'a' },
      ],
    },
  },
  {
    dia: -140,
    nombre: 'Natuurkunde en muziek',
    tipo: 'venn',
    propuesta: {
      raiz: 'Natuurkunde en muziek',
      ramas: [],
      conjuntos: ['Natuurkunde', 'Muziek'],
      elementos: [
        { texto: 'Vergelijkingen en modellen', zona: 'a' },
        { texto: 'Labwerk', zona: 'a' },
        { texto: 'Repertoire en stijl', zona: 'b' },
        { texto: 'Voor iemand spelen', zona: 'b' },
        { texto: 'Golven en boventonen', zona: 'ab' },
        { texto: 'Bewust oefenen', zona: 'ab' },
        { texto: 'Geduld', zona: 'ab' },
      ],
    },
  },
  {
    dia: -24,
    nombre: 'Doorstuderen of werken?',
    tipo: 'proscontras',
    propuesta: {
      raiz: 'Doorstuderen of werken?',
      ramas: [],
      conjuntos: ['Doorstuderen', 'Werken'],
      elementos: [
        { texto: 'Me specialiseren in waar ik van hou', zona: 'izq', peso: 5 },
        { texto: 'De beurs dekt het basisbudget', zona: 'izq', peso: 3 },
        { texto: 'Nog twee jaar sober leven', zona: 'izq', peso: 2 },
        { texto: 'Meteen een volledig salaris', zona: 'der', peso: 4 },
        { texto: 'De reis naar Korea betalen', zona: 'der', peso: 2 },
        { texto: 'Het risico nooit meer terug te gaan studeren', zona: 'der', peso: 4 },
      ],
    },
  },
]

export const MAPAS_PEP: PorIdioma<MapaDemo[]> = {
  es: ES,
  en: EN,
  pt: PT,
  fr: FR,
  de: DE,
  it: IT,
  ja: JA,
  zh: ZH,
  ko: KO,
  ru: RU,
  hi: HI,
  tr: TR,
  id: ID,
  pl: PL,
  ar: AR,
  nl: NL,
}
