// Contenido del ejemplo de fábrica de arte, por idioma. Vive aparte de
// `dict.ts` a propósito: en cuanto se crea es dato del usuario, no interfaz.
// El dibujo lo pinta `ejemplos.ts` con canvas; aquí solo van sus nombres.

export const TEXTOS_ARTE = {
  es: {
    dibujo: 'Tarde en el valle',
    capaCielo: 'Cielo',
    capaColinas: 'Colinas',
    capaFrente: 'Árbol y camino',
  },
  en: {
    dibujo: 'Afternoon in the valley',
    capaCielo: 'Sky',
    capaColinas: 'Hills',
    capaFrente: 'Tree and path',
  },
  pt: {
    dibujo: 'Tarde no vale',
    capaCielo: 'Céu',
    capaColinas: 'Colinas',
    capaFrente: 'Árvore e caminho',
  },
  fr: {
    dibujo: 'Après-midi dans la vallée',
    capaCielo: 'Ciel',
    capaColinas: 'Collines',
    capaFrente: 'Arbre et chemin',
  },
  de: {
    dibujo: 'Nachmittag im Tal',
    capaCielo: 'Himmel',
    capaColinas: 'Hügel',
    capaFrente: 'Baum und Weg',
  },
  it: {
    dibujo: 'Pomeriggio nella valle',
    capaCielo: 'Cielo',
    capaColinas: 'Colline',
    capaFrente: 'Albero e sentiero',
  },
  ja: {
    dibujo: '谷の午後',
    capaCielo: '空',
    capaColinas: '丘',
    capaFrente: '木と道',
  },
  zh: {
    dibujo: '山谷的午后',
    capaCielo: '天空',
    capaColinas: '山丘',
    capaFrente: '树与小路',
  },
  ko: {
    dibujo: '골짜기의 오후',
    capaCielo: '하늘',
    capaColinas: '언덕',
    capaFrente: '나무와 길',
  },
  ru: {
    dibujo: 'Вечер в долине',
    capaCielo: 'Небо',
    capaColinas: 'Холмы',
    capaFrente: 'Дерево и тропа',
  },
  hi: {
    dibujo: 'घाटी में दोपहर',
    capaCielo: 'आकाश',
    capaColinas: 'पहाड़ियाँ',
    capaFrente: 'पेड़ और रास्ता',
  },
  tr: {
    dibujo: 'Vadide öğleden sonra',
    capaCielo: 'Gökyüzü',
    capaColinas: 'Tepeler',
    capaFrente: 'Ağaç ve yol',
  },
  id: {
    dibujo: 'Sore di lembah',
    capaCielo: 'Langit',
    capaColinas: 'Bukit',
    capaFrente: 'Pohon dan jalan',
  },
  pl: {
    dibujo: 'Popołudnie w dolinie',
    capaCielo: 'Niebo',
    capaColinas: 'Wzgórza',
    capaFrente: 'Drzewo i ścieżka',
  },
  ar: {
    dibujo: 'عصر في الوادي',
    capaCielo: 'السماء',
    capaColinas: 'التلال',
    capaFrente: 'الشجرة والطريق',
  },
  nl: {
    dibujo: 'Middag in de vallei',
    capaCielo: 'Lucht',
    capaColinas: 'Heuvels',
    capaFrente: 'Boom en pad',
  },
}
