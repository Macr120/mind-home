import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Ropa, AnclasRopa } from './apariencia'
import { PRENDA_COLOR_DEFAULT } from './apariencia'
import {
  anguloMarcha,
  anguloBrazoNado,
  anguloPiernaNado,
  marchaAvatar,
  MARCHA_BRAZOS,
  MARCHA_PIERNAS,
  type EstadoMarcha,
} from './animacion'
import { monturaFrame, anguloPiernaMontada, ANGULO_BRAZO_MONTADO } from '../state/monturaStore'
import { parqueFrame, anguloPiernaParque, anguloBrazoParque } from '../state/parqueStore'
import { flotadorFrame, ANGULO_PIERNA_FLOTADOR, ANGULO_BRAZO_FLOTADOR } from '../state/flotadorStore'
import { accionCuartoFrame, anguloPiernaAccion, anguloBrazoAccion } from '../state/accionCuartoStore'
import {
  accionFrame,
  anguloBrazoBaile,
  anguloPiernaBaile,
  anguloSaludo,
  ANGULO_BRAZO_CUERDA,
  ANGULO_BRAZO_CARGAR,
} from '../state/herramientaStore'
import { poseBateo } from '../state/juegoCanchaStore'

/**
 * Pivote de marcha para prendas de extremidades (pantalón/tenis/mangas): gira
 * con la misma fórmula que los brazos/piernas del avatar (leen el mismo
 * `marchaAvatar`), así la ropa acompaña el paso sin compartir refs. Montado en
 * un vehículo adopta la misma pose sentada/pedaleo que el cuerpo. Sin
 * `activo` el grupo queda quieto (los offsets de los hijos compensan el pivote).
 */
function PivoteMarcha({
  activo,
  x,
  pivotY,
  factor,
  signo,
  extremidad,
  marchaEstado = marchaAvatar,
  esJugador = true,
  children,
}: {
  activo: boolean
  x: number
  pivotY: number
  factor: number
  signo: 1 | -1
  extremidad: 'pierna' | 'brazo'
  marchaEstado?: EstadoMarcha
  esJugador?: boolean
  children: React.ReactNode
}) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!activo || !g.current) return
    if (esJugador) {
      const bateo = poseBateo()
      if (bateo) {
        // Bateando: las mangas siguen a los brazos (x<0 es el brazo del bate).
        g.current.rotation.x = extremidad === 'pierna' ? 0 : bateo.brazo * (x < 0 ? 1 : 0.82)
        return
      }
      if (monturaFrame.montado) {
        // Piernas sentadas; las mangas bailan si el baile está activo.
        g.current.rotation.x =
          extremidad === 'pierna'
            ? anguloPiernaMontada(signo)
            : accionFrame.bailando
              ? anguloBrazoBaile(-signo as 1 | -1)
              : ANGULO_BRAZO_MONTADO
        return
      }
      if (flotadorFrame.sentado) {
        // Sentado en la dona: misma pose que el cuerpo (piernas al frente, brazos al aro).
        g.current.rotation.x =
          extremidad === 'pierna' ? ANGULO_PIERNA_FLOTADOR : ANGULO_BRAZO_FLOTADOR
        return
      }
      if (parqueFrame.usando && parqueFrame.pose !== 'de-pie') {
        // Sentado/colgado en un juego de parque: misma pose que el cuerpo.
        g.current.rotation.x = extremidad === 'pierna' ? anguloPiernaParque(signo) : anguloBrazoParque()
        return
      }
      if (accionCuartoFrame.usando && accionCuartoFrame.pose !== 'caminar') {
        // Usando un objeto del cuarto: misma pose de acción que el cuerpo.
        g.current.rotation.x =
          extremidad === 'pierna' ? anguloPiernaAccion() : anguloBrazoAccion(-signo as 1 | -1)
        return
      }
      if (accionFrame.cuerda) {
        g.current.rotation.x = extremidad === 'brazo' ? ANGULO_BRAZO_CUERDA : 0
        return
      }
      if (accionFrame.bailando) {
        // El signo de brazo en Prendas es inverso al del cuerpo (ver signoBrazo).
        g.current.rotation.x =
          extremidad === 'pierna' ? anguloPiernaBaile(signo) : anguloBrazoBaile(-signo as 1 | -1)
        return
      }
      if (marchaAvatar.nadando) {
        // Nadando: misma brazada/patada que el cuerpo (x<0 = lado izquierdo, como en CuerpoCubos).
        g.current.rotation.x = extremidad === 'pierna' ? anguloPiernaNado(x < 0) : anguloBrazoNado(x < 0)
        return
      }
    }
    g.current.rotation.x = anguloMarcha(factor, marchaEstado) * signo
    // Saludo: la manga sigue al brazo de esa mano. Solo el jugador. La mano
    // derecha del avatar (mira a +Z) es la del lado x < 0.
    if (esJugador && extremidad === 'brazo') {
      const s = anguloSaludo(performance.now(), x < 0)
      if (s !== null) g.current.rotation.x = s
      // Cargando algo con las dos manos: pisa el saludo, igual que en CuerpoBase.
      if (accionFrame.cargando) g.current.rotation.x = ANGULO_BRAZO_CARGAR
    }
  })
  return (
    <group ref={g} position={[x, pivotY, 0]}>
      {children}
    </group>
  )
}

/**
 * Ropa del personaje, colocada según sus `anclas` (cabeza, torso y piernas), así
 * calza tanto en el avatar (box-man) como en cada agente. Cada prenda se dibuja un
 * poco más grande que la parte del cuerpo para que no haya z-fighting.
 * `marcha`: las prendas de extremidades se balancean al caminar (solo el avatar).
 */
export function Prendas({
  ropa,
  anclas,
  marcha = false,
  marchaEstado = marchaAvatar,
  esJugador = true,
}: {
  ropa: Ropa | undefined
  anclas: AnclasRopa
  marcha?: boolean
  marchaEstado?: EstadoMarcha
  esJugador?: boolean
}) {
  if (!ropa || Object.keys(ropa).length === 0) return null
  const color = (id: keyof Ropa) => ropa[id]?.color ?? PRENDA_COLOR_DEFAULT[id]
  const a = anclas
  const k = a.cabezaR / 0.22 // escala de la cabeza respecto al avatar (lentes)
  const cinturaW = Math.max(...a.piernasX) - Math.min(...a.piernasX) + a.piernaW + 0.06
  // Mismos pivotes que las extremidades del box-man (cadera y hombro).
  const caderaY = a.piernasY + a.piernaH / 2
  const hombroY = a.torsoY + a.torsoH / 2
  const frenteZ = a.torsoD / 2 // frente del torso (corbata/mochila)
  const faldaH = a.piernaH * 1.15 // largo de falda/vestido (cae por las piernas)
  const signoPierna = (x: number): 1 | -1 => (x < 0 ? 1 : -1)
  const signoBrazo = (x: number): 1 | -1 => (x < 0 ? -1 : 1)

  return (
    <group>
      {/* Tenis: sobre los pies de cada pierna */}
      {ropa.tenis &&
        a.piernasX.map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
            <mesh position={[0, a.piesY - caderaY, 0.04]} castShadow>
              <boxGeometry args={[a.piernaW, 0.2, a.piernaD * 1.25]} />
              <meshStandardMaterial color={color('tenis')} />
            </mesh>
          </PivoteMarcha>
        ))}

      {/* Pantalón: una pierna por posición + cintura */}
      {ropa.pantalon && (
        <>
          {a.piernasX.map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
              <mesh position={[0, a.piernasY - caderaY, 0]} castShadow>
                <boxGeometry args={[a.piernaW, a.piernaH, a.piernaD]} />
                <meshStandardMaterial color={color('pantalon')} />
              </mesh>
            </PivoteMarcha>
          ))}
          <mesh position={[0, a.piernasY + a.piernaH * 0.5, 0]} castShadow>
            <boxGeometry args={[cinturaW, 0.2, a.piernaD + 0.02]} />
            <meshStandardMaterial color={color('pantalon')} />
          </mesh>
        </>
      )}

      {/* Playera: torso + mangas cortas */}
      {ropa.playera && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <meshStandardMaterial color={color('playera')} />
          </mesh>
          {[-a.brazoX, a.brazoX].map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
              {/* Manga pegada al hombro (pivote): si queda por debajo, asoma un
                  hueco de piel entre la manga y el torso. */}
              <mesh position={[0, 0.02 - 0.15, 0]} castShadow>
                <boxGeometry args={[0.26, 0.3, a.torsoD + 0.02]} />
                <meshStandardMaterial color={color('playera')} />
              </mesh>
            </PivoteMarcha>
          ))}
        </>
      )}

      {/* Chamarra: encima de la playera. Con override (búho) es una prenda grande que
          envuelve el cuerpo, sin mangas ni cuello; si no, torso + mangas largas + cuello. */}
      {ropa.chamarra &&
        (a.chamarra ? (
          <mesh position={[0, a.chamarra.y, 0]} castShadow>
            <boxGeometry args={[a.chamarra.w, a.chamarra.h, a.chamarra.d]} />
            <meshStandardMaterial color={color('chamarra')} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, a.torsoY - 0.02, 0]} castShadow>
              <boxGeometry args={[a.torsoW + 0.12, a.torsoH + 0.1, a.torsoD + 0.14]} />
              <meshStandardMaterial color={color('chamarra')} />
            </mesh>
            {[-a.brazoX, a.brazoX].map((x, i) => (
              <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
                <mesh position={[0, a.torsoY - hombroY, 0]} castShadow>
                  <boxGeometry args={[0.3, a.torsoH + 0.02, a.torsoD + 0.04]} />
                  <meshStandardMaterial color={color('chamarra')} />
                </mesh>
              </PivoteMarcha>
            ))}
            <mesh position={[0, a.torsoY + a.torsoH * 0.58, 0]} castShadow>
              <boxGeometry args={[a.torsoW * 0.83, 0.16, a.torsoD + 0.1]} />
              <meshStandardMaterial color={color('chamarra')} />
            </mesh>
          </>
        ))}

      {/* Lentes: dos cristales + puente sobre la cara */}
      {ropa.lentes && (
        <>
          {[-a.cabezaR * 0.5, a.cabezaR * 0.5].map((x, i) => (
            <mesh key={i} position={[x, a.cabezaY, a.caraZ]}>
              <boxGeometry args={[0.15 * k, 0.12 * k, 0.04]} />
              <meshStandardMaterial color={color('lentes')} />
            </mesh>
          ))}
          <mesh position={[0, a.cabezaY, a.caraZ]}>
            <boxGeometry args={[0.1 * k, 0.03, 0.03]} />
            <meshStandardMaterial color={color('lentes')} />
          </mesh>
        </>
      )}

      {/* Sombrero: ala + copa sobre la cabeza */}
      {ropa.sombrero && (
        <>
          <mesh position={[0, a.cabezaTop + 0.02, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR + 0.14, a.cabezaR + 0.14, 0.05, 20]} />
            <meshStandardMaterial color={color('sombrero')} />
          </mesh>
          <mesh position={[0, a.cabezaTop + 0.18, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR - 0.01, a.cabezaR, 0.28, 20]} />
            <meshStandardMaterial color={color('sombrero')} />
          </mesh>
        </>
      )}

      {/* Gorro de chef: banda ajustada + copete inflado (sin ala, no confundir con el sombrero) */}
      {ropa.gorroChef && (
        <>
          <mesh position={[0, a.cabezaTop + 0.07, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR + 0.02, a.cabezaR + 0.02, 0.1, 20]} />
            <meshStandardMaterial color={color('gorroChef')} />
          </mesh>
          <mesh position={[0, a.cabezaTop + 0.29, 0]} scale={[1.15, 0.8, 1.15]} castShadow>
            <sphereGeometry args={[a.cabezaR + 0.2, 16, 12]} />
            <meshStandardMaterial color={color('gorroChef')} />
          </mesh>
        </>
      )}

      {/* Gorra: cúpula sobre la cabeza + visera al frente */}
      {ropa.gorra && (
        <>
          <mesh position={[0, a.cabezaTop - 0.04, 0]} castShadow>
            <sphereGeometry args={[a.cabezaR + 0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color('gorra')} />
          </mesh>
          <mesh position={[0, a.cabezaTop - 0.03, a.cabezaR + 0.12]} castShadow>
            <boxGeometry args={[(a.cabezaR + 0.05) * 1.3, 0.05, 0.22]} />
            <meshStandardMaterial color={color('gorra')} />
          </mesh>
        </>
      )}

      {/* Bufanda: aro en el cuello + una punta colgando al frente */}
      {ropa.bufanda && (
        <>
          <mesh position={[0, hombroY + 0.05, 0]} castShadow>
            <cylinderGeometry args={[a.torsoW * 0.42, a.torsoW * 0.42, 0.16, 16]} />
            <meshStandardMaterial color={color('bufanda')} />
          </mesh>
          <mesh position={[0.06, hombroY - 0.16, frenteZ + 0.02]} castShadow>
            <boxGeometry args={[0.13, 0.4, 0.06]} />
            <meshStandardMaterial color={color('bufanda')} />
          </mesh>
        </>
      )}

      {/* Corbata: nudo en el cuello + tira por el frente del torso */}
      {ropa.corbata && (
        <>
          <mesh position={[0, hombroY - 0.02, frenteZ + 0.02]}>
            <boxGeometry args={[0.1, 0.1, 0.04]} />
            <meshStandardMaterial color={color('corbata')} />
          </mesh>
          <mesh position={[0, a.torsoY - 0.02, frenteZ + 0.02]}>
            <boxGeometry args={[0.12, a.torsoH * 0.6, 0.03]} />
            <meshStandardMaterial color={color('corbata')} />
          </mesh>
        </>
      )}

      {/* Camisa: torso + mangas largas */}
      {ropa.camisa && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <meshStandardMaterial color={color('camisa')} />
          </mesh>
          {[-a.brazoX, a.brazoX].map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
              <mesh position={[0, a.torsoY - hombroY, 0]} castShadow>
                <boxGeometry args={[0.26, a.torsoH + 0.02, a.torsoD + 0.02]} />
                <meshStandardMaterial color={color('camisa')} />
              </mesh>
            </PivoteMarcha>
          ))}
        </>
      )}

      {/* Capa: manto por detrás del torso, de los hombros a las rodillas */}
      {ropa.capa && (
        <mesh position={[0, a.torsoY - 0.08, -(a.torsoD / 2 + 0.04)]} castShadow>
          <boxGeometry args={[a.torsoW + 0.14, a.torsoH + 0.34, 0.04]} />
          <meshStandardMaterial color={color('capa')} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Vestido: torso + falda acampanada */}
      {ropa.vestido && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <meshStandardMaterial color={color('vestido')} />
          </mesh>
          <mesh position={[0, caderaY - faldaH / 2 + 0.05, 0]} castShadow>
            <cylinderGeometry args={[cinturaW * 0.55, cinturaW, faldaH, 20, 1, true]} />
            <meshStandardMaterial color={color('vestido')} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* Falda: cintura + campana acampanada */}
      {ropa.falda && (
        <>
          <mesh position={[0, caderaY, 0]} castShadow>
            <cylinderGeometry args={[cinturaW * 0.5, cinturaW * 0.5, 0.14, 20]} />
            <meshStandardMaterial color={color('falda')} />
          </mesh>
          <mesh position={[0, caderaY - faldaH / 2 + 0.02, 0]} castShadow>
            <cylinderGeometry args={[cinturaW * 0.52, cinturaW, faldaH, 20, 1, true]} />
            <meshStandardMaterial color={color('falda')} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* Shorts: pernera corta + cintura */}
      {ropa.shorts && (
        <>
          {a.piernasX.map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
              <mesh position={[0, a.piernasY + a.piernaH * 0.25 - caderaY, 0]} castShadow>
                <boxGeometry args={[a.piernaW + 0.04, a.piernaH * 0.5, a.piernaD + 0.04]} />
                <meshStandardMaterial color={color('shorts')} />
              </mesh>
            </PivoteMarcha>
          ))}
          <mesh position={[0, caderaY, 0]} castShadow>
            <boxGeometry args={[cinturaW, 0.2, a.piernaD + 0.02]} />
            <meshStandardMaterial color={color('shorts')} />
          </mesh>
        </>
      )}

      {/* Botas: caña sobre la pierna + suela en el pie */}
      {ropa.botas &&
        a.piernasX.map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
            <mesh position={[0, a.piesY + a.piernaH * 0.22 - caderaY, 0]} castShadow>
              <boxGeometry args={[a.piernaW + 0.05, a.piernaH * 0.5, a.piernaD + 0.05]} />
              <meshStandardMaterial color={color('botas')} />
            </mesh>
            <mesh position={[0, a.piesY - caderaY, 0.05]} castShadow>
              <boxGeometry args={[a.piernaW + 0.05, 0.18, a.piernaD * 1.3]} />
              <meshStandardMaterial color={color('botas')} />
            </mesh>
          </PivoteMarcha>
        ))}

      {/* Guantes: en las manos, al final de cada brazo */}
      {ropa.guantes &&
        [-a.brazoX, a.brazoX].map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
            <mesh position={[0, -(a.torsoH * 0.95 + 0.05), 0]} castShadow>
              <boxGeometry args={[0.16, 0.16, a.torsoD + 0.02]} />
              <meshStandardMaterial color={color('guantes')} />
            </mesh>
          </PivoteMarcha>
        ))}

      {/* Mochila: bulto por detrás del torso + tirantes al frente */}
      {ropa.mochila && (
        <>
          <mesh position={[0, a.torsoY + 0.02, -(a.torsoD / 2 + 0.12)]} castShadow>
            <boxGeometry args={[a.torsoW * 0.8, a.torsoH * 0.85, 0.22]} />
            <meshStandardMaterial color={color('mochila')} />
          </mesh>
          {[-a.torsoW * 0.28, a.torsoW * 0.28].map((x, i) => (
            <mesh key={i} position={[x, a.torsoY + 0.05, frenteZ]} castShadow>
              <boxGeometry args={[0.07, a.torsoH * 0.8, 0.05]} />
              <meshStandardMaterial color={color('mochila')} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
