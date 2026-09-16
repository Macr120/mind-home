import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Pieza3D } from '../../chat/mascotas'
import { ModeloPiezas } from '../../house/modeloPersonalizado'
import { aMetros } from '../../muebles/piezas3d'
import type { Cuerpo } from '../../muebles/tipos'
import { BotonPreviewClaro, claseFondoPreview } from '../comun/BotonPreviewClaro'
import { useEditorUi } from '../../state/editorUiStore'
import { encuadrar } from '../editor/PreviewObjeto3D'
import { Icono } from '../iconos/Icono'
import { useT } from '../../i18n/useT'

/**
 * Visor 3D del taller. No reutiliza `PreviewObjeto3D` porque aquel está atado al
 * editor de piezas (selección por toque, engrane, animación): aquí el mueble se
 * edita por parámetros, así que las piezas no capturan clics. De `PreviewObjeto3D`
 * sí se reutiliza el encuadre, que es la parte con miga.
 */
export function VisorMueble3D({
  piezas,
  cuerpo,
  cotas,
}: {
  piezas: Pieza3D[]
  cuerpo: Cuerpo
  /** Dibuja la caja de medidas alrededor del mueble. */
  cotas: boolean
}) {
  const t = useT()
  // Mismo interruptor que los demás previews del editor (`BotonPreviewClaro`).
  const claro = useEditorUi((s) => s.previewClaro)
  const [xray, setXray] = useState(false)
  // El encuadre sale del bbox real del mueble (exacto), no de la envolvente
  // aproximada de las piezas.
  const enc = useMemo(() => {
    const alto = aMetros(cuerpo.bbox.alto)
    const horiz = Math.max(aMetros(cuerpo.bbox.ancho), aMetros(cuerpo.bbox.fondo)) / 2
    const dist = Math.min(Math.max(Math.max(alto, horiz * 2) * 2.1 + 0.8, 2.4), 30)
    return {
      pos: [dist * 0.62, dist * 0.52, dist * 0.62] as [number, number, number],
      targetY: alto / 2,
      maxDist: dist * 2.4,
      pisoR: Math.max(1.6, horiz * 2.4),
    }
  }, [cuerpo.bbox.alto, cuerpo.bbox.ancho, cuerpo.bbox.fondo])

  const caja = useMemo(() => {
    const g = new THREE.BoxGeometry(
      aMetros(cuerpo.bbox.ancho),
      aMetros(cuerpo.bbox.alto),
      aMetros(cuerpo.bbox.fondo),
    )
    const bordes = new THREE.EdgesGeometry(g)
    g.dispose()
    return bordes
  }, [cuerpo.bbox.ancho, cuerpo.bbox.alto, cuerpo.bbox.fondo])

  return (
    <div className={`relative h-full w-full overflow-hidden ${claseFondoPreview(claro)}`}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: enc.pos, fov: 32, near: 0.1, far: 120 }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-4, 3, -3]} intensity={0.35} />
        {xray ? <MuebleXray piezas={piezas} claro={claro} /> : <ModeloPiezas piezas={piezas} />}
        {cotas && (
          <lineSegments position={[0, aMetros(cuerpo.bbox.alto) / 2, 0]}>
            <primitive object={caja} attach="geometry" />
            <lineBasicMaterial color={claro ? '#0f766e' : '#5eead4'} />
          </lineSegments>
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[enc.pisoR, 48]} />
          <meshStandardMaterial color={claro ? '#e5e7eb' : '#1a1d25'} />
        </mesh>
        <OrbitControls
          enablePan={false}
          enableDamping
          target={[0, enc.targetY, 0]}
          minDistance={0.5}
          maxDistance={enc.maxDist}
        />
      </Canvas>
      <div className="absolute start-1.5 top-1.5">
        <BotonPreviewClaro />
      </div>
      <button
        type="button"
        onClick={() => setXray(!xray)}
        title={t('muebles.xray', 'Rayos X: ver el mueble por dentro')}
        aria-pressed={xray}
        className={`ui-boton absolute end-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-lg transition ${
          xray
            ? 'bg-accent text-accent-ink'
            : claro
              ? 'bg-black/10 hover:bg-black/20'
              : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        <Icono nombre="ver" />
      </button>
      <span
        className={`pointer-events-none absolute bottom-1.5 start-0 end-0 text-center text-[10px] ${
          claro ? 'text-black/45' : 'text-white/35'
        }`}
      >
        {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
      </span>
    </div>
  )
}

/**
 * Vista de rayos X: cada pieza translúcida y con sus aristas marcadas, para ver
 * el interior sin quitar puertas ni cajones.
 *
 * Se dibuja aquí y no en `ModeloPiezas` porque aquel render lo comparten el
 * avatar, los asistentes y todos los objetos de la casa: una bandera de vista
 * del taller no tiene por qué llegar hasta allí.
 */
function MuebleXray({ piezas, claro }: { piezas: Pieza3D[]; claro: boolean }) {
  // La geometría se comparte entre el relleno y las aristas, y se libera al
  // cambiar de mueble: sin esto cada golpe de slider deja basura en la GPU.
  const cuerpos = useMemo(
    () =>
      piezas.map((p) => {
        const geo =
          p.tipo === 'cilindro'
            ? new THREE.CylinderGeometry(p.tam[0] ?? 0.05, p.tam[1] ?? 0.05, p.tam[2] ?? 0.2, 12)
            : new THREE.BoxGeometry(p.tam[0] ?? 0.3, p.tam[1] ?? 0.3, p.tam[2] ?? 0.3)
        return { p, geo, aristas: new THREE.EdgesGeometry(geo) }
      }),
    [piezas],
  )
  useEffect(
    () => () => {
      for (const c of cuerpos) {
        c.geo.dispose()
        c.aristas.dispose()
      }
    },
    [cuerpos],
  )

  return (
    <group>
      {cuerpos.map((c, i) => (
        <group key={i} position={c.p.pos} rotation={c.p.rot ?? [0, 0, 0]}>
          <mesh geometry={c.geo}>
            {/* `depthWrite` apagado: si no, la pieza de delante tapa a las de
                atrás y el cristal deja de ser cristal. */}
            <meshBasicMaterial
              color={c.p.color}
              transparent
              opacity={claro ? 0.14 : 0.1}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={c.aristas}>
            <lineBasicMaterial color={claro ? '#0f172a' : '#7dd3fc'} transparent opacity={0.85} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}

/** Encuadre de referencia del editor, por si hiciera falta fuera del taller. */
export { encuadrar }
