import type { TextosEjemplosCocina } from './ejemplos.i18n'

/** PORTUGUÉS de la siembra de cocina (misión catálogos 2026). */
export const EJEMPLOS_COCINA_PT: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Macarrão ao pesto',
      carpeta: 'Italiana',
      etiquetas: ['massa', 'rápida', 'vegetariana'],
      ingredientes: ['200 g de macarrão', '4 colheres de sopa de pesto', '30 g de queijo parmesão', '1 colher de sopa de azeite de oliva'],
      pasos: ['Cozinhe o macarrão al dente.', 'Escorra e misture com o pesto.', 'Sirva com parmesão ralado.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza margherita',
      carpeta: 'Italiana',
      etiquetas: ['forno', 'vegetariana'],
      ingredientes: ['1 base de pizza', '150 g de molho de tomate', '125 g de mussarela', 'Folhas de manjericão'],
      pasos: ['Espalhe o molho sobre a base.', 'Adicione a mussarela.', 'Asse a 220 °C por 12 min.', 'Finalize com manjericão.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Mexicana',
      etiquetas: ['porco', 'clássico'],
      ingredientes: ['400 g de carne de porco marinada', '9 tortilhas de milho', '1/2 abacaxi', '1 cebola', 'Coentro a gosto'],
      pasos: ['Grelhe a carne marinada.', 'Pique bem com o abacaxi.', 'Sirva nas tortilhas com cebola e coentro.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Chilaquiles verdes',
      carpeta: 'Mexicana',
      etiquetas: ['café da manhã'],
      ingredientes: ['200 g de tortilha chips', '300 ml de molho verde', '2 ovos', '50 g de queijo fresco', 'Creme a gosto'],
      pasos: ['Aqueça o molho verde.', 'Adicione os chips e misture.', 'Sirva com ovo, queijo e creme.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Salada mediterrânea',
      carpeta: 'Saudável',
      etiquetas: ['leve', 'vegetariana'],
      ingredientes: ['1 pepino', '2 tomates', '80 g de queijo feta', '10 azeitonas', '2 colheres de sopa de azeite de oliva'],
      pasos: ['Pique os vegetais.', 'Adicione a feta e as azeitonas.', 'Tempere com azeite de oliva.'],
    },
    'salm-n-al-horno': {
      nombre: 'Salmão assado',
      carpeta: 'Saudável',
      etiquetas: ['peixe', 'alta proteína'],
      ingredientes: ['2 filés de salmão (300 g)', '1 limão', '2 dentes de alho', 'Endro e sal a gosto'],
      pasos: ['Coloque o salmão em uma assadeira.', 'Tempere com alho, limão e endro.', 'Asse a 200 °C por 18 min.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Frango grelhado',
      carpeta: 'Saudável',
      etiquetas: ['frango', 'alta proteína'],
      ingredientes: ['300 g de peito de frango', '1 colher de sopa de azeite de oliva', 'Temperos e sal a gosto', '1 limão'],
      pasos: ['Tempere o frango.', 'Grelhe de 6 a 7 min de cada lado.', 'Deixe descansar e sirva com limão.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Bowl de quinoa',
      carpeta: 'Saudável',
      etiquetas: ['vegetariana', 'fibras'],
      ingredientes: ['150 g de quinoa', '100 g de grão-de-bico cozido', '1 cenoura', '1/2 abacate', '2 colheres de sopa de azeite de oliva'],
      pasos: ['Cozinhe a quinoa.', 'Pique os vegetais.', 'Misture tudo e tempere.'],
    },
    'avena-overnight': {
      nombre: 'Aveia overnight',
      carpeta: 'Saudável',
      etiquetas: ['café da manhã', 'rápida'],
      ingredientes: ['60 g de aveia', '200 ml de leite', '1 banana', '1 colher de sopa de sementes de chia'],
      pasos: ['Misture a aveia, o leite e a chia.', 'Leve à geladeira durante a noite.', 'Sirva com banana fatiada.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Mediterrânea',
      descripcion: 'Rica em vegetais, peixe e azeite de oliva. Equilibrada e sustentável.',
    },
    'alta-en-prote-na': {
      nombre: 'Alta em proteína',
      descripcion: 'Prioriza proteína para recomposição corporal e saciedade.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Baixa em carboidratos e alta em gorduras saudáveis.',
    },
    vegetariana: {
      nombre: 'Vegetariana',
      descripcion: 'Sem carne, baseada em vegetais, leguminosas e cereais integrais.',
    },
    'ganancia-muscular': {
      nombre: 'Ganho muscular',
      descripcion: 'Superávit calórico com proteína alta para ganhar massa muscular.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Perda de gordura',
      descripcion: 'Déficit calórico com proteína alta para preservar o músculo.',
    },
    'sin-gluten': {
      nombre: 'Sem glúten',
      descripcion: 'Evita o trigo e derivados; baseada em milho, arroz, peixe e vegetais.',
    },
  },
  dia: [
    { nombre: 'Aveia overnight com banana', nota: 'Exemplo: assim fica um dia registrado.' },
    { nombre: 'Iogurte grego com nozes' },
    { nombre: 'Frango grelhado com arroz e legumes' },
    { nombre: 'Salmão assado com salada' },
  ],
  lista: {
    nombre: 'Exemplo: Compras da semana',
    items: [
      'Peito de frango',
      'Salmão',
      'Ovos',
      'Tomate',
      'Abacate',
      'Espinafre',
      'Iogurte grego',
      'Queijo feta',
      'Aveia',
      'Arroz integral',
      'Azeite de oliva',
      'Tortilhas de milho',
    ],
  },
}
