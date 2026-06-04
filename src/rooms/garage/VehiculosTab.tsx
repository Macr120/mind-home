import { useState } from 'react'
import type { RegistroMantenimiento, Vehiculo } from '../../core/data/db'
import { registrosMantenimientoRepo, vehiculosRepo } from '../../core/data/repository'
import { COLOR, getTipoVehiculo } from './constantes'
import { FormularioVehiculo } from './FormularioVehiculo'

export function VehiculosTab({
  vehiculos,
  registros,
  onAbrir,
}: {
  vehiculos: Vehiculo[]
  registros: RegistroMantenimiento[]
  onAbrir: (id: number) => void
}) {
  const eliminar = async (id: number) => {
    for (const r of registros.filter((x) => x.vehiculoId === id)) {
      if (r.id) await registrosMantenimientoRepo.remove(r.id)
    }
    await vehiculosRepo.remove(id)
  }
  const [creando, setCreando] = useState(false)

  if (creando) {
    return (
      <FormularioVehiculo
        onGuardado={() => setCreando(false)}
        onCancelar={() => setCreando(false)}
      />
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setCreando(true)}
        className="w-full rounded-xl py-3 text-sm font-bold text-black"
        style={{ background: COLOR }}
      >
        ➕ Añadir vehículo
      </button>

      {vehiculos.length === 0 ? (
        <p className="text-center text-sm text-white/45 py-8">
          Bicicletas, autos, motos y más — todo en un solo garaje.
        </p>
      ) : (
        vehiculos.map((v) => {
          const tipo = getTipoVehiculo(v.tipo)
          return (
            <div
              key={v.id}
              className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3"
            >
              <span className="text-3xl">{tipo.icon}</span>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => v.id && onAbrir(v.id)}
                  className="text-left w-full"
                >
                  <h3 className="font-bold text-white/95 truncate">{v.nombre}</h3>
                  <p className="text-xs text-white/50">
                    {tipo.label}
                    {v.marca ? ` · ${v.marca}` : ''}
                    {v.modelo ? ` ${v.modelo}` : ''}
                    {v.anio ? ` (${v.anio})` : ''}
                  </p>
                  {v.odometroActual != null && (
                    <p className="text-xs mt-1" style={{ color: COLOR }}>
                      {v.odometroActual.toLocaleString('es-MX')} {v.unidad}
                    </p>
                  )}
                </button>
              </div>
              {v.id && (
                <button
                  type="button"
                  onClick={() => void eliminar(v.id!)}
                  className="text-xs text-white/35 hover:text-red-400 shrink-0"
                  title="Eliminar"
                >
                  🗑️
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
