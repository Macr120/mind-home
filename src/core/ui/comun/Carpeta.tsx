import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'
import { iniciarArrastre } from '../arrastre'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'

/**
 * Carpeta plegable con chevron, título, insignia y conteo. Es la pieza que
 * comparten el archivador de historial de los cuartos, el inventario de objetos
 * y la biblioteca de pistas: vive en `core/ui` porque `core/` no puede importar
 * de `rooms/`, y el inventario es núcleo.
 *
 * `nivel` solo cambia el peso del título y si la carpeta lleva marco propio
 * (nivel 0). Reordenar por arrastre es opcional (`arrastrable`).
 */

const ESTILO_TITULO = [
  'text-sm font-bold',
  'text-sm font-semibold text-white/80',
  'text-xs font-semibold text-white/60',
]

export function Carpeta({
  nivel,
  titulo,
  icono,
  conteo,
  insignia,
  abierta,
  onAlternar,
  arrastrable,
  marcada,
  onArrastrar,
  onEntrar,
  onSalir,
  onSoltar,
  children,
}: {
  nivel: 0 | 1 | 2
  titulo: string
  /** Icono a la izquierda del título; del catálogo, nunca un emoji crudo. */
  icono?: NombreIcono
  conteo: number
  insignia?: ReactNode
  abierta: boolean
  onAlternar: () => void
  /** Reordenable: la carpeta entera se arrastra por su cabecera. */
  arrastrable?: boolean
  marcada?: boolean
  onArrastrar?: () => void
  onEntrar?: () => void
  onSalir?: () => void
  onSoltar?: () => void
  children: ReactNode
}) {
  const t = useT()
  return (
    <div
      draggable={arrastrable}
      onDragStart={(e) => {
        if (!arrastrable) return
        iniciarArrastre(e.currentTarget, e.dataTransfer, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        onArrastrar?.()
      }}
      onDragOver={(e) => {
        if (!arrastrable) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onEntrar?.()
      }}
      onDragLeave={() => onSalir?.()}
      onDrop={(e) => {
        if (!arrastrable) return
        e.preventDefault()
        onSoltar?.()
      }}
      className={`${nivel === 0 ? 'rounded-xl border border-white/10 bg-white/5' : ''} ${
        marcada ? 'border-t-2 border-t-emerald-400' : ''
      }`}
    >
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5"
      >
        <span className="text-xs text-white/40">
          <Icono nombre={abierta ? 'subir' : 'bajar'} />
        </span>
        {icono && (
          <span className="text-sm text-white/60">
            <Icono nombre={icono} />
          </span>
        )}
        <span className={ESTILO_TITULO[nivel]}>{titulo}</span>
        {insignia != null && <span className="text-xs text-white/45">{insignia}</span>}
        <span
          className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50"
          title={
            conteo === 1
              ? t('carpetas.nRegistro', '1 registro')
              : t('carpetas.nRegistros', '{n} registros', { n: conteo })
          }
        >
          {conteo}
        </span>
      </button>
      {abierta && <div className="space-y-1.5 pb-2 pl-3 pr-1.5">{children}</div>}
    </div>
  )
}
