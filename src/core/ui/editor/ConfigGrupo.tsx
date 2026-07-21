import type { ReactNode } from 'react'
import { useEditorUi } from '../../state/editorUiStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'

/**
 * Grupo plegable de la pestaña Configuraciones: solo se ve la cabecera hasta
 * que se abre. Arranca plegado, recuerda lo abierto en localStorage y el chat
 * puede desplegar un grupo concreto (`abrirConfigGrupo`).
 */
export function ConfigGrupo({
  id,
  titulo,
  icono,
  children,
}: {
  id: string
  titulo: string
  icono: NombreIcono
  children: ReactNode
}) {
  const t = useT()
  const abierto = useEditorUi((s) => s.configAbiertos[id] === true)
  const toggle = useEditorUi((s) => s.toggleConfigGrupo)

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-expanded={abierto}
        title={
          abierto
            ? t('editor.sec.contraer', `Contraer ${titulo}`, { titulo })
            : t('editor.sec.expandir', `Expandir ${titulo}`, { titulo })
        }
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/10"
      >
        <Icono nombre={icono} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">
          {titulo}
        </span>
        <span className="shrink-0 text-[10px] text-white/45">{abierto ? '▼' : '▶'}</span>
      </button>
      {abierto && <div className="border-t border-white/10 p-3">{children}</div>}
    </div>
  )
}
