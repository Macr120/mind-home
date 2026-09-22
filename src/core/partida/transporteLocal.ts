/**
 * Transporte de pruebas sobre BroadcastChannel, con red simulada. Es el banco
 * donde se verifica cada fase: en LAN a 0 ms no se ve ninguno de los problemas
 * que tiene que resolver el interpolador.
 */
import type { Evento } from './protocolo'
import type { PerfilRed, Transporte } from './transporte'

/** Perfil de referencia de todas las aceptaciones del plan. */
export const PERFIL_POR_DEFECTO: PerfilRed = { lag: 120, jitter: 40, perdida: 0.03 }

let perfil: PerfilRed = { ...PERFIL_POR_DEFECTO }
let perdidos = 0

/** Ajustable en caliente desde el HUD de DEV; vale para los canales ya abiertos. */
export function fijarPerfilRed(p: PerfilRed): void {
  perfil = { ...p }
}

export function perfilRed(): PerfilRed {
  return perfil
}

/** Mensajes que la red simulada ha tirado (HUD de DEV). */
export function perdidosSimulados(): number {
  return perdidos
}

/**
 * `simular: false` apaga la red simulada de este canal (lag, jitter y pérdidas):
 * lo usan los espacios compartidos, donde perder un aviso de `miembros` no es un
 * problema que haya que ejercitar sino una prueba rota.
 */
export function transporteLocal<E extends string = Evento>(
  canal: string,
  puedePublicar = true,
  opciones?: { simular?: boolean },
): Transporte<E> {
  const simular = opciones?.simular !== false
  const oyentes = new Map<E, Set<(p: unknown) => void>>()
  let bc: BroadcastChannel | null = null
  try {
    bc = new BroadcastChannel(canal)
  } catch {
    // Sin BroadcastChannel esta ventana simplemente no ve a nadie; no es motivo
    // para tumbar la escena.
    bc = null
  }

  if (bc) {
    bc.onmessage = (e: MessageEvent<unknown>) => {
      const d = e.data as { ev?: unknown; p?: unknown } | null
      if (!d || typeof d.ev !== 'string') return
      if (simular && Math.random() < perfil.perdida) {
        perdidos += 1
        return
      }
      const ev = d.ev as E
      const p = d.p
      const entregar = () => {
        const cbs = oyentes.get(ev)
        if (!cbs) return
        for (const cb of cbs) cb(p)
      }
      if (!simular) {
        entregar()
        return
      }
      // La red se simula EN RECEPCIÓN: cada mensaje espera su propio timer, así
      // que el reordenamiento aparece solo (que es lo que hay que probar).
      const espera = Math.max(0, perfil.lag + (Math.random() * 2 - 1) * perfil.jitter)
      setTimeout(entregar, espera)
    }
  }

  return {
    enviar(ev, payload) {
      if (!puedePublicar) return
      bc?.postMessage({ ev, p: payload })
    },
    on(ev, cb) {
      let cbs = oyentes.get(ev)
      if (!cbs) {
        cbs = new Set()
        oyentes.set(ev, cbs)
      }
      cbs.add(cb)
    },
    cerrar() {
      // Los timers en vuelo siguen venciendo, pero ya no hay a quién entregar.
      oyentes.clear()
      bc?.close()
      bc = null
    },
  }
}
