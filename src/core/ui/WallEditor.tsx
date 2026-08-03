import { useState, useRef } from 'react'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { getCuarto } from '../state/cuartosStore'
import { useLayout, SIN_OCUPACION } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { usePlanos } from '../state/planosStore'
import {
  roomEdges,
  effectiveEdge,
  footprintBounds,
  cellId,
  edgeKey,
  FOOTPRINT_DEFAULT,
  FORMA_ALTO_TECHO,
  SIZE,
  DOOR_W,
  type EdgeInfo,
  type WallState,
} from '../house/walls'
import {
  PINCELES_DEFAULT,
  TIPOS_MURO,
  TIPOS_PUERTA,
  TIPOS_FORMA_MURO,
  TIPOS_VENTANA_FORMA,
  TIPOS_VENTANA_CONTENIDO,
  VENTANA_COLOR_DEFAULT,
  VANO_FORMA_ALTO_DEFAULT,
} from '../house/murosPuertas'
import { claveCeldaOff, esFormaCuadrada, subformasDeCelda, offSubcelda } from '../house/formasLoseta'
import { itemsPerimetroSubformas } from '../house/murosPerimetroLoseta'
import { comprimirFoto } from '../house/especiales'
import { ColorPicker } from './editor/ColorPicker'
import { GenerarTexturaIA } from './editor/GenerarTexturaIA'

/** Modo del pincel: el tipo de elemento que se coloca/edita. */
type Modo = 'pared' | 'puerta' | 'ventana'

const INFO: Record<WallState, { labelEs: string; color: string }> = {
  pared: { labelEs: 'Pared', color: '#b45309' },
  puerta: { labelEs: 'Puerta', color: '#22c55e' },
  abierto: { labelEs: 'Abierto', color: '#38bdf8' },
}

const MODOS: { id: Modo; labelEs: string }[] = [
  { id: 'pared', labelEs: 'Pared' },
  { id: 'puerta', labelEs: 'Puerta' },
  { id: 'ventana', labelEs: 'Ventana' },
]

const AJUSTES = [
  { id: 'x1', clave: 'grande', labelEs: 'Grande' },
  { id: 'x2', clave: 'medio', labelEs: 'Medio' },
  { id: 'x4', clave: 'mosaico', labelEs: 'Mosaico' },
] as const

/** Texturas de muro disponibles (la "ventana" es un modo, no una textura). */
const TEXTURAS_MURO = TIPOS_MURO.filter((m) => m.id !== 'ventana')

/** Deslizador etiquetado para los parámetros de forma. */
function Deslizador({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  fmt: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[10px] text-white/45">
        <span>{label}</span>
        <span className="tabular-nums">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-400"
      />
    </label>
  )
}

/**
 * Editor de paredes/puertas/ventanas: elige el tipo, selecciona un borde en el
 * croquis y edita su forma, textura, color e imagen de fondo (uno a la vez).
 */
export function WallEditor({ roomId, sinCroquis }: { roomId: string; sinCroquis?: boolean }) {
  const t = useT()
  const overrides = useLayout((s) => s.wallOverrides[roomId])
  const edgeStyles = useLayout((s) => s.edgeStyles[roomId])
  const formasCeldaRoom = useLayout((s) => s.formasCelda[roomId])
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const nivel = useLayout((s) => s.niveles[roomId] ?? 0)
  const anchor = useLayout((s) => s.cells[roomId])
  const footprints = useLayout((s) => s.footprints)
  const paintEdge = useLayout((s) => s.paintEdge)
  const setEdgeEstilo = useLayout((s) => s.setEdgeEstilo)
  const room = getCuarto(roomId)

  // Imágenes de muro (por arista) — mismo patrón que piso/techo.
  const roomMuroImagenes = useDiseño((s) => s.roomMuroImagenes)
  const roomMuroImagenActiva = useDiseño((s) => s.roomMuroImagenActiva)
  const roomMuroImagenAjuste = useDiseño((s) => s.roomMuroImagenAjuste)
  const subirRoomMuroImagen = useDiseño((s) => s.subirRoomMuroImagen)
  const activarRoomMuroImagen = useDiseño((s) => s.activarRoomMuroImagen)
  const desactivarRoomMuroImagen = useDiseño((s) => s.desactivarRoomMuroImagen)
  const eliminarRoomMuroImagen = useDiseño((s) => s.eliminarRoomMuroImagen)
  const setRoomMuroImagenAjuste = useDiseño((s) => s.setRoomMuroImagenAjuste)

  // El modo (pared/puerta/ventana) lo decide la barra de modos (Muros/Puertas/Ventanas),
  // no un toggle propio: al seleccionar el muro se abre directo el editor correspondiente.
  const herramienta = usePlanos((s) => s.herramienta)
  const modo: Modo = herramienta === 'puerta' ? 'puerta' : herramienta === 'ventana' ? 'ventana' : 'pared'
  // La arista en edición = la seleccionada globalmente (croquis o 3D). Así, al seleccionarla
  // en el mapa ya se abre su editor sin tener que volver a tocarla en el mini-croquis.
  const seleccion = usePlanos((s) => s.seleccion)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const sel =
    seleccion?.tipo === 'arista' && seleccion.roomId === roomId
      ? { off: seleccion.off, side: seleccion.side }
      : null
  const [altoTodos, setAltoTodos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!anchor) return null

  const fp = footprints[roomId] ?? FOOTPRINT_DEFAULT
  const bounds = footprintBounds(fp)
  const edges = roomEdges(anchor, fp, ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION)

  const labelModo = (m: Modo) =>
    t(`paredes.${m === 'ventana' ? 'ventana' : m}` as Parameters<typeof t>[0], MODOS.find((x) => x.id === m)!.labelEs)

  const cellPx = Math.max(20, Math.min(44, Math.floor(180 / Math.max(bounds.w, bounds.h))))
  const inset = 4
  const bar = 6
  const centro = fp[Math.floor(fp.length / 2)]

  // Capas independientes por borde: estado (pared/puerta/abierto) + ventana opcional.
  const esPuerta = (e: EdgeInfo) => effectiveEdge(e, overrides) === 'puerta'
  const esAbierto = (e: EdgeInfo) => effectiveEdge(e, overrides) === 'abierto'
  const muroDe = (e: EdgeInfo) => edgeStyles?.[edgeKey(e.off, e.side)]?.muro
  const tieneVentana = (e: EdgeInfo) => {
    const m = muroDe(e)
    return !!(m?.ventana || m?.tipo === 'ventana')
  }
  /** ¿El borde pertenece al modo activo? (croquis específico por tipo). */
  const esDelModo = (e: EdgeInfo) =>
    modo === 'puerta' ? esPuerta(e) : modo === 'ventana' ? tieneVentana(e) : !esPuerta(e) && !esAbierto(e)

  const colorBorde = (e: EdgeInfo): string => {
    if (esPuerta(e)) return INFO.puerta.color
    if (tieneVentana(e) || esAbierto(e)) return INFO.abierto.color
    return INFO.pared.color
  }

  /** Aplica la capa del modo activo al borde (conservando lo demás) y lo selecciona. */
  const onEdgeClick = (e: EdgeInfo) => {
    setSeleccion({ tipo: 'arista', roomId, off: e.off, side: e.side })
    const m = muroDe(e)
    if (modo === 'puerta') {
      paintEdge(roomId, e.off, e.side, 'puerta') // conserva muro y ventana
    } else if (modo === 'ventana') {
      if (esAbierto(e)) return // no se ponen ventanas en accesos abiertos
      setEdgeEstilo(roomId, e.off, e.side, { muro: { ventana: true } })
    } else {
      // Pared: muro liso (sin puerta y sin ventana), conservando alto/textura/color.
      paintEdge(roomId, e.off, e.side, 'pared')
      setEdgeEstilo(roomId, e.off, e.side, {
        muro: { ventana: false, ...(m?.tipo === 'ventana' ? { tipo: 'solido' as const } : {}) },
      })
    }
  }

  // ── Datos del borde seleccionado ─────────────────────────────────────────────
  const selKey = sel ? edgeKey(sel.off, sel.side) : null
  const selEdge = sel
    ? edges.find((e) => e.off.col === sel.off.col && e.off.row === sel.off.row && e.side === sel.side)
    : undefined
  // Arista VIRTUAL de un recorte fino (off = centro del cuadrante con subforma): no
  // existe en roomEdges pero se edita igual que cualquier muro.
  const selVirtual =
    !!sel &&
    (!Number.isInteger(sel.off.col) || !Number.isInteger(sel.off.row)) &&
    !esFormaCuadrada(formasCeldaRoom?.[claveCeldaOff(sel.off.col, sel.off.row)])
  const selEstilo = selKey ? edgeStyles?.[selKey] : undefined
  const muro = selEstilo?.muro
  const puerta = selEstilo?.puerta

  // Valores de forma con sus defaults (espejo del render).
  const vAlto = muro?.alto ?? 1
  const vForma = muro?.forma ?? 'recta'
  // Arco y triángulo igualan por defecto el alto del techo; las esquinas, más bajas.
  const vFormaAlto = muro?.formaAlto ?? (vForma === 'esquinas' ? 0.4 : FORMA_ALTO_TECHO)
  const vFormaAncho = muro?.formaAncho ?? 0.32
  const vFormaPosX = muro?.formaPosX ?? 0
  const vFormaDividir = muro?.formaDividir ?? false
  const vFormaColor = muro?.formaColor ?? muro?.color ?? PINCELES_DEFAULT.muro.color
  const vVentAncho = muro?.ventAncho ?? 0.55
  const vVentAlto = muro?.ventAlto ?? 0.5
  const vVentPosY = muro?.ventPosY ?? 0.54
  const vVentPosX = muro?.ventPosX ?? 0
  const vVentForma = muro?.ventForma ?? 'cuadrado'
  const vVentContenido = muro?.ventContenido ?? 'ventana'
  const vVentCara = muro?.ventCara ?? 'interior'
  const vVentRot = muro?.ventRot ?? 0
  const vVentColor = muro?.ventColor ?? VENTANA_COLOR_DEFAULT
  const vVentMosaico = muro?.ventMosaico ?? false
  const vVentMulticolor = muro?.ventMulticolor ?? false
  const vAnchoVano = puerta?.anchoVano ?? 1
  const vPuertaAlto = puerta?.alto ?? 0.97
  const vPuertaPosX = puerta?.posX ?? 0
  const vVanoForma = puerta?.vanoForma ?? 'recta'
  const vVanoFormaAlto = puerta?.vanoFormaAlto ?? VANO_FORMA_ALTO_DEFAULT
  const vVanoFormaAncho = puerta?.vanoFormaAncho ?? 1
  const vVanoFormaPosX = puerta?.vanoFormaPosX ?? 0

  const muroColor = muro?.color ?? PINCELES_DEFAULT.muro.color
  const puertaColor = puerta?.color ?? PINCELES_DEFAULT.puerta.color
  const tipoMuroSel = muro?.tipo ?? 'solido'
  const tipoPuertaSel = puerta?.tipo ?? 'recta'

  // Imagen del borde seleccionado.
  const imgK = sel ? `${roomId}::${selKey}` : ''
  const muroImagen = roomMuroImagenes[imgK]
  const imagenActiva = !!muroImagen && (roomMuroImagenActiva[imgK] ?? false)
  const ajusteImg = roomMuroImagenAjuste[imgK] ?? 'x1'

  // Foto del cuadro empotrado (misma tabla de imágenes por arista, clave con sufijo).
  const fotoCuadroClave = selKey ? `${selKey}#cuadro` : ''
  const fotoCuadro = imgK ? roomMuroImagenes[`${imgK}#cuadro`] : undefined
  const nombreContenido = t(
    `paredes.cont.${vVentContenido}` as Parameters<typeof t>[0],
    TIPOS_VENTANA_CONTENIDO.find((c) => c.id === vVentContenido)!.nombre,
  )

  const onSubirImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selKey) return
    subirRoomMuroImagen(roomId, selKey, file)
    e.target.value = ''
  }

  const tituloSeccion = (txt: string) => (
    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{txt}</p>
  )

  return (
    <div className="space-y-3">
      {/* Croquis para seleccionar el muro a editar. En el editor de mapa se oculta (sinCroquis):
          el muro se elige en el croquis grande o en el mapa 3D, no en este mini-croquis. */}
      {!sinCroquis && (
      <div
        className="relative mx-auto rounded-lg bg-black/15 p-1"
        style={{ width: bounds.w * cellPx + 8, height: bounds.h * cellPx + 8 }}
      >
        <div
          className="relative mx-auto"
          style={{ width: bounds.w * cellPx, height: bounds.h * cellPx }}
        >
          {fp.map((c) => (
            <div
              key={'c' + cellId(c.col, c.row)}
              className="absolute rounded-sm bg-white/5"
              style={{
                left: c.col * cellPx + 1,
                top: c.row * cellPx + 1,
                width: cellPx - 2,
                height: cellPx - 2,
              }}
            >
              {centro && c.col === centro.col && c.row === centro.row && (
                <span className="flex h-full w-full items-center justify-center text-lg">
                  {room && <Icono emoji={room.icon} />}
                </span>
              )}
            </div>
          ))}

          {edges.map((e) => {
            const key = edgeKey(e.off, e.side)
            const est = effectiveEdge(e, overrides)
            const estilo = edgeStyles?.[key]
            const horizontal = e.horizontal
            const esS = e.side === 'S'
            const esE = e.side === 'E'
            const seleccionado = key === selKey
            const enModo = esDelModo(e) // croquis específico del tipo activo
            const style: React.CSSProperties = horizontal
              ? {
                  left: e.off.col * cellPx + inset,
                  top: (e.off.row + (esS ? 1 : 0)) * cellPx - bar / 2,
                  width: cellPx - inset * 2,
                  height: bar,
                }
              : {
                  left: (e.off.col + (esE ? 1 : 0)) * cellPx - bar / 2,
                  top: e.off.row * cellPx + inset,
                  width: bar,
                  height: cellPx - inset * 2,
                }
            const previewBg =
              est === 'pared' && estilo?.muro
                ? TIPOS_MURO.find((x) => x.id === estilo.muro!.tipo)?.preview
                : est === 'puerta' && estilo?.puerta
                  ? TIPOS_PUERTA.find((x) => x.id === estilo.puerta!.tipo)?.preview
                  : undefined
            return (
              <button
                key={key}
                type="button"
                onClick={() => onEdgeClick(e)}
                title={t('paredes.editarBorde', 'Editar este borde')}
                className="absolute rounded-sm transition hover:brightness-125 ring-1 ring-black/20"
                style={{
                  ...style,
                  background: previewBg ?? colorBorde(e),
                  opacity: enModo ? 1 : 0.28,
                  boxShadow: seleccionado ? '0 0 0 2px color-mix(in srgb, var(--ui-ink) 90%, transparent)' : undefined,
                  zIndex: seleccionado ? 2 : 1,
                }}
              />
            )
          })}
        </div>
      </div>
      )}

      {!sinCroquis && !sel && (
        <p className="text-center text-[10px] leading-snug text-white/35">
          {t('paredes.tocaBordeModo', 'Toca un borde para editarlo como')} {labelModo(modo).toLowerCase()}.
        </p>
      )}

      {sel && (selEdge || selVirtual) && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <p className="text-[11px] font-semibold text-white/70">
            {t('paredes.editando', 'Editando')}:{' '}
            <span className="text-white/90">{modo === 'ventana' ? nombreContenido : labelModo(modo)}</span>
          </p>

          {/* 3 · Formas paramétricas */}
          <div className="space-y-2">
            {tituloSeccion(t('paredes.formas', 'Formas paramétricas'))}

            {modo === 'pared' && (
              <>
                <Deslizador
                  label={t('paredes.alto', 'Alto')}
                  value={vAlto} min={0} max={3} step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => {
                    if (altoTodos) {
                      for (const e of edges) setEdgeEstilo(roomId, e.off, e.side, { muro: { alto: v } })
                      // Esquinas finas: su arista virtual (offset fraccionario) no está en
                      // `edges` (solo aristas reales), así que se quedaban sin subir.
                      for (const c of fp) {
                        const sub = subformasDeCelda(formasCeldaRoom, c.col, c.row)
                        if (!sub) continue
                        for (const item of itemsPerimetroSubformas(sub, 0, 0)) {
                          if (item.cuadrante == null || !item.ladoRep) continue
                          const off = offSubcelda(c.col, c.row, item.cuadrante)
                          setEdgeEstilo(roomId, off, item.ladoRep, { muro: { alto: v } })
                        }
                      }
                    } else {
                      setEdgeEstilo(roomId, sel.off, sel.side, { muro: { alto: v } })
                    }
                  }}
                />
                <label className="flex items-center gap-1.5 text-[10px] text-white/55">
                  <input
                    type="checkbox"
                    checked={altoTodos}
                    onChange={(e) => setAltoTodos(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  {t('paredes.altoTodos', 'Aplicar a todas las paredes del cuarto')}
                </label>

                <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                  {TIPOS_FORMA_MURO.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { forma: f.id } })}
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                        vForma === f.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                    >
                      {t(`paredes.forma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
                    </button>
                  ))}
                </div>

                {vForma !== 'recta' && (
                  <Deslizador
                    label={t(
                      'paredes.formaAlto',
                      vForma === 'arco' ? 'Alto del arco' : vForma === 'triangulo' ? 'Alto del pico' : 'Alto de las esquinas',
                    )}
                    value={vFormaAlto} min={0.05} max={1.5} step={0.05}
                    fmt={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { formaAlto: v } })}
                  />
                )}

                {(vForma === 'esquinas' || vForma === 'triangulo') && (
                  <Deslizador
                    label={t('paredes.formaAncho', 'Ancho')}
                    value={vFormaAncho}
                    min={0.1}
                    max={vForma === 'triangulo' ? 1 : 0.5}
                    step={0.02}
                    fmt={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { formaAncho: v } })}
                  />
                )}

                {vForma === 'triangulo' && (
                  <Deslizador
                    label={t('paredes.formaPosX', 'Posición del pico')}
                    value={vFormaPosX} min={-1} max={1} step={0.05}
                    fmt={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { formaPosX: v } })}
                  />
                )}

                {vForma !== 'recta' && (
                  <>
                    <label className="flex items-center gap-1.5 text-[10px] text-white/55">
                      <input
                        type="checkbox"
                        checked={vFormaDividir}
                        onChange={(e) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { formaDividir: e.target.checked } })}
                        className="accent-emerald-400"
                      />
                      {t('paredes.formaDividir', 'Dividir en dos cuerpos (textura propia)')}
                    </label>
                    {vFormaDividir && (
                      <ColorPicker
                        value={vFormaColor}
                        onChange={(c) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { formaColor: c } })}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {modo === 'ventana' && (
              <>
                {/* Qué vive en el vano: ventana con cristal, cuadro con foto o espejo. */}
                <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                  {TIPOS_VENTANA_CONTENIDO.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventContenido: c.id } })}
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                        vVentContenido === c.id ? 'bg-emerald-600 text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                    >
                      {t(`paredes.cont.${c.id}` as Parameters<typeof t>[0], c.nombre)}
                    </button>
                  ))}
                </div>

                {/* Cara del muro donde vive el cuadro/espejo (la otra queda lisa). */}
                {vVentContenido !== 'ventana' && (
                  <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                    {(['interior', 'exterior'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventCara: c } })}
                        className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                          vVentCara === c ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
                        }`}
                      >
                        {c === 'interior'
                          ? t('paredes.caraInterior', 'Cara interior')
                          : t('paredes.caraExterior', 'Cara exterior')}
                      </button>
                    ))}
                  </div>
                )}

                {/* Forma del cristal */}
                <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                  {TIPOS_VENTANA_FORMA.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventForma: f.id } })}
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                        vVentForma === f.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                    >
                      {t(`paredes.ventForma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
                    </button>
                  ))}
                </div>
                <Deslizador
                  label={vVentContenido === 'ventana' ? t('paredes.ventAncho', 'Ancho de ventana') : t('paredes.anchoGen', 'Ancho')}
                  value={vVentAncho} min={0.1} max={1} step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventAncho: v } })}
                />
                <Deslizador
                  label={vVentContenido === 'ventana' ? t('paredes.ventAlto', 'Alto de ventana') : t('paredes.altoGen', 'Alto')}
                  value={vVentAlto} min={0.1} max={1} step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventAlto: v } })}
                />
                <Deslizador
                  label={t('paredes.ventPosY', 'Posición vertical')}
                  value={vVentPosY} min={0} max={1} step={0.02}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventPosY: v } })}
                />
                <Deslizador
                  label={t('paredes.ventPosX', 'Posición horizontal')}
                  value={vVentPosX} min={-1} max={1} step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventPosX: v } })}
                />
                <Deslizador
                  label={t('paredes.ventRot', vVentForma === 'cuadrado' ? 'Rotación (rombo)' : 'Rotación')}
                  value={vVentRot} min={0} max={vVentForma === 'cuadrado' ? 90 : 180} step={5}
                  fmt={(v) => `${Math.round(v)}°`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventRot: v } })}
                />
              </>
            )}

            {modo === 'puerta' && (
              <>
                {/* Variante de puerta */}
                <div className="grid grid-cols-5 gap-1.5">
                  {TIPOS_PUERTA.map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      title={tp.nombre}
                      onClick={() =>
                        setEdgeEstilo(roomId, sel.off, sel.side, {
                          puerta: { tipo: tp.id, color: tp.defaultColor },
                        })
                      }
                      className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                        tipoPuertaSel === tp.id
                          ? 'ring-1 ring-emerald-400/70 bg-white/10'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="h-8 w-full rounded-md border border-white/10"
                        style={{ background: tp.preview }}
                      />
                      <span className="line-clamp-2 text-center text-[8px] leading-tight text-white/60">
                        {t(`paredes.puerta.${tp.id}` as Parameters<typeof t>[0], tp.nombre)}
                      </span>
                    </button>
                  ))}
                </div>
                <Deslizador
                  label={t('paredes.anchoVano', 'Ancho del vano')}
                  value={vAnchoVano} min={0.5} max={SIZE / DOOR_W} step={0.05}
                  fmt={(v) => `${Math.round(Math.min(SIZE, DOOR_W * v) / SIZE * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { anchoVano: v } })}
                />
                <Deslizador
                  label={t('paredes.altoPuerta', 'Alto de la puerta')}
                  value={vPuertaAlto} min={0.2} max={1} step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { alto: v } })}
                />
                <Deslizador
                  label={t('paredes.posXPuerta', 'Posición horizontal')}
                  value={vPuertaPosX} min={-1} max={1} step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { posX: v } })}
                />

                {/* Remate del vano (recto/arco/pico), con los mismos paramétricos que los muros. */}
                {tituloSeccion(t('paredes.formaVano', 'Forma del vano'))}
                <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                  {TIPOS_FORMA_MURO.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setEdgeEstilo(roomId, sel.off, sel.side, {
                          // Al elegir arco/pico baja la hoja (si está casi al tope) para dejarle sitio.
                          puerta: {
                            vanoForma: f.id,
                            ...(f.id !== 'recta' && vPuertaAlto > 0.85 ? { alto: 0.75 } : {}),
                          },
                        })
                      }
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                        vVanoForma === f.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                    >
                      {t(`paredes.forma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
                    </button>
                  ))}
                </div>

                {vVanoForma !== 'recta' && (
                  <Deslizador
                    label={
                      vVanoForma === 'arco'
                        ? t('paredes.formaAlto', 'Alto del arco')
                        : t('paredes.formaAltoPico', 'Alto del pico')
                    }
                    value={vVanoFormaAlto} min={0.05} max={1.5} step={0.05}
                    fmt={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { vanoFormaAlto: v } })}
                  />
                )}

                {vVanoForma === 'triangulo' && (
                  <>
                    <Deslizador
                      label={t('paredes.formaAncho', 'Ancho')}
                      value={vVanoFormaAncho} min={0.1} max={1} step={0.02}
                      fmt={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { vanoFormaAncho: v } })}
                    />
                    <Deslizador
                      label={t('paredes.formaPosX', 'Posición del pico')}
                      value={vVanoFormaPosX} min={-1} max={1} step={0.05}
                      fmt={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { vanoFormaPosX: v } })}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* 4 · Foto del cuadro empotrado */}
          {modo === 'ventana' && vVentContenido === 'cuadro' && (
            <div className="space-y-2">
              {tituloSeccion(t('paredes.fotoCuadro', 'Foto'))}
              {fotoCuadro && (
                <div className="overflow-hidden rounded-lg border border-white/10" style={{ height: 64 }}>
                  <img src={fotoCuadro} alt={t('paredes.fotoCuadro', 'Foto')} className="h-full w-full object-cover" />
                </div>
              )}
              <label className="block cursor-pointer rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20">
                <Icono nombre="foto" />{' '}
                {fotoCuadro ? t('paredes.cambiarFoto', 'Cambiar la foto') : t('paredes.subirFoto', 'Subir una foto')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (!f || !fotoCuadroClave) return
                    await subirRoomMuroImagen(roomId, fotoCuadroClave, await comprimirFoto(f))
                  }}
                />
              </label>
              {fotoCuadro && (
                <button
                  type="button"
                  onClick={() => eliminarRoomMuroImagen(roomId, fotoCuadroClave)}
                  className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-red-500/25"
                >
                  {t('paredes.quitarFoto', 'Quitar la foto')}
                </button>
              )}
              <p className="text-[10px] leading-snug text-white/35">
                {t('paredes.fotoAyuda', 'La foto llena la forma del marco en la cara elegida del muro.')}
              </p>
            </div>
          )}

          {/* 4 · Espejo empotrado: solo la nota (la luna refleja el interior). */}
          {modo === 'ventana' && vVentContenido === 'espejo' && (
            <p className="text-[10px] leading-snug text-white/35">
              {t('paredes.espejoNota', 'La luna refleja en tiempo real lo que tiene enfrente.')}
            </p>
          )}

          {/* 4 · Cristal (color, mosaico, multicolor) — solo ventana */}
          {modo === 'ventana' && vVentContenido === 'ventana' && (
            <div className="space-y-2">
              {tituloSeccion(t('paredes.cristal', 'Cristal'))}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventMosaico: !vVentMosaico } })}
                  className={`flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition ${
                    vVentMosaico
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {t('paredes.mosaico', 'Mosaico')}
                </button>
                <button
                  type="button"
                  onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventMulticolor: !vVentMulticolor } })}
                  className={`flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition ${
                    vVentMulticolor
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  <Icono nombre="multicolor" /> {t('paredes.multicolor', 'Multicolor')}
                </button>
              </div>
              {!vVentMulticolor && (
                <ColorPicker
                  value={vVentColor}
                  onChange={(c) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { ventana: true, ventColor: c } })}
                />
              )}
            </div>
          )}

          {/* 4 · Textura (propiedad del muro: aplica en pared y puerta, no solo en pared) */}
          {modo !== 'ventana' && (
            <div className="space-y-2">
              {tituloSeccion(t('paredes.textura', 'Textura'))}
              <div className="grid grid-cols-4 gap-1.5">
                {TEXTURAS_MURO.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    title={tm.nombre}
                    onClick={() => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { tipo: tm.id } })}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                      tipoMuroSel === tm.id
                        ? 'ring-1 ring-amber-400/70 bg-white/10'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="h-8 w-full rounded-md border border-white/10"
                      style={{ background: tm.preview }}
                    />
                    <span className="line-clamp-2 text-center text-[8px] leading-tight text-white/60">
                      {t(`paredes.muro.${tm.id}` as Parameters<typeof t>[0], tm.nombre)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5 · Color (pared o puerta) */}
          {modo !== 'ventana' && (
            <div className="space-y-2">
              {tituloSeccion(t('paredes.color', 'Color'))}
              {modo === 'puerta' ? (
                <ColorPicker
                  value={puertaColor}
                  onChange={(c) => setEdgeEstilo(roomId, sel.off, sel.side, { puerta: { color: c } })}
                />
              ) : (
                <ColorPicker
                  value={muroColor}
                  onChange={(c) => setEdgeEstilo(roomId, sel.off, sel.side, { muro: { color: c } })}
                />
              )}
            </div>
          )}

          {/* Quitar la capa activa */}
          {modo === 'puerta' && (
            <button
              type="button"
              onClick={() => paintEdge(roomId, sel.off, sel.side, 'pared')}
              className="w-full rounded-md border border-red-400/30 bg-red-400/10 py-1.5 text-[10px] font-semibold text-red-400/80 transition hover:bg-red-400/20"
            >
              {t('paredes.quitarPuerta', 'Quitar la puerta (dejar muro)')}
            </button>
          )}
          {modo === 'ventana' && (
            <button
              type="button"
              onClick={() =>
                setEdgeEstilo(roomId, sel.off, sel.side, {
                  muro: { ventana: false, ...(muro?.tipo === 'ventana' ? { tipo: 'solido' as const } : {}) },
                })
              }
              className="w-full rounded-md border border-red-400/30 bg-red-400/10 py-1.5 text-[10px] font-semibold text-red-400/80 transition hover:bg-red-400/20"
            >
              {vVentContenido === 'cuadro'
                ? t('paredes.quitarCuadro', 'Quitar el cuadro')
                : vVentContenido === 'espejo'
                  ? t('paredes.quitarEspejo', 'Quitar el espejo')
                  : t('paredes.quitarVentana', 'Quitar la ventana')}
            </button>
          )}

          {/* 6 · Imagen de fondo (solo pared) */}
          {modo === 'pared' && (
            <div className="space-y-2">
              {tituloSeccion(t('paredes.imagen', 'Imagen de fondo'))}
              {muroImagen ? (
                <div className="space-y-2">
                  <div
                    className={[
                      'relative overflow-hidden rounded-lg border',
                      imagenActiva ? 'border-emerald-400/70' : 'border-white/10',
                    ].join(' ')}
                    style={{ height: 64 }}
                  >
                    <img src={muroImagen} alt={t('editor.muro.alt', 'Muro')} className="h-full w-full object-cover" />
                    {imagenActiva && (
                      <div className="absolute right-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold texto-cta">
                        {t('editor.imgActiva', 'ACTIVA')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {!imagenActiva ? (
                      <button
                        type="button"
                        onClick={() => activarRoomMuroImagen(roomId, selKey!)}
                        className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 py-1.5 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-400/20"
                      >
                        {t('paredes.usarImagen', 'Usar imagen')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => desactivarRoomMuroImagen(roomId, selKey!)}
                        className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
                      >
                        {t('paredes.desactivar', 'Desactivar')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
                    >
                      {t('paredes.cambiar', 'Cambiar')}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarRoomMuroImagen(roomId, selKey!)}
                      className="rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400/80 transition hover:bg-red-400/20 hover:text-red-400"
                      title={t('paredes.borrar', 'Borrar imagen')}
                    >
                      ✕
                    </button>
                  </div>
                  {imagenActiva && (
                    <div className="flex gap-1.5">
                      {AJUSTES.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setRoomMuroImagenAjuste(roomId, selKey!, a.id)}
                          className={[
                            'flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition',
                            ajusteImg === a.id
                              ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                          ].join(' ')}
                        >
                          {t(`editor.tamano.${a.clave}`, a.labelEs)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 py-4 text-[11px] text-white/50 transition hover:border-white/40 hover:bg-white/8 hover:text-white/70"
                >
                  <span className="text-base"><Icono nombre="imagen" /></span>
                  {t('paredes.subirImagen', 'Subir imagen')}
                </button>
              )}
              {selKey && (
                <GenerarTexturaIA
                  superficie="muro"
                  onGenerada={(blob) => subirRoomMuroImagen(roomId, selKey, blob)}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSubirImagen}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
