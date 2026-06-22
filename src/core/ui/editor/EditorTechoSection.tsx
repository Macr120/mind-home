import { useDiseño } from '../../state/disenoStore'
import { TECHOS_GENERICOS, TECHOS_TEMA } from '../../house/techos'
import { useT } from '../../i18n/useT'

function BotonTecho({
  activo,
  emoji,
  nombre,
  subtitulo,
  onClick,
}: {
  activo: boolean
  emoji: string
  nombre: string
  subtitulo?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={subtitulo}
      className={[
        'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-center transition',
        activo
          ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
      ].join(' ')}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[10px] font-medium leading-tight">{nombre}</span>
      {subtitulo && (
        <span className="text-[9px] leading-none text-white/35">{subtitulo}</span>
      )}
    </button>
  )
}

/**
 * Selector de estilo de techo global (editor de mapa).
 * Genéricos + por tema; `null` usa el color de cada cuarto.
 */
export function EditorTechoSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const techoTipo = useDiseño((s) => s.techoTipo)
  const setTechoTipo = useDiseño((s) => s.setTechoTipo)

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.techo.titulo', 'Techos de la casa')}</p>}
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.techo.desc', 'Activa la vista 🏠 para verlos. Al elegir tema se aplica el techo correspondiente.')}
      </p>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techo.genericos', 'Genéricos')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <BotonTecho
            activo={techoTipo === null}
            emoji="🎨"
            nombre={t('editor.techo.porCuarto', 'Por cuarto')}
            onClick={() => setTechoTipo(null)}
          />
          {TECHOS_GENERICOS.map((techo) => (
            <BotonTecho
              key={techo.id}
              activo={techoTipo === techo.id}
              emoji={techo.emoji}
              nombre={techo.nombre}
              onClick={() => setTechoTipo(techo.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.techo.porTema', 'Por tema')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {TECHOS_TEMA.map((techo) => (
            <BotonTecho
              key={techo.id}
              activo={techoTipo === techo.id}
              emoji={techo.emoji}
              nombre={techo.nombre}
              subtitulo={techo.tema}
              onClick={() => setTechoTipo(techo.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
