import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { crearMuroAristaLibre, ciclarMuroFormaLibre, primeraRotMuroForma, murosLibresRepo } from '../data/repository'
import { worldToCell } from './walls'
import { puntoSueloBajoCursor } from './arrastreCelda'
import { aristaMasCercana, objetivoMuroArista, objetivoMuroForma } from './murosLibre'
import { consumirClicArista } from './PlanoParedes3DEditor'

/**
 * Crear muros libres directamente en el mapa 3D (capa Muros). Igual que el selector de piso:
 * un clic en el suelo coloca el muro según la forma activa — el cuadrado pone el lado (arista)
 * más cercano al punto; triángulo/círculo, la forma en la celda. Al mover el cursor se muestra
 * un fantasma del muro en tiempo real.
 */
export function PlanoMuros3DController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)
  const formaMuro = usePlanos((s) => s.formaMuro)
  const orientMuro = usePlanos((s) => s.orientMuro)
  const rotForma = usePlanos((s) => s.rotForma)
  const nivel = usePlanos((s) => s.nivel)
  const setMuroLibreSel = usePlanos((s) => s.setMuroLibreSel)
  const setMuroHover = usePlanos((s) => s.setMuroHover)

  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)

  // Los muros actuales en una ref: el fantasma debe reflejar la rotación/borrado que
  // resultaría del clic (mismo ciclo que el croquis) sin re-suscribir los listeners.
  const muros = murosLibresRepo.useAll()
  const murosRef = useRef(muros)
  useEffect(() => {
    murosRef.current = muros
  }, [muros])

  const activo = planosActivo && capa === 'paredes' && herramienta === 'muro'

  useEffect(() => {
    if (!activo) {
      setMuroHover(null)
      return
    }
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const opts = { canvas: dom, camera, nivel, apilado, gridCols, gridRows }

    // Objetivo (arista o forma) bajo el cursor: el fantasma predice lo que hará el clic
    // (misma predicción que usa el croquis 2D, ver house/murosLibre.ts). El muro recto es
    // un toggle simple (colocar/borrar); triángulo/círculo ciclan variantes.
    const objetivo = (clientX: number, clientY: number) => {
      const p = puntoSueloBajoCursor(clientX, clientY, opts)
      if (!p) return null
      const lista = murosRef.current ?? []
      if (formaMuro === 'cuadrado') {
        const a = aristaMasCercana(p.x, p.z, gridCols, gridRows, orientMuro)
        return objetivoMuroArista(lista, nivel, a)
      }
      const forma = formaMuro as 'triangular' | 'circular'
      // Forma a ½ celda: índice de celda a media rejilla bajo el punto.
      const celdaF = worldToCell(p.x, p.z)
      return objetivoMuroForma(lista, nivel, celdaF, forma, rotForma)
    }

    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onMove = (ev: PointerEvent) => {
      setMuroHover(objetivo(ev.clientX, ev.clientY))
    }
    const onLeave = () => setMuroHover(null)
    const onUp = (ev: PointerEvent) => {
      // El clic fue sobre una arista de cuarto/zona (seleccionar/editar): no dupliques con
      // muro libre. Se consume siempre (aunque luego salgamos) para no afectar al próximo clic.
      const eraArista = consumirClicArista()
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // arrastre de cámara
      if (eraArista) return
      const p = puntoSueloBajoCursor(ev.clientX, ev.clientY, opts)
      if (!p) return
      if (formaMuro === 'cuadrado') {
        const a = aristaMasCercana(p.x, p.z, gridCols, gridRows, orientMuro)
        void crearMuroAristaLibre(nivel, a.orient, a.col, a.row).then(setMuroLibreSel)
      } else {
        const forma = formaMuro as 'triangular' | 'circular'
        const celdaF = worldToCell(p.x, p.z)
        void ciclarMuroFormaLibre(nivel, celdaF.col, celdaF.row, forma, primeraRotMuroForma(forma, rotForma)).then(
          (r) => setMuroLibreSel(r?.id ?? null),
        )
      }
    }

    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointerleave', onLeave)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointerleave', onLeave)
      setMuroHover(null)
    }
  }, [
    activo,
    gl,
    camera,
    formaMuro,
    orientMuro,
    rotForma,
    nivel,
    apilado,
    gridCols,
    gridRows,
    setMuroLibreSel,
    setMuroHover,
  ])

  return null
}
