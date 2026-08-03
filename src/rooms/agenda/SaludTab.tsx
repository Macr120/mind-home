import { useState } from 'react'
import type {
  ContactoAgenda,
  CuidadoMascota,
  EventoAgenda,
  Mascota,
  Medicamento,
  ProyectoAgenda,
} from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { BarraEjemplo } from './BarraEjemplo'
import { COLOR_AREA } from './constantes'
import { DetalleMascota } from './DetalleMascota'
import { FilaMedicamento } from './FilaMedicamento'
import { FormEvento } from './FormEvento'
import { FormMedicamento } from './FormMedicamento'
import { MascotasSection } from './MascotasSection'
import { TarjetaEvento } from './TarjetaEvento'

export function SaludTab({
  eventos,
  medicinas,
  contactos,
  proyectos,
  mascotas,
  cuidados,
}: {
  eventos: EventoAgenda[]
  medicinas: Medicamento[]
  contactos: ContactoAgenda[]
  proyectos: ProyectoAgenda[]
  mascotas: Mascota[]
  cuidados: CuidadoMascota[]
}) {
  const t = useT()
  const [editando, setEditando] = useState<EventoAgenda | null>(null)
  const [creando, setCreando] = useState(false)
  const [medicina, setMedicina] = useState<Medicamento | null>(null)
  const [creandoMedicina, setCreandoMedicina] = useState(false)
  const [mascotaAbierta, setMascotaAbierta] = useState<string | null>(null)

  const citas = eventos.filter((e) => e.fecha)

  const mascota = mascotas.find((m) => m.mascId === mascotaAbierta)
  if (mascota) {
    return (
      <DetalleMascota
        mascota={mascota}
        cuidados={cuidados}
        eventos={eventos}
        medicinas={medicinas}
        contactos={contactos}
        proyectos={proyectos}
        onVolver={() => setMascotaAbierta(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            <Icono nombre="hospital" /> {t('agenda.salud.citas', 'Citas médicas')}
          </p>
          <button
            type="button"
            data-tut="agenda.salud.alta"
            onClick={() => setCreando(true)}
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
          vacio={t('agenda.vacio.citas', 'Sin citas registradas.')}
        >
          {(ev) => (
            <TarjetaEvento
              ev={ev}
              contactos={contactos}
              proyectos={proyectos}
              mascotas={mascotas}
              onEditar={() => setEditando(ev)}
            />
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
            data-tut="agenda.salud.medicamentos"
            onClick={() => setCreandoMedicina(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
            style={{ background: COLOR_AREA.salud }}
          >
            <Icono nombre="agregar" /> {t('agenda.salud.nuevoMedicamento', 'Nuevo medicamento')}
          </button>
        </div>
        {medicinas.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/40">
            {t('agenda.vacio.medicamentos', 'Ningún tratamiento en curso.')}
          </p>
        ) : (
          <div className="space-y-2">
            {medicinas.map((m) => (
              <FilaMedicamento
                key={m.medId}
                medicina={m}
                mascota={mascotas.find((x) => x.mascId === m.mascotaId)}
                onEditar={() => setMedicina(m)}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-white/40">
          {t('agenda.med.avisoAppAbierta', 'Los recordatorios de toma suenan con la app abierta.')}
        </p>
      </section>

      <MascotasSection
        mascotas={mascotas}
        cuidados={cuidados}
        onAbrir={(m) => setMascotaAbierta(m.mascId)}
      />

      <BarraEjemplo area="salud" eventos={eventos} medicinas={medicinas} mascotas={mascotas} />

      {(creando || editando) && (
        <FormEvento
          area="salud"
          inicial={editando}
          contactos={contactos}
          proyectos={proyectos}
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
