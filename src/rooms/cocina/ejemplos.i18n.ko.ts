import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * COREANO de la siembra de cocina. Traducción de `ejemplos.i18n.en.ts`
 * (referencia curada) siguiendo el glosario y las decisiones de
 * `scripts/traducir/glosario.mjs` (DECISIONES.catalogos2026.cocina).
 */
export const EJEMPLOS_COCINA_KO: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: '페스토 파스타',
      carpeta: '이탈리안',
      etiquetas: ['파스타', '간단', '채식'],
      ingredientes: ['파스타 200g', '페스토 4큰술', '파르메산 치즈 30g', '올리브유 1큰술'],
      pasos: ['파스타를 알덴테로 삶아요.', '물기를 빼고 페스토와 섞어요.', '파르메산 치즈를 갈아 올려 마무리해요.'],
    },
    'pizza-margarita': {
      nombre: '마르게리타 피자',
      carpeta: '이탈리안',
      etiquetas: ['오븐', '채식'],
      ingredientes: ['피자 도우 1장', '토마토 소스 150g', '모짜렐라 치즈 125g', '바질 잎'],
      pasos: ['도우에 토마토 소스를 발라요.', '모짜렐라 치즈를 올려요.', '220℃ 오븐에서 12분 구워요.', '바질을 올려 마무리해요.'],
    },
    'tacos-al-pastor': {
      nombre: '타코 알 파스토르',
      carpeta: '멕시칸',
      etiquetas: ['돼지고기', '클래식'],
      ingredientes: ['양념 돼지고기 400g', '옥수수 토르티야 9장', '파인애플 1/2개', '양파 1개', '고수 약간'],
      pasos: ['양념한 돼지고기를 구워요.', '파인애플과 함께 잘게 다져요.', '토르티야에 양파와 고수를 곁들여 담아요.'],
    },
    'chilaquiles-verdes': {
      nombre: '그린 칠라킬레스',
      carpeta: '멕시칸',
      etiquetas: ['아침'],
      ingredientes: ['토르티야 칩 200g', '살사 베르데 300ml', '달걀 2개', '프레시 치즈 50g', '사워크림 약간'],
      pasos: ['살사 베르데를 데워요.', '토르티야 칩을 넣고 버무려요.', '달걀, 치즈, 사워크림을 곁들여 담아요.'],
    },
    'ensalada-mediterr-nea': {
      nombre: '지중해 샐러드',
      carpeta: '건강식',
      etiquetas: ['가벼운', '채식'],
      ingredientes: ['오이 1개', '토마토 2개', '페타 치즈 80g', '올리브 10알', '올리브유 2큰술'],
      pasos: ['채소를 썰어요.', '페타 치즈와 올리브를 더해요.', '올리브유를 둘러요.'],
    },
    'salm-n-al-horno': {
      nombre: '구운 연어',
      carpeta: '건강식',
      etiquetas: ['생선', '고단백'],
      ingredientes: ['연어 필레 2장(300g)', '레몬 1개', '마늘 2쪽', '딜과 소금 약간'],
      pasos: ['연어를 팬에 올려요.', '마늘, 레몬, 딜로 간해요.', '200℃ 오븐에서 18분 구워요.'],
    },
    'pollo-a-la-parrilla': {
      nombre: '그릴 치킨',
      carpeta: '건강식',
      etiquetas: ['닭고기', '고단백'],
      ingredientes: ['닭가슴살 300g', '올리브유 1큰술', '향신료와 소금 약간', '레몬 1개'],
      pasos: ['닭고기에 간을 해요.', '양면을 6~7분씩 구워요.', '잠시 두었다가 레몬을 곁들여 담아요.'],
    },
    'bowl-de-quinoa': {
      nombre: '퀴노아 보울',
      carpeta: '건강식',
      etiquetas: ['채식', '식이섬유'],
      ingredientes: ['퀴노아 150g', '삶은 병아리콩 100g', '당근 1개', '아보카도 1/2개', '올리브유 2큰술'],
      pasos: ['퀴노아를 삶아요.', '채소를 썰어요.', '모두 섞어 드레싱을 둘러요.'],
    },
    'avena-overnight': {
      nombre: '오버나이트 오츠',
      carpeta: '건강식',
      etiquetas: ['아침', '간단'],
      ingredientes: ['오트밀 60g', '우유 200ml', '바나나 1개', '치아씨 1큰술'],
      pasos: ['오트밀, 우유, 치아씨를 섞어요.', '냉장고에서 하룻밤 재워요.', '바나나를 슬라이스해 올려요.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: '지중해식',
      descripcion: '채소, 생선, 올리브유가 풍부해 균형 잡히고 오래 유지하기 좋아요.',
    },
    'alta-en-prote-na': {
      nombre: '고단백',
      descripcion: '체형 관리와 포만감을 위해 단백질을 우선해요.',
    },
    keto: {
      nombre: '케토',
      descripcion: '탄수화물은 줄이고 건강한 지방은 늘린 식단이에요.',
    },
    vegetariana: {
      nombre: '채식',
      descripcion: '고기 없이 채소, 콩류, 통곡물을 중심으로 해요.',
    },
    'ganancia-muscular': {
      nombre: '근육 증량',
      descripcion: '근육량을 늘리기 위해 고단백에 칼로리를 더한 식단이에요.',
    },
    'p-rdida-de-grasa': {
      nombre: '체지방 감량',
      descripcion: '근육은 지키면서 지방을 줄이기 위해 고단백에 칼로리를 낮춘 식단이에요.',
    },
    'sin-gluten': {
      nombre: '글루텐프리',
      descripcion: '밀과 밀가루 제품을 피하고 옥수수, 쌀, 생선, 채소를 중심으로 해요.',
    },
  },
  dia: [
    { nombre: '바나나 오버나이트 오츠', nota: '예시: 하루 기록은 이런 모습이에요.' },
    { nombre: '호두를 곁들인 그릭 요거트' },
    { nombre: '그릴 치킨과 밥, 채소' },
    { nombre: '구운 연어와 샐러드' },
  ],
  lista: {
    nombre: '예시: 주간 장보기',
    items: [
      '닭가슴살',
      '연어',
      '달걀',
      '토마토',
      '아보카도',
      '시금치',
      '그릭 요거트',
      '페타 치즈',
      '오트밀',
      '현미',
      '올리브유',
      '옥수수 토르티야',
    ],
  },
}
