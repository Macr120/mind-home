import { useCallback, useMemo } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { useCam } from '../state/cameraStore'
import { useInteractUi } from '../state/interactUiStore'
import { useDiseño } from '../state/disenoStore'
import { pisosExteriorRepo, zonasRepo } from '../data/repository'
import { useCuartos } from '../state/cuartosStore'
import { cellToWorld, nivelBaseY, subCeldasDeTile } from './walls'
import { PisoCelda } from './PisoCelda'
import { esSinPiso } from './pisos'
import { ocupadoConZonas } from './planoGeometria'
import { cuadrantesDeCelda, matDeRegistroPiso, type MatPiso } from './pisoSubcelda'
import { PisoCuadrantes3D } from './PisoCuadrantes3D'
import { getTema, mezclar } from './temas'
import { useBlobUrlMap } from './useBlobUrlMap'

/** Color de celda exterior sin personalizar (visible, no negro). */
export function colorExteriorDefecto(temaGlobal: ReturnType<typeof useDiseño.getState>['temaGlobal']) {
  const shell = getTema(temaGlobal)?.shell.piso
  return shell ? mezclar('#5a6e58', shell, 0.35) : '#5a6e58'
}

/** Loseta de piso por celda exterior (respeta preview de arrastre de cuartos). */
export function PisosExterior3D() {
  const conTecho = useHouse((s) => s.conTecho)
  const setTarget = useHouse((s) => s.setTarget)
  const editMode = useLayout((s) => s.editMode)
  const placed = useLayout((s) => s.placed)
  const niveles = useLayout((s) => s.niveles)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  const clearInteract = useInteractUi((s) => s.clear)
  const cuartos = useCuartos((s) => s.cuartos)
  const pisos = pisosExteriorRepo.useAll() ?? []
  const zonas = zonasRepo.useAll() ?? []

  const onClickSuelo = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (editMode) return
      if (useCam.getState().vista !== 'iso') return
      e.stopPropagation()
      clearInteract()
      setTarget(e.point.x, e.point.z)
    },
    [editMode, clearInteract, setTarget],
  )

  const nivelesActivos = useMemo(() => {
    const s = new Set<number>([0])
    for (const r of cuartos) {
      if (placed[r.id]) s.add(niveles[r.id] ?? 0)
    }
    return [...s].sort((a, b) => a - b)
  }, [cuartos, placed, niveles])

  const pisosMap = useMemo(() => {
    const m = new Map<string, (typeof pisos)[0]>()
    for (const p of pisos) {
      m.set(`${p.nivel},${p.col},${p.row}`, p)
    }
    return m
  }, [pisos])

  const celdas = useMemo(() => {
    const out: {
      key: string
      nivel: number
      col: number
      row: number
      baseRec?: (typeof pisos)[0]
      quadRecs: ((typeof pisos)[0] | undefined)[]
      /** 4 sub-celdas (NO,NE,SO,SE): true = libre (sin cuarto/zona encima). */
      libres: boolean[]
      hayQuad: boolean
      todasLibres: boolean
    }[] = []
    for (const nivel of nivelesActivos) {
      // Ocupación por SUB-CELDA: un cuarto a ½ celda solo tapa sus sub-celdas, el resto es jardín.
      const ocupado = ocupadoConZonas(nivel, ocupadoPorNivel, zonas)
      const lookup = (c: number, r: number) => pisosMap.get(`${nivel},${c},${r}`)
      for (let col = 0; col < gridCols; col++) {
        for (let row = 0; row < gridRows; row++) {
          const subs = subCeldasDeTile(col, row)
          const libres = subs.map((k) => !ocupado.has(k))
          if (!libres.some(Boolean)) continue // celda totalmente cubierta
          const baseRec = lookup(col, row)
          const { hayAlguno, recs } = cuadrantesDeCelda(col, row, lookup)
          const baseSinPiso = esSinPiso((baseRec?.pisoTipo as string | null | undefined) ?? null)
          const todasLibres = libres.every(Boolean)
          if (todasLibres && !hayAlguno && baseSinPiso) continue
          out.push({
            key: `${nivel}-${col},${row}`,
            nivel,
            col,
            row,
            baseRec,
            quadRecs: recs,
            libres,
            hayQuad: hayAlguno,
            todasLibres,
          })
        }
      }
    }
    return out
  }, [nivelesActivos, ocupadoPorNivel, zonas, gridCols, gridRows, pisosMap])

  const defecto = colorExteriorDefecto(temaGlobal)

  const imagenUrls = useBlobUrlMap(
    celdas.flatMap((c) => [
      {
        key: `${c.key}:b`,
        blob: c.baseRec?.pisoImagen,
        activa: !!(c.baseRec?.pisoImagenActiva && c.baseRec?.pisoImagen),
      },
      ...c.quadRecs.map((q, i) => ({
        key: `${c.key}:q${i}`,
        blob: q?.pisoImagen,
        activa: !!(q?.pisoImagenActiva && q?.pisoImagen),
      })),
    ]),
  )

  if (celdas.length === 0) return null

  const baseDe = (c: (typeof celdas)[0]): MatPiso =>
    c.baseRec
      ? matDeRegistroPiso(c.baseRec, imagenUrls.get(`${c.key}:b`), defecto)
      : { sinPiso: false, color: defecto, roughness: 0.85, metalness: 0, pisoConf: null, pisoImagenAjuste: 'x1' }

  return (
    <>
      {celdas.map((c) => {
        const [wx, , wz] = cellToWorld(c.col, c.row)
        const y = nivelBaseY(c.nivel, conTecho) + 0.02
        const base = baseDe(c)
        // Celda completa y sin overrides: una sola loseta (con clic para caminar).
        if (c.todasLibres && !c.hayQuad) {
          if (base.sinPiso) return null
          return (
            <group key={`pe-${c.key}`} position={[wx, y, wz]}>
              <PisoCelda
                lx={0}
                lz={0}
                color={base.color}
                roughness={base.roughness}
                metalness={base.metalness}
                emissive="#000000"
                emissiveIntensity={0}
                atenuado={false}
                pisoConf={base.pisoConf}
                pisoImagen={base.pisoImagen}
                pisoImagenAjuste={base.pisoImagenAjuste}
                formaLoseta={base.forma}
                onClick={onClickSuelo}
              />
            </group>
          )
        }
        const overrides = c.quadRecs.map((q, i) =>
          q ? matDeRegistroPiso(q, imagenUrls.get(`${c.key}:q${i}`), defecto) : null,
        )
        return (
          <group key={`pe-${c.key}`} position={[wx, y, wz]}>
            <PisoCuadrantes3D cx={0} cz={0} base={base} overrides={overrides} libres={c.libres} />
          </group>
        )
      })}
    </>
  )
}
