import { useHouse } from './state/houseStore'
import { useDiseño, esObjetoLibreria } from './state/disenoStore'
import { lanzarIntencionApp } from './state/intencionApp'

/**
 * Abre la app de una plantilla en la casa: entra a su cuarto y le deja la
 * intención (sección) que la app lee al montarse. Devuelve el cuarto abierto.
 *
 * `activeRoom` es un id de CUARTO, no de plantilla — de ahí el rodeo por los
 * objetos: una app vive donde el usuario la asignó. Si no está en ningún objeto
 * no hay cuarto que abrir; devuelve null y quien llame decide qué hacer (el chat
 * responde con una frase, un chip del calendario simplemente no hace nada).
 */
export function abrirApp(plantillaId: string, seccion?: string, dato?: string): string | null {
  const obj = useDiseño
    .getState()
    .objetos.find((o) => o.plantillaId === plantillaId && !esObjetoLibreria(o))
  if (!obj) return null
  lanzarIntencionApp({ appId: plantillaId, seccion, dato })
  useHouse.getState().openRoom(obj.roomId)
  return obj.roomId
}
