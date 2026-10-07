/**
 * Filtro de palabras de lo que escriben las personas (alias, nombre visible,
 * mensajes del buzón, charla de partida, títulos de espacios y prompts de
 * imagen). Es el aviso INSTANTÁNEO del cliente: la barrera de verdad es
 * `texto_prohibido()` en SQL (20261007000101_moderacion.sql), con la MISMA lista,
 * y la de `supabase/functions/_shared/moderacion.ts` para las imágenes. Si
 * cambias una, cambia las tres.
 *
 * Lista corta y conservadora a propósito: insultos de odio graves y términos
 * sexuales explícitos o de abuso infantil en es/en/pt/fr/de/it. Nada de
 * palabras de uso común con doble sentido («kike» es un nombre, «pede» es
 * «pide» en portugués): un falso positivo le bloquea el alias a alguien sin
 * explicación posible.
 *
 * Se compara por PALABRA entera (o frase entera), sin mayúsculas ni acentos, y
 * con todo lo que no es letra o número convertido en espacio: así
 * `MARICÓN_99` cae y «Sudáfrica» no.
 */
export const PALABRAS_PROHIBIDAS: readonly string[] = [
  // es
  'maricon', 'maricones', 'sudaca', 'sudacas', 'negrata', 'negratas', 'pornografia infantil', 'porno infantil',
  // en
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'wetback', 'wetbacks', 'tranny', 'trannies',
  'child porn', 'childporn', 'blowjob', 'cumshot', 'gangbang',
  // pt
  'viado', 'viados',
  // fr
  'bougnoule', 'bougnoules', 'youpin', 'youpins', 'pedopornographie',
  // de
  'kanake', 'kanaken', 'neger', 'schwuchtel', 'schwuchteln', 'kinderporno', 'kinderpornos', 'kinderpornografie',
  // it
  'frocio', 'froci', 'ricchione', 'ricchioni', 'pedopornografia',
]

/** Minúsculas, sin acentos y con todo lo que no es [a-z0-9] hecho un solo espacio. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** ¿Lleva alguna palabra (o frase) de la lista? Mismo criterio que `texto_prohibido()`. */
export function textoProhibido(texto: string | null | undefined): boolean {
  if (!texto) return false
  const n = ` ${normalizar(texto)} `
  return PALABRAS_PROHIBIDAS.some((p) => n.includes(` ${p} `))
}
