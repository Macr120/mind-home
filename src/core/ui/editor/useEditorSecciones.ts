import { useCallback, useState } from 'react'
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

export function useEditorSeccionesMapa() {
  // localStorage viejo puede traer secciones desconocidas: se sanitiza al leer
  // (se persiste ya limpio la próxima vez que el usuario reordena o colapsa).
  const [orden, setOrden] = useState(() => sanitizarOrdenMapa(leerOrdenMapa()))
  const [colapso, setColapso] = useState(leerColapso)
  const [arrastrando, setArrastrando] = useState<SeccionMapaId | null>(null)
  const [objetivo, setObjetivo] = useState<SeccionMapaId | null>(null)

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

  const iniciarArrastre = useCallback((id: SeccionMapaId) => {
    setArrastrando(id)
    setObjetivo(id)
  }, [])

  const entrarObjetivo = useCallback((id: SeccionMapaId) => {
    setObjetivo(id)
  }, [])

  const soltar = useCallback((destino: SeccionMapaId) => {
    if (!arrastrando || arrastrando === destino) {
      setArrastrando(null)
      setObjetivo(null)
      return
    }
    setOrden((prev) => {
      const next = reordenar(prev, arrastrando, destino)
      guardarOrdenMapa(next)
      return next
    })
    setArrastrando(null)
    setObjetivo(null)
  }, [arrastrando])

  const finArrastre = useCallback(() => {
    setArrastrando(null)
    setObjetivo(null)
  }, [])

  return {
    orden,
    abierto,
    toggle,
    arrastrando,
    objetivo,
    iniciarArrastre,
    entrarObjetivo,
    soltar,
    finArrastre,
  }
}

/**
 * Reordenamiento de los grupos de Configuraciones. Gemelo del de mapa pero SIN
 * colapso: el desplegado sigue viviendo en `useEditorUi().configAbiertos`, para
 * que el chat pueda abrir un grupo concreto (`abrirConfigGrupo`).
 */
export function useEditorSeccionesConfig() {
  const [orden, setOrden] = useState(leerOrdenConfig)
  const [arrastrando, setArrastrando] = useState<ConfigGrupoId | null>(null)
  const [objetivo, setObjetivo] = useState<ConfigGrupoId | null>(null)

  const iniciarArrastre = useCallback((id: ConfigGrupoId) => {
    setArrastrando(id)
    setObjetivo(id)
  }, [])

  const entrarObjetivo = useCallback((id: ConfigGrupoId) => {
    setObjetivo(id)
  }, [])

  const soltar = useCallback((destino: ConfigGrupoId) => {
    if (!arrastrando || arrastrando === destino) {
      setArrastrando(null)
      setObjetivo(null)
      return
    }
    setOrden((prev) => {
      const next = reordenar(prev, arrastrando, destino)
      guardarOrdenConfig(next)
      return next
    })
    setArrastrando(null)
    setObjetivo(null)
  }, [arrastrando])

  const finArrastre = useCallback(() => {
    setArrastrando(null)
    setObjetivo(null)
  }, [])

  return { orden, arrastrando, objetivo, iniciarArrastre, entrarObjetivo, soltar, finArrastre }
}

/**
 * Reordenamiento por arrastre de una lista de filas con id numérico (carpetas y
 * elementos del guardarropa). A diferencia de los dos anteriores no guarda el
 * orden: los ids ya ordenados salen por `onReordenar`, que decide dónde
 * persistirlos (Dexie, en este caso).
 */
export function useReordenRopa(onReordenar: (ids: number[]) => void) {
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const [objetivo, setObjetivo] = useState<number | null>(null)

  const finArrastre = useCallback(() => {
    setArrastrando(null)
    setObjetivo(null)
  }, [])

  const soltar = useCallback(
    (destino: number, ids: number[]) => {
      if (arrastrando != null && arrastrando !== destino) {
        onReordenar(reordenar(ids, arrastrando, destino))
      }
      finArrastre()
    },
    [arrastrando, onReordenar, finArrastre],
  )

  return {
    arrastrando,
    objetivo,
    iniciarArrastre: useCallback((id: number) => {
      setArrastrando(id)
      setObjetivo(id)
    }, []),
    entrarObjetivo: useCallback((id: number) => setObjetivo(id), []),
    soltar,
    finArrastre,
  }
}

