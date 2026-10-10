import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { useDespierto } from '../state/despiertoStore'
import { useHouse } from '../state/houseStore'
import { usePlanos } from '../state/planosStore'
import { useDiseño } from '../state/disenoStore'
import { VACIO, murosLibresRepo, moverMuroLibre } from '../data/repository'
import { nivelBaseY, WALL_H, WALL_T, SPACING } from './walls'
import { Temblor } from './Animado'
import { pulsacionLargaDespertar } from './pulsacionLarga'
import { puntoSueloBajoCursor } from './arrastreCelda'
import { esModoFondo } from '../plataforma'
import {
  segmentosMundoMuroLibre,
  arcoCircularMuroLocal,
  centroCeldaMundo,
  aberturaMuroLibreMundo,
  MURO_LIBRE_ROOM,
  claveImagenMuroLibre,
} from './murosLibre'
import { MuroSegment } from './MuroRender'
import { MuroCurvo3D } from './MuroCurvo3D'
import { MuroLibrePuerta3D } from './MuroLibrePuerta3D'
import { VANO_FORMA_ALTO_DEFAULT } from './murosPuertas'
import type { RemateHoja } from './puertaHojas'
import { GrafitisMuroLibre } from './grafiti'
import type { TipoMuroId, FormaMuroId, FormaVanoId } from './murosPuertas'
import type { MuroLibre } from '../data/db'

const COLOR_MURO_DEFECTO = '#8c8073'
const COLOR_FANTASMA = '#34d399'
const COLOR_FANTASMA_BORRA = '#f87171'

/** Previsualización translúcida del muro bajo el cursor en el mapa 3D. */
function FantasmaMuro({
  hover,
  gridCols,
  gridRows,
  yBase,
}: {
  hover: NonNullable<ReturnType<typeof usePlanos.getState>['muroHover']>
  gridCols: number
  gridRows: number
  yBase: number
}) {
  // Rojo si el clic borraría el muro; verde si lo coloca/rota.
  const color = hover.borra ? COLOR_FANTASMA_BORRA : COLOR_FANTASMA
  const rotacion = hover.rotacion ?? 0

  if (hover.clase === 'forma' && hover.forma === 'circular') {
    const centro = centroCeldaMundo(hover.col, hover.row, gridCols, gridRows)
    const arco = arcoCircularMuroLocal(rotacion)
    return (
      <MuroCurvo3D
        arcCx={centro.x + arco.cx}
        arcCz={centro.z + arco.cz}
        r={arco.r}
        a0={arco.a0}
        a1={arco.a1}
        baseY={yBase}
        alto={1}
        silueta="recta"
        color={color}
        fantasma
      />
    )
  }
  const segs = segmentosMundoMuroLibre(
    { clase: hover.clase, orient: hover.orient, col: hover.col, row: hover.row, forma: hover.forma, rotacion },
    gridCols,
    gridRows,
  )
  return (
    <>
      {segs.map((s, i) => {
        const dx = s.x2 - s.x1
        const dz = s.z2 - s.z1
        const largo = Math.hypot(dx, dz)
        const rotY = Math.atan2(-dz, dx)
        return (
          <mesh
            key={i}
            position={[(s.x1 + s.x2) / 2, yBase + WALL_H / 2, (s.z1 + s.z2) / 2]}
            rotation={[0, rotY, 0]}
          >
            <boxGeometry args={[largo + WALL_T, WALL_H, WALL_T]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.4}
              emissive={color}
              emissiveIntensity={0.4}
            />
          </mesh>
        )
      })}
    </>
  )
}

const EN_FONDO = esModoFondo()

/** Centro (x/z de mundo) de un muro libre: promedio de los extremos de sus tramos. */
function centroMuroLibre(m: MuroLibre, gridCols: number, gridRows: number): { x: number; z: number } {
  const segs = segmentosMundoMuroLibre(m, gridCols, gridRows)
  if (!segs.length) return { x: 0, z: 0 }
  let x = 0
  let z = 0
  for (const s of segs) {
    x += s.x1 + s.x2
    z += s.z1 + s.z2
  }
  return { x: x / (segs.length * 2), z: z / (segs.length * 2) }
}

/** Posición (col/row) del muro desplazado dc/dr celdas, sin salirse de la rejilla. */
function posicionDesplazada(m: MuroLibre, dc: number, dr: number, gridCols: number, gridRows: number) {
  // Arista: col/row son esquinas de rejilla (llegan hasta gridCols/gridRows en su eje);
  // forma: celda.
  const maxCol = m.clase === 'arista' && m.orient === 'v' ? gridCols : gridCols - 1
  const maxRow = m.clase === 'arista' && m.orient === 'h' ? gridRows : gridRows - 1
  return {
    col: Math.min(maxCol, Math.max(0, m.col + dc)),
    row: Math.min(maxRow, Math.max(0, m.row + dr)),
  }
}

/**
 * Muros independientes (capa "Muros"). Aristas rectas y la diagonal del triángulo se
 * dibujan con `MuroSegment` (textura, color, altura y silueta). El muro circular es una
 * pared curva real (`MuroCurvo3D`), con remate de arco o pico, no una aproximación por tramos.
 *
 * Fuera de los editores, mantener pulsado un muro lo despierta (como objetos y cuartos):
 * tiembla, se arrastra por la rejilla y saca su menú (ver `MenuDespierto`).
 */
export function MurosLibres3D() {
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const muroHover = usePlanos((s) => s.muroHover)
  const nivelPlano = usePlanos((s) => s.nivel)
  const muroSelHover = usePlanos((s) => s.muroSelHover)
  const muroLibreSel = usePlanos((s) => s.muroLibreSel)
  const planosActivo = usePlanos((s) => s.activo)
  const editMode = useLayout((s) => s.editMode)
  const editor3d = useEditorUi((s) => s.editor3d)
  const despiertoId = useDespierto((s) => (s.sujeto?.tipo === 'muro' ? s.sujeto.id : null))
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const muros = murosLibresRepo.useAll() ?? VACIO
  // Posición provisional del muro que se arrastra (o recién soltado, hasta que la BD responda).
  const [arrastre, setArrastre] = useState<{ id: number; col: number; row: number } | null>(null)
  const arrastrando = useRef(false)

  // La BD ya trae la posición guardada (o la cambió otro, p. ej. deshacer): fuera la provisional.
  useEffect(() => {
    if (!arrastrando.current) setArrastre(null)
  }, [muros])

  const puedeDespertar = !editMode && !planosActivo && !editor3d && !EN_FONDO
  // Con un editor abierto el muro vuelve a ser del editor.
  useEffect(() => {
    if (!puedeDespertar && useDespierto.getState().sujeto?.tipo === 'muro') useDespierto.getState().terminar()
  }, [puedeDespertar])

  const conArrastre = (m: MuroLibre): MuroLibre =>
    arrastre && m.id === arrastre.id ? { ...m, col: arrastre.col, row: arrastre.row } : m

  /** Punto del que cuelga el menú del muro despierto: sobre su centro, encima del remate. */
  const anclaMenu = (m: MuroLibre) => {
    const c = centroMuroLibre(m, gridCols, gridRows)
    return { x: c.x, y: nivelBaseY(m.nivel, apilado) + WALL_H * (m.alto ?? 1) + 0.8, z: c.z }
  }

  // Al moverse el muro despierto, su menú lo sigue.
  const despierto = despiertoId != null ? muros.find((m) => m.id === despiertoId) : undefined
  const despiertoVisto = despierto ? conArrastre(despierto) : undefined
  useEffect(() => {
    if (!despiertoVisto || despiertoVisto.id == null) return
    useDespierto.getState().despertar({ tipo: 'muro', id: despiertoVisto.id, ...anclaMenu(despiertoVisto) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despiertoVisto?.id, despiertoVisto?.col, despiertoVisto?.row, despiertoVisto?.alto, despiertoVisto?.nivel, gridCols, gridRows, apilado])

  // Arrastre del muro despierto: salta de celda en celda siguiendo al dedo.
  const arrastrar = (m: MuroLibre, x0: number, y0: number) => {
    if (m.id == null) return
    const id = m.id
    const opts = { canvas: gl.domElement, camera, nivel: m.nivel, apilado, gridCols, gridRows }
    const p0 = puntoSueloBajoCursor(x0, y0, opts)
    if (!p0) return
    const base = conArrastre(m)
    let pos = { col: base.col, row: base.row }
    arrastrando.current = true
    useDespierto.getState().setArrastrandoMuro(true)
    const mover = (e: PointerEvent) => {
      const p = puntoSueloBajoCursor(e.clientX, e.clientY, opts)
      if (!p) return
      const dc = Math.round((p.x - p0.x) / SPACING)
      const dr = Math.round((p.z - p0.z) / SPACING)
      const sig = posicionDesplazada(base, dc, dr, gridCols, gridRows)
      if (sig.col === pos.col && sig.row === pos.row) return
      pos = sig
      setArrastre({ id, ...sig })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      arrastrando.current = false
      useDespierto.getState().setArrastrandoMuro(false)
      if (pos.col !== m.col || pos.row !== m.row) void moverMuroLibre(id, pos.col, pos.row)
      else setArrastre(null)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

  if (muros.length === 0 && !muroHover) return null
  const hoverLibreId =
    muroSelHover && 'muroLibreId' in muroSelHover ? muroSelHover.muroLibreId : null

  return (
    <>
      {muroHover && (
        <FantasmaMuro
          hover={muroHover}
          gridCols={gridCols}
          gridRows={gridRows}
          yBase={nivelBaseY(nivelPlano, apilado)}
        />
      )}
      {muros.map((m0) => {
        const m = conArrastre(m0)
        const estaDespierto = m.id != null && m.id === despiertoId
        return (
          // userData: PlanoMuroSelector3D selecciona el muro libre por su malla (cualquier forma).
          <group
            key={`ml-${m.id}`}
            userData={m.id != null ? { muroLibreSel: m.id } : undefined}
            onPointerDown={
              estaDespierto
                ? (e) => {
                    e.stopPropagation()
                    arrastrar(m0, e.nativeEvent.clientX, e.nativeEvent.clientY)
                  }
                : puedeDespertar
                  ? (e) => {
                      // Sin cortar la propagación, el cuarto de debajo arrancaría su propia
                      // pulsación larga y despertaría él en vez del muro.
                      e.stopPropagation()
                      const id = m.id
                      if (id == null) return
                      const { clientX, clientY } = e.nativeEvent
                      pulsacionLargaDespertar(e.nativeEvent, () => {
                        useDespierto.getState().despertar({ tipo: 'muro', id, ...anclaMenu(m) })
                        // El dedo sigue abajo: el mismo gesto ya lo arrastra.
                        arrastrar(m0, clientX, clientY)
                      })
                    }
                  : undefined
            }
            // Despierto, el toque que lo arrastra no debe colarse al suelo (el personaje caminaría).
            onClick={estaDespierto ? (e) => e.stopPropagation() : undefined}
          >
            <MuroTembloroso m={m} gridCols={gridCols} gridRows={gridRows} despierto={estaDespierto}>
              <MuroLibre3DItem
                m={m}
                gridCols={gridCols}
                gridRows={gridRows}
                yBase={nivelBaseY(m.nivel, apilado)}
                resaltado={m.id != null && (m.id === hoverLibreId || m.id === muroLibreSel)}
              />
            </MuroTembloroso>
            {puedeDespertar && m.clase === 'forma' && (
              <ZonaToqueMuro m={m} gridCols={gridCols} gridRows={gridRows} yBase={nivelBaseY(m.nivel, apilado)} />
            )}
          </group>
        )
      })}
    </>
  )
}

/** Grosor (u) de la zona de toque de los muros de forma. */
const GROSOR_TOQUE = 1.6

/**
 * Zona de toque invisible y gruesa de un muro de triángulo o círculo. En la vista
 * isométrica la diagonal del triángulo (y los extremos del arco) quedan de canto: una
 * línea de un píxel imposible de atinar con el dedo para la pulsación larga.
 */
function ZonaToqueMuro({ m, gridCols, gridRows, yBase }: { m: MuroLibre; gridCols: number; gridRows: number; yBase: number }) {
  const alto = WALL_H * (m.alto ?? 1)
  return (
    <>
      {segmentosMundoMuroLibre(m, gridCols, gridRows).map((s, i) => {
        const dx = s.x2 - s.x1
        const dz = s.z2 - s.z1
        return (
          // zonaToque: el clic del grafiti la salta y busca el muro de verdad.
          <mesh
            key={i}
            position={[(s.x1 + s.x2) / 2, yBase + alto / 2, (s.z1 + s.z2) / 2]}
            rotation={[0, Math.atan2(-dz, dx), 0]}
            userData={{ zonaToque: true }}
          >
            <boxGeometry args={[Math.hypot(dx, dz), alto, GROSOR_TOQUE]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        )
      })}
    </>
  )
}

/**
 * Envoltura que deja temblar al muro despierto sobre su propio centro (sus tramos van
 * en coordenadas de mundo: girar el grupo tal cual lo haría orbitar el origen). Se monta
 * siempre, despierto o no, para que encender el temblor no remonte el muro.
 */
function MuroTembloroso({
  m,
  gridCols,
  gridRows,
  despierto,
  children,
}: {
  m: MuroLibre
  gridCols: number
  gridRows: number
  despierto: boolean
  children: React.ReactNode
}) {
  const gTemblor = useRef<THREE.Group>(null)
  const c = centroMuroLibre(m, gridCols, gridRows)
  return (
    <group position={[c.x, 0, c.z]}>
      <group ref={gTemblor}>
        <group position={[-c.x, 0, -c.z]}>{children}</group>
      </group>
      {despierto && <Temblor grupo={gTemblor} factor={0.5} />}
    </group>
  )
}

/**
 * Render de UN muro libre (arista recta, triángulo o círculo) con su textura, color,
 * altura, silueta y abertura (puerta/ventana). Se usa tanto en la escena de la casa
 * (`MurosLibres3D`) como en la previsualización del editor de mapa.
 * `preview` desactiva la apertura animada de la puerta para que se vea estática.
 */
export function MuroLibre3DItem({
  m,
  gridCols,
  gridRows,
  yBase,
  preview = false,
  resaltado = false,
}: {
  m: MuroLibre
  gridCols: number
  gridRows: number
  /** Y de la base del muro. */
  yBase: number
  /** En la preview la puerta no se abre (no hay avatar de referencia). */
  preview?: boolean
  /** Resaltado (selección/hover en el editor de mapa): se tiñe de ámbar. */
  resaltado?: boolean
}) {
  const color = resaltado ? '#f59e0b' : (m.color ?? COLOR_MURO_DEFECTO)
  const silueta = (m.silueta as 'recta' | 'arco' | 'triangulo') ?? 'recta'

  // Contenido del vano: cristal (default), cuadro con foto o espejo. Solo en muros rectos
  // (aristas y diagonal); el muro curvo sigue admitiendo únicamente cristal.
  const ventContenido = m.ventContenido ?? 'ventana'
  // Foto del cuadro: misma tabla de imágenes por muro, con el roomId centinela de los libres.
  const ventFoto = useDiseño((s) =>
    ventContenido === 'cuadro' && m.id != null
      ? s.roomMuroImagenes[`${MURO_LIBRE_ROOM}::${claveImagenMuroLibre(m.id, 'cuadro')}`]
      : undefined,
  )
  // Imagen de la hoja de la puerta (foto subida o generada con IA).
  const fotoPuerta = useDiseño((s) =>
    m.puerta && m.id != null
      ? s.roomMuroImagenes[`${MURO_LIBRE_ROOM}::${claveImagenMuroLibre(m.id, 'puerta')}`]
      : undefined,
  )

  // Ventana / puerta. La ventana es cristal; la puerta es un hueco rectangular
  // con una hoja sólida animada (la forma cuadrada/círculo/triángulo es solo de ventana).
  const esPuerta = !!m.puerta
  const esVentana = !!m.ventana && !esPuerta
  const conHueco = esPuerta || esVentana
  const huecoForma = esPuerta ? 'cuadrado' : (m.ventForma ?? 'cuadrado')
  const ventPosXF = m.ventPosX ?? 0
  const ventRotF = m.ventRot ?? 0
  const ventAltoF = esPuerta ? (m.puertaAlto ?? 0.85) : (m.ventAlto ?? 0.5)
  const ventPosYF = esPuerta ? ventAltoF / 2 : (m.ventPosY ?? 0.54)
  const ventAnchoF = esPuerta ? (m.puertaAncho ?? 0.5) : (m.ventAncho ?? 0.55)
  const ventColorF = esPuerta ? (m.puertaColor ?? '#b9824f') : (m.ventColor ?? '#bcdcff')
  // Remate del vano de la puerta (recto/arco/pico), sobre la hoja.
  const vanoFormaF: FormaVanoId = esPuerta ? ((m.puertaForma as FormaVanoId) ?? 'recta') : 'recta'
  // Datos de la hoja sólida de puerta (todos los tipos de muro).
  const ab = esPuerta ? aberturaMuroLibreMundo(m, gridCols, gridRows) : null
  const He = WALL_H * (m.alto ?? 1)
  const hojaAlto = He * (m.puertaAlto ?? 0.85)
  const puertaTipoF = m.puertaTipo ?? 'recta'
  // Remate para la hoja: mismo perfil que el hueco, acotado al alto del muro.
  const remateHoja: RemateHoja | undefined =
    esPuerta && vanoFormaF !== 'recta'
      ? {
          forma: vanoFormaF,
          extra: Math.min(
            WALL_H * (m.puertaFormaAlto ?? VANO_FORMA_ALTO_DEFAULT),
            Math.max(0, He * 0.98 - hojaAlto),
          ),
          ancho: m.puertaFormaAncho ?? 1,
          posX: m.puertaFormaPosX ?? 0,
        }
      : undefined
  // En preview, un nivel imposible evita que la hoja se abra por cercanía del avatar.
  const nivelPuerta = preview ? -9999 : m.nivel
  const hojaPuerta =
    esPuerta && ab && puertaTipoF !== 'sin' ? (
      <MuroLibrePuerta3D
        ab={ab}
        baseY={yBase}
        alto={hojaAlto}
        tipo={puertaTipoF}
        color={ventColorF}
        nivel={nivelPuerta}
        remate={remateHoja}
        fotoUrl={fotoPuerta}
      />
    ) : null

  // Muro circular: pared curva real con remate de arco/pico y, opcional, abertura.
  if (m.clase === 'forma' && m.forma === 'circular') {
    const centro = centroCeldaMundo(m.col, m.row, gridCols, gridRows)
    const arco = arcoCircularMuroLocal(m.rotacion ?? 0)
    return (
      <group>
        <MuroCurvo3D
          arcCx={centro.x + arco.cx}
          arcCz={centro.z + arco.cz}
          r={arco.r}
          a0={arco.a0}
          a1={arco.a1}
          baseY={yBase}
          alto={m.alto ?? 1}
          silueta={silueta}
          formaAlto={m.formaAlto}
          formaAncho={m.formaAncho}
          formaPosX={m.formaPosX}
          color={m.formaDividir ? (m.formaColor ?? color) : color}
          tipo={m.tipo}
          puerta={esPuerta}
          ventana={esVentana}
          aberturaAncho={ventAnchoF}
          aberturaColor={ventColorF}
          ventForma={huecoForma}
          aberturaPosX={ventPosXF}
          aberturaPosY={ventPosYF}
          aberturaAlto={ventAltoF}
          vanoForma={vanoFormaF}
          vanoFormaAlto={m.puertaFormaAlto}
          vanoFormaAncho={m.puertaFormaAncho ?? 1}
          vanoFormaPosX={m.puertaFormaPosX ?? 0}
          sinPanel={esPuerta}
        />
        {hojaPuerta}
      </group>
    )
  }

  // Aristas y diagonal del triángulo: muro recto con `MuroSegment`.
  const segs = segmentosMundoMuroLibre(m, gridCols, gridRows)
  return (
    <group>
      {segs.map((s, i) => {
        const dx = s.x2 - s.x1
        const dz = s.z2 - s.z1
        const largo = Math.hypot(dx, dz)
        const mx = (s.x1 + s.x2) / 2
        const mz = (s.z1 + s.z2) / 2
        const rotY = Math.atan2(-dz, dx)
        return (
          // muroLibreSeg: índice del segmento para el raycast del grafiti (buscarMuro).
          <group key={i} position={[mx, 0, mz]} rotation={[0, rotY, 0]} userData={{ muroLibreSeg: i }}>
            <MuroSegment
              cx={0}
              cz={0}
              sx={largo}
              sz={WALL_T}
              exterior={false}
              tipoMuro={(m.tipo as TipoMuroId) ?? 'solido'}
              colorMuro={color}
              alto={m.alto ?? 1}
              forma={silueta as FormaMuroId}
              formaAlto={m.formaAlto}
              formaAncho={m.formaAncho}
              formaPosX={m.formaPosX}
              formaDividir={m.formaDividir}
              formaColor={m.formaColor}
              ventana={conHueco}
              ventAncho={ventAnchoF}
              ventAlto={ventAltoF}
              ventPosY={ventPosYF}
              ventPosX={ventPosXF}
              ventRot={ventRotF}
              ventColor={ventColorF}
              ventForma={huecoForma}
              ventMosaico={m.ventMosaico}
              ventMulticolor={m.ventMulticolor}
              ventContenido={esPuerta ? 'ventana' : ventContenido}
              ventCara={m.ventCara}
              ventFoto={ventFoto}
              huecoSinCristal={esPuerta}
              vanoForma={vanoFormaF}
              vanoFormaAlto={m.puertaFormaAlto}
              vanoFormaAncho={m.puertaFormaAncho ?? 1}
              vanoFormaPosX={m.puertaFormaPosX ?? 0}
              yBase={yBase}
              baseColor={color}
              extColor={color}
              roughness={0.7}
              extRough={0.85}
              metalness={0}
              emissive="#000000"
              emissiveInt={0}
              atenuado={false}
              marcoVentana="#5a5249"
              cristal="#bcdcff"
            />
            {!esPuerta && m.id != null && (
              <GrafitisMuroLibre muroLibreId={m.id} seg={i} largo={largo} alto={m.alto} yBase={yBase} />
            )}
          </group>
        )
      })}
      {hojaPuerta}
    </group>
  )
}
