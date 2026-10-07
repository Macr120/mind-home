/**
 * Moderación de lo que se le pide a la IA de imágenes (Apple 1.1/1.2), ANTES de
 * cobrar y de llamar al proveedor:
 *
 * 1. La lista corta de palabras: espejo EXACTO de `src/core/moderacion/palabras.ts`
 *    y de `texto_prohibido()` (20261007000101_moderacion.sql). Si cambias una,
 *    cambia las tres.
 * 2. El endpoint de moderación de OpenAI (`omni-moderation-latest`, gratis) con
 *    la misma `OPENAI_API_KEY` que ya usan ia-imagen e ia-chat. Mira el prompt
 *    y, si la hay, la foto de referencia.
 *
 * Falla ABIERTO solo cuando no hay veredicto (sin clave, red caída, HTTP de
 * error o JSON raro): queda en el log y se sigue. Un `flagged` siempre bloquea.
 */

const PALABRAS_PROHIBIDAS: readonly string[] = [
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

export function textoProhibido(texto: string): boolean {
  const n = ` ${texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
  return PALABRAS_PROHIBIDAS.some((p) => n.includes(` ${p} `))
}

/** La moderación no debe comerse el presupuesto de la generación. */
const TIMEOUT_MS = 10_000

/** true = se puede generar. */
export async function promptPermitido(
  prompt: string,
  referencia: { base64: string; mime: string } | null = null,
): Promise<boolean> {
  if (textoProhibido(prompt)) return false
  const key = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!key) return true
  const input: unknown[] = [{ type: 'text', text: prompt }]
  if (referencia) {
    input.push({ type: 'image_url', image_url: { url: `data:${referencia.mime};base64,${referencia.base64}` } })
  }
  try {
    const resp = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({ model: 'omni-moderation-latest', input }),
    })
    if (!resp.ok) {
      console.warn(`moderacion: http ${resp.status}; se deja pasar`)
      return true
    }
    const data = (await resp.json()) as { results?: { flagged?: boolean }[] }
    return !(data.results ?? []).some((r) => r.flagged === true)
  } catch (e) {
    console.warn(`moderacion: sin veredicto (${e instanceof Error ? e.message : 'error'}); se deja pasar`)
    return true
  }
}
