import { lazy, Suspense, useEffect, useMemo, useRef, type ComponentType } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayout } from '../../state/layoutStore'
import { useTemaActivo } from '../useTema'
import type { EscenarioId, Tema } from '../temas'
import { RecorridoCtx, type Recorrido } from './fondoMovil'
import { fueraDelEscenario, setLimitesEscenario, useEscenarioVisible, useLimitesCasa } from './limitesCasa'
import { playerPos } from '../../state/playerPosition'

/** Lo que recibe cada escenario, ya en su marco local (proa hacia +X). */
export interface PropsEscenario {
  /** Eslora: largo de lo construido a lo largo del viaje. */
  L: number
  /** Manga: ancho de lo construido. */
  W: number
  alto: number
  tema: Tema
}

// Cada escenario es su propio chunk: no pesa en el arranque de quien no los usa.
const ESCENAS: Record<EscenarioId, ComponentType<PropsEscenario>> = {
  nave: lazy(() => import('./Nave')),
  avion: lazy(() => import('./Avion')),
  rodante: lazy(() => import('./CasaRodante')),
  tortuga: lazy(() => import('./Tortuga')),
  barco: lazy(() => import('./Barco')),
}

/** Velocidad del fondo por escenario (unidades por segundo). */
const VELOCIDAD: Record<EscenarioId, number> = {
  nave: 26,
  avion: 14,
  rodante: 6,
  tortuga: 1.4,
  barco: 7,
}

/**
 * Tema dinámico: monta la casa sobre un vehículo quieto y hace correr el fondo.
 * En el editor se desmonta (vuelven el piso y la rejilla para poder construir).
 */
export function EscenarioVivo() {
  const escenario = useEscenarioVisible()
  const tema = useTemaActivo()
  const lim = useLimitesCasa()
  const editMode = useLayout((s) => s.editMode)
  const gl = useThree((s) => s.gl)
  const recorrido = useRef<Recorrido>({ d: 0 }).current
  const reducirMovimiento = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  )

  // Límites para el personaje: solo mientras el escenario se ve.
  useEffect(() => {
    setLimitesEscenario(escenario ? lim : null)
    return () => setLimitesEscenario(null)
  }, [escenario, lim])

  // La sombra está congelada: al aparecer/cambiar el vehículo hay que repintarla.
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, escenario, lim])

  useFrame((_, delta) => {
    if (!escenario || editMode || reducirMovimiento) return
    // Si el personaje se baja del plano, el vehículo se detiene hasta que vuelva.
    if (fueraDelEscenario(playerPos.x, playerPos.z)) return
    recorrido.d += Math.min(delta, 0.25) * VELOCIDAD[escenario]
  })

  if (!escenario || !tema) return null
  // La proa va a lo largo del lado más largo de la casa; gira el marco local hacia −X o −Z.
  const porX = lim.ancho >= lim.largo
  const Escena = ESCENAS[escenario]
  return (
    <RecorridoCtx.Provider value={recorrido}>
      <group position={[lim.cx, 0, lim.cz]} rotation={[0, porX ? Math.PI : Math.PI / 2, 0]}>
        <Suspense fallback={null}>
          <Escena L={porX ? lim.ancho : lim.largo} W={porX ? lim.largo : lim.ancho} alto={lim.alto} tema={tema} />
        </Suspense>
      </group>
    </RecorridoCtx.Provider>
  )
}
