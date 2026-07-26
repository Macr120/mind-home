import type { ReactNode } from 'react'
import { useHud, type ZonaHud } from '../state/hudStore'
import { useT } from '../i18n/useT'

/** Chevron del botón de plegar: siempre apunta hacia la esquina del cuadrante. */
const HACIA_ESQUINA: Record<ZonaHud, string> = {
  supIzq: '‹',
  supDer: '›',
  infIzq: '‹',
  infDer: '⌄',
  chat: '›',
}

/**
 * Botón chico para plegar un cuadrante del HUD. Va en el extremo del grupo más
 * alejado de su esquina (así el grupo se recoge "hacia" ella).
 */
export function BotonPlegarHud({
  zona,
  className = '',
  onPlegar,
}: {
  zona: ZonaHud
  className?: string
  /** Extra al plegar (p. ej. cerrar los paneles abiertos del chat). */
  onPlegar?: () => void
}) {
  const t = useT()
  const setPlegado = useHud((s) => s.setPlegado)
  return (
    <button
      type="button"
      onClick={() => {
        setPlegado(zona, true)
        onPlegar?.()
      }}
      title={t('hud.plegar', 'Plegar controles')}
      className={`grid h-6 w-6 shrink-0 place-items-center text-lg font-bold leading-none text-white/70 transition hover:text-white hover:scale-110 active:scale-90 ${className}`}
    >
      {HACIA_ESQUINA[zona]}
    </button>
  )
}

/**
 * Pila de prompts contextuales (subir de nivel, montar el tren, bajarte del
 * coche…): botones de acción SECUNDARIA, centrados y apilados justo encima del
 * bloque más alto de la banda inferior, para no tapar nunca los controles de las
 * esquinas ni el chat (crítico en teléfono vertical, donde no sobra ancho).
 */
export function PilaPrompts({ children }: { children: ReactNode }) {
  const topes = useHud((s) => s.topes)
  const bottom = Math.max(112, ...Object.values(topes).map((p) => p + 12))
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-2 px-3"
      style={{ bottom }}
    >
      {children}
    </div>
  )
}

/** Lo que queda de un cuadrante plegado: su icono lo despliega de un toque. */
export function TiradorHud({
  zona,
  className = '',
  chico = false,
  children,
}: {
  zona: ZonaHud
  className?: string
  /** Versión mini (junto al abanico de herramientas, que conserva su función). */
  chico?: boolean
  children: ReactNode
}) {
  const t = useT()
  const setPlegado = useHud((s) => s.setPlegado)
  return (
    <button
      type="button"
      onClick={() => setPlegado(zona, false)}
      title={t('hud.desplegar', 'Mostrar controles')}
      className={`ui-hud grid place-items-center border border-white/10 text-white/70 transition hover:bg-white/15 ${
        chico ? 'h-6 w-6 rounded-lg text-xs leading-none' : 'h-9 w-9 rounded-xl text-lg'
      } ${className}`}
    >
      {children}
    </button>
  )
}
