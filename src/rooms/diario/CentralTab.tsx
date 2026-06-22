import { useMemo, useState } from 'react'
import type { Noticia } from '../../core/data/db'
import { noticiasRepo } from '../../core/data/repository'
import { CATEGORIAS, COLOR } from './constantes'
import { etiquetaGrupoFecha, hoyISO } from './fecha'
import {
  FILTROS_VACIOS,
  agruparPorFecha,
  aplicarFiltros,
  fechasUnicas,
  type FiltrosNoticias,
} from './filtros'
import { FormularioNoticia } from './FormularioNoticia'
import { TarjetaNoticia } from './TarjetaNoticia'
import { useT } from '../../core/i18n/useT'

export function CentralTab({ noticias }: { noticias: Noticia[] }) {
  const t = useT()
  const [filtros, setFiltros] = useState<FiltrosNoticias>(FILTROS_VACIOS)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Noticia | null>(null)

  const fechas = useMemo(() => fechasUnicas(noticias), [noticias])
  const lista = useMemo(() => aplicarFiltros(noticias, filtros), [noticias, filtros])
  const grupos = useMemo(() => agruparPorFecha(lista), [lista])

  const noLeidas = noticias.filter((n) => !n.leido).length
  const actualizar = (p: Partial<FiltrosNoticias>) => setFiltros((f) => ({ ...f, ...p }))

  if (editando) {
    return (
      <FormularioNoticia
        inicial={editando}
        onGuardado={() => setEditando(null)}
        onCancelar={() => setEditando(null)}
      />
    )
  }

  const countText = lista.length === 1
    ? t('diario.central.count1', `1 noticia`, { n: '1' })
    : t('diario.central.count', `${lista.length} noticias`, { n: String(lista.length) })

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-3 flex justify-between items-center"
        style={{ background: `${COLOR}15`, borderColor: `${COLOR}40` }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: COLOR }}>
            {t('diario.central.titulo', '📰 Central de noticias')}
          </p>
          <p className="text-xs text-white/45 mt-0.5">
            {t('diario.central.sinLeer', `${noLeidas} sin leer · ${noticias.length} en total`, { n: String(noLeidas), t: String(noticias.length) })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => actualizar({ soloNoLeidas: !filtros.soloNoLeidas })}
          className={`text-xs rounded-lg px-2.5 py-1.5 font-semibold ${
            filtros.soloNoLeidas ? 'text-black' : 'bg-white/10'
          }`}
          style={filtros.soloNoLeidas ? { background: COLOR } : undefined}
        >
          {t('diario.central.noLeidas', 'No leídas')}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setMostrarForm((v) => !v)}
        className="w-full rounded-xl py-2.5 font-bold text-black"
        style={{ background: COLOR }}
      >
        {mostrarForm ? t('diario.central.ocultar', 'Ocultar formulario') : t('diario.central.añadir', '➕ Añadir noticia')}
      </button>

      {mostrarForm && (
        <FormularioNoticia
          onGuardado={() => setMostrarForm(false)}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-white/35">{t('diario.central.filtros', 'Filtros')}</p>

        <input
          value={filtros.busqueda}
          onChange={(e) => actualizar({ busqueda: e.target.value })}
          placeholder={t('diario.central.buscar', 'Buscar titular, resumen, fuente…')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <ChipCat
            activo={filtros.categoria === 'todos'}
            label={t('diario.central.todas', 'Todas')}
            onClick={() => actualizar({ categoria: 'todos' })}
          />
          {CATEGORIAS.map((c) => (
            <ChipCat
              key={c.id}
              activo={filtros.categoria === c.id}
              label={`${c.icon} ${c.label}`}
              onClick={() =>
                actualizar({
                  categoria: filtros.categoria === c.id ? 'todos' : c.id,
                })
              }
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/50">
            {t('diario.central.desde', 'Desde')}
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => actualizar({ fechaDesde: e.target.value })}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
          <label className="text-xs text-white/50">
            {t('diario.central.hasta', 'Hasta')}
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => actualizar({ fechaHasta: e.target.value })}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => actualizar({ fechaDesde: hoyISO(), fechaHasta: hoyISO() })}
            className="text-xs rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
          >
            {t('diario.central.hoy', 'Hoy')}
          </button>
          <button
            type="button"
            onClick={() => actualizar({ fechaDesde: '', fechaHasta: '' })}
            className="text-xs rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
          >
            {t('diario.central.todasFechas', 'Todas las fechas')}
          </button>
          {fechas.slice(0, 5).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => actualizar({ fechaDesde: f, fechaHasta: f })}
              className="text-xs rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            onClick={() => actualizar({ soloDestacadas: !filtros.soloDestacadas })}
            className={`text-xs rounded-lg px-2 py-1 font-semibold ${
              filtros.soloDestacadas ? 'text-black' : 'bg-white/10'
            }`}
            style={filtros.soloDestacadas ? { background: COLOR } : undefined}
          >
            {t('diario.central.destacadas', '★ Destacadas')}
          </button>
        </div>
      </div>

      <p className="text-xs text-white/40">
        {countText}
        {noticias.length !== lista.length && ` (${t('diario.central.deTotalEs', `de ${noticias.length}`, { n: String(noticias.length) })})`}
      </p>

      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
          {noticias.length === 0
            ? t('diario.central.vacio', 'Tu central está vacía. Guarda titulares que quieras seguir o leer después.')
            : t('diario.central.sinFiltro', 'Ninguna noticia coincide con los filtros.')}
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ fecha, noticias: grupo }) => (
            <section key={fecha}>
              <h3
                className="text-sm font-bold mb-3 sticky top-0 py-1 backdrop-blur-sm z-10"
                style={{ color: COLOR }}
              >
                {etiquetaGrupoFecha(fecha)}
                <span className="text-white/35 font-normal ml-2 text-xs">{fecha}</span>
              </h3>
              <div className="space-y-3">
                {grupo.map((n) => (
                  <TarjetaNoticia
                    key={n.id}
                    item={n}
                    onEditar={() => setEditando(n)}
                    onEliminar={() => n.id && noticiasRepo.remove(n.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ChipCat({
  activo,
  label,
  onClick,
}: {
  activo: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        activo ? 'text-black' : 'bg-white/5 hover:bg-white/10'
      }`}
      style={activo ? { background: COLOR } : undefined}
    >
      {label}
    </button>
  )
}
