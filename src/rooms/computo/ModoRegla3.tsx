import { useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { CabeceraModo, CampoNum, Pendiente, Resultado, leer, numero } from './ModoCampos'

/**
 * Regla de tres.
 *
 * DIRECTA: si a → b, entonces c → x, con x = b·c/a (más de lo uno, más de lo
 * otro: kilos y precio).
 * INVERSA: a·b = c·x, con x = a·b/c (más de lo uno, menos de lo otro: obreros y
 * días).
 *
 * El interruptor no es un adorno: elegir mal es EL error clásico de la regla de
 * tres, así que cada modo dice en una línea cuándo toca usarlo.
 */
export function ModoRegla3({ selector }: { selector: ReactNode }) {
  const t = useT()
  const [directa, setDirecta] = useState(true)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [c, setC] = useState('')

  const na = leer(a)
  const nb = leer(b)
  const nc = leer(c)

  const listo = Number.isFinite(na) && Number.isFinite(nb) && Number.isFinite(nc)
  const divisor = directa ? na : nc
  const x = listo && divisor !== 0 ? (directa ? (nb * nc) / na : (na * nb) / nc) : NaN

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <CabeceraModo selector={selector} />

      <div className="flex gap-1.5">
        {[true, false].map((d) => (
          <button
            key={String(d)}
            type="button"
            onClick={() => setDirecta(d)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              directa === d ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {d ? t('computo.regla3.directa', 'Directa') : t('computo.regla3.inversa', 'Inversa')}
          </button>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-white/45">
        {directa
          ? t('computo.regla3.ayudaDirecta', 'Cuando más de lo uno es más de lo otro: kilos y precio, horas y sueldo.')
          : t('computo.regla3.ayudaInversa', 'Cuando más de lo uno es menos de lo otro: obreros y días, velocidad y tiempo.')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <CampoNum etiqueta={t('computo.regla3.a', 'Si esto…')} valor={a} onCambiar={setA} />
        <CampoNum etiqueta={t('computo.regla3.b', '…es esto')} valor={b} onCambiar={setB} />
        <CampoNum etiqueta={t('computo.regla3.c', 'Entonces esto…')} valor={c} onCambiar={setC} />
        <div className="flex items-end">
          <div className="w-full rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-center font-mono text-sm text-white/35">
            {t('computo.regla3.x', '…es x')}
          </div>
        </div>
      </div>

      {!listo ? (
        <Pendiente texto={t('computo.regla3.faltan', 'Rellena los tres números y x sale sola.')} />
      ) : divisor === 0 ? (
        <Pendiente texto={t('computo.regla3.cero', 'No se puede dividir entre cero: cambia ese número.')} />
      ) : (
        <Resultado etiqueta="x =" valor={numero(x, 4)} grande />
      )}
    </div>
  )
}
