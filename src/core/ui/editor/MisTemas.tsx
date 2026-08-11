import { useDiseño } from '../../state/disenoStore'
import { confirmar, pedirTexto } from '../../state/confirmarStore'
import { TEMAS } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Temas propios: congela el tema puesto —con su personalización y su fondo de
 * cielo— bajo un nombre, para volver a ponerlo de un toque. Aplicarlo no usa
 * maquinaria nueva: reproduce tema global + override + fondo.
 */
export function MisTemas() {
  const t = useT()
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  const temasPropios = useDiseño((s) => s.temasPropios)
  const guardarTemaPropio = useDiseño((s) => s.guardarTemaPropio)
  const aplicarTemaPropio = useDiseño((s) => s.aplicarTemaPropio)
  const eliminarTemaPropio = useDiseño((s) => s.eliminarTemaPropio)

  const guardar = async () => {
    const base = TEMAS.find((x) => x.id === temaGlobal)
    const nombre = await pedirTexto({
      titulo: t('editor.tema.guardarTitulo', 'Guardar este tema'),
      mensaje: t(
        'editor.tema.guardarMensaje',
        'Se guarda el tema tal como lo tienes ahora: colores, cascarón, luz, niebla, estilo y fondo de cielo.',
      ),
      textoOk: t('editor.tema.guardarOk', 'Guardar'),
      valor: base?.nombre ?? '',
    })
    if (nombre) await guardarTemaPropio(nombre)
  }

  const borrar = async (id: number, nombre: string) => {
    const ok = await confirmar({
      titulo: t('editor.tema.borrarTitulo', 'Eliminar el tema'),
      mensaje: nombre,
      textoOk: t('editor.tema.borrarOk', 'Eliminar'),
      peligro: true,
    })
    if (ok) await eliminarTemaPropio(id)
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {t('editor.tema.misTemas', 'Mis temas')}
        </p>
        {temaGlobal != null && (
          <button
            type="button"
            onClick={() => void guardar()}
            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold texto-cta hover:bg-emerald-600"
          >
            {t('editor.tema.guardar', '+ Guardar el actual')}
          </button>
        )}
      </div>

      {temasPropios.length === 0 ? (
        <p className="text-[10px] leading-snug text-white/35">
          {temaGlobal == null
            ? t(
                'editor.tema.sinTemaParaGuardar',
                'Elige un tema y personalízalo: después podrás guardarlo aquí con nombre.',
              )
            : t(
                'editor.tema.sinTemasPropios',
                'Guarda el tema que tienes puesto para volver a ponerlo cuando quieras.',
              )}
        </p>
      ) : (
        <div className="space-y-1.5">
          {temasPropios.map((tp) => {
            if (tp.id == null) return null
            const base = TEMAS.find((x) => x.id === tp.base)
            return (
              <div
                key={tp.id}
                className="overflow-hidden rounded-lg border border-white/10 bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => void aplicarTemaPropio(tp.id!)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition hover:bg-white/5"
                  title={base?.nombre}
                >
                  <span className="text-base"><Icono emoji={base?.icon ?? '🎨'} /></span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/80">
                    {tp.nombre}
                  </span>
                  {/* Franjas de la paleta del tema base: identifica el preset de un vistazo. */}
                  <span className="flex h-3 w-12 flex-shrink-0 overflow-hidden rounded-sm">
                    {(base?.paleta ?? []).map((c, i) => (
                      <span key={i} className="h-full flex-1" style={{ background: c }} />
                    ))}
                  </span>
                </button>
                <div className="flex border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => void aplicarTemaPropio(tp.id!)}
                    className="flex-1 py-1 text-[9px] text-white/45 hover:bg-white/5 hover:text-white/70"
                  >
                    {t('editor.tema.usar', 'Usar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void borrar(tp.id!, tp.nombre)}
                    className="flex-1 border-l border-white/10 py-1 text-[9px] text-red-400/70 hover:bg-red-500/10"
                  >
                    {t('editor.tema.borrarPropio', 'Borrar')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
