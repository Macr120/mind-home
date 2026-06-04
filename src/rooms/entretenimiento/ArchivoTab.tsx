import { useMemo, useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { COLOR, ESTADOS_MEDIA, TIPOS_MEDIA } from './constantes'
import { FormularioMedia } from './FormularioMedia'
import { TarjetaMedia } from './TarjetaMedia'
import {
  FILTROS_VACIOS,
  aplicarFiltros,
  añosUnicos,
  generosUnicos,
  type FiltrosArchivo,
} from './filtrosMedia'

export function ArchivoTab({ items }: { items: MediaArchivo[] }) {
  const [filtros, setFiltros] = useState<FiltrosArchivo>(FILTROS_VACIOS)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<MediaArchivo | null>(null)

  const generos = useMemo(() => generosUnicos(items), [items])
  const años = useMemo(() => añosUnicos(items), [items])
  const lista = useMemo(() => aplicarFiltros(items, filtros), [items, filtros])

  const actualizar = (parcial: Partial<FiltrosArchivo>) =>
    setFiltros((f) => ({ ...f, ...parcial }))

  if (editando) {
    return (
      <FormularioMedia
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
        className="w-full rounded-xl py-2.5 font-bold text-black hover:opacity-90"
        style={{ background: COLOR }}
      >
        {mostrarForm ? 'Ocultar formulario' : '➕ Añadir título'}
      </button>

      {mostrarForm && (
        <FormularioMedia
          onGuardado={() => setMostrarForm(false)}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-white/35">Filtrar y ordenar</p>
        <input
          value={filtros.busqueda}
          onChange={(e) => actualizar({ busqueda: e.target.value })}
          placeholder="Buscar título, reseña, autor…"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <SelectFiltro
            label="Tipo"
            value={filtros.tipo}
            onChange={(v) => actualizar({ tipo: v as FiltrosArchivo['tipo'] })}
            opciones={[
              { value: 'todos', label: 'Todos' },
              ...TIPOS_MEDIA.map((t) => ({ value: t.id, label: `${t.icon} ${t.label}` })),
            ]}
          />
          <SelectFiltro
            label="Género"
            value={filtros.genero}
            onChange={(v) => actualizar({ genero: v })}
            opciones={[
              { value: 'todos', label: 'Todos' },
              ...generos.map((g) => ({ value: g, label: g })),
            ]}
          />
          <SelectFiltro
            label="Año (fecha)"
            value={filtros.año}
            onChange={(v) => actualizar({ año: v })}
            opciones={[
              { value: 'todos', label: 'Todos' },
              ...años.map((a) => ({ value: a, label: a })),
            ]}
          />
          <SelectFiltro
            label="Estado"
            value={filtros.estado}
            onChange={(v) => actualizar({ estado: v as FiltrosArchivo['estado'] })}
            opciones={[
              { value: 'todos', label: 'Todos' },
              ...ESTADOS_MEDIA.map((e) => ({ value: e.id, label: e.label })),
            ]}
          />
        </div>

        <div className="flex gap-2">
          {(
            [
              ['reciente', 'Más reciente'],
              ['antiguo', 'Más antiguo'],
              ['titulo', 'A–Z'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => actualizar({ orden: id })}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                filtros.orden === id ? 'text-black' : 'bg-white/5'
              }`}
              style={filtros.orden === id ? { background: COLOR } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/40">
        {lista.length} {lista.length === 1 ? 'entrada' : 'entradas'}
        {items.length !== lista.length && ` (de ${items.length} en total)`}
      </p>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-white/40 text-sm">
          {items.length === 0
            ? 'Tu archivo está vacío. Añade la primera película, serie, libro o videojuego.'
            : 'Ninguna entrada coincide con los filtros.'}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((item) => (
            <TarjetaMedia
              key={item.id}
              item={item}
              onEditar={() => setEditando(item)}
              onEliminar={() => item.id && mediaArchivoRepo.remove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SelectFiltro({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: { value: string; label: string }[]
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
      >
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
