import { useState } from 'react'
import type { Vehiculo } from '../../core/data/db'
import { vehiculosRepo } from '../../core/data/repository'
import { COLOR, TIPOS_VEHICULO } from './constantes'
import { hoyISO } from './fecha'

export function FormularioVehiculo({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: Vehiculo
  onGuardado: () => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [tipo, setTipo] = useState<Vehiculo['tipo']>(inicial?.tipo ?? 'auto')
  const [marca, setMarca] = useState(inicial?.marca ?? '')
  const [modelo, setModelo] = useState(inicial?.modelo ?? '')
  const [anio, setAnio] = useState(inicial?.anio ? String(inicial.anio) : '')
  const [matricula, setMatricula] = useState(inicial?.matricula ?? '')
  const [odometro, setOdometro] = useState(
    inicial?.odometroActual != null ? String(inicial.odometroActual) : '',
  )
  const [unidad, setUnidad] = useState<Vehiculo['unidad']>(inicial?.unidad ?? 'km')
  const [notas, setNotas] = useState(inicial?.notas ?? '')

  const guardar = async () => {
    if (!nombre.trim()) return
    const datos = {
      nombre: nombre.trim(),
      tipo,
      marca: marca.trim() || undefined,
      modelo: modelo.trim() || undefined,
      anio: anio ? parseInt(anio, 10) : undefined,
      matricula: matricula.trim() || undefined,
      odometroActual: odometro ? parseFloat(odometro) : undefined,
      unidad,
      notas: notas.trim() || undefined,
      creadoEn: inicial?.creadoEn ?? hoyISO(),
    }
    if (inicial?.id) await vehiculosRepo.update(inicial.id, datos)
    else await vehiculosRepo.add(datos)
    onGuardado()
  }

  const input =
    'mt-1 w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm'

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <p className="text-sm font-semibold">
        {inicial ? '✏️ Editar vehículo' : '➕ Nuevo vehículo'}
      </p>

      <label className="block text-xs text-white/50">
        Nombre *
        <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>

      <label className="block text-xs text-white/50">
        Tipo
        <select
          className={input}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Vehiculo['tipo'])}
        >
          {TIPOS_VEHICULO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/50">
          Marca
          <input className={input} value={marca} onChange={(e) => setMarca(e.target.value)} />
        </label>
        <label className="block text-xs text-white/50">
          Modelo
          <input className={input} value={modelo} onChange={(e) => setModelo(e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/50">
          Año
          <input
            type="number"
            className={input}
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </label>
        <label className="block text-xs text-white/50">
          Placas / serie
          <input
            className={input}
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/50">
          Odómetro actual
          <input
            type="number"
            min={0}
            className={input}
            value={odometro}
            onChange={(e) => setOdometro(e.target.value)}
          />
        </label>
        <label className="block text-xs text-white/50">
          Unidad
          <select
            className={input}
            value={unidad}
            onChange={(e) => setUnidad(e.target.value as Vehiculo['unidad'])}
          >
            <option value="km">Kilómetros</option>
            <option value="mi">Millas</option>
          </select>
        </label>
      </div>

      <label className="block text-xs text-white/50">
        Notas
        <textarea
          className={`${input} min-h-[60px]`}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => void guardar()}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-black"
          style={{ background: COLOR }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2.5 text-sm bg-white/10 hover:bg-white/15"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
