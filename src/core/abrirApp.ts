import { useHouse } from './state/houseStore'
import { useDiseño, esObjetoLibreria, esObjetoMapa } from './state/disenoStore'
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

/**
 * Abre la app de UN objeto concreto (botón "Interactuar" del hueco del cubo).
 * A diferencia de `abrirApp`, que busca la primera instancia con esa plantilla
 * en toda la casa, aquí el objeto ya está elegido: si la misma app está en dos
 * cuartos, entra al que el jugador tiene enfrente. Devuelve false si el objeto
 * no tiene app o vive en el mapa (`openRoom` no valida el id, y con el mapa
 * dejaría la casa tapada por un overlay vacío).
 */
export function abrirAppDeObjeto(objetoId: number): boolean {
  const obj = useDiseño.getState().objetos.find((o) => o.id === objetoId)
  if (!obj?.plantillaId || esObjetoMapa(obj) || esObjetoLibreria(obj)) return false
  lanzarIntencionApp({ appId: obj.plantillaId })
  useHouse.getState().openRoom(obj.roomId)
  return true
}
