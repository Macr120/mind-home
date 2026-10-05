/**
 * Credenciales TURN para la voz de las partidas (`core/partida/voz.ts`).
 *
 * Sin TURN, dos jugadores detrás de NAT simétrico o CGNAT (datos móviles,
 * redes de empresa) no conectan. Se usa el TURN de Cloudflare (Realtime): la
 * clave del TURN vive SOLO aquí como secreto y el cliente recibe credenciales
 * de corta duración, así nadie puede sacarla del bundle y gastar a nuestra
 * cuenta.
 *
 * Exige sesión (verify_jwt por defecto, como el buzón y las partidas: gratis
 * con solo tener cuenta) y limita la ráfaga por usuario.
 *
 * Secretos: CF_TURN_KEY_ID y CF_TURN_API_TOKEN (Cloudflare → Realtime → TURN
 * Server → la clave creada). Sin ellos responde `{ iceServers: [] }` y el
 * cliente se queda con STUN.
 *
 *   POST …/voz-turn → { iceServers: RTCIceServer[], ttl }
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe, clienteAdmin } from '../_shared/auth.ts'
import { dentroDeLimite } from '../_shared/limite.ts'

/** 4 h: de sobra para una tarde de juego; el cliente pide otras al caducar. */
const TTL = 4 * 3600

interface ServidorIce {
  urls: string | string[]
  username?: string
  credential?: string
}

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)

  if (!(await dentroDeLimite(clienteAdmin(), usuario.id, 'voz-turn', 30, 3600))) {
    return json({ error: 'limite' }, 429, cors)
  }

  const clave = Deno.env.get('CF_TURN_KEY_ID')
  const token = Deno.env.get('CF_TURN_API_TOKEN')
  if (!clave || !token) return json({ iceServers: [], ttl: 0 }, 200, cors)

  const resp = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${clave}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL }),
    },
  )
  if (!resp.ok) return json({ error: 'turn', status: resp.status }, 502, cors)

  const datos = (await resp.json()) as { iceServers?: ServidorIce | ServidorIce[] }
  const lista = Array.isArray(datos.iceServers) ? datos.iceServers : datos.iceServers ? [datos.iceServers] : []
  // Cloudflare recomienda quitar el puerto 53: los navegadores lo bloquean y
  // cada intento contra él se come el tiempo de espera de ICE.
  const iceServers = lista
    .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }))
    .filter((s) => s.urls.length > 0)

  return json({ iceServers, ttl: TTL }, 200, cors)
})
