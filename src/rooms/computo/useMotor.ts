import { useEffect, useState } from 'react'
import { cargarMotor, olvidarMotor, type Motor } from './motor'

/**
 * Estado de carga del motor. Devuelve `motor: null` mientras descarga: cada
 * pestaña pinta su propio esqueleto y los datos que vienen de Dexie (nombres de
 * fórmulas, lista de hojas) se ven desde el principio. Lo único que espera es el
 * LaTeX y los números.
 */
export function useMotor() {
  const [estado, setEstado] = useState<{ motor: Motor | null; error: unknown }>({ motor: null, error: null })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    cargarMotor().then(
      (motor) => vivo && setEstado({ motor, error: null }),
      (error) => vivo && setEstado({ motor: null, error }),
    )
    return () => {
      vivo = false
    }
  }, [intento])

  return {
    motor: estado.motor,
    error: estado.error,
    cargando: !estado.motor && !estado.error,
    reintentar: () => {
      olvidarMotor()
      setEstado({ motor: null, error: null })
      setIntento((n) => n + 1)
    },
  }
}
