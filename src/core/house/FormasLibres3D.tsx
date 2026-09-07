import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import type { FormaLibre, PuntoUV, VanoLibre } from '../data/db'
import { VACIO, formasLibresRepo } from '../data/repository'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useDiseño } from '../state/disenoStore'
import { useFormaLibre, puntosEfectivos } from '../state/formaLibreStore'
import { trazoEnCurso } from '../state/formaLibreGesto'
import { nivelBaseY, WALL_H } from './walls'
import {
  Y_PISO_LIBRE,
  MIN_PUNTOS_CERRAR,
  aberturaVano,
  contornoPiso,
  contornoTecho,
  formaCerrada,
  muestrasMuro,
  puntosMundoForma,
  shapeDePoligono,
  tieneMuro,
  tienePiso,
} from './formasLibre'
import { MuroPolilinea3D } from './MuroPolilinea3D'
import { MuroLibrePuerta3D } from './MuroLibrePuerta3D'
import { TechoLibre3D } from './TechoLibre3D'
import type { TechoTipoId } from './techos'
import { VANO_FORMA_ALTO_DEFAULT, type FormaVanoId } from './murosPuertas'
import type { RemateHoja } from './puertaHojas'
import { esSinPiso, getPisoTipo, type PisoTipoId } from './pisos'
import { PROC_PERIODO, texturaProc } from './PisoCelda'

const COLOR_MURO_DEFECTO = '#8c8073'
const COLOR_PISO_DEFECTO = '#8b8b8b'
const COLOR_HANDLE = '#34d399'
const COLOR_ACTIVO = '#f59e0b'
/** Altura de los handles y del fantasma sobre la base del nivel. */
const Y_HANDLE = 0.35
const Y_FANTASMA = 0.3
const PROC_TIPOS = ['mosaico', 'ajedrez', 'grid_neon']
/** Máximo de puntos del trazo a mano alzada que se pintan (buffer preasignado). */
const MAX_TRAZO = 2048

/** El piso libre no intercepta clics: el toque llega al suelo de abajo y el avatar camina. */
const sinRaycast = () => {}

// Geometrías compartidas de los handles (no dependen del tamaño de celda).
const GEO_VERTICE = new THREE.SphereGeometry(0.22, 14, 10)
const GEO_MEDIO = new THREE.SphereGeometry(0.13, 10, 8)

/**
 * Formas de construcción LIBRE en la escena: piso (ShapeGeometry del contorno), muro
 * (`MuroPolilinea3D`) y hojas de puerta por vano. Siempre montado; publica la lista en
 * `layoutStore` para la colisión y, en modo Libre, pinta handles y el borrador.
 */
export function FormasLibres3D() {
  const emitidas = formasLibresRepo.useAll() ?? VACIO
  // useLiveQuery entrega objetos NUEVOS para todas las filas en cada escritura: para que
  // el memo de cada forma solo se invalide cuando ELLA cambia, se reutiliza el objeto
  // anterior mientras `fecha` no cambie (todas las escrituras la actualizan).
  const estables = useRef(new Map<number, FormaLibre>())
  const firma = emitidas.map((f) => `${f.id}:${f.fecha}`).join('|')
  const emitidasRef = useRef(emitidas)
  emitidasRef.current = emitidas
  const filas = useMemo(() => {
    const vivas = new Set<number>()
    const out = emitidasRef.current.map((f) => {
      if (f.id == null) return f
      vivas.add(f.id)
      const prev = estables.current.get(f.id)
      if (prev && prev.fecha === f.fecha) return prev
      estables.current.set(f.id, f)
      return f
    })
    for (const id of [...estables.current.keys()]) if (!vivas.has(id)) estables.current.delete(id)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la firma resume id+fecha de todas las filas
  }, [firma])
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  // El modo persiste al cerrar el editor: sin `activo`, handles, resaltado y techo fantasma
  // seguirían pintándose fuera de él.
  const modoLibre = usePlanos((s) => s.activo && s.modo === 'libre')
  const formaLibreSel = usePlanos((s) => s.formaLibreSel)
  const nivelPlano = usePlanos((s) => s.nivel)
  const conHandles = usePlanos((s) => s.activo && s.modo === 'libre' && s.herramienta !== 'trazar')
  const edicion = useFormaLibre((s) => s.edicion)
  const hoverFormaId = useFormaLibre((s) => (s.hover?.tipo === 'forma' ? s.hover.id : null))
  const hoverVert = useFormaLibre((s) =>
    s.hover?.tipo === 'vertice' && s.hover.id === formaLibreSel ? s.hover.i : -1,
  )
  const hoverTramo = useFormaLibre((s) =>
    s.hover?.tipo === 'tramo' && s.hover.id === formaLibreSel ? s.hover.i : -1,
  )
  const arrastreVert = useFormaLibre((s) =>
    s.arrastre?.clase === 'vertice' && s.arrastre.id === formaLibreSel ? s.arrastre.i : -1,
  )
  // Techos: siguen al botón 🏠 (o al modo Techos, que los fuerza); en modo Libre el de la
  // forma seleccionada se ve siempre, semitransparente, para no tapar sus handles.
  const conTechoGlobal = useHouse((s) => s.conTecho)
  const forzarTecho = usePlanos((s) => (s.activo ? s.modo === 'techos' : undefined))
  const techosVisibles = forzarTecho ?? conTechoGlobal
  const techoTipoGlobal = useDiseño((s) => s.techoTipo)

  // Colisión: la misma lista que se dibuja (render y colisión no pueden divergir).
  useEffect(() => {
    useLayout.getState().setFormasLibres(filas)
  }, [filas])

  return (
    <>
      {filas.map((f) => {
        if (f.id == null) return null
        const sel = modoLibre && f.id === formaLibreSel
        return (
          // userData: selección por malla desde otros selectores 3D (mismo patrón que muroLibreSel).
          <group key={`fl-${f.id}`} userData={{ formaLibreSel: f.id }}>
            <FormaLibreItem
              f={f}
              puntos={puntosEfectivos(f, edicion)}
              gridCols={gridCols}
              gridRows={gridRows}
              baseY={nivelBaseY(f.nivel, apilado)}
              resaltado={modoLibre && (sel || f.id === hoverFormaId)}
              handles={conHandles && sel}
              hoverVert={sel ? hoverVert : -1}
              hoverTramo={sel ? hoverTramo : -1}
              arrastreVert={sel ? arrastreVert : -1}
              techo={modoLibre && sel ? 'fantasma' : techosVisibles ? 'solido' : 'no'}
              techoTipoGlobal={techoTipoGlobal}
            />
          </group>
        )
      })}
      {modoLibre && <BorradorFantasma gridCols={gridCols} gridRows={gridRows} baseY={nivelBaseY(nivelPlano, apilado)} />}
    </>
  )
}

/** Una forma libre: piso + muro + hojas de puerta + handles. Memo: solo se rehace la que cambia. */
const FormaLibreItem = memo(function FormaLibreItem({
  f,
  puntos,
  gridCols,
  gridRows,
  baseY,
  resaltado,
  handles,
  hoverVert,
  hoverTramo,
  arrastreVert,
  techo,
  techoTipoGlobal,
}: {
  f: FormaLibre
  /** Vértices efectivos (la copia viva mientras se arrastra). */
  puntos: PuntoUV[]
  gridCols: number
  gridRows: number
  baseY: number
  resaltado: boolean
  handles: boolean
  hoverVert: number
  hoverTramo: number
  arrastreVert: number
  /** Techo: oculto, sólido o semitransparente (la forma seleccionada en modo Libre). */
  techo: 'no' | 'solido' | 'fantasma'
  /** Techo global de la casa: lo hereda la forma que no eligió material propio. */
  techoTipoGlobal: TechoTipoId | null
}) {
  const fEf = useMemo(() => (puntos === f.puntos ? f : { ...f, puntos }), [f, puntos])

  const contorno = useMemo(
    () => (tienePiso(fEf.tipo) && !esSinPiso(fEf.pisoTipo) ? contornoPiso(fEf, gridCols, gridRows) : []),
    [fEf, gridCols, gridRows],
  )
  const geoPiso = useMemo(() => {
    if (contorno.length < 3) return null
    const g = new THREE.ShapeGeometry(shapeDePoligono(contorno))
    g.rotateX(-Math.PI / 2)
    return g
  }, [contorno])
  useEffect(() => () => geoPiso?.dispose(), [geoPiso])

  const muro = useMemo(
    () => (tieneMuro(fEf.tipo) ? muestrasMuro(fEf, gridCols, gridRows) : null),
    [fEf, gridCols, gridRows],
  )
  const alto = fEf.alto ?? 1
  const He = WALL_H * alto
  // Hojas de puerta: una por vano de puerta que quepa en el contorno.
  const puertas = useMemo(() => {
    if (!muro) return []
    const out: {
      vano: VanoLibre
      tipo: Exclude<NonNullable<VanoLibre['puertaTipo']>, 'sin'>
      ab: NonNullable<ReturnType<typeof aberturaVano>>
      remate?: RemateHoja
    }[] = []
    for (const vano of fEf.vanos ?? []) {
      if (vano.tipo !== 'puerta') continue
      const tipo = vano.puertaTipo ?? 'recta'
      if (tipo === 'sin') continue
      const ab = aberturaVano(fEf, vano, gridCols, gridRows)
      if (!ab) continue
      const hojaAlto = He * (vano.puertaAlto ?? 0.85)
      const forma = (vano.puertaForma ?? 'recta') as FormaVanoId
      const remate: RemateHoja | undefined =
        forma !== 'recta'
          ? {
              forma,
              extra: Math.min(WALL_H * VANO_FORMA_ALTO_DEFAULT, Math.max(0, He * 0.98 - hojaAlto)),
              ancho: 1,
              posX: 0,
            }
          : undefined
      out.push({ vano, tipo, ab, remate })
    }
    return out
  }, [fEf, muro, gridCols, gridRows, He])

  const vertices = useMemo(
    () => (handles ? puntosMundoForma(fEf.puntos, gridCols, gridRows) : null),
    [handles, fEf.puntos, gridCols, gridRows],
  )
  const conTecho = techo !== 'no' && !!fEf.techo
  const contornoTechoPts = useMemo(
    () => (conTecho ? contornoTecho(fEf, gridCols, gridRows) : []),
    [conTecho, fEf, gridCols, gridRows],
  )
  // El techo se apoya en el remate recto del muro, como en los cuartos (`alturaTechoDeSegs`):
  // el arco o el pico de la silueta lo atraviesan y hacen de hastial.
  const yTecho = baseY + He + 0.06

  return (
    <group>
      {geoPiso && (
        <PisoLibreMesh
          geo={geoPiso}
          y={baseY + Y_PISO_LIBRE}
          pisoTipo={fEf.pisoTipo ?? null}
          pisoColor={fEf.pisoColor}
        />
      )}
      {muro && (
        <MuroPolilinea3D
          muestras={muro.muestras}
          L={muro.L}
          cerrada={muro.cerrada}
          vanos={muro.vanos}
          baseY={baseY}
          alto={alto}
          silueta={fEf.silueta ?? 'recta'}
          formaAlto={fEf.formaAlto}
          formaAncho={fEf.formaAncho}
          formaPosX={fEf.formaPosX}
          color={fEf.muroColor ?? COLOR_MURO_DEFECTO}
          tipo={fEf.muroTipo}
          resaltado={resaltado}
        />
      )}
      {puertas.map((p, i) => (
        <MuroLibrePuerta3D
          key={i}
          ab={p.ab}
          baseY={baseY}
          alto={He * (p.vano.puertaAlto ?? 0.85)}
          tipo={p.tipo}
          color={p.vano.color ?? '#b9824f'}
          nivel={f.nivel}
          remate={p.remate}
        />
      ))}
      {fEf.techo && contornoTechoPts.length >= MIN_PUNTOS_CERRAR && (
        <TechoLibre3D
          contorno={contornoTechoPts}
          techo={fEf.techo}
          tipo={(fEf.techoTipo === undefined ? techoTipoGlobal : fEf.techoTipo) as TechoTipoId | null}
          colorBase={fEf.techoColor ?? fEf.muroColor ?? COLOR_MURO_DEFECTO}
          alto={fEf.techoAlto ?? 1}
          dir={fEf.techoDir ?? 0}
          y={yTecho}
          fantasma={techo === 'fantasma'}
        />
      )}
      {vertices && (
        <Handles
          vertices={vertices}
          cerrada={formaCerrada(fEf) && vertices.length >= MIN_PUNTOS_CERRAR}
          y={baseY + Y_HANDLE}
          hoverVert={hoverVert}
          hoverTramo={hoverTramo}
          arrastreVert={arrastreVert}
        />
      )}
    </group>
  )
})

/** Esferas en los vértices de control y, menores, en el punto medio de cada tramo. */
function Handles({
  vertices,
  cerrada,
  y,
  hoverVert,
  hoverTramo,
  arrastreVert,
}: {
  vertices: { x: number; z: number }[]
  cerrada: boolean
  y: number
  hoverVert: number
  hoverTramo: number
  arrastreVert: number
}) {
  const n = vertices.length
  const m = cerrada ? n : n - 1
  const medios: { x: number; z: number }[] = []
  for (let i = 0; i < m; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % n]
    medios.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 })
  }
  return (
    <group>
      {vertices.map((p, i) => {
        const activo = i === hoverVert || i === arrastreVert
        const c = activo ? COLOR_ACTIVO : COLOR_HANDLE
        return (
          <mesh key={`v${i}`} geometry={GEO_VERTICE} position={[p.x, y, p.z]} raycast={sinRaycast}>
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={activo ? 0.7 : 0.35} />
          </mesh>
        )
      })}
      {medios.map((p, i) => {
        const c = i === hoverTramo ? COLOR_ACTIVO : COLOR_HANDLE
        return (
          <mesh key={`m${i}`} geometry={GEO_MEDIO} position={[p.x, y, p.z]} raycast={sinRaycast}>
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} transparent opacity={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Borrador (forma que se está dibujando): esferas en sus vértices, tramos como cajas
 * finas verdes y el trazo a mano alzada en curso. El primer vértice late en ámbar cuando
 * tocarlo cerraría la forma.
 */
function BorradorFantasma({ gridCols, gridRows, baseY }: { gridCols: number; gridRows: number; baseY: number }) {
  const borrador = useFormaLibre((s) => s.borrador)
  const pts = useMemo(
    () => (borrador ? puntosMundoForma(borrador, gridCols, gridRows) : []),
    [borrador, gridCols, gridRows],
  )
  const y = baseY + Y_FANTASMA
  const cerrable = pts.length >= MIN_PUNTOS_CERRAR
  return (
    <group>
      {pts.map((p, i) => {
        const c = i === 0 && cerrable ? COLOR_ACTIVO : COLOR_HANDLE
        return (
          <mesh key={`b${i}`} geometry={GEO_VERTICE} position={[p.x, y, p.z]} raycast={sinRaycast}>
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} transparent opacity={0.85} />
          </mesh>
        )
      })}
      {pts.slice(1).map((b, i) => {
        const a = pts[i]
        const dx = b.x - a.x
        const dz = b.z - a.z
        const largo = Math.hypot(dx, dz)
        if (largo < 0.02) return null
        return (
          <mesh
            key={`t${i}`}
            position={[(a.x + b.x) / 2, y, (a.z + b.z) / 2]}
            rotation={[0, Math.atan2(-dz, dx), 0]}
            raycast={sinRaycast}
          >
            <boxGeometry args={[largo, 0.6, 0.12]} />
            <meshStandardMaterial
              color={COLOR_HANDLE}
              emissive={COLOR_HANDLE}
              emissiveIntensity={0.4}
              transparent
              opacity={0.45}
            />
          </mesh>
        )
      })}
      <TrazoManoAlzada y={y} />
    </group>
  )
}

/**
 * Trazo a mano alzada en curso. `trazoEnCurso()` es estado de módulo (no dispara render):
 * se lee en cada frame y se vuelca a un buffer de línea preasignado.
 */
function TrazoManoAlzada({ y }: { y: number }) {
  const linea = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAZO * 3), 3))
    g.setDrawRange(0, 0)
    const mat = new THREE.LineBasicMaterial({ color: COLOR_HANDLE, transparent: true, opacity: 0.9 })
    const l = new THREE.Line(g, mat)
    l.visible = false
    l.frustumCulled = false
    return l
  }, [])
  useEffect(
    () => () => {
      linea.geometry.dispose()
      ;(linea.material as THREE.Material).dispose()
    },
    [linea],
  )
  const ultimo = useRef<{ tz: { x: number; z: number }[] | null; n: number; y: number }>({ tz: null, n: 0, y })
  useFrame(() => {
    const tz = trazoEnCurso()
    if (!tz || tz.length < 2) {
      linea.visible = false
      ultimo.current.tz = null
      return
    }
    const n = Math.min(tz.length, MAX_TRAZO)
    // El array del trazo se muta en sitio: se compara por referencia + longitud + altura.
    if (ultimo.current.tz === tz && ultimo.current.n === n && ultimo.current.y === y) return
    ultimo.current = { tz, n, y }
    const attr = linea.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < n; i++) attr.setXYZ(i, tz[i].x, y, tz[i].z)
    attr.needsUpdate = true
    linea.geometry.setDrawRange(0, n)
    linea.visible = true
  })
  return <primitive object={linea} />
}

/** Piso de la forma: textura PBR, patrón procedural o color liso, con Suspense de color. */
function PisoLibreMesh({
  geo,
  y,
  pisoTipo,
  pisoColor,
}: {
  geo: THREE.BufferGeometry
  y: number
  pisoTipo: string | null
  pisoColor?: string
}) {
  const conf = getPisoTipo(pisoTipo as PisoTipoId | null)
  const colorLiso = pisoColor || conf?.color || COLOR_PISO_DEFECTO
  const liso = (
    <mesh geometry={geo} position={[0, y, 0]} receiveShadow raycast={sinRaycast}>
      <meshStandardMaterial
        color={colorLiso}
        roughness={conf?.roughness ?? 0.85}
        metalness={conf?.metalness ?? 0}
        emissive={conf?.emissive ?? '#000000'}
        emissiveIntensity={conf?.emissiveIntensity ?? 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
  if (conf && !conf.textura && PROC_TIPOS.includes(conf.id)) {
    return <PisoLibreProcedural geo={geo} y={y} tipo={conf.id} tinte={pisoColor} />
  }
  if (!conf?.textura) return liso
  return (
    <Suspense fallback={liso}>
      <PisoLibreTexturado
        geo={geo}
        y={y}
        textura={conf.textura}
        tileSize={conf.tileSize ?? 2.5}
        tinte={pisoColor}
        roughness={conf.roughness}
        metalness={conf.metalness}
        emissive={conf.emissive ?? '#000000'}
        emissiveIntensity={conf.emissiveIntensity ?? 0}
      />
    </Suspense>
  )
}

/** Clona una textura con repetición métrica (la UV de la ShapeGeometry ya va en metros). */
function clonarRepeat(t: THREE.Texture, rep: number): THREE.Texture {
  const k = t.clone()
  k.wrapS = k.wrapT = THREE.RepeatWrapping
  k.repeat.set(rep, rep)
  k.needsUpdate = true
  return k
}

function PisoLibreTexturado({
  geo,
  y,
  textura,
  tileSize,
  tinte,
  roughness,
  metalness,
  emissive,
  emissiveIntensity,
}: {
  geo: THREE.BufferGeometry
  y: number
  textura: string
  tileSize: number
  tinte?: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
}) {
  const base = `/textures/floors/${textura}`
  const maps = useTexture({
    map: `${base}_color.jpg`,
    normalMap: `${base}_normal.jpg`,
    roughnessMap: `${base}_roughness.jpg`,
  })
  // Copias propias: las texturas de useTexture se comparten con las losetas de los
  // cuartos (que les fijan otro repeat); aquí el tile va en metros.
  const propias = useMemo(() => {
    const rep = 1 / tileSize
    return {
      map: clonarRepeat(maps.map, rep),
      normalMap: clonarRepeat(maps.normalMap, rep),
      roughnessMap: clonarRepeat(maps.roughnessMap, rep),
    }
  }, [maps.map, maps.normalMap, maps.roughnessMap, tileSize])
  useEffect(
    () => () => {
      propias.map.dispose()
      propias.normalMap.dispose()
      propias.roughnessMap.dispose()
    },
    [propias],
  )
  return (
    <mesh geometry={geo} position={[0, y, 0]} receiveShadow raycast={sinRaycast}>
      <meshStandardMaterial
        map={propias.map}
        normalMap={propias.normalMap}
        roughnessMap={propias.roughnessMap}
        color="#ffffff"
        roughness={roughness}
        metalness={metalness}
        // Con tinte: emisivo coloreado modulado por la textura (tiñe sin oscurecer), como PisoCelda.
        emissiveMap={tinte ? propias.map : undefined}
        emissive={tinte ?? emissive}
        emissiveIntensity={tinte ? 0.28 : emissiveIntensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function PisoLibreProcedural({
  geo,
  y,
  tipo,
  tinte,
}: {
  geo: THREE.BufferGeometry
  y: number
  tipo: string
  tinte?: string
}) {
  const map = useMemo(() => clonarRepeat(texturaProc(tipo), 1 / (PROC_PERIODO[tipo] ?? 2)), [tipo])
  useEffect(() => () => map.dispose(), [map])
  const esNeon = tipo === 'grid_neon'
  const emissiveColor = esNeon ? (tinte ?? '#0044ff') : (tinte ?? '#000000')
  return (
    <mesh geometry={geo} position={[0, y, 0]} receiveShadow raycast={sinRaycast}>
      <meshStandardMaterial
        map={map}
        color="#ffffff"
        emissiveMap={esNeon || tinte ? map : undefined}
        emissive={emissiveColor}
        emissiveIntensity={esNeon ? 0.9 : tinte ? 0.28 : 0}
        roughness={esNeon ? 0.3 : 0.28}
        metalness={esNeon ? 0.3 : 0.1}
        toneMapped={!esNeon}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
