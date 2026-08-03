import { useState } from 'react'
import type {
  ContactoAgenda,
  CuidadoMascota,
  EventoAgenda,
  Mascota,
  Medicamento,
  ProyectoAgenda,
} from '../../core/data/db'
import { deIso } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA } from './constantes'
import { borrarCuidado, borrarMascota, completarCuidado, reactivarCuidado } from './crear'
import { FilaMedicamento } from './FilaMedicamento'
import { FormCuidado } from './FormCuidado'
import { FormEvento } from './FormEvento'
import { FormMascota } from './FormMascota'
import { FormMedicamento } from './FormMedicamento'
import { diasHasta, getCuidado, getEspecie, textoPeriodo } from './mascotas'
import { edadTexto } from './MascotasSection'
import { TarjetaEvento } from './TarjetaEvento'
import { BotonBorrar, BTN_SEC } from './ui'

/**
 * Ficha de una mascota: sus datos, sus cuidados que se repiten y todo lo que ya
 * lleva su nombre en Salud (citas y tratamientos). Sustituye a la pestaña
 * mientras está abierta, igual que la ficha de un contacto en Personas.
 */
export function DetalleMascota({
  mascota,
  cuidados,
  eventos,
  medicinas,
  contactos,
  proyectos,
  onVolver,
}: {
  mascota: Mascota
  cuidados: CuidadoMascota[]
  /** Citas de Salud (ya filtradas por sección, no por mascota). */
  eventos: EventoAgenda[]
  medicinas: Medicamento[]
  contactos: ContactoAgenda[]
  proyectos: ProyectoAgenda[]
  onVolver: () => void
}) {
  const t = useT()
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [cuidado, setCuidado] = useState<CuidadoMascota | null>(null)
  const [creandoCuidado, setCreandoCuidado] = useState(false)
  const [creandoCita, setCreandoCita] = useState(false)
  const [cita, setCita] = useState<EventoAgenda | null>(null)
  const [creandoMedicina, setCreandoMedicina] = useState(false)
  const [medicina, setMedicina] = useState<Medicamento | null>(null)

  const mios = cuidados.filter((c) => c.mascotaId === mascota.mascId)
  const activos = mios.filter((c) => c.activo).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const archivados = mios.filter((c) => !c.activo)
  const citas = eventos.filter((e) => e.mascotaId === mascota.mascId && e.fecha)
  const tratamientos = medicinas.filter((m) => m.mascotaId === mascota.mascId)

  const ficha = [mascota.raza, edadTexto(mascota, t), mascota.peso ? `${mascota.peso} kg` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-4">
      <button type="button" onClick={onVolver} className={BTN_SEC}>
        <Icono nombre="atras" /> {t('agenda.volver', 'Volver')}
      </button>

      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <AvatarContacto
          nombre={mascota.nombre}
          foto={mascota.foto}
          icono={getEspecie(mascota.especie).icono}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{mascota.nombre}</p>
          {ficha && <p className="truncate text-xs text-white/50">{ficha}</p>}
          {mascota.veterinario && (
            <p className="mt-1 truncate text-xs text-white/50">
              <Icono nombre="estetoscopio" /> {mascota.veterinario}
              {mascota.telefono ? ` · ${mascota.telefono}` : ''}
            </p>
          )}
          {mascota.notas && <p className="mt-1 text-xs text-white/40">{mascota.notas}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!confirmando && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              title={t('agenda.editar', 'Editar')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="editar" />
            </button>
          )}
          <BotonBorrar
            confirmando={confirmando}
            onPedir={() => setConfirmando(true)}
            onConfirmar={() => {
              void borrarMascota(mascota)
              onVolver()
            }}
            onCancelar={() => setConfirmando(false)}
          />
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            <Icono nombre="vacuna" /> {t('agenda.mascota.cuidados', 'Cuidados')}
          </p>
          <button
            type="button"
            onClick={() => setCreandoCuidado(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
            style={{ background: COLOR_AREA.salud }}
          >
            <Icono nombre="agregar" /> {t('agenda.mascota.nuevoCuidado', 'Nuevo cuidado')}
          </button>
        </div>
        {activos.length === 0 && archivados.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/40">
            {t('agenda.vacio.cuidados', 'Sin cuidados programados: vacunas, desparasitación, baño…')}
          </p>
        ) : (
          <div className="space-y-2">
            {activos.map((c) => (
              <FilaCuidado
                key={c.cuidadoId}
                cuidado={c}
                mascota={mascota}
                onEditar={() => setCuidado(c)}
              />
            ))}
            {archivados.map((c) => (
              <FilaCuidado
                key={c.cuidadoId}
                cuidado={c}
                mascota={mascota}
                onEditar={() => setCuidado(c)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            <Icono nombre="hospital" /> {t('agenda.mascota.citas', 'Citas del veterinario')}
          </p>
          <button
            type="button"
            onClick={() => setCreandoCita(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
            style={{ background: COLOR_AREA.salud }}
          >
            <Icono nombre="agregar" /> {t('agenda.salud.nuevaCita', 'Nueva cita')}
          </button>
        </div>
        <Archivador
          items={citas}
          fecha={(e) => e.fecha!}
          clave={(e) => e.id!}
          vacio={t('agenda.vacio.citasMascota', 'Sin citas para esta mascota.')}
        >
          {(ev) => (
            <TarjetaEvento ev={ev} contactos={contactos} proyectos={proyectos} onEditar={() => setCita(ev)} />
          )}
        </Archivador>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            <Icono nombre="pastilla" /> {t('agenda.salud.medicamentos', 'Medicamentos')}
          </p>
          <button
            type="button"
            onClick={() => setCreandoMedicina(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
            style={{ background: COLOR_AREA.salud }}
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
              <FilaMedicamento key={m.medId} medicina={m} onEditar={() => setMedicina(m)} />
            ))}
          </div>
        )}
      </section>

      {editando && <FormMascota inicial={mascota} onCerrar={() => setEditando(false)} />}
      {(creandoCuidado || cuidado) && (
        <FormCuidado
          mascota={mascota}
          inicial={cuidado}
          onCerrar={() => {
            setCreandoCuidado(false)
            setCuidado(null)
          }}
        />
      )}
      {(creandoCita || cita) && (
        <FormEvento
          area="salud"
          inicial={cita}
          mascotaInicial={mascota.mascId}
          contactos={contactos}
          proyectos={proyectos}
          onCerrar={() => {
            setCreandoCita(false)
            setCita(null)
          }}
        />
      )}
      {(creandoMedicina || medicina) && (
        <FormMedicamento
          inicial={medicina}
          mascotaInicial={mascota.mascId}
          onCerrar={() => {
            setCreandoMedicina(false)
            setMedicina(null)
          }}
        />
      )}
    </div>
  )
}

function FilaCuidado({
  cuidado,
  mascota,
  onEditar,
}: {
  cuidado: CuidadoMascota
  mascota: Mascota
  onEditar: () => void
}) {
  const t = useT()
  const [confirmando, setConfirmando] = useState(false)
  const def = getCuidado(cuidado.tipo)
  const faltan = diasHasta(cuidado.fecha)
  const vencido = cuidado.activo && faltan < 0

  const fechaCorta = (iso: string) =>
    deIso(iso).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-3 ${cuidado.activo ? '' : 'opacity-50'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">
          <Icono nombre={def.icono} /> {cuidado.titulo}
        </span>
        <span className={`text-xs ${vencido ? 'text-red-300' : 'text-white/50'}`}>
          {fechaCorta(cuidado.fecha)}
          {cuidado.hora ? ` · ${cuidado.hora}` : ''}
        </span>
        {cuidado.activo ? (
          <button
            type="button"
            onClick={() => void completarCuidado(cuidado, mascota.nombre)}
            className="ml-auto rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold transition hover:bg-white/10"
          >
            <Icono nombre="confirmar" /> {t('agenda.cuidado.hecho', 'Ya lo hice')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void reactivarCuidado(cuidado, mascota.nombre)}
            className="ml-auto rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold transition hover:bg-white/10"
          >
            {t('agenda.med.reanudar', 'Reanudar')}
          </button>
        )}
        {!confirmando && (
          <button
            type="button"
            onClick={onEditar}
            className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="editar" />
          </button>
        )}
        <BotonBorrar
          confirmando={confirmando}
          onPedir={() => setConfirmando(true)}
          onConfirmar={() => void borrarCuidado(cuidado)}
          onCancelar={() => setConfirmando(false)}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-white/40">
        <span>{textoPeriodo(cuidado.cadaMeses, t)}</span>
        {cuidado.ultima && (
          <span>
            {t('agenda.cuidado.ultima', 'Última vez: {f}', { f: fechaCorta(cuidado.ultima) })}
          </span>
        )}
      </div>
      {cuidado.nota && <p className="mt-1 text-xs text-white/40">{cuidado.nota}</p>}
    </div>
  )
}
