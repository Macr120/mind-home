import { useRef, useState, type ReactNode } from 'react'
import type { Cuarto } from '../../data/db'
import { useDiseño } from '../../state/disenoStore'
import { useLayout } from '../../state/layoutStore'
import {
  TECHOS_GENERICOS,
  TECHOS_TEMA,
  TECHO_FORMAS,
  TECHO_PARAMS_DEFAULT,
  presetsTechoCelda,
  presetDeCeldaForma,
  celdaFormaDePreset,
} from '../../house/techos'
import type { TechoCeldaForma } from '../../house/techos'
import type { FormaLoseta } from '../../house/formasLoseta'
import { FOOTPRINT_DEFAULT, footprintBounds } from '../../house/walls'
import { claveCeldaOff, formaEnCelda } from '../../house/formasLoseta'
import { useT } from '../../i18n/useT'
import { TechoMaterialSwatch } from './TechoMaterialSwatch'
import { TechoPresetIcono } from './TechoPresetIcono'
import { ColorPicker } from './ColorPicker'

const AJUSTES = [
  { id: 'x1', label: 'Grande' },
  { id: 'x2', label: 'Medio' },
  { id: 'x4', label: 'Mosaico' },
] as const

// ── Componentes de UI internos ─────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] text-white/45">
        <span>{label}</span>
        <span className="tabular-nums text-white/35">{Math.round(value * 100) / 100}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-400"
      />
    </label>
  )
}

function ChipForma({
  activo,
  emoji,
  nombre,
  onClick,
}: {
  activo: boolean
  emoji: string
  nombre: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-center transition',
        activo
          ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
      ].join(' ')}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[10px] font-medium leading-tight">{nombre}</span>
    </button>
  )
}

function Chip({
  activo,
  preview,
  nombre,
  subtitulo,
  onClick,
}: {
  activo: boolean
  preview: ReactNode
  nombre: string
  subtitulo?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={subtitulo}
      className={[
        'flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition',
        activo
          ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
      ].join(' ')}
    >
      <div className="w-full px-0.5">{preview}</div>
      <span className="text-[10px] font-medium leading-tight">{nombre}</span>
      {subtitulo && <span className="text-[9px] leading-none text-white/35">{subtitulo}</span>}
    </button>
  )
}

/**
 * Techo POR CUARTO: forma (plano, a dos aguas, abovedado, cúpula) + material
 * (heredar el global de la casa, color del cuarto, o un material concreto).
 * Las flechas para copiar a vecinos están en el mapa 3D.
 */
export function EditorTechoCuartoSection({ room }: { room: Cuarto }) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado de diseño
  const roomTechoTipos = useDiseño((s) => s.roomTechoTipos)
  const roomTechoFormas = useDiseño((s) => s.roomTechoFormas)
  const roomTechoParams = useDiseño((s) => s.roomTechoParams)
  const roomTechoColors = useDiseño((s) => s.roomTechoColors)
  const roomTechoImagenes = useDiseño((s) => s.roomTechoImagenes)
  const roomTechoImagenActiva = useDiseño((s) => s.roomTechoImagenActiva)
  const roomTechoImagenAjuste = useDiseño((s) => s.roomTechoImagenAjuste)
  const roomColors = useDiseño((s) => s.roomColors)
  const techoGlobal = useDiseño((s) => s.techoTipo)
  const setRoomTechoTipo = useDiseño((s) => s.setRoomTechoTipo)
  const setRoomTechoForma = useDiseño((s) => s.setRoomTechoForma)
  const setRoomTechoParam = useDiseño((s) => s.setRoomTechoParam)
  const setRoomTechoColor = useDiseño((s) => s.setRoomTechoColor)
  const subirRoomTechoImagen = useDiseño((s) => s.subirRoomTechoImagen)
  const activarRoomTechoImagen = useDiseño((s) => s.activarRoomTechoImagen)
  const desactivarRoomTechoImagen = useDiseño((s) => s.desactivarRoomTechoImagen)
  const eliminarRoomTechoImagen = useDiseño((s) => s.eliminarRoomTechoImagen)
  const setRoomTechoImagenAjuste = useDiseño((s) => s.setRoomTechoImagenAjuste)
  const resetRoomTecho = useDiseño((s) => s.resetRoomTecho)

  const colorCuarto = roomColors[room.id] ?? room.color
  const tieneMaterial = room.id in roomTechoTipos
  const tipoActual = roomTechoTipos[room.id]
  const formaActual = roomTechoFormas[room.id] ?? 'plano'
  const p = roomTechoParams[room.id] ?? TECHO_PARAMS_DEFAULT
  const heredaTodo = !tieneMaterial && formaActual === 'plano' && !(room.id in roomTechoParams)

  const techoTinte = roomTechoColors[room.id]
  const techoImagen = roomTechoImagenes[room.id]          // guardada (activa o no)
  const imagenActiva = !!techoImagen && (roomTechoImagenActiva[room.id] ?? false)
  const ajuste = roomTechoImagenAjuste[room.id] ?? 'x1'

  const onSubirImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    subirRoomTechoImagen(room.id, file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-white/45">
        {t(
          'editor.techoCuarto.desc',
          'Activa el techo 🏠 en el preview para verlo. Sin elegir nada, hereda el techo de la casa.',
        )}
        {' '}
        {t(
          'editor.techoCuarto.propagarMapa',
          'Con el techo 🏠 activo, el techo es una sola losa: usa el + de cada dirección para extenderlo de forma uniforme sobre cuartos vecinos, y − para retraer ese borde.',
        )}
      </p>

      {/* Techo por celda (fabricación por rejilla) */}
      <TechoPorCeldaGrid roomId={room.id} />

      {/* Forma (en conjunto) */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techoCuarto.forma', 'Forma (todo el cuarto)')}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {TECHO_FORMAS.map((f) => (
            <ChipForma
              key={f.id}
              activo={formaActual === f.id}
              emoji={f.emoji}
              nombre={t(`editor.techoForma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
              onClick={() => setRoomTechoForma(room.id, f.id)}
            />
          ))}
        </div>
      </div>

      {/* Ajustes de la forma */}
      <div className="space-y-2.5 rounded-lg border border-white/10 bg-black/20 p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techoCuarto.ajustes', 'Ajustes de la forma')}
        </p>

        {formaActual === 'plano' && (
          <Slider
            label={t('editor.techoCuarto.inclinacion', 'Inclinación')}
            value={p.inclinacion}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setRoomTechoParam(room.id, { inclinacion: v })}
          />
        )}

        {formaActual === 'dos_aguas' && (
          <>
            <div>
              <span className="mb-1 block text-[10px] text-white/45">
                {t('editor.techoCuarto.aguas', 'N° de aguas')}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { n: 1, et: t('editor.techoCuarto.aguas1', '1 · inclinado') },
                  { n: 2, et: t('editor.techoCuarto.aguas2', '2 · dos aguas') },
                  { n: 4, et: t('editor.techoCuarto.aguas4', '4 · pabellón') },
                ].map(({ n, et }) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRoomTechoParam(room.id, { aguas: n })}
                    className={[
                      'rounded-md border px-1 py-1.5 text-[10px] font-semibold transition',
                      p.aguas === n
                        ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                        : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>
            <Slider
              label={t('editor.techoCuarto.altura', 'Altura')}
              value={p.altura}
              min={0.4}
              max={2}
              step={0.05}
              onChange={(v) => setRoomTechoParam(room.id, { altura: v })}
            />
          </>
        )}

        {formaActual === 'abovedado' && (
          <>
            <Slider
              label={t('editor.techoCuarto.altura', 'Altura')}
              value={p.altura}
              min={0.4}
              max={2}
              step={0.05}
              onChange={(v) => setRoomTechoParam(room.id, { altura: v })}
            />
            <Slider
              label={t('editor.techoCuarto.curvatura', 'Curvatura')}
              value={p.curva}
              min={0.35}
              max={1}
              step={0.05}
              onChange={(v) => setRoomTechoParam(room.id, { curva: v })}
            />
          </>
        )}

        {formaActual === 'cupula' && (
          <Slider
            label={t('editor.techoCuarto.altura', 'Altura')}
            value={p.altura}
            min={0.4}
            max={2}
            step={0.05}
            onChange={(v) => setRoomTechoParam(room.id, { altura: v })}
          />
        )}

        {formaActual !== 'cupula' && (
          <button
            type="button"
            onClick={() => setRoomTechoParam(room.id, { dir: (p.dir + 1) % 4 })}
            className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
          >
            ⟳ {t('editor.techoCuarto.dir', 'Girar orientación')}
          </button>
        )}
      </div>

      {/* Material */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techoCuarto.material', 'Material')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Chip
            activo={heredaTodo}
            preview={
              <TechoMaterialSwatch modo="heredar" colorCuarto={colorCuarto} techoGlobal={techoGlobal} />
            }
            nombre={t('editor.techoCuarto.heredar', 'De la casa')}
            onClick={() => resetRoomTecho(room.id)}
          />
          <Chip
            activo={tipoActual === null}
            preview={<TechoMaterialSwatch modo="color" colorCuarto={colorCuarto} />}
            nombre={t('editor.techoCuarto.color', 'Color del cuarto')}
            onClick={() => setRoomTechoTipo(room.id, null)}
          />
          {TECHOS_GENERICOS.map((techo) => (
            <Chip
              key={techo.id}
              activo={tipoActual === techo.id}
              preview={<TechoMaterialSwatch modo="tipo" tipo={techo.id} colorCuarto={colorCuarto} />}
              nombre={techo.nombre}
              onClick={() => setRoomTechoTipo(room.id, techo.id)}
            />
          ))}
          {TECHOS_TEMA.map((techo) => (
            <Chip
              key={techo.id}
              activo={tipoActual === techo.id}
              preview={<TechoMaterialSwatch modo="tipo" tipo={techo.id} colorCuarto={colorCuarto} />}
              nombre={techo.nombre}
              subtitulo={techo.tema}
              onClick={() => setRoomTechoTipo(room.id, techo.id)}
            />
          ))}
        </div>
      </div>

      {/* Color (tinte del material) */}
      {!imagenActiva && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {t('editor.techoCuarto.colorTinte', 'Color')}
            </p>
            {techoTinte && (
              <button
                type="button"
                onClick={() => setRoomTechoColor(room.id, null)}
                className="text-[10px] text-white/40 transition hover:text-white/70"
              >
                {t('editor.techoCuarto.quitarColor', '↺ Nativo')}
              </button>
            )}
          </div>
          <ColorPicker
            value={techoTinte ?? colorCuarto}
            onChange={(c) => setRoomTechoColor(room.id, c)}
          />
        </div>
      )}

      {/* Imagen de fondo */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techoCuarto.imagen', 'Imagen de fondo')}
        </p>

        {techoImagen ? (
          <div className="space-y-2">
            <div
              className={[
                'relative overflow-hidden rounded-lg border',
                imagenActiva ? 'border-amber-400/70' : 'border-white/10',
              ].join(' ')}
              style={{ height: 72 }}
            >
              <img src={techoImagen} alt="Techo personalizado" className="h-full w-full object-cover" />
              {imagenActiva && (
                <div className="absolute right-1.5 top-1.5 rounded bg-amber-400/80 px-1.5 py-0.5 text-[9px] font-bold text-black">
                  ACTIVA
                </div>
              )}
            </div>

            <div className="flex gap-1.5">
              {!imagenActiva ? (
                <button
                  type="button"
                  onClick={() => activarRoomTechoImagen(room.id)}
                  className="flex-1 rounded-md border border-amber-400/40 bg-amber-400/10 py-1.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                >
                  {t('editor.techoCuarto.usarImagen', 'Usar imagen')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => desactivarRoomTechoImagen(room.id)}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
                >
                  {t('editor.techoCuarto.desactivar', 'Desactivar')}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
              >
                {t('editor.techoCuarto.cambiar', 'Cambiar')}
              </button>
              <button
                type="button"
                onClick={() => eliminarRoomTechoImagen(room.id)}
                className="rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400/80 transition hover:bg-red-400/20 hover:text-red-400"
                title={t('editor.techoCuarto.borrar', 'Borrar imagen')}
              >
                ✕
              </button>
            </div>

            {imagenActiva && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {t('editor.techoCuarto.ajuste', 'Tamaño del mosaico')}
                </p>
                <div className="flex gap-1.5">
                  {AJUSTES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setRoomTechoImagenAjuste(room.id, a.id)}
                      className={[
                        'flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition',
                        ajuste === a.id
                          ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 py-4 text-[11px] text-white/50 transition hover:border-white/40 hover:bg-white/8 hover:text-white/70"
          >
            <span className="text-base">🖼️</span>
            {t('editor.techoCuarto.subirImagen', 'Subir imagen')}
          </button>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onSubirImagen} />
      </div>

      {!heredaTodo && (
        <button
          type="button"
          onClick={() => resetRoomTecho(room.id)}
          className="text-[11px] text-white/40 transition hover:text-white/70"
        >
          {t('editor.techoCuarto.reset', '↺ Volver al techo de la casa')}
        </button>
      )}
    </div>
  )
}

const NOMBRE_SILUETA: Record<FormaLoseta, string> = {
  cuadrado: 'Cuadrado',
  triangular: 'Triángulo',
  circular: 'Círculo',
}

/** Fabricación de techo POR CELDA: selecciona una celda y ajusta el techo de SU silueta. */
function TechoPorCeldaGrid({ roomId }: { roomId: string }) {
  const t = useT()
  const fp = useLayout((s) => s.footprints[roomId]) ?? FOOTPRINT_DEFAULT
  const formasCelda = useLayout((s) => s.formasCelda[roomId])
  const techoCeldas = useDiseño((s) => s.roomTechoFormasCelda[roomId])
  const setRoomTechoCeldaForma = useDiseño((s) => s.setRoomTechoCeldaForma)
  const [sel, setSel] = useState<string | null>(null)

  const bounds = footprintBounds(fp)
  const enFp = (col: number, row: number) => fp.some((c) => c.col === col && c.row === row)
  const formaPisoDe = (clave: string) => formaEnCelda(formasCelda, clave).forma

  const aplanarTodo = () => {
    for (const c of fp) setRoomTechoCeldaForma(roomId, claveCeldaOff(c.col, c.row), null)
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techoCelda.titulo', 'Techo por celda')}
        </p>
        {techoCeldas && Object.keys(techoCeldas).length > 0 && (
          <button
            type="button"
            onClick={aplanarTodo}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
          >
            {t('editor.techoCelda.aplanar', 'Aplanar todo')}
          </button>
        )}
      </div>
      <p className="text-[10px] leading-snug text-white/40">
        {t(
          'editor.techoCelda.desc',
          'Selecciona una celda y ajusta su techo abajo. Cada silueta —cuadrado, triángulo, círculo— tiene sus propias opciones.',
        )}
      </p>

      {/* Rejilla: cada celda muestra su forma de techo; clic = seleccionar */}
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${bounds.w}, 1.5rem)` }}
      >
        {Array.from({ length: bounds.h }).flatMap((_, row) =>
          Array.from({ length: bounds.w }).map((_, col) => {
            if (!enFp(col, row)) return <span key={`${col},${row}`} />
            const clave = claveCeldaOff(col, row)
            const formaPiso = formaPisoDe(clave)
            const preset = presetDeCeldaForma(techoCeldas?.[clave], presetsTechoCelda(formaPiso))
            const seleccionada = sel === clave
            return (
              <button
                key={`${col},${row}`}
                type="button"
                onClick={() => setSel(clave)}
                title={`${NOMBRE_SILUETA[formaPiso]} · ${preset.nombre}`}
                className={`flex h-6 w-6 items-center justify-center rounded transition ${
                  seleccionada
                    ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/70'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <TechoPresetIcono id={preset.id} className="h-4 w-5" />
              </button>
            )
          }),
        )}
      </div>

      {/* Panel paramétrico de la celda seleccionada (según su silueta) */}
      {sel && enFp(...claveACol(sel)) && (
        <AjustesCeldaTecho
          roomId={roomId}
          clave={sel}
          silueta={formaPisoDe(sel)}
          cf={techoCeldas?.[sel]}
        />
      )}
    </div>
  )
}

/** Convierte una clave `col,row` en [col, row]. */
function claveACol(clave: string): [number, number] {
  const [c, r] = clave.split(',').map(Number)
  return [c, r]
}

/** Ajustes paramétricos del techo de UNA celda, adaptados a su silueta. */
function AjustesCeldaTecho({
  roomId,
  clave,
  silueta,
  cf,
}: {
  roomId: string
  clave: string
  silueta: FormaLoseta
  cf: TechoCeldaForma | undefined
}) {
  const t = useT()
  const setRoomTechoCeldaForma = useDiseño((s) => s.setRoomTechoCeldaForma)
  const presets = presetsTechoCelda(silueta)
  const activo = presetDeCeldaForma(cf, presets)
  const p = cf?.params ?? TECHO_PARAMS_DEFAULT

  const elegir = (presetId: string) => {
    const preset = presets.find((x) => x.id === presetId) ?? presets[0]
    setRoomTechoCeldaForma(
      roomId,
      clave,
      preset.id === 'plano' ? null : celdaFormaDePreset(preset, p.dir),
    )
  }
  const setParam = (patch: Partial<typeof p>) => {
    if (!cf) return
    setRoomTechoCeldaForma(roomId, clave, { forma: cf.forma, params: { ...cf.params, ...patch } })
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70">
        {t('editor.techoCelda.celda', 'Celda')} · {NOMBRE_SILUETA[silueta]}
      </p>

      {/* Formas válidas para esta silueta */}
      <div className={`grid gap-1.5 ${presets.length >= 6 ? 'grid-cols-6' : 'grid-cols-3'}`}>
        {presets.map((pr) => (
          <button
            key={pr.id}
            type="button"
            onClick={() => elegir(pr.id)}
            title={pr.nombre}
            className={`flex items-center justify-center rounded-md border py-1.5 transition ${
              activo.id === pr.id
                ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-200'
                : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
            }`}
          >
            <TechoPresetIcono id={pr.id} className="h-5 w-7" />
          </button>
        ))}
      </div>

      {/* Parámetros según la forma elegida (solo si no es plano) */}
      {cf && (
        <>
          {silueta === 'cuadrado' && cf.forma === 'plano' && (
            <Slider
              label={t('editor.techoCuarto.inclinacion', 'Inclinación')}
              value={p.inclinacion}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setParam({ inclinacion: v })}
            />
          )}

          {cf.forma === 'dos_aguas' && silueta === 'cuadrado' && (
            <div>
              <span className="mb-1 block text-[10px] text-white/45">
                {t('editor.techoCuarto.aguas', 'N° de aguas')}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { n: 1, et: t('editor.techoCuarto.aguas1', '1 · inclinado') },
                  { n: 2, et: t('editor.techoCuarto.aguas2', '2 · dos aguas') },
                  { n: 4, et: t('editor.techoCuarto.aguas4', '4 · pabellón') },
                ].map(({ n, et }) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setParam({ aguas: n })}
                    className={[
                      'rounded-md border px-1 py-1.5 text-[10px] font-semibold transition',
                      p.aguas === n
                        ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                        : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Altura: aplica a casi todas las formas con volumen */}
          {cf.forma !== 'plano' && (
            <Slider
              label={t('editor.techoCuarto.altura', 'Altura')}
              value={p.altura}
              min={0.4}
              max={2}
              step={0.05}
              onChange={(v) => setParam({ altura: v })}
            />
          )}

          {silueta === 'cuadrado' && cf.forma === 'abovedado' && (
            <Slider
              label={t('editor.techoCuarto.curvatura', 'Curvatura')}
              value={p.curva}
              min={0.35}
              max={1}
              step={0.05}
              onChange={(v) => setParam({ curva: v })}
            />
          )}

          {/* Orientación: solo en formas direccionales (no en pico/cono/cúpula simétricos) */}
          {activo.gira && (
            <button
              type="button"
              onClick={() => setParam({ dir: ((p.dir ?? 0) + 1) % 4 })}
              className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
            >
              ⟳ {t('editor.techoCuarto.dir', 'Girar orientación')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
