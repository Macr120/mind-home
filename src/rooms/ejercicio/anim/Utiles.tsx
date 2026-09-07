import * as THREE from 'three'
import { ALTO_ASIENTO, ALTO_BANCO, ALTO_BARRA_FIJA, ALTO_PARALELAS, type UtilId } from './pose'
import type { Marcadores } from './RigEjercicio'

/**
 * Los aparatos del gimnasio en primitivas: lo justo para que se entienda el
 * ejercicio. Los fijos (banco, tapete, barra fija…) se colocan alrededor del
 * origen; los que van en las manos (barra, mancuernas, cable de la polea…) los
 * mueve `actualizarUtiles` cada frame desde los marcadores del rig, dentro del
 * MISMO `useFrame` del cuerpo (así no van un fotograma por detrás).
 *
 * Todo en unidades del box-man; el grupo escala con el avatar.
 */
export type RefsUtiles = Record<string, THREE.Object3D | null>

const METAL = '#c8ccd4'
const HIERRO = '#1f2937'
const ACERO = '#52525b'
const GOMA = '#3f3f46'

function Poste({ x, z, alto, grosor = 0.06 }: { x: number; z: number; alto: number; grosor?: number }) {
  return (
    <mesh position={[x, alto / 2, z]} castShadow>
      <boxGeometry args={[grosor, alto, grosor]} />
      <meshStandardMaterial color={ACERO} />
    </mesh>
  )
}

/** Cilindro de eje Y que `actualizarUtiles` estira entre dos puntos (`scale.y` = largo). */
function Tubo({ nombre, radio, color, refs }: { nombre: string; radio: number; color: string; refs: RefsUtiles }) {
  return (
    <mesh
      ref={(o) => {
        refs[nombre] = o
      }}
      castShadow
    >
      <cylinderGeometry args={[radio, radio, 1, 12]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
    </mesh>
  )
}

export function Utiles({ ids, refs, escala }: { ids: UtilId[]; refs: RefsUtiles; escala: number }) {
  const tiene = (id: UtilId) => ids.includes(id)
  const poner = (nombre: string) => (o: THREE.Object3D | null) => {
    refs[nombre] = o
  }
  return (
    <group scale={escala} ref={poner('raiz')}>
      {tiene('tapete') && (
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[0.9, 0.02, 2.0]} />
          <meshStandardMaterial color="#5b47a8" />
        </mesh>
      )}
      {tiene('banco') && (
        <group>
          <mesh position={[0, ALTO_BANCO - 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.08, 1.3]} />
            <meshStandardMaterial color="#b91c1c" />
          </mesh>
          {[-0.55, 0.55].map((z) => (
            <mesh key={z} position={[0, (ALTO_BANCO - 0.08) / 2, z]} castShadow>
              <boxGeometry args={[0.36, ALTO_BANCO - 0.08, 0.08]} />
              <meshStandardMaterial color={GOMA} />
            </mesh>
          ))}
        </group>
      )}
      {tiene('bancoAtras') && (
        <group>
          <mesh position={[0, ALTO_BANCO - 0.04, -0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.3, 0.08, 0.42]} />
            <meshStandardMaterial color="#b91c1c" />
          </mesh>
          {[-0.55, 0.55].map((x) => (
            <mesh key={x} position={[x, (ALTO_BANCO - 0.08) / 2, -0.55]} castShadow>
              <boxGeometry args={[0.08, ALTO_BANCO - 0.08, 0.36]} />
              <meshStandardMaterial color={GOMA} />
            </mesh>
          ))}
        </group>
      )}
      {tiene('asiento') && (
        <mesh position={[0, ALTO_ASIENTO / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, ALTO_ASIENTO, 0.5]} />
          <meshStandardMaterial color={GOMA} />
        </mesh>
      )}
      {tiene('caja') && (
        <mesh position={[0, ALTO_ASIENTO / 2, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.5, ALTO_ASIENTO, 0.5]} />
          <meshStandardMaterial color={GOMA} />
        </mesh>
      )}
      {tiene('barraFija') && (
        <group>
          <mesh position={[0, ALTO_BARRA_FIJA, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 1.5, 12]} />
            <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.35} />
          </mesh>
          <Poste x={-0.75} z={0} alto={ALTO_BARRA_FIJA} />
          <Poste x={0.75} z={0} alto={ALTO_BARRA_FIJA} />
        </group>
      )}
      {tiene('paralelas') && (
        <group>
          {[-0.45, 0.45].map((x) => (
            <group key={x}>
              <mesh position={[x, ALTO_PARALELAS, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 1.2, 12]} />
                <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.35} />
              </mesh>
              <Poste x={x} z={-0.5} alto={ALTO_PARALELAS} grosor={0.05} />
              <Poste x={x} z={0.5} alto={ALTO_PARALELAS} grosor={0.05} />
            </group>
          ))}
        </group>
      )}
      {(tiene('polea') || tiene('poleaBaja')) && (
        <group>
          <Poste x={0} z={1.0} alto={2.3} grosor={0.1} />
          {tiene('polea') ? (
            <>
              <mesh position={[0, 2.2, 0.9]} castShadow>
                <boxGeometry args={[0.3, 0.16, 0.24]} />
                <meshStandardMaterial color={HIERRO} />
              </mesh>
              <group ref={poner('cableOrigen')} position={[0, 2.12, 0.9]} />
            </>
          ) : (
            <>
              <mesh position={[0, 0.15, 0.9]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial color={HIERRO} />
              </mesh>
              <group ref={poner('cableOrigen')} position={[0, 0.3, 0.85]} />
            </>
          )}
          {(['I', 'D'] as const).map((lado) => (
            <group key={lado} ref={poner(`cable${lado}`)}>
              <Tubo nombre={`cable${lado}Tubo`} radio={0.008} color={HIERRO} refs={refs} />
            </group>
          ))}
        </group>
      )}
      {(tiene('pared') || tiene('paredFrente') || tiene('paredPies')) && (
        <mesh position={[0, 1.2, tiene('pared') ? -0.2 : tiene('paredFrente') ? 0.66 : 0.42]} receiveShadow>
          <planeGeometry args={[2.2, 2.4]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      {tiene('agua') && (
        <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, 3.2]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
      {tiene('balon') && (
        <mesh position={[-0.14, 0.11, 0.45]} castShadow>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
      )}
      {tiene('pelota') && (
        <mesh position={[-0.14, 0.05, 0.4]} castShadow>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      )}
      {tiene('rodillo') && (
        <mesh position={[0, 0.075, -0.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.6, 16]} />
          <meshStandardMaterial color="#0ea5e9" />
        </mesh>
      )}
      {tiene('cuerda') && (
        <group ref={poner('cuerda')} position={[0, 0.92, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[1.02, 0.012, 8, 48]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </group>
      )}
      {tiene('bici') && (
        <group>
          {[-0.6, 0.6].map((z) => (
            <mesh key={z} position={[0, 0.34, z]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.33, 0.035, 10, 32]} />
              <meshStandardMaterial color={HIERRO} />
            </mesh>
          ))}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.04, 0.04, 0.9]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0.75, -0.2]} castShadow>
            <boxGeometry args={[0.04, 0.4, 0.04]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0.95, -0.2]} castShadow>
            <boxGeometry args={[0.18, 0.05, 0.28]} />
            <meshStandardMaterial color={GOMA} />
          </mesh>
          <mesh position={[0, 0.8, 0.5]} castShadow>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 1.04, 0.5]} castShadow>
            <boxGeometry args={[0.5, 0.04, 0.04]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
          <group ref={poner('biela')} position={[0, 0.34, 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[0.05, 0.03, 0.34]} />
              <meshStandardMaterial color={ACERO} />
            </mesh>
          </group>
        </group>
      )}

      {/* Los que van en las manos */}
      {tiene('barra') && (
        <group ref={poner('barra')}>
          <Tubo nombre="barraTubo" radio={0.022} color={METAL} refs={refs} />
          {['barraDiscoA', 'barraDiscoB'].map((n) => (
            <mesh key={n} ref={poner(n)} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.05, 20]} />
              <meshStandardMaterial color={HIERRO} />
            </mesh>
          ))}
        </group>
      )}
      {tiene('banda') && (
        <group ref={poner('banda')}>
          <Tubo nombre="bandaTubo" radio={0.012} color="#ef4444" refs={refs} />
        </group>
      )}
      {tiene('mancuernas') &&
        (['I', 'D'] as const).map((lado) => (
          <group key={lado} ref={poner(`manc${lado}`)}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.24, 10]} />
              <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.4} />
            </mesh>
            {[-0.1, 0.1].map((x) => (
              <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.06, 14]} />
                <meshStandardMaterial color={HIERRO} />
              </mesh>
            ))}
          </group>
        ))}
      {tiene('balonManos') && (
        <mesh ref={poner('balonManos')} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
      )}
      {tiene('cana') && (
        <>
          <group ref={poner('cana')}>
            {/* La caña prolonga el antebrazo más allá de la mano, algo inclinada hacia arriba. */}
            <group rotation={[-0.5, 0, 0]}>
              <mesh position={[0, -0.55, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.02, 1.1, 8]} />
                <meshStandardMaterial color="#7c3f12" />
              </mesh>
              {/* Carrete junto a la mano. */}
              <mesh position={[0, -0.12, 0.04]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.045, 0.045, 0.04, 12]} />
                <meshStandardMaterial color={HIERRO} />
              </mesh>
              <group ref={poner('canaPunta')} position={[0, -1.1, 0]} />
            </group>
          </group>
          {/* El sedal: de la punta de la caña al «agua», delante del personaje. */}
          <group ref={poner('hilo')}>
            <Tubo nombre="hiloTubo" radio={0.004} color="#e5e7eb" refs={refs} />
          </group>
        </>
      )}
    </group>
  )
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _d = new THREE.Vector3()
const _punta = new THREE.Vector3()
const _agua = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const EJE_Y = new THREE.Vector3(0, 1, 0)

/** Coloca un grupo con su tubo entre `a` y `b` (unidades del box-man). Devuelve el largo. */
function tender(grupo: THREE.Object3D, tubo: THREE.Object3D | null, a: THREE.Vector3, b: THREE.Vector3, extra: number): number {
  grupo.position.copy(a).add(b).multiplyScalar(0.5)
  _d.copy(b).sub(a)
  const largo = _d.length() + extra
  if (_d.lengthSq() > 1e-8) grupo.quaternion.setFromUnitVectors(EJE_Y, _d.normalize())
  if (tubo) tubo.scale.y = largo
  return largo
}

/** Orientación mundial de un marcador llevada al espacio local del grupo de útiles. */
function orientar(raiz: THREE.Object3D, marcador: THREE.Object3D, destino: THREE.Object3D): void {
  raiz.getWorldQuaternion(_q).invert()
  destino.quaternion.copy(_q).multiply(marcador.getWorldQuaternion(_q2))
}

/**
 * Mueve los útiles de mano a los marcadores del rig. Todo pasa al espacio LOCAL
 * del grupo de útiles (`worldToLocal` absorbe escala, giro y posición del padre):
 * así también valen dentro del mapa, con el personaje donde y como esté.
 */
export function actualizarUtiles(r: RefsUtiles, m: Marcadores, fase: number): void {
  const raiz = r.raiz
  if (!raiz) return
  raiz.updateWorldMatrix(true, false)
  const manos = !!(m.manoI && m.manoD)
  if (manos) {
    raiz.worldToLocal(m.manoI!.getWorldPosition(_a))
    raiz.worldToLocal(m.manoD!.getWorldPosition(_b))
  }
  if (r.barra && manos) {
    const largo = tender(r.barra, r.barraTubo, _a, _b, 0.7)
    if (r.barraDiscoA) r.barraDiscoA.position.y = largo / 2 - 0.08
    if (r.barraDiscoB) r.barraDiscoB.position.y = -(largo / 2 - 0.08)
  }
  if (r.banda && manos) tender(r.banda, r.bandaTubo, _a, _b, 0.06)
  if (r.mancI && m.manoI && m.codoI) {
    r.mancI.position.copy(_a)
    orientar(raiz, m.codoI, r.mancI)
  }
  if (r.mancD && m.manoD && m.codoD) {
    r.mancD.position.copy(_b)
    orientar(raiz, m.codoD, r.mancD)
  }
  if (r.cableOrigen && manos) {
    const o = r.cableOrigen.position
    if (r.cableI) tender(r.cableI, r.cableITubo, o, _a, 0)
    if (r.cableD) tender(r.cableD, r.cableDTubo, o, _b, 0)
  }
  if (r.balonManos && manos) r.balonManos.position.copy(_a).add(_b).multiplyScalar(0.5)
  if (r.cuerda) r.cuerda.rotation.x = -fase * Math.PI * 2
  if (r.biela) r.biela.rotation.x = -fase * Math.PI * 2
  // Caña en la mano derecha (como la mancuerna) y el sedal de su punta al agua.
  if (r.cana && manos && m.codoD) {
    r.cana.position.copy(_b)
    orientar(raiz, m.codoD, r.cana)
    if (r.canaPunta && r.hilo) {
      // getWorldPosition actualiza la cadena de padres: ya ve la caña recién movida.
      raiz.worldToLocal(r.canaPunta.getWorldPosition(_punta))
      tender(r.hilo, r.hiloTubo, _punta, _agua.set(0, 0.03, 1.9), 0)
    }
  }
}
