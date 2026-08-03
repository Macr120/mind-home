import { useState } from 'react'
import type { ContactoAgenda, EventoAgenda, ProyectoAgenda } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador, CarpetasPorEtiqueta } from '../_shared/Archivador'
import { BarraEjemplo } from './BarraEjemplo'
import { COLOR_AREA } from './constantes'
import { borrarProyecto } from './crear'
import { FormEvento } from './FormEvento'
import { FormProyecto } from './FormProyecto'
import { Tablero } from './Tablero'
import { TarjetaEvento } from './TarjetaEvento'
import { BotonBorrar, BTN_SEC } from './ui'

type Vista = 'pendientes' | 'agendado' | 'tablero' | 'proyectos'

const VISTAS: { id: Vista; es: string }[] = [
  { id: 'pendientes', es: 'Pendientes' },
  { id: 'agendado', es: 'Agendado' },
  { id: 'tablero', es: 'Tablero' },
  { id: 'proyectos', es: 'Proyectos' },
]

export function TrabajoTab({
  eventos,
  contactos,
  proyectos,
}: {
  eventos: EventoAgenda[]
  contactos: ContactoAgenda[]
  proyectos: ProyectoAgenda[]
}) {
  const t = useT()
  const [vista, setVista] = useState<Vista>('pendientes')
  const [editando, setEditando] = useState<EventoAgenda | null>(null)
  const [creando, setCreando] = useState(false)
  const [proyecto, setProyecto] = useState<ProyectoAgenda | null>(null)
  const [creandoProyecto, setCreandoProyecto] = useState(false)

  // Sin fecha primero por prioridad (1 alta … 3 baja) y lo hecho al final.
  const pendientes = eventos
    .filter((e) => !e.fecha)
    .sort((a, b) => Number(a.hecho ?? false) - Number(b.hecho ?? false) || (a.prioridad ?? 2) - (b.prioridad ?? 2))
  const agendados = eventos.filter((e) => e.fecha)
  const nombreProyecto = (id?: string) => proyectos.find((p) => p.proyId === id)?.nombre ?? ''

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex flex-1 gap-1 rounded-xl bg-white/5 p-1">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              data-tut={`agenda.trabajo.${v.id}`}
              onClick={() => setVista(v.id)}
              className={`flex-1 truncate rounded-lg px-1 py-1.5 text-xs font-semibold transition ${
                vista === v.id ? 'bg-white/15' : 'text-white/50 hover:bg-white/10'
              }`}
            >
              {t(`agenda.trabajo.${v.id}`, v.es)}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-tut="agenda.trabajo.alta"
          onClick={() => (vista === 'proyectos' ? setCreandoProyecto(true) : setCreando(true))}
          className="rounded-xl px-3 py-2 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.trabajo }}
        >
          <Icono nombre="agregar" />
        </button>
      </div>

      {vista === 'pendientes' &&
        (pendientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">
            {t('agenda.vacio.pendientes', 'Sin pendientes. Apunta lo que traes en la cabeza.')}
          </p>
        ) : (
          <div className="space-y-2">
            {pendientes.map((ev) => (
              <TarjetaEvento
                key={ev.id}
                ev={ev}
                contactos={contactos}
                proyectos={proyectos}
                onEditar={() => setEditando(ev)}
              />
            ))}
          </div>
        ))}

      {vista === 'agendado' && (
        <Archivador
          items={agendados}
          fecha={(e) => e.fecha!}
          clave={(e) => e.id!}
          resumen={(is) => `${is.filter((x) => x.hecho).length}/${is.length}`}
          vacio={t('agenda.vacio.agendado', 'Nada agendado todavía.')}
        >
          {(ev) => (
            <TarjetaEvento ev={ev} contactos={contactos} proyectos={proyectos} onEditar={() => setEditando(ev)} />
          )}
        </Archivador>
      )}

      {vista === 'tablero' && (
        <Tablero eventos={eventos} proyectos={proyectos} onEditar={(ev) => setEditando(ev)} />
      )}

      {vista === 'proyectos' && (
        <div className="space-y-3">
          {proyectos.map((p) => (
            <FilaProyecto key={p.proyId} proyecto={p} onEditar={() => setProyecto(p)} />
          ))}
          <CarpetasPorEtiqueta
            items={eventos.filter((e) => !e.hecho)}
            etiqueta={(e) => nombreProyecto(e.proyectoId)}
            clave={(e) => e.id!}
            sinEtiqueta={t('agenda.sinProyecto', 'Sin proyecto')}
          >
            {(ev) => (
              <TarjetaEvento ev={ev} contactos={contactos} proyectos={proyectos} onEditar={() => setEditando(ev)} />
            )}
          </CarpetasPorEtiqueta>
        </div>
      )}

      <BarraEjemplo area="trabajo" eventos={eventos} proyectos={proyectos} />

      {(creando || editando) && (
        <FormEvento
          area="trabajo"
          inicial={editando}
          contactos={contactos}
          proyectos={proyectos}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      )}
      {(creandoProyecto || proyecto) && (
        <FormProyecto
          inicial={proyecto}
          onCerrar={() => {
            setCreandoProyecto(false)
            setProyecto(null)
          }}
        />
      )}
    </div>
  )
}

function FilaProyecto({ proyecto, onEditar }: { proyecto: ProyectoAgenda; onEditar: () => void }) {
  const t = useT()
  const [confirmando, setConfirmando] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <span className="h-3 w-3 rounded-full" style={{ background: proyecto.color ?? COLOR_AREA.trabajo }} />
      <span className="flex-1 truncate text-sm font-semibold">{proyecto.nombre}</span>
      {!confirmando && (
        <button type="button" onClick={onEditar} className={BTN_SEC} title={t('agenda.editar', 'Editar')}>
          <Icono nombre="editar" />
        </button>
      )}
      <BotonBorrar
        confirmando={confirmando}
        onPedir={() => setConfirmando(true)}
        onConfirmar={() => void borrarProyecto(proyecto)}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  )
}
