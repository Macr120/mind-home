import { useState } from 'react'
import type { CarpetaFormula } from '../../core/data/db'
import { carpetasFormulaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ColorPicker, SIN_COLOR } from '../../core/ui/comun/ColorPicker'

/**
 * Editar una carpeta del formulario: nombre, emoji y color.
 *
 * El color no es decoración: tiñe el emoji, pinta la barra lateral de la fila y
 * lo HEREDAN las subcarpetas que no tengan el suyo (ver `filasArbol`), que es lo
 * que hace legible un árbol largo de un vistazo.
 */

/** Emojis frecuentes en un formulario; el resto se escribe a mano. */
const EMOJIS = ['📁', '📐', '⚛️', '🧪', '📊', '📈', '💰', '🏃', '🔧', '🧬', '🌡️', '⚡', '🔭', '💡', '📚', '🎓']

export function EditorCarpeta({
  carpeta,
  onCerrar,
  onBorrar,
}: {
  carpeta: CarpetaFormula
  onCerrar: () => void
  onBorrar: () => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState(carpeta.nombre)
  const [emoji, setEmoji] = useState(carpeta.emoji ?? '📁')
  const [color, setColor] = useState(carpeta.color ?? SIN_COLOR)

  const guardar = async () => {
    if (!nombre.trim() || carpeta.id == null) return
    await carpetasFormulaRepo.update(carpeta.id, {
      nombre: nombre.trim(),
      emoji: emoji.trim() || undefined,
      color: color === SIN_COLOR ? undefined : color,
    })
    onCerrar()
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {t('computo.carpeta.titulo', 'Editar carpeta')}
        </h3>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 text-white/40 transition hover:text-white/80"
          title={t('computo.carpeta.cerrar', 'Cerrar')}
          aria-label={t('computo.carpeta.cerrar', 'Cerrar')}
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={t('computo.carpeta.nombre', 'Nombre de la carpeta')}
        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {t('computo.carpeta.emoji', 'Icono')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`h-8 w-8 rounded-lg text-base transition ${
                emoji === e ? 'ui-accent-bg' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {e}
            </button>
          ))}
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
            placeholder="🙂"
            className="h-8 w-14 rounded-lg border border-white/15 bg-black/30 text-center text-base outline-none focus:border-accent"
            aria-label={t('computo.carpeta.emojiLibre', 'Otro emoji')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {t('computo.carpeta.color', 'Color')}
        </p>
        <ColorPicker value={color} onChange={setColor} fila sinColor personalizado={false} />
        <p className="text-[11px] text-white/35">
          {t('computo.carpeta.colorPista', 'Las subcarpetas sin color propio heredan este.')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={!nombre.trim()}
          className="ui-accent-bg flex-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {t('computo.carpeta.guardar', 'Guardar')}
        </button>
        <button
          type="button"
          onClick={onBorrar}
          className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-sm text-rose-300 transition hover:bg-white/10"
        >
          <Icono nombre="basura" /> {t('computo.carpeta.borrar', 'Borrar')}
        </button>
      </div>
    </div>
  )
}
