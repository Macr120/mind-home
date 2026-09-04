import { useState } from 'react'

function leer(clave: string): boolean | null {
  try {
    const v = localStorage.getItem(clave)
    return v === '1' ? true : v === '0' ? false : null
  } catch {
    return null
  }
}

/**
 * Abierto/plegado de un panel lateral del editor, recordado en el dispositivo
 * (patrón `useAltoPreview`): `porDefecto` solo decide cuando no hay nada
 * guardado, y el `setItem` va FUERA del actualizador (StrictMode lo corre dos veces).
 */
export function usePreferenciaPanel(clave: string, porDefecto: () => boolean): [boolean, (v: boolean) => void] {
  const [abierto, setAbierto] = useState(() => leer(clave) ?? porDefecto())
  const cambiar = (v: boolean) => {
    try {
      localStorage.setItem(clave, v ? '1' : '0')
    } catch {
      /* almacenamiento bloqueado */
    }
    setAbierto(v)
  }
  return [abierto, cambiar]
}
