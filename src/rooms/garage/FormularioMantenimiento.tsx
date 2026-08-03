import { useState } from 'react'
import type { RegistroMantenimiento, Vehiculo } from '../../core/data/db'
import { registrosMantenimientoRepo } from '../../core/data/repository'
import { COLOR, PLANTILLAS_SERVICIO, TIPOS_MANTENIMIENTO } from './constantes'
import { hoyISO, sumarDias } from './fecha'
import { Campo, Formulario, INPUT } from './ui'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'

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
  const t = useT()
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const [tipo, setTipo] = useState<RegistroMantenimiento['tipo']>(inicial?.tipo ?? 'revision')
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

  return (
    <Formulario
      icono={inicial ? 'editar' : 'herramienta'}
      titulo={
        inicial
          ? t('garage.mant.editar', 'Editar servicio')
          : t('garage.mant.nuevo', 'Registrar mantenimiento')
      }
      onGuardar={() => void guardar()}
      onCancelar={onCancelar}
    >
      {/* Atajos: rellenan tipo, nombre y el próximo servicio de un toque. */}
      <div className="flex flex-wrap gap-1.5">
        {PLANTILLAS_SERVICIO.map((p) => (
          <button
            key={p.titulo}
            type="button"
            onClick={() => aplicarPlantilla(p)}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-125"
            style={{ background: `${COLOR}1f`, boxShadow: `inset 0 0 0 1px ${COLOR}3d` }}
          >
            <span className="texto-vivo" style={vivo(COLOR)}>
              {p.titulo}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.mant.fecha', 'Fecha')}>
          <input
            type="date"
            className={INPUT}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
        <Campo etiqueta={t('garage.mant.tipo', 'Tipo de servicio')}>
          <select
            className={INPUT}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as RegistroMantenimiento['tipo'])}
          >
            {TIPOS_MANTENIMIENTO.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.label}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo etiqueta={t('garage.mant.titulo', 'Título *')}>
        <input className={INPUT} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.mant.costo', 'Costo (MXN)')}>
          <input
            type="number"
            min={0}
            className={INPUT}
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta={t('garage.mant.odo', `Odómetro (${vehiculo.unidad})`, {
            unit: vehiculo.unidad,
          })}
        >
          <input
            type="number"
            min={0}
            className={INPUT}
            value={odometro}
            onChange={(e) => setOdometro(e.target.value)}
          />
        </Campo>
      </div>

      <Campo etiqueta={t('garage.mant.taller', 'Taller / mecánico')}>
        <input className={INPUT} value={taller} onChange={(e) => setTaller(e.target.value)} />
      </Campo>

      <div className="rounded-xl border border-white/10 bg-black/15 p-3">
        <p className="mb-2 text-xs font-bold texto-vivo" style={vivo(COLOR)}>
          {t('garage.mant.proximo', 'Próximo servicio (opcional)')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Campo
            etiqueta={t('garage.mant.proxOdo', `A los ${vehiculo.unidad}`, {
              unit: vehiculo.unidad,
            })}
          >
            <input
              type="number"
              min={0}
              className={INPUT}
              value={proximoOdometro}
              onChange={(e) => setProximoOdometro(e.target.value)}
              placeholder={t('garage.mant.ph.proxOdo', 'Ej. 52000')}
            />
          </Campo>
          <Campo etiqueta={t('garage.mant.proxFecha', 'Fecha límite')}>
            <input
              type="date"
              className={INPUT}
              value={proximaFecha}
              onChange={(e) => setProximaFecha(e.target.value)}
            />
          </Campo>
        </div>
      </div>

      <Campo etiqueta={t('garage.mant.notas', 'Notas')}>
        <textarea
          className={`${INPUT} min-h-[50px]`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>
    </Formulario>
  )
}
