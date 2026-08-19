import { useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { PROPINAS } from './constantes'
import { CabeceraModo, CampoNum, Pendiente, Resultado, leer, numero } from './ModoCampos'

/**
 * La cuenta con propina, repartida.
 *
 * La propina se calcula SOBRE LA CUENTA, no sobre el total: sumarla y volver a
 * aplicar el porcentaje es el error de todas las calculadoras de servilleta.
 */
export function ModoPropina({ selector }: { selector: ReactNode }) {
  const t = useT()
  const [cuenta, setCuenta] = useState('')
  const [pct, setPct] = useState('15')
  const [personas, setPersonas] = useState('1')

  const nCuenta = leer(cuenta)
  const nPct = leer(pct)
  const nPersonas = Math.max(1, Math.round(leer(personas) || 1))

  const listo = Number.isFinite(nCuenta) && Number.isFinite(nPct)
  const propina = listo ? (nCuenta * nPct) / 100 : NaN
  const total = listo ? nCuenta + propina : NaN

  return (
    <div data-tut="computo.calc.propina" className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <CabeceraModo selector={selector} />

      <div className="grid grid-cols-2 gap-2">
        <CampoNum etiqueta={t('computo.propina.cuenta', 'La cuenta')} valor={cuenta} onCambiar={setCuenta} />
        <CampoNum
          etiqueta={t('computo.propina.personas', 'Entre cuántos')}
          valor={personas}
          onCambiar={setPersonas}
        />
      </div>

      <div>
        <span className="block text-[11px] text-white/55">{t('computo.propina.pct', 'Propina')}</span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {PROPINAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPct(String(p))}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                leer(pct) === p ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {p}%
            </button>
          ))}
          <div className="w-20 shrink-0">
            <CampoNum etiqueta="" valor={pct} onCambiar={setPct} sufijo="%" />
          </div>
        </div>
      </div>

      {!listo ? (
        <Pendiente texto={t('computo.propina.faltan', 'Escribe la cuenta y el porcentaje.')} />
      ) : (
        <div className="space-y-1.5">
          <Resultado etiqueta={t('computo.propina.laPropina', 'Propina')} valor={numero(propina)} />
          <Resultado etiqueta={t('computo.propina.total', 'Total')} valor={numero(total)} grande />
          {nPersonas > 1 && (
            <Resultado
              etiqueta={t('computo.propina.cadaUno', 'Cada uno pone')}
              valor={numero(total / nPersonas)}
              grande
            />
          )}
        </div>
      )}
    </div>
  )
}
