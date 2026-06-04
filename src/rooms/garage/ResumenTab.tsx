import type { RegistroMantenimiento, Vehiculo } from '../../core/data/db'
import { COLOR } from './constantes'
import { dinero, hoyISO } from './fecha'
import { alertasMantenimiento, gastoAnio } from './stats'

export function ResumenTab({
  vehiculos,
  registros,
  onAbrirVehiculo,
}: {
  vehiculos: Vehiculo[]
  registros: RegistroMantenimiento[]
  onAbrirVehiculo: (id: number) => void
}) {
  const año = hoyISO().slice(0, 4)
  const gastado = gastoAnio(registros, año)
  const alertas = alertasMantenimiento(vehiculos, registros)
  const vencidos = alertas.filter((a) => a.urgencia === 'vencido')
  const proximos = alertas.filter((a) => a.urgencia === 'proximo')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p className="text-2xl font-black" style={{ color: COLOR }}>
            {vehiculos.length}
          </p>
          <p className="text-[10px] text-white/45 uppercase tracking-wide">Vehículos</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p className="text-2xl font-black" style={{ color: COLOR }}>
            {registros.length}
          </p>
          <p className="text-[10px] text-white/45 uppercase tracking-wide">Servicios</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p className="text-lg font-black" style={{ color: COLOR }}>
            {dinero(gastado)}
          </p>
          <p className="text-[10px] text-white/45 uppercase tracking-wide">Gasto {año}</p>
        </div>
      </div>

      {vencidos.length > 0 && (
        <section className="rounded-xl bg-red-500/10 border border-red-500/35 p-4 space-y-2">
          <p className="text-sm font-bold text-red-300">⚠️ Mantenimiento vencido</p>
          {vencidos.map((a, i) => (
            <button
              key={`${a.vehiculoId}-${a.titulo}-${i}`}
              type="button"
              onClick={() => onAbrirVehiculo(a.vehiculoId)}
              className="w-full text-left rounded-lg bg-black/20 px-3 py-2 hover:bg-black/30"
            >
              <p className="text-sm font-semibold">
                {a.vehiculoNombre} · {a.titulo}
              </p>
              <p className="text-xs text-white/50">{a.detalle}</p>
            </button>
          ))}
        </section>
      )}

      {proximos.length > 0 && (
        <section className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
          <p className="text-sm font-bold text-amber-200">📅 Próximamente</p>
          {proximos.map((a, i) => (
            <button
              key={`p-${a.vehiculoId}-${i}`}
              type="button"
              onClick={() => onAbrirVehiculo(a.vehiculoId)}
              className="w-full text-left rounded-lg bg-black/20 px-3 py-2 hover:bg-black/30"
            >
              <p className="text-sm font-semibold">
                {a.vehiculoNombre} · {a.titulo}
              </p>
              <p className="text-xs text-white/50">{a.detalle}</p>
            </button>
          ))}
        </section>
      )}

      {alertas.length === 0 && vehiculos.length > 0 && (
        <p className="text-sm text-white/50 text-center py-4 rounded-xl bg-white/5 border border-white/10">
          ✅ Sin alertas. Registra el próximo servicio en cada mantenimiento para recibir avisos.
        </p>
      )}

      {vehiculos.length === 0 && (
        <p className="text-sm text-white/50 text-center py-6">
          Añade tu primera bicicleta, auto o moto en la pestaña Vehículos.
        </p>
      )}
    </div>
  )
}
