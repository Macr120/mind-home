import { useDiseño } from '../../state/disenoStore'
import { TEMAS } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { EditorTemaDetalle } from './EditorTemaDetalle'

/**
 * Selector de tema estacional global de la casa (editor de mapa).
 * Cambia el "re-vestido" de TODOS los cuartos a la vez. "Sin tema" la deja normal.
 */
export function EditorTemaSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  const setTemaGlobal = useDiseño((s) => s.setTemaGlobal)

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.tema.titulo', 'Tema de la casa')}</p>}
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.tema.desc', 'Aplica estilo a cuartos, fondo, piso y techo. Activa microanimaciones en el cielo.')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTemaGlobal(null)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition"
          style={{
            background:
              temaGlobal == null
                ? 'color-mix(in srgb, var(--ui-ink) 12%, transparent)'
                : 'color-mix(in srgb, var(--ui-ink) 5%, transparent)',
            boxShadow:
              temaGlobal == null ? 'inset 0 0 0 1px color-mix(in srgb, var(--ui-ink) 45%, transparent)' : 'none',
          }}
        >
          <span className="text-lg"><Icono nombre="casa" /></span>
          <span className="text-white/80">{t('editor.tema.sin', 'Sin tema')}</span>
        </button>
        {TEMAS.map((tema) => (
          <button
            key={tema.id}
            type="button"
            onClick={() => setTemaGlobal(tema.id)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition"
            style={{
              background:
                temaGlobal === tema.id
                  ? `${tema.paleta[0]}55`
                  : 'color-mix(in srgb, var(--ui-ink) 5%, transparent)',
              boxShadow: temaGlobal === tema.id ? `inset 0 0 0 1px ${tema.paleta[1] ?? tema.paleta[0]}` : 'none',
            }}
            title={tema.nombre}
          >
            <span className="text-lg"><Icono emoji={tema.icon} /></span>
            <span className="text-white/80">{tema.nombre}</span>
          </button>
        ))}
      </div>
      {temaGlobal != null && <EditorTemaDetalle />}
    </div>
  )
}
