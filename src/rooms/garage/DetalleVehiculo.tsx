import { useState } from 'react'
import type { Vehiculo } from '../../core/data/db'
import {
  registrosMantenimientoRepo,
  useMantenimientosVehiculo,
  vehiculosRepo,
} from '../../core/data/repository'
import { COLOR, getTipoMantenimiento, getTipoVehiculo } from './constantes'
import { dinero, formatearFecha } from './fecha'
import { FormularioMantenimiento } from './FormularioMantenimiento'
import { FormularioVehiculo } from './FormularioVehiculo'

export function DetalleVehiculo({
  vehiculo,
  onVolver,
}: {
  vehiculo: Vehiculo
  onVolver: () => void
}) {
  const id = vehiculo.id!
  const [editandoVehiculo, setEditandoVehiculo] = useState(false)
  const [nuevoServicio, setNuevoServicio] = useState(false)
  const [editServicioId, setEditServicioId] = useState<number | null>(null)
  const [odoEdit, setOdoEdit] = useState(
    vehiculo.odometroActual != null ? String(vehiculo.odometroActual) : '',
  )

  const servicios = useMantenimientosVehiculo(id) ?? []
  const tipo = getTipoVehiculo(vehiculo.tipo)
  const gastoTotal = servicios.reduce((s, r) => s + (r.costo ?? 0), 0)
  const editandoServicio = servicios.find((s) => s.id === editServicioId)

  const actualizarOdometro = async () => {
    const val = odoEdit ? parseFloat(odoEdit) : undefined
    await vehiculosRepo.update(id, { odometroActual: val })
  }

  if (editandoVehiculo) {
    return (
      <FormularioVehiculo
        inicial={vehiculo}
        onGuardado={() => setEditandoVehiculo(false)}
        onCancelar={() => setEditandoVehiculo(false)}
      />
    )
  }

  if (nuevoServicio || editandoServicio) {
    return (
      <FormularioMantenimiento
        vehiculo={vehiculo}
        inicial={editandoServicio}
        onGuardado={() => {
          setNuevoServicio(false)
          setEditServicioId(null)
        }}
        onCancelar={() => {
          setNuevoServicio(false)
          setEditServicioId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onVolver}
        className="text-sm font-semibold hover:underline"
        style={{ color: COLOR }}
      >
        ‹ Volver al garaje
      </button>

      <div
        className="rounded-xl border p-4"
        style={{ background: `${COLOR}18`, borderColor: `${COLOR}44` }}
      >
        <div className="flex items-start gap-3">
          <span className="text-4xl">{tipo.icon}</span>
          <div className="flex-1">
            <h2 className="text-xl font-black">{vehiculo.nombre}</h2>
            <p className="text-sm text-white/60">
              {tipo.label}
              {vehiculo.marca && ` · ${vehiculo.marca}`}
              {vehiculo.modelo && ` ${vehiculo.modelo}`}
            </p>
            {vehiculo.matricula && (
              <p className="text-xs text-white/45 mt-1">Placas: {vehiculo.matricula}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditandoVehiculo(true)}
            className="text-xs bg-white/10 rounded-lg px-2 py-1 hover:bg-white/15"
          >
            Editar
          </button>
        </div>

        <div className="mt-4 flex gap-2 items-end">
          <label className="flex-1 text-xs text-white/50">
            Odómetro actual ({vehiculo.unidad})
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg bg-black/25 border border-white/15 px-3 py-2 text-sm"
              value={odoEdit}
              onChange={(e) => setOdoEdit(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void actualizarOdometro()}
            className="rounded-lg px-3 py-2 text-xs font-bold text-black shrink-0"
            style={{ background: COLOR }}
          >
            Actualizar
          </button>
        </div>

        <p className="text-xs text-white/40 mt-3">
          {servicios.length} servicios registrados · Gasto total {dinero(gastoTotal)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setNuevoServicio(true)}
        className="w-full rounded-xl py-3 text-sm font-bold text-black"
        style={{ background: COLOR }}
      >
        🔧 Registrar mantenimiento
      </button>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-white/70">Historial</p>
        {servicios.length === 0 ? (
          <p className="text-sm text-white/45 py-4 text-center rounded-xl bg-white/5">
            Aún no hay servicios. Registra el último cambio de aceite, cadena, etc.
          </p>
        ) : (
          servicios.map((r) => {
            const tm = getTipoMantenimiento(r.tipo)
            return (
              <div
                key={r.id}
                className="rounded-xl bg-white/5 border border-white/10 p-3"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.titulo}</p>
                    <p className="text-xs text-white/45">
                      {formatearFecha(r.fecha)} · {tm.label}
                      {r.odometro != null &&
                        ` · ${r.odometro.toLocaleString('es-MX')} ${vehiculo.unidad}`}
                    </p>
                    {r.taller && (
                      <p className="text-xs text-white/40 mt-0.5">📍 {r.taller}</p>
                    )}
                    {(r.proximoOdometro != null || r.proximaFecha) && (
                      <p className="text-xs mt-1" style={{ color: COLOR }}>
                        Próximo:
                        {r.proximoOdometro != null &&
                          ` ${r.proximoOdometro.toLocaleString('es-MX')} ${vehiculo.unidad}`}
                        {r.proximoOdometro != null && r.proximaFecha && ' · '}
                        {r.proximaFecha && formatearFecha(r.proximaFecha)}
                      </p>
                    )}
                    {r.nota && <p className="text-xs text-white/50 mt-1">{r.nota}</p>}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {r.costo != null && r.costo > 0 && (
                      <p className="text-sm font-semibold">{dinero(r.costo)}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => r.id && setEditServicioId(r.id)}
                      className="block text-[10px] text-white/40 hover:text-white/70"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => r.id && void registrosMantenimientoRepo.remove(r.id)}
                      className="block text-[10px] text-white/40 hover:text-red-400"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {vehiculo.notas && (
        <p className="text-xs text-white/45 rounded-lg bg-white/5 p-3 border border-white/10">
          {vehiculo.notas}
        </p>
      )}
    </div>
  )
}
