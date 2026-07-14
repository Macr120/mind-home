import { useEffect } from 'react'
import type { PerfilDescanso } from '../../core/data/db'
import { perfilDescansoRepo } from '../../core/data/repository'

export const PERFIL_DEFAULT: Omit<PerfilDescanso, 'id'> = {
  horaObjetivoDormir: '23:00',
  horaObjetivoDespertar: '07:00',
}

/** Devuelve el perfil de descanso, creando una fila por defecto si no existe. */
export function usePerfilDescanso(): PerfilDescanso | undefined {
  const filas = perfilDescansoRepo.useAll()

  useEffect(() => {
    if (filas && filas.length === 0) {
      void perfilDescansoRepo.add(PERFIL_DEFAULT)
    }
  }, [filas])

  return filas?.[0]
}
