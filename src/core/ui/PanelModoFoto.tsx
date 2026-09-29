import { MUESTRAS_FOTO, useModoFoto, type CalidadFoto } from '../state/modoFotoStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/** Barra del modo foto: progreso del trazado, calidad, descargar y salir. */
export function PanelModoFoto() {
  const t = useT()
  const activo = useModoFoto((s) => s.activo)
  const fase = useModoFoto((s) => s.fase)
  const muestras = useModoFoto((s) => s.muestras)
  const calidad = useModoFoto((s) => s.calidad)
  const foto = useModoFoto((s) => s.foto)
  const setCalidad = useModoFoto((s) => s.setCalidad)
  const cerrar = useModoFoto((s) => s.cerrar)
  if (!activo) return null

  const objetivo = MUESTRAS_FOTO[calidad]
  const pct = Math.min(100, Math.round((muestras / objetivo) * 100))
  const calidades: { id: CalidadFoto; label: string }[] = [
    { id: 'rapida', label: t('modoFoto.rapida', 'Rápida') },
    { id: 'alta', label: t('modoFoto.alta', 'Alta') },
  ]

  return (
    <div className="ui-hud fixed bottom-24 left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 space-y-2 rounded-xl border border-white/10 p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <Icono nombre="foto" />
        <p className="flex-1 text-sm font-semibold">{t('modoFoto.titulo', 'Modo foto')}</p>
        <div className="flex overflow-hidden rounded-md border border-white/10">
          {calidades.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => calidad !== c.id && setCalidad(c.id)}
              className={`px-2 py-0.5 text-[11px] font-semibold transition ${
                calidad === c.id ? 'ui-accent-bg' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {fase === 'error' ? (
        <p className="text-[11px] leading-snug text-red-300">
          {t('modoFoto.error', 'Este equipo no pudo calcular la foto. Prueba con la calidad rápida.')}
        </p>
      ) : (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="ui-accent-bg h-full transition-[width]" style={{ width: `${fase === 'lista' ? 100 : pct}%` }} />
          </div>
          <p className="text-[11px] text-white/50">
            {fase === 'preparando'
              ? t('modoFoto.preparando', 'Preparando la escena…')
              : fase === 'lista'
                ? t('modoFoto.lista', 'Foto lista.')
                : t('modoFoto.trazando', 'Calculando la luz… {pct} %', { pct })}
          </p>
        </>
      )}

      <div className="flex gap-2">
        {fase === 'trazando' && (
          <button
            type="button"
            onClick={() => useModoFoto.setState({ terminarYa: true })}
            className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/10"
          >
            {t('modoFoto.terminar', 'Terminar ya')}
          </button>
        )}
        {foto && (
          <a
            href={foto}
            download="mindhaos-foto.png"
            className="ui-accent-bg flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold"
          >
            <Icono nombre="descargar" />
            {t('modoFoto.descargar', 'Descargar PNG')}
          </a>
        )}
        <button
          type="button"
          onClick={cerrar}
          className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/10"
        >
          {t('modoFoto.salir', 'Salir')}
        </button>
      </div>
    </div>
  )
}
