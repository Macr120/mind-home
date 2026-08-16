import { useCallback, useState } from 'react'
import { useArrastre } from '../comun/arrastre'
import {
  leerColapso,
  guardarColapso,
  leerOrdenMapa,
  guardarOrdenMapa,
  reordenar,
  sanitizarOrdenMapa,
  type SeccionMapaId,
} from './editorSecciones'
import { leerOrdenConfig, guardarOrdenConfig, type ConfigGrupoId } from './configSecciones'

/** Qué destino hay bajo el puntero, leyendo el data-attribute de las secciones. */
const bajoElPuntero = (e: { clientX: number; clientY: number }, attr: string) =>
  document.elementFromPoint(e.clientX, e.clientY)?.closest(`[${attr}]`)?.getAttribute(attr) ?? null

export function useEditorSeccionesMapa() {
  // localStorage viejo puede traer secciones desconocidas: se sanitiza al leer
  // (se persiste ya limpio la próxima vez que el usuario reordena o colapsa).
  const [orden, setOrden] = useState(() => sanitizarOrdenMapa(leerOrdenMapa()))
  const [colapso, setColapso] = useState(leerColapso)

  const abierto = useCallback(
    (id: SeccionMapaId) => colapso[id] !== true,
    [colapso],
  )

  const toggle = useCallback((id: SeccionMapaId) => {
    setColapso((c) => {
      const next = { ...c, [id]: !c[id] }
      guardarColapso(next)
      return next
    })
  }, [])

  // El gesto compartido de la casa: la sección en mano se coloca ANTES de
  // aquella sobre la que se suelta (`reordenar`, la lógica de siempre).
  const { props, enMano, destino } = useArrastre<SeccionMapaId>(
    (e, mano) => {
      const id = bajoElPuntero(e, 'data-seccion')
      return id && id !== mano ? (id as SeccionMapaId) : null
    },
    (mano, dest) => {
      setOrden((prev) => {
        const next = reordenar(prev, mano as SeccionMapaId, dest)
        guardarOrdenMapa(next)
        return next
      })
    },
  )

  return {
    orden,
    abierto,
    toggle,
    arrastre: props,
    arrastrando: enMano as SeccionMapaId | null,
    objetivo: destino,
  }
}

/**
 * Reordenamiento de los grupos de Configuraciones. Gemelo del de mapa pero SIN
 * colapso: el desplegado sigue viviendo en `useEditorUi().configAbiertos`, para
 * que el chat pueda abrir un grupo concreto (`abrirConfigGrupo`).
 */
export function useEditorSeccionesConfig() {
  const [orden, setOrden] = useState(leerOrdenConfig)

  const { props, enMano, destino } = useArrastre<ConfigGrupoId>(
    (e, mano) => {
      const id = bajoElPuntero(e, 'data-grupo')
      return id && id !== mano ? (id as ConfigGrupoId) : null
    },
    (mano, dest) => {
      setOrden((prev) => {
        const next = reordenar(prev, mano as ConfigGrupoId, dest)
        guardarOrdenConfig(next)
        return next
      })
    },
  )

  return {
    orden,
    arrastre: props,
    arrastrando: enMano as ConfigGrupoId | null,
    objetivo: destino,
  }
}

/**
 * Reordenamiento por arrastre de una lista de filas con id numérico (las
 * carpetas de ropa). A diferencia de los dos anteriores no guarda el orden: los
 * ids ya ordenados salen por `onReordenar`, que decide dónde persistirlos
 * (Dexie, en este caso).
 */
export function useReordenRopa(ids: number[], onReordenar: (ids: number[]) => void) {
  const { props, enMano, destino } = useArrastre<number>(
    (e, mano) => {
      const attr = bajoElPuntero(e, 'data-carpeta-ropa')
      if (!attr || attr === mano) return null
      const id = Number(attr)
      // Fuera de su categoría no hay destino: cada lista reordena solo la suya.
      return ids.includes(id) ? id : null
    },
    (mano, dest) => onReordenar(reordenar(ids, Number(mano), dest)),
  )

  return {
    props,
    arrastrando: enMano == null ? null : Number(enMano),
    objetivo: destino,
  }
}
