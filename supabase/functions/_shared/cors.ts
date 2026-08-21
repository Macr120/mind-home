/** CORS y respuestas JSON compartidas por las Edge Functions. */

/**
 * Orígenes permitidos, coma-separados en el secreto `CORS_ORIGENES` (dominio de
 * la app, dominio de la web de pago, https://localhost y capacitor://localhost
 * para el APK, http://localhost:5173/5174 para dev). Sin definir → solo se
 * aceptan orígenes locales de desarrollo; NUNCA '*' (fail-closed en producción,
 * donde `CORS_ORIGENES` siempre está puesto).
 */
const ORIGENES = (Deno.env.get('CORS_ORIGENES') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const BASE: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const COMODIN: Record<string, string> = { ...BASE, 'Access-Control-Allow-Origin': '*' }

/** Un origen local de desarrollo (cuando no hay allowlist configurada). */
function esLocal(origen: string): boolean {
  return (
    /^https?:\/\/localhost(:\d+)?$/.test(origen) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origen) ||
    origen === 'capacitor://localhost'
  )
}

/** Cabeceras CORS de la petición: eco del Origin solo si está permitido. */
export function corsDe(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? ''
  // Producción: allowlist explícita en CORS_ORIGENES.
  if (ORIGENES.length) {
    return {
      ...BASE,
      // Un origen ajeno recibe el primero de la lista: su navegador verá el
      // mismatch y bloqueará la respuesta.
      'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
      Vary: 'Origin',
    }
  }
  // Sin configurar (dev): solo orígenes locales; nunca '*'.
  if (esLocal(origen)) return { ...BASE, 'Access-Control-Allow-Origin': origen, Vary: 'Origin' }
  return { ...BASE, Vary: 'Origin' }
}

/** Respuesta al preflight OPTIONS, o null si no aplica. */
export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsDe(req) })
  return null
}

/**
 * `cors` sale de `corsDe(req)` en los proxies que responde un navegador; el
 * webhook (servidor a servidor, sin Origin) puede omitirlo.
 */
export function json(cuerpo: unknown, status = 200, cors: Record<string, string> = COMODIN): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
