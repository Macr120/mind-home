import { useMemo, useState } from 'react'
import type {
  ContactoAgenda,
  CuidadoMascota,
  EventoAgenda,
  Mascota,
  Medicamento,
} from '../../core/data/db'
import {
  VACIO,
  ajustesCicloRepo,
  cuidadosRepo,
  diasCicloRepo,
  eventosAgendaRepo,
  medicamentosRepo,
} from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { CarpetasPorEtiqueta } from '../_shared/Archivador'
import { Arrastrable, guardarOrden, porOrden, useArrastreFilas } from './arrastre'
import { BarraEjemplo } from './BarraEjemplo'
import { CicloSection } from './CicloSection'
import { COLOR_AREA } from './constantes'
import { acento } from '../_shared/acento'
import { CuidadosSection } from './CuidadosSection'
import { DetalleMascota } from './DetalleMascota'
import { DetalleProjimo } from './DetalleProjimo'
import { FilaMedicamento } from './FilaMedicamento'
import { FormEvento } from './FormEvento'
import { FormMedicamento } from './FormMedicamento'
import { MascotasSection } from './MascotasSection'
import { ProjimosSection } from './ProjimosSection'
import { getEspecialidad, inferirEspecialidad } from './salud'
import { TarjetaEvento } from './TarjetaEvento'

type SubSalud = 'yo' | 'projimos' | 'mascotas'

const SUBS: { id: SubSalud; icono: NombreIcono; labelEs: string }[] = [
  { id: 'yo', icono: 'estetoscopio', labelEs: 'Tú' },
  { id: 'projimos', icono: 'companeros', labelEs: 'Prójimos' },
  { id: 'mascotas', icono: 'animal', labelEs: 'Mascotas' },
]

/**
 * Salud en tres submenús: lo tuyo, las personas a tu cuidado y las mascotas.
 *
 * Antes era una sola página con las tres secciones apiladas, y con los cuidados y
 * el ciclo encima no había forma de encontrar nada. Los prójimos NO son una
 * libreta nueva: son los contactos de Personas marcados con «A mi cuidado».
 */
export function SaludTab({
  eventos,
  medicinas,
  contactos,
  mascotas,
  cuidados,
}: {
  eventos: EventoAgenda[]
  medicinas: Medicamento[]
  contactos: ContactoAgenda[]
  mascotas: Mascota[]
  cuidados: CuidadoMascota[]
}) {
  const t = useT()
  const [sub, setSub] = useState<SubSalud>('yo')
  const [editando, setEditando] = useState<EventoAgenda | null>(null)
  const [creando, setCreando] = useState(false)
  const [medicina, setMedicina] = useState<Medicamento | null>(null)
  const [creandoMedicina, setCreandoMedicina] = useState(false)
  const [mascotaAbierta, setMascotaAbierta] = useState<string | null>(null)
  const [projimoAbierto, setProjimoAbierto] = useState<string | null>(null)

  // Estas tres solo las usa Salud, así que se leen aquí en vez de bajarlas por
  // props desde AgendaApp atravesando las otras dos pestañas.
  const cuidadosPersona = cuidadosRepo.useAll() ?? VACIO
  const diasCiclo = diasCicloRepo.useAll() ?? VACIO
  const ajustesCiclo = (ajustesCicloRepo.useAll() ?? VACIO)[0] ?? null

  const projimos = useMemo(() => contactos.filter((c) => c.alCuidado), [contactos])

  // Lo «tuyo» es lo que no lleva el nombre de nadie más. Se calcula aquí arriba,
  // antes de las fichas, porque su arrastre son hooks y no pueden quedar detrás
  // de un `return`.
  const citasMias = porOrden(eventos.filter((e) => e.fecha && !e.mascotaId && !e.contactoId))
  const medicinasMias = porOrden(medicinas.filter((m) => !m.mascotaId && !m.contactoId))
  const cuidadosMios = cuidadosPersona.filter((c) => !c.contactoId)

  /** Carpeta en la que cae la cita: es también su lista para el arrastre. */
  const especialidadDe = (e: EventoAgenda) => {
    const esp = getEspecialidad(e.especialidad ?? inferirEspecialidad(e.titulo, e.con, e.notas))
    return t(esp.clave, esp.es)
  }

  const arrastreCitas = useArrastreFilas(
    citasMias,
    (e) => String(e.id),
    especialidadDe,
    (nuevas) => void guardarOrden(nuevas, (id, orden) => eventosAgendaRepo.update(id, { orden })),
  )
  const arrastreMedicinas = useArrastreFilas(
    medicinasMias,
    (m) => String(m.id),
    () => 'salud.medicamentos',
    (nuevas) => void guardarOrden(nuevas, (id, orden) => medicamentosRepo.update(id, { orden })),
  )

  const mascota = mascotas.find((m) => m.mascId === mascotaAbierta)
  if (mascota) {
    return (
      <DetalleMascota
        mascota={mascota}
        cuidados={cuidados}
        eventos={eventos}
        medicinas={medicinas}
        contactos={contactos}
        onVolver={() => setMascotaAbierta(null)}
      />
    )
  }

  const projimo = projimos.find((c) => c.contactoId === projimoAbierto)
  if (projimo) {
    return (
      <DetalleProjimo
        projimo={projimo}
        eventos={eventos}
        medicinas={medicinas}
        cuidados={cuidadosPersona}
        contactos={contactos}
        mascotas={mascotas}
        onVolver={() => setProjimoAbierto(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {SUBS.map((s) => (
          <button
            key={s.id}
            data-tut={`agenda.salud.sub.${s.id}`}
            onClick={() => setSub(s.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
              sub === s.id ? 'ui-accent-bg' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={sub === s.id ? acento(COLOR_AREA.salud) : undefined}
          >
            <Icono nombre={s.icono} /> {t(`agenda.salud.sub.${s.id}`, s.labelEs)}
            {s.id === 'projimos' && projimos.length > 0 && (
              <span className="ms-1 opacity-60">{projimos.length}</span>
            )}
          </button>
        ))}
      </div>

      {sub === 'yo' && (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                <Icono nombre="hospital" /> {t('agenda.salud.citas', 'Citas médicas')}
              </p>
              <button
                type="button"
                data-tut="agenda.salud.alta"
                onClick={() => setCreando(true)}
                className="rounded-xl px-3 py-1.5 text-xs font-bold ui-accent-bg transition hover:brightness-110"
                style={acento(COLOR_AREA.salud)}
              >
                <Icono nombre="agregar" /> {t('agenda.salud.nuevaCita', 'Nueva cita')}
              </button>
            </div>
            {/* Por especialidad: de un vistazo se ve cuánto hace del dentista.
                Las citas anteriores al campo la sacan de su texto, para que no
                caigan las quince juntas en «Otra». */}
            <CarpetasPorEtiqueta
              items={citasMias}
              etiqueta={especialidadDe}
              clave={(e) => e.id!}
              sinEtiqueta={t('agenda.esp.otra', 'Otra')}
            >
              {(ev) => (
                <Arrastrable arrastre={arrastreCitas} item={ev}>
                  <TarjetaEvento
                    ev={ev}
                    contactos={contactos}
                    mascotas={mascotas}
                    onEditar={() => setEditando(ev)}
                  />
                </Arrastrable>
              )}
            </CarpetasPorEtiqueta>
          </section>

          <CuidadosSection cuidados={cuidadosMios} nombreDueno={null} />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                <Icono nombre="pastilla" /> {t('agenda.salud.medicamentos', 'Medicamentos')}
              </p>
              <button
                type="button"
                data-tut="agenda.salud.medicamentos"
                onClick={() => setCreandoMedicina(true)}
                className="rounded-xl px-3 py-1.5 text-xs font-bold ui-accent-bg transition hover:brightness-110"
                style={acento(COLOR_AREA.salud)}
              >
                <Icono nombre="agregar" /> {t('agenda.salud.nuevoMedicamento', 'Nuevo medicamento')}
              </button>
            </div>
            {medicinasMias.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/40">
                {t('agenda.vacio.medicamentos', 'Ningún tratamiento en curso.')}
              </p>
            ) : (
              <div className="space-y-2">
                {medicinasMias.map((m) => (
                  <Arrastrable key={m.medId} arrastre={arrastreMedicinas} item={m}>
                    <FilaMedicamento medicina={m} onEditar={() => setMedicina(m)} />
                  </Arrastrable>
                ))}
              </div>
            )}
            <p className="text-xs text-white/40">
              {t('agenda.med.avisoAppAbierta', 'Los recordatorios de toma suenan con la app abierta.')}
            </p>
          </section>

          <CicloSection ajustes={ajustesCiclo} dias={diasCiclo} />
        </>
      )}

      {sub === 'projimos' && (
        <ProjimosSection
          projimos={projimos}
          eventos={eventos}
          cuidados={cuidadosPersona}
          onAbrir={(c) => setProjimoAbierto(c.contactoId)}
        />
      )}

      {sub === 'mascotas' && (
        <MascotasSection
          mascotas={mascotas}
          cuidados={cuidados}
          onAbrir={(m) => setMascotaAbierta(m.mascId)}
        />
      )}

      <BarraEjemplo area="salud" eventos={eventos} medicinas={medicinas} mascotas={mascotas} />

      {(creando || editando) && (
        <FormEvento
          area="salud"
          inicial={editando}
          contactos={contactos}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      )}
      {(creandoMedicina || medicina) && (
        <FormMedicamento
          inicial={medicina}
          onCerrar={() => {
            setCreandoMedicina(false)
            setMedicina(null)
          }}
        />
      )}
    </div>
  )
}
