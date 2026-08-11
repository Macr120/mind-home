import { useState } from 'react'
import type { TallerVehiculo, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { GrupoTramite } from './constantes'
import { COLOR, PERIODICIDADES, getTipoTramite, tramitesDisponibles } from './constantes'
import { diasHasta, dinero, formatearFecha, textoRestante } from './fecha'
import { FormularioTramite } from './FormularioTramite'
import { borrarTramite, completarTramite } from './tramites'
import { AccionIcono, BotonBorrar, BotonPrimario, Cabecera, Chip, TARJETA } from './ui'

/** Urgencia por color: lo vencido en rojo, lo cercano en ámbar, el resto neutro. */
function urgencia(dias: number): { color: string; barra: string } {
  if (dias < 0) return { color: '#f87171', barra: '#f87171' }
  if (dias <= 30) return { color: COLOR, barra: COLOR }
  return { color: '#94a3b8', barra: 'rgb(148 163 184 / 0.45)' }
}

/**
 * Lista de obligaciones del vehículo. La misma sección sirve a las dos pestañas
 * de la ficha: `grupo` decide si muestra los papeles («Documentos») o lo que se
 * agenda y se hace («Trámites»).
 */
export function TramitesSection({
  vehiculo,
  tramites,
  talleres,
  grupo,
}: {
  vehiculo: Vehiculo
  tramites: TramiteVehiculo[]
  talleres: TallerVehiculo[]
  grupo: GrupoTramite
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<TramiteVehiculo | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)

  const esDoc = grupo === 'documento'
  const mios = tramites
    .filter((x) => x.vehiculoId === vehiculo.id && x.activo && getTipoTramite(x.tipo).grupo === grupo)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const nombreTaller = (id?: string) => talleres.find((c) => c.tallerId === id)?.nombre
  // Sin placas los tres documentos quedan fuera: no hay nada que dar de alta.
  const puedeCrear = tramitesDisponibles(vehiculo.matricula, grupo).length > 0

  if (creando || editando) {
    return (
      <FormularioTramite
        vehiculo={vehiculo}
        talleres={talleres}
        grupo={grupo}
        inicial={editando ?? undefined}
        onGuardado={() => {
          setCreando(false)
          setEditando(null)
        }}
        onCancelar={() => {
          setCreando(false)
          setEditando(null)
        }}
      />
    )
  }

  return (
    <section className="space-y-2" data-tut={esDoc ? 'garage.documentos' : 'garage.tramites'}>
      <Cabecera
        icono={esDoc ? 'tarjeta' : 'calendario'}
        titulo={
          esDoc ? t('garage.doc.seccion', 'Documentos') : t('garage.tram.seccion', 'Trámites')
        }
      >
        {puedeCrear && (
          <BotonPrimario onClick={() => setCreando(true)} pequeno>
            <Icono nombre="agregar" />{' '}
            {esDoc
              ? t('garage.doc.agregar', 'Añadir')
              : t('garage.tram.programar', 'Programar')}
          </BotonPrimario>
        )}
      </Cabecera>

      {mios.length === 0 ? (
        <p className={`${TARJETA} p-4 text-center text-xs leading-relaxed text-white/45`}>
          {esDoc
            ? puedeCrear
              ? t(
                  'garage.doc.vacio',
                  'Guarda aquí la tarjeta de circulación, la póliza del seguro y la tenencia con su folio y su vencimiento: te avisamos antes de que caduquen.',
                )
              : t(
                  'garage.doc.vacioSinPlaca',
                  'Este vehículo no lleva papeles. Añade la matrícula en la ficha y se desbloquean tenencia, tarjeta de circulación y seguro.',
                )
            : vehiculo.matricula?.trim()
              ? t(
                  'garage.tram.vacio',
                  'Agenda la verificación o el servicio periódico y te avisamos a tiempo.',
                )
              : t(
                  'garage.tram.vacioSinPlaca',
                  'Agenda el servicio periódico y te avisamos a tiempo. Con placas se desbloquea también la verificación.',
                )}
        </p>
      ) : (
        mios.map((x) => {
          const tipo = getTipoTramite(x.tipo)
          const dias = diasHasta(x.fecha)
          const { color, barra } = urgencia(dias)
          const periodo = PERIODICIDADES.find((p) => p.meses === (x.cadaMeses ?? 0))
          const taller = nombreTaller(x.tallerId)

          return (
            <div key={x.tramiteId} className={`group flex gap-3 ${TARJETA} p-3`}>
              {/* Barra de urgencia: se lee el estado sin teñir la tarjeta entera. */}
              <span className="w-1 shrink-0 rounded-full" style={{ background: barra }} />

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      <Icono nombre={tipo.icono} /> {x.titulo}
                    </p>
                    <p className="text-xs texto-vivo" style={vivo(color)}>
                      {formatearFecha(x.fecha)} · {textoRestante(dias)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {x.costo != null && x.costo > 0 && (
                      <span className="text-sm font-semibold">{dinero(x.costo)}</span>
                    )}
                    <span className="flex items-center opacity-60 transition group-hover:opacity-100">
                      {borrando !== x.tramiteId && (
                        <AccionIcono
                          nombre="editar"
                          titulo={t('garage.detalle.editar', 'Editar')}
                          onClick={() => setEditando(x)}
                        />
                      )}
                      <BotonBorrar
                        confirmando={borrando === x.tramiteId}
                        onPedir={() => setBorrando(x.tramiteId)}
                        onConfirmar={() => {
                          void borrarTramite(x)
                          setBorrando(null)
                        }}
                        onCancelar={() => setBorrando(null)}
                      />
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {periodo && (
                    <Chip>
                      <Icono nombre="repetir" /> {t(`garage.tramCada.${periodo.meses}`, periodo.label)}
                    </Chip>
                  )}
                  {!!x.avisoDias && (
                    <Chip>
                      <Icono nombre="alarma" />{' '}
                      {t('garage.tram.avisoPrevio', '{n} días antes', { n: String(x.avisoDias) })}
                    </Chip>
                  )}
                  {taller && (
                    <Chip>
                      <Icono nombre="ubicacion" /> {taller}
                    </Chip>
                  )}
                  {x.folio && (
                    <Chip>
                      <Icono nombre="tarjeta" /> {x.folio}
                    </Chip>
                  )}
                  <button
                    type="button"
                    onClick={() => void completarTramite(x, vehiculo, taller)}
                    title={
                      x.cadaMeses
                        ? t('garage.tram.hechoAyuda', 'Lo guarda en el historial y salta al siguiente periodo')
                        : t('garage.tram.hechoUnicoAyuda', 'Lo guarda en el historial y lo archiva')
                    }
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold transition hover:bg-white/10"
                  >
                    <Icono nombre="hecho" /> {t('garage.tram.hecho', 'Ya lo hice')}
                  </button>
                </div>

                {x.nota && <p className="mt-1 text-xs text-white/45">{x.nota}</p>}
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}
