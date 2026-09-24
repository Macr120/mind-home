import { create } from 'zustand'
import { useHud } from '../state/hudStore'
import { useMascota } from '../state/mascotaStore'
import type { Cita } from './cita'
import type { Paquete } from './compartibles'

/**
 * Estado de INTERFAZ del buzón (los datos viven en la caché Dexie y en el
 * servidor). El hilo de una persona y la conversación con un asistente son
 * excluyentes: abrir uno cierra el otro en las dos direcciones (`abrirHilo`
 * aquí, `abrirConv` en ChatBox).
 */
interface BuzonState {
  /** Hilo de persona abierto sobre la barra del chat (hiloId), o null. */
  hiloAbierto: string | null
  /** Panel de contactos (alias, buscar, solicitudes) desplegado. */
  panelContactos: boolean
  /** Mensajes recibidos sin leer, por hilo. */
  noLeidos: Record<string, number>
  totalNoLeidos: number
  /** Solicitudes de contacto recibidas y sin responder. */
  solicitudesPendientes: number
  estado: 'apagado' | 'conectando' | 'listo' | 'error'
  /** Lo que el diálogo «Enviar a un contacto» va a mandar (abierto mientras no sea null). */
  compartirPendiente: Paquete | null
  /** Sube con cada `abrirCompartir`: la `key` con la que el diálogo arranca limpio. */
  compartirN: number
  /** «Responder» elegido en una burbuja: el próximo mensaje de ese hilo lo cita. */
  respuesta: { hiloId: string; cita: Cita } | null
  responder: (hiloId: string, cita: Cita) => void
  cancelarRespuesta: () => void
  abrirHilo: (hiloId: string) => void
  cerrarHilo: () => void
  abrirContactos: () => void
  cerrarContactos: () => void
  abrirCompartir: (p: Paquete) => void
  cerrarCompartir: () => void
  setNoLeidos: (porHilo: Record<string, number>) => void
}

export const useBuzon = create<BuzonState>((set) => ({
  hiloAbierto: null,
  panelContactos: false,
  noLeidos: {},
  totalNoLeidos: 0,
  solicitudesPendientes: 0,
  estado: 'apagado',
  compartirPendiente: null,
  compartirN: 0,
  respuesta: null,
  responder: (hiloId, cita) => set({ respuesta: { hiloId, cita } }),
  cancelarRespuesta: () => set({ respuesta: null }),
  abrirHilo: (hiloId) => {
    // Un hilo a la vez: se aparta la conversación del asistente y se despliega el chat.
    useMascota.getState().cerrarConversacion()
    useMascota.getState().setHiloOculto(false)
    useHud.getState().setMenuAbierto(false)
    useHud.getState().setPlegado('chat', false)
    set({ hiloAbierto: hiloId, panelContactos: false })
  },
  cerrarHilo: () => set({ hiloAbierto: null }),
  abrirContactos: () => set({ panelContactos: true }),
  cerrarContactos: () => set({ panelContactos: false }),
  abrirCompartir: (p) => set((s) => ({ compartirPendiente: p, compartirN: s.compartirN + 1 })),
  cerrarCompartir: () => set({ compartirPendiente: null }),
  setNoLeidos: (porHilo) =>
    set({ noLeidos: porHilo, totalNoLeidos: Object.values(porHilo).reduce((a, b) => a + b, 0) }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useBuzon: typeof useBuzon }).useBuzon = useBuzon
}
