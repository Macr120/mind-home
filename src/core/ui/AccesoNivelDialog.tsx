import { useLayout } from '../state/layoutStore'
import type { TipoAcceso } from '../house/walls'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const ACCESOS: { tipo: TipoAcceso; icon: string }[] = [
  { tipo: 'escalera', icon: '🌀' },
  { tipo: 'elevador', icon: '🛗' },
  { tipo: 'resbaladilla', icon: '💨' },
]

/**
 * Al crear el primer cuarto de un nivel nuevo se pregunta cómo se sube a él (una vez por
 * nivel). El estado vive en `layoutStore.accesoPendiente`; al elegir se crea el acceso.
 */
export function AccesoNivelDialog() {
  const t = useT()
  const pendiente = useLayout((s) => s.accesoPendiente)
  const confirmar = useLayout((s) => s.confirmarAccesoNivel)
  const cancelar = useLayout((s) => s.cancelarAccesoNivel)

  if (!pendiente) return null
  const nivel = pendiente.nivel

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cancelar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-xl">
            <Icono nombre="niveles" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black">
              {t('acceso.nuevoNivel', `Nuevo nivel ${nivel}`, { n: String(nivel) })}
            </p>
            <p className="text-[11px] text-white/45">
              {t('construir.elegirAcceso', '¿Cómo se sube a este nivel nuevo? (se elige una vez por nivel)')}
            </p>
          </div>
          <button
            onClick={cancelar}
            className="ms-auto rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>

        <div className="space-y-2">
          {ACCESOS.map((a) => (
            <button
              key={a.tipo}
              onClick={() => void confirmar(a.tipo)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-start transition hover:bg-white/10"
            >
              <span className="text-2xl"><Icono emoji={a.icon} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">
                  {t(`construir.${a.tipo}.label` as Parameters<typeof t>[0], a.tipo)}
                </span>
                <span className="block text-[11px] text-white/45">
                  {t(`construir.${a.tipo}.desc` as Parameters<typeof t>[0], '')}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
