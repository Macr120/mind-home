// Configuración de las 4 láminas de tienda. Los TEXTOS viven en copia.json (uno
// por idioma); aquí solo va lo que no cambia de idioma: qué captura lleva cada
// lámina, su color, el encuadre del teléfono y dónde cae el chip flotante.
// El render y la exportación a PNG los hace exportar.mjs.

export const TAMANOS = [
  { id: 'play', w: 1080, h: 1920 }, // teléfono de Google Play
  { id: 'appstore', w: 1290, h: 2796 }, // 6.9" del App Store (iPhone 16/17 Pro Max)
]

/** Los 16 idiomas de la app (mismo orden que core/i18n/idiomas.ts). */
export const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

/** Idiomas que se escriben de derecha a izquierda. */
export const RTL = new Set(['ar'])

export const LAMINAS = [
  {
    n: 1,
    archivo: '01-casa.png',
    // `t1`/`s1`… son las claves de copia.json.
    texto: { titulo: 't1', sub: 's1' },
    glow: '#895ac6',
    acento: '#6d34b8',
    marca: true,
  },
  {
    n: 2,
    archivo: '02-cal.png',
    texto: { titulo: 't2', sub: 's2', chip: 'c2' },
    glow: '#da9425',
    acento: '#a86a00',
    chip: { arriba: 1010, lado: 'der' },
  },
  {
    n: 3,
    archivo: '03-mosaico.png',
    texto: { titulo: 't3', sub: 's3' },
    glow: '#c23a40',
    acento: '#c23a40',
  },
  {
    n: 4,
    archivo: '04-cama.png',
    texto: { titulo: 't4', sub: 's4', chip: 'c4' },
    glow: '#6f9b52',
    acento: '#4c7c30',
    chip: { arriba: 880, lado: 'izq' },
    // La conversación entera tiene que verse: teléfono más chico y cabecera más corta.
    tel: 0.66,
    cab: 0.25,
  },
]
