import { useState } from 'react'
import type { Efemeride, TipoEfemeride } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, TIPOS_EFEMERIDE } from './constantes'
import { ChipCategoria } from './TitularesTab'
import { TarjetaEfemeride } from './TarjetaEfemeride'

/** Efemérides del día, filtrables por tipo (los mismos chips que los titulares). */
export function EfemeridesTab({ efemerides }: { efemerides: Efemeride[] }) {
  const t = useT()
  const [filtro, setFiltro] = useState<TipoEfemeride | null>(null)

  if (efemerides.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/45">
        {t('diario.ef.vacio', 'Hoy no se pudieron cargar las efemérides. Prueba actualizar.')}
      </p>
    )
  }

  // Solo se ofrecen los tipos que hoy trajeron efeméride.
  const conEfemeride = TIPOS_EFEMERIDE.filter((x) => efemerides.some((e) => e.tipo === x.id))
  const visibles = filtro ? efemerides.filter((e) => e.tipo === filtro) : efemerides

  return (
    <div data-tut="diario.efemerides.lista" className="space-y-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
        <ChipCategoria color={COLOR} activo={filtro === null} onClick={() => setFiltro(null)}>
          {t('diario.cat.todo', 'Todo')}
        </ChipCategoria>
        {conEfemeride.map((x) => (
          <ChipCategoria
            key={x.id}
            color={x.color}
            activo={filtro === x.id}
            onClick={() => setFiltro(filtro === x.id ? null : x.id)}
          >
            <Icono emoji={x.emoji} /> {t(`diario.ef.${x.id}`, x.label)}
          </ChipCategoria>
        ))}
      </div>

      {visibles.map((e) => (
        <TarjetaEfemeride key={e.tipo} efemeride={e} />
      ))}
    </div>
  )
}
