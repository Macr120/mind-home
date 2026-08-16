import { useState } from 'react'
import { entradasBiblioRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { PILAR_GENERAL } from './constantes'
import { campos, temasDelCampo, useIndice } from './semilla'

export interface EntradaFormInicial {
  titulo: string
  resumen: string
  puntosClave: string[]
  pilarId: string
  temaId?: string
}

/**
 * Modal de crear/editar una entrada de la enciclopedia. Lo usan el destilado
 * (prellenado por la IA para revisar), la entrada manual y la edición.
 */
export function EntradaForm({
  inicial,
  entradaId,
  conversacionId,
  aviso,
  onCerrar,
}: {
  inicial: EntradaFormInicial
  /** Si viene, se edita esa entrada en vez de crear una nueva. */
  entradaId?: number
  /** Charla origen a la que se liga la entrada nueva. */
  conversacionId?: number
  aviso?: string
  onCerrar: () => void
}) {
  const t = useT()
  const [titulo, setTitulo] = useState(inicial.titulo)
  const [pilarId, setPilarId] = useState(inicial.pilarId)
  const [temaId, setTemaId] = useState(inicial.temaId ?? '')
  const [resumen, setResumen] = useState(inicial.resumen)
  const [puntos, setPuntos] = useState(inicial.puntosClave.join('\n'))

  const ix = useIndice()
  // Una sola lista JERÁRQUICA en vez de los dos grupos «Índice»/«Desbloqueados»:
  // desde que la semilla se edita, lo de fábrica y lo tuyo son el mismo árbol.
  const destinos = temasDelCampo(ix, pilarId)
  const puedeGuardar = titulo.trim() !== '' && resumen.trim() !== ''

  const guardar = async () => {
    if (!puedeGuardar) return
    const ahora = new Date().toISOString()
    const datos = {
      titulo: titulo.trim(),
      pilarId,
      temaId: temaId || undefined,
      resumen: resumen.trim(),
      puntosClave: puntos.split('\n').map((x) => x.trim()).filter(Boolean),
      actualizadoEn: ahora,
    }
    if (entradaId != null) await entradasBiblioRepo.update(entradaId, datos)
    else await entradasBiblioRepo.add({ ...datos, conversacionId, creadoEn: ahora })
    onCerrar()
  }

  const labelCampo = 'text-[10px] uppercase tracking-wide text-white/40'
  const inputBase =
    'w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-white/30'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {entradaId != null
              ? t('biblioteca.ent.editar', 'Editar entrada')
              : t('biblioteca.ent.nueva', 'Nueva entrada')}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {aviso && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
            {aviso}
          </p>
        )}

        <div className="space-y-1">
          <p className={labelCampo}>{t('biblioteca.ent.titulo', 'Título')}</p>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t('biblioteca.ent.tituloPh', 'Ej. La entropía')}
            className={inputBase}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className={labelCampo}>{t('biblioteca.ent.campo', 'Campo')}</p>
            <select
              value={pilarId}
              onChange={(e) => {
                setPilarId(e.target.value)
                setTemaId('')
              }}
              className={inputBase}
            >
              <option value={PILAR_GENERAL.id}>
                {PILAR_GENERAL.icon} {PILAR_GENERAL.titulo}
              </option>
              {campos(ix).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icono} {p.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <p className={labelCampo}>{t('biblioteca.ent.tema', 'Tema del índice')}</p>
            <select
              value={temaId}
              onChange={(e) => setTemaId(e.target.value)}
              disabled={destinos.length === 0}
              className={`${inputBase} disabled:opacity-40`}
            >
              <option value="">{t('biblioteca.ent.sinTema', '— Ninguno —')}</option>
              {/* La sangría va con espacios DUROS: el navegador colapsa los normales. */}
              {destinos.map(({ nodo, prof }) => (
                <option key={nodo.id} value={nodo.id}>
                  {'  '.repeat(prof)}
                  {nodo.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <p className={labelCampo}>{t('biblioteca.ent.resumen', 'Resumen')}</p>
          <textarea
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            rows={4}
            placeholder={t('biblioteca.ent.resumenPh', 'Qué aprendiste, en 3-5 frases.')}
            className={`${inputBase} resize-y`}
          />
        </div>

        <div className="space-y-1">
          <p className={labelCampo}>{t('biblioteca.ent.puntos', 'Puntos clave (uno por línea)')}</p>
          <textarea
            value={puntos}
            onChange={(e) => setPuntos(e.target.value)}
            rows={4}
            placeholder={t('biblioteca.ent.puntosPh', 'Idea clave 1\nIdea clave 2')}
            className={`${inputBase} resize-y`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            {t('biblioteca.ent.cancelar', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!puedeGuardar}
            className="ui-accent-bg rounded-xl px-4 py-2 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
          >
            {t('biblioteca.ent.guardar', 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}
