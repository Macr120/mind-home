import { useEffect } from 'react'
import { create } from 'zustand'
import { usePendientesPorApp, type PendientesApp } from '../hoy'

/**
 * Las misiones que le quedan hoy a cada app, para quien las necesite FUERA de un
 * panel: el orbe sobre el mueble principal (uno por cuarto, dentro del canvas) y
 * la burbuja de entrada.
 *
 * Existe como store porque `usePendientesPorApp` recorre las apps de la casa: si
 * cada orbe pidiera las suyas serían quince consultas repitiendo el mismo trabajo.
 * Una sola sonda escribe aquí y cada marcador lee su cifra.
 */
interface PendientesState {
  /** Clave: id de plantilla (app). Las apps sin nada pendiente no están. */
  porApp: Record<string, PendientesApp>
}

export const usePendientesCasa = create<PendientesState>(() => ({ porApp: {} }))

if (import.meta.env.DEV) {
  ;(window as unknown as { usePendientesCasa: typeof usePendientesCasa }).usePendientesCasa =
    usePendientesCasa
}

/** Alimenta el store. Se monta UNA vez, en la raíz. */
export function useSondaPendientes() {
  const porApp = usePendientesPorApp()
  useEffect(() => {
    usePendientesCasa.setState({ porApp: Object.fromEntries(porApp) })
  }, [porApp])
}
