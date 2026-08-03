import { useState } from 'react'
import type { Vehiculo } from '../../core/data/db'
import { vehiculosRepo } from '../../core/data/repository'
import { TIPOS_VEHICULO } from './constantes'
import { hoyISO } from './fecha'
import { Campo, Formulario, INPUT } from './ui'
import { useT } from '../../core/i18n/useT'

export function FormularioVehiculo({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: Vehiculo
  onGuardado: () => void
  onCancelar: () => void
}) {
  const t = useT()
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

  return (
    <Formulario
      icono={inicial ? 'editar' : 'agregar'}
      titulo={
        inicial
          ? t('garage.form.editar', 'Editar vehículo')
          : t('garage.form.nuevo', 'Nuevo vehículo')
      }
      onGuardar={() => void guardar()}
      onCancelar={onCancelar}
    >
      <Campo etiqueta={t('garage.form.nombre', 'Nombre *')}>
        <input className={INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <Campo etiqueta={t('garage.form.tipo', 'Tipo')}>
        <select
          className={INPUT}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Vehiculo['tipo'])}
        >
          {TIPOS_VEHICULO.map((tipoItem) => (
            <option key={tipoItem.id} value={tipoItem.id}>
              {tipoItem.icon} {tipoItem.label}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.form.marca', 'Marca')}>
          <input className={INPUT} value={marca} onChange={(e) => setMarca(e.target.value)} />
        </Campo>
        <Campo etiqueta={t('garage.form.modelo', 'Modelo')}>
          <input className={INPUT} value={modelo} onChange={(e) => setModelo(e.target.value)} />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.form.año', 'Año')}>
          <input
            type="number"
            className={INPUT}
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </Campo>
        <Campo etiqueta={t('garage.form.placas', 'Placas / serie')}>
          <input
            className={INPUT}
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
          />
        </Campo>
      </div>

      <p className="text-[11px] leading-relaxed text-white/40">
        {t(
          'garage.form.pistaPlacas',
          'Con placas se desbloquean los trámites de tenencia, verificación, tarjeta de circulación y seguro.',
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.form.odo', 'Odómetro actual')}>
          <input
            type="number"
            min={0}
            className={INPUT}
            value={odometro}
            onChange={(e) => setOdometro(e.target.value)}
          />
        </Campo>
        <Campo etiqueta={t('garage.form.unidad', 'Unidad')}>
          <select
            className={INPUT}
            value={unidad}
            onChange={(e) => setUnidad(e.target.value as Vehiculo['unidad'])}
          >
            <option value="km">{t('garage.form.km', 'Kilómetros')}</option>
            <option value="mi">{t('garage.form.mi', 'Millas')}</option>
          </select>
        </Campo>
      </div>

      <Campo etiqueta={t('garage.form.notas', 'Notas')}>
        <textarea
          className={`${INPUT} min-h-[60px]`}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </Campo>
    </Formulario>
  )
}
