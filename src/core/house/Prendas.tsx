import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MatStd } from './primitivas'
import type { Ropa, AnclasRopa, PrendaId } from './apariencia'
import { PRENDA_COLOR_DEFAULT, colocacionTatuaje, pivoteParte, puntoTatuajePropio, type PuntoTatuaje } from './apariencia'
import type { TatuajePuesto } from '../state/disenoStore'
import { hornearPrenda, PRENDAS_DE_PIEZAS } from './hornearPrenda'
import { ModeloPiezas } from './modeloPersonalizado'
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
    // El nombre deja a la vista previa saber qué extremidad tocó el usuario (tatuajes).
    <group ref={g} name={`${extremidad}${x < 0 ? 'Der' : 'Izq'}`} position={[x, pivotY, 0]}>
      {children}
    </group>
  )
}

/**
 * Textura de un tatuaje: el dibujo (emoji o símbolo) pasado a un solo color de
 * tinta. Las zonas oscuras del emoji quedan más cargadas, así conserva el
 * detalle en vez de ser una silueta plana. Cacheada por dibujo + tinta.
 */
const texturasTatuaje = new Map<string, THREE.CanvasTexture>()
function texturaTatuaje(dibujo: string, tinta: string): THREE.CanvasTexture {
  const clave = `${dibujo}|${tinta}`
  const previa = texturasTatuaje.get(clave)
  if (previa) return previa
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = 128
  const ctx = lienzo.getContext('2d')!
  ctx.font = '100px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (dibujo === DIBUJO_TRIBAL) {
    // Tribal: tres ondas gruesas de puntas afiladas (no hay emoji que lo represente).
    ctx.fillStyle = '#000'
    for (const y of [34, 64, 94]) {
      ctx.beginPath()
      ctx.moveTo(4, y)
      ctx.bezierCurveTo(30, y - 26, 44, y + 20, 64, y - 4)
      ctx.bezierCurveTo(84, y - 26, 98, y + 20, 124, y)
      ctx.bezierCurveTo(98, y + 10, 84, y - 12, 64, y + 8)
      ctx.bezierCurveTo(44, y - 12, 30, y + 10, 4, y)
      ctx.fill()
    }
  } else {
    ctx.fillText(dibujo, 64, 70)
  }
  const img = ctx.getImageData(0, 0, 128, 128)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255
    d[i + 3] = d[i + 3] * (0.6 + 0.4 * (1 - lum))
  }
  ctx.putImageData(img, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = tinta
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(lienzo)
  tex.colorSpace = THREE.SRGBColorSpace
  texturasTatuaje.set(clave, tex)
  return tex
}

/** Textura de un tatuaje propio (su imagen tal cual, con sus colores). Cacheada por imagen. */
const texturasImagen = new Map<string, THREE.Texture>()
function texturaImagen(url: string): THREE.Texture {
  const previa = texturasImagen.get(url)
  if (previa) return previa
  const tex = new THREE.TextureLoader().load(url)
  tex.colorSpace = THREE.SRGBColorSpace
  texturasImagen.set(url, tex)
  return tex
}

/** Tamaño base de un tatuaje propio (en unidades del avatar). */
const TAM_PROPIO = 0.22

const DIBUJO_TRIBAL = 'tribal'

/** Dibujo y tamaño base (en unidades del avatar) de cada tatuaje. */
const TATUAJES: Partial<Record<PrendaId, { dibujo: string; tam: number }>> = {
  tatuajeCorazon: { dibujo: '❤', tam: 0.15 },
  tatuajeAncla: { dibujo: '⚓', tam: 0.15 },
  tatuajeTribal: { dibujo: DIBUJO_TRIBAL, tam: 0.18 },
  tatuajeRosa: { dibujo: '🌹', tam: 0.2 },
  tatuajeDragon: { dibujo: '🐉', tam: 0.42 },
  tatuajeEstrella: { dibujo: '★', tam: 0.08 },
  tatuajeLagrima: { dibujo: '💧', tam: 0.06 },
}

const EJE_Z = new THREE.Vector3(0, 0, 1)
const rayo = new THREE.Raycaster()
/** Cuánto se busca la capa exterior por encima y por debajo del punto guardado. */
const BUSCAR_FUERA = 0.4
const VENTANA = 0.12
/** Separación de la superficie (evita parpadeo contra la ropa o la piel). */
const SEPARACION = 0.006

/**
 * Tatuaje como ESTAMPA: un plano con la textura que se pega a la capa más
 * externa del cuerpo en ese punto (la ropa si la hay, la piel si no). Tras
 * cada cambio lanza un rayo desde fuera hacia `-n` y se coloca en lo primero
 * que toca cerca del punto; `capas` cambia cuando cambia la ropa puesta.
 * No se deja tocar por rayos (el visor coloca tatuajes sobre el cuerpo, no sobre otros tatuajes).
 */
function Calca({
  mapa,
  punto,
  tam,
  capas,
}: {
  mapa: THREE.Texture
  punto: PuntoTatuaje
  tam: number
  capas: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const pendiente = useRef(true)
  const [px, py, pz] = punto.p
  const [nx, ny, nz] = punto.n
  const normal = useMemo(() => new THREE.Vector3(nx, ny, nz).normalize(), [nx, ny, nz])
  const giro = useMemo(() => new THREE.Quaternion().setFromUnitVectors(EJE_Z, normal), [normal])

  // Posición cruda al instante (sin render no hay rayo); el rayo la corrige en el siguiente frame.
  useLayoutEffect(() => {
    ref.current?.position.set(px, py, pz).addScaledVector(normal, SEPARACION)
    pendiente.current = true
  }, [px, py, pz, normal, capas])

  useFrame(() => {
    const m = ref.current
    if (!pendiente.current || !m?.parent) return
    pendiente.current = false
    let raiz: THREE.Object3D | null = m
    while (raiz && raiz.name !== 'prendas-raiz') raiz = raiz.parent
    const cuerpo = raiz?.parent
    if (!cuerpo) return
    const padre = m.parent
    padre.updateWorldMatrix(true, false)
    const escala = new THREE.Vector3().setFromMatrixScale(padre.matrixWorld).x || 1
    const origen = new THREE.Vector3(px, py, pz).addScaledVector(normal, BUSCAR_FUERA).applyMatrix4(padre.matrixWorld)
    const dir = normal.clone().transformDirection(padre.matrixWorld).negate()
    rayo.set(origen, dir)
    rayo.near = (BUSCAR_FUERA - VENTANA) * escala
    rayo.far = (BUSCAR_FUERA + VENTANA) * escala
    const golpe = rayo.intersectObject(cuerpo, true)[0]
    if (golpe) m.position.copy(padre.worldToLocal(golpe.point.clone())).addScaledVector(normal, SEPARACION)
  })

  return (
    <mesh ref={ref} quaternion={giro} raycast={() => {}} renderOrder={2}>
      <planeGeometry args={[tam, tam]} />
      <meshStandardMaterial
        map={mapa}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  )
}

/**
 * Ropa del personaje, colocada según sus `anclas` (cabeza, torso y piernas), así
 * calza tanto en el avatar (box-man) como en cada agente. Cada prenda se dibuja un
 * poco más grande que la parte del cuerpo para que no haya z-fighting.
 * `marcha`: las prendas de extremidades se balancean al caminar (solo el avatar).
 */
export function Prendas({
  ropa: ropaPuesta,
  anclas,
  marcha = false,
  marchaEstado = marchaAvatar,
  esJugador = true,
  tatuajesPropios,
}: {
  ropa: Ropa | undefined
  anclas: AnclasRopa
  marcha?: boolean
  marchaEstado?: EstadoMarcha
  esJugador?: boolean
  /** Tatuajes dibujados o subidos por el usuario (solo el personaje principal). */
  tatuajesPropios?: TatuajePuesto[]
}) {
  const ropa: Ropa = ropaPuesta ?? {}
  if (Object.keys(ropa).length === 0 && !tatuajesPropios?.length) return null
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
  // Tatuajes: en el cuerpo van directo; en brazos/piernas, dentro del pivote de su extremidad.
  const capas = Object.keys(ropa).sort().join()
  // De fábrica (dibujo teñido con la tinta) y propios (su imagen), con la misma colocación.
  const tatuajesPuestos = [
    ...(Object.keys(ropa) as PrendaId[]).flatMap((id) => {
      const dibujo = TATUAJES[id]
      if (!dibujo) return []
      const { punto, escala } = colocacionTatuaje(id, a, ropa[id])
      return [{ key: id, mapa: texturaTatuaje(dibujo.dibujo, color(id)), punto, tam: dibujo.tam * k * escala }]
    }),
    ...(tatuajesPropios ?? []).map((t) => ({
      key: `propio-${t.refId}`,
      mapa: texturaImagen(t.imagen),
      punto: t.punto ?? puntoTatuajePropio(a),
      tam: TAM_PROPIO * k * (t.escala ?? 1),
    })),
  ]
  const tatuajes = tatuajesPuestos.map(({ key: id, mapa, punto, tam }) => {
    const calca = <Calca mapa={mapa} punto={punto} tam={tam} capas={capas} />
    if (punto.parte === 'cuerpo') return <group key={id}>{calca}</group>
    const [x, pivotY] = pivoteParte(punto.parte, a)
    const brazo = punto.parte.startsWith('brazo')
    return (
      <PivoteMarcha
        key={id}
        activo={marcha}
        marchaEstado={marchaEstado}
        esJugador={esJugador}
        x={x}
        pivotY={pivotY}
        factor={brazo ? MARCHA_BRAZOS : MARCHA_PIERNAS}
        signo={brazo ? signoBrazo(x) : signoPierna(x)}
        extremidad={brazo ? 'brazo' : 'pierna'}
      >
        {calca}
      </PivoteMarcha>
    )
  })

  return (
    <group name="prendas-raiz">
      {/* Sombreros extra y vello facial: piezas de `hornearPrenda` (misma forma que su copia editable) */}
      {(Object.keys(ropa) as PrendaId[])
        .filter((id) => PRENDAS_DE_PIEZAS.has(id))
        .map((id) => (
          <ModeloPiezas key={id} piezas={hornearPrenda(id, a, color(id))} />
        ))}

      {/* Tatuajes: estampas encima de la ropa, donde el usuario los colocó */}
      {tatuajes}

      {/* Tenis: sobre los pies de cada pierna */}
      {ropa.tenis &&
        a.piernasX.map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
            <mesh position={[0, a.piesY - caderaY, 0.04]} castShadow>
              <boxGeometry args={[a.piernaW, 0.2, a.piernaD * 1.25]} />
              <MatStd acabado="mueble.tela" color={color('tenis')} />
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
                <MatStd acabado="mueble.tela" color={color('pantalon')} />
              </mesh>
            </PivoteMarcha>
          ))}
          <mesh position={[0, a.piernasY + a.piernaH * 0.5, 0]} castShadow>
            <boxGeometry args={[cinturaW, 0.2, a.piernaD + 0.02]} />
            <MatStd acabado="mueble.tela" color={color('pantalon')} />
          </mesh>
        </>
      )}

      {/* Playera: torso + mangas cortas */}
      {ropa.playera && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <MatStd acabado="mueble.tela" color={color('playera')} />
          </mesh>
          {[-a.brazoX, a.brazoX].map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
              {/* Manga pegada al hombro (pivote): si queda por debajo, asoma un
                  hueco de piel entre la manga y el torso. */}
              <mesh position={[0, 0.02 - 0.15, 0]} castShadow>
                <boxGeometry args={[0.26, 0.3, a.torsoD + 0.02]} />
                <MatStd acabado="mueble.tela" color={color('playera')} />
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
            <MatStd acabado="mueble.tela" color={color('chamarra')} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, a.torsoY - 0.02, 0]} castShadow>
              <boxGeometry args={[a.torsoW + 0.12, a.torsoH + 0.1, a.torsoD + 0.14]} />
              <MatStd acabado="mueble.tela" color={color('chamarra')} />
            </mesh>
            {[-a.brazoX, a.brazoX].map((x, i) => (
              <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
                <mesh position={[0, a.torsoY - hombroY, 0]} castShadow>
                  <boxGeometry args={[0.3, a.torsoH + 0.02, a.torsoD + 0.04]} />
                  <MatStd acabado="mueble.tela" color={color('chamarra')} />
                </mesh>
              </PivoteMarcha>
            ))}
            <mesh position={[0, a.torsoY + a.torsoH * 0.58, 0]} castShadow>
              <boxGeometry args={[a.torsoW * 0.83, 0.16, a.torsoD + 0.1]} />
              <MatStd acabado="mueble.tela" color={color('chamarra')} />
            </mesh>
          </>
        ))}

      {/* Lentes: dos cristales + puente sobre la cara */}
      {ropa.lentes && (
        <>
          {[-a.cabezaR * 0.5, a.cabezaR * 0.5].map((x, i) => (
            <mesh key={i} position={[x, a.cabezaY, a.caraZ]}>
              <boxGeometry args={[0.15 * k, 0.12 * k, 0.04]} />
              <MatStd acabado="mueble.plastico" color={color('lentes')} />
            </mesh>
          ))}
          <mesh position={[0, a.cabezaY, a.caraZ]}>
            <boxGeometry args={[0.1 * k, 0.03, 0.03]} />
            <MatStd acabado="mueble.plastico" color={color('lentes')} />
          </mesh>
        </>
      )}

      {/* Sombrero: ala + copa sobre la cabeza */}
      {ropa.sombrero && (
        <>
          <mesh position={[0, a.cabezaTop + 0.02, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR + 0.14, a.cabezaR + 0.14, 0.05, 20]} />
            <MatStd acabado="mueble.tela" color={color('sombrero')} />
          </mesh>
          <mesh position={[0, a.cabezaTop + 0.18, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR - 0.01, a.cabezaR, 0.28, 20]} />
            <MatStd acabado="mueble.tela" color={color('sombrero')} />
          </mesh>
        </>
      )}

      {/* Gorro de chef: banda ajustada + copete inflado (sin ala, no confundir con el sombrero) */}
      {ropa.gorroChef && (
        <>
          <mesh position={[0, a.cabezaTop + 0.07, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR + 0.02, a.cabezaR + 0.02, 0.1, 20]} />
            <MatStd acabado="mueble.tela" color={color('gorroChef')} />
          </mesh>
          <mesh position={[0, a.cabezaTop + 0.29, 0]} scale={[1.15, 0.8, 1.15]} castShadow>
            <sphereGeometry args={[a.cabezaR + 0.2, 16, 12]} />
            <MatStd acabado="mueble.tela" color={color('gorroChef')} />
          </mesh>
        </>
      )}

      {/* Gorra: cúpula sobre la cabeza + visera al frente */}
      {ropa.gorra && (
        <>
          <mesh position={[0, a.cabezaTop - 0.04, 0]} castShadow>
            <sphereGeometry args={[a.cabezaR + 0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <MatStd acabado="mueble.tela" color={color('gorra')} />
          </mesh>
          <mesh position={[0, a.cabezaTop - 0.03, a.cabezaR + 0.12]} castShadow>
            <boxGeometry args={[(a.cabezaR + 0.05) * 1.3, 0.05, 0.22]} />
            <MatStd acabado="mueble.tela" color={color('gorra')} />
          </mesh>
        </>
      )}

      {/* Bufanda: aro en el cuello + una punta colgando al frente */}
      {ropa.bufanda && (
        <>
          <mesh position={[0, hombroY + 0.05, 0]} castShadow>
            <cylinderGeometry args={[a.torsoW * 0.42, a.torsoW * 0.42, 0.16, 16]} />
            <MatStd acabado="mueble.tela" color={color('bufanda')} />
          </mesh>
          <mesh position={[0.06, hombroY - 0.16, frenteZ + 0.02]} castShadow>
            <boxGeometry args={[0.13, 0.4, 0.06]} />
            <MatStd acabado="mueble.tela" color={color('bufanda')} />
          </mesh>
        </>
      )}

      {/* Corbata: nudo en el cuello + tira por el frente del torso */}
      {ropa.corbata && (
        <>
          <mesh position={[0, hombroY - 0.02, frenteZ + 0.02]}>
            <boxGeometry args={[0.1, 0.1, 0.04]} />
            <MatStd acabado="mueble.tela" color={color('corbata')} />
          </mesh>
          <mesh position={[0, a.torsoY - 0.02, frenteZ + 0.02]}>
            <boxGeometry args={[0.12, a.torsoH * 0.6, 0.03]} />
            <MatStd acabado="mueble.tela" color={color('corbata')} />
          </mesh>
        </>
      )}

      {/* Camisa: torso + mangas largas */}
      {ropa.camisa && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <MatStd acabado="mueble.tela" color={color('camisa')} />
          </mesh>
          {[-a.brazoX, a.brazoX].map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
              <mesh position={[0, a.torsoY - hombroY, 0]} castShadow>
                <boxGeometry args={[0.26, a.torsoH + 0.02, a.torsoD + 0.02]} />
                <MatStd acabado="mueble.tela" color={color('camisa')} />
              </mesh>
            </PivoteMarcha>
          ))}
        </>
      )}

      {/* Capa: manto por detrás del torso, de los hombros a las rodillas */}
      {ropa.capa && (
        <mesh position={[0, a.torsoY - 0.08, -(a.torsoD / 2 + 0.04)]} castShadow>
          <boxGeometry args={[a.torsoW + 0.14, a.torsoH + 0.34, 0.04]} />
          <MatStd acabado="mueble.tela" color={color('capa')} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Vestido: torso + falda acampanada */}
      {ropa.vestido && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <MatStd acabado="mueble.tela" color={color('vestido')} />
          </mesh>
          <mesh position={[0, caderaY - faldaH / 2 + 0.05, 0]} castShadow>
            <cylinderGeometry args={[cinturaW * 0.55, cinturaW, faldaH, 20, 1, true]} />
            <MatStd acabado="mueble.tela" color={color('vestido')} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* Falda: cintura + campana acampanada */}
      {ropa.falda && (
        <>
          <mesh position={[0, caderaY, 0]} castShadow>
            <cylinderGeometry args={[cinturaW * 0.5, cinturaW * 0.5, 0.14, 20]} />
            <MatStd acabado="mueble.tela" color={color('falda')} />
          </mesh>
          <mesh position={[0, caderaY - faldaH / 2 + 0.02, 0]} castShadow>
            <cylinderGeometry args={[cinturaW * 0.52, cinturaW, faldaH, 20, 1, true]} />
            <MatStd acabado="mueble.tela" color={color('falda')} side={THREE.DoubleSide} />
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
                <MatStd acabado="mueble.tela" color={color('shorts')} />
              </mesh>
            </PivoteMarcha>
          ))}
          <mesh position={[0, caderaY, 0]} castShadow>
            <boxGeometry args={[cinturaW, 0.2, a.piernaD + 0.02]} />
            <MatStd acabado="mueble.tela" color={color('shorts')} />
          </mesh>
        </>
      )}

      {/* Botas: caña sobre la pierna + suela en el pie */}
      {ropa.botas &&
        a.piernasX.map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
            <mesh position={[0, a.piesY + a.piernaH * 0.22 - caderaY, 0]} castShadow>
              <boxGeometry args={[a.piernaW + 0.05, a.piernaH * 0.5, a.piernaD + 0.05]} />
              <MatStd acabado="mueble.cuero" color={color('botas')} />
            </mesh>
            <mesh position={[0, a.piesY - caderaY, 0.05]} castShadow>
              <boxGeometry args={[a.piernaW + 0.05, 0.18, a.piernaD * 1.3]} />
              <MatStd acabado="mueble.cuero" color={color('botas')} />
            </mesh>
          </PivoteMarcha>
        ))}

      {/* Guantes: en las manos, al final de cada brazo */}
      {ropa.guantes &&
        [-a.brazoX, a.brazoX].map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} marchaEstado={marchaEstado} esJugador={esJugador}x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
            <mesh position={[0, -(a.torsoH * 0.95 + 0.05), 0]} castShadow>
              <boxGeometry args={[0.16, 0.16, a.torsoD + 0.02]} />
              <MatStd acabado="mueble.cuero" color={color('guantes')} />
            </mesh>
          </PivoteMarcha>
        ))}

      {/* Mochila: bulto por detrás del torso + tirantes al frente */}
      {ropa.mochila && (
        <>
          <mesh position={[0, a.torsoY + 0.02, -(a.torsoD / 2 + 0.12)]} castShadow>
            <boxGeometry args={[a.torsoW * 0.8, a.torsoH * 0.85, 0.22]} />
            <MatStd acabado="mueble.tela" color={color('mochila')} />
          </mesh>
          {[-a.torsoW * 0.28, a.torsoW * 0.28].map((x, i) => (
            <mesh key={i} position={[x, a.torsoY + 0.05, frenteZ]} castShadow>
              <boxGeometry args={[0.07, a.torsoH * 0.8, 0.05]} />
              <MatStd acabado="mueble.tela" color={color('mochila')} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
