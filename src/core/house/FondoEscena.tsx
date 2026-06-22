import { Suspense } from 'react'
import { Stars } from '@react-three/drei'
import { useDiseño } from '../state/disenoStore'
import { getFondo } from './fondos'

/** Estrellas de fondo (sin plano: el color del cielo lo pone CieloDiaNoche). */
function EstrellasFondo({ count }: { count: number }) {
  return (
    <Suspense fallback={null}>
      <Stars
        radius={100}
        depth={60}
        count={count}
        factor={3}
        saturation={0.25}
        fade
        speed={0.12}
      />
    </Suspense>
  )
}

/** Capa opcional de estrellas cuando el fondo lo indica. */
export function FondoEscena() {
  const fondoId = useDiseño((s) => s.fondoId)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const fondo = getFondo(fondoId)
  if (fondoImagenActivo != null || fondo.id === 'auto' || !fondo.estrellas) return null
  return <EstrellasFondo count={fondo.id === 'nebulosa' ? 1400 : 700} />
}
