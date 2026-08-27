import { useRef, useState } from 'react'

/** Ejercicio recién tocado en el catálogo y si entró a la rutina o ya estaba. */
export interface AvisoAgregado {
  nombre: string
  nuevo: boolean
}

/**
 * Acuse de recibo al tocar un ejercicio del catálogo: la fila confirma un
 * momento que se añadió a la rutina (o que ya estaba). Sin esto el toque es
 * mudo — la rutina se arma más abajo, fuera de la vista, y no se sabe si
 * cuajó.
 *
 * El temporizador se arma en el manejador del clic, no en un efecto: es una
 * reacción al evento y así no hay que sincronizar nada al montar.
 */
export function useAvisoAgregado(ms = 1600): [AvisoAgregado | null, (nombre: string, nuevo: boolean) => void] {
  const [aviso, setAviso] = useState<AvisoAgregado | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const avisar = (nombre: string, nuevo: boolean) => {
    setAviso({ nombre, nuevo })
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAviso(null), ms)
  }

  return [aviso, avisar]
}
