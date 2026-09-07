import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { VACIO, murosLibresRepo } from '../data/repository'
import {
  UMBRAL_ARRASTRE_PX,
  gestoCancelar,
  gestoDown,
  gestoMove,
  gestoTecla,
  gestoUp,
  publicarMurosRejilla,
  type CtxGesto,
} from '../state/formaLibreGesto'
import { puntoSueloBajoCursor } from './arrastreCelda'

/** Intervalo mínimo entre hovers sin botón (ms): el hit-test recorre todas las formas. */
const THROTTLE_HOVER_MS = 45

/**
 * Modo Libre en el mapa 3D: traduce el puntero a puntos del suelo del nivel activo y se
 * los pasa a los gestos compartidos (`formaLibreGesto`), que son los mismos del croquis.
 * Escucha en FASE CAPTURE sobre el canvas con `stopPropagation`: R3F escucha en el div
 * padre, así el clic no llega al suelo exterior ni a los cuartos mientras se construye.
 */
export function FormaLibre3DController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const activo = usePlanos((s) => s.activo && s.capa === 'libre')
  const nivel = usePlanos((s) => s.nivel)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)

  // Muros libres de REJILLA visibles: el gesto «convertir» los necesita para el hit-test.
  const muros = murosLibresRepo.useAll() ?? VACIO
  useEffect(() => publicarMurosRejilla(muros), [muros])

  useEffect(() => {
    if (!activo) return
    const dom = gl.domElement
    const opts = { canvas: dom, camera, nivel, apilado, gridCols, gridRows }
    // Radio de agarre ≈ 12 px al zoom actual (ortográfica); fijo en perspectiva.
    const ctx = (): CtxGesto => ({
      gridCols,
      gridRows,
      nivel,
      radioVert:
        camera instanceof THREE.OrthographicCamera
          ? Math.min(1.2, Math.max(0.25, 12 / camera.zoom))
          : 0.5,
    })
    let down: { x: number; y: number; id: number } | null = null
    let fueArrastre = false
    let ultimoHover = 0

    const soltarCaptura = (pointerId: number) => {
      try {
        if (dom.hasPointerCapture(pointerId)) dom.releasePointerCapture(pointerId)
      } catch {
        /* el puntero ya se fue */
      }
    }

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return // botón medio/derecho: cámara
      const p = puntoSueloBajoCursor(ev.clientX, ev.clientY, opts)
      if (!p) return
      ev.stopPropagation()
      down = { x: ev.clientX, y: ev.clientY, id: ev.pointerId }
      fueArrastre = false
      gestoDown(p, ctx())
      // Captura SIEMPRE (no solo al agarrar algo): si el puntero se soltara fuera del
      // canvas sin captura, el `down` quedaría pegado y el hover dejaría de actualizarse.
      try {
        dom.setPointerCapture(ev.pointerId)
      } catch {
        /* sin captura: el gesto sigue mientras el puntero esté sobre el canvas */
      }
    }
    const onMove = (ev: PointerEvent) => {
      if (down) {
        ev.stopPropagation()
        if (!fueArrastre && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > UMBRAL_ARRASTRE_PX) {
          fueArrastre = true
        }
        gestoMove(puntoSueloBajoCursor(ev.clientX, ev.clientY, opts), ctx(), fueArrastre)
        return
      }
      const ahora = performance.now()
      if (ahora - ultimoHover < THROTTLE_HOVER_MS) return
      ultimoHover = ahora
      gestoMove(puntoSueloBajoCursor(ev.clientX, ev.clientY, opts), ctx(), false)
    }
    const onUp = (ev: PointerEvent) => {
      if (!down) return
      ev.stopPropagation()
      const id = down.id
      down = null
      gestoUp(puntoSueloBajoCursor(ev.clientX, ev.clientY, opts), ctx(), fueArrastre)
      soltarCaptura(id)
    }
    const onCancel = (ev: PointerEvent) => {
      if (down) soltarCaptura(down.id)
      down = null
      gestoCancelar()
      ev.stopPropagation()
    }
    const onLeave = () => {
      if (!down) gestoMove(null, ctx(), false)
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (gestoTecla(e.key)) e.preventDefault()
    }

    dom.addEventListener('pointerdown', onDown, true)
    dom.addEventListener('pointermove', onMove, true)
    dom.addEventListener('pointerup', onUp, true)
    dom.addEventListener('pointercancel', onCancel, true)
    dom.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('pointerdown', onDown, true)
      dom.removeEventListener('pointermove', onMove, true)
      dom.removeEventListener('pointerup', onUp, true)
      dom.removeEventListener('pointercancel', onCancel, true)
      dom.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKey)
      if (down) soltarCaptura(down.id)
      gestoCancelar()
    }
  }, [activo, gl, camera, nivel, apilado, gridCols, gridRows])

  return null
}
