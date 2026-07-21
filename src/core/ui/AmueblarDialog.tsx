import { useAmueblar } from '../state/amueblarStore'
import { getPlantilla } from '../registry'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Al asignar una app con mobiliario a un cuarto: pregunta si traer todos los
 * objetos o solo el objeto principal (la app).
 */
export function AmueblarDialog() {
  const t = useT()
  const pendiente = useAmueblar((s) => s.pendiente)
  const cerrar = useAmueblar((s) => s.cerrar)
  const confirmar = useAmueblar((s) => s.confirmar)

  if (!pendiente) return null
  const p = getPlantilla(pendiente.plantillaId)
  const color = p?.color ?? '#94a3b8'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-sm rounded-2xl border border-white/10 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2">
          {p && (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base"
              style={{ background: `${color}33` }}
            >
              <Icono emoji={p.icon} />
            </span>
          )}
          <span className="min-w-0 flex-1 text-base font-black text-white/90">
            {t('amueblar.titulo', '¿Cómo amueblar el cuarto?')}
          </span>
          <button
            type="button"
            onClick={cerrar}
            className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void confirmar(false)}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
          >
            <span className="text-xl"><Icono nombre="sofa" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white/90">
                {t('amueblar.completo', 'Amueblado')}
              </span>
              <span className="block text-[11px] leading-snug text-white/50">
                {t('amueblar.completoDesc', 'Trae todos los objetos de la app.')}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => void confirmar(true)}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
          >
            <span className="text-xl"><Icono nombre="cuarto-bodega" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white/90">
                {t('amueblar.principal', 'Solo el objeto principal')}
              </span>
              <span className="block text-[11px] leading-snug text-white/50">
                {t('amueblar.principalDesc', 'Solo el objeto que abre la app, sin el resto.')}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
