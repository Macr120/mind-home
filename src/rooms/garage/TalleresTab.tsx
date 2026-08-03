import { useState } from 'react'
import type { TallerVehiculo, Vehiculo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, TIPOS_TALLER, getTipoTaller } from './constantes'
import { FormularioTaller } from './FormularioTaller'
import { borrarTaller } from './tramites'
import { AccionIcono, BotonBorrar, BotonPrimario, Chip, TARJETA, Tile } from './ui'

/**
 * Libreta del garaje: el taller de siempre, la aseguradora, el verificentro y la
 * grúa. Es de la casa, no de un vehículo: un contacto puede atender a todos y por
 * eso vive en su propia pestaña en vez de dentro de cada ficha.
 */
export function TalleresTab({
  talleres,
  vehiculos,
}: {
  talleres: TallerVehiculo[]
  vehiculos: Vehiculo[]
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<TallerVehiculo | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)

  if (creando || editando) {
    return (
      <FormularioTaller
        vehiculos={vehiculos}
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

  const nombreVehiculo = (id?: number) => vehiculos.find((v) => v.id === id)?.nombre

  return (
    <div className="space-y-3" data-tut="garage.talleres">
      <BotonPrimario onClick={() => setCreando(true)} className="w-full">
        <Icono nombre="agregar" /> {t('garage.taller.añadir', 'Añadir contacto')}
      </BotonPrimario>

      {talleres.length === 0 ? (
        <div className={`${TARJETA} space-y-1 p-6 text-center`}>
          <p className="text-3xl">
            <Icono nombre="telefono" />
          </p>
          <p className="text-xs leading-relaxed text-white/45">
            {t(
              'garage.taller.vacio',
              'Guarda aquí el taller de confianza, la aseguradora, el verificentro y la grúa: siempre a la mano cuando toca un trámite.',
            )}
          </p>
        </div>
      ) : (
        TIPOS_TALLER.map((grupo) => {
          const delGrupo = talleres.filter((c) => c.tipo === grupo.id)
          if (delGrupo.length === 0) return null
          return (
            <section key={grupo.id} className="space-y-2">
              <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                {t(`garage.tallerTipo.${grupo.id}`, grupo.label)}
              </p>
              {delGrupo.map((c) => {
                const vehiculo = nombreVehiculo(c.vehiculoId)
                return (
                  <div key={c.tallerId} className={`group flex items-start gap-3 ${TARJETA} p-3`}>
                    <Tile nombre={getTipoTaller(c.tipo).icono} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white/95">{c.nombre}</p>
                      <p className="truncate text-xs text-white/40">
                        {vehiculo
                          ? t('garage.taller.atiendeA', 'Atiende a {n}', { n: vehiculo })
                          : t('garage.taller.todos', 'Todos mis vehículos')}
                      </p>

                      {/* Teléfono y correo como acciones, no como texto suelto. */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {c.telefono && (
                          <a
                            href={`tel:${c.telefono}`}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition hover:brightness-110"
                            style={{ background: `${COLOR}22` }}
                          >
                            <Icono nombre="telefono" /> {c.telefono}
                          </a>
                        )}
                        {c.correo && (
                          <a
                            href={`mailto:${c.correo}`}
                            className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold transition hover:bg-white/15"
                          >
                            <Icono nombre="correo" /> {c.correo}
                          </a>
                        )}
                        {c.direccion && (
                          <Chip className="max-w-full truncate">
                            <Icono nombre="ubicacion" /> {c.direccion}
                          </Chip>
                        )}
                      </div>

                      {c.notas && <p className="mt-1 text-xs text-white/45">{c.notas}</p>}
                    </div>

                    <div className="flex shrink-0 items-center opacity-60 transition group-hover:opacity-100">
                      {borrando !== c.tallerId && (
                        <AccionIcono
                          nombre="editar"
                          titulo={t('garage.detalle.editar', 'Editar')}
                          onClick={() => setEditando(c)}
                        />
                      )}
                      <BotonBorrar
                        confirmando={borrando === c.tallerId}
                        onPedir={() => setBorrando(c.tallerId)}
                        onConfirmar={() => {
                          void borrarTaller(c)
                          setBorrando(null)
                        }}
                        onCancelar={() => setBorrando(null)}
                      />
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })
      )}
    </div>
  )
}
