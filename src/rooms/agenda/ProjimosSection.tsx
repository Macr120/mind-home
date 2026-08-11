import { useState } from 'react'
import type { ContactoAgenda, Cuidado, EventoAgenda } from '../../core/data/db'
import { contactosAgendaRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Arrastrable, guardarOrden, porOrden, useArrastreFilas } from './arrastre'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA } from './constantes'
import { FormContacto } from './FormContacto'
import { diasHasta } from './mascotas'

/**
 * Las personas a tu cuidado. NO son una libreta aparte: son los contactos de la
 * pestaña Personas marcados con «A mi cuidado», para que mamá sea un solo
 * registro en toda la app y no haya dos fichas que mantener a la par.
 *
 * «Nuevo prójimo» (mismo botón que «Nueva mascota») da de alta un contacto ya
 * marcado, para no obligar a pasar primero por Personas.
 */
export function ProjimosSection({
  projimos,
  eventos,
  cuidados,
  onAbrir,
}: {
  projimos: ContactoAgenda[]
  eventos: EventoAgenda[]
  cuidados: Cuidado[]
  onAbrir: (c: ContactoAgenda) => void
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)

  const enOrden = porOrden(projimos)
  const arrastre = useArrastreFilas(
    enOrden,
    (c) => c.contactoId,
    () => 'salud.projimos',
    (nuevas) => void guardarOrden(nuevas, (id, orden) => contactosAgendaRepo.update(id, { orden })),
  )

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          <Icono nombre="companeros" /> {t('agenda.salud.sub.projimos', 'Prójimos')}
        </p>
        <button
          type="button"
          data-tut="agenda.salud.projimos"
          onClick={() => setCreando(true)}
          className="rounded-xl px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.salud }}
        >
          <Icono nombre="agregar" /> {t('agenda.salud.nuevoProjimo', 'Nuevo prójimo')}
        </button>
      </div>

      {projimos.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/40">
          {t(
            'agenda.vacio.projimos',
            'Nadie a tu cuidado todavía. Agrega uno nuevo o marca «A mi cuidado» en un contacto de la pestaña Personas: aparecerá aquí con sus citas, sus medicamentos y sus cuidados.',
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {enOrden.map((c) => (
            <Arrastrable key={c.contactoId} arrastre={arrastre} item={c}>
              <FilaProjimo
                projimo={c}
                citas={eventos.filter((e) => e.contactoId === c.contactoId && e.fecha && !e.hecho)}
                cuidados={cuidados.filter((x) => x.contactoId === c.contactoId && x.activo)}
                onAbrir={() => onAbrir(c)}
              />
            </Arrastrable>
          ))}
        </div>
      )}

      {creando && <FormContacto alCuidadoInicial onCerrar={() => setCreando(false)} />}
    </section>
  )
}

function FilaProjimo({
  projimo,
  citas,
  cuidados,
  onAbrir,
}: {
  projimo: ContactoAgenda
  citas: EventoAgenda[]
  cuidados: Cuidado[]
  onAbrir: () => void
}) {
  const t = useT()
  // Lo PRÓXIMO, venga de donde venga: una cita y un cuidado compiten por el chip.
  // Se descarta lo que ya pasó, o una consulta de hace meses sin palomear le
  // ganaría el sitio a la revisión de la semana que viene.
  const hoy = fechaLocalISO()
  const candidatos = [
    ...citas.map((c) => ({ fecha: c.fecha!, titulo: c.titulo })),
    ...cuidados.map((c) => ({ fecha: c.fecha, titulo: c.titulo })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))
  // Si no queda nada por delante, se enseña lo vencido MÁS RECIENTE (lo último
  // que se le pasó), que es lo que hay que atender.
  const porVenir = candidatos.filter((x) => x.fecha >= hoy)
  const proximo = porVenir[0] ?? candidatos[candidatos.length - 1]
  const faltan = proximo ? diasHasta(proximo.fecha) : null
  const vencido = faltan != null && faltan < 0

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/10"
    >
      <AvatarContacto nombre={projimo.nombre} foto={projimo.foto} icono="companeros" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{projimo.nombre}</span>
        <span className="block truncate text-[11px] text-white/50">
          {projimo.relacion || t('agenda.projimo.aMiCuidado', 'A mi cuidado')}
        </span>
      </span>
      {proximo && faltan != null && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            vencido ? 'bg-red-500/20 text-red-300' : ''
          }`}
          style={vencido ? undefined : { background: `${COLOR_AREA.salud}33` }}
        >
          {proximo.titulo}
          {' · '}
          {vencido
            ? t('agenda.cuidado.vencido', 'vencido')
            : faltan === 0
              ? t('agenda.persona.hoy', 'hoy')
              : t('agenda.persona.enDias', '{n} d', { n: faltan })}
        </span>
      )}
      <span className="shrink-0 text-white/30">
        <Icono nombre="siguiente" />
      </span>
    </button>
  )
}
