import type { ReactNode } from 'react'
import { useEditorUi } from '../../state/editorUiStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'
import type { PropsArrastre } from '../comun/arrastre'

/**
 * Grupo plegable de la pestaña Configuraciones: solo se ve la cabecera hasta
 * que se abre. Arranca plegado, recuerda lo abierto en localStorage y el chat
 * puede desplegar un grupo concreto (`abrirConfigGrupo`).
 *
 * Con `gesto` puesto, además se reordena arrastrando la cabecera entera (el
 * gesto compartido de la casa); sin él se comporta como un acordeón normal.
 */
export function ConfigGrupo({
  id,
  titulo,
  icono,
  gesto,
  esObjetivo,
  esArrastrado,
  children,
}: {
  id: string
  titulo: string
  icono: NombreIcono
  gesto?: PropsArrastre
  esObjetivo?: boolean
  esArrastrado?: boolean
  children: ReactNode
}) {
  const t = useT()
  const abierto = useEditorUi((s) => s.configAbiertos[id] === true)
  const toggle = useEditorUi((s) => s.toggleConfigGrupo)

  return (
    <div
      data-tut={`editor.config.${id}`}
      data-grupo={id}
      className={[
        'overflow-hidden rounded-xl border border-white/10 bg-white/5 transition',
        esObjetivo ? 'border-t-2 border-t-accent' : '',
        esArrastrado ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      <div {...gesto} className={`flex items-center ${gesto ? 'cursor-grab' : ''}`}>
        <button
          type="button"
          data-tut={`editor.config.${id}.abrir`}
          onClick={() => toggle(id)}
          aria-expanded={abierto}
          title={
            abierto
              ? t('editor.sec.contraer', `Contraer ${titulo}`, { titulo })
              : t('editor.sec.expandir', `Expandir ${titulo}`, { titulo })
          }
          className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pe-3 ps-3 text-start transition hover:bg-white/10"
        >
          <Icono nombre={icono} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">
            {titulo}
          </span>
          <span className="shrink-0 text-[10px] text-white/45">{abierto ? '▼' : '▶'}</span>
        </button>
      </div>
      {abierto && <div className="border-t border-white/10 p-3">{children}</div>}
    </div>
  )
}
