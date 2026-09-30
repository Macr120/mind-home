import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useCiclo } from '../state/cicloStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { mezclar, FUERZA_LUZ_DEFAULT } from './temas'
import { useTemaActivo } from './useTema'
import { estadoCielo, colorFondo } from './cielo'
import { getFondo } from './fondos'
import { FondoImagenCielo } from './FondoImagenCielo'
import { SIZE } from './walls'
import { useEscenarioVisible } from './escenarios/limitesCasa'

/** Disco luminoso (sol o luna) con un halo suave; no recibe tono para que "brille". */
function Astro({ pos, color, radio, visible }: { pos: [number, number, number]; color: string; radio: number; visible: boolean }) {
  if (!visible) return null
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[radio, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radio * 1.75, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Sustituye a la luz estática de la escena por el ciclo día/noche: el sol recorre el
 * cielo (este→cenit→oeste) según la hora, de noche aparece la luna y baja la luz
 * ambiental. También fija el color de fondo (respetando el tema, oscurecido de noche).
 */
export function CieloDiaNoche() {
  const gl = useThree((s) => s.gl)
  const minutos = useCiclo((s) => s.minutos)
  const brilloCielo = useCiclo((s) => s.brilloCielo)
  // Re-pinta al cambiar el sol de la casa (`estadoCielo` ya lo lee del módulo).
  const solCasa = useCiclo((s) => s.sol.activo)
  // Con el mapa de sombras abierto, el sol es el de su arco 3D: el disco del cielo sobra.
  const mapaSombras = useCiclo((s) => s.mapaSombras)
  const camara = useThree((s) => s.camera)
  const editMode = useLayout((s) => s.editMode)
  const escenarioVisible = useEscenarioVisible()
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const tema = useTemaActivo()
  const fondoId = useDiseño((s) => s.fondoId)
  const fondoColorFijo = useDiseño((s) => s.fondoColorFijo)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const fondoDef = getFondo(fondoId)
  const usaImagen = fondoImagenActivo != null
  // Radio dinámico: el sol/luna orbitan SIEMPRE fuera del mapa (crece con la rejilla),
  // pero sin salirse del encuadre para que se vean en el cielo.
  const radio = (Math.max(gridCols, gridRows) * SIZE) / 2 * 1.25 + 8
  const cielo = estadoCielo(minutos, radio)
  let fondo: string
  if (fondoId === 'color_fijo') {
    // Color sólido fijo: no se mezcla con la noche ni con el tema.
    fondo = fondoColorFijo
  } else if (fondoDef.id === 'auto') {
    fondo = colorFondo(cielo, tema?.fondo ?? null)
  } else {
    const arriba = mezclar(fondoDef.gradiente[0], '#0b0e1a', cielo.nocheFactor * 0.4)
    const abajo = mezclar(fondoDef.gradiente[1], '#050508', cielo.nocheFactor * 0.5)
    fondo = mezclar(arriba, abajo, 0.5)
    if (tema) fondo = mezclar(fondo, tema.fondo, 0.2)
  }
  // En la nave siempre es de noche afuera: el espacio no tiene cielo diurno.
  const enElEspacio = escenarioVisible === 'nave'
  if (enElEspacio && tema && fondoId !== 'color_fijo') fondo = tema.fondo

  // El tema modula la luz del ciclo: tiñe los colores (mezcla) y escala la intensidad.
  // Sin tema (o sin `luz`) todo queda exactamente como siempre.
  const luzTema = tema?.luz
  const solColor = luzTema?.sol
    ? mezclar(cielo.luzEscena.color, luzTema.sol, luzTema.fuerzaSol ?? FUERZA_LUZ_DEFAULT)
    : cielo.luzEscena.color
  const solIntensidad = cielo.luzEscena.intensidad * brilloCielo * (luzTema?.intensidadSol ?? 1)
  const ambienteColor = luzTema?.ambiente
    ? mezclar(cielo.ambienteColor, luzTema.ambiente, luzTema.fuerzaAmbiente ?? FUERZA_LUZ_DEFAULT)
    : cielo.ambienteColor

  // La luz de escena es CONSTANTE (cenital), así que la sombra estática se renderiza una
  // sola vez y siempre coincide. Se refresca al activar/desactivar el modo edición y,
  // con el sol real, cuando la luz se mueve (una vez por minuto en vivo).
  const clavePosLuz = cielo.luzEscena.pos.map((v) => v.toFixed(2)).join(',')
  useEffect(() => {
    if (!editMode) gl.shadowMap.needsUpdate = true
  }, [editMode, gl, clavePosLuz])

  // Con el sol de la casa el astro puede pasar por el lado de la cámara: ahí se
  // pintaría encima del terreno, así que solo se dibuja cuando queda detrás del mapa.
  const detrasDelMapa = (p: [number, number, number]) =>
    !solCasa || p[0] * camara.position.x + p[2] * camara.position.z < 0

  // El color de la niebla es del tema (su ambiente); con un paisaje 3D del menú Fondo, la
  // distancia es la del paisaje, que ve más lejos (si no, la nieve y la niebla lo lavan todo).
  const nieblaPaisaje = !escenarioVisible && !usaImagen ? fondoDef.niebla : undefined
  const niebla =
    tema?.niebla && nieblaPaisaje
      ? { ...tema.niebla, near: Math.max(tema.niebla.near, nieblaPaisaje.near), far: Math.max(tema.niebla.far, nieblaPaisaje.far) }
      : (tema?.niebla ?? nieblaPaisaje)

  // Exposición del tone mapping por tema.
  const exposicion = luzTema?.exposicion ?? 1
  useEffect(() => {
    gl.toneMappingExposure = exposicion
  }, [gl, exposicion])

  return (
    <>
      {!usaImagen && <color attach="background" args={[fondo]} />}
      {niebla && <fog attach="fog" args={[niebla.color, niebla.near, niebla.far]} />}
      {usaImagen && (
        <>
          <color attach="background" args={['#000000']} />
          <FondoImagenCielo />
        </>
      )}
      <ambientLight intensity={cielo.ambienteIntensidad} color={ambienteColor} />

      {/* Relleno de luna: ilumina el PISO desde arriba (luz fría) cuando cae la noche.
          El piso exterior no tiene focos propios, así que sin esto queda casi negro.
          La intensidad sube con la noche y es casi nula de día. */}
      <hemisphereLight
        color={'#aebfe6'}
        groundColor={'#0b0e1a'}
        intensity={0.1 + cielo.nocheFactor * 0.6}
      />

      {/* Luz de escena CONSTANTE (mediodía de día / medianoche de noche): ilumina y proyecta
          las sombras de forma estable, sin seguir al disco del sol. */}
      <directionalLight
        position={cielo.luzEscena.pos}
        intensity={solIntensidad}
        color={solColor}
        castShadow={!editMode}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
      />

      {/* Discos visibles del sol y la luna: SÍ recorren el cielo (este → oeste). */}
      <Astro pos={cielo.sol.pos} color={cielo.sol.color} radio={1.5} visible={cielo.sol.visible && !mapaSombras && detrasDelMapa(cielo.sol.pos)} />
      <Astro pos={cielo.luna.pos} color={cielo.luna.color} radio={1.25} visible={!enElEspacio && cielo.luna.visible && detrasDelMapa(cielo.luna.pos)} />
    </>
  )
}
