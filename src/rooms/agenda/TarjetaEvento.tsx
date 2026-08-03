import { useState } from 'react'
import type { ContactoAgenda, EventoAgenda, Mascota, ProyectoAgenda } from '../../core/data/db'
import { deIso } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { COLOR_AREA, PRIORIDADES } from './constantes'
import { alternarHecho, borrarEvento } from './crear'
import { getEspecie } from './mascotas'
import { BotonBorrar } from './ui'

/** Fila de un evento o pendiente, igual en las tres secciones. */
export function TarjetaEvento({
  ev,
  contactos,
  proyectos,
  mascotas = [],
  onEditar,
}: {
  ev: EventoAgenda
  contactos: ContactoAgenda[]
  proyectos: ProyectoAgenda[]
  /** Solo lo pasa la lista de Salud: dentro de la ficha de la mascota sobra. */
  mascotas?: Mascota[]
  onEditar: () => void
}) {
  const t = useT()
  const [confirmando, setConfirmando] = useState(false)
  const contacto = contactos.find((c) => c.contactoId === ev.contactoId)
  const proyecto = proyectos.find((p) => p.proyId === ev.proyectoId)
  const mascota = mascotas.find((m) => m.mascId === ev.mascotaId)
  const prioridad = PRIORIDADES.find((p) => p.valor === (ev.prioridad ?? 2))

  const cuando = ev.fecha
    ? deIso(ev.fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="group flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
      <button
        type="button"
        onClick={() => void alternarHecho(ev)}
        title={t('agenda.palomear', 'Marcar como hecho')}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition ${
          ev.hecho ? 'border-transparent texto-cta' : 'border-white/25 text-transparent hover:border-white/50'
        }`}
        style={ev.hecho ? { background: COLOR_AREA[ev.area] } : undefined}
      >
        <Icono nombre="confirmar" />
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${ev.hecho ? 'text-white/40 line-through' : ''}`}>
          {ev.titulo}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50">
          {cuando && (
            <span>
              {cuando}
              {ev.hora ? ` · ${ev.hora}${ev.horaFin ? `–${ev.horaFin}` : ''}` : ''}
            </span>
          )}
          {!ev.fecha && ev.area === 'trabajo' && prioridad && (
            <span className="texto-vivo" style={vivo(prioridad.color)}>
              {t(prioridad.clave, prioridad.es)}
            </span>
          )}
          {(ev.con || contacto) && (
            <span className="truncate">
              <Icono nombre="perfil" /> {contacto?.nombre ?? ev.con}
            </span>
          )}
          {ev.lugar && (
            <span className="truncate">
              <Icono nombre="ubicacion" /> {ev.lugar}
            </span>
          )}
          {mascota && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: `${COLOR_AREA.salud}33` }}
            >
              <Icono nombre={getEspecie(mascota.especie).icono} /> {mascota.nombre}
            </span>
          )}
          {proyecto && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: `${proyecto.color ?? COLOR_AREA.trabajo}33` }}
            >
              {proyecto.nombre}
            </span>
          )}
        </div>
        {ev.notas && <p className="mt-1 line-clamp-2 text-xs text-white/40">{ev.notas}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
        {!confirmando && (
          <button
            type="button"
            onClick={onEditar}
            title={t('agenda.editar', 'Editar')}
            className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="editar" />
          </button>
        )}
        <BotonBorrar
          confirmando={confirmando}
          onPedir={() => setConfirmando(true)}
          onConfirmar={() => void borrarEvento(ev)}
          onCancelar={() => setConfirmando(false)}
        />
      </div>
    </div>
  )
}
