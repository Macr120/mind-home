import { useEffect, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'

interface Sugerencia {
  texto: string
  sel: boolean
}

/**
 * Panel «la IA propone → tú eliges»: carga sugerencias al montar, las muestra
 * con checkboxes preseleccionados y solo escribe lo elegido (molde:
 * RamificarPanel de la biblioteca). Lo comparten la lluvia y el lienzo.
 */
export function PanelSugerencias({
  titulo,
  descripcion,
  cargar,
  onAceptar,
  onCerrar,
}: {
  titulo: string
  descripcion: string
  /** Pide las sugerencias (una vez, al montar). */
  cargar: () => Promise<string[]>
  /** Recibe las elegidas; el caller escribe los registros. */
  onAceptar: (elegidas: string[]) => Promise<void> | void
  onCerrar: () => void
}) {
  const t = useT()
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    void cargar().then((r) => {
      if (vivo) setSugerencias(r.map((texto) => ({ texto, sel: true })))
    })
    return () => {
      vivo = false
    }
    // Solo al montar: el panel se abre ya con su contexto completo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nSel = (sugerencias ?? []).filter((s) => s.sel).length

  const aceptar = async () => {
    if (ocupado || nSel === 0) return
    setOcupado(true)
    await onAceptar((sugerencias ?? []).filter((s) => s.sel).map((s) => s.texto))
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            <Icono nombre="brillo" /> {titulo}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title={t('ideas.cerrar', 'Cerrar')}
            aria-label={t('ideas.cerrar', 'Cerrar')}
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-white/45">{descripcion}</p>

        {sugerencias === null && (
          <p className="animate-pulse px-2 py-6 text-center text-sm text-white/50">
            <Icono nombre="brillo" /> {t('ideas.ia.cargando', 'Pensando ideas…')}
          </p>
        )}

        {sugerencias !== null && sugerencias.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-white/40">
            {t('ideas.ia.vacio', 'La IA no trajo nada nuevo esta vez; intenta de nuevo en un momento.')}
          </p>
        )}

        {sugerencias !== null &&
          sugerencias.map((s, i) => (
            <label key={`${s.texto}-${i}`} className="flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-2">
              <input
                type="checkbox"
                checked={s.sel}
                onChange={() =>
                  setSugerencias((prev) => (prev ?? []).map((x, j) => (j === i ? { ...x, sel: !x.sel } : x)))
                }
                className="mt-0.5 shrink-0"
                style={{ accentColor: COLOR }}
              />
              <span className="min-w-0 flex-1 text-sm text-white/90">{s.texto}</span>
            </label>
          ))}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            {t('ideas.ia.ahoraNo', 'Ahora no')}
          </button>
          {sugerencias !== null && sugerencias.length > 0 && (
            <button
              type="button"
              onClick={() => void aceptar()}
              disabled={nSel === 0 || ocupado}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
              style={{ background: COLOR }}
            >
              {t('ideas.ia.agregar', 'Agregar')} {nSel > 0 && `(${nSel})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
