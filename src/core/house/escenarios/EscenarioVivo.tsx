import { lazy, Suspense, useEffect, useMemo, useRef, type ComponentType } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useDiseño } from '../../state/disenoStore'
import { useTemaActivo } from '../useTema'
import { getTema, type EscenarioId, type Tema, type TemaId } from '../temas'
import { getFondo, type PaisajeId } from '../fondos'
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
  /**
   * Fondo estático (menú Fondo): solo el paisaje, quieto y al ras del piso de la casa,
   * sin el vehículo. Sin esto es el tema dinámico completo.
   */
  soloPaisaje?: boolean
  /** Giro del marco local sobre Y (para saber dónde queda la cámara isométrica). */
  rumbo: number
}

// Cada escenario es su propio chunk: no pesa en el arranque de quien no los usa.
// Los de `paisajes/` no tienen vehículo: solo existen como fondo quieto.
const ESCENAS: Record<PaisajeId, ComponentType<PropsEscenario>> = {
  nave: lazy(() => import('./Nave')),
  avion: lazy(() => import('./Avion')),
  rodante: lazy(() => import('./CasaRodante')),
  tortuga: lazy(() => import('./Tortuga')),
  barco: lazy(() => import('./Barco')),
  tren: lazy(() => import('./Tren')),
  playa: lazy(() => import('./paisajes/Playa')),
  nevado: lazy(() => import('./paisajes/Nevado')),
  otonal: lazy(() => import('./paisajes/Otonal')),
  ciudad: lazy(() => import('./paisajes/Ciudad')),
  volcan: lazy(() => import('./paisajes/Volcan')),
  luna: lazy(() => import('./paisajes/Luna')),
  marino: lazy(() => import('./paisajes/Marino')),
  dunas: lazy(() => import('./paisajes/Dunas')),
}

/** Velocidad del fondo por escenario (unidades por segundo), antes del ajuste del usuario. */
const VELOCIDAD: Record<EscenarioId, number> = {
  nave: 26,
  avion: 14,
  rodante: 6,
  tortuga: 1.4,
  barco: 7,
  tren: 16,
}

/** Tema de fábrica que viste un paisaje usado como fondo estático sin su tema. */
const VESTIDO_PAISAJE: Record<PaisajeId, TemaId> = {
  nave: 'nave',
  avion: 'avion',
  rodante: 'apocalipsis',
  tortuga: 'tortuga',
  barco: 'pirata',
  tren: 'tren',
  playa: 'pirata',
  nevado: 'navidad',
  otonal: 'tortuga',
  ciudad: 'cyberpunk',
  volcan: 'apocalipsis',
  luna: 'nave',
  marino: 'pirata',
  dunas: 'vaquero',
}

const QUIETO: Recorrido = { d: 0 }

/**
 * Tema dinámico: monta la casa sobre un vehículo quieto y hace correr el fondo.
 * En el editor se desmonta (vuelven el piso y la rejilla para poder construir).
 * Sin tema dinámico, un fondo del menú Fondo puede poner el mismo paisaje, quieto.
 */
export function EscenarioVivo() {
  const escenario = useEscenarioVisible()
  const tema = useTemaActivo()
  const lim = useLimitesCasa()
  const fondoId = useDiseño((s) => s.fondoId)
  const conImagen = useDiseño((s) => s.fondoImagenActivo != null)
  const gl = useThree((s) => s.gl)
  const recorrido = useRef<Recorrido>({ d: 0 }).current
  const reducirMovimiento = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  )
  const paisaje = !escenario && !conImagen ? (getFondo(fondoId).escena ?? null) : null
  const velocidad = VELOCIDAD[escenario ?? 'nave'] * (tema?.velocidadEscenario ?? 1)

  // Límites para el personaje: solo mientras el vehículo se ve.
  useEffect(() => {
    setLimitesEscenario(escenario ? lim : null)
    return () => setLimitesEscenario(null)
  }, [escenario, lim])

  // La sombra está congelada: al aparecer/cambiar el vehículo hay que repintarla.
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, escenario, paisaje, lim])

  useFrame((_, delta) => {
    if (!escenario || reducirMovimiento) return
    // Si el personaje se baja del plano, el vehículo se detiene hasta que vuelva.
    if (fueraDelEscenario(playerPos.x, playerPos.z)) return
    recorrido.d += Math.min(delta, 0.25) * velocidad
  })

  const cual = escenario ?? paisaje
  const vestido = escenario ? tema : getTema(VESTIDO_PAISAJE[cual ?? 'nave'])
  if (!cual || !vestido) return null
  // La proa va a lo largo del lado más largo de la casa; gira el marco local hacia −X o −Z.
  const porX = lim.ancho >= lim.largo
  const rumbo = porX ? Math.PI : Math.PI / 2
  const Escena = ESCENAS[cual]
  return (
    <RecorridoCtx.Provider value={escenario ? recorrido : QUIETO}>
      <group position={[lim.cx, 0, lim.cz]} rotation={[0, rumbo, 0]}>
        <Suspense fallback={null}>
          <Escena
            L={porX ? lim.ancho : lim.largo}
            W={porX ? lim.largo : lim.ancho}
            alto={lim.alto}
            tema={vestido}
            soloPaisaje={!escenario}
            rumbo={rumbo}
          />
        </Suspense>
      </group>
    </RecorridoCtx.Provider>
  )
}
