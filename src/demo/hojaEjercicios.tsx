/**
 * Hoja de contacto de las animaciones de ejercicio (SOLO desarrollo).
 *
 * `window.mhHojaEjercicios(fases?, filtro?, columnas?)` renderiza uno a uno los ejercicios
 * de `MAPA` (todos, o los que contengan `filtro` en el slug) en las fases
 * pedidas (`'auto'` = la más representativa de cada patrón), con el avatar
 * actual, en UN solo canvas oculto, y muestra la rejilla
 * de capturas encima de la app para revisar las poses en lote. Es la
 * herramienta de autoría de `patrones.ts`/`posturas.ts`: se corrigen grados,
 * se vuelve a llamar, se compara.
 */
import { useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { useDiseño } from '../core/state/disenoStore'
import { Icono } from '../core/ui/iconos/Icono'
import { MAPA } from '../rooms/ejercicio/anim/mapa'
import { patronDe } from '../rooms/ejercicio/anim/resolver'
import { EscenaEjercicio, encuadreDe } from '../rooms/ejercicio/anim/VisorEjercicio'
import { faseRepresentativa, type PatronResuelto } from '../rooms/ejercicio/anim/pose'

interface Toma {
  slug: string
  fase: number
  patron: PatronResuelto
}

/**
 * Encuadra, pinta dos frames a mano (`advance`, como el lienzo del Studio de
 * video: sin depender de requestAnimationFrame, que un panel oculto pausa) y
 * captura.
 */
function CapturaUna({ toma, onListo }: { toma: Toma; onListo: (url: string) => void }) {
  const { gl, camera, advance } = useThree()
  const av = useDiseño((s) => s.avatar)
  useEffect(() => {
    const enc = encuadreDe(toma.patron)
    camera.position.set(...enc.pos)
    camera.lookAt(...enc.target)
    const id = setTimeout(() => {
      const t0 = performance.now()
      advance(t0)
      advance(t0 + 16)
      onListo(gl.domElement.toDataURL('image/png'))
    }, 40)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una captura por toma
  }, [toma])
  return <EscenaEjercicio av={av} patron={toma.patron} fase={toma.fase} />
}

function Hoja({ tomas, columnas, onCerrar }: { tomas: Toma[]; columnas: number; onCerrar: () => void }) {
  const [i, setI] = useState(0)
  const [urls, setUrls] = useState<string[]>([])
  const listo = i >= tomas.length
  const registrar = (url: string) => {
    setUrls((u) => [...u, url])
    setI((k) => k + 1)
  }
  return (
    <div className="ui-noche fixed inset-0 z-[70] overflow-auto bg-black/90 p-3 text-white">
      <div className="mb-2 flex items-center gap-3 text-xs text-white/60">
        <span>
          {listo ? tomas.length : i}/{tomas.length}
        </span>
        <button type="button" onClick={onCerrar} className="ms-auto rounded-lg bg-white/10 px-2 py-1">
          <Icono nombre="cerrar" />
        </button>
      </div>
      {!listo && (
        <div className="fixed start-[-9999px] top-0 h-64 w-64" aria-hidden>
          <Canvas
            shadows
            dpr={1}
            frameloop="never"
            gl={{ preserveDrawingBuffer: true }}
            camera={{ position: [2.6, 1.9, 4.1], fov: 32, near: 0.1, far: 100 }}
          >
            <CapturaUna key={i} toma={tomas[i]} onListo={registrar} />
          </Canvas>
        </div>
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {urls.map((u, k) => (
          <figure key={k} className="rounded bg-white/5 p-0.5">
            <img src={u} alt="" className="aspect-square w-full" />
            <figcaption className="truncate text-center text-[9px] text-white/60">
              {tomas[k].slug} · {tomas[k].fase}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

let raiz: Root | null = null
let nodo: HTMLDivElement | null = null

function cerrar(): void {
  raiz?.unmount()
  nodo?.remove()
  raiz = null
  nodo = null
}

function abrir(fases: number[] | 'auto' = 'auto', filtro = '', columnas = 8): void {
  cerrar()
  const tomas: Toma[] = []
  for (const slug of Object.keys(MAPA)) {
    if (filtro && !slug.includes(filtro)) continue
    const patron = patronDe(slug)
    if (!patron) continue
    for (const fase of fases === 'auto' ? [faseRepresentativa(patron)] : fases) tomas.push({ slug, fase, patron })
  }
  nodo = document.createElement('div')
  document.body.appendChild(nodo)
  raiz = createRoot(nodo)
  raiz.render(<Hoja tomas={tomas} columnas={columnas} onCerrar={cerrar} />)
  console.info(`[MPH] hoja de ejercicios: ${tomas.length} tomas`)
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { mhHojaEjercicios?: typeof abrir }).mhHojaEjercicios = abrir
}
