import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { Cuarto } from '../../data/db'
import { useDiseño } from '../../state/disenoStore'
import { useLayout } from '../../state/layoutStore'
import { PISOS, type PisoTipo } from '../../house/pisos'
import { esFormaCuadrada } from '../../house/formasLoseta'
import { ColorPicker } from '../comun/ColorPicker'
import { GenerarTexturaIA } from './GenerarTexturaIA'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/** Estilo de la miniatura de cada textura: imagen real o patrón CSS para los procedurales. */
function swatchStyle(p: PisoTipo): CSSProperties {
  if (p.textura)
    return { backgroundColor: p.color, backgroundImage: `url(/textures/floors/${p.textura}_color.jpg)` }
  if (p.id === 'mosaico' || p.id === 'ajedrez') {
    const [a, b] = p.id === 'mosaico' ? ['#c8c6d8', '#9896a8'] : ['#f0ede8', '#161616']
    return {
      background: `conic-gradient(${a} 90deg, ${b} 90deg 180deg, ${a} 180deg 270deg, ${b} 270deg)`,
      backgroundSize: '14px 14px',
    }
  }
  if (p.id === 'grid_neon')
    return {
      backgroundColor: '#050a18',
      backgroundImage:
        'linear-gradient(#3b6cff 1.5px, transparent 1.5px), linear-gradient(90deg, #3b6cff 1.5px, transparent 1.5px)',
      backgroundSize: '9px 9px',
    }
  return { backgroundColor: p.color }
}

const AJUSTES = [
  { id: 'x1', clave: 'grande', labelEs: 'Grande' },
  { id: 'x2', clave: 'medio', labelEs: 'Medio' },
  { id: 'x4', clave: 'mosaico', labelEs: 'Mosaico' },
] as const

/** Selector de piso interno de un cuarto: textura + color + imagen personalizada. */
export function EditorPisoCuartoSection({ room }: { room: Cuarto }) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const roomPisoTipos        = useDiseño((s) => s.roomPisoTipos)
  const roomPisoColors       = useDiseño((s) => s.roomPisoColors)
  const roomPisoImagenes     = useDiseño((s) => s.roomPisoImagenes)
  const roomPisoImagenActiva = useDiseño((s) => s.roomPisoImagenActiva)
  const roomPisoImagenAjuste = useDiseño((s) => s.roomPisoImagenAjuste)
  const setRoomPisoTipo          = useDiseño((s) => s.setRoomPisoTipo)
  const setRoomPisoColor         = useDiseño((s) => s.setRoomPisoColor)
  const subirRoomPisoImagen      = useDiseño((s) => s.subirRoomPisoImagen)
  const activarRoomPisoImagen    = useDiseño((s) => s.activarRoomPisoImagen)
  const desactivarRoomPisoImagen = useDiseño((s) => s.desactivarRoomPisoImagen)
  const eliminarRoomPisoImagen   = useDiseño((s) => s.eliminarRoomPisoImagen)
  const setRoomPisoImagenAjuste  = useDiseño((s) => s.setRoomPisoImagenAjuste)

  // Piso exterior (solo aplica si el cuarto tiene celdas con forma: triángulo/círculo).
  const roomPisoExtTipos   = useDiseño((s) => s.roomPisoExtTipos)
  const roomPisoExtColors  = useDiseño((s) => s.roomPisoExtColors)
  const setRoomPisoExtTipo  = useDiseño((s) => s.setRoomPisoExtTipo)
  const setRoomPisoExtColor = useDiseño((s) => s.setRoomPisoExtColor)
  const resetRoomPisoExt    = useDiseño((s) => s.resetRoomPisoExt)
  const formasCelda = useLayout((s) => s.formasCelda[room.id])
  const tieneCeldasForma = !!formasCelda && Object.values(formasCelda).some((f) => !esFormaCuadrada(f))
  const personalizadoExt = room.id in roomPisoExtTipos
  const extTipo      = roomPisoExtTipos[room.id] ?? null
  const extColorActivo = personalizadoExt && extTipo === null
  const extColor     = roomPisoExtColors[room.id] ?? room.color

  const personalizado = room.id in roomPisoTipos
  const pisoTipo      = roomPisoTipos[room.id] ?? null
  const pisoImagen    = roomPisoImagenes[room.id]         // guardada (activa o no)
  const imagenActiva  = !!pisoImagen && (roomPisoImagenActiva[room.id] ?? false)
  const ajuste        = roomPisoImagenAjuste[room.id] ?? 'x1'
  const colorActivo   = personalizado && pisoTipo === null && !imagenActiva
  const floorColor    = roomPisoColors[room.id] ?? room.color

  const onSubirImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    subirRoomPisoImagen(room.id, file)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">

      {/* ── Sección 1: Textura ─────────────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.pisoCuarto.textura', 'Textura')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {/* Color sólido */}
          <button
            type="button"
            onClick={() => {
              setRoomPisoTipo(room.id, null)
              desactivarRoomPisoImagen(room.id)
            }}
            className={[
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
              colorActivo
                ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
            ].join(' ')}
          >
            <div
              className="w-full rounded-md"
              style={{
                height: 28,
                background: colorActivo
                  ? floorColor
                  : 'linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff)',
              }}
            />
            <span className="text-[10px] font-medium leading-tight">
              {t('editor.piso.colorSolido', 'Color sólido')}
            </span>
          </button>

          {/* Tipos de textura */}
          {PISOS.map((p) => {
            const activo = personalizado && pisoTipo === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setRoomPisoTipo(room.id, p.id)}
                title={p.tema ? `Recomendado para tema ${p.tema}` : undefined}
                className={[
                  'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                  activo
                    ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                ].join(' ')}
              >
                <div
                  className="w-full rounded-md bg-cover bg-center"
                  style={{ height: 28, ...swatchStyle(p) }}
                />
                <span className="text-[10px] font-medium leading-tight">{p.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Sección 2: Color ───────────────────────────────── */}
      {personalizado && !imagenActiva && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('editor.pisoCuarto.color', 'Color')}
          </p>
          <ColorPicker value={floorColor} onChange={(c) => setRoomPisoColor(room.id, c)} />
        </div>
      )}

      {/* ── Sección 3: Imagen de fondo ─────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.pisoCuarto.imagen', 'Imagen de fondo')}
        </p>

        {pisoImagen ? (
          <div className="space-y-2">
            {/* Miniatura */}
            <div
              className={[
                'relative overflow-hidden rounded-lg border',
                imagenActiva ? 'border-emerald-400/70' : 'border-white/10',
              ].join(' ')}
              style={{ height: 72 }}
            >
              <img
                src={pisoImagen}
                alt={t('editor.piso.alt', 'Piso personalizado')}
                className="h-full w-full object-cover"
              />
              {imagenActiva && (
                <div className="absolute right-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold texto-cta">
                  {t('editor.imgActiva', 'ACTIVA')}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-1.5">
              {!imagenActiva ? (
                <button
                  type="button"
                  onClick={() => activarRoomPisoImagen(room.id)}
                  className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 py-1.5 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-400/20"
                >
                  {t('editor.pisoCuarto.usarImagen', 'Usar imagen')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => desactivarRoomPisoImagen(room.id)}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
                >
                  {t('editor.pisoCuarto.desactivar', 'Desactivar')}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
              >
                {t('editor.pisoCuarto.cambiar', 'Cambiar')}
              </button>
              {/* Borrar imagen */}
              <button
                type="button"
                onClick={() => eliminarRoomPisoImagen(room.id)}
                className="rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400/80 transition hover:bg-red-400/20 hover:text-red-400"
                title={t('editor.pisoCuarto.borrar', 'Borrar imagen')}
              >
                ✕
              </button>
            </div>

            {/* Ajuste de tamaño — solo cuando la imagen está activa */}
            {imagenActiva && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {t('editor.pisoCuarto.ajuste', 'Tamaño del mosaico')}
                </p>
                <div className="flex gap-1.5">
                  {AJUSTES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setRoomPisoImagenAjuste(room.id, a.id)}
                      className={[
                        'flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition',
                        ajuste === a.id
                          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {t(`editor.tamano.${a.clave}`, a.labelEs)}
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
            <span className="text-base"><Icono nombre="imagen" /></span>
            {t('editor.pisoCuarto.subirImagen', 'Subir imagen')}
          </button>
        )}

        <div className="mt-2">
          <GenerarTexturaIA
            superficie="piso"
            onGenerada={(blob) => subirRoomPisoImagen(room.id, blob)}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onSubirImagen}
        />
      </div>

      {/* ── Sección 4: Piso exterior (solo celdas con forma) ─── */}
      {tieneCeldasForma && (
        <div className="border-t border-white/10 pt-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('editor.pisoCuarto.exterior', 'Piso exterior')}
          </p>
          <p className="mb-2 text-[10px] leading-snug text-white/40">
            {t(
              'editor.pisoCuarto.exteriorDesc',
              'Material del trozo de celda fuera de la silueta en esquinas con forma (triángulo/círculo).',
            )}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {/* Jardín por defecto */}
            <button
              type="button"
              onClick={() => resetRoomPisoExt(room.id)}
              className={[
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                !personalizadoExt
                  ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
              ].join(' ')}
            >
              <div className="w-full rounded-md" style={{ height: 28, backgroundColor: '#5a6e58' }} />
              <span className="text-[10px] font-medium leading-tight">
                {t('editor.pisoCuarto.exteriorJardin', 'Jardín')}
              </span>
            </button>

            {/* Color sólido */}
            <button
              type="button"
              onClick={() => setRoomPisoExtColor(room.id, extColor)}
              className={[
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                extColorActivo
                  ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
              ].join(' ')}
            >
              <div
                className="w-full rounded-md"
                style={{
                  height: 28,
                  background: extColorActivo
                    ? extColor
                    : 'linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff)',
                }}
              />
              <span className="text-[10px] font-medium leading-tight">
                {t('editor.piso.colorSolido', 'Color sólido')}
              </span>
            </button>

            {/* Texturas */}
            {PISOS.map((p) => {
              const activo = personalizadoExt && extTipo === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRoomPisoExtTipo(room.id, p.id)}
                  className={[
                    'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                    activo
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                  ].join(' ')}
                >
                  <div className="w-full rounded-md bg-cover bg-center" style={{ height: 28, ...swatchStyle(p) }} />
                  <span className="text-[10px] font-medium leading-tight">{p.nombre}</span>
                </button>
              )
            })}
          </div>

          {extColorActivo && (
            <div className="mt-2">
              <ColorPicker value={extColor} onChange={(c) => setRoomPisoExtColor(room.id, c)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
