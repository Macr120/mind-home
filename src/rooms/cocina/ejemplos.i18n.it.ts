import type { TextosEjemplosCocina } from './ejemplos.i18n'

/** ITALIANO de la siembra de cocina (misión catálogos 2026). */
export const EJEMPLOS_COCINA_IT: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pasta al pesto',
      carpeta: 'Italiana',
      etiquetas: ['pasta', 'veloce', 'vegetariana'],
      ingredientes: ['200 g di pasta', '4 cucchiai di pesto', '30 g di parmigiano', "1 cucchiaio di olio d'oliva"],
      pasos: ['Cuoci la pasta al dente.', 'Scolala e mescolala con il pesto.', 'Servi con parmigiano grattugiato.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza margherita',
      carpeta: 'Italiana',
      etiquetas: ['forno', 'vegetariana'],
      ingredientes: ['1 base per pizza', '150 g di salsa di pomodoro', '125 g di mozzarella', 'Foglie di basilico'],
      pasos: ['Stendi la salsa sulla base.', 'Aggiungi la mozzarella.', 'Cuoci a 220 °C per 12 min.', 'Completa con il basilico.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Messicana',
      etiquetas: ['maiale', 'classico'],
      ingredientes: ['400 g di carne di maiale marinata', '9 tortillas di mais', '1/2 ananas', '1 cipolla', 'Coriandolo a piacere'],
      pasos: ['Griglia la carne marinata.', "Tritala finemente con l'ananas.", 'Servi nelle tortillas con cipolla e coriandolo.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Chilaquiles verdi',
      carpeta: 'Messicana',
      etiquetas: ['colazione'],
      ingredientes: ['200 g di tortilla chips', '300 ml di salsa verde', '2 uova', '50 g di formaggio fresco', 'Panna a piacere'],
      pasos: ['Scalda la salsa verde.', 'Aggiungi i chips e mescola.', 'Servi con uovo, formaggio e panna.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Insalata mediterranea',
      carpeta: 'Salutare',
      etiquetas: ['leggera', 'vegetariana'],
      ingredientes: ['1 cetriolo', '2 pomodori', '80 g di feta', '10 olive', "2 cucchiai di olio d'oliva"],
      pasos: ['Taglia le verdure.', 'Aggiungi la feta e le olive.', "Condisci con olio d'oliva."],
    },
    'salm-n-al-horno': {
      nombre: 'Salmone al forno',
      carpeta: 'Salutare',
      etiquetas: ['pesce', 'ricco di proteine'],
      ingredientes: ['2 filetti di salmone (300 g)', '1 limone', "2 spicchi d'aglio", 'Aneto e sale a piacere'],
      pasos: ['Metti il salmone su una teglia.', "Condisci con aglio, limone e aneto.", 'Cuoci a 200 °C per 18 min.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Pollo alla griglia',
      carpeta: 'Salutare',
      etiquetas: ['pollo', 'ricco di proteine'],
      ingredientes: ['300 g di petto di pollo', "1 cucchiaio di olio d'oliva", 'Spezie e sale a piacere', '1 limone'],
      pasos: ['Condisci il pollo.', 'Griglialo 6-7 minuti per lato.', 'Lascialo riposare e servi con limone.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Bowl di quinoa',
      carpeta: 'Salutare',
      etiquetas: ['vegetariana', 'fibre'],
      ingredientes: ['150 g di quinoa', '100 g di ceci cotti', '1 carota', '1/2 avocado', "2 cucchiai di olio d'oliva"],
      pasos: ['Cuoci la quinoa.', 'Taglia le verdure.', 'Mescola tutto e condisci.'],
    },
    'avena-overnight': {
      nombre: 'Avena overnight',
      carpeta: 'Salutare',
      etiquetas: ['colazione', 'veloce'],
      ingredientes: ['60 g di avena', '200 ml di latte', '1 banana', '1 cucchiaio di semi di chia'],
      pasos: ['Mescola avena, latte e chia.', 'Metti in frigo per tutta la notte.', 'Servi con banana a fette.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Mediterranea',
      descripcion: "Ricca di verdure, pesce e olio d'oliva. Equilibrata e sostenibile.",
    },
    'alta-en-prote-na': {
      nombre: 'Ricca di proteine',
      descripcion: 'Dà priorità alle proteine per la ricomposizione corporea e il senso di sazietà.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Bassa in carboidrati e ricca di grassi sani.',
    },
    vegetariana: {
      nombre: 'Vegetariana',
      descripcion: 'Senza carne, a base di verdure, legumi e cereali integrali.',
    },
    'ganancia-muscular': {
      nombre: 'Aumento muscolare',
      descripcion: 'Surplus calorico con proteine alte per aumentare la massa muscolare.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Perdita di grasso',
      descripcion: 'Deficit calorico con proteine alte per preservare il muscolo.',
    },
    'sin-gluten': {
      nombre: 'Senza glutine',
      descripcion: 'Evita il grano e i suoi derivati; a base di mais, riso, pesce e verdure.',
    },
  },
  dia: [
    { nombre: 'Avena overnight con banana', nota: 'Esempio: ecco come appare una giornata registrata.' },
    { nombre: 'Yogurt greco con noci' },
    { nombre: 'Pollo alla griglia con riso e verdure' },
    { nombre: 'Salmone al forno con insalata' },
  ],
  lista: {
    nombre: 'Esempio: Spesa settimanale',
    items: [
      'Petto di pollo',
      'Salmone',
      'Uova',
      'Pomodoro',
      'Avocado',
      'Spinaci',
      'Yogurt greco',
      'Feta',
      'Avena',
      'Riso integrale',
      "Olio d'oliva",
      'Tortillas di mais',
    ],
  },
}
