import { memo, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useHouse } from '../state/houseStore'
import { useDiseño, objetosDeCuartoIdx } from '../state/disenoStore'
import { useCam } from '../state/cameraStore'
import { playerPos } from '../state/playerPosition'
import { useLayout } from '../state/layoutStore'
import { puedeMoverCuartoRegistro } from './planoGeometria'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { useMapaTablas } from '../state/mapaTablasStore'
import type { ObjetoCuarto, PisoExteriorCelda } from '../data/db'
import { ocupadoConZonas } from './planoGeometria'
import {
  roomWallSegments,
  roomDoorways,
  alturaTechoDeSegs,
  footprintBounds,
  footprintBoundsRect,
  tileLocalEnCuarto,
  cellLocalRect,
  centroRelativo,
  cellId,
  tileOcupado,
  nivelBaseY,
  centroCuarto3D,
  huecosAscensos,
  WALL_H,
  WALL_T,
  SIZE,
  HALF,
  FOOTPRINT_DEFAULT,
  type Vano,
  type SideKey,
  type Cell,
} from './walls'
import { ObjetoView, altoDeTipo } from './catalogo'
import { GrupoAnimado } from './Animado'
import { esMueblePrincipal } from './muebles'
import { colorConTema, mezclar } from './temas'
import { useTemaActivo } from './useTema'
import { TemaContext } from './primitivas'
import { useInteractUi } from '../state/interactUiStore'
import { MarcadorEntrada } from './marcadorEntrada'
import { MuroSegment } from './MuroRender'
import { PisoCelda } from './PisoCelda'
import { PisoCuadrantes3D } from './PisoCuadrantes3D'
import { colorExteriorDefecto } from './PisosExterior3D'
import { CUADRANTES_OFF, cuadrantesDeCelda, matDeRegistroPiso, type MatPiso } from './pisoSubcelda'
import { useBlobUrlMap } from './useBlobUrlMap'
import { getPisoTipo, esSinPiso } from './pisos'
import { PINCELES_DEFAULT, VANO_FORMA_ALTO_DEFAULT } from './murosPuertas'
import { ALTURA_CARGA_OBJETO } from '../state/cargarStore'
import type { TipoPuertaId } from './murosPuertas'
import {
  ABRE_ANG,
  PUERTA_ALTO,
  PUERTA_BASE_Y,
  PUERTA_GROSOR,
  hojasDeAbertura,
  HojaPuertaMesh,
  MaterialHoja,
  MontanteVanoMesh,
  type Hoja,
  type RemateHoja,
} from './puertaHojas'
import { TechoLoseta } from './TechoLoseta'
import { TechoForma } from './TechoForma'
import { TechoCeldaNoCuadrada } from './TechoCeldaNoCuadrada'
import { TECHO_PARAMS_DEFAULT } from './techos'
import { offsetsTecho, techoExtraDeOtroEnCelda } from './techoCeldas'
import {
  claveCeldaOff,
  formaEnCelda,
  esFormaCuadrada,
  subformasDeCelda,
  type CeldaFormaLoseta,
  type HuecoLosa,
} from './formasLoseta'
import { filtrarSegmentosPorForma } from './murosPerimetroLoseta'
import { MurosPerimetroFormaCuarto } from './MurosPerimetroFormaCuarto'
import { AguaCuarto } from './AguaCuarto'
import { ComplementoPisoSotano } from './ComplementoPisoSotano'
import { consumirClicMuro } from './PlanoMuroSelector3D'
import { GrafitisMuroCuarto } from './grafiti'

function tint(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt))
  const b = Math.min(255, Math.max(0, (n & 255) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

/** Colores fijos de fachada: no siguen el tema, son materiales "reales". */
const PORTON_COLOR = '#b8c4cc'
const PUERTA_COLOR = '#3b1e09'

/** Hojas batientes del vano del cuarto (delega en la geometría común de hojas). */
function hojasDeVano(v: Vano): Hoja[] {
  return hojasDeAbertura(
    v.cx,
    v.cz,
    v.horizontal ? 1 : 0,
    v.horizontal ? 0 : 1,
    v.ancho,
    v.nx,
    v.nz,
    v.tipo === 'porton',
  )
}

/**
 * Puerta o portón de fachada con apertura animada:
 * - Portón ('abierto'): panel plateado que **sube** (garage-door) al acercarse el avatar.
 * - Puerta: hoja café oscuro que **gira** hacia el interior del cuarto.
 * Decorativas: no añaden colisión.
 */
function VanoFachada({
  vano,
  roomPos,
  marco,
  nivel,
  fotoPuerta,
}: {
  vano: Vano
  roomPos: [number, number, number]
  marco: string
  /** Nivel del cuarto: la hoja se abre cuando el avatar está en ese piso. */
  nivel: number
  /** Imagen de la hoja (object-URL): foto subida o generada con IA. */
  fotoPuerta?: string
}) {
  const portonRef = useRef<THREE.Mesh | null>(null)
  const correderaRef = useRef<THREE.Group | null>(null)
  const hojasRefs = useRef<(THREE.Group | null)[]>([])
  /** Grupo de tablones del estilo de puerta "Portón" (distinto de `portonRef`, que es el tipo de MURO abierto). */
  const portonHojaRef = useRef<THREE.Group | null>(null)
  const hojas = useMemo(() => {
    if (vano.tipo !== 'puerta') return []
    const tp = vano.tipoPuerta ?? 'recta'
    if (tp === 'doble') {
      return hojasDeVano({ ...vano, tipo: 'porton', ancho: vano.ancho })
    }
    return hojasDeVano(vano)
  }, [vano])
  const apertura = useRef(0)
  const umbral = vano.tipo === 'porton' ? 3 : 2.4
  // Altura del muro de la arista y de la hoja (factor del muro, hasta su tope).
  const He = WALL_H * (vano.altoMuro ?? 1)
  // Relativo al alto del muro (como en MurosLibres3D/MurosPerimetroFormaCuarto): así la
  // hoja crece con el muro en vez de quedarse fija en PUERTA_ALTO al superar WALL_H.
  const hAlto = He * (vano.alto ?? 0.97)
  const tipoPuerta: TipoPuertaId = vano.tipoPuerta ?? 'recta'
  const colorPuerta = vano.colorPuerta ?? PUERTA_COLOR
  const ax = vano.horizontal ? 1 : 0
  const az = vano.horizontal ? 0 : 1
  const half = vano.ancho / 2
  // Remate del vano (arco/pico): la hoja lo integra (batientes) o lo llena un
  // montante fijo (corredera/portón). Mismo clamp que el hueco del dintel.
  const remate: RemateHoja | undefined =
    vano.tipo === 'puerta' && vano.vanoForma && vano.vanoForma !== 'recta'
      ? {
          forma: vano.vanoForma,
          extra: Math.min(
            WALL_H * (vano.vanoFormaAlto ?? VANO_FORMA_ALTO_DEFAULT),
            Math.max(0, He - hAlto - 0.02),
          ),
          ancho: vano.vanoFormaAncho ?? 1,
          posX: vano.vanoFormaPosX ?? 0,
        }
      : undefined

  // Con la hoja en reposo la cercanía se sondea ~6 veces/s (hay un VanoFachada
  // por puerta de CADA cuarto: el hypot+lerp de todos cada frame sumaba en
  // móviles). El primer frame corre siempre para aplicar la pose cerrada.
  const accVano = useRef(1)
  useFrame((_st3f, delta) => {
    if (apertura.current === 0) {
      accVano.current += delta
      if (accVano.current < 0.15) return
      accVano.current = 0
    }
    const wx = roomPos[0] + vano.cx
    const wz = roomPos[2] + vano.cz
    const lvl = useHouse.getState().playerLevel
    const cerca = lvl === nivel && Math.hypot(playerPos.x - wx, playerPos.z - wz) < umbral
    apertura.current = THREE.MathUtils.lerp(apertura.current, cerca ? 1 : 0, 0.18)
    // Corte a 0 exacto: permite saltarse el trabajo con la puerta cerrada.
    if (!cerca && apertura.current < 0.004) apertura.current = 0
    const a = apertura.current

    if (vano.tipo === 'porton') {
      if (portonRef.current) {
        const closedY = PUERTA_BASE_Y + PUERTA_ALTO / 2
        const openY = WALL_H + PUERTA_ALTO / 2
        portonRef.current.position.y = THREE.MathUtils.lerp(closedY, openY, a)
      }
    } else if (tipoPuerta === 'corredera') {
      const g = correderaRef.current
      if (g) {
        // No deslizar más de lo que hay de muro disponible a un lado (si no, se sale del cuarto).
        const margenDisp = Math.max(0, (SIZE - vano.ancho) / 2 - 0.05)
        const slide = Math.min(vano.ancho * 0.55, margenDisp) * a
        g.position.set(vano.cx + ax * slide, 0, vano.cz + az * slide)
      }
    } else if (tipoPuerta === 'porton') {
      // Estilo "Portón" de puerta en muro recto: sube como cortina (igual que MuroLibrePuerta3D).
      const g = portonHojaRef.current
      if (g) g.position.y = THREE.MathUtils.lerp(0, hAlto * 0.96, a)
    } else {
      for (let i = 0; i < hojas.length; i++) {
        const g = hojasRefs.current[i]
        if (g) g.rotation.y = hojas[i].closedYaw + hojas[i].signo * ABRE_ANG * a
      }
    }
  })

  return (
    <group>
      {/* Portón (abierto/garage): no hay muro, así que lleva su propio marco perimetral. */}
      {vano.tipo === 'porton' && (
        <mesh position={[vano.cx, WALL_H - 0.11, vano.cz]} castShadow receiveShadow>
          <boxGeometry
            args={vano.horizontal ? [vano.ancho + 0.1, 0.22, WALL_T] : [WALL_T, 0.22, vano.ancho + 0.1]}
          />
          <meshStandardMaterial color={marco} roughness={0.7} metalness={0.1} />
        </mesh>
      )}

      {vano.tipo === 'porton' &&
        [-1, 1].map((s) => (
          <mesh
            key={s}
            position={[vano.cx + ax * half * s, WALL_H / 2, vano.cz + az * half * s]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[WALL_T * 0.9, WALL_H, WALL_T * 0.9]} />
            <meshStandardMaterial color={marco} roughness={0.7} metalness={0.1} />
          </mesh>
        ))}

      {vano.tipo === 'porton' && (
        <mesh
          ref={portonRef}
          position={[vano.cx, PUERTA_BASE_Y + PUERTA_ALTO / 2, vano.cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={
              vano.horizontal
                ? [vano.ancho - 0.06, PUERTA_ALTO, PUERTA_GROSOR]
                : [PUERTA_GROSOR, PUERTA_ALTO, vano.ancho - 0.06]
            }
          />
          <meshStandardMaterial color={PORTON_COLOR} roughness={0.25} metalness={0.7} />
        </mesh>
      )}

      {/* Montante fijo del remate (corredera y portón de láminas): tapa el arco/pico
          del vano mientras la hoja rectangular se mueve por debajo. */}
      {vano.tipo === 'puerta' && (tipoPuerta === 'corredera' || tipoPuerta === 'porton') && remate && (
        <group
          position={[vano.cx, hAlto, vano.cz]}
          rotation={[0, vano.horizontal ? 0 : -Math.PI / 2, 0]}
        >
          <MontanteVanoMesh ancho={vano.ancho} remate={remate} color={colorPuerta} />
        </group>
      )}

      {vano.tipo === 'puerta' && tipoPuerta === 'corredera' && (
        <group ref={correderaRef} position={[vano.cx, 0, vano.cz]}>
          <mesh position={[0, PUERTA_BASE_Y + hAlto / 2, 0]} castShadow receiveShadow>
            <boxGeometry
              args={
                vano.horizontal
                  ? [vano.ancho - 0.1, hAlto, PUERTA_GROSOR]
                  : [PUERTA_GROSOR, hAlto, vano.ancho - 0.1]
              }
            />
            <MaterialHoja color={colorPuerta} fotoUrl={fotoPuerta} roughness={0.35} metalness={0.4} />
          </mesh>
        </group>
      )}

      {vano.tipo === 'puerta' && tipoPuerta === 'porton' && (
        <group ref={portonHojaRef}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh
              key={i}
              position={[
                vano.cx,
                PUERTA_BASE_Y + 0.35 + i * (hAlto / 5),
                vano.cz,
              ]}
              castShadow
            >
              <boxGeometry
                args={
                  vano.horizontal
                    ? [vano.ancho - 0.08, hAlto / 5 - 0.06, PUERTA_GROSOR]
                    : [PUERTA_GROSOR, hAlto / 5 - 0.06, vano.ancho - 0.08]
                }
              />
              <meshStandardMaterial color={colorPuerta} roughness={0.3} metalness={0.65} />
            </mesh>
          ))}
        </group>
      )}

      {vano.tipo === 'puerta' &&
        (tipoPuerta === 'recta' || tipoPuerta === 'doble') &&
        hojas.map((h, i) => (
          <group
            key={i}
            ref={(el) => { hojasRefs.current[i] = el }}
            position={[h.hingeX, 0, h.hingeZ]}
            rotation={[0, h.closedYaw, 0]}
          >
            <HojaPuertaMesh
              width={h.width}
              color={colorPuerta}
              alto={hAlto}
              remate={remate}
              un0={tipoPuerta === 'doble' ? (i === 0 ? -1 : 1) : -1}
              un1={tipoPuerta === 'doble' ? 0 : 1}
              fotoUrl={fotoPuerta}
            />
          </group>
        ))}
    </group>
  )
}

/** Un objeto colocado en el cuarto. Memoizado: al arrastrar uno, los demás no se re-renderizan. */
const ObjetoEnCuarto = memo(function ObjetoEnCuarto({
  o,
  roomId,
  nivel,
  W,
  H,
  drag,
  editable,
  puedeAbrirApp,
  moverObjetosEste,
  conAnillo,
}: {
  o: ObjetoCuarto
  roomId: string
  nivel: number
  W: number
  H: number
  /** Este objeto se está arrastrando (flota un poco). */
  drag: boolean
  /** Arrastrable/seleccionable (ver `objetosEditables` en ObjetosCuarto). */
  editable: boolean
  /** Fuera de todo modo de edición: tocar el objeto principal abre su app. */
  puedeAbrirApp: boolean
  /** Modo "mover objetos" de ESTE cuarto. */
  moverObjetosEste: boolean
  /** Aro celeste del objeto seleccionado en "mover objetos". */
  conAnillo: boolean
}) {
  const setObjetoSel = useEditorUi((s) => s.setObjetoSel)
  const setTab = useEditorUi((s) => s.setTab)
  const startObjetoDrag = useDiseño((s) => s.startObjetoDrag)
  const arrastreElevado = useDiseño((s) => s.arrastreElevado)
  const selectMueble = useInteractUi((s) => s.selectMueble)
  // Posición por ranura de decoración (esquinas de la caja contenedora) si no tiene x/z.
  const ox = o.x ?? (o.slot % 2 === 0 ? -1 : 1) * (W / 2 - 1.4)
  const oz = o.z ?? (o.slot < 2 ? -1 : 1) * (H / 2 - 1.4)
  const D = Math.PI / 180
  const esPrincipal = esMueblePrincipal(o)
  const alturaDrag = drag ? (arrastreElevado ? ALTURA_CARGA_OBJETO : 0.6) : 0.2
  return (
    <group
      position={[ox, alturaDrag + (o.y ?? 0), oz]}
      rotation={[(o.rotX ?? 0) * D, (o.rotY ?? 0) * D, (o.rotZ ?? 0) * D]}
      scale={o.escala ?? 1}
      onClick={
        // Con el atajo de construcción o el modo "mover objetos" activo, el objeto
        // principal no abre la app (se está arrastrando, no entrando).
        puedeAbrirApp && esPrincipal
          ? (e) => {
              e.stopPropagation()
              selectMueble(roomId)
            }
          : // En "mover objetos" hay que frenar el clic aquí: si no, sigue de largo
            // hasta el piso (`onFloorClick`) y su deselección deshace la selección
            // que el propio pointerdown de este objeto acaba de hacer.
            moverObjetosEste
            ? (e) => e.stopPropagation()
            : undefined
      }
      onPointerDown={
        editable
          ? (e) => {
              e.stopPropagation()
              if (o.id != null) {
                // En el editor 3D abre el panel de Objetos con este objeto.
                if (useEditorUi.getState().editor3d) setTab('objetos')
                setObjetoSel(o.id)
                startObjetoDrag(o.id)
              }
            }
          : undefined
      }
      onPointerOver={(e) => {
        e.stopPropagation()
        if (editable) document.body.style.cursor = 'grab'
        else if (!useLayout.getState().editMode && esPrincipal)
          document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (!useDiseño.getState().draggingObjeto && !useLayout.getState().editMode)
          document.body.style.cursor = 'default'
      }}
    >
      {/* Modo "mover objetos": aro celeste FLOTANDO sobre el objeto seleccionado (no
          bajo él: en la vista de planta, el propio mueble taparía un aro a ras de
          piso). Misma altura de referencia que `MarcadorEntrada`. */}
      {conAnillo && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, altoDeTipo(o.tipo) + 0.35, 0]}>
          <ringGeometry args={[0.35, 0.5, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <GrupoAnimado anim={o.animacion} nivel={nivel} objetoId={o.id}>
        <ObjetoView
          tipo={o.tipo}
          color={o.color}
          piezas={o.piezas}
          modeloGlb={o.modeloGlb}
          foto={o.foto}
          texto={o.texto}
          anim={o.animacion}
          nivelAnim={nivel}
          objetoId={o.id}
          fx={o.fx}
          grupoAccion={o.grupoAccion}
        />
      </GrupoAnimado>
      {esPrincipal && <MarcadorEntrada y={altoDeTipo(o.tipo) + 0.45} />}
    </group>
  )
})

/**
 * Objetos (mueble + decoración) del cuarto, con suscripción propia POR roomId: mover un
 * objeto re-renderiza solo este componente en su cuarto (y el objeto movido), no la
 * estructura del cuarto ni el resto de la casa. El tema re-viste sus primitivas vía
 * TemaContext.
 */
const ObjetosCuarto = memo(function ObjetosCuarto({
  id,
  nivel,
  W,
  H,
  preview,
}: {
  id: string
  nivel: number
  W: number
  H: number
  preview: boolean
}) {
  const objetosCuarto = useDiseño((s) => objetosDeCuartoIdx(s.objetos, id))
  const draggingObjeto = useDiseño((s) => s.draggingObjeto)
  const tema = useTemaActivo()
  const { editMode, editingRoomId, moverObjetosEste, moverObjetosActivo } = useLayout(
    useShallow((s) => ({
      editMode: s.editMode,
      editingRoomId: s.editingRoomId,
      moverObjetosEste: s.moverObjetosRoomId === id,
      moverObjetosActivo: s.moverObjetosRoomId != null,
    })),
  )
  const { editorTab, editor3d, inventarioObjetosActivo, objetoSel } = useEditorUi(
    useShallow((s) => ({
      editorTab: s.tab,
      editor3d: s.editor3d,
      inventarioObjetosActivo: s.inventarioObjetosActivo,
      objetoSel: s.objetoSel,
    })),
  )
  const planosActivo = usePlanos((s) => s.activo)
  if (objetosCuarto.length === 0) return null
  // Objetos arrastrables/seleccionables: al editar este cuarto o en la pestaña Objetos
  // del editor de mapa, con el editor 3D activo (en 3ª/1ª persona), o en el modo "mover
  // objetos" de este cuarto (editor cerrado, arrastre directo en el mapa).
  const objetosEditables =
    !preview &&
    (editor3d ||
      (editMode && (editingRoomId === id || (!editingRoomId && editorTab === 'objetos'))) ||
      inventarioObjetosActivo ||
      moverObjetosEste)
  // Fuera de todo modo de edición/construcción, tocar el objeto principal abre su app.
  const puedeAbrirApp =
    !editMode && !editor3d && !inventarioObjetosActivo && !planosActivo && !preview && !moverObjetosActivo
  return (
    <TemaContext.Provider value={tema}>
      {objetosCuarto.map((o) => (
        <ObjetoEnCuarto
          key={o.id}
          o={o}
          roomId={id}
          nivel={nivel}
          W={W}
          H={H}
          drag={draggingObjeto === o.id}
          editable={objetosEditables}
          puedeAbrirApp={puedeAbrirApp}
          moverObjetosEste={moverObjetosEste}
          conAnillo={moverObjetosEste && o.id === objetoSel}
        />
      ))}
    </TemaContext.Provider>
  )
})

/**
 * Estructura 3D de un cuarto estilo Roblox: piso por celda (forma libre), paredes
 * chunky con puertas (de walls.ts), mueble temático y decoración. Cuando `atenuado`
 * (editando OTRO cuarto), se dibuja translúcido y sin interacción ni objetos.
 */
export function Room3D({
  id,
  position,
  color,
  atenuado = false,
  preview = false,
  interactivo = false,
  sinObjetos = false,
  forzarTecho,
  resaltadoPlano = false,
}: {
  id: string
  position: [number, number, number]
  color: string
  atenuado?: boolean
  /** Modo vista previa (editor): render completo pero sin interacción de juego/edición. */
  preview?: boolean
  /** Preview interactivo (editor de mapa): tocar piso/muros/puertas/techo selecciona ese elemento. */
  interactivo?: boolean
  /** Oculta los objetos (mueble + decoración) del cuarto: solo la estructura. */
  sinObjetos?: boolean
  /** Fuerza el techo visible/oculto en preview (ignora el toggle global 🏠). */
  forzarTecho?: boolean
  /** Resaltado desde el editor de planos (sync plano ↔ 3D). */
  resaltadoPlano?: boolean
}) {
  // Colecciones de TODOS los cuartos (solo cambian al editar el mapa): una sola suscripción.
  const { ocupadoPorNivel, niveles, placed, cells, footprints, formasCeldaTodos } = useLayout(
    useShallow((s) => ({
      ocupadoPorNivel: s.ocupadoPorNivel,
      niveles: s.niveles,
      placed: s.placed,
      cells: s.cells,
      footprints: s.footprints,
      formasCeldaTodos: s.formasCelda,
    })),
  )
  // Datos de ESTE cuarto + banderas de edición: referencias estables si no se toca este cuarto.
  const {
    // Espacio abierto (jardín): sin muros, portones ni techo — solo piso y objetos.
    sinMuros,
    // Alberca (sótano lleno de agua): lámina animada y nunca lleva techo.
    conAgua,
    overrides,
    edgeStyles,
    pinceles,
    formasCeldaLayout,
    editMode,
    editingRoomId,
    moverObjetosRoomId,
  } = useLayout(
    useShallow((s) => ({
      sinMuros: s.sinMuros[id] ?? false,
      conAgua: s.conAgua[id] ?? false,
      overrides: s.wallOverrides[id],
      edgeStyles: s.edgeStyles[id],
      pinceles: s.pinceles[id] ?? PINCELES_DEFAULT,
      formasCeldaLayout: s.formasCelda[id],
      editMode: s.editMode,
      editingRoomId: s.editingRoomId,
      moverObjetosRoomId: s.moverObjetosRoomId,
    })),
  )
  // Ascensos: perforan la losa que atraviesan (piso propio o techo del nivel de abajo).
  const accesos = useLayout((s) => s.accesos)
  // Arrastre de cuartos acotado a ESTE cuarto: mover OTRO cuarto no re-renderiza este.
  const arrastrando = useLayout((s) => s.draggingId === id)
  const previewCellEste = useLayout((s) => (s.draggingId === id ? s.previewCell : null))
  const dragOriginCell = useLayout((s) => (s.draggingId === id ? s.dragOriginCell : null))
  const startDrag = useLayout((s) => s.startDrag)
  const { editorTab, editor3d } = useEditorUi(
    useShallow((s) => ({ editorTab: s.tab, editor3d: s.editor3d })),
  )
  const setObjetoSel = useEditorUi((s) => s.setObjetoSel)
  const setTab = useEditorUi((s) => s.setTab)
  const { planosActivo, planosCapa, planosHerramienta } = usePlanos(
    useShallow((s) => ({ planosActivo: s.activo, planosCapa: s.capa, planosHerramienta: s.herramienta })),
  )
  const setSeleccionPlano = usePlanos((s) => s.setSeleccion)
  const setModoPlano = usePlanos((s) => s.setModo)
  // Selección/hover de aristas acotados: los de OTROS cuartos no re-renderizan este.
  const seleccionPlano = usePlanos((s) =>
    s.seleccion && 'roomId' in s.seleccion && s.seleccion.roomId === id ? s.seleccion : null,
  )
  const muroSelHover = usePlanos((s) =>
    s.muroSelHover && 'roomId' in s.muroSelHover && s.muroSelHover.roomId === id ? s.muroSelHover : null,
  )

  const fp = footprints[id] ?? FOOTPRINT_DEFAULT
  const nivel = niveles[id] ?? 0
  const anchorCell = arrastrando && previewCellEste ? previewCellEste : cells[id]
  const zonas = useMapaTablas((s) => s.zonas)
  const ocupado = useMemo(
    () => ocupadoConZonas(nivel, ocupadoPorNivel, zonas),
    [nivel, ocupadoPorNivel, zonas],
  )
  const bounds = footprintBounds(fp)
  const boundsFpRect = footprintBoundsRect(fp)
  const W = bounds.w * SIZE
  const H = bounds.h * SIZE
  const formasEfectivas = useMemo(() => formasCeldaLayout ?? {}, [formasCeldaLayout])
  // Recortes finos (rejilla fina) por celda: referencia estable para no regenerar geometría.
  const subformasPorCelda = useMemo(() => {
    const m = new Map<string, (CeldaFormaLoseta | undefined)[] | null>()
    for (const off of fp) {
      m.set(claveCeldaOff(off.col, off.row), subformasDeCelda(formasEfectivas, off.col, off.row))
    }
    return m
  }, [fp, formasEfectivas])
  const segs = useMemo(() => {
    if (!anchorCell || sinMuros) return []
    const raw = roomWallSegments(anchorCell, fp, ocupado, overrides, edgeStyles, pinceles, formasEfectivas)
    return filtrarSegmentosPorForma(raw, formasEfectivas)
  }, [anchorCell, sinMuros, fp, ocupado, overrides, edgeStyles, pinceles, formasEfectivas])
  // Cuerpos por arista: solo las aristas de UN cuerpo llevan grafiti (una puerta la parte en 2).
  const cuerposGrafiti = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of segs) {
      if (s.clave && !s.alturaM && !s.yBase) m.set(s.clave, (m.get(s.clave) ?? 0) + 1)
    }
    return m
  }, [segs])
  const vanos = useMemo(() => {
    if (!anchorCell || sinMuros) return []
    return roomDoorways(anchorCell, fp, ocupado, overrides, edgeStyles, pinceles, formasEfectivas)
  }, [anchorCell, sinMuros, fp, ocupado, overrides, edgeStyles, pinceles, formasEfectivas])
  // El techo se apoya en el muro más alto del cuarto (no en una altura fija).
  const alturaTecho = alturaTechoDeSegs(segs)
  const conTechoGlobal = useHouse((s) => s.conTecho)
  const apilado = !useHouse((s) => s.explotado)
  // Alberca: sótano con agua — abierta por definición (nunca se tapa con techo).
  const esAlberca = conAgua && nivel < 0
  // El espacio abierto (jardín) y la alberca nunca llevan techo, aunque la casa lo active.
  const conTecho = (forzarTecho ?? conTechoGlobal) && !sinMuros && !esAlberca
  /**
   * El cuarto flota en el aire (piso alto con la casa explotada): no se apoya en nada, así
   * que fuera de su silueta no hay "exterior" que mostrar. Lo usa el relleno de las celdas
   * con figura: si se dibujara flotando, taparía los recortes y el cuarto se vería cuadrado.
   */
  const flotando = nivel > 0 && !apilado
  // Tema global: reemplaza las texturas del shell (muros/piso/techo) por las del
  // tema (hoja 4 del Excel), mezclándolas con el color del cuarto para conservar
  // su identidad. Sin tema, se usa el color del cuarto con tintes relativos.
  const temaGlobalRaw = useDiseño((s) => s.temaGlobal)
  const tema = useTemaActivo()
  // Techos y muros: registros completos (se consultan también por el cuarto de abajo y
  // vecinos), agrupados en una sola suscripción; solo cambian al editar techos/muros.
  const {
    techoTipoGlobal,
    roomTechoTipos,
    roomTechoFormas,
    roomTechoParams,
    roomTechoFormasCelda,
    roomTechoColors,
    roomTechoImagenes,
    roomTechoImagenActiva,
    roomTechoImagenAjuste,
    roomMuroImagenes,
    roomMuroImagenActiva,
    roomMuroImagenAjuste,
    roomTechoExtraAll,
  } = useDiseño(
    useShallow((s) => ({
      techoTipoGlobal: s.techoTipo,
      roomTechoTipos: s.roomTechoTipos,
      roomTechoFormas: s.roomTechoFormas,
      roomTechoParams: s.roomTechoParams,
      roomTechoFormasCelda: s.roomTechoFormasCelda,
      roomTechoColors: s.roomTechoColors,
      roomTechoImagenes: s.roomTechoImagenes,
      roomTechoImagenActiva: s.roomTechoImagenActiva,
      roomTechoImagenAjuste: s.roomTechoImagenAjuste,
      roomMuroImagenes: s.roomMuroImagenes,
      roomMuroImagenActiva: s.roomMuroImagenActiva,
      roomMuroImagenAjuste: s.roomMuroImagenAjuste,
      roomTechoExtraAll: s.roomTechoExtra,
    })),
  )
  const roomTechoExtra = roomTechoExtraAll[id] ?? []
  // Material del techo: override del cuarto si existe, si no el global de la casa.
  const techoTipo = id in roomTechoTipos ? roomTechoTipos[id] : techoTipoGlobal
  const techoTinte = roomTechoColors[id]
  const techoImagen = roomTechoImagenActiva[id] ? roomTechoImagenes[id] : undefined
  const techoImagenAjuste = roomTechoImagenAjuste[id] ?? 'x1'
  const techoFormaPropia = roomTechoFormas[id] ?? 'plano'
  const techoParamsPropia = roomTechoParams[id] ?? TECHO_PARAMS_DEFAULT

  // Techo: losa por celda (footprint + extensiones), con visibilidad por celda.
  const offsetsTechoAll = anchorCell ? offsetsTecho(anchorCell, fp, roomTechoExtra) : fp
  const boundsTechoRect = footprintBoundsRect(offsetsTechoAll)
  const Wt = boundsTechoRect.w * SIZE
  const Ht = boundsTechoRect.h * SIZE
  const [techoDx, techoDz] = centroRelativo(boundsFpRect, boundsTechoRect)
  const absDeOffset = (off: { col: number; row: number }) =>
    anchorCell
      ? { col: anchorCell.col + off.col, row: anchorCell.row + off.row }
      : { col: 0, row: 0 }
  const esCeldaFootprint = (off: { col: number; row: number }) =>
    fp.some((o) => o.col === off.col && o.row === off.row)

  /**
   * Poner techo = TODOS los cuartos reciben el suyo, también los que tienen otro encima:
   * el cuarto de arriba puede taparlos solo en parte (anclas a ½ celda, footprint distinto)
   * y entonces quedaban destapados. Apilado y bien cubierto, la losa queda escondida bajo el
   * piso de arriba (va 0.25 más abajo, no compite con él).
   */
  const celdaTechoVisible = (off: { col: number; row: number }) => {
    const abs = absDeOffset(off)
    if (techoExtraDeOtroEnCelda(abs, id, nivel, roomTechoExtraAll, placed, niveles)) return false
    // Extensiones solo sobre celdas con cuarto (no terrazas en vacío).
    if (!esCeldaFootprint(off) && !tileOcupado(ocupado, abs.col, abs.row)) return false
    return true
  }
  const offsetsTechoVisibles = offsetsTechoAll.filter(celdaTechoVisible)
  const hayTechoVisible = offsetsTechoVisibles.length > 0
  // Celdas absolutas con losa visible: para alinear el techo con los muros.
  const visibleAbsSet = new Set(
    offsetsTechoVisibles.map((o) => { const a = absDeOffset(o); return cellId(a.col, a.row) }),
  )
  // Rendija decorativa entre losas del mismo techo.
  const INSET_TECHO = 0.06
  /**
   * Margen del techo en un lado (desde el eje del muro): hacia la cara exterior
   * del muro en fachada (sin vecino), 0 al lindar con otro cuarto (se encuentran
   * en el eje sin solaparse) y rendija negativa entre losas del propio techo.
   */
  const margenLado = (off: { col: number; row: number }, dCol: number, dRow: number) => {
    const abs = absDeOffset(off)
    const kVec = cellId(abs.col + dCol, abs.row + dRow)
    if (visibleAbsSet.has(kVec)) return -INSET_TECHO // losa propia adyacente
    if (tileOcupado(ocupado, abs.col + dCol, abs.row + dRow)) return 0 // otro cuarto: encuentro en el eje
    return WALL_T / 2 // fachada: cubrir la cara exterior del muro
  }
  // Forma única (no plana): margen por lado de la caja contenedora. Solo se
  // extiende a la fachada si TODO el borde es fachada (si no, queda en el eje
  // para no solaparse con un cuarto vecino).
  const maxRowTecho = boundsTechoRect.minRow + boundsTechoRect.h - 1
  const maxColTecho = boundsTechoRect.minCol + boundsTechoRect.w - 1
  const ladoCajaFachada = (
    celdas: { col: number; row: number }[],
    dCol: number,
    dRow: number,
  ) =>
    celdas.length > 0 &&
    celdas.every((off) => {
      const abs = absDeOffset(off)
      const kVec = cellId(abs.col + dCol, abs.row + dRow)
      return !tileOcupado(ocupado, abs.col + dCol, abs.row + dRow) && !visibleAbsSet.has(kVec)
    })
  const margenCaja = {
    N: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.row === boundsTechoRect.minRow), 0, -1) ? WALL_T / 2 : 0,
    S: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.row === maxRowTecho), 0, 1) ? WALL_T / 2 : 0,
    O: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.col === boundsTechoRect.minCol), -1, 0) ? WALL_T / 2 : 0,
    E: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.col === maxColTecho), 1, 0) ? WALL_T / 2 : 0,
  }

  // Ascensos que atraviesan una losa de este cuarto: la estructura arranca abajo y remata
  // arriba, así que si su columna cae dentro del piso (losa del propio nivel) o del techo
  // (losa del nivel de encima) hay que perforar esa losa para que pase.
  const huecosAsc = useMemo(() => huecosAscensos(accesos), [accesos])
  const huecosDeLosa = useMemo(() => {
    const [gx, , gz] = anchorCell ? centroCuarto3D(anchorCell, fp) : [0, 0, 0]
    // Cache por losa: mantiene la identidad del array entre renders (los useMemo de la
    // geometría perforada dependen de ella).
    const cache = new Map<string, HuecoLosa[] | undefined>()
    return (lx: number, lz: number, nivelLosa: number): HuecoLosa[] | undefined => {
      if (!huecosAsc.length) return undefined
      const clave = `${nivelLosa}:${lx}:${lz}`
      if (cache.has(clave)) return cache.get(clave)
      const dentro = huecosAsc
        .filter(
          (h) =>
            h.nivel === nivelLosa &&
            Math.abs(h.x - gx - lx) < HALF + h.r &&
            Math.abs(h.z - gz - lz) < HALF + h.r,
        )
        .map((h) => ({ x: h.x - gx - lx, z: h.z - gz - lz, r: h.r }))
      const res = dentro.length ? dentro : undefined
      cache.set(clave, res)
      return res
    }
  }, [huecosAsc, anchorCell, fp])

  /** Cuarto colocado justo encima (+1) o debajo (−1) de este, en la misma ancla. */
  const idEnNivel = (delta: number): string | undefined =>
    Object.keys(placed).find(
      (rid) =>
        placed[rid] &&
        rid !== id &&
        (niveles[rid] ?? 0) === nivel + delta &&
        cells[rid]?.col === cells[id]?.col &&
        cells[rid]?.row === cells[id]?.row,
    )
  const idAbajo = nivel > 0 ? idEnNivel(-1) : undefined
  /**
   * Un piso no se puede asentar sobre una bóveda/cono: mientras haya un cuarto encima,
   * el techo de este SOLO puede ser plano. No se toca el dato — al borrar el piso de
   * arriba su forma vuelve sola.
   */
  const techoSoloPlano = idEnNivel(1) !== undefined
  /**
   * ¿Misma figura que el cuarto `otro`? Igual footprint e igual silueta por celda (formas
   * enteras y recortes finos). Una bóveda hecha para un cuarto redondo no encaja en uno
   * cuadrado, así que solo con la misma figura se hereda su techo.
   */
  const mismaFigura = (otro: string): boolean => {
    const fpOtro = footprints[otro] ?? FOOTPRINT_DEFAULT
    if (fpOtro.length !== fp.length) return false
    const claves = new Set(fp.map((o) => claveCeldaOff(o.col, o.row)))
    if (!fpOtro.every((o) => claves.has(claveCeldaOff(o.col, o.row)))) return false
    const sOtro = formasCeldaTodos[otro] ?? {}
    return [...new Set([...Object.keys(formasEfectivas), ...Object.keys(sOtro)])].every((k) => {
      const a = formasEfectivas[k]
      const b = sOtro[k]
      return (a?.forma ?? 'cuadrado') === (b?.forma ?? 'cuadrado') && (a?.rotacion ?? 0) === (b?.rotacion ?? 0)
    })
  }
  // Sin techo propio, se hereda el del cuarto de abajo (así la figura sube con el piso nuevo).
  const heredaDeAbajo = idAbajo !== undefined && mismaFigura(idAbajo) ? idAbajo : undefined
  const techoForma = techoSoloPlano
    ? 'plano'
    : id in roomTechoFormas
      ? techoFormaPropia
      : heredaDeAbajo
        ? (roomTechoFormas[heredaDeAbajo] ?? techoFormaPropia)
        : techoFormaPropia
  const techoParams = techoSoloPlano
    ? TECHO_PARAMS_DEFAULT
    : id in roomTechoParams
      ? techoParamsPropia
      : heredaDeAbajo
        ? (roomTechoParams[heredaDeAbajo] ?? techoParamsPropia)
        : techoParamsPropia

  // Fabricación de techo POR CELDA (rejilla): si el cuarto tiene formas de celda,
  // cada celda se dibuja con su propia forma (las no tocadas quedan planas). La figura
  // de un cuarto (cono, tienda…) vive aquí, así que también se hereda del de abajo.
  const techoCeldas = techoSoloPlano
    ? {}
    : (roomTechoFormasCelda[id] ?? (heredaDeAbajo ? roomTechoFormasCelda[heredaDeAbajo] : undefined) ?? {})
  const hayTechoPorCelda = Object.keys(techoCeldas).length > 0

  // Plano sin inclinación = losetas por celda; cualquier otra forma (o plano inclinado) = pieza única.
  const techoPlanoLosetas = techoForma === 'plano' && techoParams.inclinacion <= 0

  // Cuarto con figuras (celda entera triángulo/círculo o recortes finos): la pieza
  // única de caja W×H ignoraría la silueta, así que su forma de techo no plana se
  // fabrica celda a celda (cada celda aplica la forma sobre su propia silueta).
  const tieneFiguras = useMemo(
    () => Object.values(formasEfectivas).some((f) => f.forma !== 'cuadrado'),
    [formasEfectivas],
  )
  const formaGlobalPorCelda = !techoPlanoLosetas && tieneFiguras
  const techoPorCelda = hayTechoPorCelda || formaGlobalPorCelda

  // Dos aguas: si el muro del lado del hastial ya tiene forma "triángulo" lo
  // bastante ancha para cerrar todo ese lado, el muro hace de hastial (apoya
  // la silueta) y se omite la cara duplicada del techo (si no, dejaría un hueco).
  const ladoTieneForma = (lado: 'N' | 'S' | 'E' | 'O', forma: 'triangulo' | 'arco') => {
    const delLado = segs.filter((s) => s.clave?.endsWith(`,${lado}`) && s.alturaM == null)
    return (
      delLado.length > 0 &&
      delLado.every((s) => s.forma === forma && (forma !== 'triangulo' || (s.formaAncho ?? 0.32) >= 0.9))
    )
  }
  const aguasDir = ((techoParams.dir % 4) + 4) % 4
  const ridgeZ = aguasDir % 2 === 0 ? Wt >= Ht : !(Wt >= Ht)
  const esDosAguas = techoForma === 'dos_aguas' && techoParams.aguas === 2
  const esAbovedado = techoForma === 'abovedado'
  const ocultarHastialNeg = (esDosAguas || esAbovedado) && ladoTieneForma(ridgeZ ? 'N' : 'O', 'triangulo')
  const ocultarHastialPos = (esDosAguas || esAbovedado) && ladoTieneForma(ridgeZ ? 'S' : 'E', 'triangulo')
  const shell = tema?.shell
  // El color del cuarto es el color dominante en todas las superficies.
  // Con tema: el tema aporta variación sutil pero el color del cuarto siempre es mayoría.
  const baseColor = shell ? mezclar(color, shell.muroInt, 0.4) : colorConTema(color, tema)
  // Piso: solo los valores de ESTE cuarto (editar el piso de otro no re-renderiza este).
  const { tienePisoCustom, pisoTipoCuarto, pisoTinte, pisoImagen, pisoImagenAjuste, tienePisoExt, pisoExtTipo, pisoExtColor } =
    useDiseño(
      useShallow((s) => ({
        tienePisoCustom: id in s.roomPisoTipos,
        pisoTipoCuarto: s.roomPisoTipos[id],
        pisoTinte: s.roomPisoColors[id],
        // La imagen solo se muestra en 3D cuando está explícitamente activa
        pisoImagen: s.roomPisoImagenActiva[id] ? s.roomPisoImagenes[id] : undefined,
        pisoImagenAjuste: s.roomPisoImagenAjuste[id] ?? 'x1',
        tienePisoExt: id in s.roomPisoExtTipos,
        pisoExtTipo: s.roomPisoExtTipos[id],
        pisoExtColor: s.roomPisoExtColors[id],
      })),
    )
  const sinPiso = esSinPiso(pisoTipoCuarto)
  const pisoConfCuarto = pisoTipoCuarto && !sinPiso ? getPisoTipo(pisoTipoCuarto) : null
  let floorColor = shell ? mezclar(color, shell.piso, 0.3) : tint(baseColor, 35)
  if (tienePisoCustom) {
    const tinte = pisoTinte
    if (pisoConfCuarto?.textura) {
      // Textura siempre nativa (blanco = sin oscurecer). El tinte se aplica como
      // emisivo dentro de PisoCelda para teñir sin perder brillo ni detalle.
      floorColor = '#ffffff'
    } else if (pisoConfCuarto) {
      // Tipo sin textura: los procedurales (mosaico, ajedrez, grid neón) se dibujan aparte;
      // los planos (pasto rosa, niebla) usan su color del tipo, tintado si hay color elegido.
      floorColor = tinte ? mezclar(pisoConfCuarto.color, tinte, 0.6) : pisoConfCuarto.color
    } else {
      // Color sólido: el color elegido o el del cuarto.
      floorColor = tinte ?? color
    }
  }
  const floorRough = pisoConfCuarto?.roughness ?? 0.85
  const floorMetal = pisoConfCuarto?.metalness ?? 0
  const floorEmissiveMat = pisoConfCuarto?.emissive ?? '#000000'
  const floorEmissiveIntMat = pisoConfCuarto?.emissiveIntensity ?? 0
  const techoColor = shell ? mezclar(color, shell.techo, 0.35) : tint(baseColor, -25)
  const wallRough = tema?.roughness ?? 0.6
  const wallMetal = tema?.metalness ?? 0
  const wallEmissive = tema?.emissive ?? '#000000'
  const wallEmissiveInt = tema?.emissiveIntensity ?? 0
  // Fachada exterior: más oscura que el interior para distinguir el perímetro.
  const muroExtColor = shell ? mezclar(color, shell.muroExt, 0.4) : tint(baseColor, -28)
  const extRough = Math.min(1, wallRough + 0.2)
  // Ventanas (solo en fachada de pisos ≥ 1): marco oscuro + cristal celeste.
  const marcoColor = tint(baseColor, -55)
  const cristalColor = '#bcdcff'
  const setTarget = useHouse((s) => s.setTarget)
  const clearInteract = useInteractUi((s) => s.clear)
  // Booleanos acotados: seleccionar o acercarse a OTRO cuarto no re-renderiza este.
  const seleccionado = useHouse((s) => s.selectedRoomId === id)
  const cerca = useHouse((s) => s.nearRoomId === id)
  const celdaValida =
    !arrastrando ||
    !previewCellEste ||
    !cells[id] ||
    puedeMoverCuartoRegistro({
      roomId: id,
      origen: dragOriginCell ?? cells[id],
      preview: previewCellEste,
      fp,
      nivel,
      placed,
      cells,
      footprints,
      niveles,
      zonas: planosActivo ? zonas : [],
    })
  // Overrides de piso por cuadrante (sub-celdas, coords de ¼) que caen dentro del cuarto.
  const pisosOverride = useMapaTablas((s) => s.pisosExterior)
  // Overrides del nivel por coord (¼ = cuadrante; entera = relleno de celda con forma).
  const overrideMap = useMemo(() => {
    const m = new Map<string, (typeof pisosOverride)[0]>()
    for (const p of pisosOverride) {
      if ((p.nivel ?? 0) !== nivel) continue
      m.set(`${p.col},${p.row}`, p)
    }
    return m
  }, [pisosOverride, nivel])
  const overrideBlobs = useMemo(() => {
    if (!anchorCell) return []
    const out: { key: string; blob?: Blob; activa: boolean }[] = []
    const add = (k: string) => {
      const rec = overrideMap.get(k)
      out.push({ key: k, blob: rec?.pisoImagen, activa: !!(rec?.pisoImagenActiva && rec?.pisoImagen) })
    }
    for (const off of fp) {
      const ac = anchorCell.col + off.col
      const ar = anchorCell.row + off.row
      add(`${ac},${ar}`) // relleno de celda con forma
      for (const o of CUADRANTES_OFF) add(`${ac + o.dc},${ar + o.dr}`)
    }
    return out
  }, [anchorCell, fp, overrideMap])
  const overrideUrls = useBlobUrlMap(overrideBlobs)
  const colorJardin = colorExteriorDefecto(temaGlobalRaw)
  // Material del piso exterior de PLANTA BAJA que rodea el pozo (nivel 0): para pintar el
  // relleno (complemento) de un sótano con el MISMO suelo del mapa, no un color genérico.
  const pisoExt0Map = useMemo(() => {
    if (nivel >= 0) return null
    const m = new Map<string, (typeof pisosOverride)[0]>()
    for (const p of pisosOverride) {
      if ((p.nivel ?? 0) !== 0) continue
      m.set(`${p.col},${p.row}`, p)
    }
    return m
  }, [pisosOverride, nivel])
  const matPisoExtEn = (absCol: number, absRow: number): MatPiso => {
    const rec = pisoExt0Map?.get(`${Math.round(absCol)},${Math.round(absRow)}`)
    return rec
      ? matDeRegistroPiso(rec, undefined, colorJardin)
      : { sinPiso: false, color: colorJardin, roughness: 0.85, metalness: 0, pisoConf: null, pisoImagenAjuste: 'x1' }
  }
  // Piso EXTERIOR de las celdas con forma (el trozo fuera de la silueta): material propio
  // del cuarto si el usuario lo eligió; si no, jardín por defecto. Se edita aparte del interior.
  const pisoExtMat: MatPiso | null =
    tienePisoExt
      ? matDeRegistroPiso(
          {
            pisoTipo: pisoExtTipo,
            pisoColor: pisoExtColor,
          } as PisoExteriorCelda,
          undefined,
          colorJardin,
        )
      : null

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    // Editor 3D o preview interactivo: tocar el piso abre el editor de MAPA en modo
    // "Piso interior" y selecciona este cuarto (el panel muestra su editor de piso). Con una
    // capa YA activa, el clic no puede saltar a otra: en Cuartos solo selecciona (sin
    // cambiar de capa); en Pisos lo gestiona PlanoPisos3DController; en cualquier otra
    // (Paredes, Techos) el piso no le pertenece y el clic no hace nada.
    if (!atenuado && (interactivo || (editor3d && !preview))) {
      // Soltar tras arrastrar la cámara (OrbitControls) no cuenta como clic.
      if (e.delta > 6) return
      // Si el clic fue sobre un muro (lo gestionó PlanoMuroSelector3D), no abrir el piso.
      if (consumirClicMuro()) return
      if (!planosActivo) {
        e.stopPropagation()
        setTab('mapa')
        setModoPlano('piso-int')
        setSeleccionPlano({ tipo: 'cuarto', roomId: id })
      } else if (planosCapa === 'cuartos') {
        e.stopPropagation()
        setSeleccionPlano({ tipo: 'cuarto', roomId: id })
      }
      return
    }
    // Modo "mover objetos": tocar el piso (algo que no es un objeto) deselecciona, lo que
    // apaga las flechas de movimiento hasta volver a tocar un objeto.
    if (moverObjetosRoomId != null) {
      if (e.delta <= 6) setObjetoSel(null)
      return
    }
    // Con un modo de construcción activo (editor o atajo de la rueda), el tap construye,
    // no mueve al personaje.
    if (editMode || planosActivo || atenuado || preview) return
    // En 1ª/3ª persona el clic en el suelo no mueve (el arrastre gira la cámara).
    if (useCam.getState().vista !== 'iso') return
    e.stopPropagation()
    clearInteract()
    setTarget(e.point.x, e.point.z)
  }
  // Mover cuartos en Editar mapa, o en Planos con herramienta Mover.
  const planosMover =
    planosActivo && planosCapa === 'cuartos' && planosHerramienta === 'mover'
  const planosEditarForma =
    planosActivo && planosCapa === 'cuartos' && planosHerramienta === 'editar-forma'
  // En el editor completo (tab Mapa) se puede mover libremente o con la herramienta Mover
  // de planos; con el atajo de construcción (sin editMode) solo cuando planosMover está
  // activo (equipar 'construir' + modo Cuartos + botón Mover del panel).
  const puedeMoverCuarto =
    !editor3d && !editingRoomId && !atenuado && !preview &&
    (editMode ? editorTab === 'mapa' && (!planosActivo || planosMover) : planosMover)
  const onFloorDown = (e: ThreeEvent<PointerEvent>) => {
    if (!puedeMoverCuarto) return
    e.stopPropagation()
    if (planosMover) setSeleccionPlano({ tipo: 'cuarto', roomId: id })
    startDrag(id)
  }
  // Editor 3D (sin capa activa aún) o preview interactivo: tocar un muro abre el editor de
  // MAPA en el modo del elemento (ventana si el muro tiene ventana, si no muros) y
  // selecciona esa arista. Con una capa YA activa, cada una es dueña de sus propios clics:
  // en Paredes lo gestiona PlanoMuroSelector3D (raycast por la malla, válido para muros
  // rectos, circulares y triangulares); en cualquier otra capa el muro no le pertenece y
  // el clic no hace nada (no puede saltar de capa).
  const muroClicEditor3d = !atenuado && (interactivo || (editor3d && !preview && !planosActivo))
  // Techo clicable solo cuando es visible (toggle 🏠) y sin capa activa aún: con una capa YA
  // activa, en Techos lo gestiona PlanoTechos3DEditor y en cualquier otra el techo no le
  // pertenece (el clic no puede saltar de capa).
  const techoClicEditor3d =
    !atenuado && conTecho && (interactivo || (editor3d && !preview && !planosActivo))
  const seleccionarMuro = (clave: string, ventana: boolean) => {
    const [c, r, side] = clave.split(',')
    setTab('mapa')
    setModoPlano(ventana ? 'ventanas' : 'muros')
    setSeleccionPlano({
      tipo: 'arista',
      roomId: id,
      off: { col: Number(c), row: Number(r) },
      side: side as SideKey,
    })
  }
  // Clic en la hoja de una puerta de fachada → modo Puertas con esa arista seleccionada.
  const seleccionarPuerta = (off: Cell, side: SideKey) => {
    setTab('mapa')
    setModoPlano('puertas')
    setSeleccionPlano({ tipo: 'arista', roomId: id, off, side })
  }
  // Clic en el techo → modo Techos con el cuarto seleccionado.
  const seleccionarTecho = () => {
    setTab('mapa')
    setModoPlano('techos')
    setSeleccionPlano({ tipo: 'cuarto', roomId: id })
  }

  return (
    <group position={position}>
      {/* Piso: una loseta por celda del footprint */}
      {anchorCell &&
        fp.map((off, i) => {
        const [lx, lz] = tileLocalEnCuarto(anchorCell, off, fp)
        const emissiveSel = atenuado
          ? '#000000'
          : resaltadoPlano
            ? color
            : arrastrando && !celdaValida
              ? '#ef4444'
              : color
        const emissiveIntSel = atenuado
          ? 0
          : resaltadoPlano
            // En capa Pisos el resaltado es tenue para no tapar la textura del piso aplicado.
            ? planosCapa === 'pisos'
              ? 0.12
              : 0.45
            : arrastrando
              ? celdaValida
                ? 0.5
                : 0.35
              // Brillos de juego (cercanía/selección) NO aplican en edición de planos:
              // taparían la textura del piso que se está editando.
              : !planosActivo && cerca
                ? 0.35
                : !planosActivo && seleccionado
                  ? 0.18
                  : 0
        const ac = anchorCell.col + off.col
        const ar = anchorCell.row + off.row
        const subEf = subformasPorCelda.get(claveCeldaOff(off.col, off.row)) ?? null
        const { hayAlguno, recs } = cuadrantesDeCelda(ac, ar, (c, r) => overrideMap.get(`${c},${r}`))
        if (hayAlguno) {
          const base: MatPiso = {
            sinPiso,
            color: floorColor,
            roughness: floorRough,
            metalness: floorMetal,
            pisoConf: tienePisoCustom && !pisoImagen ? pisoConfCuarto : null,
            pisoImagen,
            pisoImagenAjuste,
          }
          // Cuadrante con recorte fino: su mini-loseta (pintada o base) toma la forma.
          const overrides = recs.map((q, qi) => {
            const mat = q
              ? matDeRegistroPiso(
                  q,
                  overrideUrls.get(`${ac + CUADRANTES_OFF[qi].dc},${ar + CUADRANTES_OFF[qi].dr}`),
                  floorColor,
                )
              : null
            const sub = subEf?.[qi]
            if (!sub) return mat
            return { ...(mat ?? base), forma: sub }
          })
          return (
            <group key={i}>
              <PisoCuadrantes3D cx={lx} cz={lz} base={base} overrides={overrides} atenuado={atenuado} />
            </group>
          )
        }
        if (sinPiso) return null
        const formaEf = formaEnCelda(formasEfectivas, claveCeldaOff(off.col, off.row))
        const losetaForma = (
          <PisoCelda
            lx={lx}
            lz={lz}
            formaLoseta={formaEf}
            subformas={subEf}
            huecos={huecosDeLosa(lx, lz, nivel)}
            color={floorColor}
            roughness={floorRough}
            metalness={floorMetal}
            emissive={emissiveSel !== color ? emissiveSel : floorEmissiveMat}
            emissiveIntensity={emissiveIntSel || floorEmissiveIntMat}
            pisoConf={tienePisoCustom && !pisoImagen ? pisoConfCuarto : null}
            pisoImagen={pisoImagen}
            pisoImagenAjuste={pisoImagenAjuste}
            colorTinte={pisoTinte}
            atenuado={atenuado}
            onClick={atenuado || planosEditarForma ? undefined : onFloorClick}
            onPointerDown={atenuado || planosEditarForma ? undefined : onFloorDown}
            onPointerOver={
              atenuado || planosEditarForma
                ? undefined
                : (e) => {
                    e.stopPropagation()
                    if (!editMode) document.body.style.cursor = 'pointer'
                    else if (puedeMoverCuarto && !arrastrando)
                      document.body.style.cursor = 'grab'
                    else document.body.style.cursor = 'default'
                  }
            }
            onPointerOut={
              atenuado || planosEditarForma
                ? undefined
                : () => {
                    if (!useLayout.getState().draggingId)
                      document.body.style.cursor = 'default'
                  }
            }
          />
        )
        if (esFormaCuadrada(formaEf) && !subEf) return <group key={i}>{losetaForma}</group>
        // Celda con forma (entera o recorte fino): el exterior (el trozo fuera de la
        // silueta) lo aporta la CAPA de piso exterior continua (PisosExterior3D), que pasa
        // por debajo. Solo si el cuarto definió un piso exterior PROPIO se dibuja un
        // relleno encima de esa capa — y nunca si el cuarto flota (ver `flotando`).
        return (
          <group key={i}>
            {pisoExtMat && !pisoExtMat.sinPiso && !flotando && (
              <group position={[0, -0.01, 0]}>
                <PisoCelda
                  lx={lx}
                  lz={lz}
                  formaLoseta={pisoExtMat.forma}
                  color={pisoExtMat.color}
                  roughness={pisoExtMat.roughness}
                  metalness={pisoExtMat.metalness}
                  emissive="#000000"
                  emissiveIntensity={0}
                  pisoConf={pisoExtMat.pisoConf}
                  pisoImagen={pisoExtMat.pisoImagen}
                  pisoImagenAjuste={pisoExtMat.pisoImagenAjuste}
                  atenuado={atenuado}
                />
              </group>
            )}
            {losetaForma}
          </group>
        )
      })}

      {/* Alberca: lámina de agua animada por celda, a un pelo del borde del pozo. La
          silueta (forma entera + recortes finos) mantiene el agua DENTRO del cuarto. */}
      {esAlberca && !atenuado && anchorCell && (
        <AguaCuarto
          celdas={fp.map((off) => {
            const [lx, lz] = tileLocalEnCuarto(anchorCell, off, fp)
            return {
              lx,
              lz,
              forma: formaEnCelda(formasEfectivas, claveCeldaOff(off.col, off.row)),
              subformas: subformasPorCelda.get(claveCeldaOff(off.col, off.row)) ?? null,
            }
          })}
        />
      )}

      {/* Sótano con celdas no-cuadradas: rellena el trozo fuera de la silueta del pozo con
          el MISMO piso exterior del mapa; si no, se vería el vacío en las esquinas. Va un
          pelín por debajo del borde (world y≈-0.02) para que los muros del cuarto se vean
          por encima, no compitan a la misma altura. */}
      {nivel < 0 && !atenuado && anchorCell &&
        fp.map((off) => {
          const clave = claveCeldaOff(off.col, off.row)
          const forma = formaEnCelda(formasEfectivas, clave)
          const subformas = subformasPorCelda.get(clave) ?? null
          if (esFormaCuadrada(forma) && !subformas) return null
          const [lx, lz] = tileLocalEnCuarto(anchorCell, off, fp)
          return (
            <ComplementoPisoSotano
              key={`comp-${clave}`}
              lx={lx}
              lz={lz}
              y={-nivelBaseY(nivel, apilado) - 0.02}
              forma={forma}
              subformas={subformas}
              mat={matPisoExtEn(anchorCell.col + off.col, anchorCell.row + off.row)}
            />
          )
        })}

      {/* Paredes: la fachada (exterior) se viste distinto al muro interior; los
          pisos ≥ 1 llevan ventanas en la fachada para diferenciarse de la base. */}
      {segs.map((s, i) => {
        const mk = s.clave ? `${id}::${s.clave}` : ''
        const imagen = mk && roomMuroImagenActiva[mk] ? roomMuroImagenes[mk] : undefined
        // Foto del cuadro empotrado: misma tabla de imágenes por arista, clave con sufijo.
        const fotoCuadro = mk && s.ventContenido === 'cuadro' ? roomMuroImagenes[`${mk}#cuadro`] : undefined
        const seleccionadaArista =
          seleccionPlano?.tipo === 'arista' &&
          seleccionPlano.roomId === id &&
          s.clave === `${seleccionPlano.off.col},${seleccionPlano.off.row},${seleccionPlano.side}`
        const hoverArista =
          !!s.clave &&
          muroSelHover != null &&
          'roomId' in muroSelHover &&
          muroSelHover.roomId === id &&
          s.clave === `${muroSelHover.off.col},${muroSelHover.off.row},${muroSelHover.side}`
        const resaltadoArista = seleccionadaArista || hoverArista
        const clicable = muroClicEditor3d && !!s.clave
        // userData para el raycast de PlanoMuroSelector3D (selección por la malla real).
        const muroSelData = s.clave
          ? (() => {
              const [oc, or, osd] = s.clave.split(',')
              return { muroSel: { roomId: id, off: { col: Number(oc), row: Number(or) }, side: osd as SideKey, ventana: !!s.ventana } }
            })()
          : undefined
        const muro = (
          <MuroSegment
            cx={s.cx}
            cz={s.cz}
            sx={s.sx}
            sz={s.sz}
            exterior={s.exterior}
            tipoMuro={s.tipoMuro}
            colorMuro={s.colorMuro}
            alto={s.alto}
            alturaM={s.alturaM}
            yBase={s.yBase}
            ventana={s.ventana}
            ventAncho={s.ventAncho}
            ventAlto={s.ventAlto}
            ventPosY={s.ventPosY}
            ventPosX={s.ventPosX}
            ventForma={s.ventForma}
            ventContenido={s.ventContenido}
            ventCara={s.ventCara}
            ventRot={s.ventRot}
            ventColor={s.ventColor}
            ventMosaico={s.ventMosaico}
            ventMulticolor={s.ventMulticolor}
            ventFoto={fotoCuadro}
            caraInterior={s.caraInterior}
            forma={s.forma}
            formaAlto={s.formaAlto}
            formaAncho={s.formaAncho}
            formaPosX={s.formaPosX}
            formaDividir={s.formaDividir}
            formaColor={s.formaColor}
            vanoForma={s.vanoForma}
            vanoFormaAlto={s.vanoFormaAlto}
            vanoFormaAncho={s.vanoFormaAncho}
            vanoFormaPosX={s.vanoFormaPosX}
            imagen={imagen}
            imagenAjuste={mk ? roomMuroImagenAjuste[mk] : undefined}
            baseColor={baseColor}
            extColor={muroExtColor}
            roughness={wallRough}
            extRough={extRough}
            metalness={wallMetal}
            emissive={resaltadoArista ? '#f59e0b' : wallEmissive}
            emissiveInt={resaltadoArista ? 1.1 : wallEmissiveInt}
            atenuado={atenuado}
            marcoVentana={marcoColor}
            cristal={cristalColor}
          />
        )
        // Grafitis guardados sobre las caras de la arista (capa decal, hermana del muro).
        const grafitisMuro =
          s.clave && !s.alturaM && !s.yBase && !atenuado && cuerposGrafiti.get(s.clave) === 1 ? (
            <GrafitisMuroCuarto roomId={id} clave={s.clave} cx={s.cx} cz={s.cz} sx={s.sx} sz={s.sz} alto={s.alto} />
          ) : null
        if (!clicable)
          return (
            <group key={i} userData={muroSelData}>
              {muro}
              {grafitisMuro}
            </group>
          )
        return (
          <group
            key={i}
            userData={muroSelData}
            onClick={(e) => {
              if (e.delta > 6) return
              e.stopPropagation()
              seleccionarMuro(s.clave!, !!s.ventana)
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default'
            }}
          >
            {muro}
            {grafitisMuro}
          </group>
        )
      })}

      {anchorCell && !sinMuros && (
        <MurosPerimetroFormaCuarto
          anchor={anchorCell}
          fp={fp}
          formasCelda={formasEfectivas}
          baseColor={baseColor}
          extColor={muroExtColor}
          roughness={wallRough}
          extRough={extRough}
          metalness={wallMetal}
          atenuado={atenuado}
          edgeStyles={edgeStyles}
          overrides={overrides}
          pinceles={pinceles}
          roomId={id}
          nivel={nivel}
          fotoCuadroDe={(clave) => roomMuroImagenes[`${id}::${clave}#cuadro`]}
          fotoPuertaDe={(clave) => roomMuroImagenes[`${id}::${clave}#puerta`]}
          seleccion={seleccionPlano}
          hover={muroSelHover}
        />
      )}

      {/* Puertas y portones de la FACHADA (en cualquier nivel): la hoja se abre al
          acercarse el avatar (entrar/salir). Decorativas: no añaden colisión. */}
      {!atenuado &&
        vanos
          .filter((v) => v.exterior)
          .map((v, i) => {
            // Imagen de la hoja: misma tabla de imágenes por arista, clave con sufijo.
            const claveVano = v.off && v.side ? `${v.off.col},${v.off.row},${v.side}` : ''
            const fachada = (
              <VanoFachada
                vano={v}
                roomPos={position}
                marco={marcoColor}
                nivel={nivel}
                fotoPuerta={claveVano ? roomMuroImagenes[`${id}::${claveVano}#puerta`] : undefined}
              />
            )
            if (!v.off || !v.side) return <group key={i}>{fachada}</group>
            const off = v.off
            const side = v.side
            // userData: clicar la hoja de la puerta selecciona la arista de su muro.
            const vanoSel = { muroSel: { roomId: id, off, side, ventana: false } }
            if (!muroClicEditor3d) return <group key={i} userData={vanoSel}>{fachada}</group>
            return (
              <group
                key={i}
                userData={vanoSel}
                onClick={(e) => {
                  if (e.delta > 6) return
                  e.stopPropagation()
                  seleccionarPuerta(off, side)
                }}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  document.body.style.cursor = 'pointer'
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'default'
                }}
              >
                {fachada}
              </group>
            )
          })}

      {/* Techo (toggle 🏠): losa por celda o forma única según configuración. */}
      {conTecho && hayTechoVisible && !techoPorCelda && techoPlanoLosetas &&
        offsetsTechoVisibles.map((off, i) => {
          const [lx, lz] = cellLocalRect(off, boundsTechoRect)
          return (
            <TechoLoseta
              key={i}
              tipo={techoTipo}
              colorCuarto={techoColor}
              tinte={techoTinte}
              imagen={techoImagen}
              imagenAjuste={techoImagenAjuste}
              y={alturaTecho + 0.06}
              lx={lx}
              lz={lz}
              mN={margenLado(off, 0, -1)}
              mS={margenLado(off, 0, 1)}
              mO={margenLado(off, -1, 0)}
              mE={margenLado(off, 1, 0)}
              atenuado={atenuado}
              formaLoseta={formaEnCelda(formasEfectivas, claveCeldaOff(off.col, off.row))}
              subformas={subformasPorCelda.get(claveCeldaOff(off.col, off.row)) ?? null}
              huecos={huecosDeLosa(lx, lz, nivel + 1)}
            />
          )
        })}
      {conTecho && hayTechoVisible && !techoPorCelda && !techoPlanoLosetas && (
        <group position={[techoDx, 0, techoDz]}>
          <TechoForma
            forma={techoForma}
            params={techoParams}
            tipo={techoTipo}
            colorCuarto={techoColor}
            tinte={techoTinte}
            imagen={techoImagen}
            imagenAjuste={techoImagenAjuste}
            W={Wt}
            H={Ht}
            yBase={alturaTecho + 0.06}
            margenN={margenCaja.N}
            margenS={margenCaja.S}
            margenO={margenCaja.O}
            margenE={margenCaja.E}
            ocultarHastialNeg={ocultarHastialNeg}
            ocultarHastialPos={ocultarHastialPos}
            atenuado={atenuado}
          />
        </group>
      )}

      {/* Techo POR CELDA (rejilla): cada celda con su forma; las no tocadas, planas.
          También cubre la forma única de un cuarto con figuras: cada celda fabrica
          esa forma sobre su propia silueta (caja, triángulo, círculo o recortes). */}
      {conTecho && hayTechoVisible && techoPorCelda &&
        offsetsTechoVisibles.map((off, i) => {
          const [lx, lz] = cellLocalRect(off, boundsTechoRect)
          const clave = claveCeldaOff(off.col, off.row)
          const cf =
            techoCeldas[clave] ??
            (formaGlobalPorCelda ? { forma: techoForma, params: techoParams } : undefined)
          const formaPiso = formaEnCelda(formasEfectivas, clave)
          const subEfCelda = subformasPorCelda.get(clave) ?? null
          const esFlat = !cf || (cf.forma === 'plano' && cf.params.inclinacion <= 0)
          if (esFlat) {
            return (
              <TechoLoseta
                key={i}
                tipo={techoTipo}
                colorCuarto={techoColor}
                tinte={techoTinte}
                imagen={techoImagen}
                imagenAjuste={techoImagenAjuste}
                y={alturaTecho + 0.06}
                lx={lx}
                lz={lz}
                mN={margenLado(off, 0, -1)}
                mS={margenLado(off, 0, 1)}
                mO={margenLado(off, -1, 0)}
                mE={margenLado(off, 1, 0)}
                atenuado={atenuado}
                formaLoseta={formaPiso}
                subformas={subEfCelda}
                huecos={huecosDeLosa(lx, lz, nivel + 1)}
              />
            )
          }
          // Celda cuadrada sin recortes: caja TechoForma a escala de celda.
          if (esFormaCuadrada(formaPiso) && !subEfCelda) {
            return (
              <group key={i} position={[lx, alturaTecho + 0.06, lz]}>
                <TechoForma
                  forma={cf.forma}
                  params={cf.params}
                  tipo={techoTipo}
                  colorCuarto={techoColor}
                  tinte={techoTinte}
                  imagen={techoImagen}
                  imagenAjuste={techoImagenAjuste}
                  W={SIZE}
                  H={SIZE}
                  yBase={0}
                  margenN={margenLado(off, 0, -1)}
                  margenS={margenLado(off, 0, 1)}
                  margenO={margenLado(off, -1, 0)}
                  margenE={margenLado(off, 1, 0)}
                  atenuado={atenuado}
                />
              </group>
            )
          }
          // Celda triangular/circular o con recortes finos: geometría por silueta.
          return (
            <group key={i} position={[lx, alturaTecho + 0.06, lz]}>
              <TechoCeldaNoCuadrada
                formaLoseta={formaPiso}
                cf={cf}
                tipo={techoTipo}
                colorCuarto={techoColor}
                tinte={techoTinte}
                tile={SIZE}
                atenuado={atenuado}
                subformas={subEfCelda}
              />
            </group>
          )
        })}

      {/* Objetos (mueble + decoración) — ocultos en cuartos atenuados o con `sinObjetos`
          (toggle del preview). Suscripción propia por cuarto: ver ObjetosCuarto. */}
      {!atenuado && !sinObjetos && <ObjetosCuarto id={id} nivel={nivel} W={W} H={H} preview={preview} />}

      {/* Editor 3D: plano invisible sobre el techo para seleccionarlo (modo Techos). */}
      {techoClicEditor3d && (
        <mesh
          position={[0, alturaTecho + 0.3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            if (e.delta > 6) return
            e.stopPropagation()
            seleccionarTecho()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default'
          }}
        >
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
