/**
 * Órdenes del chat que abren el panel «Navegador» (deterministas, sin IA).
 * Módulo hoja: lo importan el ChatBox y el store del navegador.
 */

export type PestanaNav = 'historial' | 'sitios' | 'tiempo' | 'ajustes'

const RE: [RegExp, PestanaNav][] = [
  [/^(?:mi |el )?historial(?: web| de navegacion| del navegador)?$|^(?:web |browser )?history$/, 'historial'],
  [/^(?:mis |los )?sitios(?: web)?$|^(?:web )?sites$/, 'sitios'],
  [/^(?:mi )?tiempo (?:en internet|en la web|online|de navegacion|en el navegador)$|^(?:time online|screen time|internet time|web time)$/, 'tiempo'],
  [/^(?:ajustes|configuracion|opciones) del navegador$|^browser settings$/, 'ajustes'],
  [/^(?:el )?navegador$|^browser$/, 'historial'],
]

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ¿El mensaje pide ver el panel del navegador? Devuelve la pestaña que toca. */
export function ordenNavegador(texto: string): PestanaNav | null {
  const n = normalizar(texto)
  for (const [re, pestana] of RE) if (re.test(n)) return pestana
  return null
}

export type OrdenFoco = { accion: 'iniciar'; min?: number } | { accion: 'terminar' }

const RE_FOCO_INICIAR =
  /^(?:activa(?:r)? |empieza(?:r)? |inicia(?:r)? |pon(?:er)? )?(?:el )?(?:modo )?foco(?: de| por| durante)?(?:\s+(\d{1,3}))?\s*(?:min|minutos|m)?$|^(?:start )?focus(?: mode)?(?:\s+for)?(?:\s+(\d{1,3}))?\s*(?:min|minutes|m)?$/
const RE_FOCO_TERMINAR =
  /^(?:fin|termina(?:r)?|quita(?:r)?|sal(?:ir)?|apaga(?:r)?|para(?:r)?) (?:del |el |de |al )?(?:modo )?foco$|^(?:end|stop|quit) focus(?: mode)?$/

/** «modo foco», «foco 25 min», «fin del foco»… */
export function ordenFoco(texto: string): OrdenFoco | null {
  const n = normalizar(texto)
  if (RE_FOCO_TERMINAR.test(n)) return { accion: 'terminar' }
  const m = RE_FOCO_INICIAR.exec(n)
  if (!m) return null
  const min = Number(m[1] ?? m[2])
  return { accion: 'iniciar', min: Number.isFinite(min) && min > 0 ? min : undefined }
}
