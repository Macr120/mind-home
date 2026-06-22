import { useCallback, useEffect, useState } from 'react'
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
  const [orden, setOrden] = useState(leerOrdenMapa)
  const [colapso, setColapso] = useState(leerColapso)
  const [arrastrando, setArrastrando] = useState<SeccionMapaId | null>(null)
  const [objetivo, setObjetivo] = useState<SeccionMapaId | null>(null)

  useEffect(() => {
    setOrden((prev) => {
      const next = sanitizarOrdenMapa(prev)
      if (next.length !== prev.length || next.some((id, i) => id !== prev[i])) {
        guardarOrdenMapa(next)
        return next
      }
      return prev
    })
  }, [])

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
  const [orden, setOrden] = useState(leerOrdenCuarto)
  const [colapso, setColapso] = useState(leerColapso)
  const [arrastrando, setArrastrando] = useState<SeccionCuartoId | null>(null)
  const [objetivo, setObjetivo] = useState<SeccionCuartoId | null>(null)

  // Tras HMR o localStorage viejo puede quedar `forma` en memoria; limpiar y persistir.
  useEffect(() => {
    setOrden((prev) => {
      const next = sanitizarOrdenCuarto(prev)
      if (next.length !== prev.length || next.some((id, i) => id !== prev[i])) {
        guardarOrdenCuarto(next)
        return next
      }
      return prev
    })
  }, [])

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
