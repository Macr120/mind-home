import { useCallback, useState } from 'react'
import {
  leerColapso,
  guardarColapso,
  leerOrdenMapa,
  guardarOrdenMapa,
  leerOrdenCuarto,
  guardarOrdenCuarto,
  reordenar,
  sanitizarOrdenMapa,
  sanitizarOrdenCuarto,
  type SeccionMapaId,
  type SeccionCuartoId,
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

export function useEditorSeccionesCuarto() {
  // Tras HMR o localStorage viejo puede quedar `forma` guardada: se sanitiza al
  // leer (se persiste ya limpio la próxima vez que el usuario reordena o colapsa).
  const [orden, setOrden] = useState(() => sanitizarOrdenCuarto(leerOrdenCuarto()))
  const [colapso, setColapso] = useState(leerColapso)
  const [arrastrando, setArrastrando] = useState<SeccionCuartoId | null>(null)
  const [objetivo, setObjetivo] = useState<SeccionCuartoId | null>(null)

  const abierto = useCallback(
    (id: SeccionCuartoId) => colapso[id] !== true,
    [colapso],
  )

  const toggle = useCallback((id: SeccionCuartoId) => {
    setColapso((c) => {
      const next = { ...c, [id]: !c[id] }
      guardarColapso(next)
      return next
    })
  }, [])

  const iniciarArrastre = useCallback((id: SeccionCuartoId) => {
    setArrastrando(id)
    setObjetivo(id)
  }, [])

  const entrarObjetivo = useCallback((id: SeccionCuartoId) => {
    setObjetivo(id)
  }, [])

  const soltar = useCallback((destino: SeccionCuartoId) => {
    if (!arrastrando || arrastrando === destino) {
      setArrastrando(null)
      setObjetivo(null)
      return
    }
    setOrden((prev) => {
      const next = sanitizarOrdenCuarto(reordenar(prev, arrastrando, destino))
      guardarOrdenCuarto(next)
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
