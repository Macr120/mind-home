import { useState } from 'react'
import type { ContactoAgenda, EventoAgenda, ProyectoAgenda } from '../../core/data/db'
import { useEventosDeContacto } from '../../core/data/repository'
import { deIso } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA } from './constantes'
import { borrarContacto } from './crear'
import { diasParaCumple, edadQueCumple, proximoCumple } from './cumples'
import { FormEvento } from './FormEvento'
import { TarjetaEvento } from './TarjetaEvento'
import { BotonBorrar, TARJETA } from './ui'

/** Ficha de una persona: datos de contacto, su cumpleaños y lo que tienes con ella. */
export function DetalleContacto({
  contacto,
  contactos,
  proyectos,
  onVolver,
  onEditar,
  onNuevoEvento,
}: {
  contacto: ContactoAgenda
  contactos: ContactoAgenda[]
  proyectos: ProyectoAgenda[]
  onVolver: () => void
  onEditar: () => void
  onNuevoEvento: () => void
}) {
  const t = useT()
  const [confirmando, setConfirmando] = useState(false)
  const [editandoEvento, setEditandoEvento] = useState<EventoAgenda | null>(null)
  const eventos = useEventosDeContacto(contacto.contactoId) ?? []

  const edad = contacto.cumple ? edadQueCumple(contacto.cumple) : null
  const faltan = contacto.cumple ? diasParaCumple(contacto.cumple) : null

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onVolver} className="rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
          <Icono nombre="volver" /> {t('agenda.volver', 'Volver')}
        </button>
        <span className="flex-1" />
        {!confirmando && (
          <button type="button" onClick={onEditar} className="rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
            <Icono nombre="editar" />
          </button>
        )}
        <BotonBorrar
          confirmando={confirmando}
          onPedir={() => setConfirmando(true)}
          onConfirmar={() => {
            void borrarContacto(contacto)
            onVolver()
          }}
          onCancelar={() => setConfirmando(false)}
        />
      </div>

      <div className={`${TARJETA} flex items-center gap-3`}>
        <AvatarContacto nombre={contacto.nombre} foto={contacto.foto} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{contacto.nombre}</p>
          {contacto.relacion && <p className="text-sm text-white/50">{contacto.relacion}</p>}
          {contacto.cumple && (
            <p className="text-xs text-white/50">
              <Icono nombre="pastel" />{' '}
              {deIso(proximoCumple(contacto.cumple)).toLocaleDateString(localeActual(), {
                day: 'numeric',
                month: 'long',
              })}
              {edad != null && ` · ${t('agenda.persona.edad', 'cumple {n}', { n: edad })}`}
              {faltan === 0
                ? ` · ${t('agenda.persona.hoyCumple', '¡es hoy!')}`
                : faltan != null && ` · ${t('agenda.persona.faltan', 'faltan {n} días', { n: faltan })}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {contacto.telefono && (
          <a
            href={`tel:${contacto.telefono}`}
            className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            <Icono nombre="telefono" /> {contacto.telefono}
          </a>
        )}
        {contacto.correo && (
          <a
            href={`mailto:${contacto.correo}`}
            className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            <Icono nombre="correo" /> {contacto.correo}
          </a>
        )}
        <button
          type="button"
          onClick={onNuevoEvento}
          className="rounded-lg px-3 py-2 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.personas }}
        >
          <Icono nombre="agregar" /> {t('agenda.personas.nuevoPlan', 'Agendar algo')}
        </button>
      </div>

      {contacto.direccion && (
        <p className={`${TARJETA} text-sm text-white/70`}>
          <Icono nombre="ubicacion" /> {contacto.direccion}
        </p>
      )}
      {contacto.notas && <p className={`${TARJETA} whitespace-pre-wrap text-sm text-white/70`}>{contacto.notas}</p>}

      <section className="space-y-2">
        <p className="text-sm font-bold">{t('agenda.eventosDe', 'Con {n}', { n: contacto.nombre })}</p>
        {eventos.length === 0 ? (
          <p className="py-3 text-center text-sm text-white/40">
            {t('agenda.vacio.eventosContacto', 'Nada agendado con esta persona.')}
          </p>
        ) : (
          [...eventos]
            .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
            .map((ev) => (
              <TarjetaEvento
                key={ev.id}
                ev={ev}
                contactos={contactos}
                proyectos={proyectos}
                onEditar={() => setEditandoEvento(ev)}
              />
            ))
        )}
      </section>

      {/* El evento ligado puede ser de cualquier sección: se edita con la suya. */}
      {editandoEvento && (
        <FormEvento
          area={editandoEvento.area}
          inicial={editandoEvento}
          contactos={contactos}
          proyectos={proyectos}
          onCerrar={() => setEditandoEvento(null)}
        />
      )}
    </div>
  )
}
