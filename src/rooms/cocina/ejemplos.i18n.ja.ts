import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * JAPONÉS de la siembra de cocina. Traducción de `ejemplos.i18n.en.ts`
 * (referencia curada) siguiendo el glosario y las decisiones de
 * `scripts/traducir/glosario.mjs` (DECISIONES.catalogos2026.cocina).
 */
export const EJEMPLOS_COCINA_JA: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'パスタジェノベーゼ',
      carpeta: 'イタリアン',
      etiquetas: ['パスタ', '時短', 'ベジタリアン'],
      ingredientes: ['パスタ 200g', 'ジェノベーゼソース 大さじ4', 'パルメザンチーズ 30g', 'オリーブオイル 大さじ1'],
      pasos: ['パスタをアルデンテに茹でます。', '湯を切り、ジェノベーゼソースと和えます。', '削ったパルメザンチーズをかけて仕上げます。'],
    },
    'pizza-margarita': {
      nombre: 'マルゲリータピザ',
      carpeta: 'イタリアン',
      etiquetas: ['オーブン', 'ベジタリアン'],
      ingredientes: ['ピザ生地 1枚', 'トマトソース 150g', 'モッツァレラチーズ 125g', 'バジルの葉'],
      pasos: ['生地にトマトソースを塗り広げます。', 'モッツァレラチーズをのせます。', '220℃のオーブンで12分焼きます。', 'バジルを添えて仕上げます。'],
    },
    'tacos-al-pastor': {
      nombre: 'タコス・アル・パストール',
      carpeta: 'メキシカン',
      etiquetas: ['豚肉', '定番'],
      ingredientes: ['豚肉（下味付き） 400g', 'コーントルティーヤ 9枚', 'パイナップル 1/2個', '玉ねぎ 1個', 'パクチー お好みで'],
      pasos: ['下味をつけた豚肉を焼きます。', 'パイナップルと一緒に細かく刻みます。', 'トルティーヤに玉ねぎとパクチーを添えて盛り付けます。'],
    },
    'chilaquiles-verdes': {
      nombre: 'グリーンチラキレス',
      carpeta: 'メキシカン',
      etiquetas: ['朝食'],
      ingredientes: ['トルティーヤチップス 200g', 'サルサベルデ 300ml', '卵 2個', 'フレッシュチーズ 50g', 'サワークリーム お好みで'],
      pasos: ['サルサベルデを温めます。', 'トルティーヤチップスを加えて絡めます。', '卵、チーズ、サワークリームを添えて盛り付けます。'],
    },
    'ensalada-mediterr-nea': {
      nombre: '地中海サラダ',
      carpeta: 'ヘルシー',
      etiquetas: ['ライト', 'ベジタリアン'],
      ingredientes: ['きゅうり 1本', 'トマト 2個', 'フェタチーズ 80g', 'オリーブ 10粒', 'オリーブオイル 大さじ2'],
      pasos: ['野菜を刻みます。', 'フェタチーズとオリーブを加えます。', 'オリーブオイルをかけます。'],
    },
    'salm-n-al-horno': {
      nombre: '鮭のオーブン焼き',
      carpeta: 'ヘルシー',
      etiquetas: ['魚', '高タンパク'],
      ingredientes: ['鮭の切り身 2切れ（300g）', 'レモン 1個', 'にんにく 2片', 'ディルと塩 お好みで'],
      pasos: ['鮭を天板に並べます。', 'にんにく、レモン、ディルで味付けします。', '200℃のオーブンで18分焼きます。'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'グリルチキン',
      carpeta: 'ヘルシー',
      etiquetas: ['鶏肉', '高タンパク'],
      ingredientes: ['鶏むね肉 300g', 'オリーブオイル 大さじ1', 'スパイスと塩 お好みで', 'レモン 1個'],
      pasos: ['鶏肉に下味をつけます。', '両面を6〜7分ずつ焼きます。', '少し休ませてからレモンを添えて盛り付けます。'],
    },
    'bowl-de-quinoa': {
      nombre: 'キヌアボウル',
      carpeta: 'ヘルシー',
      etiquetas: ['ベジタリアン', '食物繊維'],
      ingredientes: ['キヌア 150g', 'ゆでひよこ豆 100g', 'にんじん 1本', 'アボカド 1/2個', 'オリーブオイル 大さじ2'],
      pasos: ['キヌアを茹でます。', '野菜を刻みます。', '全体を混ぜてドレッシングをかけます。'],
    },
    'avena-overnight': {
      nombre: 'オーバーナイトオーツ',
      carpeta: 'ヘルシー',
      etiquetas: ['朝食', '時短'],
      ingredientes: ['オーツ麦 60g', '牛乳 200ml', 'バナナ 1本', 'チアシード 大さじ1'],
      pasos: ['オーツ麦、牛乳、チアシードを混ぜます。', '冷蔵庫で一晩置きます。', '輪切りにしたバナナを添えて盛り付けます。'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: '地中海式',
      descripcion: '野菜、魚、オリーブオイルを中心とした、バランスが良く続けやすい食事です。',
    },
    'alta-en-prote-na': {
      nombre: '高タンパク',
      descripcion: '体の引き締めと満足感のために、タンパク質を重視します。',
    },
    keto: {
      nombre: 'ケト',
      descripcion: '糖質を抑え、良質な脂質を多く摂る食事です。',
    },
    vegetariana: {
      nombre: 'ベジタリアン',
      descripcion: '肉を使わず、野菜や豆類、全粒穀物を中心とした食事です。',
    },
    'ganancia-muscular': {
      nombre: '筋肉増量',
      descripcion: '筋肉量を増やすため、高タンパクでカロリーを多めに摂る食事です。',
    },
    'p-rdida-de-grasa': {
      nombre: '脂肪減少',
      descripcion: '筋肉を保ちながら脂肪を減らすため、高タンパクでカロリーを抑えた食事です。',
    },
    'sin-gluten': {
      nombre: 'グルテンフリー',
      descripcion: '小麦とその加工品を避け、とうもろこし、米、魚、野菜を中心とした食事です。',
    },
  },
  dia: [
    { nombre: 'バナナのオーバーナイトオーツ', nota: 'サンプル：記録した1日はこんな感じです。' },
    { nombre: 'くるみ入りギリシャヨーグルト' },
    { nombre: 'グリルチキンとご飯、野菜' },
    { nombre: '鮭のオーブン焼きとサラダ' },
  ],
  lista: {
    nombre: 'サンプル：今週の買い物',
    items: [
      '鶏むね肉',
      '鮭',
      '卵',
      'トマト',
      'アボカド',
      'ほうれん草',
      'ギリシャヨーグルト',
      'フェタチーズ',
      'オーツ麦',
      '玄米',
      'オリーブオイル',
      'コーントルティーヤ',
    ],
  },
}
