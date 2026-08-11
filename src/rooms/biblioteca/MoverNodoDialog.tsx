import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { Indice, NodoIndice } from './semilla'

/** Destino de una entrada: su tema (o solo el campo, sin tema). */
export interface DestinoNodo {
  temaId: string | null
  pilarId: string
}

/**
 * Elegir a qué tema del índice se lleva una entrada: el árbol como lista
 * sangrada. Elegir un CAMPO la deja suelta en él, sin tema.
 *
 * No hay arrastrar y soltar a propósito: el árbol es profundo, vive dentro de
 * un panel con scroll y la app va a móvil con Capacitor. Una lista se toca bien
 * con el pulgar.
 */
export function MoverNodoDialog({
  ix,
  titulo,
  onElegir,
  onCerrar,
}: {
  ix: Indice
  titulo: string
  onElegir: (destino: DestinoNodo) => void
  onCerrar: () => void
}) {
  const t = useT()

  const filas: { nodo: NodoIndice; prof: number }[] = []
  const bajar = (n: NodoIndice, prof: number) => {
    filas.push({ nodo: n, prof })
    for (const h of n.hijos) bajar(h, prof + 1)
  }
  for (const c of ix.campos) bajar(c, 0)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">
            <Icono nombre="mover" /> {titulo}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title={t('biblioteca.mover.cerrar', 'Cerrar')}
            aria-label={t('biblioteca.mover.cerrar', 'Cerrar')}
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {filas.map(({ nodo, prof }) => {
            const esCampo = nodo.nivel === 'campo'
            return (
              <button
                key={nodo.id}
                type="button"
                onClick={() =>
                  onElegir(esCampo ? { temaId: null, pilarId: nodo.id } : { temaId: nodo.id, pilarId: nodo.pilarId })
                }
                style={{ paddingLeft: `${0.5 + prof * 0.9}rem` }}
                className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-xs transition hover:bg-white/10 ${
                  esCampo ? 'font-semibold text-white/90' : 'text-white/75'
                }`}
              >
                {nodo.icono && <Icono emoji={nodo.icono} />}
                <span className="min-w-0 truncate">{nodo.titulo}</span>
              </button>
            )
          })}
        </div>

        <p className="border-t border-white/10 pt-2 text-[10px] leading-relaxed text-white/35">
          {t('biblioteca.mover.notaEntrada', 'Si eliges un campo, la entrada queda suelta en él, sin tema.')}
        </p>
      </div>
    </div>
  )
}
