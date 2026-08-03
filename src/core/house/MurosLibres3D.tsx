import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { usePlanos } from '../state/planosStore'
import { VACIO, murosLibresRepo } from '../data/repository'
import { nivelBaseY, WALL_H, WALL_T } from './walls'
import {
  segmentosMundoMuroLibre,
  arcoCircularMuroLocal,
  centroCeldaMundo,
  aberturaMuroLibreMundo,
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

/**
 * Muros independientes (capa "Muros"). Aristas rectas y la diagonal del triángulo se
 * dibujan con `MuroSegment` (textura, color, altura y silueta). El muro circular es una
 * pared curva real (`MuroCurvo3D`), con remate de arco o pico, no una aproximación por tramos.
 */
export function MurosLibres3D() {
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const muroHover = usePlanos((s) => s.muroHover)
  const nivelPlano = usePlanos((s) => s.nivel)
  const muroSelHover = usePlanos((s) => s.muroSelHover)
  const muroLibreSel = usePlanos((s) => s.muroLibreSel)
  const muros = murosLibresRepo.useAll() ?? VACIO
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
      {muros.map((m) => (
        // userData: PlanoMuroSelector3D selecciona el muro libre por su malla (cualquier forma).
        <group key={`ml-${m.id}`} userData={m.id != null ? { muroLibreSel: m.id } : undefined}>
          <MuroLibre3DItem
            m={m}
            gridCols={gridCols}
            gridRows={gridRows}
            yBase={nivelBaseY(m.nivel, apilado)}
            resaltado={m.id != null && (m.id === hoverLibreId || m.id === muroLibreSel)}
          />
        </group>
      ))}
    </>
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
