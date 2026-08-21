import type { TextosEjemplosCocina } from './ejemplos.i18n'

/** FRANCÉS de la siembra de cocina (misión catálogos 2026). */
export const EJEMPLOS_COCINA_FR: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pâtes au pesto',
      carpeta: 'Italienne',
      etiquetas: ['pâtes', 'rapide', 'végétarien'],
      ingredientes: ['200 g de pâtes', '4 cuillères à soupe de pesto', '30 g de parmesan', "1 cuillère à soupe d'huile d'olive"],
      pasos: ['Cuis les pâtes al dente.', 'Égoutte-les et mélange-les avec le pesto.', 'Sers avec du parmesan râpé.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza margherita',
      carpeta: 'Italienne',
      etiquetas: ['four', 'végétarien'],
      ingredientes: ['1 pâte à pizza', '150 g de sauce tomate', '125 g de mozzarella', 'Feuilles de basilic'],
      pasos: ['Étale la sauce sur la pâte.', 'Ajoute la mozzarella.', 'Fais cuire à 220 °C pendant 12 min.', 'Termine avec le basilic.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Mexicaine',
      etiquetas: ['porc', 'classique'],
      ingredientes: ['400 g de porc mariné', '9 tortillas de maïs', '1/2 ananas', '1 oignon', 'Coriandre selon le goût'],
      pasos: ['Fais griller le porc mariné.', "Hache-le finement avec l'ananas.", "Sers sur des tortillas avec l'oignon et la coriandre."],
    },
    'chilaquiles-verdes': {
      nombre: 'Chilaquiles verts',
      carpeta: 'Mexicaine',
      etiquetas: ['petit-déjeuner'],
      ingredientes: ['200 g de chips de tortilla', '300 ml de sauce verte', '2 œufs', '50 g de fromage frais', 'Crème selon le goût'],
      pasos: ['Fais chauffer la sauce verte.', 'Ajoute les chips et mélange.', "Sers avec l'œuf, le fromage et la crème."],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Salade méditerranéenne',
      carpeta: 'Saine',
      etiquetas: ['léger', 'végétarien'],
      ingredientes: ['1 concombre', '2 tomates', '80 g de feta', '10 olives', "2 cuillères à soupe d'huile d'olive"],
      pasos: ['Coupe les légumes.', 'Ajoute la feta et les olives.', "Assaisonne avec l'huile d'olive."],
    },
    'salm-n-al-horno': {
      nombre: 'Saumon au four',
      carpeta: 'Saine',
      etiquetas: ['poisson', 'riche en protéines'],
      ingredientes: ['2 filets de saumon (300 g)', '1 citron', "2 gousses d'ail", 'Aneth et sel selon le goût'],
      pasos: ['Place le saumon sur une plaque.', "Assaisonne avec l'ail, le citron et l'aneth.", 'Fais cuire à 200 °C pendant 18 min.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Poulet grillé',
      carpeta: 'Saine',
      etiquetas: ['poulet', 'riche en protéines'],
      ingredientes: ['300 g de blanc de poulet', "1 cuillère à soupe d'huile d'olive", 'Épices et sel selon le goût', '1 citron'],
      pasos: ['Assaisonne le poulet.', 'Fais-le griller 6-7 min de chaque côté.', 'Laisse reposer et sers avec le citron.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Bowl de quinoa',
      carpeta: 'Saine',
      etiquetas: ['végétarien', 'fibres'],
      ingredientes: ['150 g de quinoa', '100 g de pois chiches cuits', '1 carotte', '1/2 avocat', "2 cuillères à soupe d'huile d'olive"],
      pasos: ['Cuis le quinoa.', 'Coupe les légumes.', 'Mélange le tout et assaisonne.'],
    },
    'avena-overnight': {
      nombre: 'Avoine overnight',
      carpeta: 'Saine',
      etiquetas: ['petit-déjeuner', 'rapide'],
      ingredientes: ["60 g de flocons d'avoine", '200 ml de lait', '1 banane', '1 cuillère à soupe de graines de chia'],
      pasos: ["Mélange les flocons d'avoine, le lait et le chia.", 'Réfrigère toute la nuit.', 'Sers avec des tranches de banane.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Méditerranéenne',
      descripcion: "Riche en légumes, poisson et huile d'olive. Équilibrée et durable.",
    },
    'alta-en-prote-na': {
      nombre: 'Riche en protéines',
      descripcion: 'Privilégie les protéines pour la recomposition corporelle et la satiété.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Faible en glucides et riche en bonnes graisses.',
    },
    vegetariana: {
      nombre: 'Végétarienne',
      descripcion: 'Sans viande, à base de légumes, légumineuses et céréales complètes.',
    },
    'ganancia-muscular': {
      nombre: 'Prise de muscle',
      descripcion: 'Excédent calorique avec des protéines élevées pour prendre de la masse musculaire.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Perte de graisse',
      descripcion: 'Déficit calorique avec des protéines élevées pour préserver le muscle.',
    },
    'sin-gluten': {
      nombre: 'Sans gluten',
      descripcion: 'Évite le blé et ses dérivés ; à base de maïs, riz, poisson et légumes.',
    },
  },
  dia: [
    { nombre: 'Avoine overnight à la banane', nota: 'Exemple : voici à quoi ressemble une journée enregistrée.' },
    { nombre: 'Yaourt grec aux noix' },
    { nombre: 'Poulet grillé avec riz et légumes' },
    { nombre: 'Saumon au four avec salade' },
  ],
  lista: {
    nombre: 'Exemple : Courses de la semaine',
    items: [
      'Blanc de poulet',
      'Saumon',
      'Œufs',
      'Tomate',
      'Avocat',
      'Épinards',
      'Yaourt grec',
      'Feta',
      "Flocons d'avoine",
      'Riz complet',
      "Huile d'olive",
      'Tortillas de maïs',
    ],
  },
}
