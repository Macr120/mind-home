import { useMemo } from 'react'
import type { Footprint, WallOverrides } from './walls'
import {
  tileLocalEnCuarto,
  centroCuarto3D,
  edgeKey,
  SIDE_KEYS,
  SIZE,
  WALL_H,
  WALL_T,
  type Cell,
  type SideKey,
} from './walls'
import {
  claveCeldaOff,
  formaEnCelda,
  subformasDeCelda,
  offSubcelda,
  arcoCuartoCirculoLocal,
  type FormasCeldaMap,
} from './formasLoseta'
import {
  perimetroFormaCelda,
  itemsPerimetroSubformas,
  type MuroExtraPerimetro,
} from './murosPerimetroLoseta'
import { MuroCurvo3D } from './MuroCurvo3D'
import { MuroSegment, VentanaEnMuro } from './MuroRender'
import { MuroLibrePuerta3D } from './MuroLibrePuerta3D'
import type { AberturaMundo } from './murosLibre'
import type { RemateHoja } from './puertaHojas'
import { VANO_FORMA_ALTO_DEFAULT } from './murosPuertas'
import type { EstiloArista, PincelesCuarto, TipoMuroId, FormaMuroId, FormaVanoId, VentanaFormaId } from './murosPuertas'

/** Estilos por arista: la curva/diagonal toma textura, color, hueco (puerta/ventana) del lado representativo. */
type EdgeStyles = Record<string, EstiloArista | undefined>

const COLOR_PUERTA = '#b9824f'
const COLOR_VENTANA = '#bcdcff'

const LADO_DELTA: Record<SideKey, Cell> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  O: { col: -1, row: 0 },
  E: { col: 1, row: 0 },
}

/** Silueta (remate superior) compatible con el muro curvo (sin 'esquinas'). */
function siluetaCurva(forma?: FormaMuroId): 'recta' | 'arco' | 'triangulo' {
  return forma === 'arco' || forma === 'triangulo' ? forma : 'recta'
}

/**
 * Abertura (hoja de puerta) sobre un ARCO, en coords locales: cuerda del tramo del
 * hueco, con la normal hacia el centro del círculo (el interior del recorte). Misma
 * fracción de arco que el hueco de `MuroCurvo3D` (paridad con los muros libres).
 */
function aberturaEnArco(
  m: Extract<MuroExtraPerimetro, { tipo: 'arco' }>,
  anchoF: number,
  posX: number,
): AberturaMundo {
  const span = m.a1 - m.a0
  const aHalf = Math.max(0.05, Math.min(1, anchoF)) / 2
  const uc = 0.5 + posX * (0.5 - aHalf)
  const ang0 = m.a0 + span * (uc - aHalf)
  const ang1 = m.a0 + span * (uc + aHalf)
  const ax = m.cx + m.r * Math.cos(ang0)
  const az = m.cz + m.r * Math.sin(ang0)
  const bx = m.cx + m.r * Math.cos(ang1)
  const bz = m.cz + m.r * Math.sin(ang1)
  const dx = bx - ax
  const dz = bz - az
  const L = Math.hypot(dx, dz) || 1
  const cx = (ax + bx) / 2
  const cz = (az + bz) / 2
  let nx = m.cx - cx
  let nz = m.cz - cz
  const nL = Math.hypot(nx, nz) || 1
  nx /= nL
  nz /= nL
  return { cx, cz, dirx: dx / L, dirz: dz / L, ancho: L, nx, nz }
}

/** Abertura (hoja de puerta) sobre un tramo recto, con la normal hacia `hacia`. */
function aberturaEnTramo(
  m: Extract<MuroExtraPerimetro, { tipo: 'diagonal' }>,
  anchoF: number,
  posX: number,
  hacia: { x: number; z: number },
): AberturaMundo {
  const dx = m.x2 - m.x1
  const dz = m.z2 - m.z1
  const L = Math.hypot(dx, dz) || 1
  const ancho = Math.max(0.4, L * Math.max(0.05, Math.min(1, anchoF)))
  const margen = Math.max(0, (L - ancho) / 2)
  const off = posX * margen
  const cx = (m.x1 + m.x2) / 2 + (dx / L) * off
  const cz = (m.z1 + m.z2) / 2 + (dz / L) * off
  let nx = -dz / L
  let nz = dx / L
  if (nx * (hacia.x - cx) + nz * (hacia.z - cz) < 0) {
    nx = -nx
    nz = -nz
  }
  return { cx, cz, dirx: dx / L, dirz: dz / L, ancho, nx, nz }
}

/**
 * Muros diagonales y curvos del perímetro de formas de piso (por celda del footprint),
 * tanto de celda entera como de esquinas FINAS (cuadrantes de la rejilla fina, que
 * añaden su recorte y las mitades rectas que éste deja vivas). Cada tramo se dibuja
 * con el muro COMPLETO (curvo o recto): textura, color, altura, ventana y puerta. El
 * estilo lo toma de su arista representativa (el lado de rejilla que el tramo
 * reemplaza), editable en el editor de mapa como cualquier muro.
 */
export function MurosPerimetroFormaCuarto({
  anchor,
  fp,
  formasCelda,
  extColor,
  roughness,
  extRough,
  metalness,
  atenuado,
  edgeStyles,
  overrides,
  pinceles,
  roomId,
  nivel,
  fotoCuadroDe,
  seleccion,
  hover,
}: {
  anchor: Cell
  fp: Footprint
  formasCelda?: FormasCeldaMap
  baseColor: string
  extColor: string
  roughness: number
  extRough: number
  metalness: number
  atenuado: boolean
  /** Estilos de arista del cuarto (textura/color/ventana del lado representativo). */
  edgeStyles?: EdgeStyles
  /** Estados de arista del cuarto (un lado representativo en 'puerta' dibuja puerta en la curva). */
  overrides?: WallOverrides
  /** Pincel del cuarto: estilo por defecto de los tramos sin estilo propio (como los muros rectos). */
  pinceles?: PincelesCuarto
  /** Id del cuarto: se expone en userData para que PlanoMuroSelector3D identifique la curva. */
  roomId?: string
  /** Nivel del cuarto: la hoja de puerta se abre cuando el avatar está en ese piso. */
  nivel?: number
  /** Foto del cuadro empotrado por clave de arista (la resuelve Room3D). */
  fotoCuadroDe?: (clave: string) => string | undefined
  /** Selección de plano: la curva/diagonal cuya arista representativa esté seleccionada se tiñe de ámbar. */
  seleccion?: { tipo: string; roomId?: string; off?: { col: number; row: number }; side?: string } | null
  /** Muro bajo el cursor (hover): la curva/diagonal correspondiente se tiñe de ámbar. */
  hover?: { roomId?: string; off?: { col: number; row: number }; side?: string } | { muroLibreId: number } | null
}) {
  const items = useMemo(() => {
    const out: {
      /** Arista de estilo/selección: la real del lado (entera/mitad) o la VIRTUAL del cuadrante. */
      offSel: Cell
      extras: MuroExtraPerimetro[]
      ladoRep: SideKey | null
      esMitad?: boolean
      /** Centro local de la celda: define el "interior" (normal de puerta, cara del espejo). */
      cel: { x: number; z: number }
    }[] = []
    const propias = new Set(fp.map((c) => `${c.col},${c.row}`))
    for (const off of fp) {
      const [lx, lz] = tileLocalEnCuarto(anchor, off, fp)
      const forma = formaEnCelda(formasCelda, claveCeldaOff(off.col, off.row))
      const per = perimetroFormaCelda(forma, lx, lz)
      if (per) {
        // El círculo usa LA MISMA geometría de arco que el muro libre (centro/radio
        // correctos), posicionada en la celda.
        let extras = per.extras
        if (forma.forma === 'circular') {
          const a = arcoCuartoCirculoLocal(forma.rotacion, SIZE)
          extras = [{ tipo: 'arco', cx: lx + a.cx, cz: lz + a.cz, r: a.r, a0: a.a0, a1: a.a1 }]
        }
        out.push({
          offSel: off,
          extras,
          ladoRep: SIDE_KEYS.find((s) => !per.lados.has(s)) ?? null,
          cel: { x: lx, z: lz },
        })
      }
      // Esquinas finas: cada recorte es un muro PROPIO (arista virtual en el centro de su
      // cuadrante, seleccionable por separado); las mitades rectas conservadas pertenecen
      // al lado real y solo se dibujan en lados con arista (no dentro del propio cuarto).
      const sub = subformasDeCelda(formasCelda, off.col, off.row)
      if (sub) {
        const ladosExternos = new Set<SideKey>(
          SIDE_KEYS.filter(
            (s) => !propias.has(`${off.col + LADO_DELTA[s].col},${off.row + LADO_DELTA[s].row}`),
          ),
        )
        for (const item of itemsPerimetroSubformas(sub, lx, lz, ladosExternos)) {
          out.push({
            offSel: item.cuadrante != null ? offSubcelda(off.col, off.row, item.cuadrante) : off,
            extras: item.extras,
            ladoRep: item.ladoRep,
            esMitad: item.esMitad,
            cel: { x: lx, z: lz },
          })
        }
      }
    }
    return out
  }, [anchor, fp, formasCelda])

  // Centro del cuarto en mundo: las hojas de puerta se montan en coords locales pero la
  // apertura por proximidad del avatar necesita la posición real.
  const mundoOffset = useMemo(() => {
    const [wx, , wz] = centroCuarto3D(anchor, fp)
    return { x: wx, z: wz }
  }, [anchor, fp])

  if (!items.length) return null

  return (
    <>
      {items.map((c, i) => {
        const key = c.ladoRep ? edgeKey(c.offSel, c.ladoRep) : ''
        const est = key ? edgeStyles?.[key] : undefined
        // Sin estilo propio, el tramo hereda el pincel del cuarto (como los muros rectos).
        const muro = est?.muro ?? pinceles?.muro
        const puertaEst = est?.puerta ?? pinceles?.puerta
        // La mitad recta remanente comparte estilo con su lado, pero el hueco (puerta/
        // ventana) va solo en el recorte (diagonal/arco), no duplicado en la mitad.
        const esPuerta = !!key && overrides?.[key] === 'puerta' && !c.esMitad
        const esVentana = !!muro?.ventana && !esPuerta && !c.esMitad
        const conHueco = esPuerta || esVentana
        // Resaltado ámbar del tramo seleccionado O bajo el cursor (su arista de estilo).
        const coincideArista = (s?: { roomId?: string; off?: { col: number; row: number }; side?: string } | null) =>
          !!c.ladoRep &&
          !!s &&
          s.roomId === roomId &&
          s.off?.col === c.offSel.col &&
          s.off?.row === c.offSel.row &&
          s.side === c.ladoRep
        const resaltado =
          (seleccion?.tipo === 'arista' && coincideArista(seleccion)) ||
          (hover != null && 'roomId' in hover && coincideArista(hover))
        // Color real del muro (sin tocar): el resaltado va por `emissive` (brillo ámbar
        // encima), igual que los muros rectos — así se ve aunque el color ya sea ámbar.
        const color = muro?.color ?? extColor
        const tipoMuro = (muro?.tipo as TipoMuroId) ?? 'solido'
        const alto = muro?.alto ?? 1
        const silueta = (muro?.forma ?? 'recta') as FormaMuroId
        // Hueco: la puerta usa parámetros de puerta (al piso); la ventana, los de ventana.
        const hAncho = esPuerta ? (puertaEst?.anchoVano ?? 0.55) : (muro?.ventAncho ?? 0.55)
        const hAlto = esPuerta ? (puertaEst?.alto ?? 0.9) : (muro?.ventAlto ?? 0.5)
        const hPosY = esPuerta ? hAlto / 2 : (muro?.ventPosY ?? 0.54)
        const hPosX = esPuerta ? (puertaEst?.posX ?? 0) : (muro?.ventPosX ?? 0)
        const hColor = esPuerta ? (puertaEst?.color ?? COLOR_PUERTA) : (muro?.ventColor ?? COLOR_VENTANA)
        const hForma = (esPuerta ? 'cuadrado' : (muro?.ventForma ?? 'cuadrado')) as VentanaFormaId
        // Remate del vano de la puerta (recto/arco/pico), sobre la hoja.
        const vanoForma: FormaVanoId = esPuerta ? (puertaEst?.vanoForma ?? 'recta') : 'recta'
        // Cuadro/espejo empotrados: APLIQUE adosado (el muro no se perfora). En el arco
        // se monta plano, tangente al punto medio del vano.
        const esAplique =
          esVentana && (muro?.ventContenido === 'cuadro' || muro?.ventContenido === 'espejo')
        const ventFoto =
          muro?.ventContenido === 'cuadro' && key ? fotoCuadroDe?.(key) : undefined

        const contenido = c.extras.map((m, j) => {
          if (m.tipo === 'arco') {
            // Aplique en arco: punto del arco en el ángulo central del vano y tangente ahí.
            let aplique = null
            if (esAplique) {
              const span = m.a1 - m.a0
              const aHalf = Math.max(0.05, Math.min(1, hAncho)) / 2
              const angC = m.a0 + span * (0.5 + hPosX * (0.5 - aHalf))
              const px = m.cx + m.r * Math.cos(angC)
              const pz = m.cz + m.r * Math.sin(angC)
              const dxT = -Math.sin(angC) * Math.sign(span || 1)
              const dzT = Math.cos(angC) * Math.sign(span || 1)
              // +Z local del grupo rotado = (-dzT, dxT); interior = hacia el centro del arco.
              const caraInt =
                -dzT * (m.cx - px) + dxT * (m.cz - pz) >= 0 ? 1 : -1
              aplique = (
                <group
                  position={[px, (WALL_H * alto) / 2, pz]}
                  rotation={[0, Math.atan2(-dzT, dxT), 0]}
                >
                  <VentanaEnMuro
                    horizontal
                    largo={Math.abs(span) * m.r}
                    alto={WALL_H * alto}
                    grosor={WALL_T}
                    ancho={hAncho}
                    altoVent={hAlto}
                    posY={hPosY}
                    posX={0}
                    forma={hForma}
                    rot={muro?.ventRot ?? 0}
                    mosaico={false}
                    multicolor={false}
                    color={hColor}
                    marco="#5a5249"
                    contenido={muro?.ventContenido}
                    cara={muro?.ventCara}
                    fotoUrl={ventFoto}
                    caraInterior={caraInt as 1 | -1}
                  />
                </group>
              )
            }
            return (
              <group key={`a-${j}`}>
                <MuroCurvo3D
                  arcCx={m.cx}
                  arcCz={m.cz}
                  r={m.r}
                  a0={m.a0}
                  a1={m.a1}
                  baseY={0}
                  alto={alto}
                  silueta={siluetaCurva(silueta)}
                  formaAlto={muro?.formaAlto}
                  formaAncho={muro?.formaAncho}
                  formaPosX={muro?.formaPosX}
                  color={color}
                  tipo={tipoMuro}
                  puerta={esPuerta}
                  ventana={esVentana && !esAplique}
                  aberturaAncho={hAncho}
                  aberturaColor={hColor}
                  ventForma={hForma}
                  aberturaPosX={hPosX}
                  aberturaPosY={hPosY}
                  aberturaAlto={hAlto}
                  vanoForma={vanoForma}
                  vanoFormaAlto={puertaEst?.vanoFormaAlto}
                  vanoFormaAncho={puertaEst?.vanoFormaAncho ?? 1}
                  vanoFormaPosX={puertaEst?.vanoFormaPosX ?? 0}
                  sinPanel={esPuerta}
                  resaltado={resaltado}
                />
                {aplique}
              </group>
            )
          }
          // Tramo recto (diagonal del triángulo o mitad conservada de un lado): muro
          // recto en ángulo (MuroSegment, igual que el muro libre).
          const dx = m.x2 - m.x1
          const dz = m.z2 - m.z1
          const largo = Math.hypot(dx, dz)
          if (largo < 0.05) return null
          const mx = (m.x1 + m.x2) / 2
          const mz = (m.z1 + m.z2) / 2
          const rotY = Math.atan2(-dz, dx)
          // Signo de +Z local (tras rotar el grupo) que apunta al interior (centro de celda):
          // orienta la cara del espejo/cuadro empotrado, como `caraInterior` en muros rectos.
          const caraInt =
            (-dz / largo) * (c.cel.x - mx) + (dx / largo) * (c.cel.z - mz) >= 0 ? 1 : -1
          return (
            <group key={`d-${j}`} position={[mx, 0, mz]} rotation={[0, rotY, 0]}>
              <MuroSegment
                cx={0}
                cz={0}
                sx={largo}
                sz={WALL_T}
                exterior={false}
                tipoMuro={tipoMuro}
                colorMuro={color}
                alto={alto}
                forma={silueta}
                formaAlto={muro?.formaAlto}
                formaAncho={muro?.formaAncho}
                formaPosX={muro?.formaPosX}
                formaDividir={muro?.formaDividir}
                formaColor={muro?.formaColor}
                ventana={conHueco}
                ventAncho={hAncho}
                ventAlto={hAlto}
                ventPosY={hPosY}
                ventPosX={hPosX}
                ventRot={muro?.ventRot ?? 0}
                ventColor={hColor}
                ventForma={hForma}
                ventContenido={esPuerta ? 'ventana' : muro?.ventContenido}
                ventCara={muro?.ventCara}
                ventFoto={ventFoto}
                caraInterior={caraInt as 1 | -1}
                ventMosaico={muro?.ventMosaico}
                ventMulticolor={muro?.ventMulticolor}
                huecoSinCristal={esPuerta}
                vanoForma={vanoForma}
                vanoFormaAlto={puertaEst?.vanoFormaAlto}
                vanoFormaAncho={puertaEst?.vanoFormaAncho ?? 1}
                vanoFormaPosX={puertaEst?.vanoFormaPosX ?? 0}
                yBase={0}
                baseColor={color}
                extColor={color}
                roughness={roughness}
                extRough={extRough}
                metalness={metalness}
                emissive={resaltado ? '#f59e0b' : '#000000'}
                emissiveInt={resaltado ? 1.1 : 0}
                atenuado={atenuado}
                marcoVentana="#5a5249"
                cristal={COLOR_VENTANA}
              />
            </group>
          )
        })

        // Hoja de la puerta (igual que los muros libres): sobre la cuerda del arco o el
        // tramo diagonal, animada al acercarse el avatar. El hueco lo corta el muro.
        // El tipo "Sin puerta" deja el vano abierto (sin hoja).
        const tipoPuerta = puertaEst?.tipo ?? 'recta'
        const primero = c.extras[0]
        const hojaAltoPerim = Math.max(0.6, WALL_H * alto * hAlto - 0.06)
        // Remate para la hoja: mismo perfil que el hueco, acotado al alto del muro.
        const remateHoja: RemateHoja | undefined =
          vanoForma !== 'recta'
            ? {
                forma: vanoForma,
                extra: Math.min(
                  WALL_H * (puertaEst?.vanoFormaAlto ?? VANO_FORMA_ALTO_DEFAULT),
                  Math.max(0, WALL_H * alto * 0.98 - hojaAltoPerim),
                ),
                ancho: puertaEst?.vanoFormaAncho ?? 1,
                posX: puertaEst?.vanoFormaPosX ?? 0,
              }
            : undefined
        const hojaPuerta =
          esPuerta && !atenuado && nivel != null && primero && tipoPuerta !== 'sin' ? (
            <MuroLibrePuerta3D
              ab={
                primero.tipo === 'arco'
                  ? aberturaEnArco(primero, hAncho, hPosX)
                  : aberturaEnTramo(primero, hAncho, hPosX, c.cel)
              }
              baseY={0}
              alto={hojaAltoPerim}
              tipo={tipoPuerta as 'recta' | 'doble' | 'porton' | 'corredera'}
              color={hColor}
              nivel={nivel}
              mundoOffset={mundoOffset}
              remate={remateHoja}
            />
          ) : null

        // userData para que PlanoMuroSelector3D seleccione la curva/diagonal por su malla.
        const userData =
          roomId && c.ladoRep
            ? { muroSel: { roomId, off: c.offSel, side: c.ladoRep, ventana: esVentana } }
            : undefined
        return (
          <group key={`mpf-${i}`} userData={userData}>
            {contenido}
            {hojaPuerta}
          </group>
        )
      })}
    </>
  )
}
