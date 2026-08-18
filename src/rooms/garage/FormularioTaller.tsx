import { useState } from 'react'
import type { TallerVehiculo, TipoTaller, Vehiculo } from '../../core/data/db'
import { talleresVehiculoRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, TIPOS_TALLER } from './constantes'
import { nuevoId } from './ids'
import { Campo, Formulario, INPUT, TINTA_CTA } from './ui'

export function FormularioTaller({
  vehiculos,
  vehiculoPorDefecto,
  inicial,
  onGuardado,
  onCancelar,
}: {
  vehiculos: Vehiculo[]
  /** Ficha desde la que se da de alta: llega preseleccionada en «Atiende a». */
  vehiculoPorDefecto?: number
  inicial?: TallerVehiculo
  onGuardado: () => void
  onCancelar: () => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoTaller>(inicial?.tipo ?? 'taller')
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [correo, setCorreo] = useState(inicial?.correo ?? '')
  const [direccion, setDireccion] = useState(inicial?.direccion ?? '')
  const [vehiculoId, setVehiculoId] = useState(
    inicial ? (inicial.vehiculoId != null ? String(inicial.vehiculoId) : '') : String(vehiculoPorDefecto ?? ''),
  )
  const [notas, setNotas] = useState(inicial?.notas ?? '')

  const guardar = async () => {
    if (!nombre.trim()) return
    const datos = {
      tallerId: inicial?.tallerId ?? nuevoId('tl'),
      nombre: nombre.trim(),
      tipo,
      telefono: telefono.trim() || undefined,
      correo: correo.trim() || undefined,
      direccion: direccion.trim() || undefined,
      vehiculoId: vehiculoId ? Number(vehiculoId) : undefined,
      notas: notas.trim() || undefined,
      creadoEn: inicial?.creadoEn ?? new Date().toISOString(),
    }
    if (inicial?.id != null) await talleresVehiculoRepo.update(inicial.id, datos)
    else await talleresVehiculoRepo.add(datos)
    onGuardado()
  }

  return (
    <Formulario
      icono={inicial ? 'editar' : 'agregar'}
      titulo={
        inicial
          ? t('garage.taller.editar', 'Editar contacto')
          : t('garage.taller.nuevo', 'Nuevo contacto')
      }
      onGuardar={() => void guardar()}
      onCancelar={onCancelar}
    >
      <div className="flex flex-wrap gap-1.5">
        {TIPOS_TALLER.map((x) => {
          const activo = x.id === tipo
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setTipo(x.id)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-125"
              style={
                activo
                  ? { background: COLOR, color: TINTA_CTA }
                  : { background: `color-mix(in srgb, ${COLOR} 10%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${COLOR} 20%, transparent)` }
              }
            >
              <span className={activo ? '' : 'texto-vivo'} style={activo ? undefined : vivo(COLOR)}>
                <Icono nombre={x.icono} /> {t(`garage.tallerTipo.${x.id}`, x.label)}
              </span>
            </button>
          )
        })}
      </div>

      <Campo etiqueta={t('garage.taller.nombre', 'Nombre *')}>
        <input className={INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.taller.telefono', 'Teléfono')}>
          <input
            type="tel"
            className={INPUT}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </Campo>
        <Campo etiqueta={t('garage.taller.correo', 'Correo')}>
          <input
            type="email"
            className={INPUT}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </Campo>
      </div>

      <Campo etiqueta={t('garage.taller.direccion', 'Dirección')}>
        <input
          className={INPUT}
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
        />
      </Campo>

      <Campo etiqueta={t('garage.taller.vehiculo', 'Atiende a')}>
        <select
          className={INPUT}
          value={vehiculoId}
          onChange={(e) => setVehiculoId(e.target.value)}
        >
          <option value="">{t('garage.taller.todos', 'Todos mis vehículos')}</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta={t('garage.taller.notas', 'Notas')}>
        <textarea
          className={`${INPUT} min-h-[50px]`}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </Campo>
    </Formulario>
  )
}
