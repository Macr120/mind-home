import { useState } from 'react'
import type {
  ContactoAgenda,
  Cuidado,
  EventoAgenda,
  Mascota,
  Medicamento,
} from '../../core/data/db'
import { eventosAgendaRepo, medicamentosRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { CarpetasPorEtiqueta } from '../_shared/Archivador'
import { Arrastrable, guardarOrden, porOrden, useArrastreFilas } from './arrastre'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA } from './constantes'
import { acento } from '../_shared/acento'
import { CuidadosSection } from './CuidadosSection'
import { FilaMedicamento } from './FilaMedicamento'
import { FormContacto } from './FormContacto'
import { FormEvento } from './FormEvento'
import { FormMedicamento } from './FormMedicamento'
import { getEspecialidad, inferirEspecialidad } from './salud'
import { TarjetaEvento } from './TarjetaEvento'
import { BTN_SEC } from './ui'

/**
 * Ficha de una persona a tu cuidado: sus citas, sus tratamientos y sus cuidados
 * que se repiten. Sustituye a la pestaña mientras está abierta, igual que la
 * ficha de una mascota.
 *
 * Los datos personales (teléfono, dirección, cumpleaños) se editan en Personas:
 * es la MISMA fila, y duplicar aquí ese formulario sería tener dos verdades.
 */
export function DetalleProjimo({
  projimo,
  eventos,
  medicinas,
  cuidados,
  contactos,
  mascotas,
  onVolver,
}: {
  projimo: ContactoAgenda
  /** Citas de Salud (ya filtradas por sección, no por persona). */
  eventos: EventoAgenda[]
  medicinas: Medicamento[]
  cuidados: Cuidado[]
  contactos: ContactoAgenda[]
  mascotas: Mascota[]
  onVolver: () => void
}) {
  const t = useT()
  const [editando, setEditando] = useState(false)
  const [creandoCita, setCreandoCita] = useState(false)
  const [cita, setCita] = useState<EventoAgenda | null>(null)
  const [creandoMedicina, setCreandoMedicina] = useState(false)
  const [medicina, setMedicina] = useState<Medicamento | null>(null)

  const citas = porOrden(eventos.filter((e) => e.contactoId === projimo.contactoId && e.fecha))
  const tratamientos = porOrden(medicinas.filter((m) => m.contactoId === projimo.contactoId))
  const suyos = cuidados.filter((c) => c.contactoId === projimo.contactoId)

  /** Carpeta en la que cae la cita: es también su lista para el arrastre. */
  const especialidadDe = (e: EventoAgenda) => {
    const esp = getEspecialidad(e.especialidad ?? inferirEspecialidad(e.titulo, e.con, e.notas))
    return t(esp.clave, esp.es)
  }

  const arrastreCitas = useArrastreFilas(
    citas,
    (e) => String(e.id),
    especialidadDe,
    (nuevas) => void guardarOrden(nuevas, (id, orden) => eventosAgendaRepo.update(id, { orden })),
  )
  const arrastreTratamientos = useArrastreFilas(
    tratamientos,
    (m) => String(m.id),
    () => 'projimo.medicamentos',
    (nuevas) => void guardarOrden(nuevas, (id, orden) => medicamentosRepo.update(id, { orden })),
  )

  const ficha = [projimo.relacion, projimo.telefono].filter(Boolean).join(' · ')

  return (
    <div className="space-y-4">
      <button type="button" onClick={onVolver} className={BTN_SEC}>
        <Icono nombre="atras" /> {t('agenda.volver', 'Volver')}
      </button>

      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <AvatarContacto nombre={projimo.nombre} foto={projimo.foto} icono="companeros" size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{projimo.nombre}</p>
          {ficha && <p className="truncate text-xs text-white/50">{ficha}</p>}
          {projimo.notas && <p className="mt-1 text-xs text-white/60">{projimo.notas}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditando(true)}
          title={t('agenda.editar', 'Editar')}
          className="shrink-0 rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10"
        >
          <Icono nombre="editar" />
        </button>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            <Icono nombre="hospital" /> {t('agenda.salud.citas', 'Citas médicas')}
          </p>
          <button
            type="button"
            onClick={() => setCreandoCita(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold ui-accent-bg transition hover:brightness-110"
            style={acento(COLOR_AREA.salud)}
          >
            <Icono nombre="agregar" /> {t('agenda.salud.nuevaCita', 'Nueva cita')}
          </button>
        </div>
        {/* Por especialidad, igual que en Salud › Tú. */}
        <CarpetasPorEtiqueta
          items={citas}
          etiqueta={especialidadDe}
          clave={(e) => e.id!}
          sinEtiqueta={t('agenda.esp.otra', 'Otra')}
        >
          {(ev) => (
            <Arrastrable arrastre={arrastreCitas} item={ev}>
              <TarjetaEvento ev={ev} contactos={contactos} mascotas={mascotas} onEditar={() => setCita(ev)} />
            </Arrastrable>
          )}
        </CarpetasPorEtiqueta>
      </section>

      <CuidadosSection cuidados={suyos} contactoId={projimo.contactoId} nombreDueno={projimo.nombre} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            <Icono nombre="pastilla" /> {t('agenda.salud.medicamentos', 'Medicamentos')}
          </p>
          <button
            type="button"
            onClick={() => setCreandoMedicina(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold ui-accent-bg transition hover:brightness-110"
            style={acento(COLOR_AREA.salud)}
          >
            <Icono nombre="agregar" /> {t('agenda.salud.nuevoMedicamento', 'Nuevo medicamento')}
          </button>
        </div>
        {tratamientos.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/40">
            {t('agenda.vacio.medicamentos', 'Ningún tratamiento en curso.')}
          </p>
        ) : (
          <div className="space-y-2">
            {tratamientos.map((m) => (
              <Arrastrable key={m.medId} arrastre={arrastreTratamientos} item={m}>
                <FilaMedicamento medicina={m} onEditar={() => setMedicina(m)} />
              </Arrastrable>
            ))}
          </div>
        )}
      </section>

      {editando && <FormContacto inicial={projimo} onCerrar={() => setEditando(false)} />}
      {(creandoCita || cita) && (
        <FormEvento
          area="salud"
          inicial={cita}
          contactos={contactos}
          contactoInicial={projimo.contactoId}
          onCerrar={() => {
            setCreandoCita(false)
            setCita(null)
          }}
        />
      )}
      {(creandoMedicina || medicina) && (
        <FormMedicamento
          inicial={medicina}
          contactoInicial={projimo.contactoId}
          onCerrar={() => {
            setCreandoMedicina(false)
            setMedicina(null)
          }}
        />
      )}
    </div>
  )
}
