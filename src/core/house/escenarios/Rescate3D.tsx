import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { progresoRescate, puntoRescate, rescate, type TipoRescate } from './rescate'

/**
 * Piezas del regreso al vehículo (ver `rescate.ts`), en coordenadas de mundo. Todo se
 * mueve por refs en un `useFrame`: nada re-renderiza durante la animación.
 */
export function Rescate3D({ tipo }: { tipo: TipoRescate }) {
  const raiz = useRef<THREE.Group>(null)
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  const cuerda = useRef<THREE.Mesh>(null)
  const tubo = useRef<THREE.Mesh>(null)
  const idHecho = useRef(-1)

  const mat = useMemo(
    () => ({
      portal: new THREE.MeshBasicMaterial({ color: '#7cf3ff', transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false }),
      portalCentro: new THREE.MeshBasicMaterial({ color: '#2a1a6e', transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      tela: new THREE.MeshStandardMaterial({ color: '#ff5a3c', side: THREE.DoubleSide, roughness: 0.7 }),
      tela2: new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.7 }),
      cuerda: new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.9 }),
      liana: new THREE.MeshStandardMaterial({ color: '#4f7d2a', roughness: 0.9 }),
      hoja: new THREE.MeshStandardMaterial({ color: '#6fae3a', roughness: 0.8 }),
      vidrio: new THREE.MeshStandardMaterial({ color: '#9be36b', transparent: true, opacity: 0.35, roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide }),
      aro: new THREE.MeshStandardMaterial({ color: '#5c6b3a', roughness: 0.6, metalness: 0.5 }),
      rojo: new THREE.MeshStandardMaterial({ color: '#e8402f', roughness: 0.5 }),
      blanco: new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.5 }),
      madera: new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.85 }),
    }),
    [],
  )

  useFrame(() => {
    const g = raiz.current
    if (!g) return
    g.visible = rescate.activo && rescate.tipo === tipo
    if (!g.visible) return
    const p = progresoRescate()
    // Dónde va el personaje en este mismo instante (sin depender del orden de los useFrame).
    puntoRescate(playerPos, p)
    const { desde: A, hasta: B, borde: E, ancla: C } = rescate
    const pa = a.current!
    const pb = b.current
    const yaw = rescate.rumbo
    const apar = (x: number) => Math.min(1, x) // escala de aparición
    switch (tipo) {
      case 'portal': {
        // A: portal horizontal bajo la caída. B: portal de pie sobre la cubierta.
        const abre = (t0: number, t1: number) => apar(Math.max(0, Math.min((p - t0) * 8, (t1 - p) * 8)))
        pa.position.set(A.x, A.y - 2.8, A.z)
        pa.scale.setScalar(Math.max(0.001, abre(0, 0.5)))
        pa.rotation.set(-Math.PI / 2, 0, p * 8)
        pb!.position.set(B.x, B.y + 1.1, B.z)
        pb!.rotation.set(0, yaw, 0)
        pb!.scale.setScalar(Math.max(0.001, abre(0.4, 1)))
        pb!.children[0].rotation.z = -p * 8
        break
      }
      case 'paracaidas': {
        // La campana va sobre el personaje; se abre al principio y se pliega al aterrizar.
        const abre = Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.05)
        pa.position.set(playerPos.x, playerPos.y + 2.2, playerPos.z)
        pa.rotation.set(Math.sin(p * Math.PI * 6) * 0.12, yaw, Math.cos(p * Math.PI * 5) * 0.1)
        pa.scale.set(Math.max(0.001, abre), Math.max(0.001, abre), Math.max(0.001, abre))
        break
      }
      case 'tubo': {
        // Se rehace la geometría del tubo con cada rescate (su curva cambia).
        if (idHecho.current !== rescate.id && rescate.curva && tubo.current) {
          idHecho.current = rescate.id
          tubo.current.geometry.dispose()
          tubo.current.geometry = new THREE.TubeGeometry(rescate.curva, 40, 0.75, 14, false)
        }
        // Baja como una trompa: crece desde la cubierta hasta el personaje.
        const crece = Math.min(1, p / 0.25)
        const encoge = p > 0.92 ? (1 - p) / 0.08 : 1
        const tg = tubo.current?.geometry as THREE.TubeGeometry | undefined
        if (tg) {
          const total = tg.index ? tg.index.count : 0
          // Dibuja la parte del tubo que ya «bajó»: desde B (fin de la curva) hacia A.
          const visible = Math.floor((total / 6) * crece * encoge) * 6
          tg.setDrawRange(total - visible, visible)
        }
        // Boca del tubo (aro) sobre el personaje y otra en la cubierta.
        pa.position.copy(A)
        pa.scale.setScalar(Math.max(0.001, crece >= 1 ? encoge : 0.001))
        pb!.position.copy(B)
        pb!.scale.setScalar(Math.max(0.001, crece * encoge))
        break
      }
      case 'liana': {
        // Rama en el ancla; la liana baja hasta las manos mientras se columpia.
        const cuelga = Math.min(1, p / 0.15)
        const suelta = p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.1) : 1
        pa.position.copy(C)
        pa.scale.setScalar(Math.max(0.001, Math.min(1, p / 0.08) * (p > 0.95 ? (1 - p) / 0.05 : 1)))
        const manos = new THREE.Vector3(playerPos.x, playerPos.y + 1.8, playerPos.z)
        const fin = suelta > 0 && p > 0.15 ? manos : new THREE.Vector3(C.x, C.y - (C.y - manos.y) * cuelga, C.z)
        estirar(cuerda.current!, C, fin, 0.07, suelta > 0 ? 1 : 0.001)
        break
      }
      case 'salvavidas': {
        // El aro vuela en parábola desde la cubierta, cae al agua y viaja con el personaje.
        if (p < 0.3) {
          const q = p / 0.3
          pa.position.set(
            THREE.MathUtils.lerp(E.x, A.x, q),
            THREE.MathUtils.lerp(E.y + 1.2, A.y + 1.1, q) + Math.sin(q * Math.PI) * 4,
            THREE.MathUtils.lerp(E.z, A.z, q),
          )
          pa.rotation.set(q * 9, yaw, q * 4)
        } else {
          // A la cintura: flotando, el personaje va hundido ~1 bajo la lámina.
          pa.position.set(playerPos.x, playerPos.y + 1.1, playerPos.z)
          pa.rotation.set(Math.PI / 2, 0, 0)
        }
        pa.scale.setScalar(p > 0.93 ? Math.max(0.001, (1 - p) / 0.07) : 1)
        // Cuerda desde la borda (un marinero invisible la jala) hasta el aro.
        const borda = new THREE.Vector3(E.x, E.y + 1.2, E.z)
        estirar(cuerda.current!, borda, pa.position, 0.04, p > 0.93 ? 0.001 : 1)
        break
      }
      case 'escalera': {
        // Cae girando desde arriba hasta apoyarse contra el borde del vagón.
        const pie = new THREE.Vector3(THREE.MathUtils.lerp(A.x, E.x, 0.75), A.y, THREE.MathUtils.lerp(A.z, E.z, 0.75))
        const tope = new THREE.Vector3(E.x, E.y + 1.2, E.z)
        const largo = pie.distanceTo(tope)
        const cae = THREE.MathUtils.smoothstep(p, 0, 0.18)
        pa.position.copy(pie)
        pa.rotation.set(0, Math.atan2(E.x - A.x, E.z - A.z), 0)
        // Inclinación hacia el vagón: de tumbada hacia afuera a recargada.
        const incl = Math.atan2(Math.hypot(tope.x - pie.x, tope.z - pie.z), tope.y - pie.y)
        pa.children[0].rotation.x = THREE.MathUtils.lerp(-1.2, incl, cae)
        pa.children[0].scale.set(1, largo / 4, 1)
        pa.scale.setScalar(p > 0.94 ? Math.max(0.001, (1 - p) / 0.06) : 1)
        break
      }
    }
  })

  return (
    <group ref={raiz} visible={false}>
      {tipo === 'portal' && (
        <>
          <group ref={a}>
            <Portal mat={mat} />
          </group>
          <group ref={b}>
            <group>
              <Portal mat={mat} />
            </group>
          </group>
        </>
      )}
      {tipo === 'paracaidas' && (
        <group ref={a}>
          {/* Campana de gajos rojos y blancos */}
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[0, 1.6, 0]} material={i % 2 ? mat.tela2 : mat.tela}>
              <sphereGeometry args={[2.2, 6, 6, (i * Math.PI) / 4, Math.PI / 4, 0, Math.PI / 2.4]} />
            </mesh>
          ))}
          {/* Cordones hacia los hombros */}
          {Array.from({ length: 6 }, (_, i) => {
            const ang = (i / 6) * Math.PI * 2
            return (
              <Segmento
                key={i}
                de={[0, -0.6, 0]}
                a={[Math.cos(ang) * 1.75, 1.75, Math.sin(ang) * 1.75]}
                material={mat.cuerda}
              />
            )
          })}
        </group>
      )}
      {tipo === 'tubo' && (
        <>
          <mesh ref={tubo} material={mat.vidrio}>
            <tubeGeometry args={[new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(0, 1, 0)), 2, 0.75, 14, false]} />
          </mesh>
          <group ref={a}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} material={mat.aro}>
              <torusGeometry args={[0.85, 0.12, 8, 20]} />
            </mesh>
          </group>
          <group ref={b}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} material={mat.aro}>
              <torusGeometry args={[0.85, 0.12, 8, 20]} />
            </mesh>
          </group>
        </>
      )}
      {tipo === 'liana' && (
        <>
          <group ref={a}>
            {/* Rama con hojas de donde cuelga */}
            <mesh rotation={[0, 0, Math.PI / 2]} material={mat.madera}>
              <cylinderGeometry args={[0.14, 0.18, 3, 6]} />
            </mesh>
            {[-1.1, -0.4, 0.4, 1.1].map((x, i) => (
              <mesh key={i} position={[x, 0.25, (i % 2 ? 0.2 : -0.2)]} material={mat.hoja}>
                <icosahedronGeometry args={[0.45, 0]} />
              </mesh>
            ))}
          </group>
          <mesh ref={cuerda} material={mat.liana}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
        </>
      )}
      {tipo === 'salvavidas' && (
        <>
          <group ref={a}>
            {Array.from({ length: 4 }, (_, i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} material={i % 2 ? mat.blanco : mat.rojo}>
                <torusGeometry args={[0.6, 0.18, 8, 8, Math.PI / 2]} />
              </mesh>
            ))}
          </group>
          <mesh ref={cuerda} material={mat.cuerda}>
            <cylinderGeometry args={[1, 1, 1, 5]} />
          </mesh>
        </>
      )}
      {tipo === 'escalera' && (
        <group ref={a}>
          {/* Hijo que se inclina: largueros y peldaños de 4 de alto (se estira en Y) */}
          <group>
            {[-0.35, 0.35].map((x) => (
              <mesh key={x} position={[x, 2, 0]} material={mat.madera}>
                <boxGeometry args={[0.08, 4, 0.08]} />
              </mesh>
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} position={[0, 0.3 + i * 0.5, 0]} material={mat.madera}>
                <boxGeometry args={[0.7, 0.06, 0.06]} />
              </mesh>
            ))}
          </group>
        </group>
      )}
    </group>
  )
}

function Portal({ mat }: { mat: Record<string, THREE.Material> }) {
  return (
    <group>
      <mesh material={mat.portal}>
        <torusGeometry args={[1.3, 0.14, 8, 32]} />
      </mesh>
      <mesh material={mat.portalCentro}>
        <circleGeometry args={[1.25, 32]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} material={mat.portal}>
          <torusGeometry args={[0.75, 0.04, 6, 24, Math.PI * 0.9]} />
        </mesh>
      ))}
    </group>
  )
}

/** Cordón fijo entre dos puntos locales. */
function Segmento({ de, a, material }: { de: [number, number, number]; a: [number, number, number]; material: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null)
  useLayoutEffect(() => {
    if (ref.current) estirar(ref.current, new THREE.Vector3(...de), new THREE.Vector3(...a), 0.02, 1)
  })
  return (
    <mesh ref={ref} material={material}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
    </mesh>
  )
}

const playerPos = new THREE.Vector3()
const _arriba = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3()
/** Coloca un cilindro unitario como segmento entre dos puntos. */
function estirar(m: THREE.Mesh, de: THREE.Vector3, a: THREE.Vector3, grosor: number, visible: number) {
  _dir.subVectors(a, de)
  const largo = Math.max(0.001, _dir.length())
  m.position.addVectors(de, a).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(_arriba, _dir.divideScalar(largo))
  m.scale.set(grosor * visible, largo, grosor * visible)
}
