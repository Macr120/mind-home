import { useState } from 'react'
import type { Cuidado } from '../../core/data/db'
import { deIso } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'

/** Mismo formato corto que la ficha de la mascota («20 ago»). */
const fechaCorta = (iso: string) =>
  deIso(iso).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })
import { cuidadosRepo } from '../../core/data/repository'
import { Icono } from '../../core/ui/iconos/Icono'
import { Arrastrable, guardarOrden, porOrden, useArrastreFilas } from './arrastre'
import { COLOR_AREA } from './constantes'
import { acento } from '../_shared/acento'
import { borrarCuidadoPersona, completarCuidadoPersona, reactivarCuidadoPersona } from './crear'
import { FormCuidadoPersona } from './FormCuidadoPersona'
import { diasHasta, textoPeriodo } from './mascotas'
import { getCuidadoPersona } from './salud'
import { BotonBorrar } from './ui'

/**
 * Los cuidados que se repiten, tuyos o de un prójimo: el chequeo anual, la vacuna
 * de la gripe, los análisis cada seis meses. Es el mismo trato que reciben los de
 * las mascotas, porque es la misma clase de cosa.
 */
export function CuidadosSection({
  cuidados,
  contactoId,
  nombreDueno,
}: {
  /** Ya filtrados a quien toca. */
  cuidados: Cuidado[]
  /** `contactoId` del prójimo; vacío = son tuyos. */
  contactoId?: string
  nombreDueno: string | null
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Cuidado | null>(null)

  // Los archivados van siempre debajo, y el arrastre no cruza de un grupo al
  // otro: lo que se reordena a mano es el turno dentro de cada uno.
  const activos = porOrden(cuidados.filter((c) => c.activo).sort((a, b) => a.fecha.localeCompare(b.fecha)))
  const archivados = porOrden(cuidados.filter((c) => !c.activo))
  const arrastre = useArrastreFilas(
    [...activos, ...archivados],
    (c) => c.cuidadoId,
    (c) => (c.activo ? 'cuidados.activos' : 'cuidados.archivados'),
    (nuevas) => void guardarOrden(nuevas, (id, orden) => cuidadosRepo.update(id, { orden })),
  )

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          <Icono nombre="vacuna" /> {t('agenda.salud.cuidados', 'Cuidados')}
        </p>
        <button
          type="button"
          data-tut="agenda.salud.cuidados"
          onClick={() => setCreando(true)}
          className="rounded-xl px-3 py-1.5 text-xs font-bold ui-accent-bg transition hover:brightness-110"
          style={acento(COLOR_AREA.salud)}
        >
          <Icono nombre="agregar" /> {t('agenda.salud.nuevoCuidado', 'Nuevo cuidado')}
        </button>
      </div>

      {activos.length === 0 && archivados.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/40">
          {t('agenda.vacio.cuidadosPersona', 'Sin cuidados. Aquí van los chequeos y vacunas que se repiten.')}
        </p>
      ) : (
        <div className="space-y-2">
          {[...activos, ...archivados].map((c) => (
            <Arrastrable key={c.cuidadoId} arrastre={arrastre} item={c}>
              <FilaCuidado cuidado={c} nombreDueno={nombreDueno} onEditar={() => setEditando(c)} />
            </Arrastrable>
          ))}
        </div>
      )}

      {(creando || editando) && (
        <FormCuidadoPersona
          contactoId={contactoId}
          nombreDueno={nombreDueno}
          inicial={editando}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      )}
    </section>
  )
}

function FilaCuidado({
  cuidado,
  nombreDueno,
  onEditar,
}: {
  cuidado: Cuidado
  nombreDueno: string | null
  onEditar: () => void
}) {
  const t = useT()
  const [borrando, setBorrando] = useState(false)
  const def = getCuidadoPersona(cuidado.tipo)
  const faltan = diasHasta(cuidado.fecha)
  const vencido = cuidado.activo && faltan < 0

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
      <span className="shrink-0 text-lg">
        <Icono nombre={def.icono} />
      </span>
      <button type="button" onClick={onEditar} className="min-w-0 flex-1 text-start">
        <span className={`block truncate text-sm font-semibold ${cuidado.activo ? '' : 'text-white/40'}`}>
          {cuidado.titulo}
        </span>
        <span className="block truncate text-[11px] text-white/50">
          {cuidado.activo
            ? `${fechaCorta(cuidado.fecha)} · ${textoPeriodo(cuidado.cadaMeses, t)}`
            : t('agenda.cuidado.archivado', 'Hecho, sin repetición')}
          {cuidado.ultima
            ? ` · ${t('agenda.cuidado.ultima', 'Última vez: {f}', { f: fechaCorta(cuidado.ultima) })}`
            : ''}
        </span>
      </button>

      {cuidado.activo && faltan <= 7 && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            vencido ? 'bg-red-500/20 text-red-300' : ''
          }`}
          style={vencido ? undefined : { background: `${COLOR_AREA.salud}33` }}
        >
          {vencido
            ? t('agenda.cuidado.vencido', 'vencido')
            : faltan === 0
              ? t('agenda.persona.hoy', 'hoy')
              : t('agenda.persona.enDias', '{n} d', { n: faltan })}
        </span>
      )}

      {cuidado.activo ? (
        <button
          type="button"
          onClick={() => void completarCuidadoPersona(cuidado, nombreDueno)}
          title={t('agenda.cuidado.yaLoHice', 'Ya lo hice')}
          className="shrink-0 rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-emerald-300"
        >
          <Icono nombre="confirmar" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void reactivarCuidadoPersona(cuidado, nombreDueno)}
          title={t('agenda.cuidado.reactivar', 'Volver a programar')}
          className="shrink-0 rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10"
        >
          <Icono nombre="restaurar" />
        </button>
      )}

      <BotonBorrar
        confirmando={borrando}
        onPedir={() => setBorrando(true)}
        onConfirmar={() => void borrarCuidadoPersona(cuidado)}
        onCancelar={() => setBorrando(false)}
      />
    </div>
  )
}
