import { useState } from 'react'
import type { ClipPrincipal, Transicion } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { BotonPrimario } from '../_shared/ui'
import { COLOR } from './constantes'
import { RejillaTransiciones } from './RejillaTransiciones'

/**
 * «Transiciones» como herramienta del lateral del editor (como el guion). Con
 * `clip` (una ficha del renglón «Transiciones» de la timeline) edita AL VUELO
 * la transición de entrada de ese clip; sin clip (tile de «Añadir y editar»)
 * se elige una y se aplica a todos. En ambos casos «Aplicar a todos los clips»
 * la pone en todos los de la pista principal salvo el primero (la transición
 * es de ENTRADA desde el anterior).
 */
export function PanelTransiciones({
  clip,
  posicion,
  inicial,
  nPrincipales,
  iconoCerrar,
  onCerrar,
  onCambiar,
  onAplicarTodos,
}: {
  clip: ClipPrincipal | null
  /** Posición del clip en la principal (1 = el primero); 0 sin clip. */
  posicion: number
  /** Sin clip: la transición común de los clips (si todos coinciden); ausente = corte o mezcla. */
  inicial: Transicion | undefined
  nPrincipales: number
  /** Icono del botón de la cabecera: plegar (columna) o cerrar (cajón). */
  iconoCerrar: NombreIcono
  onCerrar: () => void
  /** Solo con clip: su transición cambió. */
  onCambiar: (tr: Transicion | undefined) => void
  onAplicarTodos: (tr: Transicion | undefined) => void
}) {
  const t = useT()
  const [propia, setPropia] = useState<Transicion | undefined>(inicial)
  const valor = clip ? clip.transicion : propia
  const pocos = nPrincipales < 2
  const etiquetaCerrar = iconoCerrar === 'cerrar' ? t('video.panel.cerrar', 'Cerrar el panel') : t('video.lateral.plegarEditor', 'Plegar el editor')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <span className="text-sm">
          <Icono nombre="transicion" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{t('video.anadir.transiciones', 'Transiciones')}</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={etiquetaCerrar}
          title={etiquetaCerrar}
          className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10"
        >
          <Icono nombre={iconoCerrar} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        {clip && (
          <p className="text-[11px] font-semibold text-white/70">
            {posicion <= 1
              ? t('video.transiciones.primero', 'Entrada del primer clip (desde negro)')
              : t('video.transiciones.entre', 'Entre el clip {a} y el {b}', { a: posicion - 1, b: posicion })}
          </p>
        )}
        <RejillaTransiciones valor={valor} esPrimero={clip != null && posicion <= 1} onCambiar={clip ? onCambiar : setPropia} />
        <p className="text-[11px] text-white/45">
          {pocos
            ? t('video.transiciones.pocos', 'Necesitas al menos dos clips en la pista principal.')
            : t('video.transiciones.nota', 'La transición entra en cada clip de la pista principal a partir del segundo; cada clip puede cambiar la suya en su panel.')}
        </p>
        <BotonPrimario type="button" pequeno app={COLOR} disabled={pocos} onClick={() => onAplicarTodos(valor)} className="w-full">
          {t('video.transiciones.aplicar', 'Aplicar a todos los clips')}
        </BotonPrimario>
      </div>
    </div>
  )
}
