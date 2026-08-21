import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * CHINO SIMPLIFICADO de la siembra de cocina. Traducción de `ejemplos.i18n.en.ts`
 * (referencia curada) siguiendo el glosario y las decisiones de
 * `scripts/traducir/glosario.mjs` (DECISIONES.catalogos2026.cocina).
 */
export const EJEMPLOS_COCINA_ZH: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: '青酱意面',
      carpeta: '意大利菜',
      etiquetas: ['意面', '快手', '素食'],
      ingredientes: ['意面200克', '青酱4汤匙', '帕玛森芝士30克', '橄榄油1汤匙'],
      pasos: ['把意面煮至弹牙。', '沥干后拌入青酱。', '撒上帕玛森芝士碎即可享用。'],
    },
    'pizza-margarita': {
      nombre: '玛格丽特披萨',
      carpeta: '意大利菜',
      etiquetas: ['烤箱', '素食'],
      ingredientes: ['披萨饼底1个', '番茄酱150克', '马苏里拉芝士125克', '罗勒叶'],
      pasos: ['把番茄酱涂抹在饼底上。', '铺上马苏里拉芝士。', '220℃烤12分钟。', '最后撒上罗勒叶。'],
    },
    'tacos-al-pastor': {
      nombre: '阿尔帕斯托塔可',
      carpeta: '墨西哥菜',
      etiquetas: ['猪肉', '经典'],
      ingredientes: ['腌猪肉400克', '玉米饼9张', '菠萝半个', '洋葱1个', '香菜适量'],
      pasos: ['将腌好的猪肉烤熟。', '和菠萝一起切碎。', '装入玉米饼，配洋葱和香菜享用。'],
    },
    'chilaquiles-verdes': {
      nombre: '绿莎莎奇拉基莱斯',
      carpeta: '墨西哥菜',
      etiquetas: ['早餐'],
      ingredientes: ['玉米片200克', '青莎莎酱300毫升', '鸡蛋2个', '鲜奶酪50克', '酸奶油适量'],
      pasos: ['加热青莎莎酱。', '加入玉米片拌匀。', '配鸡蛋、奶酪和酸奶油享用。'],
    },
    'ensalada-mediterr-nea': {
      nombre: '地中海沙拉',
      carpeta: '健康',
      etiquetas: ['清淡', '素食'],
      ingredientes: ['黄瓜1根', '番茄2个', '菲达芝士80克', '橄榄10颗', '橄榄油2汤匙'],
      pasos: ['把蔬菜切碎。', '加入菲达芝士和橄榄。', '淋上橄榄油。'],
    },
    'salm-n-al-horno': {
      nombre: '烤三文鱼',
      carpeta: '健康',
      etiquetas: ['鱼', '高蛋白'],
      ingredientes: ['三文鱼柳2块（300克）', '柠檬1个', '蒜瓣2瓣', '莳萝和盐适量'],
      pasos: ['把三文鱼放入烤盘。', '用蒜、柠檬和莳萝调味。', '200℃烤18分钟。'],
    },
    'pollo-a-la-parrilla': {
      nombre: '烤鸡肉',
      carpeta: '健康',
      etiquetas: ['鸡肉', '高蛋白'],
      ingredientes: ['鸡胸肉300克', '橄榄油1汤匙', '香料和盐适量', '柠檬1个'],
      pasos: ['给鸡肉调味。', '每面煎烤6-7分钟。', '静置后配柠檬享用。'],
    },
    'bowl-de-quinoa': {
      nombre: '藜麦bowl',
      carpeta: '健康',
      etiquetas: ['素食', '膳食纤维'],
      ingredientes: ['藜麦150克', '熟鹰嘴豆100克', '胡萝卜1根', '牛油果半个', '橄榄油2汤匙'],
      pasos: ['把藜麦煮熟。', '把蔬菜切碎。', '全部拌匀并淋上调味汁。'],
    },
    'avena-overnight': {
      nombre: '隔夜燕麦',
      carpeta: '健康',
      etiquetas: ['早餐', '快手'],
      ingredientes: ['燕麦60克', '牛奶200毫升', '香蕉1根', '奇亚籽1汤匙'],
      pasos: ['把燕麦、牛奶和奇亚籽拌匀。', '放入冰箱冷藏一整晚。', '配香蕉片享用。'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: '地中海饮食',
      descripcion: '富含蔬菜、鱼类和橄榄油，均衡又可持续。',
    },
    'alta-en-prote-na': {
      nombre: '高蛋白',
      descripcion: '以蛋白质为主，帮助塑形和增加饱腹感。',
    },
    keto: {
      nombre: '生酮',
      descripcion: '低碳水，富含优质脂肪。',
    },
    vegetariana: {
      nombre: '素食',
      descripcion: '不含肉类，以蔬菜、豆类和全谷物为主。',
    },
    'ganancia-muscular': {
      nombre: '增肌',
      descripcion: '高热量摄入配合高蛋白，帮助增加肌肉量。',
    },
    'p-rdida-de-grasa': {
      nombre: '减脂',
      descripcion: '热量赤字配合高蛋白，帮助减脂同时保留肌肉。',
    },
    'sin-gluten': {
      nombre: '无麸质',
      descripcion: '避免小麦及其制品，以玉米、大米、鱼类和蔬菜为主。',
    },
  },
  dia: [
    { nombre: '香蕉隔夜燕麦', nota: '示例：这是记录一天饮食的样子。' },
    { nombre: '希腊酸奶配核桃' },
    { nombre: '烤鸡肉配米饭和蔬菜' },
    { nombre: '烤三文鱼配沙拉' },
  ],
  lista: {
    nombre: '示例：每周采购清单',
    items: [
      '鸡胸肉',
      '三文鱼',
      '鸡蛋',
      '番茄',
      '牛油果',
      '菠菜',
      '希腊酸奶',
      '菲达芝士',
      '燕麦',
      '糙米',
      '橄榄油',
      '玉米饼',
    ],
  },
}
