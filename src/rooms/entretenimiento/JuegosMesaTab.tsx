import { useMemo, useState } from 'react'
import type { JuegoMesa } from '../../core/data/db'
import { juegosMesaRepo } from '../../core/data/repository'
import { CATEGORIAS_MESA, COLOR, ESTADOS_MESA } from './constantes'
import { FormularioJuegoMesa } from './FormularioJuegoMesa'
import { TarjetaJuegoMesa } from './TarjetaJuegoMesa'
import { FILTROS_MESA_VACIOS, aplicarFiltrosMesa, type FiltrosMesa } from './filtrosMesa'

export function JuegosMesaTab({ juegos }: { juegos: JuegoMesa[] }) {
  const [filtros, setFiltros] = useState<FiltrosMesa>(FILTROS_MESA_VACIOS)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<JuegoMesa | null>(null)

  const lista = useMemo(() => aplicarFiltrosMesa(juegos, filtros), [juegos, filtros])
  const enColeccion = juegos.filter((j) => j.estado === 'coleccion').length

  if (editando) {
    return (
      <FormularioJuegoMesa
        inicial={editando}
        onGuardado={() => setEditando(null)}
        onCancelar={() => setEditando(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3 text-sm" style={{ background: `${COLOR}15`, borderColor: `${COLOR}44` }}>
        <p className="font-semibold" style={{ color: COLOR }}>
          🎲 Tu ludoteca
        </p>
        <p className="text-xs text-white/50 mt-1">
          {enColeccion} en colección · {juegos.length} registrados en total
        </p>
      </div>

      <button
        type="button"
        onClick={() => setMostrarForm((v) => !v)}
        className="w-full rounded-xl py-2.5 font-bold text-black"
        style={{ background: COLOR }}
      >
        {mostrarForm ? 'Ocultar formulario' : '➕ Añadir juego de mesa'}
      </button>

      {mostrarForm && (
        <FormularioJuegoMesa
          onGuardado={() => setMostrarForm(false)}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-3">
        <input
          value={filtros.busqueda}
          onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
          placeholder="Buscar por nombre, editorial, notas…"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/50">
            Categoría
            <select
              value={filtros.categoria}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  categoria: e.target.value as FiltrosMesa['categoria'],
                }))
              }
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            >
              <option value="todos">Todas</option>
              {CATEGORIAS_MESA.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/50">
            Estado
            <select
              value={filtros.estado}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  estado: e.target.value as FiltrosMesa['estado'],
                }))
              }
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            >
              <option value="todos">Todos</option>
              {ESTADOS_MESA.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          {(
            [
              ['reciente', 'Recientes'],
              ['nombre', 'A–Z'],
              ['jugadas', 'Más jugados'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltros((f) => ({ ...f, orden: id }))}
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

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
          {juegos.length === 0
            ? 'Registra Catan, Wingspan, Dixit… y lleva el conteo de partidas.'
            : 'Ningún juego coincide con los filtros.'}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((j) => (
            <TarjetaJuegoMesa
              key={j.id}
              item={j}
              onEditar={() => setEditando(j)}
              onEliminar={() => j.id && juegosMesaRepo.remove(j.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
