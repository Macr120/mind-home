import { useMemo } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { zonasRepo, pisosExteriorRepo } from '../data/repository'
import type { ZonaPlano } from '../data/db'
import {
  roomWallSegments,
  footprintBoundsRect,
  cellLocalRect,
  centroCuarto3D,
  tileLocalEnCuarto,
  nivelBaseY,
  alturaTechoDeSegs,
  WALL_T,
  type Cell,
} from './walls'
import { MuroSegment } from './MuroRender'
import { PisoCelda } from './PisoCelda'
import { TechoLoseta } from './TechoLoseta'
import { murosEfectivosZona } from './murosZona'
import { zonaAnchorFootprint, ocupadoConZonas } from './planoGeometria'
import { getPisoTipo, esSinPiso, type PisoTipoId } from './pisos'
import { PisoCuadrantes3D } from './PisoCuadrantes3D'
import { CUADRANTES_OFF, cuadrantesDeCelda, matDeRegistroPiso, type MatPiso } from './pisoSubcelda'
import { useBlobUrlMap } from './useBlobUrlMap'
import { useIniciarZonaDrag3D } from './PlanoCuartos3DController'
import { usePreviewBlob } from '../ui/editor/usePreviewBlob'
import { claveCeldaAbs, formaEnCelda, esFormaCuadrada, deltaTrasladoAncla, trasladarFormasCelda } from './formasLoseta'
import { useDiseño } from '../state/disenoStore'
import { colorExteriorDefecto } from './PisosExterior3D'
import { filtrarSegmentosPorForma } from './murosPerimetroLoseta'
import { MurosPerimetroFormaCuarto } from './MurosPerimetroFormaCuarto'

function tint(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt))
  const b = Math.min(255, Math.max(0, (n & 255) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

/** Cuarto 3D genérico (paredes + piso + techo) para una zona del plano. */
function ZonaCuartoSingle({
  z,
  celdas,
  formasCelda,
  atenuado,
  resaltado,
  elevado,
  todasZonas,
  bloquearClics,
  onMoverDown,
}: {
  z: ZonaPlano
  celdas: Cell[]
  /** Formas efectivas (p. ej. traducidas durante arrastre). */
  formasCelda?: ZonaPlano['formasCelda']
  atenuado: boolean
  resaltado: boolean
  elevado: boolean
  todasZonas: ZonaPlano[]
  bloquearClics?: boolean
  onMoverDown?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const formas = formasCelda ?? z.formasCelda
  const conTecho = useHouse((s) => s.conTecho)
  const seleccionPlano = usePlanos((s) => s.seleccion)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)

  const color = z.color || '#94a3b8'
  const { anchor, footprint } = useMemo(() => zonaAnchorFootprint(celdas), [celdas])
  const rect = useMemo(() => footprintBoundsRect(footprint), [footprint])

  const position = useMemo((): [number, number, number] => {
    const [x, , zW] = centroCuarto3D(anchor, footprint)
    const y = nivelBaseY(z.nivel, conTecho) + (elevado ? 0.8 : 0)
    return [x, y, zW]
  }, [anchor, rect, z.nivel, conTecho, elevado])

  const ocupado = useMemo(
    () => ocupadoConZonas(z.nivel, ocupadoPorNivel, todasZonas, z.id),
    [z.nivel, z.id, ocupadoPorNivel, todasZonas],
  )

  const muros = useMemo(() => {
    const occ = ocupadoPorNivel.get(z.nivel) ?? new Set<string>()
    return murosEfectivosZona(z, todasZonas, occ)
  }, [z, todasZonas, ocupadoPorNivel])

  const formasPorOff = useMemo(() => {
    const out: Record<string, import('./formasLoseta').CeldaFormaLoseta> = {}
    if (!formas) return out
    for (const off of footprint) {
      const kAbs = claveCeldaAbs(anchor.col + off.col, anchor.row + off.row)
      const f = formas[kAbs]
      if (f) out[`${off.col},${off.row}`] = f
    }
    return out
  }, [formas, anchor, footprint])

  const segs = useMemo(() => {
    const raw = roomWallSegments(anchor, footprint, ocupado, muros)
    return filtrarSegmentosPorForma(raw, formasPorOff)
  }, [anchor, footprint, ocupado, muros, formasPorOff])

  const alturaTecho = useMemo(() => alturaTechoDeSegs(segs), [segs])

  const pisoTipoRaw = z.pisoTipo as string | null | undefined
  const sinPiso = esSinPiso(pisoTipoRaw)
  const imagenActiva = !!(z.pisoImagenActiva && z.pisoImagen)
  const pisoImagenUrl = usePreviewBlob(imagenActiva ? z.pisoImagen : undefined)
  const pisoImagenAjuste = z.pisoImagenAjuste ?? 'x1'
  const pisoConf = pisoTipoRaw && !sinPiso ? getPisoTipo(pisoTipoRaw as PisoTipoId) : null
  const floorColor = z.pisoColor ?? pisoConf?.color ?? tint(color, 40)
  const baseColor = tint(color, -10)
  const muroExtColor = tint(color, -35)
  const techoColor = tint(color, -25)
  const margenFachada = WALL_T / 2

  // Overrides del nivel por coord (¼ = cuadrante; entera = relleno de celda con forma).
  const pisosOverride = pisosExteriorRepo.useAll() ?? []
  const overrideMap = useMemo(() => {
    const m = new Map<string, (typeof pisosOverride)[0]>()
    for (const p of pisosOverride) {
      if ((p.nivel ?? 0) !== z.nivel) continue
      m.set(`${p.col},${p.row}`, p)
    }
    return m
  }, [pisosOverride, z.nivel])
  const overrideBlobs = useMemo(() => {
    const out: { key: string; blob?: Blob; activa: boolean }[] = []
    const add = (k: string) => {
      const rec = overrideMap.get(k)
      out.push({ key: k, blob: rec?.pisoImagen, activa: !!(rec?.pisoImagenActiva && rec?.pisoImagen) })
    }
    for (const off of footprint) {
      const ac = anchor.col + off.col
      const ar = anchor.row + off.row
      add(`${ac},${ar}`)
      for (const o of CUADRANTES_OFF) add(`${ac + o.dc},${ar + o.dr}`)
    }
    return out
  }, [footprint, anchor, overrideMap])
  const overrideUrls = useBlobUrlMap(overrideBlobs)
  const colorJardin = colorExteriorDefecto(useDiseño((s) => s.temaGlobal))

  return (
    <group position={position}>
      {footprint.map((off, i) => {
        const [lx, lz] = tileLocalEnCuarto(anchor, off, footprint)
        const absCol = anchor.col + off.col
        const absRow = anchor.row + off.row
        const { hayAlguno, recs } = cuadrantesDeCelda(absCol, absRow, (c, r) => overrideMap.get(`${c},${r}`))
        if (hayAlguno) {
          const base: MatPiso = {
            sinPiso,
            color: floorColor,
            roughness: pisoConf?.roughness ?? 0.9,
            metalness: pisoConf?.metalness ?? 0,
            pisoConf: imagenActiva ? null : pisoConf,
            pisoImagen: pisoImagenUrl ?? undefined,
            pisoImagenAjuste,
          }
          const overrides = recs.map((q, qi) =>
            q
              ? matDeRegistroPiso(
                  q,
                  overrideUrls.get(`${absCol + CUADRANTES_OFF[qi].dc},${absRow + CUADRANTES_OFF[qi].dr}`),
                  floorColor,
                )
              : null,
          )
          return (
            <group key={`zp-${i}`}>
              <PisoCuadrantes3D cx={lx} cz={lz} base={base} overrides={overrides} atenuado={atenuado} />
            </group>
          )
        }
        if (sinPiso) return null
        const formaEf = formaEnCelda(formas, claveCeldaAbs(absCol, absRow))
        const losetaForma = (
          <PisoCelda
            lx={lx}
            lz={lz}
            formaLoseta={formaEf}
            color={floorColor}
            roughness={pisoConf?.roughness ?? 0.9}
            metalness={pisoConf?.metalness ?? 0}
            emissive={resaltado ? color : '#000000'}
            emissiveIntensity={resaltado ? 0.35 : 0}
            pisoConf={imagenActiva ? null : pisoConf}
            pisoImagen={pisoImagenUrl ?? undefined}
            pisoImagenAjuste={pisoImagenAjuste}
            atenuado={atenuado}
            onPointerDown={bloquearClics ? undefined : onMoverDown}
            onPointerOver={
              bloquearClics
                ? undefined
                : onMoverDown
                  ? (e) => {
                      e.stopPropagation()
                      if (!elevado) document.body.style.cursor = 'grab'
                    }
                  : undefined
            }
            onPointerOut={
              bloquearClics || !onMoverDown
                ? undefined
                : () => {
                    if (!usePlanos.getState().draggingZonaId)
                      document.body.style.cursor = 'default'
                  }
            }
          />
        )
        if (esFormaCuadrada(formaEf)) return <group key={`zp-${i}`}>{losetaForma}</group>
        // Celda con forma: relleno bajo la loseta (jardín u override de celda entera).
        const recRelleno = overrideMap.get(`${absCol},${absRow}`)
        const matRelleno: MatPiso = recRelleno
          ? matDeRegistroPiso(recRelleno, overrideUrls.get(`${absCol},${absRow}`), colorJardin)
          : { sinPiso: false, color: colorJardin, roughness: 0.85, metalness: 0, pisoConf: null, pisoImagenAjuste: 'x1' }
        return (
          <group key={`zp-${i}`}>
            {!matRelleno.sinPiso && (
              <group position={[0, -0.02, 0]}>
                <PisoCelda
                  lx={lx}
                  lz={lz}
                  formaLoseta={matRelleno.forma}
                  color={matRelleno.color}
                  roughness={matRelleno.roughness}
                  metalness={matRelleno.metalness}
                  emissive="#000000"
                  emissiveIntensity={0}
                  pisoConf={matRelleno.pisoConf}
                  pisoImagen={matRelleno.pisoImagen}
                  pisoImagenAjuste={matRelleno.pisoImagenAjuste}
                  atenuado={atenuado}
                />
              </group>
            )}
            {losetaForma}
          </group>
        )
      })}

      {segs.map((s, i) => {
        const resaltadoArista =
          seleccionPlano?.tipo === 'arista-zona' &&
          seleccionPlano.zonaId === z.id &&
          s.clave === `${seleccionPlano.off.col},${seleccionPlano.off.row},${seleccionPlano.side}`
        return (
        <MuroSegment
          key={`zm-${i}`}
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
          ventRot={s.ventRot}
          ventColor={s.ventColor}
          ventMosaico={s.ventMosaico}
          ventMulticolor={s.ventMulticolor}
          forma={s.forma}
          formaAlto={s.formaAlto}
          formaAncho={s.formaAncho}
          formaPosX={s.formaPosX}
          formaDividir={s.formaDividir}
          formaColor={s.formaColor}
          baseColor={baseColor}
          extColor={muroExtColor}
          roughness={0.65}
          extRough={0.85}
          metalness={0}
          emissive={resaltadoArista ? '#fde047' : '#000000'}
          emissiveInt={resaltadoArista ? 1.3 : 0}
          atenuado={atenuado}
          marcoVentana={tint(color, -55)}
          cristal="#bcdcff"
        />
        )
      })}

      <MurosPerimetroFormaCuarto
        anchor={anchor}
        fp={footprint}
        formasCelda={formasPorOff}
        baseColor={baseColor}
        extColor={muroExtColor}
        roughness={0.65}
        extRough={0.85}
        metalness={0}
        atenuado={atenuado}
      />

      {conTecho &&
        footprint.map((off, i) => {
          const [lx, lz] = cellLocalRect(off, rect)
          const absCol = anchor.col + off.col
          const absRow = anchor.row + off.row
          return (
            <TechoLoseta
              key={`zt-${i}`}
              tipo="plano_gris"
              colorCuarto={techoColor}
              y={alturaTecho + 0.06}
              lx={lx}
              lz={lz}
              mN={margenFachada}
              mS={margenFachada}
              mO={margenFachada}
              mE={margenFachada}
              atenuado={atenuado}
              formaLoseta={formaEnCelda(formas, claveCeldaAbs(absCol, absRow))}
            />
          )
        })}
    </group>
  )
}

function ZonaCuartoConDrag({
  z,
  celdas,
  atenuado,
  resaltado,
  elevado,
  todasZonas,
  bloquearClics,
  moverZonas,
  formasCelda,
}: {
  z: ZonaPlano
  celdas: Cell[]
  atenuado: boolean
  resaltado: boolean
  elevado: boolean
  todasZonas: ZonaPlano[]
  bloquearClics: boolean
  moverZonas: boolean
  formasCelda?: ZonaPlano['formasCelda']
}) {
  const iniciarDrag = useIniciarZonaDrag3D(z.id!, z.celdas)
  return (
    <ZonaCuartoSingle
      z={z}
      celdas={celdas}
      formasCelda={formasCelda}
      atenuado={atenuado}
      resaltado={resaltado}
      elevado={elevado}
      todasZonas={todasZonas}
      bloquearClics={bloquearClics}
      onMoverDown={moverZonas ? iniciarDrag : undefined}
    />
  )
}

/** Cuartos básicos del plano (zonas con geometría 3D completa). */
export function ZonasPlano3D() {
  const planosActivo = usePlanos((s) => s.activo)
  const planosCapa = usePlanos((s) => s.capa)
  const planosHerramienta = usePlanos((s) => s.herramienta)
  const nivelVisible = usePlanos((s) => s.nivel)
  const seleccion = usePlanos((s) => s.seleccion)
  const draggingZonaId = usePlanos((s) => s.draggingZonaId)
  const previewZonaCeldas = usePlanos((s) => s.previewZonaCeldas)
  const zonaDragOrigen = usePlanos((s) => s.zonaDragOrigen)
  const zonas = zonasRepo.useAll() ?? []

  const bloquearClics =
    planosActivo &&
    planosCapa === 'cuartos' &&
    (planosHerramienta === 'agregar' || planosHerramienta === 'editar-forma')
  const moverZonas =
    planosActivo && planosCapa === 'cuartos' && planosHerramienta === 'mover'

  const visibles = useMemo(() => {
    if (planosActivo) return zonas.filter((z) => z.nivel === nivelVisible)
    return zonas
  }, [zonas, planosActivo, nivelVisible])

  if (visibles.length === 0) return null

  return (
    <>
      {visibles.map((z) => {
        const otroNivel = planosActivo && z.nivel !== nivelVisible
        const resaltado = seleccion?.tipo === 'zona' && seleccion.zonaId === z.id
        const arrastrando = draggingZonaId === z.id
        const celdas =
          arrastrando && previewZonaCeldas.length > 0 ? previewZonaCeldas : z.celdas
        let formasEfectivas = z.formasCelda
        if (arrastrando && previewZonaCeldas.length > 0 && z.formasCelda) {
          const origen = zonaDragOrigen.length > 0 ? zonaDragOrigen : z.celdas
          const { dc, dr } = deltaTrasladoAncla(origen, celdas)
          if (dc !== 0 || dr !== 0) {
            formasEfectivas = trasladarFormasCelda(z.formasCelda, dc, dr)
          }
        }
        return (
          <ZonaCuartoConDrag
            key={z.id}
            z={z}
            celdas={celdas}
            formasCelda={formasEfectivas}
            atenuado={otroNivel}
            resaltado={resaltado}
            elevado={arrastrando}
            todasZonas={zonas}
            bloquearClics={bloquearClics}
            moverZonas={moverZonas && !otroNivel}
          />
        )
      })}
    </>
  )
}
