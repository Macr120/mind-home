import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import {
  useCanchas,
  CANCHAS,
  PORTERIA,
  BEISBOL,
  radioBeisbol,
  esCancha,
  claseDeCancha,
  escalaCancha,
  type ClaseCancha,
} from '../state/canchasStore'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'

/** Nº de tramos del arco del jardín (forma del piso, barda y warning track). */
const ARCO_SEGMENTOS = 40

/** Puntos del arco de la barda en coordenadas LOCALES (x, z), de un extremo del terreno al otro. */
function arcoBeisbol(radioExtra = 0): { x: number; z: number }[] {
  const { home, aperturaCampo } = BEISBOL
  return Array.from({ length: ARCO_SEGMENTOS + 1 }, (_, i) => {
    const a = -aperturaCampo + (2 * aperturaCampo * i) / ARCO_SEGMENTOS
    const r = radioBeisbol(a) + radioExtra
    return { x: home + Math.cos(a) * r, z: Math.sin(a) * r }
  })
}

/**
 * Campo de béisbol pintado en el canvas de la textura: césped a franjas de
 * corte, warning track pegado a la barda, cuadro de tierra con el césped
 * interior del diamante, montículo, bases y líneas de foul. La geometría del
 * piso recorta el abanico, así que fuera de él da igual lo que quede pintado.
 */
function pintarBeisbol(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  largo: number,
  ancho: number,
  color: string,
) {
  const { home, apertura, aperturaCampo, base, pista, plato } = BEISBOL
  const px = (x: number) => ((x + largo / 2) / largo) * W
  const py = (z: number) => ((z + ancho / 2) / ancho) * H
  const ppm = W / largo
  const hx = px(home)
  const hy = py(0)
  // Césped: todo el lienzo (la geometría del abanico recorta lo que sobra).
  g.fillStyle = color
  g.fillRect(0, 0, W, H)
  // Franjas del corte de la máquina, en abanico desde el home.
  g.fillStyle = 'rgba(255,255,255,0.055)'
  const ancla = (BEISBOL.radio / 9) * ppm
  for (let r = ancla; r < BEISBOL.radio * ppm + ancla; r += ancla * 2) {
    g.beginPath()
    g.arc(hx, hy, r, -aperturaCampo, aperturaCampo)
    g.arc(hx, hy, Math.max(0, r - ancla), aperturaCampo, -aperturaCampo, true)
    g.closePath()
    g.fill()
  }
  // Warning track: anillo de tierra pegado a la barda (sigue su mismo arco).
  const exterior = arcoBeisbol()
  const interior = arcoBeisbol(-pista).reverse()
  g.fillStyle = '#a16207'
  g.beginPath()
  exterior.forEach((p, i) => (i ? g.lineTo(px(p.x), py(p.z)) : g.moveTo(px(p.x), py(p.z))))
  interior.forEach((p) => g.lineTo(px(p.x), py(p.z)))
  g.closePath()
  g.fill()
  // Cuadro: sector de tierra alrededor del diamante, y área de tierra del plato.
  const diag = base * Math.SQRT2 // home → segunda base
  g.fillStyle = '#b45309'
  g.beginPath()
  g.moveTo(hx, hy)
  g.arc(hx, hy, (diag + 1.0) * ppm, -aperturaCampo, aperturaCampo)
  g.closePath()
  g.fill()
  g.beginPath()
  g.arc(hx, hy, plato * ppm, 0, Math.PI * 2)
  g.fill()
  // Césped interior del diamante (la tierra queda en el borde, el montículo y las bases).
  const b = base / Math.SQRT2 // media diagonal del cuadrado de bases
  g.fillStyle = color
  g.beginPath()
  g.moveTo(px(home + 1.0), hy)
  g.lineTo(px(home + b), py(-b + 0.9))
  g.lineTo(px(home + 2 * b - 1.0), hy)
  g.lineTo(px(home + b), py(b - 0.9))
  g.closePath()
  g.fill()
  // Montículo con su placa de pitcheo.
  g.fillStyle = '#d97706'
  g.beginPath()
  g.arc(px(BEISBOL.monticulo), hy, 1.0 * ppm, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f8fafc'
  g.fillRect(px(BEISBOL.monticulo) - 0.28 * ppm, hy - 0.09 * ppm, 0.56 * ppm, 0.18 * ppm)
  // Bases (las tres almohadillas) y el plato de home.
  const lado = 0.55 * ppm
  for (const [bx, bz] of [
    [home + b, -b],
    [home + 2 * b, 0],
    [home + b, b],
  ])
    g.fillRect(px(bx) - lado / 2, py(bz) - lado / 2, lado, lado)
  g.beginPath()
  g.arc(hx, hy, 0.4 * ppm, 0, Math.PI * 2)
  g.fill()
  // Líneas de foul, del home hasta la barda.
  const rLinea = radioBeisbol(apertura)
  g.strokeStyle = '#f8fafc'
  g.lineWidth = Math.max(2, 0.12 * ppm)
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(hx, hy)
    g.lineTo(px(home + Math.cos(apertura) * rLinea), py(s * Math.sin(apertura) * rLinea))
    g.stroke()
  }
}

/**
 * Textura procedural del piso de la cancha: fondo del color de la clase y
 * líneas blancas pintadas en un canvas 2D (sin blobs ni imágenes externas).
 */
function useTexturaCancha(clase: ClaseCancha, color: string): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const def = CANCHAS[clase]
    const W = 640
    const H = Math.round((W * def.ancho) / def.largo)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = color
    g.fillRect(0, 0, W, H)
    // El béisbol no es un rectángulo con líneas: se pinta entero aparte.
    if (clase === 'beisbol') {
      pintarBeisbol(g, W, H, def.largo, def.ancho, color)
      const tb = new THREE.CanvasTexture(c)
      tb.anisotropy = 4
      tb.colorSpace = THREE.SRGBColorSpace
      return tb
    }
    g.strokeStyle = '#f8fafc'
    g.lineWidth = 6
    const m = 18 // margen del perímetro
    g.strokeRect(m, m, W - 2 * m, H - 2 * m)
    // Línea central (básquet es MEDIA cancha).
    if (clase !== 'basket') {
      g.beginPath()
      g.moveTo(W / 2, m)
      g.lineTo(W / 2, H - m)
      g.stroke()
    }
    if (clase === 'futbol') {
      // Futsal 25×15: círculo central de 3 m y áreas de 6 m de profundidad.
      g.beginPath()
      g.arc(W / 2, H / 2, H * 0.2, 0, Math.PI * 2)
      g.stroke()
      const areaW = W * 0.24
      const areaH = H * 0.55
      g.strokeRect(m, (H - areaH) / 2, areaW, areaH)
      g.strokeRect(W - m - areaW, (H - areaH) / 2, areaW, areaH)
    } else if (clase === 'tenis') {
      // Tenis 24×11: pasillos de dobles (1.37 m) y servicio a 6.4 m de la red.
      const lat = H * 0.125
      g.beginPath()
      g.moveTo(m, m + lat)
      g.lineTo(W - m, m + lat)
      g.moveTo(m, H - m - lat)
      g.lineTo(W - m, H - m - lat)
      const serv = W * 0.267
      g.moveTo(W / 2 - serv, m + lat)
      g.lineTo(W / 2 - serv, H - m - lat)
      g.moveTo(W / 2 + serv, m + lat)
      g.lineTo(W / 2 + serv, H - m - lat)
      g.moveTo(W / 2 - serv, H / 2)
      g.lineTo(W / 2 + serv, H / 2)
      g.stroke()
    } else {
      // Básquet MEDIA cancha 15×14: botella + tiro libre + arco de 3 en el lado del
      // aro (izquierda) y semicírculo de media cancha en el extremo opuesto.
      const keyW = W * 0.387 // botella: 5.8 m de profundidad
      const keyH = H * 0.35 // 4.9 m de ancho
      g.strokeRect(m, (H - keyH) / 2, keyW, keyH)
      g.beginPath()
      g.arc(m + keyW, H / 2, H * 0.129, -Math.PI / 2, Math.PI / 2) // tiro libre (r 1.8 m)
      g.stroke()
      g.beginPath()
      g.arc(m + W * 0.105, H / 2, Math.min(W * 0.45, H / 2 - m), -Math.PI / 2, Math.PI / 2) // triple (r 6.75 m)
      g.stroke()
      g.beginPath()
      g.arc(W - m, H / 2, H * 0.129, Math.PI / 2, (3 * Math.PI) / 2) // media cancha
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.anisotropy = 4
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [clase, color])
  // R3F no libera texturas creadas fuera de JSX: liberar al cambiar/desmontar.
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

/** Portería de fútbol (medidas de PORTERIA, compartidas con la física del gol) con red simple. */
function Porteria() {
  const mat = <meshStandardMaterial color="#f8fafc" roughness={0.5} />
  const { ancho, alto, poste, redProf } = PORTERIA
  return (
    <group>
      {[-ancho / 2, ancho / 2].map((z) => (
        <mesh key={z} position={[0, alto / 2, z]}>
          <cylinderGeometry args={[poste, poste, alto, 8]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, alto, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[poste, poste, ancho + 2 * poste, 8]} />
        {mat}
      </mesh>
      {/* Red: plano translúcido detrás del marco. */}
      <mesh position={[-redProf / 3, alto / 2, 0]}>
        <boxGeometry args={[0.05, alto, ancho]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.35} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Tablero de básquet a escala real: aro a 3.05 m sobre poste. */
function Tablero({ mirando }: { mirando: 1 | -1 }) {
  return (
    <group>
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 3.6, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.6} />
      </mesh>
      <mesh position={[mirando * 0.35, 3.4, 0]}>
        <boxGeometry args={[0.06, 1.05, 1.8]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>
      <mesh position={[mirando * 0.62, 3.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.025, 8, 20]} />
        <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

/**
 * Piso del béisbol: el ABANICO real (vértice en el home y arco del jardín), no
 * un rectángulo. Se extruye el contorno para darle el mismo grosor que las
 * otras canchas y se le recalculan las UV para que encaje la textura pintada
 * sobre el rectángulo envolvente.
 */
function usePisoBeisbol(largo: number, ancho: number): THREE.ExtrudeGeometry {
  const geo = useMemo(() => {
    const { home, aperturaCampo, plato } = BEISBOL
    const forma = new THREE.Shape()
    const arco = arcoBeisbol()
    forma.moveTo(arco[0].x, arco[0].z)
    for (const p of arco) forma.lineTo(p.x, p.z)
    // Baja por el borde del territorio de foul y rodea el área del plato.
    forma.lineTo(home + Math.cos(aperturaCampo) * plato, Math.sin(aperturaCampo) * plato)
    forma.absarc(home, 0, plato, aperturaCampo, 2 * Math.PI - aperturaCampo, false)
    forma.closePath()
    const g = new THREE.ExtrudeGeometry(forma, { depth: 0.12, bevelEnabled: false })
    const pos = g.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + largo / 2) / largo
      uv[i * 2 + 1] = 1 - (pos.getY(i) + ancho / 2) / ancho
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }, [largo, ancho])
  useEffect(() => () => geo.dispose(), [geo])
  return geo
}

/** Barda del jardín: tira vertical que sigue el arco (radio variable, no un cilindro). */
function useGeometriaBarda(y0: number, y1: number, extra: number): THREE.BufferGeometry {
  const geo = useMemo(() => {
    const pts = arcoBeisbol(extra)
    const vert: number[] = []
    const idx: number[] = []
    pts.forEach((p, i) => {
      vert.push(p.x, y0, p.z, p.x, y1, p.z)
      if (i > 0) {
        const a = (i - 1) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [y0, y1, extra])
  useEffect(() => () => geo.dispose(), [geo])
  return geo
}

/** Campo de béisbol: barda curva con franja y postes de foul en los extremos del arco. */
function CampoBeisbol() {
  const barda = useGeometriaBarda(0, BEISBOL.cercaAlto, 0)
  const franja = useGeometriaBarda(BEISBOL.cercaAlto - 0.14, BEISBOL.cercaAlto, 0.04)
  const r = radioBeisbol(BEISBOL.apertura)
  return (
    <group position={[0, 0.12, 0]}>
      <mesh geometry={barda}>
        <meshStandardMaterial color="#166534" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={franja}>
        <meshStandardMaterial color="#facc15" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[
            BEISBOL.home + Math.cos(BEISBOL.apertura) * r,
            2.2,
            s * Math.sin(BEISBOL.apertura) * r,
          ]}
        >
          <cylinderGeometry args={[0.06, 0.06, 4.4, 8]} />
          <meshStandardMaterial color="#facc15" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Cancha completa: piso con líneas pintadas + accesorios por clase (porterías,
 * red o tableros). Es el render del objeto de mapa `cancha:<clase>`.
 */
export function Cancha3D({ clase, color }: { clase: ClaseCancha; color: string }) {
  const def = CANCHAS[clase]
  const tex = useTexturaCancha(clase, color)
  const pisoBeisbol = usePisoBeisbol(def.largo, def.ancho)
  if (clase === 'beisbol')
    return (
      <group>
        {/* El abanico ya lleva la textura del campo: sin caja rectangular debajo. */}
        <mesh geometry={pisoBeisbol} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial map={tex} roughness={0.85} />
        </mesh>
        <CampoBeisbol />
      </group>
    )
  return (
    <group>
      {/* Piso: caja base + tapa con la textura de líneas. */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[def.largo, 0.12, def.ancho]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[def.largo, def.ancho]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
      {clase === 'futbol' && (
        <>
          <group position={[-def.largo / 2 + 0.15, 0.12, 0]}>
            <Porteria />
          </group>
          <group position={[def.largo / 2 - 0.15, 0.12, 0]}>
            <Porteria />
          </group>
        </>
      )}
      {clase === 'tenis' && (
        <group position={[0, 0.12, 0]}>
          {/* Red central (1 m al centro) con dos postes de 1.07. */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.04, 1.0, def.ancho - 0.3]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.55} roughness={0.8} />
          </mesh>
          {[-(def.ancho - 0.3) / 2, (def.ancho - 0.3) / 2].map((z) => (
            <mesh key={z} position={[0, 0.535, z]}>
              <cylinderGeometry args={[0.05, 0.05, 1.07, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
          ))}
        </group>
      )}
      {clase === 'basket' && (
        // Media cancha: un solo aro, en la línea de fondo del lado de la botella.
        <group position={[-def.largo / 2 + 0.2, 0.12, 0]}>
          <Tablero mirando={1} />
        </group>
      )}
    </group>
  )
}

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _hit = new THREE.Vector3()
const _ndc = new THREE.Vector2()

/** Punto del suelo (y=0) bajo el cursor, en coordenadas de mundo. */
function puntoSuelo(
  clientX: number,
  clientY: number,
  dom: HTMLCanvasElement,
  camera: THREE.Camera,
): { x: number; z: number } | null {
  const rect = dom.getBoundingClientRect()
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    return null
  _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  _ray.setFromCamera(_ndc, camera)
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null
  return { x: _hit.x, z: _hit.z }
}

/** Cancha del mapa cuyo rectángulo (con su rotación y su escala) contiene el punto. */
function canchaEnPunto(p: { x: number; z: number }) {
  return useDiseño.getState().objetos.find((o) => {
    if (!esObjetoMapa(o) || !esCancha(o.tipo)) return false
    const def = CANCHAS[claseDeCancha(o.tipo)]
    const esc = escalaCancha(o.escala)
    const girada = (o.rotY ?? 0) % 180 !== 0
    const hw = ((girada ? def.ancho : def.largo) * esc) / 2
    const hh = ((girada ? def.largo : def.ancho) * esc) / 2
    return Math.abs(p.x - (o.x ?? 0)) <= hw && Math.abs(p.z - (o.z ?? 0)) <= hh
  })
}

/** Contorno cuadrado sobre una cancha (fantasma de colocación o resaltado de selección). */
function ContornoCancha({ largo, ancho, color }: { largo: number; ancho: number; color: string }) {
  const geo = useMemo(() => {
    const hw = largo / 2
    const hh = ancho / 2
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hw, 0, -hh),
      new THREE.Vector3(hw, 0, -hh),
      new THREE.Vector3(hw, 0, hh),
      new THREE.Vector3(-hw, 0, hh),
    ])
  }, [largo, ancho])
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
    </lineLoop>
  )
}

/** Resaltado en vivo de la cancha seleccionada en modo Editar. */
function ContornoSeleccion() {
  const sel = useCanchas((s) => s.sel)
  const obj = useDiseño((s) => s.objetos.find((o) => o.id === sel))
  if (!obj || !esCancha(obj.tipo)) return null
  const def = CANCHAS[claseDeCancha(obj.tipo)]
  const esc = escalaCancha(obj.escala)
  return (
    <group
      position={[obj.x ?? 0, 0.26, obj.z ?? 0]}
      rotation-y={((obj.rotY ?? 0) * Math.PI) / 180}
    >
      <ContornoCancha largo={def.largo * esc} ancho={def.ancho * esc} color="#34d399" />
    </group>
  )
}

/**
 * Con el editor activo: un fantasma de la cancha sigue el cursor; clic la coloca
 * (arrastres largos son cámara). En modo Editar (sin clase), el clic selecciona la
 * cancha bajo el cursor y el overlay edita color/tamaño/rotación en vivo.
 * R rota, Esc deselecciona y luego sale.
 */
export function CanchasController() {
  const activo = useCanchas((s) => s.activo)
  return activo ? <CanchasControllerActivo /> : null
}

function CanchasControllerActivo() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const clase = useCanchas((s) => s.clase)
  const rot = useCanchas((s) => s.rot)
  const color = useCanchas((s) => s.color)
  const escala = useCanchas((s) => s.escala)
  const [pos, setPos] = useState<{ x: number; z: number } | null>(null)

  useEffect(() => {
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue arrastre de cámara
      const p = puntoSuelo(ev.clientX, ev.clientY, dom, camera)
      if (!p) return
      const st = useCanchas.getState()
      if (st.clase) {
        void st.colocar(p.x, p.z)
        return
      }
      // Editar: selecciona la cancha bajo el punto (clic en vacío deselecciona).
      st.seleccionar(canchaEnPunto(p)?.id ?? null)
    }
    const onMove = (ev: PointerEvent) => setPos(puntoSuelo(ev.clientX, ev.clientY, dom, camera))
    const onLeave = () => setPos(null)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        const st = useCanchas.getState()
        if (st.sel != null) st.seleccionar(null)
        else st.salir()
      }
      if (ev.key === 'r' || ev.key === 'R') useCanchas.getState().rotar()
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKey)
      setPos(null)
    }
  }, [gl, camera])

  const def = clase ? CANCHAS[clase] : null
  return (
    <>
      <ContornoSeleccion />
      {/* Fantasma de colocación con el color y la escala elegidos (piso ~0.19 de tope). */}
      {pos && def && clase && (
        <group
          position={[pos.x, 0.25, pos.z]}
          rotation-y={rot === 90 ? Math.PI / 2 : 0}
          scale={escalaCancha(escala)}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[def.largo, def.ancho]} />
            <meshBasicMaterial color={color ?? def.color} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <ContornoCancha largo={def.largo} ancho={def.ancho} color="#ffffff" />
        </group>
      )}
    </>
  )
}
