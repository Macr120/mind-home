import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useDiseño } from '../../../core/state/disenoStore'
import { useMiniaturas } from './miniaturasStore'
import { patronDe } from './resolver'
import { faseRepresentativa } from './pose'
import { EscenaEjercicio, encuadreDe } from './VisorEjercicio'

/**
 * Un solo canvas oculto que atiende la cola de `useMiniaturas`: renderiza el
 * avatar en la pose representativa de cada ejercicio pedido (dos frames a mano
 * con `advance`, sin depender de requestAnimationFrame) y guarda la captura.
 * Lo monta `EjercicioApp` mientras las miniaturas están en modo animación.
 */
function Captura({ slug }: { slug: string }) {
  const { gl, camera, advance } = useThree()
  const av = useDiseño((s) => s.avatar)
  const resolver = useMiniaturas((s) => s.resolver)
  const patron = patronDe(slug)
  useEffect(() => {
    if (!patron) {
      resolver(slug, '')
      return
    }
    const enc = encuadreDe(patron)
    camera.position.set(...enc.pos)
    camera.lookAt(...enc.target)
    const id = setTimeout(() => {
      const t0 = performance.now()
      advance(t0)
      advance(t0 + 16)
      resolver(slug, gl.domElement.toDataURL('image/png'))
    }, 30)
    return () => clearTimeout(id)
  }, [slug, patron, camera, gl, advance, resolver])
  if (!patron) return null
  return <EscenaEjercicio av={av} patron={patron} fase={faseRepresentativa(patron)} />
}

export default function RenderizadorMiniaturas() {
  const slug = useMiniaturas((s) => s.cola[0])
  const limpiar = useMiniaturas((s) => s.limpiar)
  const av = useDiseño((s) => s.avatar)
  // Otro avatar (colores, ropa, escala…): las capturas guardadas ya no son él.
  // Al montar no hay nada que limpiar (y borrar la cola dejaría sin pose a las miniaturas ya pedidas).
  const avPrevio = useRef(av)
  useEffect(() => {
    if (avPrevio.current === av) return
    avPrevio.current = av
    limpiar()
  }, [av, limpiar])
  return (
    <div className="pointer-events-none fixed start-[-9999px] top-0 h-32 w-32" aria-hidden>
      <Canvas
        dpr={1}
        frameloop="never"
        gl={{ preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [2.6, 1.9, 4.1], fov: 32, near: 0.1, far: 100 }}
      >
        {slug && <Captura key={slug} slug={slug} />}
      </Canvas>
    </div>
  )
}
