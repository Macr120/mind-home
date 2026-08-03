import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { useLayout } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useHouse } from '../state/houseStore'
import { useT } from '../i18n/useT'
import { celdaEnteraBajoCursor } from './arrastreCelda'
import { cellToWorld, SPACING, type Cell } from './walls'
import { colorZona, normalizarRect } from './cuadrantesMapa'

/** Altura del preview sobre el suelo del mapa (el piso exterior llega a ~0.19). */
const Y_PREVIEW = 0.3

/**
 * Dibujar una zona arrastrando sobre el mapa 3D, igual que en el croquis: el arrastre
 * marca dos celdas del suelo y al soltar se crea la zona. Solo está activo mientras el
 * panel tiene pulsado «Dibujar cuadrante».
 */
export function DibujoCuadrante3D() {
  const t = useT()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const dibujando = usePlanos((s) => s.dibujandoCuadrante)
  const setDibujando = usePlanos((s) => s.setDibujandoCuadrante)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const cuadrantes = useLayout((s) => s.cuadrantes)
  const agregarCuadrante = useLayout((s) => s.agregarCuadrante)
  const apilado = !useHouse((s) => s.explotado)
  const arrastre = useRef<{ a: Cell; b: Cell } | null>(null)
  const [preview, setPreview] = useState<{ a: Cell; b: Cell } | null>(null)

  useEffect(() => {
    if (!dibujando) return
    const dom = gl.domElement
    const cursorPrevio = dom.style.cursor
    dom.style.cursor = 'crosshair'

    // Las zonas son del mapa (nivel 0): se proyectan siempre sobre el suelo visible.
    const celdaEn = (ev: PointerEvent) => {
      const r = dom.getBoundingClientRect()
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
        return null
      }
      return celdaEnteraBajoCursor(ev.clientX, ev.clientY, {
        canvas: dom,
        camera,
        nivel: 0,
        apilado,
        gridCols,
        gridRows,
      })
    }

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const c = celdaEn(ev)
      if (!c) return
      ev.preventDefault()
      arrastre.current = { a: c, b: c }
      setPreview(arrastre.current)
    }
    const onMove = (ev: PointerEvent) => {
      if (!arrastre.current) return
      const c = celdaEn(ev)
      if (!c) return
      arrastre.current = { a: arrastre.current.a, b: c }
      setPreview(arrastre.current)
    }
    const onUp = () => {
      const r = arrastre.current
      arrastre.current = null
      setPreview(null)
      if (!r) return
      const nombre = `${t('constructor.cuadrantes.nuevo', 'Zona')} ${cuadrantes.length + 1}`
      void agregarCuadrante(
        normalizarRect(r.a, r.b, gridCols, gridRows, nombre, colorZona(cuadrantes.length)),
      )
      setDibujando(false)
    }

    dom.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      dom.style.cursor = cursorPrevio
      dom.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      arrastre.current = null
      setPreview(null)
    }
  }, [
    dibujando,
    gl,
    camera,
    apilado,
    gridCols,
    gridRows,
    cuadrantes,
    agregarCuadrante,
    setDibujando,
    t,
  ])

  if (!preview) return null

  const c0 = Math.min(preview.a.col, preview.b.col)
  const r0 = Math.min(preview.a.row, preview.b.row)
  const nc = Math.abs(preview.b.col - preview.a.col) + 1
  const nr = Math.abs(preview.b.row - preview.a.row) + 1
  const [x, , z] = cellToWorld(c0 + (nc - 1) / 2, r0 + (nr - 1) / 2)

  return (
    <mesh position={[x, Y_PREVIEW, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[nc * SPACING, nr * SPACING]} />
      <meshBasicMaterial
        color={colorZona(cuadrantes.length)}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  )
}
