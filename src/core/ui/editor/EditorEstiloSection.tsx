import { useDiseño } from '../../state/disenoStore'
import { ESTILOS, EFECTOS, estadoEfecto, type EstiloVisualId } from '../../house/estilos'
import { getTema } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Estilo visual del mapa 3D: estilo de render (cómic, miniatura, retro, neón) +
 * interruptor de efectos. El estilo se guarda POR TEMA (cada tema recuerda el
 * suyo); sin tema activo, edita la config de "sin tema".
 */
export function EditorEstiloSection({
  embed,
  sinDestino,
  sinTitulo,
}: { embed?: boolean; sinDestino?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const estiloVisual = useDiseño((s) => s.estiloVisual)
  const setEstiloVisual = useDiseño((s) => s.setEstiloVisual)
  const efectosVisuales = useDiseño((s) => s.efectosVisuales)
  const setEfectosVisuales = useDiseño((s) => s.setEfectosVisuales)
  const efectosConfig = useDiseño((s) => s.efectosConfig)
  const setEfecto = useDiseño((s) => s.setEfecto)
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const destino = tema ? tema.nombre : t('editor.tema.sin', 'Sin tema')

  // Elegir un estilo con los efectos apagados los enciende (si no, "no pasa nada").
  const elegirEstilo = async (id: EstiloVisualId) => {
    await setEstiloVisual(id)
    if (id !== 'normal' && !useDiseño.getState().efectosVisuales) {
      await setEfectosVisuales(true)
    }
  }

  const opciones: { id: boolean; label: string }[] = [
    { id: true, label: t('ajustes.efectos.on', 'Activados') },
    { id: false, label: t('ajustes.efectos.off', 'Apagados') },
  ]

  return (
    <div className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}>
      {/* Estilo de render del mapa */}
      <div className="space-y-1.5">
        {!sinTitulo && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('ajustes.estiloMapa', 'Estilo visual del mapa')}
          </p>
        )}
        {!sinDestino && (
          <p className="text-[11px] leading-snug text-white/45">
            {t('ajustes.estiloAplica', 'Se aplica a:')} <span className="text-white/70">{destino}</span>
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {ESTILOS.map((e) => {
            const activo = estiloVisual === e.id
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => elegirEstilo(e.id)}
                title={t(`estilo.${e.id}.desc`, e.desc)}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Icono emoji={e.icon} />
                <span>{t(`estilo.${e.id}`, e.nombre)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Efectos visuales (postprocesado) on/off */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.efectos', 'Efectos visuales')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {opciones.map((o) => {
            const activo = efectosVisuales === o.id
            return (
              <button
                key={String(o.id)}
                type="button"
                onClick={() => setEfectosVisuales(o.id)}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {o.id && <Icono emoji="✨" />}
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.efectos.desc',
            'Oclusión, brillos y estilos de render. Apágalos si el mapa va lento.',
          )}
        </p>
      </div>

      {/* Ajuste fino por efecto: interruptor + intensidad */}
      <div className={`space-y-2 ${efectosVisuales ? '' : 'pointer-events-none opacity-40'}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.ajusteEfectos', 'Ajuste de efectos')}
        </p>
        {EFECTOS.map((def) => {
          const est = estadoEfecto(efectosConfig, def.id)
          return (
            <div key={def.id} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEfecto(def.id, { on: !est.on, val: est.val })}
                  title={t(`efecto.${def.id}.desc`, def.desc)}
                  className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition ${
                    est.on ? 'ui-accent-bg justify-end' : 'justify-start bg-white/15'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-white shadow" />
                </button>
                <span className="text-xs"><Icono emoji={def.icon} /></span>
                <span className="flex-1 truncate text-xs text-white/75">
                  {t(`efecto.${def.id}`, def.nombre)}
                </span>
                {est.on && !def.soloToggle && (
                  <span className="text-[10px] tabular-nums text-white/40">
                    {Math.round(est.val * 100)}%
                  </span>
                )}
              </div>
              {est.on && !def.soloToggle && (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={est.val}
                  onChange={(e) => setEfecto(def.id, { on: true, val: parseFloat(e.target.value) })}
                  className="mt-1.5 w-full accent-emerald-400"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
