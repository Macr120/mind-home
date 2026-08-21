import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * NEERLANDÉS de la siembra de cocina. Traducción de `ejemplos.i18n.en.ts`
 * (misma estructura y MISMAS claves que el español de `ejemplos.ts`).
 */
export const EJEMPLOS_COCINA_NL: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pesto pasta',
      carpeta: 'Italiaans',
      etiquetas: ['pasta', 'snel', 'vegetarisch'],
      ingredientes: ['200 g pasta', '4 eetlepels pesto', '30 g Parmezaanse kaas', '1 eetlepel olijfolie'],
      pasos: ['Kook de pasta al dente.', 'Giet af en meng met de pesto.', 'Serveer met geraspte Parmezaanse kaas.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza Margherita',
      carpeta: 'Italiaans',
      etiquetas: ['oven', 'vegetarisch'],
      ingredientes: ['1 pizzabodem', '150 g tomatensaus', '125 g mozzarella', 'Basilicumblaadjes'],
      pasos: ['Verdeel de saus over de bodem.', 'Voeg de mozzarella toe.', 'Bak op 220 °C gedurende 12 min.', 'Werk af met basilicum.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Mexicaans',
      etiquetas: ['varkensvlees', 'klassieker'],
      ingredientes: ['400 g gemarineerd varkensvlees', '9 maistortilla\'s', '1/2 ananas', '1 ui', 'Koriander naar smaak'],
      pasos: ['Gril het gemarineerde varkensvlees.', 'Hak het fijn met ananas.', 'Serveer op tortilla\'s met ui en koriander.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Groene chilaquiles',
      carpeta: 'Mexicaans',
      etiquetas: ['ontbijt'],
      ingredientes: ['200 g tortillachips', '300 ml groene salsa', '2 eieren', '50 g verse kaas', 'Zure room naar smaak'],
      pasos: ['Verwarm de groene salsa.', 'Voeg de chips toe en meng.', 'Serveer met ei, kaas en zure room.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Mediterrane salade',
      carpeta: 'Gezond',
      etiquetas: ['licht', 'vegetarisch'],
      ingredientes: ['1 komkommer', '2 tomaten', '80 g fetakaas', '10 olijven', '2 eetlepels olijfolie'],
      pasos: ['Snijd de groenten.', 'Voeg feta en olijven toe.', 'Meng met olijfolie.'],
    },
    'salm-n-al-horno': {
      nombre: 'Zalm uit de oven',
      carpeta: 'Gezond',
      etiquetas: ['vis', 'eiwitrijk'],
      ingredientes: ['2 zalmfilets (300 g)', '1 citroen', '2 teentjes knoflook', 'Dille en zout naar smaak'],
      pasos: ['Leg de zalm op een bakplaat.', 'Breng op smaak met knoflook, citroen en dille.', 'Bak op 200 °C gedurende 18 min.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Gegrilde kip',
      carpeta: 'Gezond',
      etiquetas: ['kip', 'eiwitrijk'],
      ingredientes: ['300 g kipfilet', '1 eetlepel olijfolie', 'Kruiden en zout naar smaak', '1 citroen'],
      pasos: ['Breng de kip op smaak.', 'Gril 6-7 min per kant.', 'Laat rusten en serveer met citroen.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Quinoabowl',
      carpeta: 'Gezond',
      etiquetas: ['vegetarisch', 'vezelrijk'],
      ingredientes: ['150 g quinoa', '100 g gekookte kikkererwten', '1 wortel', '1/2 avocado', '2 eetlepels olijfolie'],
      pasos: ['Kook de quinoa.', 'Snijd de groenten.', 'Meng alles en breng op smaak.'],
    },
    'avena-overnight': {
      nombre: 'Overnight oats',
      carpeta: 'Gezond',
      etiquetas: ['ontbijt', 'snel'],
      ingredientes: ['60 g havermout', '200 ml melk', '1 banaan', '1 eetlepel chiazaad'],
      pasos: ['Meng havermout, melk en chiazaad.', 'Zet een nacht in de koelkast.', 'Serveer met plakjes banaan.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Mediterraan',
      descripcion: 'Rijk aan groenten, vis en olijfolie. Uitgebalanceerd en duurzaam.',
    },
    'alta-en-prote-na': {
      nombre: 'Veel eiwit',
      descripcion: 'Geeft voorrang aan eiwit voor lichaamsverandering en verzadiging.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Weinig koolhydraten en veel gezonde vetten.',
    },
    vegetariana: {
      nombre: 'Vegetarisch',
      descripcion: 'Vleesvrij, gebaseerd op groenten, peulvruchten en volkoren granen.',
    },
    'ganancia-muscular': {
      nombre: 'Spiergroei',
      descripcion: 'Calorieoverschot met veel eiwit om spiermassa op te bouwen.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Vetverlies',
      descripcion: 'Calorietekort met veel eiwit om spieren te behouden.',
    },
    'sin-gluten': {
      nombre: 'Glutenvrij',
      descripcion: 'Vermijdt tarwe en afgeleide producten; gebaseerd op mais, rijst, vis en groenten.',
    },
  },
  dia: [
    { nombre: 'Overnight oats met banaan', nota: 'Voorbeeld: zo ziet een geregistreerde dag eruit.' },
    { nombre: 'Griekse yoghurt met walnoten' },
    { nombre: 'Gegrilde kip met rijst en groenten' },
    { nombre: 'Zalm uit de oven met salade' },
  ],
  lista: {
    nombre: 'Voorbeeld: Wekelijkse boodschappen',
    items: [
      'Kipfilet',
      'Zalm',
      'Eieren',
      'Tomaat',
      'Avocado',
      'Spinazie',
      'Griekse yoghurt',
      'Fetakaas',
      'Havermout',
      'Zilvervliesrijst',
      'Olijfolie',
      'Maistortilla\'s',
    ],
  },
}
