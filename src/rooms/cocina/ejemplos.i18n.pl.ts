import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * POLACO de la siembra de cocina. Traducción de `ejemplos.i18n.en.ts`
 * (misma estructura y MISMAS claves que el español de `ejemplos.ts`).
 */
export const EJEMPLOS_COCINA_PL: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Makaron z pesto',
      carpeta: 'Włoska',
      etiquetas: ['makaron', 'szybkie', 'wegetariańskie'],
      ingredientes: ['200 g makaronu', '4 łyżki pesto', '30 g parmezanu', '1 łyżka oliwy z oliwek'],
      pasos: ['Ugotuj makaron al dente.', 'Odcedź i wymieszaj z pesto.', 'Podawaj z tartym parmezanem.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza Margherita',
      carpeta: 'Włoska',
      etiquetas: ['piekarnik', 'wegetariańskie'],
      ingredientes: ['1 spód do pizzy', '150 g sosu pomidorowego', '125 g mozzarelli', 'Listki bazylii'],
      pasos: ['Rozprowadź sos na spodzie.', 'Dodaj mozzarellę.', 'Piecz w 220 °C przez 12 min.', 'Na koniec dodaj bazylię.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Meksykańska',
      etiquetas: ['wieprzowina', 'klasyczne'],
      ingredientes: ['400 g marynowanej wieprzowiny', '9 tortilli kukurydzianych', '1/2 ananasa', '1 cebula', 'Kolendra do smaku'],
      pasos: ['Upiecz marynowaną wieprzowinę na grillu.', 'Posiekaj drobno z ananasem.', 'Podawaj na tortillach z cebulą i kolendrą.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Zielone chilaquiles',
      carpeta: 'Meksykańska',
      etiquetas: ['śniadanie'],
      ingredientes: ['200 g chipsów tortilla', '300 ml zielonej salsy', '2 jajka', '50 g świeżego sera', 'Kwaśna śmietana do smaku'],
      pasos: ['Podgrzej zieloną salsę.', 'Dodaj chipsy i wymieszaj.', 'Podawaj z jajkiem, serem i śmietaną.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Sałatka śródziemnomorska',
      carpeta: 'Zdrowa',
      etiquetas: ['lekkie', 'wegetariańskie'],
      ingredientes: ['1 ogórek', '2 pomidory', '80 g sera feta', '10 oliwek', '2 łyżki oliwy z oliwek'],
      pasos: ['Pokrój warzywa.', 'Dodaj fetę i oliwki.', 'Polej oliwą z oliwek.'],
    },
    'salm-n-al-horno': {
      nombre: 'Łosoś pieczony',
      carpeta: 'Zdrowa',
      etiquetas: ['ryba', 'wysokobiałkowe'],
      ingredientes: ['2 filety z łososia (300 g)', '1 cytryna', '2 ząbki czosnku', 'Koperek i sól do smaku'],
      pasos: ['Ułóż łososia na blasze.', 'Dopraw czosnkiem, cytryną i koperkiem.', 'Piecz w 200 °C przez 18 min.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Grillowany kurczak',
      carpeta: 'Zdrowa',
      etiquetas: ['kurczak', 'wysokobiałkowe'],
      ingredientes: ['300 g piersi z kurczaka', '1 łyżka oliwy z oliwek', 'Przyprawy i sól do smaku', '1 cytryna'],
      pasos: ['Dopraw kurczaka.', 'Grilluj 6-7 min z każdej strony.', 'Odstaw na chwilę i podawaj z cytryną.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Bowl z quinoa',
      carpeta: 'Zdrowa',
      etiquetas: ['wegetariańskie', 'błonnik'],
      ingredientes: ['150 g quinoa', '100 g ugotowanej ciecierzycy', '1 marchewka', '1/2 awokado', '2 łyżki oliwy z oliwek'],
      pasos: ['Ugotuj quinoa.', 'Pokrój warzywa.', 'Wymieszaj wszystko i polej oliwą.'],
    },
    'avena-overnight': {
      nombre: 'Owsianka na noc',
      carpeta: 'Zdrowa',
      etiquetas: ['śniadanie', 'szybkie'],
      ingredientes: ['60 g płatków owsianych', '200 ml mleka', '1 banan', '1 łyżka nasion chia'],
      pasos: ['Wymieszaj płatki owsiane, mleko i chia.', 'Wstaw na noc do lodówki.', 'Podawaj z pokrojonym bananem.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Śródziemnomorska',
      descripcion: 'Bogata w warzywa, ryby i oliwę z oliwek. Zbilansowana i zrównoważona.',
    },
    'alta-en-prote-na': {
      nombre: 'Wysokobiałkowa',
      descripcion: 'Stawia na białko dla rekompozycji sylwetki i sytości.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Mało węglowodanów i dużo zdrowych tłuszczów.',
    },
    vegetariana: {
      nombre: 'Wegetariańska',
      descripcion: 'Bez mięsa, oparta na warzywach, roślinach strączkowych i produktach pełnoziarnistych.',
    },
    'ganancia-muscular': {
      nombre: 'Budowa masy mięśniowej',
      descripcion: 'Nadwyżka kaloryczna z dużą ilością białka, by zbudować masę mięśniową.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Redukcja tkanki tłuszczowej',
      descripcion: 'Deficyt kaloryczny z dużą ilością białka, by zachować mięśnie.',
    },
    'sin-gluten': {
      nombre: 'Bezglutenowa',
      descripcion: 'Bez pszenicy i jej pochodnych; oparta na kukurydzy, ryżu, rybach i warzywach.',
    },
  },
  dia: [
    { nombre: 'Owsianka na noc z bananem', nota: 'Przykład: tak wygląda zapisany dzień.' },
    { nombre: 'Jogurt grecki z orzechami włoskimi' },
    { nombre: 'Grillowany kurczak z ryżem i warzywami' },
    { nombre: 'Łosoś pieczony z sałatką' },
  ],
  lista: {
    nombre: 'Przykład: Cotygodniowe zakupy',
    items: [
      'Pierś z kurczaka',
      'Łosoś',
      'Jajka',
      'Pomidor',
      'Awokado',
      'Szpinak',
      'Jogurt grecki',
      'Ser feta',
      'Płatki owsiane',
      'Ryż brązowy',
      'Oliwa z oliwek',
      'Tortille kukurydziane',
    ],
  },
}
