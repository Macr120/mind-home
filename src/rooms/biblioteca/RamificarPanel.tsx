import { Icono } from '../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import type { MensajeIA } from '../../core/chat/ia'
import { conversacionesBiblioRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { COLOR } from './constantes'
import { sugerirRamas, agregarRamas, type AnclaTema } from './arbol'

interface Sugerencia {
  titulo: string
  descripcion: string
  sel: boolean
}

/**
 * Panel 🌿: la IA sugiere ramas nuevas bajo el tema de la charla y el usuario
 * elige cuáles agregar al árbol (o charla una al instante con 💬). TODA salida
 * marca `ramificadaEn` para que el panel-al-salir no vuelva a preguntar.
 */
export function RamificarPanel({
  conversacionId,
  ancla,
  mensajes,
  onCerrar,
  onCharlaNueva,
}: {
  conversacionId: number
  /** Nodo de la charla, ya resuelto (temaId + pilar + título). */
  ancla: { temaId: string; pilarId: string; titulo: string }
  mensajes: MensajeIA[]
  /** El caller decide si además navega (panel abierto al salir). */
  onCerrar: () => void
  onCharlaNueva: (ancla: AnclaTema, borrador: string) => void
}) {
  const t = useT()
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    void sugerirRamas(mensajes, ancla).then((r) => {
      if (vivo) setSugerencias(r.map((x) => ({ ...x, sel: true })))
    })
    return () => {
      vivo = false
    }
    // Solo al montar: el panel se abre con la charla ya completa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const marcar = () =>
    conversacionesBiblioRepo.update(conversacionId, { ramificadaEn: new Date().toISOString() })

  const cerrar = async () => {
    if (ocupado) return
    await marcar()
    onCerrar()
  }

  const agregarSeleccionadas = async () => {
    const elegidas = (sugerencias ?? []).filter((s) => s.sel)
    if (!elegidas.length || ocupado) return
    setOcupado(true)
    await agregarRamas(
      ancla.pilarId,
      ancla.temaId,
      elegidas.map(({ titulo, descripcion }) => ({ titulo, descripcion })),
      conversacionId,
    )
    await marcar()
    onCerrar()
  }

  const charlarSugerencia = async (s: Sugerencia) => {
    if (ocupado) return
    setOcupado(true)
    const [nodo] = await agregarRamas(ancla.pilarId, ancla.temaId, [{ titulo: s.titulo, descripcion: s.descripcion }], conversacionId)
    await marcar()
    if (nodo) {
      // Remonta la vista de charla (key por sesión): no hace falta onCerrar.
      onCharlaNueva(
        { temaId: nodo.temaId, pilarId: ancla.pilarId },
        t('biblioteca.enc.promptTema', 'Cuéntame sobre {tema}. {desc}', { tema: s.titulo, desc: s.descripcion }),
      )
    } else {
      onCerrar()
    }
  }

  const nSel = (sugerencias ?? []).filter((s) => s.sel).length

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => void cerrar()}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold"><Icono nombre="rama" /> {t('biblioteca.ramas.titulo', 'Ramificar el árbol')}</p>
          <button
            type="button"
            onClick={() => void cerrar()}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>
        <p className="text-xs leading-relaxed text-white/45">
          {t('biblioteca.ramas.desc', 'Ramas nuevas bajo «{tema}» a partir de esta charla:', { tema: ancla.titulo })}
        </p>

        {sugerencias === null && (
          <p className="animate-pulse px-2 py-6 text-center text-sm text-white/50">
            <Icono nombre="rama" /> {t('biblioteca.ramas.cargando', 'El Sabio busca ramas nuevas…')}
          </p>
        )}

        {sugerencias !== null && sugerencias.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-white/40">
            {t('biblioteca.ramas.vacio', 'No hay ramas nuevas que sugerir para este tema.')}
          </p>
        )}

        {sugerencias !== null &&
          sugerencias.map((s, i) => (
            <label key={i} className="flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-2">
              <input
                type="checkbox"
                checked={s.sel}
                onChange={() =>
                  setSugerencias((prev) =>
                    (prev ?? []).map((x, j) => (j === i ? { ...x, sel: !x.sel } : x)),
                  )
                }
                className="mt-1 shrink-0"
                style={{ accentColor: COLOR }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white/90">{s.titulo}</span>
                {s.descripcion && (
                  <span className="block text-[10px] leading-snug text-white/40">{s.descripcion}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => void charlarSugerencia(s)}
                disabled={ocupado}
                className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10 disabled:opacity-35"
                title={t('biblioteca.ramas.charlarSug', 'Agregar y charlar sobre esta rama')}
              >
                <Icono nombre="chat" />
              </button>
            </label>
          ))}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => void cerrar()}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            {t('biblioteca.ramas.ahoraNo', 'Ahora no')}
          </button>
          {sugerencias !== null && sugerencias.length > 0 && (
            <button
              type="button"
              onClick={() => void agregarSeleccionadas()}
              disabled={nSel === 0 || ocupado}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
              style={{ background: COLOR }}
            >
              {t('biblioteca.ramas.agregar', 'Agregar seleccionadas')} {nSel > 0 && `(${nSel})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
