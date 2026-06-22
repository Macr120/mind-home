import { useMemo, useState } from 'react'
import { db } from '../../core/data/db'
import type { Viaje } from '../../core/data/db'
import { viajesRepo } from '../../core/data/repository'
import { FormularioViaje } from './FormularioViaje'
import { TarjetaViaje } from './TarjetaViaje'
import { ESTADOS } from './constantes'
import {
  FILTROS_VACIOS,
  aplicarFiltros,
  añosUnicos,
  paisesUnicos,
  type FiltrosViajes,
} from './filtros'
import { useT } from '../../core/i18n/useT'

export function ListaViajesTab({
  viajes,
  gastosPorViaje,
  onAbrir,
}: {
  viajes: Viaje[]
  gastosPorViaje: Map<number, number>
  onAbrir: (id: number) => void
}) {
  const t = useT()
  const [filtros, setFiltros] = useState<FiltrosViajes>(FILTROS_VACIOS)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Viaje | null>(null)

  const paises = useMemo(() => paisesUnicos(viajes), [viajes])
  const años = useMemo(() => añosUnicos(viajes), [viajes])
  const lista = useMemo(() => aplicarFiltros(viajes, filtros), [viajes, filtros])

  const set = (p: Partial<FiltrosViajes>) => setFiltros((f) => ({ ...f, ...p }))

  if (editando) {
    return (
      <FormularioViaje
        inicial={editando}
        onGuardado={() => setEditando(null)}
        onCancelar={() => setEditando(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setMostrarForm((v) => !v)}
        className="w-full rounded-xl py-2.5 font-bold bg-teal-400 text-black"
      >
        {mostrarForm ? t('sala.lista.ocultar', 'Ocultar formulario') : t('sala.lista.nuevo', '✈️ Nuevo viaje')}
      </button>

      {mostrarForm && (
        <FormularioViaje
          onGuardado={() => setMostrarForm(false)}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-3">
        <input
          value={filtros.busqueda}
          onChange={(e) => set({ busqueda: e.target.value })}
          placeholder={t('sala.lista.buscar', 'Buscar destino, país, título…')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label={t('sala.lista.estado', 'Estado')}
            value={filtros.estado}
            onChange={(v) => set({ estado: v as FiltrosViajes['estado'] })}
            opciones={[
              { v: 'todos', l: t('sala.lista.todos', 'Todos') },
              ...ESTADOS.map((e) => ({ v: e.id, l: `${e.icon} ${e.label}` })),
            ]}
          />
          <Select
            label={t('sala.lista.pais', 'País')}
            value={filtros.pais}
            onChange={(v) => set({ pais: v })}
            opciones={[
              { v: 'todos', l: t('sala.lista.todos', 'Todos') },
              ...paises.map((p) => ({ v: p, l: p })),
            ]}
          />
          <Select
            label={t('sala.lista.año', 'Año')}
            value={filtros.año}
            onChange={(v) => set({ año: v })}
            opciones={[
              { v: 'todos', l: t('sala.lista.todos', 'Todos') },
              ...años.map((a) => ({ v: a, l: a })),
            ]}
          />
          <Select
            label={t('sala.lista.orden', 'Orden')}
            value={filtros.orden}
            onChange={(v) => set({ orden: v as FiltrosViajes['orden'] })}
            opciones={[
              { v: 'fecha', l: t('sala.lista.porFecha', 'Por fecha') },
              { v: 'titulo', l: t('sala.lista.az', 'A–Z') },
              { v: 'presupuesto', l: t('sala.lista.presupuesto', 'Presupuesto') },
            ]}
          />
        </div>
      </div>

      <p className="text-xs text-white/40">
        {t('sala.lista.count', `${lista.length} viajes`, { n: String(lista.length) })}
      </p>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
          {viajes.length === 0
            ? t('sala.lista.vacio', 'Aún no hay viajes. Registra uno pasado o planea el próximo.')
            : t('sala.lista.sinFiltro', 'Ningún viaje coincide con los filtros.')}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((v) => (
            <TarjetaViaje
              key={v.id}
              viaje={v}
              gastado={v.id ? gastosPorViaje.get(v.id) : undefined}
              onAbrir={() => v.id && onAbrir(v.id)}
              onEliminar={async () => {
                if (!v.id) return
                const id = v.id
                await db.actividadesViaje.where('viajeId').equals(id).delete()
                await db.gastosViaje.where('viajeId').equals(id).delete()
                await db.checklistViaje.where('viajeId').equals(id).delete()
                await viajesRepo.remove(id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: { v: string; l: string }[]
}) {
  return (
    <label className="text-xs text-white/50 block">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
      >
        {opciones.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  )
}
