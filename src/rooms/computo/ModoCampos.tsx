import type { ReactNode } from 'react'
import { vivo } from '../../core/ui/estilos'
import { COLOR } from './constantes'

/**
 * Los ladrillos de los modos que solo piden números (propina, regla de tres,
 * unidades): un campo etiquetado y una línea de resultado. Nada más, para que
 * los cuatro se vean iguales sin repetir las mismas clases cuatro veces.
 */

export function CampoNum({
  etiqueta,
  valor,
  onCambiar,
  sufijo,
  placeholder,
}: {
  etiqueta: string
  valor: string
  onCambiar: (v: string) => void
  /** Unidad o símbolo que se pinta dentro del campo, a la derecha. */
  sufijo?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block truncate text-[11px] text-white/55">{etiqueta}</span>
      <div className="mt-1 flex items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2.5 focus-within:border-accent">
        <input
          inputMode="decimal"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-1.5 font-mono text-sm outline-none"
          aria-label={etiqueta}
        />
        {sufijo && <span className="shrink-0 font-mono text-xs text-white/40">{sufijo}</span>}
      </div>
    </label>
  )
}

export function Resultado({
  etiqueta,
  valor,
  grande = false,
}: {
  etiqueta: string
  valor: string
  /** El número que de verdad se venía a ver. */
  grande?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2 rounded-xl bg-black/25 px-3 py-2">
      <span className="shrink-0 text-xs text-white/50">{etiqueta}</span>
      <span
        className={`texto-vivo min-w-0 flex-1 truncate text-right font-mono font-bold ${grande ? 'text-xl' : 'text-base'}`}
        style={vivo(COLOR)}
      >
        {valor}
      </span>
    </div>
  )
}

/** Aviso de que falta rellenar algo. Mismo hueco que el resultado, sin gritar. */
export function Pendiente({ texto }: { texto: string }) {
  return <p className="rounded-xl bg-black/25 px-3 py-2 text-xs text-white/40">{texto}</p>
}

/** Formatea sin ruido binario y sin arrastrar ceros: 4.5, no 4.50000000001. */
export function numero(v: number, decimales = 2): string {
  if (!Number.isFinite(v)) return '—'
  const r = Math.round(v * 10 ** decimales) / 10 ** decimales
  return String(r)
}

/** Lee un campo aceptando coma decimal; NaN si está vacío o no es número. */
export function leer(texto: string): number {
  const t = texto.trim().replace(',', '.')
  return t === '' ? NaN : Number(t)
}

/**
 * Cabecera de los modos que no tienen dónde meter el menú: lo alinea a la
 * derecha y deja sitio a su izquierda para lo que el modo quiera poner.
 *
 * Vive aquí y no en `Calculadora` porque los modos son sus hijos, e importar de
 * vuelta al padre sería un ciclo.
 */
export function CabeceraModo({ selector, children }: { selector: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <div className="ml-auto shrink-0">{selector}</div>
    </div>
  )
}
