/**
 * Charla de texto de la sala viva: mensajes EFÍMEROS entre sus miembros, por el
 * mismo canal de la partida (no por el buzón, que es 1:1 y se guarda).
 *
 * No hace falta relevo del anfitrión: la policy «partida: escuchar» deja a todo
 * miembro oír la subida (`partida:<id>:u`) y `sala.ts` la escucha en todos los
 * clientes, así que lo que publica un invitado les llega también a los demás.
 */
import { create } from 'zustand'
import { sonar } from '../audio/sfx'
import { usePartida } from './partidaStore'
import { alRecibir, emitir, salaViva } from './sala'
import type { Ranura } from './tipos'

/** Mensajes que se conservan en memoria (los viejos se caen por arriba). */
const MAX_MENSAJES = 50
export const MAX_TEXTO = 500

export interface MensajeCharla {
  /** `j:n`: la clave de dedup. */
  id: string
  j: Ranura
  tx: string
  /** Hora local de llegada (ms). */
  hora: number
}

interface CharlaState {
  mensajes: MensajeCharla[]
  abierta: boolean
  noLeidos: number
  setAbierta: (v: boolean) => void
}

export const useCharla = create<CharlaState>((set) => ({
  mensajes: [],
  abierta: false,
  noLeidos: 0,
  setAbierta: (v) => set(v ? { abierta: true, noLeidos: 0 } : { abierta: false }),
}))

function apuntar(m: MensajeCharla, propio: boolean): void {
  useCharla.setState((s) => {
    if (s.mensajes.some((x) => x.id === m.id)) return s
    const mensajes = [...s.mensajes, m].slice(-MAX_MENSAJES)
    return { mensajes, noLeidos: propio || s.abierta ? s.noLeidos : s.noLeidos + 1 }
  })
}

/** Manda un mensaje a toda la sala. Devuelve false si no hay sala o el texto no vale. */
export function enviarCharla(texto: string): boolean {
  const sala = salaViva()
  const tx = texto.trim().slice(0, MAX_TEXTO)
  if (!sala || !tx) return false
  const n = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  emitir('charla', { j: sala.miRanura, n, tx })
  apuntar({ id: `${sala.miRanura}:${n}`, j: sala.miRanura, tx, hora: Date.now() }, true)
  return true
}

// Suscripción ÚNICA a nivel de módulo: los oyentes de `sala.ts` viven más que
// cualquier sala (no se limpian en `cerrarTodo`).
alRecibir('charla', (m, de) => {
  apuntar({ id: `${de}:${m.n}`, j: de, tx: m.tx, hora: Date.now() }, false)
  if (!useCharla.getState().abierta) sonar('tick', 0.5)
})

// Otra sala (o ninguna): lo hablado en la anterior no se arrastra.
let salaPrevia: string | null = null
usePartida.subscribe((s) => {
  const id = s.sala?.partidaId ?? null
  if (id === salaPrevia) return
  salaPrevia = id
  useCharla.setState({ mensajes: [], noLeidos: 0 })
})
