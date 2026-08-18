import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLayout } from '../../state/layoutStore'
import { useCuartos } from '../../state/cuartosStore'
import { useDiseño } from '../../state/disenoStore'
import {
  usePlanos,
  type ModoConstructor,
  type HerramientaPlano,
  type DetalleRejillaPlano,
} from '../../state/planosStore'
import { VACIO, zonasRepo } from '../../data/repository'
import { nivelMaximo, nivelMinimo } from '../../house/planoGeometria'
import {
  esGrupoExteriorCompleto,
  seleccionPisosExteriores,
  seleccionPisosInteriores,
} from '../../house/planoPisoSeleccion'
import { PlanosEditor } from './PlanosEditor'
import { PlanoPanelProps } from './PlanoPanelProps'
import { LosetaFormaSvg } from '../comun/LosetaFormaSvg'
import { EditorMuroLibre } from './EditorMuroLibre'
import { PreviewMuroLibre3D } from './PreviewMuroLibre3D'
import { PreviewCuarto3D } from '../editor/PreviewCuarto3D'
import type { FormaLoseta } from '../../house/formasLoseta'
import { EditorMapaSuperficieSection } from './EditorMapaSuperficieSection'
import { EditorCuadrantesSection } from './EditorCuadrantesSection'
import { EditorFondoSection } from '../editor/EditorFondoSection'
import { footprintCells, FOOTPRINT_DEFAULT, MAX_GRID, type Footprint, type Cell, type TipoAcceso } from '../../house/walls'
import { pintarCuarto } from '../../state/pintarCuarto'
import type { DirGrid } from '../../state/layoutStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'

type ModoCfg = { id: ModoConstructor; labelEs: string; emoji: string; color?: string }

const MODOS: ModoCfg[] = [
  { id: 'grid', labelEs: 'Grid', emoji: '▦', color: '#34d399' },
  { id: 'fondo', labelEs: 'Fondo', emoji: '☁️', color: '#a78bfa' },
  { id: 'cuartos', labelEs: 'Cuartos', emoji: '🏠', color: '#f472b6' },
  { id: 'muros', labelEs: 'Muros', emoji: '🧱', color: '#b45309' },
  { id: 'puertas', labelEs: 'Puertas', emoji: '🚪', color: '#22c55e' },
  { id: 'ventanas', labelEs: 'Ventanas', emoji: '🪟', color: '#38bdf8' },
  { id: 'piso-ext', labelEs: 'Piso ext.', emoji: '🌿', color: '#84cc16' },
  { id: 'piso-int', labelEs: 'Piso int.', emoji: '🟫', color: '#a8763e' },
  { id: 'techos', labelEs: 'Techos', emoji: '🔺', color: '#f97316' },
]

const HERR_CUARTOS: { id: HerramientaPlano; labelEs: string; icon: string }[] = [
  { id: 'mover', labelEs: 'Mover', icon: '✥' },
  { id: 'expandir', labelEs: 'Expandir', icon: '⤢' },
]

function Chip({
  activo,
  onClick,
  children,
  accent,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
  accent?: string
}) {
  // Color de marca del chip (acento propio o verde por defecto). Con `texto-vivo`
  // el texto usa ese color en oscuro y una versión entintada legible en claro.
  const c = accent ?? '#34d399'
  const conColor = activo || accent != null
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition${conColor ? ' texto-vivo' : ''}`}
      style={
        activo
          ? {
              ...vivo(c),
              background: `color-mix(in srgb, ${c} 20%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 55%, transparent)`,
            }
          : accent != null
            ? { ...vivo(c), background: 'color-mix(in srgb, var(--ui-ink) 6%, transparent)' }
            : {
                background: 'color-mix(in srgb, var(--ui-ink) 6%, transparent)',
                color: 'color-mix(in srgb, var(--ui-ink) 55%, transparent)',
              }
      }
    >
      {children}
    </button>
  )
}

/** ¿Se puede contraer ese borde? (mín. 1 celda y sin cuartos pegados al borde). */
function puedeContraerDir(
  dir: DirGrid,
  gridCols: number,
  gridRows: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
): boolean {
  if ((dir === 'E' || dir === 'O') && gridCols <= 1) return false
  if ((dir === 'N' || dir === 'S') && gridRows <= 1) return false
  const ids = Object.keys(placed).filter((id) => placed[id] && cells[id])
  return !ids.some((id) =>
    footprintCells(cells[id], footprints[id] ?? FOOTPRINT_DEFAULT).some((c) =>
      dir === 'E'
        ? c.col > gridCols - 2
        : dir === 'O'
          ? c.col < 1
          : dir === 'S'
            ? c.row > gridRows - 2
            : c.row < 1,
    ),
  )
}

function BotonResize({
  signo,
  onClick,
  disabled,
  title,
}: {
  signo: '+' | '−'
  onClick: () => void
  disabled: boolean
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        // Mismos colores que los +/− del grid 3D (`house/GridResizer`): el chip sigue
        // el tema (`ui-panel-glass`) y los signos usan el 400, que en claro se
        // reentinta al 600 desde index.css.
        'ui-panel-glass flex h-6 w-6 items-center justify-center rounded-md border border-white/20 text-sm font-black shadow-sm transition disabled:opacity-25',
        signo === '+' ? 'text-emerald-400 hover:bg-emerald-400/20' : 'text-red-400 hover:bg-red-400/20',
      ].join(' ')}
    >
      {signo}
    </button>
  )
}

/** Botones +/- en los 4 bordes del croquis (modo Grid) para cambiar el tamaño del mapa. */
function ResizeBordesCroquis() {
  const t = useT()
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const expandGrid = useLayout((s) => s.expandGrid)
  const contractGrid = useLayout((s) => s.contractGrid)

  const par = (dir: DirGrid, vertical: boolean) => {
    const eje = dir === 'E' || dir === 'O'
    const puedeExpandir = eje ? gridCols < MAX_GRID : gridRows < MAX_GRID
    const puedeContraer = puedeContraerDir(dir, gridCols, gridRows, placed, cells, footprints)
    return (
      <div className={`flex gap-1 ${vertical ? 'flex-col' : ''}`}>
        <BotonResize
          signo="+"
          onClick={() => void expandGrid(dir)}
          disabled={!puedeExpandir}
          title={t('constructor.grid.ampliar', 'Ampliar')}
        />
        <BotonResize
          signo="−"
          onClick={() => void contractGrid(dir)}
          disabled={!puedeContraer}
          title={t('constructor.grid.reducir', 'Reducir')}
        />
      </div>
    )
  }

  return (
    <>
      <div className="absolute left-1/2 top-1.5 z-30 -translate-x-1/2">{par('N', false)}</div>
      <div className="absolute bottom-1.5 left-1/2 z-30 -translate-x-1/2">{par('S', false)}</div>
      <div className="absolute start-1.5 top-1/2 z-30 -translate-y-1/2">{par('O', true)}</div>
      <div className="absolute end-1.5 top-1/2 z-30 -translate-y-1/2">{par('E', true)}</div>
    </>
  )
}

/** Indicador/selector del nivel de planta actual, sobre la esquina sup. izq. del croquis. */
function NivelOverlay({
  nivel,
  minNivel,
  maxNivel,
  nuevoNivel,
  nuevoSotano,
  setNivel,
}: {
  nivel: number
  /** Nivel más bajo ya construido (-1 si hay sótano; 0 si no). */
  minNivel: number
  maxNivel: number
  /** Nivel nuevo construible (un piso por encima del máximo) o null si no aplica. */
  nuevoNivel: number | null
  /** Sótano nuevo excavable (-1) o null si no aplica (ya existe o no es modo Cuartos). */
  nuevoSotano: number | null
  setNivel: (n: number) => void
}) {
  const t = useT()
  return (
    <div className="ui-panel-glass absolute start-1.5 top-1.5 z-30 flex items-center gap-1 rounded-lg px-1.5 py-1 shadow-sm backdrop-blur">
      <span className="px-0.5 text-[9px] font-bold uppercase tracking-wider text-white/45">
        {t('planos.nivel', 'Nivel')}
      </span>
      {/* Botón para excavar el sótano (cuartos bajo la rejilla: albercas o búnkers). */}
      {nuevoSotano != null && (
        <button
          type="button"
          onClick={() => setNivel(nuevoSotano)}
          title={t('planos.nivelSotano', 'Excavar un sótano (alberca o búnker)')}
          className="texto-vivo flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[11px] font-bold transition"
          style={
            nivel === nuevoSotano
              ? {
                  ...vivo('#fbbf24'),
                  background: 'color-mix(in srgb, #fbbf24 22%, transparent)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, #fbbf24 60%, transparent)',
                }
              : vivo('#fbbf24')
          }
        >
          {nuevoSotano}
        </button>
      )}
      {Array.from({ length: maxNivel - minNivel + 1 }, (_, k) => minNivel + k).map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => setNivel(i)}
          className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[11px] font-bold transition${nivel === i ? ' texto-vivo' : ''}`}
          style={
            nivel === i
              ? {
                  ...vivo('#34d399'),
                  background: 'color-mix(in srgb, #34d399 22%, transparent)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, #34d399 60%, transparent)',
                }
              : { color: 'color-mix(in srgb, var(--ui-ink) 50%, transparent)' }
          }
        >
          {i}
        </button>
      ))}
      {/* Botón para estrenar un piso nuevo encima del máximo (crear cuartos arriba). */}
      {nuevoNivel != null && (
        <button
          type="button"
          onClick={() => setNivel(nuevoNivel)}
          title={t('planos.nivelNuevo', 'Construir un piso nuevo encima')}
          className="texto-vivo flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[11px] font-bold transition"
          style={
            nivel === nuevoNivel
              ? {
                  ...vivo('#38bdf8'),
                  background: 'color-mix(in srgb, #38bdf8 22%, transparent)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, #38bdf8 60%, transparent)',
                }
              : vivo('#38bdf8')
          }
        >
          +{nuevoNivel}
        </button>
      )}
    </div>
  )
}

/** Toggle de rejilla fina / normal, sobre la esquina sup. der. del croquis (modos de piso). */
function DetalleOverlay({
  detalle,
  setDetalle,
}: {
  detalle: DetalleRejillaPlano
  setDetalle: (d: DetalleRejillaPlano) => void
}) {
  const t = useT()
  const btn = (tipo: DetalleRejillaPlano, fino: boolean) => {
    const activo = detalle === tipo
    return (
      <button
        type="button"
        onClick={() => setDetalle(tipo)}
        title={
          fino
            ? t('planos.detalle.subcelda', 'Celdas finas (½)')
            : t('planos.detalle.celda', 'Celdas normales')
        }
        className="flex h-6 w-6 items-center justify-center rounded-md transition"
        style={
          activo
            ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
            : undefined
        }
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-4 w-4 ${activo ? 'text-emerald-400' : 'text-white/65'}`}
          aria-hidden
        >
          {!fino ? (
            <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          ) : (
            <>
              <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
              <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="0.75" />
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="0.75" />
            </>
          )}
        </svg>
      </button>
    )
  }
  return (
    <div className="ui-panel-glass absolute end-1.5 top-1.5 z-30 flex items-center gap-0.5 rounded-lg px-1 py-1 shadow-sm backdrop-blur">
      {btn('celda', false)}
      {btn('subcelda', true)}
    </div>
  )
}

/** Selector de forma del muro libre (cuadrado/triángulo/círculo), esquina inf. izq. (modo Muros). */
function FormaMuroOverlay({
  forma,
  setForma,
}: {
  forma: FormaLoseta
  setForma: (f: FormaLoseta) => void
}) {
  const t = useT()
  const orientMuro = usePlanos((s) => s.orientMuro)
  const setOrientMuro = usePlanos((s) => s.setOrientMuro)
  const rotForma = usePlanos((s) => s.rotForma)
  const setRotForma = usePlanos((s) => s.setRotForma)
  const FORMAS: { id: FormaLoseta; label: string }[] = [
    { id: 'cuadrado', label: t('constructor.muro.lados', 'Lados (aristas)') },
    { id: 'triangular', label: t('constructor.muro.triangulo', 'Triángulo') },
    { id: 'circular', label: t('constructor.muro.circulo', 'Círculo') },
  ]
  const ORIENTS: { id: 'h' | 'v'; label: string }[] = [
    { id: 'h', label: t('constructor.muro.horizontal', 'Horizontal') },
    { id: 'v', label: t('constructor.muro.vertical', 'Vertical') },
  ]
  // Las dos diagonales del triángulo: 0° ("\") y su opuesta 90° ("/").
  const DIAGS: { rot: 0 | 90 | 180 | 270; label: string }[] = [
    { rot: 0, label: t('constructor.muro.diagonal1', 'Diagonal') },
    { rot: 90, label: t('constructor.muro.diagonal2', 'Diagonal opuesta') },
  ]
  // Las 4 esquinas donde puede curvar el muro circular (misma rotación que esquinaCuartoCirculo).
  const CURVAS: { rot: 0 | 90 | 180 | 270; label: string; d: string }[] = [
    { rot: 0, label: t('constructor.muro.curvaSupDer', 'Curva sup. derecha'), d: 'M13,0 A13,13 0 0,0 26,13' },
    { rot: 90, label: t('constructor.muro.curvaInfDer', 'Curva inf. derecha'), d: 'M13,26 A13,13 0 0,1 26,13' },
    { rot: 180, label: t('constructor.muro.curvaInfIzq', 'Curva inf. izquierda'), d: 'M0,13 A13,13 0 0,1 13,26' },
    { rot: 270, label: t('constructor.muro.curvaSupIzq', 'Curva sup. izquierda'), d: 'M13,0 A13,13 0 0,1 0,13' },
  ]
  return (
    <div className="ui-panel-glass absolute bottom-1.5 start-1.5 z-30 flex items-center gap-0.5 rounded-lg px-1 py-1 shadow-sm backdrop-blur">
      {FORMAS.map((f) => {
        const activo = forma === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setForma(f.id)}
            title={f.label}
            className="flex h-7 w-7 items-center justify-center rounded-md transition"
            style={
              activo
                ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
                : undefined
            }
          >
            <svg width={18} height={18} viewBox="0 0 26 26" aria-hidden>
              <LosetaFormaSvg
                x={0}
                y={0}
                w={26}
                h={26}
                forma={{ forma: f.id, rotacion: 0 }}
                fill={activo ? '#a7f3d0' : '#94a3b8'}
                rx={4}
              />
            </svg>
          </button>
        )
      })}
      {/* Solo la forma "Lados" coloca muros rectos: elige forzar horizontal o vertical. */}
      {forma === 'cuadrado' && (
        <>
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          {ORIENTS.map((o) => {
            const activo = orientMuro === o.id
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setOrientMuro(o.id)}
                title={o.label}
                className="flex h-7 w-7 items-center justify-center rounded-md transition"
                style={
                  activo
                    ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
                    : undefined
                }
              >
                <svg width={18} height={18} viewBox="0 0 26 26" aria-hidden>
                  <line
                    x1={o.id === 'h' ? 4 : 13}
                    y1={o.id === 'h' ? 13 : 4}
                    x2={o.id === 'h' ? 22 : 13}
                    y2={o.id === 'h' ? 13 : 22}
                    stroke={activo ? '#a7f3d0' : '#94a3b8'}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )
          })}
        </>
      )}
      {/* Triángulo: elegir la diagonal (este sentido o el opuesto). */}
      {forma === 'triangular' && (
        <>
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          {DIAGS.map((d) => {
            const activo = rotForma === d.rot
            return (
              <button
                key={d.rot}
                type="button"
                onClick={() => setRotForma(d.rot)}
                title={d.label}
                className="flex h-7 w-7 items-center justify-center rounded-md transition"
                style={
                  activo
                    ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
                    : undefined
                }
              >
                <svg width={18} height={18} viewBox="0 0 26 26" aria-hidden>
                  <line
                    x1={4}
                    y1={d.rot === 0 ? 4 : 22}
                    x2={22}
                    y2={d.rot === 0 ? 22 : 4}
                    stroke={activo ? '#a7f3d0' : '#94a3b8'}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )
          })}
        </>
      )}
      {/* Círculo: elegir en qué esquina de la celda curva el muro. */}
      {forma === 'circular' && (
        <>
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          {CURVAS.map((c) => {
            const activo = rotForma === c.rot
            return (
              <button
                key={c.rot}
                type="button"
                onClick={() => setRotForma(c.rot)}
                title={c.label}
                className="flex h-7 w-7 items-center justify-center rounded-md transition"
                style={
                  activo
                    ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
                    : undefined
                }
              >
                <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden>
                  <path
                    d={c.d}
                    fill="none"
                    stroke={activo ? '#a7f3d0' : '#94a3b8'}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

/**
 * Pincel de forma del modo Cuartos (cuadrado/triángulo/círculo), esquina inf. izq.
 * Con una forma activa se coloca/altera celdas; tocar la activa la desactiva (vuelve a
 * mover/crecer). Sin forma activa se ven los botones +/− para crecer los cuartos.
 */
function FormaCuartoOverlay({
  forma,
  setForma,
}: {
  forma: FormaLoseta | null
  setForma: (f: FormaLoseta | null) => void
}) {
  const t = useT()
  const rotForma = usePlanos((s) => s.rotForma)
  const setRotForma = usePlanos((s) => s.setRotForma)
  const FORMAS: { id: FormaLoseta; label: string }[] = [
    { id: 'cuadrado', label: t('constructor.forma.cuadrado', 'Cuadrado') },
    { id: 'triangular', label: t('constructor.forma.triangulo', 'Triángulo') },
    { id: 'circular', label: t('constructor.forma.circulo', 'Círculo') },
  ]
  // Las 4 posiciones (rotaciones) del triángulo/círculo: mismas figuras rotadas.
  const ROTS: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270]
  const formaConVariantes = forma === 'triangular' || forma === 'circular'
  return (
    <div className="ui-panel-glass absolute bottom-1.5 start-1.5 z-30 flex items-center gap-0.5 rounded-lg px-1 py-1 shadow-sm backdrop-blur">
      {FORMAS.map((f) => {
        const activo = forma === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setForma(activo ? null : f.id)}
            title={f.label}
            className="flex h-7 w-7 items-center justify-center rounded-md transition"
            style={
              activo
                ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
                : undefined
            }
          >
            <svg width={18} height={18} viewBox="0 0 26 26" aria-hidden>
              <LosetaFormaSvg
                x={0}
                y={0}
                w={26}
                h={26}
                forma={{ forma: f.id, rotacion: 0 }}
                fill={activo ? '#a7f3d0' : '#94a3b8'}
                rx={4}
              />
            </svg>
          </button>
        )
      })}
      {/* Triángulo/círculo: elegir la posición (misma figura rotada). */}
      {formaConVariantes && (
        <>
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          {ROTS.map((rot) => {
            const activo = rotForma === rot
            return (
              <button
                key={rot}
                type="button"
                onClick={() => setRotForma(rot)}
                title={t('constructor.forma.posicion', 'Posición')}
                className="flex h-7 w-7 items-center justify-center rounded-md transition"
                style={
                  activo
                    ? { background: 'rgba(52,211,153,0.22)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
                    : undefined
                }
              >
                <svg width={18} height={18} viewBox="0 0 26 26" aria-hidden>
                  <LosetaFormaSvg
                    x={0}
                    y={0}
                    w={26}
                    h={26}
                    forma={{ forma: forma as FormaLoseta, rotacion: rot }}
                    fill={activo ? '#a7f3d0' : '#94a3b8'}
                    rx={4}
                  />
                </svg>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

/** Panel compacto del modo Cuartos: nombre, color y lista de cuartos colocados. */
function CuartosPanel() {
  const t = useT()
  const seleccion = usePlanos((s) => s.seleccion)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const cuartos = useCuartos((s) => s.cuartos)
  const renombrar = useCuartos((s) => s.renombrar)
  const eliminarCuarto = useCuartos((s) => s.eliminar)
  const placed = useLayout((s) => s.placed)
  const nivelesLayout = useLayout((s) => s.niveles)
  const conAgua = useLayout((s) => s.conAgua)
  const setAgua = useLayout((s) => s.setAgua)

  const roomId = seleccion?.tipo === 'cuarto' ? seleccion.roomId : null
  const room = cuartos.find((c) => c.id === roomId) ?? null
  const [nombre, setNombre] = useState(room?.nombre ?? '')

  // Re-siembra el borrador al cambiar el cuarto o su nombre guardado (ajuste en render, sin efecto).
  const nombreGuardado = room?.nombre ?? ''
  const [prevNombre, setPrevNombre] = useState({ roomId, nombreGuardado })
  if (prevNombre.roomId !== roomId || prevNombre.nombreGuardado !== nombreGuardado) {
    setPrevNombre({ roomId, nombreGuardado })
    setNombre(nombreGuardado)
  }

  const guardarNombre = () => {
    if (roomId && nombre.trim()) void renombrar(roomId, nombre.trim())
  }

  /** Llenar de agua un sótano lo vuelve alberca: nace con su dona flotadora. */
  const cambiarAgua = async (id: string, v: boolean) => {
    await setAgua(id, v)
    await useDiseño.getState().sincronizarFlotadorAlberca(id, v)
  }

  // Aquí el usuario está justo en el editor de muros: se repintan siempre.
  const cambiarColor = (id: string, color: string) => void pintarCuarto(id, color, true)

  const colocados = cuartos.filter((r) => placed[r.id])

  return (
    <div className="space-y-2">
      {room && (
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={room.color}
            onChange={(e) => cambiarColor(room.id, e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            title={t('constructor.cuarto.color', 'Color del cuarto')}
          />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre() }}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
            placeholder={t('constructor.cuarto.nombre', 'Nombre')}
          />
        </div>
      )}
      {/* Sótano seleccionado: llenarlo de agua lo vuelve alberca (destapada, con olas). */}
      {room && (nivelesLayout[room.id] ?? 0) < 0 && (
        <Chip
          activo={!!conAgua[room.id]}
          onClick={() => void cambiarAgua(room.id, !conAgua[room.id])}
          accent="#38bdf8"
        >
          <span className="me-1"><Icono emoji="💧" /></span>
          {t('constructor.cuarto.agua', 'Llenar de agua (alberca)')}
        </Chip>
      )}
      {/* Borrar el cuarto seleccionado. Si tiene apps asignadas, `eliminar` deja la
          petición pendiente y el modal global (EliminarCuartoDialog) pide confirmación. */}
      {room && (
        <button
          type="button"
          onClick={() => {
            void eliminarCuarto(room.id)
            setSeleccion(null)
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-400/20"
        >
          <Icono nombre="basura" /> {t('planos.eliminarCuarto', 'Eliminar cuarto')}
        </button>
      )}
      {colocados.length > 0 ? (
        <div className="max-h-28 space-y-0.5 overflow-y-auto">
          {colocados.map((r) => {
            const activo = r.id === roomId
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSeleccion({ tipo: 'cuarto', roomId: r.id })}
                className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-start text-[11px] transition${activo ? ' texto-vivo' : ''}`}
                style={
                  activo
                    ? { ...vivo(r.color), background: `${r.color}22`, boxShadow: `inset 0 0 0 1px ${r.color}55` }
                    : { color: 'color-mix(in srgb, var(--ui-ink) 55%, transparent)' }
                }
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="truncate">{r.nombre}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-[11px] text-white/40">
          {t('constructor.cuarto.vacio', 'Dibuja cuartos con las formas de abajo.')}
        </p>
      )}
    </div>
  )
}

const TIPOS_ASCENSO: { tipo: TipoAcceso; icon: string; labelEs: string }[] = [
  { tipo: 'escalera', icon: '🌀', labelEs: 'Escalera' },
  { tipo: 'elevador', icon: '🛗', labelEs: 'Elevador' },
  { tipo: 'resbaladilla', icon: '💨', labelEs: 'Resbaladilla' },
]

/** Panel del modo Ascensos: cambia el tipo del ascenso del nivel y recuerda cómo moverlo. */
function AscensosPanel() {
  const t = useT()
  const nivel = usePlanos((s) => s.nivel)
  const accesos = useLayout((s) => s.accesos)
  const setAccesoTipo = useLayout((s) => s.setAccesoTipo)
  const acceso = accesos.find((a) => a.nivel === nivel)

  if (!acceso) {
    return (
      <p className="text-[11px] text-white/45">
        {nivel < 0
          ? t('ascensos.sinAccesoSotano', 'Excava un cuarto de sótano para colocar la escalera marina.')
          : t('ascensos.sinAcceso', 'Este nivel aún no tiene ascenso.')}
      </p>
    )
  }

  // Sótano: la escalera marina es el único ascenso (decorativa; se baja/sube caminando).
  if (nivel < 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-[11px] text-sky-200">
          <Icono emoji="🪜" /> {t('ascensos.escaleraMarina', 'Escalera marina')}
        </div>
        <p className="text-[10px] leading-snug text-white/45">
          {t(
            'ascensos.hintSotano',
            'Arrástrala en el mapa 3D para moverla a otra pared del pozo. El personaje baja y sube caminando sobre la alberca.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('ascensos.tipo', 'Tipo de ascenso')}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {TIPOS_ASCENSO.map((a) => (
          <Chip
            key={a.tipo}
            activo={acceso.tipo === a.tipo}
            onClick={() => acceso.id != null && void setAccesoTipo(acceso.id, a.tipo)}
          >
            <span className="me-1"><Icono emoji={a.icon} /></span>
            {t(`construir.${a.tipo}.label` as Parameters<typeof t>[0], a.labelEs)}
          </Chip>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-white/45">
        {t(
          'ascensos.hint',
          'Arrastra el ascenso en el mapa 3D para moverlo a otra esquina de un cuarto de este nivel. Va siempre en una esquina para no tapar las puertas.',
        )}
      </p>
    </div>
  )
}

/**
 * Constructor unificado de "Editar mapa": barra de modos arriba, croquis 2D
 * compartido en medio y, abajo, los menús contextuales para editar cada cosa.
 * Reutiliza el motor de planos (capa/herramienta) y la edición por selección.
 */
export function ConstructorMapa() {
  const t = useT()

  const modo = usePlanos((s) => s.modo)
  const setModo = usePlanos((s) => s.setModo)
  const setActivo = usePlanos((s) => s.setActivo)
  const nivel = usePlanos((s) => s.nivel)
  const setNivel = usePlanos((s) => s.setNivel)
  const herramienta = usePlanos((s) => s.herramienta)
  const setHerramienta = usePlanos((s) => s.setHerramienta)
  const detalleRejilla = usePlanos((s) => s.detalleRejilla)
  const setDetalleRejilla = usePlanos((s) => s.setDetalleRejilla)
  const pincelForma = usePlanos((s) => s.pincelForma)
  const setPincelForma = usePlanos((s) => s.setPincelForma)
  const formaMuro = usePlanos((s) => s.formaMuro)
  const setFormaMuro = usePlanos((s) => s.setFormaMuro)
  const muroLibreSel = usePlanos((s) => s.muroLibreSel)
  const seleccion = usePlanos((s) => s.seleccion)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const previewVisible = usePlanos((s) => s.previewVisible)
  const setPreviewVisible = usePlanos((s) => s.setPreviewVisible)
  const croquisVisible = usePlanos((s) => s.croquisVisible)
  const setCroquisVisible = usePlanos((s) => s.setCroquisVisible)

  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const niveles = useLayout((s) => s.niveles)
  const accesos = useLayout((s) => s.accesos)
  const cuartos = useCuartos((s) => s.cuartos)
  const zonas = zonasRepo.useAll() ?? VACIO
  // El drag de "mover cuarto" selecciona el cuarto en el mousedown (mismo gesto), lo que
  // abriría el preview a mitad del arrastre: montar ahí el Canvas del modelo 3D desplaza
  // el scroll del panel y el croquis pierde la posición en pantalla que el arrastre viene
  // rastreando (el cuarto se queda "pegado" al cursor). Ocultarlo mientras se arrastra.
  const arrastrandoCuarto = useLayout((s) => s.draggingId != null)

  // Sincroniza el motor 3D con el modo guardado al montar; lo apaga al salir.
  useEffect(() => {
    setModo(usePlanos.getState().modo)
    return () => setActivo(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxNivel = useMemo(
    () => nivelMaximo(placed, niveles, accesos),
    [placed, niveles, accesos],
  )
  const minNivel = useMemo(() => nivelMinimo(placed, niveles), [placed, niveles])

  // Solo en modo Cuartos y con cuartos ya colocados se ofrece estrenar el piso de arriba:
  // los cuartos altos solo se crean encima de los existentes.
  const hayCuartos = useMemo(
    () => cuartos.some((r) => placed[r.id] && cells[r.id]),
    [cuartos, placed, cells],
  )
  const nuevoNivel = modo === 'cuartos' && hayCuartos ? maxNivel + 1 : null
  // El sótano (-1) se excava en cualquier celda libre (albercas/búnkers), sin requisitos.
  const nuevoSotano = modo === 'cuartos' && minNivel === 0 ? -1 : null

  // Mantén el nivel seleccionado dentro de lo válido (al salir de Cuartos no queda un
  // piso vacío seleccionado por encima del máximo ni un sótano sin excavar).
  useEffect(() => {
    const maxSel = nuevoNivel ?? maxNivel
    const minSel = nuevoSotano ?? minNivel
    if (nivel > maxSel) setNivel(maxSel)
    else if (nivel < minSel) setNivel(minSel)
  }, [nivel, maxNivel, nuevoNivel, minNivel, nuevoSotano, setNivel])

  const grupoInteriorActivo = seleccion?.tipo === 'pisos-interiores'
  const grupoExteriorActivo = esGrupoExteriorCompleto(seleccion, nivel, zonas)

  // Modos con modelo 3D editable (todos los elementos menos el piso exterior, que no
  // pertenece a un cuarto; Grid/Fondo/Ascensos tampoco tienen elemento que aislar).
  const con3d =
    modo === 'cuartos' ||
    modo === 'muros' ||
    modo === 'puertas' ||
    modo === 'ventanas' ||
    modo === 'piso-int' ||
    modo === 'techos'
  // Al menos una vista activa: apagar la última enciende la otra (conmuta).
  const toggleCroquis = () => {
    if (croquisVisible && !previewVisible) setPreviewVisible(true)
    setCroquisVisible(!croquisVisible)
  }
  const toggle3d = () => {
    if (previewVisible && !croquisVisible) setCroquisVisible(true)
    setPreviewVisible(!previewVisible)
  }

  return (
    <div className="space-y-3">
      {/* Barra de modos — 3×3. Fuera de la planta baja (pisos altos y sótano) el espacio
          de "Piso ext." pasa a ser "Ascensos" (mover el ascenso y cambiar su tipo). */}
      <div className="grid grid-cols-3 gap-1.5">
        {MODOS.map((m) => {
          if (m.id === 'piso-ext' && nivel !== 0) {
            return (
              <Chip key="ascensos" activo={modo === 'ascensos'} onClick={() => setModo('ascensos')}>
                <Icono nombre="elevador" /> {t('constructor.modo.ascensos', 'Ascensos')}
              </Chip>
            )
          }
          return (
            <Chip key={m.id} activo={modo === m.id} onClick={() => setModo(m.id)} accent={m.color}>
              <Icono emoji={m.emoji} /> {t(`constructor.modo.${m.id}`, m.labelEs)}
            </Chip>
          )
        })}
      </div>

      {/* Fondo de cielo: ocupa el lugar del croquis con su configuración. */}
      {modo === 'fondo' ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <EditorFondoSection embed />
        </div>
      ) : (
        <>
      {/* Selector de vista de trabajo: croquis 2D y/o modelo 3D editable (pueden estar
          ambos activos a la vez; apagar el último conmuta al otro). */}
      {con3d && (
        <div className="grid grid-cols-2 gap-1.5">
          <Chip activo={croquisVisible} onClick={toggleCroquis}>
            <Icono emoji="🗺️" /> {t('constructor.vista.croquis', 'Croquis')}
          </Chip>
          <Chip activo={previewVisible} onClick={toggle3d}>
            <Icono emoji="🧊" /> {t('constructor.vista.modelo3d', 'Modelo 3D')}
          </Chip>
        </div>
      )}

      {/* Croquis 2D compartido. En los bordes/esquinas, overlays según el modo:
          Grid → +/- de tamaño; resto → nivel (sup. izq.) y detalle fino/normal (sup. der.). */}
      {(!con3d || croquisVisible) && (
      <div
        // Modo Grid: el croquis se queda fijo arriba (como los previews 3D del editor)
        // para no perderlo de vista al usar los controles de abajo. En los demás modos
        // ese sitio lo ocupa el preview 3D, que ya es `sticky`.
        className={`relative h-64 w-full overflow-hidden rounded-xl border border-white/10 bg-stone-200 ${
          modo === 'grid' ? 'sticky top-0 z-10' : ''
        }`}
      >
        <PlanosEditor compacto />
        {modo === 'grid' && <ResizeBordesCroquis />}
        {modo !== 'grid' && (
          <NivelOverlay
            nivel={nivel}
            minNivel={minNivel}
            maxNivel={maxNivel}
            nuevoNivel={nuevoNivel}
            nuevoSotano={nuevoSotano}
            setNivel={setNivel}
          />
        )}
        {/* La rejilla fina aplica al piso exterior y al modo Cuartos (esquinas finas con
            el pincel); el piso interior solo selecciona el cuarto. */}
        {(modo === 'piso-ext' || modo === 'cuartos') && (
          <DetalleOverlay detalle={detalleRejilla} setDetalle={setDetalleRejilla} />
        )}
        {/* El selector de forma solo aplica al CREAR (no al seleccionar). */}
        {modo === 'muros' && herramienta === 'muro' && (
          <FormaMuroOverlay forma={formaMuro} setForma={setFormaMuro} />
        )}
        {modo === 'cuartos' && (
          <FormaCuartoOverlay forma={pincelForma} setForma={setPincelForma} />
        )}
      </div>
      )}

      {/* Modelo 3D editable del elemento seleccionado (se abre solo al seleccionar; se
          cierra con el ojo o con el chip 3D). Tocar piso/muros/puertas/techo en el mini 3D
          selecciona ese elemento, igual que en el croquis o en el mapa 3D grande.
          Muro independiente → preview aislada; pared de cuarto (arista) → cuarto enfocado
          en esa pared; cuarto → cuarto entero (en Techos arranca con el techo puesto).
          El piso exterior no pertenece a un cuarto: sin modelo 3D. */}
      {con3d &&
        previewVisible &&
        !arrastrandoCuarto &&
        (muroLibreSel != null ? (
          <PreviewMuroLibre3D muroId={muroLibreSel} onOcultar={() => setPreviewVisible(false)} />
        ) : seleccion?.tipo === 'arista' ? (
          <PreviewCuarto3D
            roomId={seleccion.roomId}
            arista={{ off: seleccion.off, side: seleccion.side }}
            interactivo
            onOcultar={() => setPreviewVisible(false)}
          />
        ) : seleccion?.tipo === 'cuarto' ? (
          <PreviewCuarto3D
            roomId={seleccion.roomId}
            techoInicial={modo === 'techos'}
            interactivo
            onOcultar={() => setPreviewVisible(false)}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 px-3 py-5 text-center text-[11px] leading-snug text-white/40">
            {t(
              'constructor.vista.hint3d',
              'Toca un elemento en el croquis o en el mapa 3D para verlo y editarlo aquí.',
            )}
          </p>
        ))}

      {/* Menús contextuales por modo */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        {modo === 'grid' ? (
          <div className="space-y-4">
            {/* Solo aparece en mapas grandes (ver hayCuadrantes). */}
            <EditorCuadrantesSection />
            <EditorMapaSuperficieSection embed />
          </div>
        ) : (
          <div className="space-y-4">
            {modo === 'cuartos' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {HERR_CUARTOS.map((h) => (
                    <Chip
                      key={h.id}
                      activo={herramienta === h.id}
                      onClick={() => setHerramienta(h.id)}
                    >
                      <span className="me-1"><Icono emoji={h.icon} /></span>
                      {t(`planos.herr.${h.id}`, h.labelEs)}
                    </Chip>
                  ))}
                </div>
                {nivel < 0 && (
                  <p className="text-[10px] leading-snug text-amber-200/80">
                    {t(
                      'constructor.cuarto.hintSotano',
                      'Sótano: los cuartos se excavan bajo el suelo con la profundidad de un muro (albercas o búnkers). Selecciona uno para llenarlo de agua.',
                    )}
                  </p>
                )}
                <p className="text-[10px] leading-snug text-white/45">
                  {herramienta === 'expandir'
                    ? t(
                        'constructor.cuarto.hintExpandir',
                        'Toca + para crecer un cuarto y − para recortarlo. En un cuarto de una sola celda, − lo elimina.',
                      )
                    : pincelForma && detalleRejilla === 'subcelda'
                      ? t(
                          'constructor.cuarto.hintPincelFino',
                          'Rejilla fina: toca un cuadrante de un cuarto para recortar esa esquina (triángulo o círculo); vuelve a tocar para rotar y, al final, quitar el recorte. En una celda libre crea un cuarto con esa esquina fina.',
                        )
                      : pincelForma
                        ? t(
                            'constructor.cuarto.hintPincel',
                            'Toca una celda libre para crear un cuarto con esa forma. Vuelve a tocar la misma celda para rotar y, al final, borrarla. Toca una celda de un cuarto para cambiarle la forma. Con la rejilla fina (arriba a la derecha) recortas esquinas de ¼ de celda.',
                          )
                        : t(
                            'constructor.cuarto.hintMover',
                            'Arrastra para mover un cuarto, o elige una forma abajo a la izquierda para dibujar. Usa Expandir para crecer, recortar o eliminar cuartos.',
                          )}
                </p>
              </div>
            )}

            {/* Muros: dos botones — Seleccionar (editar uno existente) o Crear (colocar muros). */}
            {modo === 'muros' && (
              <div className="grid grid-cols-2 gap-1.5">
                <Chip
                  activo={herramienta === 'seleccionar'}
                  onClick={() => setHerramienta('seleccionar')}
                >
                  <span className="me-1"><Icono nombre="apunta" /></span>
                  {t('constructor.muro.seleccionar', 'Seleccionar')}
                </Chip>
                <Chip activo={herramienta === 'muro'} onClick={() => setHerramienta('muro')}>
                  <span className="me-1"><Icono nombre="editar" /></span>
                  {t('constructor.muro.crear', 'Crear')}
                </Chip>
              </div>
            )}

            {modo === 'muros' && muroLibreSel != null && (
              <EditorMuroLibre muroId={muroLibreSel} />
            )}

            {(modo === 'piso-ext' || modo === 'piso-int') && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('constructor.piso.cambiarTodas', 'Cambiar todas de golpe')}
                </p>
                {modo === 'piso-ext' ? (
                  <Chip
                    activo={grupoExteriorActivo}
                    onClick={() => setSeleccion(seleccionPisosExteriores(nivel, zonas))}
                  >
                    <Icono nombre="pasto" /> {t('constructor.piso.todasExt', 'Seleccionar todas las exteriores')}
                  </Chip>
                ) : (
                  <Chip
                    activo={grupoInteriorActivo}
                    onClick={() => setSeleccion(seleccionPisosInteriores())}
                  >
                    <Icono nombre="casa" /> {t('constructor.piso.todasInt', 'Seleccionar todos los interiores')}
                  </Chip>
                )}
                <p className="text-[10px] leading-snug text-white/35">
                  {t(
                    'constructor.piso.hint',
                    'O toca celdas en el croquis o en el mapa 3D para elegir una o varias.',
                  )}
                </p>
              </div>
            )}

            {/* Puerta/Ventana en un muro INDEPENDIENTE seleccionado (no de cuarto). */}
            {(modo === 'puertas' || modo === 'ventanas') && muroLibreSel != null && (
              <EditorMuroLibre muroId={muroLibreSel} />
            )}

            {/* Edición por selección (cuartos, paredes, pisos, techos) o ascensos. */}
            {modo === 'cuartos' ? (
              <CuartosPanel />
            ) : modo === 'ascensos' ? (
              <AscensosPanel />
            ) : (
              !((modo === 'puertas' || modo === 'ventanas') && muroLibreSel != null) && (
                <PlanoPanelProps />
              )
            )}

            {/* Instrucciones del modo Muros: al final, debajo de las herramientas. */}
            {modo === 'muros' && muroLibreSel == null && (
              <p className="text-[10px] leading-snug text-white/40">
                {herramienta === 'seleccionar'
                  ? t(
                      'constructor.muro.hintSeleccionar',
                      'Toca un muro en el mapa 3D —recto, rectangular o circular— para seleccionarlo y editar su textura, color, altura y forma.',
                    )
                  : t(
                      'constructor.muro.hint',
                      'Elige la forma abajo a la izquierda. En Lados elige Horizontal o Vertical y toca la rejilla para colocar o quitar el muro recto. En Triángulo/Círculo elige la variante inicial y toca la celda; toca de nuevo el mismo punto para ir pasando por las demás variantes y, tras la última, borrarlo.',
                    )}
              </p>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
