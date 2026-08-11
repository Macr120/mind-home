import { useState } from 'react'
import { esDemoAutor } from '../core/edicion'
import { useT } from '../core/i18n/useT'
import { confirmar } from '../core/state/confirmarStore'
import { useHud } from '../core/state/hudStore'
import { reiniciarDemo, salirDemo } from './modo'

/**
 * Píldora persistente de la casa demo (montada en App solo con `esDemo()`):
 * recuerda dónde estás y ofrece la única salida. Nada más hace falta — lo que el
 * visitante toque no se guarda de todos modos, así que «descartar» era recargar
 * y ya. En modo AUTOR (solo dev) suma el estado y las herramientas de autoría:
 * exportar `casa.json` y reconstruir la casa tras subir `DEMO_VERSION`.
 */
export function BarraDemo() {
  const t = useT()
  const [exportando, setExportando] = useState(false)
  const autor = esDemoAutor()
  const movilVertical = useHud((s) => s.movilVertical)

  const exportar = async () => {
    if (exportando) return
    setExportando(true)
    try {
      const { descargarCasaJson } = await import('./exportarCasa')
      await descargarCasaJson()
    } finally {
      setExportando(false)
    }
  }

  const reiniciar = async () => {
    const ok = await confirmar({
      titulo: t('demo.reiniciar', 'Reiniciar'),
      mensaje: t(
        'demo.reiniciar.confirma',
        '¿Reiniciar la demo? La casa de Pep@ se vuelve a construir desde cero.',
      ),
      peligro: true,
    })
    if (ok) void reiniciarDemo()
  }

  // Teléfono vertical: los botones de las esquinas superiores ocupan la franja de
  // arriba (top-3/top-4 + ~36 px de alto), así que la píldora baja por debajo de
  // ellos en vez de montárseles encima.
  return (
    <div
      className={`pointer-events-auto fixed left-1/2 z-[45] -translate-x-1/2 ${
        movilVertical ? 'top-14' : 'top-2'
      }`}
    >
      <div className="ui-panel-glass flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => salirDemo()}
          className="text-[11px] font-bold text-white/85"
        >
          {t('demo.salir', 'Salir de la demo')}
        </button>
        {autor && (
          <>
            <span className="rounded-full bg-amber-400/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {t('demo.autor.chip', 'Modo autor')}
            </span>
            <button
              type="button"
              onClick={() => void exportar()}
              disabled={exportando}
              className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/30 disabled:opacity-50"
            >
              {t('demo.autor.exportar', 'Exportar casa.json')}
            </button>
            <button
              type="button"
              onClick={() => void reiniciar()}
              className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
            >
              {t('demo.reiniciar', 'Reiniciar')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
