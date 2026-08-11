import { Suspense, lazy, useMemo, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { RANGO_XY_3D } from './constantes'
import type { ObjetivoFormula } from './curvas'
import { alcanceDe } from './formulas'
import { GraficaFormula, SelectorEje } from './GraficaFormula'
import type { Motor } from './motor'

// El 3D arrastra three: solo se descarga si de verdad se abre la superficie.
const Superficie3D = lazy(() => import('./Superficie3D'))

/**
 * La fórmula traída del formulario, con sus mandos propios: qué variable va en
 * cada eje y en cuánto se quedan las demás.
 *
 * Los valores llegan CONGELADOS a propósito. La ficha de la fórmula vive en otro
 * modo y los dos no se ven a la vez, así que mover una barra allí y ver moverse
 * la curva aquí era imposible: mejor una foto que se pueda retocar desde la
 * propia gráfica.
 */
export function PanelFormula({
  motor,
  objetivo,
  modo,
  onModo,
}: {
  motor: Motor | null
  objetivo: ObjetivoFormula
  /** El tipo elegido arriba, ya normalizado a lo que una fórmula sabe hacer. */
  modo: '2d' | '3d'
  onModo: (m: '2d' | '3d') => void
}) {
  const t = useT()
  const editables = useMemo(() => objetivo.variables.filter((v) => !v.constante), [objetivo.variables])

  // Se siembra con el eje que se estaba mirando en la ficha: «Ver en grande»
  // tiene que abrir LO MISMO, más grande.
  const [ejeXSel, setEjeX] = useState(() => objetivo.ejeX ?? editables[0]?.simbolo ?? '')
  const [ejeYSel, setEjeY] = useState(() => editables[1]?.simbolo ?? '')
  // Inicializador perezoso, no un efecto: el estado se siembra con la foto que
  // trajo el objetivo y a partir de ahí manda el usuario.
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(objetivo.scope).map(([k, v]) => [k, String(v)])),
  )

  // Los ejes se VALIDAN contra las variables de esta fórmula: si el símbolo
  // guardado ya no existe, el `<select>` enseñaría uno y se dibujaría otro.
  const ejeX = editables.some((v) => v.simbolo === ejeXSel) ? ejeXSel : (editables[0]?.simbolo ?? '')
  const ejeY =
    editables.some((v) => v.simbolo === ejeYSel) && ejeYSel !== ejeX
      ? ejeYSel
      : (editables.find((v) => v.simbolo !== ejeX)?.simbolo ?? '')

  const scope = useMemo(() => alcanceDe(objetivo.variables, valores), [objetivo.variables, valores])
  // `RANGO_XY_3D` es constante de módulo: `Superficie3D` memoiza la malla por
  // IDENTIDAD del rango, y un array nuevo la reconstruiría en cada repintado.
  const tramoX = objetivo.tramos[ejeX] ?? RANGO_XY_3D
  const tramoY = objetivo.tramos[ejeY] ?? RANGO_XY_3D

  /** Las que no van en ningún eje: se quedan quietas y se pueden retocar. */
  const quietas = editables.filter((v) => v.simbolo !== ejeX && (modo === '2d' || v.simbolo !== ejeY))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        <span className="shrink-0">{t('computo.form.eje', 'Eje')}</span>
        <SelectorEje valor={ejeX} variables={editables} excluye={modo === '3d' ? ejeY : undefined} onCambiar={setEjeX} />
        {modo === '3d' && <SelectorEje valor={ejeY} variables={editables} excluye={ejeX} onCambiar={setEjeY} />}
        {editables.length < 2 && modo === '3d' && (
          <span className="min-w-0 flex-1">
            {t('computo.graf.unaVariable', 'Con una sola variable no hay superficie que dibujar.')}
          </span>
        )}
      </div>

      {quietas.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-2">
          <p className="text-[10px] leading-relaxed text-white/35">
            {t('computo.graf.congeladas', 'Las demás se quedan en estos valores; cambia uno y la gráfica se mueve.')}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quietas.map((v) => (
              <label key={v.simbolo} className="block">
                <span className="block truncate text-[10px] text-white/50">
                  <span className="font-mono font-semibold text-white/75">{v.simbolo}</span>
                  {v.unidad ? ` (${v.unidad})` : ''}
                </span>
                <input
                  inputMode="decimal"
                  value={valores[v.simbolo] ?? ''}
                  onChange={(e) => setValores((s) => ({ ...s, [v.simbolo]: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-xs outline-none focus:border-accent"
                  aria-label={v.nombre}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {modo === '2d' || editables.length < 2 ? (
        <GraficaFormula
          // El `:m` remonta cuando por fin llega el motor: el encuadre se
          // calcula al montar, y sin motor se quedaría plana para siempre.
          key={`${ejeX}-${tramoX.join(':')}${motor ? ':m' : ''}`}
          motor={motor}
          expresion={objetivo.expresion}
          resultado={objetivo.resultado}
          ejeX={ejeX}
          scope={scope}
          rango={tramoX}
        />
      ) : (
        <Suspense
          fallback={
            <div className="grid h-64 place-items-center rounded-xl border border-white/10 bg-black/25 text-xs text-white/40">
              {t('computo.sup.cargando', 'Preparando la superficie…')}
            </div>
          }
        >
          <Superficie3D
            motor={motor}
            expresion={objetivo.expresion}
            resultado={objetivo.resultado}
            ejeX={ejeX}
            ejeY={ejeY}
            rangoX={tramoX}
            rangoY={tramoY}
            scope={scope}
          />
        </Suspense>
      )}

      {/* Sin esto, elegir «Superficie 3D» con una variable no haría nada visible. */}
      {modo === '3d' && editables.length < 2 && (
        <button
          type="button"
          onClick={() => onModo('2d')}
          className="w-full rounded-lg bg-white/5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10"
        >
          {t('computo.graf.volver2d', 'Volver al plano')}
        </button>
      )}
    </div>
  )
}

