import { useState } from 'react'
import type { RegistroMantenimiento, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import { COLOR, getTipoVehiculo } from './constantes'
import { diasHasta, formatearFecha } from './fecha'
import { FormularioVehiculo } from './FormularioVehiculo'
import { borrarVehiculo } from './tramites'
import { BotonBorrar, BotonPrimario, Chip, TARJETA, Tile } from './ui'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

export function VehiculosTab({
  vehiculos,
  registros,
  tramites,
  onAbrir,
}: {
  vehiculos: Vehiculo[]
  registros: RegistroMantenimiento[]
  tramites: TramiteVehiculo[]
  onAbrir: (id: number) => void
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)
  const [borrando, setBorrando] = useState<number | null>(null)

  if (creando) {
    return (
      <FormularioVehiculo onGuardado={() => setCreando(false)} onCancelar={() => setCreando(false)} />
    )
  }

  return (
    <div className="space-y-3" data-tut="garage.veh.lista">
      <BotonPrimario onClick={() => setCreando(true)} className="w-full" tut="garage.veh.alta">
        <Icono nombre="agregar" /> {t('garage.veh.añadir', 'Añadir vehículo')}
      </BotonPrimario>

      {vehiculos.length === 0 ? (
        <div className={`${TARJETA} space-y-1 p-6 text-center`}>
          <p className="text-3xl">
            <Icono nombre="auto" />
          </p>
          <p className="text-sm text-white/50">
            {t('garage.veh.vacio', 'Bicicletas, autos, motos y más — todo en un solo garaje.')}
          </p>
        </div>
      ) : (
        vehiculos.map((v) => {
          const tipo = getTipoVehiculo(v.tipo)
          const servicios = registros.filter((r) => r.vehiculoId === v.id).length
          // Lo primero que vence: es el dato por el que se entra a la ficha.
          const proximo = tramites
            .filter((x) => x.vehiculoId === v.id && x.activo)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
          const dias = proximo ? diasHasta(proximo.fecha) : null
          const colorProx = dias == null ? COLOR : dias < 0 ? '#f87171' : dias <= 30 ? COLOR : '#94a3b8'

          return (
            <div key={v.id} className={`group ${TARJETA} p-3`}>
              <div className="flex items-start gap-3">
                <Tile emoji={tipo.icon} />
                <button
                  type="button"
                  data-tut={`garage.veh.item.${v.id}`}
                  onClick={() => v.id && onAbrir(v.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <h3 className="truncate font-bold text-white/95">{v.nombre}</h3>
                  <p className="truncate text-xs text-white/50">
                    {tipo.label}
                    {v.marca ? ` · ${v.marca}` : ''}
                    {v.modelo ? ` ${v.modelo}` : ''}
                    {v.anio ? ` (${v.anio})` : ''}
                  </p>
                </button>
                <div className="flex shrink-0 items-center opacity-60 transition group-hover:opacity-100">
                  <BotonBorrar
                    confirmando={borrando === v.id}
                    onPedir={() => v.id && setBorrando(v.id)}
                    onConfirmar={() => {
                      if (v.id) void borrarVehiculo(v.id)
                      setBorrando(null)
                    }}
                    onCancelar={() => setBorrando(null)}
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 ps-14">
                {v.matricula && (
                  <Chip>
                    <Icono nombre="tarjeta" /> {v.matricula}
                  </Chip>
                )}
                {v.odometroActual != null && (
                  <Chip color={COLOR}>
                    <span className="texto-vivo" style={vivo(COLOR)}>
                      {v.odometroActual.toLocaleString('es-MX')} {v.unidad}
                    </span>
                  </Chip>
                )}
                <Chip>
                  <Icono nombre="herramienta" />{' '}
                  {servicios === 1
                    ? t('garage.veh.servicio', '1 servicio')
                    : t('garage.veh.servicios', '{n} servicios', { n: String(servicios) })}
                </Chip>
                {proximo && (
                  <Chip color={colorProx}>
                    <span className="texto-vivo" style={vivo(colorProx)}>
                      <Icono nombre="calendario" /> {proximo.titulo} · {formatearFecha(proximo.fecha)}
                    </span>
                  </Chip>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
