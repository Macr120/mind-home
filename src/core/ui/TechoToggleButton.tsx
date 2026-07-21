import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const btn =
  'ui-hud flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-lg transition hover:bg-white/15'
const activo = 'border-amber-400/50 bg-amber-400/15'

/** Pone/quita el techo de la casa 3D. No mueve los pisos (eso lo hace ExplotarToggleButton). */
export function TechoToggleButton() {
  const t = useT()
  const conTecho = useHouse((s) => s.conTecho)
  const toggleTecho = useHouse((s) => s.toggleTecho)

  return (
    <button
      type="button"
      onClick={toggleTecho}
      title={conTecho ? t('ui.techo.quitar', 'Quitar techo') : t('ui.techo.ver', 'Poner techo')}
      className={`${btn} ${conTecho ? activo : ''}`}
      aria-pressed={conTecho}
    >
      <Icono nombre="casa" />
    </button>
  )
}

/**
 * Separa/junta los pisos en el aire. Solo aparece si hay algún piso ALTO colocado: es el
 * único caso en que hay algo que separar (los sótanos nunca se explotan, ver `nivelBaseY`).
 */
export function ExplotarToggleButton() {
  const t = useT()
  const explotado = useHouse((s) => s.explotado)
  const toggleExplotado = useHouse((s) => s.toggleExplotado)
  const hayPisoAlto = useLayout((s) =>
    Object.keys(s.placed).some((id) => s.placed[id] && (s.niveles[id] ?? 0) > 0),
  )

  if (!hayPisoAlto) return null

  return (
    <button
      type="button"
      onClick={toggleExplotado}
      title={
        explotado
          ? t('ui.explotar.juntar', 'Juntar los pisos')
          : t('ui.explotar.separar', 'Separar los pisos')
      }
      className={`${btn} ${explotado ? activo : ''}`}
      aria-pressed={explotado}
    >
      <Icono nombre={explotado ? 'pisosJuntar' : 'pisosSeparar'} />
    </button>
  )
}
