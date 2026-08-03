import { useEffect, useState } from 'react'
import { useT } from '../core/i18n/useT'
import { getPlantilla } from '../core/registry'
import { construirDemo } from './construir'
import { salirDemo } from './modo'

/**
 * Pantalla de progreso mientras se construye la casa demo. Al terminar RECARGA
 * la página: los stores de la casa hidrataron contra la BD vacía y solo releen
 * recargando (mismo motivo que restaurar un respaldo).
 */
export function PantallaDemo() {
  const t = useT()
  const [progreso, setProgreso] = useState<{ clave: string; paso: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let viva = true
    construirDemo((clave, paso, total) => {
      if (viva) setProgreso({ clave, paso, total })
    })
      .then(() => location.reload())
      .catch((e) => {
        console.error('[MPH demo] Falló la construcción:', e)
        if (viva) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      viva = false
    }
  }, [])

  const etiqueta = (clave: string) => {
    if (clave.startsWith('app:')) {
      const p = getPlantilla(clave.slice(4))
      return p ? t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0] : clave.slice(4)
    }
    return t(clave, CLAVES_ES[clave] ?? clave)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115] p-4">
      <div className="w-full max-w-sm space-y-3 text-center">
        <img src="/icon.svg" alt="" className="mx-auto h-12 w-12" />
        {error ? (
          <>
            <p className="text-sm font-bold text-white/85">
              {t('demo.error', 'La demo no se pudo construir.')}
            </p>
            <p className="text-[11px] leading-snug text-red-400/80">{error}</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => location.reload()}
                className="ui-accent-bg rounded-md px-3 py-1.5 text-xs font-bold"
              >
                {t('demo.reintentar', 'Reintentar')}
              </button>
              <button
                type="button"
                onClick={() => salirDemo()}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60"
              >
                {t('demo.salir', 'Salir de la demo')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-base font-bold text-white/90">
              {t('demo.bienvenida.titulo', 'Esta es la casa de Pep@')}
            </p>
            <p className="text-xs leading-snug text-white/45">
              {t(
                'demo.bienvenida.sub',
                'Un año de vida real dentro: su maratón, su viaje a Japón, su piano y sus finanzas. Puedes tocarlo todo; nada se guarda.',
              )}
            </p>
            <p className="pt-1 text-xs text-white/45">
              {t('demo.construyendo.sub', 'Un año de la vida de Pep@ se acomoda en su lugar.')}
            </p>
            {progreso && (
              <>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="ui-accent-bg h-full rounded-full transition-all"
                    style={{ width: `${Math.round(((progreso.paso + 1) / progreso.total) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-white/45">{etiqueta(progreso.clave)}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Fallbacks en español de los pasos (la clave i18n manda si existe).
const CLAVES_ES: Record<string, string> = {
  'demo.paso.limpiar': 'Limpiando el terreno',
  'demo.paso.casa': 'Levantando la casa',
  'demo.paso.catalogos': 'Acomodando los catálogos',
  'demo.paso.final': 'Últimos toques',
}
