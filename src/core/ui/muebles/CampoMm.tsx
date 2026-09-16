import { useState } from 'react'
import type { RangoMm } from '../../muebles/modulos'
import type { Mm } from '../../muebles/tipos'
import { useT } from '../../i18n/useT'

/**
 * Medida en milímetros: campo numérico + pasos ± + deslizador de ajuste grueso.
 *
 * Un `SliderProp` a secas no sirve aquí: el carpintero TECLEA 1837, no lo caza
 * con el dedo. Y el valor se valida al salir del campo, no en cada tecla —
 * escribir «1» con clamp inmediato saltaría al mínimo y borraría lo tecleado.
 */
export function CampoMm({
  label,
  valor,
  rango,
  onChange,
  sufijo = 'mm',
}: {
  label: string
  valor: Mm
  rango: RangoMm
  onChange: (mm: Mm) => void
  sufijo?: string
}) {
  const t = useT()
  const [texto, setTexto] = useState(String(valor))
  // El valor puede cambiar por fuera (`normalizarMueble` lo acota, se cambia de
  // módulo): el campo se resincroniza ajustando el estado durante el render, que
  // es el patrón de React para esto — con un efecto se encadenaría un render de
  // más por cada tecla.
  const [valorPrevio, setValorPrevio] = useState(valor)
  if (valor !== valorPrevio) {
    setValorPrevio(valor)
    setTexto(String(valor))
  }

  const aplicar = (n: number) => {
    if (!Number.isFinite(n)) {
      setTexto(String(valor))
      return
    }
    onChange(Math.max(rango.min, Math.min(rango.max, Math.round(n))))
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
        <span className="text-[10px] tabular-nums text-white/30">
          {rango.min}–{rango.max} {sufijo}
        </span>
      </div>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => aplicar(valor - rango.paso)}
          title={t('muebles.campo.menos', 'Quitar {n} mm', { n: rango.paso })}
          className="ui-boton min-h-11 w-11 shrink-0 rounded-lg bg-white/10 text-base font-bold transition hover:bg-white/20"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="numeric"
            step={rango.paso}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => aplicar(parseFloat(texto))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pe-9 text-sm tabular-nums outline-none transition focus:border-accent/60"
          />
          <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/35">
            {sufijo}
          </span>
        </div>
        <button
          type="button"
          onClick={() => aplicar(valor + rango.paso)}
          title={t('muebles.campo.mas', 'Añadir {n} mm', { n: rango.paso })}
          className="ui-boton min-h-11 w-11 shrink-0 rounded-lg bg-white/10 text-base font-bold transition hover:bg-white/20"
        >
          +
        </button>
      </div>
      <input
        type="range"
        min={rango.min}
        max={rango.max}
        step={rango.paso}
        value={valor}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1.5 h-1 w-full accent-emerald-400"
      />
    </div>
  )
}

/** Fila de opciones excluyentes en chips (grosor, tipo de base, perfil…). */
export function Chips<T extends string | number>({
  label,
  valor,
  opciones,
  onChange,
}: {
  label: string
  valor: T
  opciones: { valor: T; texto: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            onClick={() => onChange(o.valor)}
            className={`ui-boton rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              o.valor === valor
                ? 'border-accent/50 bg-accent text-accent-ink'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Interruptor de una opción del módulo. */
export function Interruptor({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!valor)}
      className={`ui-boton flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${
        valor
          ? 'border-accent/40 bg-accent/15 text-white'
          : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
      }`}
    >
      <span>{label}</span>
      <span
        className={`grid h-5 w-9 place-items-center rounded-full text-[10px] ${
          valor ? 'bg-accent text-accent-ink' : 'bg-white/10 text-white/40'
        }`}
      >
        {valor ? '●' : '○'}
      </span>
    </button>
  )
}
