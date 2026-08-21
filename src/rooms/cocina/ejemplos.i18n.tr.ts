import type { TextosEjemplosCocina } from './ejemplos.i18n'

/** TURCO de la siembra de cocina (misión catálogos 2026). */
export const EJEMPLOS_COCINA_TR: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pesto makarna',
      carpeta: 'İtalyan',
      etiquetas: ['makarna', 'hızlı', 'vejetaryen'],
      ingredientes: ['200 g makarna', '4 yemek kaşığı pesto', '30 g parmesan peyniri', '1 yemek kaşığı zeytinyağı'],
      pasos: ['Makarnayı al dente haşla.', 'Süzüp pestoyla karıştır.', 'Rendelenmiş parmesanla servis et.'],
    },
    'pizza-margarita': {
      nombre: 'Margherita pizza',
      carpeta: 'İtalyan',
      etiquetas: ['fırın', 'vejetaryen'],
      ingredientes: ['1 pizza tabanı', '150 g domates sosu', '125 g mozzarella peyniri', 'Taze fesleğen yaprağı'],
      pasos: ['Sosu tabana yay.', 'Mozzarellayı ekle.', "220 °C'de 12 dakika pişir.", 'Fesleğenle tamamla.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Meksika',
      etiquetas: ['domuz', 'klasik'],
      ingredientes: ['400 g marine edilmiş domuz eti', '9 mısır tortillası', '1/2 ananas', '1 soğan', 'İsteğe göre kişniş'],
      pasos: ['Marine edilmiş domuz etini ızgarada pişir.', 'Ananasla birlikte ince doğra.', 'Soğan ve kişnişle tortillaların üzerinde servis et.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Yeşil chilaquiles',
      carpeta: 'Meksika',
      etiquetas: ['kahvaltı'],
      ingredientes: ['200 g mısır cipsi', '300 ml yeşil sos', '2 yumurta', '50 g taze peynir', 'İsteğe göre krema'],
      pasos: ['Yeşil sosu ısıt.', 'Cipsleri ekleyip karıştır.', 'Yumurta, peynir ve kremayla servis et.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Akdeniz salatası',
      carpeta: 'Sağlıklı',
      etiquetas: ['hafif', 'vejetaryen'],
      ingredientes: ['1 salatalık', '2 domates', '80 g feta peyniri', '10 zeytin', '2 yemek kaşığı zeytinyağı'],
      pasos: ['Sebzeleri doğra.', 'Feta ve zeytini ekle.', 'Zeytinyağıyla sosla.'],
    },
    'salm-n-al-horno': {
      nombre: 'Fırında somon',
      carpeta: 'Sağlıklı',
      etiquetas: ['balık', 'yüksek protein'],
      ingredientes: ['2 somon fileto (300 g)', '1 limon', '2 diş sarımsak', 'İsteğe göre dereotu ve tuz'],
      pasos: ['Somonu bir fırın tepsisine yerleştir.', 'Sarımsak, limon ve dereotuyla tatlandır.', "200 °C'de 18 dakika pişir."],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Izgara tavuk',
      carpeta: 'Sağlıklı',
      etiquetas: ['tavuk', 'yüksek protein'],
      ingredientes: ['300 g tavuk göğsü', '1 yemek kaşığı zeytinyağı', 'İsteğe göre baharat ve tuz', '1 limon'],
      pasos: ['Tavuğu tatlandır.', 'Her tarafını 6-7 dakika ızgarada pişir.', 'Dinlendirip limonla servis et.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Kinoa kâsesi',
      carpeta: 'Sağlıklı',
      etiquetas: ['vejetaryen', 'lif'],
      ingredientes: ['150 g kinoa', '100 g haşlanmış nohut', '1 havuç', '1/2 avokado', '2 yemek kaşığı zeytinyağı'],
      pasos: ['Kinoayı haşla.', 'Sebzeleri doğra.', 'Her şeyi karıştır ve sosla.'],
    },
    'avena-overnight': {
      nombre: 'Gece yulafı',
      carpeta: 'Sağlıklı',
      etiquetas: ['kahvaltı', 'hızlı'],
      ingredientes: ['60 g yulaf ezmesi', '200 ml süt', '1 muz', '1 yemek kaşığı chia tohumu'],
      pasos: ["Yulafı, sütü ve chia'yı karıştır.", 'Bütün gece buzdolabında dinlendir.', 'Dilimlenmiş muzla servis et.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Akdeniz',
      descripcion: 'Sebze, balık ve zeytinyağı açısından zengin. Dengeli ve sürdürülebilir.',
    },
    'alta-en-prote-na': {
      nombre: 'Yüksek proteinli',
      descripcion: 'Vücut kompozisyonu ve tokluk için proteine öncelik verir.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Düşük karbonhidratlı, sağlıklı yağlar açısından zengin.',
    },
    vegetariana: {
      nombre: 'Vejetaryen',
      descripcion: 'Etsiz; sebze, baklagil ve tam tahıllara dayalı.',
    },
    'ganancia-muscular': {
      nombre: 'Kas kütlesi artışı',
      descripcion: 'Kas kütlesi kazanmak için yüksek proteinli kalori fazlası.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Yağ kaybı',
      descripcion: 'Kası korumak için yüksek proteinli kalori açığı.',
    },
    'sin-gluten': {
      nombre: 'Glutensiz',
      descripcion: 'Buğday ve türevlerinden kaçınır; mısır, pirinç, balık ve sebzelere dayalı.',
    },
  },
  dia: [
    { nombre: 'Muzlu gece yulafı', nota: 'Örnek: kaydedilmiş bir gün böyle görünür.' },
    { nombre: 'Cevizli Yunan yoğurdu' },
    { nombre: 'Pirinç ve sebzeli ızgara tavuk' },
    { nombre: 'Salatalı fırında somon' },
  ],
  lista: {
    nombre: 'Örnek: Haftalık market alışverişi',
    items: [
      'Tavuk göğsü',
      'Somon',
      'Yumurta',
      'Domates',
      'Avokado',
      'Ispanak',
      'Yunan yoğurdu',
      'Feta peyniri',
      'Yulaf',
      'Esmer pirinç',
      'Zeytinyağı',
      'Mısır tortillası',
    ],
  },
}
