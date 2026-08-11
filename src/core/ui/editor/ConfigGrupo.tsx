import type { ReactNode } from 'react'
import { useEditorUi } from '../../state/editorUiStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'
import { iniciarArrastre } from '../arrastre'

/**
 * Grupo plegable de la pestaña Configuraciones: solo se ve la cabecera hasta
 * que se abre. Arranca plegado, recuerda lo abierto en localStorage y el chat
 * puede desplegar un grupo concreto (`abrirConfigGrupo`).
 *
 * Con los manejadores de arrastre puestos, además se reordena con el asa ⠿; sin
 * ellos se comporta como un acordeón normal.
 */
export function ConfigGrupo({
  id,
  titulo,
  icono,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  esObjetivo,
  esArrastrado,
  children,
}: {
  id: string
  titulo: string
  icono: NombreIcono
  onDragStart?: (id: string) => void
  onDragEnter?: (id: string) => void
  onDragEnd?: () => void
  onDrop?: (id: string) => void
  esObjetivo?: boolean
  esArrastrado?: boolean
  children: ReactNode
}) {
  const t = useT()
  const abierto = useEditorUi((s) => s.configAbiertos[id] === true)
  const toggle = useEditorUi((s) => s.toggleConfigGrupo)
  const arrastrable = !!onDragStart

  return (
    <div
      data-tut={`editor.config.${id}`}
      className={[
        'overflow-hidden rounded-xl border bg-white/5 transition',
        esObjetivo ? 'border-emerald-400/50 ring-1 ring-emerald-400/30' : 'border-white/10',
        esArrastrado ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
      onDragEnter={
        onDragEnter
          ? (e) => {
              e.preventDefault()
              onDragEnter(id)
            }
          : undefined
      }
      onDragOver={arrastrable ? (e) => e.preventDefault() : undefined}
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault()
              onDrop(id)
            }
          : undefined
      }
    >
      <div className="flex items-center">
        {arrastrable && (
          <button
            type="button"
            className="ml-1 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-base leading-none text-white/40 transition hover:bg-white/10 hover:text-white/70 active:cursor-grabbing"
            draggable
            onDragStart={(e) => {
              // El clon con fondo sólido: sobre el vidrio del panel el nativo no se ve.
              iniciarArrastre(
                e.currentTarget.parentElement?.parentElement ?? e.currentTarget,
                e.dataTransfer,
                e.nativeEvent.offsetX,
                e.nativeEvent.offsetY,
              )
              onDragStart?.(id)
            }}
            onDragEnd={onDragEnd}
            title={t('editor.sec.reordenar', 'Arrastrar para reordenar')}
            aria-label={t('editor.sec.reordenarSec', `Reordenar ${titulo}`, { titulo })}
          >
            ⠿
          </button>
        )}
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
          className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-3 text-left transition hover:bg-white/10 ${
            arrastrable ? 'pl-2' : 'pl-3'
          }`}
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
