import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Avatar } from '../../../core/state/disenoStore'
import { ANCLAS_AVATAR, soportaPeinado } from '../../../core/house/apariencia'
import { Rostro } from '../../../core/house/Rostro'
import { Peinado } from '../../../core/house/Peinado'
import { Prendas } from '../../../core/house/Prendas'
import { coloresRig, ropaCabeza, type ColoresRig } from './coloresRig'
import { J, N_CANALES, faseRepresentativa, poseEnFase, type Lado, type MarcadorId, type PatronResuelto } from './pose'
import { Utiles, actualizarUtiles, type RefsUtiles } from './Utiles'

/**
 * El avatar del usuario con articulaciones de sobra para hacer ejercicio:
 * tronco (pivote en la cadera), cuello, hombros (flexión + abducción +
 * rotación), codos, caderas (ídem) y rodillas. Calca las medidas y colores del
 * box-man de `CuerpoBase` —en reposo es idéntico al de la casa— pero parte
 * brazo y pierna en dos segmentos. Es SOLO del visor de ejercicios: la casa
 * sigue con `CuerpoBase`/`Prendas`, que no se tocan.
 *
 * Ojo con los lados: aquí `I` es la izquierda REAL del avatar (lado +X, mira a
 * +Z) y `D` la derecha (−X). En `CuerpoBase` los nombres `brazoI`/`piernaI`
 * están al revés (x negativa).
 *
 * El cuerpo se apoya solo: tras aplicar la pose se mide el marcador más bajo y
 * se desplaza todo para que toque el suelo (o la altura del banco/barra que
 * pida el patrón); así las poses no autoran alturas. El «suelo» es la altura
 * del grupo padre: en el visor el origen, en el mapa donde esté el personaje.
 */

/** El rig gira (tumbarse, girar) alrededor de la mitad del cuerpo: queda centrado al acostarse. */
const PIVOTE_Y = 0.86
const CADERA_Y = 0.6
const HOMBRO_Y = 1.22
const CUELLO_Y = 1.28
const CABEZA_Y = 1.5
const CABEZA_TOP = 1.72
/** Brazo/antebrazo y muslo/pantorrilla: dos tramos de 0.3 (los 0.6 del box-man). */
const TRAMO = 0.3

export type NombreMarcador =
  | 'manoI' | 'manoD' | 'pieI' | 'pieD' | 'codoI' | 'codoD' | 'rodillaI' | 'rodillaD'
  | 'gluteos' | 'espalda' | 'pecho' | 'hombros' | 'cabeza'
export type Marcadores = Record<NombreMarcador, THREE.Object3D | null>

const TODOS: NombreMarcador[] = [
  'manoI', 'manoD', 'pieI', 'pieD', 'codoI', 'codoD', 'rodillaI', 'rodillaD',
  'gluteos', 'espalda', 'pecho', 'hombros', 'cabeza',
]
const POR_ID: Record<MarcadorId, NombreMarcador[]> = {
  pies: ['pieI', 'pieD'], pieI: ['pieI'], pieD: ['pieD'],
  rodillas: ['rodillaI', 'rodillaD'], rodillaI: ['rodillaI'], rodillaD: ['rodillaD'],
  manos: ['manoI', 'manoD'], manoI: ['manoI'], manoD: ['manoD'],
  codos: ['codoI', 'codoD'], codoI: ['codoI'], codoD: ['codoD'],
  gluteos: ['gluteos'], espalda: ['espalda'], pecho: ['pecho'], hombros: ['hombros'], cabeza: ['cabeza'],
}

type Huesos = Record<string, THREE.Object3D | null>
type Poner = (nombre: string) => (o: THREE.Object3D | null) => void

function Caja({ y, z = 0, tam, color }: { y: number; z?: number; tam: [number, number, number]; color: string }) {
  return (
    <mesh position={[0, y, z]} castShadow>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/** Hombro (A: flex/abd, B: rotación) → brazo → codo → antebrazo (+ guante). */
function Brazo({ lado, c, hueso, marca }: { lado: Lado; c: ColoresRig; hueso: Poner; marca: Poner }) {
  const x = lado === 'I' ? 0.42 : -0.42
  return (
    <group ref={hueso(`hombroA${lado}`)} position={[x, HOMBRO_Y - CADERA_Y, 0]}>
      <group ref={hueso(`hombroB${lado}`)}>
        <Caja y={-TRAMO / 2} tam={[0.2, TRAMO, 0.26]} color={c.brazo} />
        <group ref={hueso(`codo${lado}`)} position={[0, -TRAMO, 0]}>
          <Caja y={-TRAMO / 2} tam={[0.2, TRAMO, 0.26]} color={c.antebrazo} />
          {c.mano && <Caja y={-0.34} tam={[0.16, 0.16, 0.32]} color={c.mano} />}
          {/* Cara trasera del antebrazo: es la que toca el suelo en una plancha. */}
          <group ref={marca(`codo${lado}`)} position={[0, -TRAMO / 2, -0.13]} />
          <group ref={marca(`mano${lado}`)} position={[0, -TRAMO, 0]} />
        </group>
      </group>
    </group>
  )
}

/** Cadera (A: flex/abd, B: rotación) → muslo → rodilla → pantorrilla (+ calzado). */
function Pierna({ lado, c, hueso, marca }: { lado: Lado; c: ColoresRig; hueso: Poner; marca: Poner }) {
  const x = lado === 'I' ? 0.14 : -0.14
  return (
    <group ref={hueso(`caderaA${lado}`)} position={[x, CADERA_Y, 0]}>
      <group ref={hueso(`caderaB${lado}`)}>
        <Caja y={-TRAMO / 2} tam={[0.24, TRAMO, 0.26]} color={c.muslo} />
        <group ref={hueso(`rodilla${lado}`)} position={[0, -TRAMO, 0]}>
          <Caja y={-TRAMO / 2} tam={[0.24, TRAMO, 0.26]} color={c.pantorrilla} />
          {/* Calzado con las medidas de `Prendas` (tenis: suela; botas: caña + suela). */}
          {c.pie && c.botas && <Caja y={-0.107} tam={[0.35, 0.28, 0.37]} color={c.pie} />}
          {c.pie && (
            <Caja
              y={-0.23}
              z={c.botas ? 0.05 : 0.04}
              tam={c.botas ? [0.35, 0.18, 0.416] : [0.3, 0.2, 0.4]}
              color={c.pie}
            />
          )}
          {/* Cara delantera de la pantorrilla: la que apoya al arrodillarse. */}
          <group ref={marca(`rodilla${lado}`)} position={[0, -TRAMO / 2, 0.13]} />
          <group ref={marca(`pie${lado}`)} position={[0, -TRAMO, 0]} />
        </group>
      </group>
    </group>
  )
}

const _v = new THREE.Vector3()
const _p = new THREE.Vector3()

export function RigEjercicio({
  av,
  patron,
  jugando = true,
  velocidad = 1,
  fase,
}: {
  av: Avatar
  patron: PatronResuelto
  jugando?: boolean
  velocidad?: number
  /** Fase fija 0..1 (hoja de contacto): ignora el reloj. */
  fase?: number
}) {
  const c = coloresRig(av)
  const escala = av.escala || 1
  const huesos = useRef<Huesos>({})
  const marcadores = useRef<Marcadores>({
    manoI: null, manoD: null, pieI: null, pieD: null, codoI: null, codoD: null,
    rodillaI: null, rodillaD: null, gluteos: null, espalda: null, pecho: null, hombros: null, cabeza: null,
  })
  const utiles = useRef<RefsUtiles>({})
  const out = useRef(new Float32Array(N_CANALES)).current
  // Arranca en la pose representativa: quieto (sin `jugando`) ya se ve el ejercicio.
  const faseRef = useRef(faseRepresentativa(patron))
  useEffect(() => {
    faseRef.current = faseRepresentativa(patron)
  }, [patron])

  const hueso: Poner = (nombre) => (o) => {
    huesos.current[nombre] = o
  }
  const marca: Poner = (nombre) => (o) => {
    marcadores.current[nombre as NombreMarcador] = o
  }

  useFrame((state, dt) => {
    const h = huesos.current
    const ancla = h.ancla
    const raiz = h.raiz
    if (!ancla || !raiz || !h.tronco || !h.cuello) return
    if (fase !== undefined) faseRef.current = fase
    else if (jugando) faseRef.current = (faseRef.current + (Math.min(dt, 0.1) * velocidad) / patron.periodo) % 1
    const f = faseRef.current
    poseEnFase(patron, f, out)

    // Orientación global (orden YXZ: primero tumbarse, luego el giro sobre la vertical).
    raiz.rotation.set(out[J.raizX], out[J.giro], out[J.raizZ])
    const resp = Math.sin(state.clock.elapsedTime * 1.7) * 0.026 * patron.respiracion
    h.tronco.rotation.set(out[J.troncoX] + resp, out[J.troncoY], out[J.troncoZ])
    h.cuello.rotation.set(out[J.cuelloX] - resp * 0.5, out[J.cuelloY], out[J.cuelloZ])
    extremidad(h, 'I', out, J.hombroIF, J.codoI, J.caderaIF, J.rodillaI, 1)
    extremidad(h, 'D', out, J.hombroDF, J.codoD, J.caderaDF, J.rodillaD, -1)

    // Apoyo: el marcador más bajo al suelo del padre (o el marcador pedido a su altura).
    const m = marcadores.current
    const suelo = ancla.parent ? ancla.parent.getWorldPosition(_p).y : 0
    const objetivo = suelo + (patron.apoyo === 'suelo' ? 0 : patron.apoyo.y * escala)
    const lista = patron.apoyo === 'suelo' ? TODOS : POR_ID[patron.apoyo.marcador]
    let minY = Infinity
    for (const nombre of lista) {
      const o = m[nombre]
      if (!o) continue
      const y = o.getWorldPosition(_v).y
      if (y < minY) minY = y
    }
    if (minY !== Infinity) ancla.position.y += objetivo - minY + out[J.salto] * escala

    actualizarUtiles(utiles.current, m, f)
  })

  return (
    <>
      <group ref={hueso('ancla')}>
        <group scale={escala}>
          <group
            ref={(o) => {
              huesos.current.raiz = o
              if (o) o.rotation.order = 'YXZ'
            }}
            position={[0, PIVOTE_Y, 0]}
          >
            {/* Coordenadas absolutas del box-man (pies en y=0), como en `CuerpoBase`. */}
            <group position={[0, -PIVOTE_Y, 0]}>
              <group ref={hueso('tronco')} position={[0, CADERA_Y, 0]}>
                <Caja y={0.92 - CADERA_Y} tam={[0.6, 0.62, 0.3]} color={c.torso} />
                <group ref={marca('espalda')} position={[0, 0.92 - CADERA_Y, -0.15]} />
                <group ref={marca('pecho')} position={[0, 0.92 - CADERA_Y, 0.15]} />
                <group ref={marca('hombros')} position={[0, HOMBRO_Y - CADERA_Y - 0.02, -0.15]} />
                <group ref={hueso('cuello')} position={[0, CUELLO_Y - CADERA_Y, 0]}>
                  {/* Des-offset: aquí dentro valen las coordenadas de `ANCLAS_AVATAR`. */}
                  <group position={[0, -CUELLO_Y, 0]}>
                    <Caja y={CABEZA_Y} tam={[0.44, 0.44, 0.44]} color={c.piel} />
                    <Rostro anclas={ANCLAS_AVATAR} expresion={av.expresion} rostro={av.rostro} />
                    {soportaPeinado(av) && (
                      <Peinado anclas={ANCLAS_AVATAR} peinado={av.peinado} color={av.peloColor} />
                    )}
                    <Prendas ropa={ropaCabeza(av.ropa)} anclas={ANCLAS_AVATAR} />
                    <group ref={marca('cabeza')} position={[0, CABEZA_TOP, 0]} />
                  </group>
                </group>
                <Brazo lado="I" c={c} hueso={hueso} marca={marca} />
                <Brazo lado="D" c={c} hueso={hueso} marca={marca} />
              </group>
              <Pierna lado="I" c={c} hueso={hueso} marca={marca} />
              <Pierna lado="D" c={c} hueso={hueso} marca={marca} />
              {/* Parte baja de los muslos al sentarse: el punto que toca el asiento. */}
              <group ref={marca('gluteos')} position={[0, 0.47, 0.05]} />
            </group>
          </group>
        </group>
      </group>
      <Utiles ids={patron.utiles} refs={utiles.current} escala={escala} />
    </>
  )
}

/**
 * Hombro/cadera A: flexión (x, con signo invertido: en three `rotation.x`
 * positivo lleva la extremidad hacia atrás) + abducción (z, con el signo del
 * lado); B: rotación externa (y, con el signo del lado); codo negativo,
 * rodilla positiva (el antebrazo va al frente, el talón atrás).
 */
function extremidad(
  h: Huesos,
  lado: Lado,
  out: Float32Array,
  iH: number,
  iC: number,
  iCa: number,
  iR: number,
  signo: 1 | -1,
): void {
  const hA = h[`hombroA${lado}`]
  const hB = h[`hombroB${lado}`]
  const co = h[`codo${lado}`]
  const cA = h[`caderaA${lado}`]
  const cB = h[`caderaB${lado}`]
  const ro = h[`rodilla${lado}`]
  if (hA) {
    hA.rotation.set(-out[iH], 0, signo * out[iH + 1])
    hA.position.y = HOMBRO_Y - CADERA_Y + out[J.hombrosY]
  }
  if (hB) hB.rotation.y = signo * out[iH + 2]
  if (co) co.rotation.x = -out[iC]
  if (cA) cA.rotation.set(-out[iCa], 0, signo * out[iCa + 1])
  if (cB) cB.rotation.y = signo * out[iCa + 2]
  if (ro) ro.rotation.x = out[iR]
}
