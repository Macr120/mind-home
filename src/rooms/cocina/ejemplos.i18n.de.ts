import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * ALEMÁN de la siembra de cocina. Traducción de `ejemplos.i18n.en.ts`
 * (misma estructura y MISMAS claves que el español de `ejemplos.ts`).
 */
export const EJEMPLOS_COCINA_DE: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pesto-Pasta',
      carpeta: 'Italienisch',
      etiquetas: ['Pasta', 'schnell', 'vegetarisch'],
      ingredientes: ['200 g Pasta', '4 EL Pesto', '30 g Parmesan', '1 EL Olivenöl'],
      pasos: ['Die Pasta al dente kochen.', 'Die Pasta abgießen und mit dem Pesto vermengen.', 'Mit geriebenem Parmesan servieren.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza Margherita',
      carpeta: 'Italienisch',
      etiquetas: ['Ofen', 'vegetarisch'],
      ingredientes: ['1 Pizzaboden', '150 g Tomatensauce', '125 g Mozzarella', 'Basilikumblätter'],
      pasos: ['Die Sauce auf dem Boden verteilen.', 'Den Mozzarella dazugeben.', 'Bei 220 °C 12 Minuten backen.', 'Mit Basilikum abschließen.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Mexikanisch',
      etiquetas: ['Schwein', 'Klassiker'],
      ingredientes: ['400 g mariniertes Schweinefleisch', '9 Maistortillas', '1/2 Ananas', '1 Zwiebel', 'Koriander nach Geschmack'],
      pasos: ['Das marinierte Schweinefleisch grillen.', 'Fein mit Ananas hacken.', 'Auf Tortillas mit Zwiebel und Koriander servieren.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Grüne Chilaquiles',
      carpeta: 'Mexikanisch',
      etiquetas: ['Frühstück'],
      ingredientes: ['200 g Tortillachips', '300 ml grüne Salsa', '2 Eier', '50 g frischer Käse', 'Saure Sahne nach Geschmack'],
      pasos: ['Die grüne Salsa erhitzen.', 'Die Chips dazugeben und vermengen.', 'Mit Ei, Käse und saurer Sahne servieren.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Mediterraner Salat',
      carpeta: 'Gesund',
      etiquetas: ['leicht', 'vegetarisch'],
      ingredientes: ['1 Salatgurke', '2 Tomaten', '80 g Feta', '10 Oliven', '2 EL Olivenöl'],
      pasos: ['Das Gemüse klein schneiden.', 'Feta und Oliven dazugeben.', 'Mit Olivenöl anmachen.'],
    },
    'salm-n-al-horno': {
      nombre: 'Lachs aus dem Ofen',
      carpeta: 'Gesund',
      etiquetas: ['Fisch', 'eiweißreich'],
      ingredientes: ['2 Lachsfilets (300 g)', '1 Zitrone', '2 Knoblauchzehen', 'Dill und Salz nach Geschmack'],
      pasos: ['Den Lachs auf ein Blech legen.', 'Mit Knoblauch, Zitrone und Dill würzen.', 'Bei 200 °C 18 Minuten backen.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Gegrilltes Hähnchen',
      carpeta: 'Gesund',
      etiquetas: ['Hähnchen', 'eiweißreich'],
      ingredientes: ['300 g Hähnchenbrust', '1 EL Olivenöl', 'Gewürze und Salz nach Geschmack', '1 Zitrone'],
      pasos: ['Das Hähnchen würzen.', '6-7 Minuten pro Seite grillen.', 'Ruhen lassen und mit Zitrone servieren.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Quinoa-Bowl',
      carpeta: 'Gesund',
      etiquetas: ['vegetarisch', 'ballaststoffreich'],
      ingredientes: ['150 g Quinoa', '100 g gekochte Kichererbsen', '1 Karotte', '1/2 Avocado', '2 EL Olivenöl'],
      pasos: ['Die Quinoa kochen.', 'Das Gemüse klein schneiden.', 'Alles vermengen und anmachen.'],
    },
    'avena-overnight': {
      nombre: 'Overnight Oats',
      carpeta: 'Gesund',
      etiquetas: ['Frühstück', 'schnell'],
      ingredientes: ['60 g Haferflocken', '200 ml Milch', '1 Banane', '1 EL Chiasamen'],
      pasos: ['Haferflocken, Milch und Chiasamen vermischen.', 'Über Nacht in den Kühlschrank stellen.', 'Mit Bananenscheiben servieren.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Mediterran',
      descripcion: 'Reich an Gemüse, Fisch und Olivenöl. Ausgewogen und nachhaltig.',
    },
    'alta-en-prote-na': {
      nombre: 'Eiweißreich',
      descripcion: 'Setzt auf Eiweiß für Körperumbau und Sättigung.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Wenig Kohlenhydrate und viel gesunde Fette.',
    },
    vegetariana: {
      nombre: 'Vegetarisch',
      descripcion: 'Fleischfrei, auf Basis von Gemüse, Hülsenfrüchten und Vollkorn.',
    },
    'ganancia-muscular': {
      nombre: 'Muskelaufbau',
      descripcion: 'Kalorienüberschuss mit viel Eiweiß für den Muskelaufbau.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Fettabbau',
      descripcion: 'Kaloriendefizit mit viel Eiweiß, um Muskeln zu erhalten.',
    },
    'sin-gluten': {
      nombre: 'Glutenfrei',
      descripcion: 'Verzichtet auf Weizen und Weizenprodukte; setzt auf Mais, Reis, Fisch und Gemüse.',
    },
  },
  dia: [
    { nombre: 'Overnight Oats mit Banane', nota: 'Beispiel: So sieht ein erfasster Tag aus.' },
    { nombre: 'Griechischer Joghurt mit Walnüssen' },
    { nombre: 'Gegrilltes Hähnchen mit Reis und Gemüse' },
    { nombre: 'Lachs aus dem Ofen mit Salat' },
  ],
  lista: {
    nombre: 'Beispiel: Wocheneinkauf',
    items: [
      'Hähnchenbrust',
      'Lachs',
      'Eier',
      'Tomate',
      'Avocado',
      'Spinat',
      'Griechischer Joghurt',
      'Feta',
      'Haferflocken',
      'Vollkornreis',
      'Olivenöl',
      'Maistortillas',
    ],
  },
}
