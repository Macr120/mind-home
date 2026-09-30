import { useEffect } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { useEditorUi } from '../../state/editorUiStore'
import { confirmar } from '../../state/confirmarStore'
import { esTemaFabrica, getTema, listaTemas, type Tema } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { IconoMarca } from '../iconos/glifosApps'
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
  // Los temas dinámicos (la casa viaja en un vehículo) van en su propio grupo.
  const estaticos = temas.filter((tm) => !tm.escenario)
  const dinamicos = temas.filter((tm) => tm.escenario)
  const setTemaOverride = useDiseño((s) => s.setTemaOverride)
  useDiseño((s) => s.temaRev)
  // Fusionado con la personalización (la lista trae los temas de fábrica sin ella).
  const activo = getTema(temaGlobal)

  const previa = useEditorUi((s) => s.previaEscenario)
  const setPrevia = useEditorUi((s) => s.setPreviaEscenario)
  // Al cerrar el editor (o esta sección) la vista en marcha se apaga.
  useEffect(() => () => setPrevia(false), [setPrevia])

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

  const tarjeta = (tema: Tema) => (
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
        onClick={() => {
          void setTemaGlobal(tema.id)
          // Un tema dinámico se ve en marcha al elegirlo; uno estático vuelve al plano.
          setPrevia(!!tema.escenario)
        }}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm"
        title={nombreDe(tema)}
      >
        <span className="text-lg"><IconoMarca emoji={tema.icon} size="1.15em" /></span>
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
  )

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.tema.titulo', 'Tema de la MindHaOS')}</p>}
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.tema.desc', 'Aplica estilo a cuartos, fondo, piso y techo, viste la interfaz y al personaje, y activa microanimaciones en el cielo.')}
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
        {estaticos.map(tarjeta)}
      </div>
      {dinamicos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('editor.tema.dinamicos', 'Temas dinámicos')}
          </p>
          <p className="text-[11px] leading-snug text-white/45">
            {t('editor.tema.dinamicosDesc', 'La casa viaja montada en un vehículo y el paisaje corre a su alrededor.')}
          </p>
          <div className="grid grid-cols-2 gap-2">{dinamicos.map(tarjeta)}</div>
          {activo?.escenario && temaGlobal && (
            <div className="space-y-0.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{t('editor.tema.velocidad', 'Velocidad')}</span>
                <span className="tabular-nums text-white/50">
                  {(activo.velocidadEscenario ?? 1) === 0
                    ? t('editor.tema.parado', 'Parado')
                    : `×${(activo.velocidadEscenario ?? 1).toFixed(1)}`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={activo.velocidadEscenario ?? 1}
                onChange={(e) => {
                  setPrevia(true)
                  void setTemaOverride(temaGlobal, { velocidadEscenario: parseFloat(e.target.value) })
                }}
                aria-label={t('editor.tema.velocidad', 'Velocidad')}
                className="w-full accent-emerald-400"
              />
              <button
                type="button"
                onClick={() => setPrevia(!previa)}
                className="flex items-center gap-1.5 pt-1 text-[11px] text-white/55 hover:text-white/85"
              >
                <Icono nombre={previa ? 'mapa' : 'play'} />
                {previa
                  ? t('editor.tema.verPlano', 'Volver al plano para construir')
                  : t('editor.tema.verMarcha', 'Ver en marcha')}
              </button>
            </div>
          )}
        </div>
      )}
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
      <EstiloConIA />
      <MisTemas />
      {temaGlobal != null && <EditorTemaDetalle />}
    </div>
  )
}
