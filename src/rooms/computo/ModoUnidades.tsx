import { useMemo, useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { Motor } from './motor'
import { CabeceraModo, CampoNum, Pendiente, Resultado, leer } from './ModoCampos'
import { CATEGORIAS } from './unidades'

/**
 * El conversor de unidades: categoría, de qué a qué, y convierte al escribir.
 *
 * La cuenta la hace mathjs con su propia sintaxis (`5 km to mile`), así que las
 * temperaturas salen bien sin tratarlas aparte: no son un factor, son un
 * desplazamiento, y la librería ya lo sabe.
 */
export function ModoUnidades({ motor, selector }: { motor: Motor | null; selector: ReactNode }) {
  const t = useT()
  const [catId, setCatId] = useState(CATEGORIAS[0].id)
  const cat = CATEGORIAS.find((c) => c.id === catId) ?? CATEGORIAS[0]

  const [valor, setValor] = useState('1')
  const [pares, setPares] = useState<Record<string, { de: string; a: string }>>({})
  const par = pares[cat.id] ?? { de: cat.de, a: cat.a }

  const fijar = (cambio: Partial<{ de: string; a: string }>) =>
    setPares((p) => ({ ...p, [cat.id]: { ...par, ...cambio } }))

  const n = leer(valor)

  const salida = useMemo(() => {
    if (!motor || !Number.isFinite(n)) return null
    try {
      // Se pasa el número aparte para que una coma decimal o un signo no se
      // metan en el análisis de la expresión.
      return { texto: String(motor.evaluar(`${n} ${par.de} to ${par.a}`)), error: false }
    } catch {
      return { texto: t('computo.unid.imposible', 'Esas dos unidades no se pueden convertir entre sí.'), error: true }
    }
  }, [motor, n, par.de, par.a, t])

  return (
    <div data-tut="computo.calc.unidades" className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <CabeceraModo selector={selector} />

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCatId(c.id)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              catId === c.id ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Icono nombre={c.icono} /> {t(`computo.unid.${c.id}`, c.labelEs)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CampoNum etiqueta={t('computo.unid.valor', 'Cuánto')} valor={valor} onCambiar={setValor} />
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => fijar({ de: par.a, a: par.de })}
            className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-xs font-semibold transition hover:bg-white/10"
          >
            <Icono nombre="repetir" /> {t('computo.unid.invertir', 'Al revés')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectorUnidad
          etiqueta={t('computo.unid.de', 'De')}
          valor={par.de}
          categoriaId={cat.id}
          onCambiar={(u) => fijar({ de: u })}
        />
        <SelectorUnidad
          etiqueta={t('computo.unid.a', 'A')}
          valor={par.a}
          categoriaId={cat.id}
          onCambiar={(u) => fijar({ a: u })}
        />
      </div>

      {!Number.isFinite(n) ? (
        <Pendiente texto={t('computo.unid.faltan', 'Escribe un número y la conversión sale sola.')} />
      ) : salida?.error ? (
        <Pendiente texto={salida.texto} />
      ) : (
        <Resultado etiqueta="=" valor={salida?.texto ?? '…'} grande />
      )}
    </div>
  )
}

/** Lista de unidades de una categoría. */
function SelectorUnidad({
  etiqueta,
  valor,
  categoriaId,
  onCambiar,
}: {
  etiqueta: string
  valor: string
  categoriaId: string
  onCambiar: (u: string) => void
}) {
  const t = useT()
  const cat = CATEGORIAS.find((c) => c.id === categoriaId) ?? CATEGORIAS[0]
  return (
    <label className="block">
      <span className="block text-[11px] text-white/55">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
      >
        {cat.unidades.map((u) => (
          <option key={u.u} value={u.u}>
            {t(`computo.unid.u.${u.clave}`, u.labelEs)} ({u.u})
          </option>
        ))}
      </select>
    </label>
  )
}
