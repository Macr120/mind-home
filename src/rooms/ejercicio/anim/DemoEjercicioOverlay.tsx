import { Suspense, useEffect, useState } from 'react'
import { useDemoEjercicio } from '../../../core/state/demoEjercicioStore'
import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import { urlImagenPreset } from '../imagenesPreset'
import { descEjercicio, nombreEjercicio } from '../nombres'
import { VisorEjercicio, tienePatron } from './index'
import { hayHover } from './miniaturasStore'

/**
 * «Muéstrame cómo se hace el press banca»: el diálogo que abre el chat con el
 * avatar haciendo el ejercicio (o su ilustración si no tiene animación). Se
 * monta en la raíz de la app (lazy) y se cierra con ✕, Esc o tocando fuera.
 */
export default function DemoEjercicioOverlay() {
  const t = useT()
  const nombre = useDemoEjercicio((s) => s.nombre)
  const descripcion = useDemoEjercicio((s) => s.descripcion)
  const cerrar = useDemoEjercicio((s) => s.cerrar)
  const [vivo, setVivo] = useState(false)

  // Esc cierra en fase capture, antes que el chat o el cuarto de detrás.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      cerrar()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [cerrar])

  if (!nombre) return null
  const conAnim = tienePatron(nombre)
  const url = urlImagenPreset(nombre)
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black">{nombreEjercicio(t, nombre)}</p>
            {descripcion && (
              <p className="text-[11px] text-white/45">{descEjercicio(t, nombre, descripcion)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrar}
            title={t('ejercicio.reproductor.cerrar', 'Cerrar')}
            className="ms-auto rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>
        <div
          className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
          onMouseEnter={() => setVivo(true)}
          onMouseLeave={() => setVivo(false)}
        >
          {conAnim ? (
            <Suspense
              fallback={
                <span className="flex flex-col items-center gap-2 py-8 text-xs text-white/45">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
                  {t('ejercicio.anim.cargando', 'Cargando…')}
                </span>
              }
            >
              <VisorEjercicio nombre={nombre} jugando={vivo || !hayHover()} className="h-72" />
            </Suspense>
          ) : url ? (
            <img src={url} alt={nombreEjercicio(t, nombre)} className="max-h-[50vh] w-full object-contain" />
          ) : (
            <span className="py-10 text-3xl text-white/20">
              <Icono nombre="foto" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
