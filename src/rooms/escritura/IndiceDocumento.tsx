import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario } from '../_shared/ui'
import type { EntradaIndice } from './indice'

const SANGRIA = ['', '', 'ps-3', 'ps-6']

/**
 * Panel lateral del índice automático: los h1/h2/h3 del documento, navegables.
 * En pantallas chicas flota como overlay sobre el papel; en md+ es una columna.
 */
export function IndiceDocumento({
  entradas,
  onIr,
  onCerrar,
  incluirPdf,
  onIncluirPdf,
  onInsertar,
}: {
  entradas: EntradaIndice[]
  onIr: (pos: number) => void
  onCerrar: () => void
  /** Toggle persistido `Documento.conIndice`: incluir el índice al imprimir. */
  incluirPdf: boolean
  onIncluirPdf: (v: boolean) => void
  /** Inserta el índice como texto al inicio del documento (foto fija). */
  onInsertar: () => void
}) {
  const t = useT()

  return (
    <div className="ui-panel absolute inset-y-0 right-0 z-10 flex w-64 flex-col rounded-xl border border-white/10 md:static md:w-56 md:shrink-0">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          {t('escritura.indice.titulo', 'Índice')}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={t('escritura.indice.cerrar', 'Cerrar el índice')}
          title={t('escritura.indice.cerrar', 'Cerrar el índice')}
          className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      {entradas.length === 0 ? (
        <p className="flex-1 px-3 py-2 text-xs text-white/45">
          {t('escritura.indice.vacio', 'Aún no hay títulos: marca líneas como Título 1, 2 o 3 y aparecerán aquí.')}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {entradas.map((e) => (
            <li key={e.pos} className={SANGRIA[e.nivel]}>
              <button
                type="button"
                onClick={() => onIr(e.pos)}
                className={`w-full truncate rounded-lg px-2 py-1 text-left transition hover:bg-white/10 ${
                  e.nivel === 1 ? 'text-sm font-semibold text-white/85' : 'text-xs text-white/65'
                }`}
              >
                {e.texto || t('escritura.indice.sinTitulo', '(sin título)')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/65">
          <input type="checkbox" checked={incluirPdf} onChange={(e) => onIncluirPdf(e.target.checked)} />
          {t('escritura.indice.incluirPdf', 'Incluir en la primera página al imprimir')}
        </label>
        <BotonSecundario pequeno disabled={entradas.length === 0} onClick={onInsertar}>
          <Icono nombre="indice" /> {t('escritura.indice.insertar', 'Insertar al inicio')}
        </BotonSecundario>
      </div>
    </div>
  )
}
