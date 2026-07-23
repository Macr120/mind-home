import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { useLayout } from '../state/layoutStore'
import { setEstiloMuroLibre } from '../data/repository'
import { TIPOS_PUERTA } from './murosPuertas'
import type { Cell, SideKey } from './walls'

/** Datos que cada malla de muro de cuarto expone en `userData.muroSel` para el raycast. */
export interface MuroSelData {
  roomId: string
  off: Cell
  side: SideKey
  /** Tiene ventana (para la auto-detección de modo en 3ª/1ª persona). */
  ventana?: boolean
}

// Bandera: cuando se selecciona un muro, el clic de piso (editor 3D) la consume y no actúa.
let _clicMuroEn = 0
export function consumirClicMuro(): boolean {
  const reciente = _clicMuroEn > 0 && performance.now() - _clicMuroEn < 800
  _clicMuroEn = 0
  return reciente
}

/** Muro bajo el cursor para resaltar (hover): de cuarto (arista) o libre (id). */
type HoverMuro = { roomId: string; off: Cell; side: SideKey } | { muroLibreId: number } | null

/** ¿Dos hovers apuntan al mismo muro? (evita re-render en cada pointermove). */
function mismoHover(a: HoverMuro, b: HoverMuro): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if ('muroLibreId' in a || 'muroLibreId' in b) {
    return 'muroLibreId' in a && 'muroLibreId' in b && a.muroLibreId === b.muroLibreId
  }
  return a.roomId === b.roomId && a.off.col === b.off.col && a.off.row === b.off.row && a.side === b.side
}

const _v2 = new THREE.Vector2()
const _ray = new THREE.Raycaster()

/** Sube por los padres del objeto buscando datos de muro (de cuarto o libre). */
export function buscarMuro(
  obj: THREE.Object3D,
): { muro?: MuroSelData; muroLibre?: number; muroLibreSeg?: number } | null {
  let p: THREE.Object3D | null = obj
  let seg: number | undefined
  for (let k = 0; k < 12 && p; k++) {
    const ud = p.userData as { muroSel?: MuroSelData; muroLibreSel?: number; muroLibreSeg?: number }
    if (ud?.muroSel) return { muro: ud.muroSel }
    // El índice de segmento vive en un grupo interno; se captura al subir al grupo del muro.
    if (ud?.muroLibreSeg != null) seg = ud.muroLibreSeg
    if (ud?.muroLibreSel != null) return { muroLibre: ud.muroLibreSel, muroLibreSeg: seg }
    p = p.parent
  }
  return null
}

/**
 * Selector de muros por raycast (capa Paredes, herramienta ≠ muro): identifica el muro
 * bajo el cursor —recto, circular o triangular— por su MALLA real (no por marcadores) y
 * lo selecciona, aplicando la herramienta activa (puerta/ventana). Determinista y válido
 * en iso y en 3ª/1ª persona. Reemplaza la selección por marcadores en esos modos.
 */
export function PlanoMuroSelector3D() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)

  const activo = planosActivo && capa === 'paredes' && herramienta !== 'muro'

  useEffect(() => {
    if (!activo) return
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    let tHover = 0

    const muroBajoCursor = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect()
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null
      _v2.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      _ray.setFromCamera(_v2, camera)
      const hits = _ray.intersectObjects(scene.children, true)
      if (!hits.length) return null
      // El muro debe estar entre lo MÁS CERCANO del rayo (su malla, marco de puerta o un poco
      // detrás), no un muro lejano detrás del piso/mueble. Tolerancia para hojas/marcos
      // coincidentes con la pared.
      const dPrimero = hits[0].distance
      for (const h of hits) {
        if (h.distance > dPrimero + 1.6) break
        const r = buscarMuro(h.object)
        if (r) return r
      }
      return null
    }

    /** Convierte un impacto al formato de `muroSelHover` (cuarto o libre). */
    const aHover = (hit: ReturnType<typeof muroBajoCursor>): HoverMuro => {
      if (!hit) return null
      if (hit.muroLibre != null) return { muroLibreId: hit.muroLibre }
      const m = hit.muro!
      return { roomId: m.roomId, off: m.off, side: m.side }
    }

    const onDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
      if (e.button === 0 && muroBajoCursor(e.clientX, e.clientY)) _clicMuroEn = performance.now()
    }

    const onUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return // fue arrastre de cámara
      const hit = muroBajoCursor(e.clientX, e.clientY)
      if (!hit) return
      _clicMuroEn = performance.now()
      const P = usePlanos.getState()
      const L = useLayout.getState()
      useEditorUi.getState().setTab('mapa')
      if (hit.muroLibre != null) {
        P.setMuroLibreSel(hit.muroLibre)
        // Igual que en los muros de cuarto: en modo Puertas/Ventanas el clic CREA la abertura
        // en cualquier muro libre (recto, triángulo o círculo), no solo lo selecciona. El
        // panel queda abierto para ajustarla o quitarla. (Los muros libres no admiten
        // cuadro/espejo, solo cristal; el pincel de contenido se ignora ahí.)
        if (P.herramienta === 'puerta') void setEstiloMuroLibre(hit.muroLibre, { puerta: true, ventana: false, puertaTipo: P.tipoPuerta })
        else if (P.herramienta === 'ventana') void setEstiloMuroLibre(hit.muroLibre, { ventana: true, puerta: false })
        return
      }
      const m = hit.muro!
      P.setSeleccion({ tipo: 'arista', roomId: m.roomId, off: m.off, side: m.side })
      // Al crear la abertura se aplica la VARIANTE elegida en el pincel (tipo de puerta o
      // contenido de la ventana), no solo la abertura genérica.
      if (P.herramienta === 'puerta') {
        void L.paintEdge(m.roomId, m.off, m.side, 'puerta')
        void L.setEdgeEstilo(m.roomId, m.off, m.side, {
          puerta: { tipo: P.tipoPuerta, color: TIPOS_PUERTA.find((x) => x.id === P.tipoPuerta)!.defaultColor },
        })
      } else if (P.herramienta === 'ventana') {
        void L.setEdgeEstilo(m.roomId, m.off, m.side, {
          // La cara (interior/exterior) solo importa para cuadro/espejo; en ventana normal es inocua.
          muro: { ventana: true, ventContenido: P.ventContenido, ventCara: P.ventCara },
        })
      }
    }

    // Hover: resalta el muro bajo el cursor (throttle ~ cada 45 ms, solo si cambia).
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return // arrastrando la cámara
      const t = performance.now()
      if (t - tHover < 45) return
      tHover = t
      const nuevo = aHover(muroBajoCursor(e.clientX, e.clientY))
      const P = usePlanos.getState()
      if (!mismoHover(P.muroSelHover, nuevo)) P.setMuroSelHover(nuevo)
      document.body.style.cursor = nuevo ? 'pointer' : 'default'
    }
    const onLeave = () => {
      if (usePlanos.getState().muroSelHover) usePlanos.getState().setMuroSelHover(null)
    }

    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      usePlanos.getState().setMuroSelHover(null)
    }
  }, [activo, gl, camera, scene])

  return null
}
