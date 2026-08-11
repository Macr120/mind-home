import type { TipoBloque } from '../data/db'
import { useT, type TFunc } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Catálogo de los 12 tipos de herramienta (bloque) de una plantilla
 * personalizada y la paleta para agregarlos. Lo comparten el editor del
 * catálogo y la edición en el sitio de la app genérica.
 */
export const TIPOS: { tipo: TipoBloque; emoji: string; nombre: string }[] = [
  { tipo: 'notas', emoji: '📝', nombre: 'Notas' },
  { tipo: 'checklist', emoji: '✅', nombre: 'Checklist' },
  { tipo: 'contador', emoji: '🔢', nombre: 'Contador' },
  { tipo: 'enlaces', emoji: '🔗', nombre: 'Enlaces' },
  { tipo: 'lista', emoji: '📋', nombre: 'Lista' },
  { tipo: 'valoracion', emoji: '⭐', nombre: 'Valoración' },
  { tipo: 'bitacora', emoji: '📔', nombre: 'Bitácora' },
  { tipo: 'progreso', emoji: '📈', nombre: 'Progreso' },
  { tipo: 'habito', emoji: '🔥', nombre: 'Hábito' },
  { tipo: 'sesiones', emoji: '⏱️', nombre: 'Sesiones' },
  { tipo: 'cuenta', emoji: '⏳', nombre: 'Cuenta regresiva' },
  { tipo: 'galeria', emoji: '🖼️', nombre: 'Galería' },
]

export const nombreTipoDe = (t: TFunc, tipo: TipoBloque) =>
  t(`plantillaCustom.tipo.${tipo}`, TIPOS.find((x) => x.tipo === tipo)?.nombre ?? tipo)

export const emojiTipo = (tipo: TipoBloque) => TIPOS.find((x) => x.tipo === tipo)?.emoji ?? ''

/**
 * Botonera para agregar una herramienta. `anclas` pinta los `data-tut` del
 * tutorial: solo la del editor los lleva (si no, habría dos con el mismo id).
 */
export function PaletaTipos({
  onElegir,
  anclas,
}: {
  onElegir: (tipo: TipoBloque) => void
  anclas?: boolean
}) {
  const t = useT()
  return (
    <div data-tut={anclas ? 'plantilla.custom.tipos' : undefined} className="flex flex-wrap gap-1.5">
      {TIPOS.map((x) => (
        <button
          key={x.tipo}
          type="button"
          data-tut={anclas ? `plantilla.custom.tipo.${x.tipo}` : undefined}
          onClick={() => onElegir(x.tipo)}
          className="rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/5"
        >
          ＋ <Icono emoji={x.emoji} /> {nombreTipoDe(t, x.tipo)}
        </button>
      ))}
    </div>
  )
}
