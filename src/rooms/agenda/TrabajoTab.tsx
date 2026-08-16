import { useState } from 'react'
import type { ContactoAgenda, EventoAgenda } from '../../core/data/db'
import { eventosAgendaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { Vacio } from '../_shared/ui'
import { Arrastrable, guardarOrden, porOrden, useArrastreFilas } from './arrastre'
import { BarraEjemplo } from './BarraEjemplo'
import { COLOR_AREA } from './constantes'
import { acento } from '../_shared/acento'
import { FormEvento } from './FormEvento'
import { Tablero } from './Tablero'
import { TarjetaEvento } from './TarjetaEvento'

type Vista = 'pendientes' | 'tablero'

const VISTAS: { id: Vista; es: string }[] = [
  { id: 'pendientes', es: 'Pendientes' },
  { id: 'tablero', es: 'Tablero' },
]

export function TrabajoTab({
  eventos,
  contactos,
}: {
  eventos: EventoAgenda[]
  contactos: ContactoAgenda[]
}) {
  const t = useT()
  const [vista, setVista] = useState<Vista>('pendientes')
  const [editando, setEditando] = useState<EventoAgenda | null>(null)
  const [creando, setCreando] = useState(false)

  // Sin fecha, con lo hecho al final. Dentro manda el puesto que dejó el
  // arrastre; lo que nunca se ha arrastrado sigue yendo por prioridad (1 alta …
  // 3 baja), que es como se ordenaba antes de poder moverlas a mano.
  const pendientes = porOrden(
    eventos.filter((e) => !e.fecha).sort((a, b) => (a.prioridad ?? 2) - (b.prioridad ?? 2)),
  ).sort((a, b) => Number(a.hecho ?? false) - Number(b.hecho ?? false))

  const arrastre = useArrastreFilas(
    pendientes,
    (e) => String(e.id),
    () => 'trabajo.pendientes',
    (nuevas) => void guardarOrden(nuevas, (id, orden) => eventosAgendaRepo.update(id, { orden })),
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <PestanasCarpeta
            items={VISTAS.map((v) => ({ id: v.id, labelEs: v.es }))}
            activo={vista}
            onCambio={setVista}
            prefijoClave="agenda.trabajo"
            color={COLOR_AREA.trabajo}
            variante="sub"
            nivel={2}
          />
        </div>
        <button
          type="button"
          data-tut="agenda.trabajo.alta"
          onClick={() => setCreando(true)}
          className="rounded-xl px-3 py-2 text-sm font-bold ui-accent-bg transition hover:brightness-110"
          style={acento(COLOR_AREA.trabajo)}
        >
          <Icono nombre="agregar" />
        </button>
      </div>

      {vista === 'pendientes' &&
        (pendientes.length === 0 ? (
          // El acento del área baja por la variable para que el CTA salga azul trabajo.
          <div style={acento(COLOR_AREA.trabajo)}>
            <Vacio
              icono="maletin"
              titulo={t('agenda.vacio.pendientes', 'Sin pendientes. Apunta lo que traes en la cabeza.')}
              cta={{ texto: t('agenda.trabajo.apuntar', 'Apuntar pendiente'), onClick: () => setCreando(true) }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map((ev) => (
              <Arrastrable key={ev.id} arrastre={arrastre} item={ev}>
                <TarjetaEvento ev={ev} contactos={contactos} onEditar={() => setEditando(ev)} />
              </Arrastrable>
            ))}
          </div>
        ))}

      {vista === 'tablero' && <Tablero eventos={eventos} onEditar={(ev) => setEditando(ev)} />}

      <BarraEjemplo area="trabajo" eventos={eventos} />

      {(creando || editando) && (
        <FormEvento
          area="trabajo"
          inicial={editando}
          contactos={contactos}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}
