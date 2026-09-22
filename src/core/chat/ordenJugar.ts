import { normalizarOrden } from '../navegador/ordenes'
import { JUEGOS_INVITABLES, type JuegoInvitable } from '../partida/juegosInvitables'

/**
 * «jugar paintball con @ana», «tenis @ana», «4 en línea»: la orden determinista
 * (sin IA) que manda una solicitud de juego a un amigo. Hermana de
 * `ordenesMenu.ts` y `navegador/ordenes.ts`.
 *
 * La gramática es: [verbo] <juego> [conector] [@alias]. El verbo es opcional en
 * el hilo del asistente (ahí «tenis @ana» ya es inequívoco) y OBLIGATORIO
 * dentro del hilo de una persona, donde cualquier palabra suelta es un mensaje
 * normal que hay que dejar pasar.
 *
 * Cuando falta el alias el asistente pregunta «¿Con quién?» y la respuesta llega
 * en el mensaje siguiente: ese medio diálogo vive aquí (`fijarPendiente`), no en
 * el ChatBox, porque el componente se desmonta al entrar al editor.
 */

export interface OrdenJugar {
  juego: JuegoInvitable
  /** Alias del invitado, en minúsculas y sin `@` (null = hay que preguntarlo). */
  alias: string | null
}

/** Verbos que introducen la orden. De más largo a más corto: el primero gana. */
const PREFIJOS = [
  'invitar a jugar',
  'invita a jugar',
  'una partida de',
  'vamos a jugar',
  'quiero jugar',
  "let's play",
  'partida de',
  'lets play',
  'juguemos',
  'jugamos',
  'reto de',
  'jugar',
  'play',
]

const CONECTOR = /^(?:con|contra|vs|with|a)\s+(.+)$/
const ALIAS = /^@?([a-z0-9_]{3,20})$/

/** Todos los nombres del catálogo, de más largo a más corto (gana el específico). */
const NOMBRES: { nombre: string; juego: JuegoInvitable }[] = Object.entries(JUEGOS_INVITABLES)
  .flatMap(([juego, def]) => def.nombres.map((nombre) => ({ nombre, juego: juego as JuegoInvitable })))
  .sort((a, b) => b.nombre.length - a.nombre.length)

export function ordenJugar(texto: string, opciones?: { requiereVerbo?: boolean }): OrdenJugar | null {
  let resto = normalizarOrden(texto)
  if (!resto) return null

  let conVerbo = false
  for (const p of PREFIJOS) {
    if (resto === p) return null // «jugar» a secas: no dice a qué
    if (resto.startsWith(`${p} `)) {
      resto = resto.slice(p.length + 1)
      conVerbo = true
      break
    }
  }
  if (opciones?.requiereVerbo && !conVerbo) return null

  let juego: JuegoInvitable | null = null
  for (const n of NOMBRES) {
    if (resto === n.nombre) {
      juego = n.juego
      resto = ''
      break
    }
    if (resto.startsWith(`${n.nombre} `)) {
      juego = n.juego
      resto = resto.slice(n.nombre.length + 1)
      break
    }
  }
  if (!juego) return null
  if (!resto) return { juego, alias: null }

  // Lo que sobra tiene que ser el invitado y nada más: «jugar tenis mañana por
  // la tarde» no es una orden, es una frase para el asistente.
  const alias = ALIAS.exec(CONECTOR.exec(resto)?.[1] ?? resto)?.[1]
  return alias ? { juego, alias } : null
}

// ─── el diálogo en dos pasos ─────────────────────────────────────────────────

/** Lo que se preguntó caduca: un «@ana» de hace media hora no es una respuesta. */
const VIGENCIA_MS = 3 * 60_000

let enEspera: { juego: JuegoInvitable; desde: number } | null = null

export function fijarPendiente(juego: JuegoInvitable): void {
  enEspera = { juego, desde: Date.now() }
}

export function pendiente(): JuegoInvitable | null {
  if (enEspera && Date.now() - enEspera.desde > VIGENCIA_MS) enEspera = null
  return enEspera?.juego ?? null
}

export function limpiarPendiente(): void {
  enEspera = null
}

/** ¿El mensaje es SOLO un alias? (la respuesta a «¿Con quién?») */
export function aliasDeRespuesta(texto: string): string | null {
  return ALIAS.exec(normalizarOrden(texto))?.[1] ?? null
}

if (import.meta.env.DEV) {
  ;(window as unknown as { ordenJugar: typeof ordenJugar }).ordenJugar = ordenJugar
}
