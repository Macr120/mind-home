import type { Idioma } from '../i18n/idiomas'

/**
 * Nombres simpáticos para los animales de la granja (se asignan al azar al colocar),
 * uno por idioma y EN EL MISMO ORDEN: la demo traduce por posición los que su
 * `casa.json` trae en español (`nombreAnimalEn`). Sin imports de ejecución: este
 * módulo lo carga `db.ts`.
 */
const NOMBRES_ANIMAL: { es: string[] } & Partial<Record<Idioma, string[]>> = {
  es: [
    'Pepa', 'Lola', 'Coco', 'Canela', 'Nube', 'Motas', 'Trufa', 'Bruno',
    'Rosita', 'Pancho', 'Manchas', 'Luna', 'Copito', 'Greta', 'Olivo', 'Pipa',
    'Turrón', 'Bombón', 'Chispa', 'Nieve', 'Caramelo', 'Frijol', 'Mora', 'Paco',
    'Tita', 'Bigotes', 'Galleta', 'Romero', 'Perla', 'Choco', 'Brincos', 'Pimienta',
    'Algodón',
  ],
  en: [
    'Penny', 'Lola', 'Coco', 'Cinnamon', 'Cloud', 'Freckles', 'Truffle', 'Bruno',
    'Rosie', 'Frankie', 'Spots', 'Luna', 'Snowflake', 'Greta', 'Olive', 'Pip',
    'Nougat', 'Bonbon', 'Sparky', 'Snowy', 'Caramel', 'Bean', 'Berry', 'Buddy',
    'Tilly', 'Whiskers', 'Cookie', 'Rosemary', 'Pearl', 'Cocoa', 'Hopper', 'Pepper',
    'Cotton',
  ],
  pt: [
    'Zefa', 'Lola', 'Coquinho', 'Canela', 'Nuvem', 'Bolinha', 'Trufa', 'Bruno',
    'Rosinha', 'Chico', 'Manchinha', 'Luna', 'Floquinho', 'Greta', 'Azeitona', 'Pipa',
    'Paçoca', 'Bombom', 'Faísca', 'Neve', 'Caramelo', 'Feijão', 'Amora', 'Juca',
    'Tita', 'Bigode', 'Biscoito', 'Alecrim', 'Pérola', 'Cacau', 'Pulinho', 'Pimenta',
    'Algodão',
  ],
  fr: [
    'Pépette', 'Lola', 'Coco', 'Cannelle', 'Nuage', 'Mouchette', 'Truffe', 'Bruno',
    'Rosette', 'Gaston', 'Domino', 'Luna', 'Flocon', 'Margot', 'Olivier', 'Pistache',
    'Nougat', 'Bonbon', 'Étincelle', 'Neige', 'Caramel', 'Haricot', 'Mûre', 'Fanfan',
    'Titine', 'Moustache', 'Biscuit', 'Romarin', 'Perle', 'Choco', 'Cabriole', 'Poivre',
    'Coton',
  ],
  de: [
    'Pepi', 'Lola', 'Coco', 'Zimt', 'Wölkchen', 'Pünktchen', 'Trüffel', 'Bruno',
    'Rosi', 'Franzl', 'Flecki', 'Luna', 'Flöckchen', 'Greta', 'Olive', 'Körnchen',
    'Nougat', 'Praline', 'Funke', 'Schneeball', 'Karamell', 'Bohne', 'Brombeere', 'Fritz',
    'Tilda', 'Schnurrbart', 'Keks', 'Rosmarin', 'Perle', 'Schoko', 'Hopsi', 'Pfeffer',
    'Wattebausch',
  ],
  it: [
    'Peppina', 'Lola', 'Coco', 'Cannella', 'Nuvola', 'Puntino', 'Tartufo', 'Bruno',
    'Rosina', 'Ciccio', 'Macchia', 'Luna', 'Fiocco', 'Greta', 'Olivo', 'Semino',
    'Torrone', 'Pralina', 'Scintilla', 'Neve', 'Caramella', 'Fagiolino', 'Mora', 'Checco',
    'Titti', 'Baffo', 'Biscotto', 'Rosmarino', 'Perla', 'Cacao', 'Saltello', 'Pepe',
    'Batuffolo',
  ],
  ja: [
    'ハナコ', 'ローラ', 'ココ', 'シナモン', 'ワタグモ', 'ソバカス', 'トリュフ', 'ムサシ',
    'サクラ', 'タロウ', 'ブチ', 'ルナ', 'コユキ', 'グレタ', 'オリーブ', 'ゴマ',
    'ヌガー', 'マシュマロ', 'ヒバナ', 'ユキ', 'キャラメル', 'マメ', 'ベリー', 'ジロウ',
    'チヨ', 'ヒゲ', 'クッキー', 'ローズマリー', 'パール', 'チョコ', 'ピョンタ', 'コショウ',
    'コットン',
  ],
  zh: [
    '佩佩', '露露', '可可', '肉桂', '云朵', '点点', '松露', '大壮',
    '小玫', '阿福', '花花', '月月', '雪花', '格格', '橄榄', '瓜子',
    '牛轧糖', '甜甜', '火花', '小雪', '焦糖', '豆豆', '莓莓', '铁蛋',
    '妞妞', '小胡子', '饼干', '迷迭香', '珍珠', '巧克力', '跳跳', '胡椒',
    '棉花',
  ],
  ko: [
    '복순이', '옥자', '코코', '시나몬', '구름이', '점박이', '트러플', '덕구',
    '꽃분이', '만복이', '얼룩이', '달이', '눈송이', '말순이', '올리브', '참깨',
    '강정이', '봉봉', '반짝이', '백설이', '캐러멜', '콩이', '오디', '삼돌이',
    '순덕이', '수염이', '쿠키', '로즈메리', '진주', '초코', '깡충이', '후추',
    '솜이',
  ],
  ru: [
    'Дуся', 'Люся', 'Кокос', 'Корица', 'Облачко', 'Крапинка', 'Трюфель', 'Борька',
    'Розочка', 'Яшка', 'Пятнышко', 'Луна', 'Снежинка', 'Глаша', 'Оливка', 'Семечка',
    'Пряник', 'Конфетка', 'Искорка', 'Белоснежка', 'Карамелька', 'Фасолька', 'Ежевичка', 'Гоша',
    'Мотя', 'Усач', 'Печенька', 'Розмарин', 'Жемчужинка', 'Шоколадка', 'Попрыгун', 'Перчинка',
    'Пушинка',
  ],
  hi: [
    'पिंकी', 'लाली', 'कोको', 'दालचीनी', 'बादल', 'बिंदी', 'लड्डू', 'ब्रूनो',
    'गुलाबो', 'गोलू', 'धब्बू', 'चंदा', 'बर्फ़ी', 'धन्नो', 'जैतून', 'गुठली',
    'चिक्की', 'टॉफ़ी', 'चिंगारी', 'हिमानी', 'मिश्री', 'राजमा', 'जामुन', 'बंटी',
    'चुटकी', 'मुच्छड़', 'बिस्कुट', 'पुदीना', 'मोती', 'चॉको', 'फुदकू', 'मिर्ची',
    'रुई',
  ],
  tr: [
    'Sarıkız', 'Lale', 'Boncuk', 'Tarçın', 'Bulut', 'Çilli', 'Trüf', 'Tosun',
    'Gonca', 'Tombik', 'Benekli', 'Dolunay', 'Kar Tanesi', 'Greta', 'Zeytin', 'Çekirdek',
    'Lokum', 'Şeker', 'Kıvılcım', 'Kartopu', 'Karamel', 'Fasulye', 'Dut', 'Duman',
    'Dudu', 'Bıyık', 'Kurabiye', 'Biberiye', 'İnci', 'Kakao', 'Zıpzıp', 'Karabiber',
    'Pamuk',
  ],
  id: [
    'Neneng', 'Lola', 'Coco', 'Kayu Manis', 'Awan', 'Bintik', 'Trufel', 'Bruno',
    'Mawar', 'Paijo', 'Belang', 'Bulan', 'Kepingan Salju', 'Greta', 'Pandan', 'Kuaci',
    'Dodol', 'Bonbon', 'Percik', 'Salju', 'Karamel', 'Kacang', 'Murbei', 'Bejo',
    'Tita', 'Kumis', 'Biskuit', 'Rosmarin', 'Mutiara', 'Cokelat', 'Lincah', 'Lada',
    'Kapas',
  ],
  pl: [
    'Józia', 'Lola', 'Kokos', 'Cynamonka', 'Chmurka', 'Kropka', 'Trufla', 'Bruno',
    'Różyczka', 'Franek', 'Łatka', 'Luna', 'Płatek', 'Greta', 'Oliwka', 'Pestka',
    'Nugat', 'Pralinka', 'Iskierka', 'Śnieżka', 'Karmelek', 'Fasolka', 'Jeżynka', 'Zenek',
    'Tosia', 'Wąsik', 'Ciasteczko', 'Rozmaryn', 'Perełka', 'Czekoladka', 'Skoczek', 'Pieprzyk',
    'Wacik',
  ],
  nl: [
    'Fien', 'Lotje', 'Coco', 'Kaneel', 'Wolkje', 'Spikkel', 'Truffel', 'Bram',
    'Roosje', 'Sjors', 'Vlekje', 'Luna', 'Sneeuwvlokje', 'Grietje', 'Olijf', 'Pip',
    'Nougat', 'Bonbon', 'Vonk', 'Sneeuwtje', 'Karamel', 'Boontje', 'Bes', 'Kees',
    'Tineke', 'Snorretje', 'Koekje', 'Rozemarijn', 'Parel', 'Chocolaatje', 'Huppel', 'Peper',
    'Pluisje',
  ],
  ar: [
    'ميمي', 'لولو', 'كوكو', 'قرفة', 'غيمة', 'نقطة', 'كمأة', 'بندق',
    'وردة', 'زعتر', 'بقعة', 'قمر', 'ندفة', 'غريتا', 'زيتون', 'سمسم',
    'حلاوة', 'بسبوسة', 'شرارة', 'ثلج', 'كراميل', 'فولة', 'توتة', 'دبدوب',
    'تيتا', 'أبو شنب', 'بسكوتة', 'روزماري', 'درّة', 'شوكو', 'نطّوط', 'فلفل',
    'قطنة',
  ],
}

const lista = (idioma: Idioma): string[] => NOMBRES_ANIMAL[idioma] ?? NOMBRES_ANIMAL.en ?? NOMBRES_ANIMAL.es

export const nombreAleatorio = (idioma: Idioma = 'es'): string => {
  const nombres = lista(idioma)
  return nombres[Math.floor(Math.random() * nombres.length)]
}

/** Un nombre de fábrica en español, en `idioma`; uno puesto a mano se queda como está. */
export function nombreAnimalEn(nombreEs: string, idioma: Idioma): string {
  const i = NOMBRES_ANIMAL.es.indexOf(nombreEs)
  return i < 0 ? nombreEs : (lista(idioma)[i] ?? nombreEs)
}
