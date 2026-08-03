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

