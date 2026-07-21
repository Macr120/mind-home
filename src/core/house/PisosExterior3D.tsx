import { useCallback, useMemo } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { useCam } from '../state/cameraStore'
import { useInteractUi } from '../state/interactUiStore'
import { useEditorUi } from '../state/editorUiStore'
import { usePlanos } from '../state/planosStore'
import { useDiseño } from '../state/disenoStore'
import { pisosExteriorRepo } from '../data/repository'
import { useCuartos } from '../state/cuartosStore'
import { cellToWorld, nivelBaseY, subCeldasDeTile } from './walls'
import { PisoCelda } from './PisoCelda'
import { esSinPiso } from './pisos'
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
  const apilado = !useHouse((s) => s.explotado)
  const setTarget = useHouse((s) => s.setTarget)
  const editMode = useLayout((s) => s.editMode)
  const placed = useLayout((s) => s.placed)
  const niveles = useLayout((s) => s.niveles)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  useDiseño((s) => s.temaRev) // refresca el color del jardín al editar el tema en vivo
  const clearInteract = useInteractUi((s) => s.clear)
  const cuartos = useCuartos((s) => s.cuartos)
  const pisos = pisosExteriorRepo.useAll() ?? []

  const onClickSuelo = useCallback(
    (e: ThreeEvent<MouseEvent>, col: number, row: number) => {
      // Editor 3D: tocar el suelo exterior abre el modo Piso ext. y selecciona la celda.
      if (useEditorUi.getState().editor3d) {
        if (usePlanos.getState().modo !== 'piso-ext') {
          e.stopPropagation()
          useEditorUi.getState().setTab('mapa')
          usePlanos.getState().setModo('piso-ext')
          usePlanos.getState().setSeleccion({ tipo: 'exterior', celdas: [{ col, row }] })
        }
        return
      }
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
      // Sótanos: sin capa de suelo propia (su piso lo dibuja el cuarto; el hueco lo
      // abre la planta baja saltando las sub-celdas excavadas).
      if (placed[r.id] && (niveles[r.id] ?? 0) >= 0) s.add(niveles[r.id] ?? 0)
    }
    return [...s].sort((a, b) => a - b)
  }, [cuartos, placed, niveles])

  // Sub-celdas excavadas por sótanos: en planta baja no se dibuja loseta ahí (hueco).
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const subsSotano = useMemo(() => {
    const s = new Set<string>()
    for (const [lvl, occ] of ocupadoPorNivel) {
      if (lvl < 0) for (const k of occ) s.add(k)
    }
    return s
  }, [ocupadoPorNivel])

  const pisosMap = useMemo(() => {
    const m = new Map<string, (typeof pisos)[0]>()
    for (const p of pisos) {
      m.set(`${p.nivel},${p.col},${p.row}`, p)
    }
    return m
  }, [pisos])

  // CAPA continua: el piso exterior se dibuja en TODA la rejilla, sin enmascarar por los
  // cuartos. Es una capa que va por debajo del piso interior de cada cuarto (que se dibuja
  // encima). Así nunca quedan huecos al mover cuartos, en medias celdas, ni con círculo/
  // triángulo: el "exterior" de esas celdas es simplemente esta capa que asoma por debajo.
  const celdas = useMemo(() => {
    const out: {
      key: string
      nivel: number
      col: number
      row: number
      baseRec?: (typeof pisos)[0]
      quadRecs: ((typeof pisos)[0] | undefined)[]
      hayQuad: boolean
      /** Cuadrantes NO excavados por un sótano (false = hueco, sin loseta). */
      libres?: boolean[]
    }[] = []
    for (const nivel of nivelesActivos) {
      const lookup = (c: number, r: number) => pisosMap.get(`${nivel},${c},${r}`)
      for (let col = 0; col < gridCols; col++) {
        for (let row = 0; row < gridRows; row++) {
          const baseRec = lookup(col, row)
          const { hayAlguno, recs } = cuadrantesDeCelda(col, row, lookup)
          const baseSinPiso = esSinPiso((baseRec?.pisoTipo as string | null | undefined) ?? null)
          if (baseSinPiso && !hayAlguno) continue // "sin piso" explícito → se ve la base/rejilla
          // Pisos altos: SIN capa continua de suelo (taparía la planta de abajo). Solo se
          // dibuja una celda si tiene piso pintado a propósito (p. ej. una terraza). La
          // planta baja (0) sí lleva la rejilla/suelo completa.
          if (nivel > 0 && !baseRec && !hayAlguno) continue
          // Hueco de sótano: los cuadrantes excavados no llevan loseta (se ve el pozo).
          const libres =
            nivel === 0 && subsSotano.size > 0
              ? subCeldasDeTile(col, row).map((k) => !subsSotano.has(k))
              : null
          if (libres && libres.every((v) => !v)) continue
          const hayHueco = !!libres && libres.some((v) => !v)
          out.push({
            key: `${nivel}-${col},${row}`,
            nivel,
            col,
            row,
            baseRec,
            quadRecs: recs,
            hayQuad: hayAlguno,
            libres: hayHueco ? libres! : undefined,
          })
        }
      }
    }
    return out
  }, [nivelesActivos, gridCols, gridRows, pisosMap, subsSotano])

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

  const baseDe = (c: (typeof celdas)[0]): MatPiso => {
    const m = c.baseRec
      ? matDeRegistroPiso(c.baseRec, imagenUrls.get(`${c.key}:b`), defecto)
      : { sinPiso: false, color: defecto, roughness: 0.85, metalness: 0, pisoConf: null, pisoImagenAjuste: 'x1' }
    // El piso exterior es la CAPA BASE: siempre cuadrado (sin forma), para asomar entero
    // bajo las losetas con forma del piso interior.
    return { ...m, forma: undefined }
  }

  return (
    <>
      {celdas.map((c) => {
        const [wx, , wz] = cellToWorld(c.col, c.row)
        // Capa exterior: justo debajo del piso interior de los cuartos (que va encima).
        const y = nivelBaseY(c.nivel, apilado) - 0.02
        const base = baseDe(c)
        // Celda sin overrides de cuadrante ni hueco de sótano: una sola loseta.
        if (!c.hayQuad && !c.libres) {
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
                onClick={(e) => onClickSuelo(e, c.col, c.row)}
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
