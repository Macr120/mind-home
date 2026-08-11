import { useState, type FormEvent } from 'react'
import type {
  AreaAgenda,
  ContactoAgenda,
  EspecialidadMedica,
  EventoAgenda,
} from '../../core/data/db'
import { VACIO, mascotasRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { COLOR_AREA, PRIORIDADES } from './constantes'
import { guardarEvento } from './crear'
import { sumarMin } from './horas'
import { ESPECIALIDADES, inferirEspecialidad } from './salud'
import { Campo, INPUT, Modal } from './ui'

/**
 * Formulario único de evento para las tres secciones: cambian las etiquetas y
 * los campos de Trabajo, no la forma del dato.
 */
export function FormEvento({
  area,
  inicial,
  contactoInicial,
  mascotaInicial,
  contactos,
  onCerrar,
}: {
  area: AreaAgenda
  inicial?: EventoAgenda | null
  /** Persona ya elegida (alta desde su ficha). */
  contactoInicial?: string
  /** Mascota ya elegida (alta desde su ficha). */
  mascotaInicial?: string
  contactos: ContactoAgenda[]
  onCerrar: () => void
}) {
  const t = useT()
  // La lista se lee aquí y no por props: el formulario se abre desde cinco
  // sitios y solo Salud usa este campo.
  const mascotas = mascotasRepo.useAll() ?? VACIO
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? '')
  const [hora, setHora] = useState(inicial?.hora ?? '')
  const [horaFin, setHoraFin] = useState(inicial?.horaFin ?? '')
  const [lugar, setLugar] = useState(inicial?.lugar ?? '')
  const [con, setCon] = useState(inicial?.con ?? '')
  const [contactoId, setContactoId] = useState(inicial?.contactoId ?? contactoInicial ?? '')
  const [prioridad, setPrioridad] = useState(inicial?.prioridad ?? 2)
  // Al editar una cita anterior al campo, se precarga la misma que se le adivinó
  // en la lista: así guardar no la reclasifica a espaldas del usuario.
  const [especialidad, setEspecialidad] = useState<EspecialidadMedica>(
    inicial?.especialidad ?? inferirEspecialidad(inicial?.titulo, inicial?.con, inicial?.notas) ?? 'general',
  )
  const [notas, setNotas] = useState(inicial?.notas ?? '')

  // En Salud el destinatario es UNO de tres: tú, un prójimo o una mascota. Va en
  // un solo select con valor compuesto para que no puedan quedar los dos puestos.
  const projimos = contactos.filter((c) => c.alCuidado)
  const [paraQuien, setParaQuien] = useState(() => {
    const masc = inicial?.mascotaId ?? mascotaInicial
    if (masc) return `ms:${masc}`
    const ct = inicial?.contactoId ?? contactoInicial
    return ct ? `ct:${ct}` : ''
  })
  const deSalud = area === 'salud'
  const contactoSalud = paraQuien.startsWith('ct:') ? paraQuien.slice(3) : undefined
  const mascotaSalud = paraQuien.startsWith('ms:') ? paraQuien.slice(3) : undefined

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    await guardarEvento(inicial ?? null, {
      area,
      titulo: titulo.trim(),
      fecha: fecha || undefined,
      hora: fecha && hora ? hora : undefined,
      horaFin: fecha && hora && horaFin ? horaFin : undefined,
      lugar: lugar.trim() || undefined,
      con: con.trim() || undefined,
      contactoId: (deSalud ? contactoSalud : contactoId) || undefined,
      mascotaId: deSalud ? mascotaSalud || undefined : undefined,
      especialidad: deSalud ? especialidad : undefined,
      prioridad: area === 'trabajo' ? prioridad : undefined,
      notas: notas.trim() || undefined,
      hecho: inicial?.hecho,
      hechoEn: inicial?.hechoEn,
    })
    onCerrar()
  }

  const etiquetaTitulo =
    area === 'salud'
      ? t('agenda.form.motivo', 'Motivo de la cita')
      : area === 'personas'
        ? t('agenda.form.plan', 'Plan o recordatorio')
        : t('agenda.form.asunto', 'Asunto')

  const etiquetaCon =
    area === 'salud' ? t('agenda.form.medico', 'Médico') : t('agenda.form.con', 'Con quién')

  return (
    <Modal
      titulo={inicial ? t('agenda.editarEvento', 'Editar') : t('agenda.nuevoEvento', 'Nuevo')}
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-3">
        <Campo etiqueta={etiquetaTitulo}>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus className={INPUT} />
        </Campo>

        <div className="grid grid-cols-3 gap-2">
          <Campo etiqueta={t('agenda.form.fecha', 'Fecha')}>
            <input
              type="date"
              value={fecha}
              required={area !== 'trabajo'}
              onChange={(e) => setFecha(e.target.value)}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('agenda.form.hora', 'Hora')}>
            <input
              type="time"
              value={hora}
              disabled={!fecha}
              onChange={(e) => {
                setHora(e.target.value)
                if (e.target.value && !horaFin) setHoraFin(sumarMin(e.target.value, 60))
              }}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('agenda.form.horaFin', 'Termina')}>
            <input
              type="time"
              value={horaFin}
              disabled={!hora}
              onChange={(e) => setHoraFin(e.target.value)}
              className={INPUT}
            />
          </Campo>
        </div>

        {area === 'trabajo' && !fecha && (
          <p className="text-xs text-white/40">
            {t('agenda.form.notaSinFecha', 'Sin fecha se queda en tus pendientes, fuera del calendario.')}
          </p>
        )}
        {fecha && !hora && (
          <p className="text-xs text-white/40">
            {t('agenda.form.notaSinHora', 'Sin hora aparece en el día, pero no puede avisarte.')}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={etiquetaCon}>
            <input value={con} onChange={(e) => setCon(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.form.lugar', 'Lugar')}>
            <input value={lugar} onChange={(e) => setLugar(e.target.value)} className={INPUT} />
          </Campo>
        </div>

        {!deSalud && contactos.length > 0 && (
          <Campo etiqueta={t('agenda.form.contacto', 'Persona de tu libreta')}>
            <select value={contactoId} onChange={(e) => setContactoId(e.target.value)} className={INPUT}>
              <option value="">{t('agenda.form.ninguno', '— Ninguna —')}</option>
              {contactos.map((c) => (
                <option key={c.contactoId} value={c.contactoId}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        {deSalud && (
          <div className="grid grid-cols-2 gap-2">
            <Campo etiqueta={t('agenda.form.especialidad', 'Especialidad')}>
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value as EspecialidadMedica)}
                className={INPUT}
              >
                {ESPECIALIDADES.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.emoji} {t(esp.clave, esp.es)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta={t('agenda.form.paraQuien', '¿Para quién es?')}>
              <select
                value={paraQuien}
                onChange={(e) => setParaQuien(e.target.value)}
                className={INPUT}
              >
                <option value="">{t('agenda.form.paraMi', '— Para mí —')}</option>
                {projimos.map((c) => (
                  <option key={c.contactoId} value={`ct:${c.contactoId}`}>
                    {c.nombre}
                  </option>
                ))}
                {mascotas.map((m) => (
                  <option key={m.mascId} value={`ms:${m.mascId}`}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        )}

        {area === 'trabajo' && (
          <Campo etiqueta={t('agenda.form.prioridad', 'Prioridad')}>
            <select value={prioridad} onChange={(e) => setPrioridad(Number(e.target.value))} className={INPUT}>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {t(p.clave, p.es)}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo etiqueta={t('agenda.form.notas', 'Notas')}>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className={INPUT} />
        </Campo>

        <button
          type="submit"
          className="w-full rounded-lg py-2.5 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA[area] }}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </form>
    </Modal>
  )
}
