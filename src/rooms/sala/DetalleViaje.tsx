import { useState } from 'react'
import { db } from '../../core/data/db'
import type { Viaje } from '../../core/data/db'
import {
  actividadesViajeRepo,
  checklistViajeRepo,
  gastosViajeRepo,
  useActividadesViaje,
  useChecklistViaje,
  useGastosViaje,
} from '../../core/data/repository'
import { FormularioViaje } from './FormularioViaje'
import { Estrellas } from './Estrellas'
import {
  CATEGORIAS_GASTO,
  CHECKLIST_PLANTILLA,
  getEstado,
  getTipo,
} from './constantes'
import { diasEntre, dinero, formatearRango } from './fecha'

export function DetalleViaje({
  viaje,
  onVolver,
}: {
  viaje: Viaje
  onVolver: () => void
}) {
  const id = viaje.id!
  const [editando, setEditando] = useState(false)
  const [tab, setTab] = useState<'itinerario' | 'gastos' | 'checklist'>('itinerario')

  const actividades = useActividadesViaje(id) ?? []
  const gastos = useGastosViaje(id) ?? []
  const checklist = useChecklistViaje(id) ?? []

  const gastado = gastos.reduce((s, g) => s + g.monto, 0)
  const estado = getEstado(viaje.estado)
  const tipo = getTipo(viaje.tipoViaje)

  if (editando) {
    return (
      <FormularioViaje
        inicial={viaje}
        onGuardado={() => setEditando(false)}
        onCancelar={() => setEditando(false)}
      />
    )
  }

  const sembrarChecklist = async () => {
    const existente = await db.checklistViaje.where('viajeId').equals(id).count()
    if (existente > 0) return
    const items = CHECKLIST_PLANTILLA.flatMap((g) =>
      g.items.map((texto) => ({
        viajeId: id,
        texto,
        listo: false,
        categoria: g.categoria,
      })),
    )
    await db.checklistViaje.bulkAdd(items)
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onVolver}
        className="text-sm font-semibold text-teal-400 hover:underline"
      >
        ‹ Volver a viajes
      </button>

      <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-4">
        <div className="flex items-start gap-2">
          <span className="text-3xl">{tipo.icon}</span>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white/95">{viaje.titulo}</h2>
            <p className="text-white/60">
              {viaje.destino}, {viaje.pais}
            </p>
            <p className="text-sm text-white/45 mt-1">
              {formatearRango(viaje.fechaInicio, viaje.fechaFin)} ·{' '}
              {diasEntre(viaje.fechaInicio, viaje.fechaFin)} días
            </p>
            <span className="inline-block mt-2 text-xs rounded-md bg-teal-500/30 px-2 py-0.5">
              {estado.icon} {estado.label}
            </span>
          </div>
        </div>
        {viaje.companeros && (
          <p className="text-xs text-white/50 mt-2">👥 {viaje.companeros}</p>
        )}
        {viaje.presupuesto > 0 && (
          <p className="text-sm mt-2">
            Presupuesto {dinero(viaje.presupuesto)} · Gastado{' '}
            <span className={gastado > viaje.presupuesto ? 'text-red-400' : 'text-teal-300'}>
              {dinero(gastado)}
            </span>
          </p>
        )}
        {viaje.calificacion > 0 && (
          <div className="mt-2">
            <Estrellas valor={viaje.calificacion} soloLectura />
          </div>
        )}
        {viaje.resena && (
          <p className="mt-3 text-sm text-white/70 leading-relaxed">{viaje.resena}</p>
        )}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="mt-3 text-xs font-semibold text-teal-300 hover:underline"
        >
          Editar viaje
        </button>
      </div>

      <div className="flex gap-1">
        {(
          [
            ['itinerario', '📅 Itinerario'],
            ['gastos', '💰 Gastos'],
            ['checklist', '✅ Checklist'],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              tab === t ? 'bg-teal-400 text-black' : 'bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'itinerario' && (
        <ItinerarioPanel viajeId={id} viaje={viaje} actividades={actividades} />
      )}
      {tab === 'gastos' && (
        <GastosPanel viajeId={id} gastos={gastos} presupuesto={viaje.presupuesto} />
      )}
      {tab === 'checklist' && (
        <ChecklistPanel
          viajeId={id}
          items={checklist}
          onSembrar={sembrarChecklist}
        />
      )}
    </div>
  )
}

function ItinerarioPanel({
  viajeId,
  viaje,
  actividades,
}: {
  viajeId: number
  viaje: Viaje
  actividades: import('../../core/data/db').ActividadViaje[]
}) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(viaje.fechaInicio)
  const [hora, setHora] = useState('')
  const [nota, setNota] = useState('')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    await actividadesViajeRepo.add({
      viajeId,
      fecha,
      titulo: titulo.trim(),
      hora: hora || undefined,
      nota: nota.trim() || undefined,
      orden: actividades.length,
    })
    setTitulo('')
    setNota('')
  }

  const porFecha = [...actividades].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden,
  )

  return (
    <div className="space-y-3">
      <form onSubmit={agregar} className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Actividad (museo, restaurante, tour…)"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={fecha}
            min={viaje.fechaInicio}
            max={viaje.fechaFin}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota (opcional)"
          className="w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
        />
        <button type="submit" className="w-full rounded-lg py-2 text-sm font-bold bg-teal-400/90 text-black">
          Añadir al itinerario
        </button>
      </form>
      {porFecha.length === 0 ? (
        <p className="text-sm text-white/40">Sin actividades planeadas.</p>
      ) : (
        <ul className="space-y-2">
          {porFecha.map((a) => (
            <li
              key={a.id}
              className="flex gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium">{a.titulo}</p>
                <p className="text-xs text-white/40">
                  {a.fecha}
                  {a.hora ? ` · ${a.hora}` : ''}
                  {a.nota ? ` · ${a.nota}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => a.id && actividadesViajeRepo.remove(a.id)}
                className="text-white/30 hover:text-red-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GastosPanel({
  viajeId,
  gastos,
  presupuesto,
}: {
  viajeId: number
  gastos: import('../../core/data/db').GastoViaje[]
  presupuesto: number
}) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] =
    useState<import('../../core/data/db').CategoriaGastoViaje>('comida')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const total = gastos.reduce((s, g) => s + g.monto, 0)

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(monto)
    if (!concepto.trim() || !val) return
    await gastosViajeRepo.add({
      viajeId,
      concepto: concepto.trim(),
      monto: val,
      categoria,
      fecha,
    })
    setConcepto('')
    setMonto('')
  }

  return (
    <div className="space-y-3">
      <form onSubmit={agregar} className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-2">
        <input
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Concepto"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIAS_GASTO.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              className={`rounded px-2 py-0.5 text-xs ${
                categoria === c.id ? 'bg-teal-400 text-black' : 'bg-white/5'
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className="rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
        </div>
        <button type="submit" className="w-full rounded-lg py-2 text-sm font-bold bg-teal-400/90 text-black">
          Registrar gasto
        </button>
      </form>
      <p className="text-sm font-semibold">
        Total: {dinero(total)}
        {presupuesto > 0 && (
          <span className="text-white/40 font-normal">
            {' '}
            / {dinero(presupuesto)}
          </span>
        )}
      </p>
      <ul className="space-y-1.5">
        {gastos.map((g) => {
          const cat = CATEGORIAS_GASTO.find((c) => c.id === g.categoria)
          return (
            <li
              key={g.id}
              className="flex items-center gap-2 text-sm rounded-lg bg-white/5 px-3 py-2"
            >
              <span>{cat?.icon}</span>
              <span className="flex-1">{g.concepto}</span>
              <span className="font-semibold">{dinero(g.monto)}</span>
              <button
                type="button"
                onClick={() => g.id && gastosViajeRepo.remove(g.id)}
                className="text-white/30 hover:text-red-400"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ChecklistPanel({
  viajeId,
  items,
  onSembrar,
}: {
  viajeId: number
  items: import('../../core/data/db').ChecklistViaje[]
  onSembrar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [categoria] =
    useState<import('../../core/data/db').CategoriaChecklist>('equipaje')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    await checklistViajeRepo.add({
      viajeId,
      texto: texto.trim(),
      listo: false,
      categoria,
    })
    setTexto('')
  }

  const listos = items.filter((i) => i.listo).length

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <button
          type="button"
          onClick={onSembrar}
          className="w-full rounded-xl py-2 text-sm font-semibold bg-white/10 hover:bg-white/15"
        >
          Cargar checklist sugerido
        </button>
      )}
      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nuevo ítem"
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <button type="submit" className="rounded-lg px-3 bg-teal-400 text-black font-bold">
          +
        </button>
      </form>
      <p className="text-xs text-white/40">
        {listos} de {items.length} listos
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() =>
                item.id &&
                checklistViajeRepo.update(item.id, { listo: !item.listo })
              }
              className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${
                item.listo ? 'bg-teal-500 border-teal-500 text-black' : 'border-white/30'
              }`}
            >
              {item.listo ? '✓' : ''}
            </button>
            <span className={item.listo ? 'line-through text-white/40 flex-1' : 'flex-1'}>
              {item.texto}
            </span>
            <button
              type="button"
              onClick={() => item.id && checklistViajeRepo.remove(item.id)}
              className="text-white/30 hover:text-red-400"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
