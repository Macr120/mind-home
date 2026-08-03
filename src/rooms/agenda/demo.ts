/**
 * Año demo de la agenda: los compromisos reales de Pep@ en sus tres áreas —
 * trabajo (turnos, parciales, el proyecto semestral), salud (nutrición, las
 * seis fisios del bache, Laika) y personas (cafés, cumpleaños, la familia).
 *
 * Al final llama a `reconciliarAgenda()` a propósito: así las rutinas que la
 * agenda proyecta al calendario quedan ya en su PUNTO FIJO. Sin eso, la primera
 * vez que el visitante abriera la Agenda la reconciliación intentaría escribir
 * y chocaría con el guard de solo lectura del demo.
 */
import {
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
  proyectosAgendaRepo,
} from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { reconciliarAgenda } from './calendario'
import { DEMO_AGENDA } from './demo.data'
import { nuevoId } from './ids'

/** Años de nacimiento de los 8 contactos, por orden del contenido generado. */
const NACIMIENTOS = [1968, 1971, 1998, 1999, 2000, 1996, 1994, 2001]
/** Offsets (respecto a hoy) donde cae el cumpleaños de cada contacto. */
const DIAS_CUMPLE = [12, -80, 45, -140, 3, 200, -210, 120]

export async function construirDemoAgenda(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_AGENDA[ctx.idioma]
  const es = ctx.idioma === 'es'
  const r = rngDemo(31081934)
  const enHora = (off: number, hora = '09:00') => `${ctx.fecha(off)}T${hora}:00.000Z`

  // ── Proyectos: el semestral vivo, la web de la cafetería ya cerrada ──────
  const proyFisica = nuevoId('py')
  const proyWeb = nuevoId('py')
  await proyectosAgendaRepo.bulkAdd([
    {
      proyId: proyFisica,
      nombre: datos.proyectos.fisica,
      color: '#3b82f6',
      activo: true,
      creadoEn: enHora(-300, '10:00'),
    },
    {
      proyId: proyWeb,
      nombre: datos.proyectos.cafeteria,
      color: '#f472b6',
      activo: false,
      creadoEn: enHora(-330, '10:00'),
    },
  ])

  // ── Contactos: el círculo de Pep@, con sus cumpleaños repartidos ─────────
  const contactoIds = datos.contactos.map(() => nuevoId('ct'))
  await contactosAgendaRepo.bulkAdd(
    datos.contactos.map((c, i) => {
      // El cumple guarda el año de NACIMIENTO: de ahí sale la edad en la app.
      const mmdd = ctx.fecha(DIAS_CUMPLE[i % DIAS_CUMPLE.length]).slice(5)
      return {
        contactoId: contactoIds[i],
        nombre: c.nombre,
        relacion: c.relacion,
        cumple: `${NACIMIENTOS[i % NACIMIENTOS.length]}-${mmdd}`,
        ...(i % 3 === 0 ? { horaCumple: '08:00' } : {}),
        ...(i % 2 === 0 ? { telefono: `55 ${1000 + i * 137} ${2000 + i * 311}` } : {}),
        creadoEn: enHora(-360 + i * 9, '11:00'),
      }
    }),
  )
  const contactoPorNombre = new Map(datos.contactos.map((c, i) => [c.nombre, contactoIds[i]]))

  // ── Laika: la gata que llegó en el mes 3, con sus cuidados al día ────────
  const mascId = nuevoId('ms')
  const fotoLaika = await ctx.foto('anecdotario/laika')
  await mascotasRepo.add({
    mascId,
    nombre: 'Laika',
    especie: 'gato',
    raza: es ? 'Criolla' : 'Domestic shorthair',
    nacimiento: ctx.fecha(-420),
    peso: 3.4,
    veterinario: es ? 'Clínica Vetamigos' : 'Vetfriends Clinic',
    telefono: '55 4412 8890',
    ...(fotoLaika ? { foto: fotoLaika } : {}),
    creadoEn: enHora(-304, '12:00'),
  })
  await cuidadosMascotaRepo.bulkAdd([
    {
      cuidadoId: nuevoId('cu'),
      mascotaId: mascId,
      tipo: 'vacuna',
      titulo: es ? 'Vacuna anual' : 'Annual shot',
      fecha: ctx.fecha(56),
      hora: '10:00',
      cadaMeses: 12,
      ultima: ctx.fecha(-309),
      activo: true,
      creadoEn: enHora(-304, '12:10'),
    },
    {
      cuidadoId: nuevoId('cu'),
      mascotaId: mascId,
      tipo: 'desparasitacion',
      titulo: es ? 'Desparasitación' : 'Deworming',
      fecha: ctx.fecha(55),
      hora: '09:00',
      cadaMeses: 3,
      ultima: ctx.fecha(-35),
      activo: true,
      creadoEn: enHora(-304, '12:12'),
    },
    {
      cuidadoId: nuevoId('cu'),
      mascotaId: mascId,
      tipo: 'bano',
      titulo: es ? 'Baño y cepillado' : 'Bath and brushing',
      fecha: ctx.fecha(10),
      hora: '12:00',
      cadaMeses: 1,
      ultima: ctx.fecha(-20),
      activo: true,
      creadoEn: enHora(-300, '12:15'),
    },
  ])

  // ── Medicamentos: la vitamina de siempre y el antiinflamatorio del bache ─
  await medicamentosRepo.bulkAdd([
    {
      medId: nuevoId('md'),
      nombre: es ? 'Vitamina D' : 'Vitamin D',
      dosis: '1000 UI',
      horas: ['09:00'],
      dias: [],
      fechaInicio: ctx.fecha(-250),
      activo: true,
      creadoEn: enHora(-250, '09:30'),
    },
    {
      medId: nuevoId('md'),
      nombre: es ? 'Antiinflamatorio' : 'Anti-inflammatory',
      dosis: '400 mg',
      horas: ['08:00', '20:00'],
      dias: [],
      fechaInicio: ctx.fecha(-184),
      fechaFin: ctx.fecha(-163),
      notas: es ? 'Por la rodilla, mientras duró la lesión.' : 'For the knee, while the injury lasted.',
      activo: false,
      creadoEn: enHora(-184, '18:00'),
    },
  ])

  // ── Eventos del año: pasados casi todos hechos, y unos cuantos por venir ─
  type Evento = Parameters<typeof eventosAgendaRepo.bulkAdd>[0][number]
  const eventos: Evento[] = []

  const agendar = (
    area: 'trabajo' | 'salud' | 'personas',
    dia: number,
    titulo: string,
    extra: Partial<Evento> = {},
  ) => {
    const pasado = dia < 0
    // Alguna cita pasada sin palomear: una agenda perfecta no la tiene nadie.
    const hecho = pasado && r() < 0.88
    eventos.push({
      evId: nuevoId('ag'),
      area,
      titulo,
      fecha: ctx.fecha(dia),
      ...extra,
      ...(hecho ? { hecho: true, hechoEn: ctx.fecha(dia) } : {}),
      creadoEn: enHora(dia - 3 - Math.floor(r() * 5), '08:30'),
    })
  }

  // Solo lo que habla del proyecto semestral cuelga de él: ligarlo al azar
  // acababa etiquetando turnos de la cafetería como trabajo de la carrera.
  const delProyecto = (titulo: string) =>
    /proyecto|semestral|laboratorio|lab\b|p[óo]ster|semester|project|poster/i.test(titulo)

  for (const e of datos.trabajo) {
    agendar('trabajo', e.dia, e.titulo, {
      hora: ['09:00', '10:00', '11:00', '16:00'][Math.floor(r() * 4)],
      prioridad: (Math.floor(r() * 3) + 1) as 1 | 2 | 3,
      ...(e.lugar ? { lugar: e.lugar } : {}),
      ...(e.dia > -300 && delProyecto(e.titulo) ? { proyectoId: proyFisica } : {}),
    })
  }
  for (const e of datos.salud) {
    agendar('salud', e.dia, e.titulo, {
      hora: ['08:30', '12:00', '17:00', '18:30'][Math.floor(r() * 4)],
      ...(e.lugar ? { lugar: e.lugar } : {}),
    })
  }
  for (const e of datos.personas) {
    agendar('personas', e.dia, e.titulo, {
      hora: ['13:30', '18:00', '20:00', '21:00'][Math.floor(r() * 4)],
      con: e.con,
      ...(contactoPorNombre.has(e.con) ? { contactoId: contactoPorNombre.get(e.con) } : {}),
    })
  }

  // Bandeja de pendientes (sin fecha): dos ya en curso para el tablero kanban.
  datos.pendientes.forEach((titulo, i) => {
    eventos.push({
      evId: nuevoId('ag'),
      area: 'trabajo',
      titulo,
      prioridad: ((i % 3) + 1) as 1 | 2 | 3,
      ...(i < 2 ? { enCurso: true } : {}),
      ...(delProyecto(titulo) ? { proyectoId: proyFisica } : {}),
      creadoEn: enHora(-20 + i * 3, '09:15'),
    })
  })

  // Lo que viene: la agenda no se acaba hoy.
  const proximos: [number, 'trabajo' | 'salud' | 'personas', string, string][] = es
    ? [
        [2, 'trabajo', 'Turno extra en la cafetería', '07:00'],
        [4, 'personas', 'Café con la familia', '18:00'],
        [9, 'salud', 'Revisión de la rodilla', '11:00'],
        [16, 'trabajo', 'Entrega del proyecto semestral', '10:00'],
      ]
    : [
        [2, 'trabajo', 'Extra shift at the coffee shop', '07:00'],
        [4, 'personas', 'Coffee with the family', '18:00'],
        [9, 'salud', 'Knee check-up', '11:00'],
        [16, 'trabajo', 'Semester project hand-in', '10:00'],
      ]
  for (const [dia, area, titulo, hora] of proximos) {
    eventos.push({
      evId: nuevoId('ag'),
      area,
      titulo,
      fecha: ctx.fecha(dia),
      hora,
      prioridad: 2,
      ...(area === 'trabajo' && dia === 16 ? { proyectoId: proyFisica } : {}),
      creadoEn: enHora(-6, '09:00'),
    })
  }

  await eventosAgendaRepo.bulkAdd(eventos)

  // Deja las rutinas proyectadas en su punto fijo (ver cabecera).
  await reconciliarAgenda()
}
