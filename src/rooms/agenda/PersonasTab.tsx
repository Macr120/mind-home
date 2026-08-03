import { useState } from 'react'
import type { ContactoAgenda, EventoAgenda, ProyectoAgenda } from '../../core/data/db'
import { normalizar } from '../../core/chat/dispatcher'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { CarpetasPorEtiqueta } from '../_shared/Archivador'
import { AvatarContacto } from './AvatarContacto'
import { BarraEjemplo } from './BarraEjemplo'
import { COLOR_AREA } from './constantes'
import { diasParaCumple } from './cumples'
import { DetalleContacto } from './DetalleContacto'
import { FormContacto } from './FormContacto'
import { FormEvento } from './FormEvento'

export function PersonasTab({
  eventos,
  contactos,
  proyectos,
}: {
  eventos: EventoAgenda[]
  contactos: ContactoAgenda[]
  proyectos: ProyectoAgenda[]
}) {
  const t = useT()
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [editando, setEditando] = useState<ContactoAgenda | null>(null)
  const [creando, setCreando] = useState(false)
  const [nuevoEvento, setNuevoEvento] = useState<ContactoAgenda | null>(null)

  const contacto = contactos.find((c) => c.contactoId === seleccionado)
  if (contacto) {
    return (
      <>
        <DetalleContacto
          contacto={contacto}
          contactos={contactos}
          proyectos={proyectos}
          onVolver={() => setSeleccionado(null)}
          onEditar={() => setEditando(contacto)}
          onNuevoEvento={() => setNuevoEvento(contacto)}
        />
        {editando && <FormContacto inicial={editando} onCerrar={() => setEditando(null)} />}
        {nuevoEvento && (
          <FormEvento
            area="personas"
            contactoInicial={nuevoEvento.contactoId}
            contactos={contactos}
            proyectos={proyectos}
            onCerrar={() => setNuevoEvento(null)}
          />
        )}
      </>
    )
  }

  const filtrados = busqueda
    ? contactos.filter((c) => normalizar(c.nombre).includes(normalizar(busqueda)))
    : contactos

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
          <span className="text-white/40">
            <Icono nombre="lupa" />
          </span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t('agenda.buscar', 'Buscar')}
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          data-tut="agenda.personas.alta"
          onClick={() => setCreando(true)}
          className="rounded-xl px-3 py-2 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.personas }}
        >
          <Icono nombre="agregar" />
        </button>
      </div>

      {contactos.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">
          {t('agenda.vacio.contactos', 'Tu libreta está vacía. Agrega a tu gente.')}
        </p>
      ) : (
        <CarpetasPorEtiqueta
          items={filtrados}
          etiqueta={(c) => c.relacion ?? ''}
          clave={(c) => c.contactoId}
          sinEtiqueta={t('agenda.sinRelacion', 'Sin relación')}
        >
          {(c) => <FilaContacto contacto={c} eventos={eventos} onAbrir={() => setSeleccionado(c.contactoId)} />}
        </CarpetasPorEtiqueta>
      )}

      <BarraEjemplo area="personas" eventos={eventos} contactos={contactos} />

      {(creando || editando) && (
        <FormContacto
          inicial={editando}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

function FilaContacto({
  contacto,
  eventos,
  onAbrir,
}: {
  contacto: ContactoAgenda
  eventos: EventoAgenda[]
  onAbrir: () => void
}) {
  const t = useT()
  const faltan = contacto.cumple ? diasParaCumple(contacto.cumple) : null
  const pendientes = eventos.filter((e) => e.contactoId === contacto.contactoId && !e.hecho).length

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/10"
    >
      <AvatarContacto nombre={contacto.nombre} foto={contacto.foto} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{contacto.nombre}</span>
        <span className="block truncate text-[11px] text-white/50">
          {contacto.telefono ?? contacto.correo ?? contacto.relacion ?? ''}
        </span>
      </span>
      {pendientes > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
          {pendientes}
        </span>
      )}
      {faltan != null && faltan <= 30 && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${COLOR_AREA.personas}33` }}
        >
          <Icono nombre="pastel" />{' '}
          {faltan === 0 ? t('agenda.persona.hoy', 'hoy') : t('agenda.persona.enDias', '{n} d', { n: faltan })}
        </span>
      )}
    </button>
  )
}
