/**
 * Dominios de las páginas visitadas. Módulo HOJA (sin imports): lo usan
 * `enlaces.ts`, el store del navegador y `db.ts`, y no puede tirar de nada de
 * ellos sin formar un ciclo.
 */

/**
 * Sufijos públicos de DOS niveles más comunes: bajo ellos el dominio
 * registrable lleva un nivel más (`bbc.co.uk`, no `co.uk`). Lista corta a
 * propósito — no es la Public Suffix List entera, solo lo que se ve a diario.
 */
const SUFIJOS_DOBLES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'com.mx', 'com.br', 'com.ar', 'com.co', 'com.pe', 'com.ve', 'com.ec', 'com.uy', 'com.py', 'com.bo',
  'com.gt', 'com.sv', 'com.hn', 'com.ni', 'com.do', 'com.pr', 'com.cu', 'com.pa', 'com.cr',
  'com.au', 'co.nz', 'co.jp', 'co.kr', 'co.in', 'co.za', 'co.il', 'co.id', 'co.th',
  'com.tr', 'com.cn', 'com.hk', 'com.tw', 'com.sg', 'com.my', 'com.ph', 'com.vn',
  'com.eg', 'com.sa', 'com.pk', 'com.bd', 'com.ng', 'com.ua', 'com.pl', 'com.ru',
  'gob.mx', 'gov.br', 'gob.ar', 'gov.au', 'gov.in', 'edu.mx', 'edu.ar', 'edu.co', 'edu.pe',
])

/** Dominio legible de una URL (sin `www.`); la URL cruda si no se puede leer. */
export function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Dominio REGISTRABLE (`google.com` para `mail.google.com` y `docs.google.com`):
 * la unidad por la que se agrupan visitas, sitios y categorías. Sin esto, cada
 * subdominio contaba como un sitio distinto y el tiempo se partía.
 */
export function sitioDe(url: string): string {
  const host = hostDe(url).toLowerCase()
  // IPv4 (y localhost): no hay nada que recortar.
  if (!host.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host
  const partes = host.split('.')
  if (partes.length <= 2) return host
  const doble = partes.slice(-2).join('.')
  return SUFIJOS_DOBLES.has(doble) ? partes.slice(-3).join('.') : doble
}
