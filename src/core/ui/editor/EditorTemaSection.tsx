import { useDiseño } from '../../state/disenoStore'
import { confirmar } from '../../state/confirmarStore'
import { esTemaFabrica, listaTemas, type Tema } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { EditorTemaDetalle } from './EditorTemaDetalle'
import { MisTemas } from './MisTemas'
import { EstiloConIA } from './EstiloConIA'

/**
 * Selector de tema estacional global de la casa (editor de mapa).
 * Cambia el "re-vestido" de TODOS los cuartos a la vez. "Sin tema" la deja normal.
 * Los temas de fábrica y los creados por el usuario se pueden borrar.
 */
export function EditorTemaSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  const setTemaGlobal = useDiseño((s) => s.setTemaGlobal)
  const borrarTema = useDiseño((s) => s.borrarTema)
  const restaurarTemasFabrica = useDiseño((s) => s.restaurarTemasFabrica)
  const temasOcultos = useDiseño((s) => s.temasOcultos)
  // Solo para repintar al crear o borrar temas del usuario (el registro vive en temas.ts).
  useDiseño((s) => s.temasUsuario)
  const temas = listaTemas(temasOcultos)

  const nombreDe = (tema: Tema) => (esTemaFabrica(tema.id) ? t(`tema.${tema.id}`, tema.nombre) : tema.nombre)

  const borrar = async (tema: Tema) => {
    const ok = await confirmar({
      titulo: t('editor.tema.borrarTitulo', 'Eliminar el tema'),
      mensaje: esTemaFabrica(tema.id)
        ? t('editor.tema.borrarFabrica', '«{nombre}» dejará de aparecer; puedes recuperarlo con «Restaurar temas de fábrica».', {
            nombre: nombreDe(tema),
          })
        : nombreDe(tema),
      textoOk: t('editor.tema.borrarOk', 'Eliminar'),
      peligro: true,
    })
    if (ok) await borrarTema(tema.id)
  }

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.tema.titulo', 'Tema de la MindHaOS')}</p>}
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.tema.desc', 'Aplica estilo a cuartos, fondo, piso y techo, viste la interfaz y al personaje, y activa microanimaciones en el cielo.')}
      </p>
      <EstiloConIA />
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
        {temas.map((tema) => (
          <div
            key={tema.id}
            className="group relative flex items-center rounded-lg transition"
            style={{
              background:
                temaGlobal === tema.id
                  ? `${tema.paleta[0]}55`
                  : 'color-mix(in srgb, var(--ui-ink) 5%, transparent)',
              boxShadow: temaGlobal === tema.id ? `inset 0 0 0 1px ${tema.paleta[1] ?? tema.paleta[0]}` : 'none',
            }}
          >
            <button
              type="button"
              onClick={() => setTemaGlobal(tema.id)}
              className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm"
              title={nombreDe(tema)}
            >
              <span className="text-lg"><Icono emoji={tema.icon} /></span>
              <span className="truncate text-white/80">{nombreDe(tema)}</span>
            </button>
            <button
              type="button"
              onClick={() => void borrar(tema)}
              className="me-1 flex-shrink-0 rounded p-1 text-[11px] text-white/30 opacity-60 transition hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
              title={t('editor.tema.borrarTitulo', 'Eliminar el tema')}
              aria-label={t('editor.tema.borrarTitulo', 'Eliminar el tema')}
            >
              <Icono nombre="basura" />
            </button>
          </div>
        ))}
      </div>
      {temasOcultos.length > 0 && (
        <button
          type="button"
          onClick={() => void restaurarTemasFabrica()}
          className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80"
        >
          <Icono nombre="restaurar" />
          {t('editor.tema.restaurarFabrica', 'Restaurar temas de fábrica')}
        </button>
      )}
      <MisTemas />
      {temaGlobal != null && <EditorTemaDetalle />}
    </div>
  )
}
