import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'
import type { PropsArrastre } from './arrastre'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'

/**
 * Carpeta plegable con chevron, título, insignia y conteo. Es la pieza que
 * comparten el archivador de historial de los cuartos, el inventario de objetos
 * y la biblioteca de pistas: vive en `core/ui` porque `core/` no puede importar
 * de `rooms/`, y el inventario es núcleo.
 *
 * `nivel` solo cambia el peso del título y si la carpeta lleva marco propio
 * (nivel 0). Reordenar por arrastre es opcional (`gesto`): el gesto compartido
 * de la casa levanta la carpeta entera, sin asa.
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
  gesto,
  claveArrastre,
  enMano,
  marcada,
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
  /** Reordenable: el gesto compartido (`useArrastre`) levanta la carpeta entera. */
  gesto?: PropsArrastre
  /** Clave con la que la carpeta se ofrece como destino (`data-carpeta`). */
  claveArrastre?: string
  /** Va en la mano: se atenúa como hueco. */
  enMano?: boolean
  /** La carpeta en mano caería justo antes de esta. */
  marcada?: boolean
  children: ReactNode
}) {
  const t = useT()
  return (
    <div
      {...gesto}
      data-carpeta={claveArrastre}
      className={`${gesto ? 'cursor-grab' : ''} ${nivel === 0 ? 'rounded-xl border border-white/10 bg-white/5' : ''} ${
        marcada ? 'border-t-2 border-t-accent' : ''
      } ${enMano ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start transition hover:bg-white/5"
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
          className="ms-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50"
          title={
            conteo === 1
              ? t('carpetas.nRegistro', '1 registro')
              : t('carpetas.nRegistros', '{n} registros', { n: conteo })
          }
        >
          {conteo}
        </span>
      </button>
      {abierta && <div className="space-y-1.5 pb-2 ps-3 pe-1.5">{children}</div>}
    </div>
  )
}
