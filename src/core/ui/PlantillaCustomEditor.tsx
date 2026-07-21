import { useState } from 'react'
import type { BloqueDef, PlantillaCustom, TipoBloque } from '../data/db'
import { usePlantillasCustom } from '../state/plantillasCustomStore'
import { useGruposPlantilla } from '../state/gruposPlantillaStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const EMOJIS = ['🧩', '📌', '🗂️', '🎯', '🧠', '💡', '🛒', '🐾', '🌱', '🎁', '🔧', '⭐']
const COLORES = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#a78bfa', '#f87171']

const TIPOS: { tipo: TipoBloque; emoji: string; nombre: string }[] = [
  { tipo: 'notas', emoji: '📝', nombre: 'Notas' },
  { tipo: 'checklist', emoji: '✅', nombre: 'Checklist' },
  { tipo: 'contador', emoji: '🔢', nombre: 'Contador' },
  { tipo: 'enlaces', emoji: '🔗', nombre: 'Enlaces' },
  { tipo: 'lista', emoji: '📋', nombre: 'Lista' },
  { tipo: 'valoracion', emoji: '⭐', nombre: 'Valoración' },
  { tipo: 'bitacora', emoji: '📔', nombre: 'Bitácora' },
  { tipo: 'progreso', emoji: '📈', nombre: 'Progreso' },
  { tipo: 'habito', emoji: '🔥', nombre: 'Hábito' },
  { tipo: 'sesiones', emoji: '⏱️', nombre: 'Sesiones' },
  { tipo: 'cuenta', emoji: '⏳', nombre: 'Cuenta regresiva' },
  { tipo: 'galeria', emoji: '🖼️', nombre: 'Galería' },
]

/**
 * Modal de creación/edición de una plantilla personalizada: nombre, emoji,
 * color y las herramientas (bloques) que formarán las secciones de la app.
 * Los ids de bloque NO se regeneran al editar (conservan datos y tools de IA).
 */
export function PlantillaCustomEditor({
  inicial,
  onCerrar,
}: {
  inicial?: PlantillaCustom
  onCerrar: () => void
}) {
  const t = useT()
  const guardarPlantilla = usePlantillasCustom((s) => s.guardar)
  const grupos = useGruposPlantilla((s) => s.grupos)
  const moverAGrupo = useGruposPlantilla((s) => s.mover)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [icon, setIcon] = useState(inicial?.icon ?? EMOJIS[0])
  const [color, setColor] = useState(inicial?.color ?? COLORES[5])
  const [bloques, setBloques] = useState<BloqueDef[]>(inicial?.bloques ?? [])
  const grupoActual = inicial ? grupos.find((g) => g.miembros.includes(inicial.id))?.id : undefined
  const [grupoId, setGrupoId] = useState<number | undefined>(grupoActual ?? grupos[0]?.id)

  const nombreTipo = (tipo: TipoBloque) =>
    t(`plantillaCustom.tipo.${tipo}`, TIPOS.find((x) => x.tipo === tipo)?.nombre ?? tipo)

  // Sufijo aleatorio: varios clics en el mismo milisegundo no deben repetir id.
  const agregarBloque = (tipo: TipoBloque) =>
    setBloques((bs) => [
      ...bs,
      { id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, tipo, titulo: '' },
    ])

  const setBloque = (id: string, patch: Partial<BloqueDef>) =>
    setBloques((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const mover = (i: number, dir: -1 | 1) =>
    setBloques((bs) => {
      const j = i + dir
      if (j < 0 || j >= bs.length) return bs
      const copia = [...bs]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  const quitar = (id: string) => setBloques((bs) => bs.filter((b) => b.id !== id))

  const valido = nombre.trim() !== '' && bloques.length > 0

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const id = inicial?.id ?? `custom-${Date.now()}`
    await guardarPlantilla({
      id,
      nombre: nombre.trim(),
      icon: icon.trim() || EMOJIS[0],
      color,
      bloques: bloques.map((b) => ({ ...b, titulo: b.titulo.trim() || nombreTipo(b.tipo) })),
      creadoEn: inicial?.creadoEn ?? new Date().toISOString(),
    })
    if (grupoId != null) await moverAGrupo(id, grupoId)
    onCerrar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <form
        onSubmit={(e) => void guardar(e)}
        onClick={(e) => e.stopPropagation()}
        className="ui-panel ui-pop flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-base font-black text-white/90">
            {inicial
              ? t('plantillaCustom.editar', 'Editar plantilla')
              : t('plantillaCustom.crear', 'Crear plantilla')}
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="ml-auto rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto p-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('plantillaCustom.nombrePh', 'Ej. Mudanza, plantas, mascota…')}
            maxLength={40}
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={`h-9 w-9 rounded-lg text-xl transition ${
                  icon === e ? 'bg-white/15 ring-2 ring-white/60' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {e}
              </button>
            ))}
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              title={t('plantillaCustom.emojiLibre', 'Otro emoji')}
              className="h-9 w-12 rounded-lg border border-white/10 bg-black/30 text-center text-xl outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition ${
                  c === color ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#0f1115]' : 'hover:scale-110'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          {grupos.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.grupo', 'Grupo')}
              <select
                value={grupoId ?? ''}
                onChange={(e) => setGrupoId(Number(e.target.value))}
                className="min-w-0 flex-1 cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white/80 outline-none focus:border-white/30"
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji ? `${g.emoji} ` : ''}
                    {g.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <p className="mb-1.5 text-xs text-white/50">
              {t('plantillaCustom.herramientas', 'Herramientas de la plantilla')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS.map((x) => (
                <button
                  key={x.tipo}
                  type="button"
                  onClick={() => agregarBloque(x.tipo)}
                  className="rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/5"
                >
                  ＋ <Icono emoji={x.emoji} /> {nombreTipo(x.tipo)}
                </button>
              ))}
            </div>

            {bloques.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-[11px] leading-relaxed text-white/45">
                {t(
                  'plantillaCustom.sinBloques',
                  'Agrega al menos una herramienta: serán las secciones de tu app.',
                )}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {bloques.map((b, i) => (
                  <li key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-base">
                        <Icono emoji={TIPOS.find((x) => x.tipo === b.tipo)?.emoji ?? ''} />
                      </span>
                      <input
                        value={b.titulo}
                        onChange={(e) => setBloque(b.id, { titulo: e.target.value })}
                        placeholder={nombreTipo(b.tipo)}
                        maxLength={40}
                        className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => mover(i, -1)}
                        disabled={i === 0}
                        className="rounded px-1 text-white/40 transition hover:text-white/80 disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, 1)}
                        disabled={i === bloques.length - 1}
                        className="rounded px-1 text-white/40 transition hover:text-white/80 disabled:opacity-20"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => quitar(b.id)}
                        title={t('plantillaCustom.quitarBloque', 'Quitar (al guardar se borran sus datos)')}
                        className="rounded px-1 text-white/40 transition hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                    {(b.tipo === 'contador' || b.tipo === 'progreso') && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
                        {t('plantillaCustom.meta', 'Meta (opcional)')}
                        <input
                          type="number"
                          min={1}
                          value={b.meta ?? ''}
                          onChange={(e) =>
                            setBloque(b.id, { meta: e.target.value ? Number(e.target.value) : undefined })
                          }
                          className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
                        />
                      </label>
                    )}
                    {b.tipo === 'progreso' && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
                        {t('plantillaCustom.unidad', 'Unidad (opcional)')}
                        <input
                          value={b.unidad ?? ''}
                          onChange={(e) => setBloque(b.id, { unidad: e.target.value || undefined })}
                          maxLength={8}
                          placeholder={t('plantillaCustom.unidadPh', 'kg, $, págs…')}
                          className="w-24 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
                        />
                      </label>
                    )}
                    {b.tipo === 'sesiones' && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
                        {t('plantillaCustom.metaMin', 'Meta en minutos (opcional)')}
                        <input
                          type="number"
                          min={1}
                          value={b.meta ?? ''}
                          onChange={(e) =>
                            setBloque(b.id, { meta: e.target.value ? Number(e.target.value) : undefined })
                          }
                          className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
                        />
                      </label>
                    )}
                    {b.tipo === 'habito' && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
                        {t('plantillaCustom.metaSemana', 'Veces por semana (opcional)')}
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={b.meta ?? ''}
                          onChange={(e) =>
                            setBloque(b.id, { meta: e.target.value ? Number(e.target.value) : undefined })
                          }
                          className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
                        />
                      </label>
                    )}
                    {b.tipo === 'cuenta' && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
                        {t('plantillaCustom.cuentaFecha', 'Fecha objetivo')}
                        <input
                          type="date"
                          value={b.fecha ?? ''}
                          onChange={(e) => setBloque(b.id, { fecha: e.target.value || undefined })}
                          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
                        />
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex gap-2 border-t border-white/10 p-3">
          <button
            type="submit"
            disabled={!valido}
            className="flex-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-default disabled:opacity-40"
          >
            {t('plantillaCustom.guardar', 'Guardar')}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            {t('plantillaCustom.cancelar', 'Cancelar')}
          </button>
        </footer>
      </form>
    </div>
  )
}
