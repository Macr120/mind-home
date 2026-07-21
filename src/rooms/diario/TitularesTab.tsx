import { useState, type ReactNode } from 'react'
import type { CategoriaTitular, Titular } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { CATEGORIAS, COLOR } from './constantes'
import { TarjetaTitular } from './TarjetaTitular'

/** Chip de categoría: entintado con su color de marca (legible en claro y oscuro). */
function ChipCategoria({
  color,
  activo,
  onClick,
  children,
}: {
  color: string
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="texto-vivo shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition"
      style={{
        ...vivo(color),
        background: `color-mix(in srgb, ${color} ${activo ? 22 : 8}%, transparent)`,
        boxShadow: activo ? `inset 0 0 0 1px color-mix(in srgb, ${color} 55%, transparent)` : undefined,
      }}
    >
      {children}
    </button>
  )
}

/** Feed de titulares del día, filtrable por categoría (agrupados en el orden de carga). */
export function TitularesTab({ titulares }: { titulares: Titular[] }) {
  const t = useT()
  const [filtro, setFiltro] = useState<CategoriaTitular | null>(null)

  if (titulares.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/45">
        {t('diario.vacio', 'Hoy no se pudieron cargar los titulares. Prueba actualizar.')}
      </p>
    )
  }

  // Solo se ofrecen las categorías que hoy trajeron titulares.
  const conNoticias = CATEGORIAS.filter((c) => titulares.some((n) => n.categoria === c.id))
  const visibles = filtro ? titulares.filter((n) => n.categoria === filtro) : titulares

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
        <ChipCategoria color={COLOR} activo={filtro === null} onClick={() => setFiltro(null)}>
          {t('diario.cat.todo', 'Todo')}
        </ChipCategoria>
        {conNoticias.map((c) => (
          <ChipCategoria
            key={c.id}
            color={c.color}
            activo={filtro === c.id}
            onClick={() => setFiltro(filtro === c.id ? null : c.id)}
          >
            <Icono emoji={c.emoji} /> {t(`diario.cat.${c.id}`, c.label)}
          </ChipCategoria>
        ))}
      </div>

      {visibles.map((n) => (
        <TarjetaTitular key={n.url} titular={n} />
      ))}
    </div>
  )
}
