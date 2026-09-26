import type { ObjetoCuarto } from './data/db'
import { abrirEnlace } from './enlaces'
import { abrirPrograma, abrirVentanaEn, hayProgramasEscritorio } from './plataforma'
import { abrirAppDeObjeto } from './abrirApp'
import { useDiseño, objetoPorId, esObjetoMapa, esObjetoLibreria } from './state/disenoStore'
import { useCuartos } from './state/cuartosStore'
import { useHouse } from './state/houseStore'
import { esMueblePrincipal } from './house/muebles'

/**
 * Qué abre un objeto que no es la app de su cuarto: su página web, un programa
 * del equipo o una entrada de app. Null si no tiene nada, o si esta plataforma
 * no sabe abrirlo (el programa viaja por el sync, pero solo el shell de Windows
 * lo lanza: en el teléfono el objeto queda como decorativo).
 */
export function destinoExterno(o: ObjetoCuarto): 'web' | 'programa' | 'app' | null {
  if (o.enlaceUrl) return 'web'
  if (o.programa && hayProgramasEscritorio()) return 'programa'
  if (o.enlaceApp && !o.plantillaId) return 'app'
  return null
}

/**
 * Abre lo que lleva el objeto (lo mismo que su burbuja): la página, el programa
 * o la entrada de app. Lo usa el botón de proximidad y la tecla E.
 */
export function abrirDestinoDeObjeto(o: ObjetoCuarto): void {
  const destino = destinoExterno(o)
  if (destino === 'web') void abrirEnlace(o.enlaceUrl!, o.nombre)
  else if (destino === 'programa') void abrirPrograma(o.programa!)
  else if (destino === 'app') void import('./enlaceApp').then((m) => m.abrirEnlaceDeObjeto(o.enlaceApp!))
}

let ultimo = { id: -1, en: 0 }

/**
 * Un clic en el fondo de pantalla = abrir. No hay burbuja que pulsar: allí no
 * se monta `InteractOverlay`. Prioridad: página > programa > app o cuarto,
 * estos dos en la VENTANA principal, que abre (o despierta) el shell. El doble
 * clic del escritorio llega como dos clics seguidos: el segundo, si es sobre el
 * mismo objeto, se ignora para no lanzar dos Notepad.
 */
export function abrirObjetoEnFondo(o: ObjetoCuarto): void {
  const ahora = performance.now()
  if (o.id != null && o.id === ultimo.id && ahora - ultimo.en < 800) return
  ultimo = { id: o.id ?? -1, en: ahora }
  if (o.enlaceUrl) {
    void abrirEnlace(o.enlaceUrl, o.nombre)
    return
  }
  if (o.programa) {
    void abrirPrograma(o.programa)
    return
  }
  if (o.id != null && (o.enlaceApp || (!esObjetoMapa(o) && (o.plantillaId || esMueblePrincipal(o))))) {
    void abrirVentanaEn(`objeto-${o.id}`)
  }
}

/**
 * La ventana principal llega (fría o caliente) con `objeto-<id>`: entra al
 * cuarto de ese objeto, con su app lanzada si la tiene. En frío los stores
 * leen Dexie al importarse y hasta que no están `cargado` la lista de objetos
 * viene vacía: se espera a los dos en vez de fiarse de un tiempo fijo.
 */
export function abrirObjetoAlLlegar(id: number): void {
  if (!Number.isInteger(id)) return
  cuandoCasaCargada(() => {
    const o = objetoPorId(useDiseño.getState().objetos, id)
    if (!o || esObjetoLibreria(o)) return
    if (o.enlaceApp && !o.plantillaId) {
      void import('./enlaceApp').then((m) => m.abrirEnlaceDeObjeto(o.enlaceApp!))
      return
    }
    if (esObjetoMapa(o)) return
    if (o.plantillaId) abrirAppDeObjeto(id)
    else if (esMueblePrincipal(o)) useHouse.getState().openRoom(o.roomId)
  })
}

function cuandoCasaCargada(fn: () => void): void {
  const lista = () => useDiseño.getState().cargado && useCuartos.getState().cargado
  if (lista()) {
    fn()
    return
  }
  const bajas: (() => void)[] = []
  const revisar = () => {
    if (!lista()) return
    for (const baja of bajas) baja()
    fn()
  }
  bajas.push(useDiseño.subscribe(revisar), useCuartos.subscribe(revisar))
}
