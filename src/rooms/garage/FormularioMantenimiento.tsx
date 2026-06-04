import { useState } from 'react'
import type { RegistroMantenimiento, Vehiculo } from '../../core/data/db'
import { registrosMantenimientoRepo } from '../../core/data/repository'
import { COLOR, PLANTILLAS_SERVICIO, TIPOS_MANTENIMIENTO } from './constantes'
import { hoyISO, sumarDias } from './fecha'

export function FormularioMantenimiento({
  vehiculo,
  inicial,
  onGuardado,
  onCancelar,
}: {
  vehiculo: Vehiculo
  inicial?: RegistroMantenimiento
  onGuardado: () => void
  onCancelar: () => void
}) {
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const [tipo, setTipo] = useState<RegistroMantenimiento['tipo']>(
    inicial?.tipo ?? 'revision',
  )
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [costo, setCosto] = useState(inicial?.costo != null ? String(inicial.costo) : '')
  const [odometro, setOdometro] = useState(
    inicial?.odometro != null
      ? String(inicial.odometro)
      : vehiculo.odometroActual != null
        ? String(vehiculo.odometroActual)
        : '',
  )
  const [taller, setTaller] = useState(inicial?.taller ?? '')
  const [nota, setNota] = useState(inicial?.nota ?? '')
  const [proximoOdometro, setProximoOdometro] = useState(
    inicial?.proximoOdometro != null ? String(inicial.proximoOdometro) : '',
  )
  const [proximaFecha, setProximaFecha] = useState(inicial?.proximaFecha ?? '')

  const aplicarPlantilla = (p: (typeof PLANTILLAS_SERVICIO)[0]) => {
    setTipo(p.tipo)
    setTitulo(p.titulo)
    const odo = odometro ? parseFloat(odometro) : vehiculo.odometroActual
    if (p.sugerirKm != null && odo != null && !Number.isNaN(odo)) {
      setProximoOdometro(String(odo + p.sugerirKm))
    }
    if (p.sugerirDias != null) {
      setProximaFecha(sumarDias(fecha, p.sugerirDias))
    }
  }

  const guardar = async () => {
    if (!titulo.trim() || !vehiculo.id) return
    const datos = {
      vehiculoId: vehiculo.id,
      fecha,
      tipo,
      titulo: titulo.trim(),
      costo: costo ? parseFloat(costo) : undefined,
      odometro: odometro ? parseFloat(odometro) : undefined,
      taller: taller.trim() || undefined,
      nota: nota.trim() || undefined,
      proximoOdometro: proximoOdometro ? parseFloat(proximoOdometro) : undefined,
      proximaFecha: proximaFecha || undefined,
    }
    if (inicial?.id) await registrosMantenimientoRepo.update(inicial.id, datos)
    else await registrosMantenimientoRepo.add(datos)
    onGuardado()
  }

  const input =
    'mt-1 w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm'

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <p className="text-sm font-semibold">
        {inicial ? '✏️ Editar servicio' : '🔧 Registrar mantenimiento'}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PLANTILLAS_SERVICIO.map((p) => (
          <button
            key={p.titulo}
            type="button"
            onClick={() => aplicarPlantilla(p)}
            className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-xs hover:bg-amber-500/25"
          >
            {p.titulo}
          </button>
        ))}
      </div>

      <label className="block text-xs text-white/50">
        Fecha
        <input
          type="date"
          className={input}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </label>

      <label className="block text-xs text-white/50">
        Tipo de servicio
        <select
          className={input}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as RegistroMantenimiento['tipo'])}
        >
          {TIPOS_MANTENIMIENTO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-white/50">
        Título *
        <input className={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/50">
          Costo (MXN)
          <input
            type="number"
            min={0}
            className={input}
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </label>
        <label className="block text-xs text-white/50">
          Odómetro ({vehiculo.unidad})
          <input
            type="number"
            min={0}
            className={input}
            value={odometro}
            onChange={(e) => setOdometro(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-xs text-white/50">
        Taller / mecánico
        <input className={input} value={taller} onChange={(e) => setTaller(e.target.value)} />
      </label>

      <p className="text-xs font-semibold text-amber-400/90 pt-1">Próximo servicio (opcional)</p>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/50">
          A los {vehiculo.unidad}
          <input
            type="number"
            min={0}
            className={input}
            value={proximoOdometro}
            onChange={(e) => setProximoOdometro(e.target.value)}
            placeholder="Ej. 52000"
          />
        </label>
        <label className="block text-xs text-white/50">
          Fecha límite
          <input
            type="date"
            className={input}
            value={proximaFecha}
            onChange={(e) => setProximaFecha(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-xs text-white/50">
        Notas
        <textarea
          className={`${input} min-h-[50px]`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
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
          className="rounded-xl px-4 py-2.5 text-sm bg-white/10"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
