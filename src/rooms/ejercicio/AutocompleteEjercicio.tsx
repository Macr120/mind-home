import { useMemo, useState } from 'react'
import type { GrupoCatalogo } from './catalogo'
import { normalizarEjercicio } from './stats'
import { useT } from '../../core/i18n/useT'

/**
 * Input con sugerencias del catálogo agrupadas por funcionalidad,
 * más una sección con los nombres que el usuario ya usó.
 */
export function AutocompleteEjercicio({
  value,
  onChange,
  onSelect,
  grupos,
  recientes = [],
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  onSelect?: (nombre: string, grupo?: GrupoCatalogo) => void
  grupos: GrupoCatalogo[]
  recientes?: string[]
  placeholder?: string
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const t = useT()
  const q = normalizarEjercicio(value)

  const secciones = useMemo(() => {
    const coincide = (nombre: string) => !q || normalizarEjercicio(nombre).includes(q)
    const lista: { id: string; label: string; items: { nombre: string; grupo?: GrupoCatalogo }[] }[] = []
    const propios = recientes.filter(coincide).slice(0, 6)
    if (propios.length) {
      lista.push({
        id: 'recientes',
        label: t('ejercicio.recientes', 'Tus recientes'),
        items: propios.map((nombre) => ({ nombre })),
      })
    }
    for (const g of grupos) {
      const items = g.ejercicios.filter(coincide).map((nombre) => ({ nombre, grupo: g }))
      if (items.length) lista.push({ id: g.id, label: t(`ejercicio.grupo.${g.id}`, g.label), items })
    }
    return lista
  }, [grupos, recientes, q, t])

  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter') setAbierto(false)
        }}
        placeholder={placeholder}
        className="w-full rounded-lg bg-black/30 px-2 py-1.5 border border-white/10 outline-none"
      />
      {abierto && secciones.length > 0 && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute start-0 end-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 ui-panel shadow-xl"
        >
          {secciones.map((sec) => (
            <div key={sec.id}>
              <p className="px-2 pt-2 pb-0.5 text-[9px] uppercase tracking-wide text-white/35">
                {sec.label}
              </p>
              {sec.items.map((item) => (
                <button
                  key={`${sec.id}-${item.nombre}`}
                  type="button"
                  onClick={() => {
                    onChange(item.nombre)
                    onSelect?.(item.nombre, item.grupo)
                    setAbierto(false)
                  }}
                  className="block w-full px-2 py-1.5 text-start text-xs text-white/85 hover:bg-white/10"
                >
                  {item.nombre}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
