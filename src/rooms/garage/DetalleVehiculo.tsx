import { useState } from 'react'
import type { TallerVehiculo, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import {
  registrosMantenimientoRepo,
  useMantenimientosVehiculo,
  vehiculosRepo,
} from '../../core/data/repository'
import { COLOR, getTipoMantenimiento, getTipoVehiculo } from './constantes'
import { dinero, formatearFecha } from './fecha'
import { FormularioMantenimiento } from './FormularioMantenimiento'
import { FormularioVehiculo } from './FormularioVehiculo'
import { TalleresTab } from './TalleresTab'
import { TramitesSection } from './TramitesSection'
import {
  AccionIcono,
  BotonBorrar,
  BotonPrimario,
  Cabecera,
  Chip,
  INPUT,
  TARJETA,
  Tile,
  TINTA_CTA,
} from './ui'
import { Archivador } from '../_shared/Archivador'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/** Los tres cuadernos de la ficha; el historial de servicios queda siempre debajo. */
type TabFicha = 'tramites' | 'documentos' | 'contactos'

const TABS_FICHA: { id: TabFicha; icono: NombreIcono; labelEs: string }[] = [
  { id: 'tramites', icono: 'calendario', labelEs: 'Trámites' },
  { id: 'documentos', icono: 'tarjeta', labelEs: 'Documentos' },
  { id: 'contactos', icono: 'telefono', labelEs: 'Contactos' },
]

export function DetalleVehiculo({
  vehiculo,
  vehiculos,
  tramites,
  talleres,
  onVolver,
}: {
  vehiculo: Vehiculo
  vehiculos: Vehiculo[]
  tramites: TramiteVehiculo[]
  talleres: TallerVehiculo[]
  onVolver: () => void
}) {
  const t = useT()
  const id = vehiculo.id!
  const [tab, setTab] = useState<TabFicha>('tramites')
  const [editandoVehiculo, setEditandoVehiculo] = useState(false)
  const [nuevoServicio, setNuevoServicio] = useState(false)
  const [editServicioId, setEditServicioId] = useState<number | null>(null)
  const [borrandoId, setBorrandoId] = useState<number | null>(null)
  const [odoEdit, setOdoEdit] = useState(
    vehiculo.odometroActual != null ? String(vehiculo.odometroActual) : '',
  )

  const servicios = useMantenimientosVehiculo(id) ?? []
  const tipo = getTipoVehiculo(vehiculo.tipo)
  const gastoTotal = servicios.reduce((s, r) => s + (r.costo ?? 0), 0)
  const editandoServicio = servicios.find((s) => s.id === editServicioId)
  const odoCambiado = odoEdit !== (vehiculo.odometroActual != null ? String(vehiculo.odometroActual) : '')

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
        data-tut="garage.detalle.volver"
        onClick={onVolver}
        className="rounded-lg px-1 py-0.5 text-sm font-semibold transition hover:bg-white/10 texto-vivo"
        style={vivo(COLOR)}
      >
        <Icono nombre="volver" /> {t('garage.detalle.volver', 'Volver al garaje')}
      </button>

      {/* Portada del vehículo: identidad arriba, odómetro y cifras abajo. */}
      <section
        data-tut="garage.detalle.portada"
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: `color-mix(in srgb, ${COLOR} 24%, transparent)`,
          background: `linear-gradient(160deg, color-mix(in srgb, ${COLOR} 13%, transparent), color-mix(in srgb, ${COLOR} 4%, transparent) 60%)`,
        }}
      >
        <div className="flex items-start gap-3 p-4">
          <Tile emoji={tipo.icon} grande />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black">{vehiculo.nombre}</h2>
            <p className="truncate text-sm text-white/60">
              {tipo.label}
              {vehiculo.marca && ` · ${vehiculo.marca}`}
              {vehiculo.modelo && ` ${vehiculo.modelo}`}
              {vehiculo.anio && ` (${vehiculo.anio})`}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {vehiculo.matricula && (
                <Chip>
                  <Icono nombre="tarjeta" /> {vehiculo.matricula}
                </Chip>
              )}
              <Chip>
                <Icono nombre="herramienta" />{' '}
                {servicios.length === 1
                  ? t('garage.veh.servicio', '1 servicio')
                  : t('garage.veh.servicios', '{n} servicios', { n: String(servicios.length) })}
              </Chip>
              {gastoTotal > 0 && (
                <Chip color={COLOR}>
                  <span className="texto-vivo" style={vivo(COLOR)}>
                    {t('garage.detalle.gastoTotal', 'Total {c}', { c: dinero(gastoTotal) })}
                  </span>
                </Chip>
              )}
            </div>
          </div>
          <AccionIcono
            nombre="editar"
            titulo={t('garage.detalle.editar', 'Editar')}
            onClick={() => setEditandoVehiculo(true)}
          />
        </div>

        <div className="flex items-end gap-2 border-t border-white/10 bg-black/15 p-3">
          <label className="flex-1 text-xs text-white/50">
            {t('garage.detalle.odo', `Odómetro actual (${vehiculo.unidad})`, {
              unit: vehiculo.unidad,
            })}
            <input
              type="number"
              min={0}
              className={INPUT}
              value={odoEdit}
              onChange={(e) => setOdoEdit(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void actualizarOdometro()}
            disabled={!odoCambiado}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
            style={{ background: COLOR, color: TINTA_CTA }}
          >
            {t('garage.detalle.actualizar', 'Actualizar')}
          </button>
        </div>
      </section>

      {/* Mismo riel de píldoras que el garaje, ahora dentro de la ficha. */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        {TABS_FICHA.map((tabItem) => {
          const activa = tab === tabItem.id
          return (
            <button
              key={tabItem.id}
              type="button"
              data-tut={`garage.detalle.tab.${tabItem.id}`}
              onClick={() => setTab(tabItem.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                activa ? 'shadow-sm' : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              }`}
              style={activa ? { background: COLOR, color: TINTA_CTA } : undefined}
            >
              <Icono nombre={tabItem.icono} />{' '}
              <span className="align-middle">
                {t(`garage.detalle.tab.${tabItem.id}`, tabItem.labelEs)}
              </span>
            </button>
          )
        })}
      </div>

      {tab !== 'contactos' && (
        <TramitesSection
          // Cambiar de pestaña cierra el formulario a medio llenar en vez de
          // heredarlo con el otro grupo.
          key={tab}
          vehiculo={vehiculo}
          tramites={tramites}
          talleres={talleres}
          grupo={tab === 'documentos' ? 'documento' : 'tramite'}
        />
      )}
      {tab === 'contactos' && (
        <TalleresTab talleres={talleres} vehiculos={vehiculos} vehiculo={vehiculo} />
      )}

      <section data-tut="garage.detalle.historial" className="space-y-2">
        <Cabecera icono="registros" titulo={t('garage.detalle.historial', 'Historial')}>
          <BotonPrimario onClick={() => setNuevoServicio(true)} pequeno>
            <Icono nombre="herramienta" /> {t('garage.detalle.registrar', 'Registrar mantenimiento')}
          </BotonPrimario>
        </Cabecera>

        <Archivador
          items={servicios}
          fecha={(r) => r.fecha}
          clave={(r) => r.id ?? r.fecha}
          vacio={t(
            'garage.detalle.sinServicios',
            'Aún no hay servicios. Registra el último cambio de aceite, cadena, etc.',
          )}
          resumen={(regs) => {
            const gasto = regs.reduce((s, r) => s + (r.costo ?? 0), 0)
            return gasto > 0 ? dinero(gasto) : null
          }}
        >
          {(r) => {
            const tm = getTipoMantenimiento(r.tipo)
            return (
              <div className={`group ${TARJETA} p-3`}>
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.titulo}</p>
                    <p className="text-xs text-white/45">
                      {formatearFecha(r.fecha)} · {tm.label}
                      {r.odometro != null &&
                        ` · ${r.odometro.toLocaleString('es-MX')} ${vehiculo.unidad}`}
                    </p>
                    {r.taller && (
                      <p className="mt-0.5 truncate text-xs text-white/40">
                        <Icono nombre="ubicacion" /> {r.taller}
                      </p>
                    )}
                    {(r.proximoOdometro != null || r.proximaFecha) && (
                      <p className="mt-1 text-xs texto-vivo" style={vivo(COLOR)}>
                        {t('garage.detalle.proximo', 'Próximo:')}
                        {r.proximoOdometro != null &&
                          ` ${r.proximoOdometro.toLocaleString('es-MX')} ${vehiculo.unidad}`}
                        {r.proximoOdometro != null && r.proximaFecha && ' · '}
                        {r.proximaFecha && formatearFecha(r.proximaFecha)}
                      </p>
                    )}
                    {r.nota && <p className="mt-1 text-xs text-white/50">{r.nota}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {r.costo != null && r.costo > 0 && (
                      <p className="text-sm font-semibold">{dinero(r.costo)}</p>
                    )}
                    <div className="flex items-center opacity-60 transition group-hover:opacity-100">
                      {borrandoId !== r.id && (
                        <AccionIcono
                          nombre="editar"
                          titulo={t('garage.detalle.editar', 'Editar')}
                          onClick={() => r.id && setEditServicioId(r.id)}
                        />
                      )}
                      <BotonBorrar
                        confirmando={borrandoId === r.id}
                        onPedir={() => r.id && setBorrandoId(r.id)}
                        onConfirmar={() => {
                          if (r.id) void registrosMantenimientoRepo.remove(r.id)
                          setBorrandoId(null)
                        }}
                        onCancelar={() => setBorrandoId(null)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          }}
        </Archivador>
      </section>

      {vehiculo.notas && (
        <p className={`${TARJETA} p-3 text-xs text-white/45`}>{vehiculo.notas}</p>
      )}
    </div>
  )
}
