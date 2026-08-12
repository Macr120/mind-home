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
import type { EspecialidadMedica, TipoCuidadoPersona } from '../../core/data/db'
import {
  ajustesCicloRepo,
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  cuidadosRepo,
  diasCicloRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
} from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { crearPlanificador } from '../../demo/horarioPep'
import { sembrarMetasApp } from '../../demo/metasPep'
import { reconciliarAgenda } from './calendario'
import { DURACION_DEFECTO_MIN, DURACION_TOMA_MIN } from './constantes'
import { DEMO_AGENDA } from './demo.data'
import { nuevoId } from './ids'
import { DURACION_CUIDADO_MIN } from './mascotas'
import { inferirEspecialidad } from './salud'

/** Años de nacimiento de los 8 contactos, por orden del contenido generado. */
const NACIMIENTOS = [1968, 1971, 1998, 1999, 2000, 1996, 1994, 2001]
/** Offsets (respecto a hoy) donde cae el cumpleaños de cada contacto. */
const DIAS_CUMPLE = [12, -80, 45, -140, 3, 200, -210, 120]

export async function construirDemoAgenda(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_AGENDA, () => import('./demo.data.i18n'))
  // Aquí «es» significa «no es inglés»: los idiomas que todavía no tienen
  // su variante inline leen el español, que es el respaldo de todo.
  const es = ctx.idioma !== 'en'
  const r = rngDemo(31081934)
  const enHora = (off: number, hora = '09:00') => `${ctx.fecha(off)}T${hora}:00.000Z`
  // Todo lo que la agenda proyecta al calendario lleva hora, así que pide su
  // hueco: antes repartía cuatro horas fijas al azar y la mitad de las citas
  // caían dentro del turno de la cafetería o de las clases (ver horarioPep.ts).
  const horario = crearPlanificador()

  // Las tomas de medicamento se repiten a la MISMA hora todos los días, así que
  // no pueden pedir hueco por día: van a mano en las dos franjas que están
  // libres de lunes a domingo (la comida y después del repaso de idioma) y se
  // apartan antes que nada, para que ninguna cita se les eche encima.
  const TOMA_VITAMINA = '14:00'
  const TOMAS_ANTIINFLAMATORIO = ['14:20', '21:35']
  for (const h of [TOMA_VITAMINA, ...TOMAS_ANTIINFLAMATORIO]) horario.ocuparSiempre(h, DURACION_TOMA_MIN)

  // ── Contactos: el círculo de Pep@, con sus cumpleaños repartidos ─────────
  const contactoIds = datos.contactos.map(() => nuevoId('ct'))
  await contactosAgendaRepo.bulkAdd(
    datos.contactos.map((c, i) => {
      // El cumple guarda el año de NACIMIENTO: de ahí sale la edad en la app.
      const dia = DIAS_CUMPLE[i % DIAS_CUMPLE.length]
      const diaCumple = ctx.fecha(dia)
      // El bloque es ANUAL: dentro del año demo se pinta dos veces (esta y la
      // del año de al lado), en días de la semana distintos. La hora tiene que
      // caber en los dos, o el otro toque acabaría encima de algo.
      const otroToque = ctx.fecha(dia + (dia < 0 ? 365 : -365))
      const mmdd = diaCumple.slice(5)
      return {
        contactoId: contactoIds[i],
        nombre: c.nombre,
        relacion: c.relacion,
        cumple: `${NACIMIENTOS[i % NACIMIENTOS.length]}-${mmdd}`,
        // Hora propia SIEMPRE: el recordatorio de fábrica son las 09:00, y en
        // los días de turno eso caía en plena cafetería.
        horaCumple: horario.reservarEnVarios([diaCumple, otroToque], 30, ['15:00', '22:00', '17:00']) ?? '22:00',
        ...(i % 2 === 0 ? { telefono: `55 ${1000 + i * 137} ${2000 + i * 311}` } : {}),
        // La madre (la primera de la libreta) es la prójima a cargo de Pep@: es
        // la MISMA ficha de Personas, marcada, no una copia en Salud.
        ...(i === 0 ? { alCuidado: true } : {}),
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
  // La hora de cada cuidado sale del planificador: son citas de un día concreto
  // (la clínica, el baño) y tienen que caber en él.
  const cuidados: [number, 'vacuna' | 'desparasitacion' | 'bano', string, string][] = [
    [56, 'vacuna', es ? 'Vacuna anual' : 'Annual shot', '10:00'],
    [55, 'desparasitacion', es ? 'Desparasitación' : 'Deworming', '10:30'],
    [10, 'bano', es ? 'Baño y cepillado' : 'Bath and brushing', '17:00'],
  ]
  await cuidadosMascotaRepo.bulkAdd(
    cuidados.map(([dia, tipo, titulo, preferida], i) => ({
      cuidadoId: nuevoId('cu'),
      mascotaId: mascId,
      tipo,
      titulo,
      fecha: ctx.fecha(dia),
      hora: horario.reservar(ctx.fecha(dia), DURACION_CUIDADO_MIN, [preferida, '15:00', '17:30']) ?? preferida,
      cadaMeses: [12, 3, 1][i],
      ultima: ctx.fecha([-309, -35, -20][i]),
      activo: true,
      creadoEn: enHora(-304, `12:1${i}`),
    })),
  )

  // ── Medicamentos: la vitamina de siempre y el antiinflamatorio del bache ─
  // Las horas son las MISMAS todos los días, así que no se piden al
  // planificador (que trabaja por día): se eligen a mano en las dos franjas que
  // están libres de lunes a domingo — la comida (14:00) y después del repaso de
  // idioma (21:30).
  await medicamentosRepo.bulkAdd([
    {
      medId: nuevoId('md'),
      nombre: es ? 'Vitamina D' : 'Vitamin D',
      dosis: '1000 UI',
      horas: [TOMA_VITAMINA],
      dias: [],
      fechaInicio: ctx.fecha(-250),
      activo: true,
      creadoEn: enHora(-250, '09:30'),
    },
    {
      medId: nuevoId('md'),
      nombre: es ? 'Antiinflamatorio' : 'Anti-inflammatory',
      dosis: '400 mg',
      horas: TOMAS_ANTIINFLAMATORIO,
      dias: [],
      fechaInicio: ctx.fecha(-184),
      fechaFin: ctx.fecha(-163),
      notas: es ? 'Por la rodilla, mientras duró la lesión.' : 'For the knee, while the injury lasted.',
      activo: false,
      creadoEn: enHora(-184, '18:00'),
    },
    // El de la madre: el tratamiento que Pep@ le vigila desde que la cuida.
    {
      medId: nuevoId('md'),
      nombre: es ? 'Enalapril' : 'Enalapril',
      dosis: '10 mg',
      contactoId: contactoIds[0],
      horas: [TOMA_VITAMINA],
      dias: [],
      fechaInicio: ctx.fecha(-210),
      notas: es ? 'Para la tensión. No saltarse ninguna.' : 'Blood pressure. Never skip one.',
      activo: true,
      creadoEn: enHora(-210, '09:40'),
    },
  ])

  // ── Cuidados que se repiten: los de Pep@ y los de su madre ───────────────
  // Mismo trato que los de Laika, porque son la misma clase de cosa: `fecha` es
  // SIEMPRE la próxima vez y `ultima` resume el historial.
  const cuidadosPersona: [number, TipoCuidadoPersona, string, number, number, string | undefined][] = [
    [40, 'chequeo', es ? 'Chequeo general' : 'General checkup', 12, -325, undefined],
    [95, 'dental', es ? 'Limpieza dental' : 'Dental cleaning', 6, -130, undefined],
    [21, 'visual', es ? 'Revisión de la vista' : 'Eye checkup', 12, -344, undefined],
    [12, 'chequeo', es ? 'Control de tensión' : 'Blood pressure check', 3, -78, contactoIds[0]],
    [64, 'analisis', es ? 'Análisis de sangre' : 'Blood tests', 6, -118, contactoIds[0]],
  ]
  await cuidadosRepo.bulkAdd(
    cuidadosPersona.map(([dia, tipo, titulo, cadaMeses, ultima, contactoId], i) => ({
      cuidadoId: nuevoId('cp'),
      ...(contactoId ? { contactoId } : {}),
      tipo,
      titulo,
      fecha: ctx.fecha(dia),
      hora: horario.reservar(ctx.fecha(dia), DURACION_CUIDADO_MIN, ['11:00', '10:30', '17:00']) ?? '11:00',
      cadaMeses,
      ultima: ctx.fecha(ultima),
      activo: true,
      creadoEn: enHora(-300, `13:0${i}`),
    })),
  )

  // ── Ciclo: trece periodos del año, con sus síntomas ──────────────────────
  // Se siembra ENCENDIDO para que la sección se pueda ver; el visitante lo apaga
  // desde la propia tarjeta si no le sirve (los registros se conservan).
  await ajustesCicloRepo.add({
    activo: true,
    duracionCicloMedia: 28,
    duracionPeriodoMedia: 5,
    avisarAntes: 2,
    creadoEn: enHora(-360, '08:00'),
  })
  const SINTOMAS_DEMO = [['colicos', 'cansancio'], ['colicos'], ['cabeza', 'antojos'], ['hinchazon', 'cansancio']]
  const diasCiclo: Parameters<typeof diasCicloRepo.bulkAdd>[0] = []
  // Cada 29 días desde hace un año: la media real sale ~29, no el 28 de ajustes.
  for (let inicio = -350, n = 0; inicio <= -5; inicio += 29, n++) {
    for (let d = 0; d < 5; d++) {
      diasCiclo.push({
        fecha: ctx.fecha(inicio + d),
        sangrado: (d === 0 ? 2 : d === 1 ? 3 : d < 4 ? 2 : 1) as 1 | 2 | 3,
        sintomas: d < 2 ? SINTOMAS_DEMO[n % SINTOMAS_DEMO.length] : [],
        ...(d === 0 ? { animo: 2 } : d === 4 ? { animo: 4 } : {}),
        creadoEn: enHora(inicio + d, '08:30'),
      })
    }
  }
  await diasCicloRepo.bulkAdd(diasCiclo)

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

  /**
   * Horas que se INTENTAN por área, en orden de preferencia. El planificador se
   * queda con la primera que quepa ese día concreto (y si no cabe ninguna,
   * busca el primer hueco): las de trabajo salen entre turno y clases, las de
   * salud a media mañana o a media tarde, y los planes con gente por la noche.
   */
  const PREFERIDAS = {
    trabajo: ['15:00', '10:00', '11:00', '14:45'],
    salud: ['10:00', '17:00', '15:30', '11:30'],
    personas: ['21:45', '19:00', '17:30', '15:00'],
  } as const

  const conHora = (area: 'trabajo' | 'salud' | 'personas', dia: number) =>
    horario.reservar(ctx.fecha(dia), DURACION_DEFECTO_MIN, [...PREFERIDAS[area]]) ?? undefined

  for (const e of datos.trabajo) {
    agendar('trabajo', e.dia, e.titulo, {
      hora: conHora('trabajo', e.dia),
      prioridad: (Math.floor(r() * 3) + 1) as 1 | 2 | 3,
      ...(e.lugar ? { lugar: e.lugar } : {}),
    })
  }
  for (const e of datos.salud) {
    // Las de Laika son SUYAS: sin `mascotaId` se colaban en «Salud › Tú».
    const deLaika = /laika/i.test(e.titulo)
    agendar('salud', e.dia, e.titulo, {
      hora: conHora('salud', e.dia),
      ...(e.lugar ? { lugar: e.lugar } : {}),
      ...(deLaika ? { mascotaId: mascId } : {}),
      ...(inferirEspecialidad(e.titulo) && !deLaika
        ? { especialidad: inferirEspecialidad(e.titulo) }
        : {}),
    })
  }
  // Las citas de la madre: van en Salud pero con SU nombre, así que aparecen en
  // su ficha de Prójimos y no en la lista de Pep@.
  const citasMadre: [number, string, string, EspecialidadMedica][] = [
    [-78, es ? 'Control de tensión' : 'Blood pressure check', es ? 'Dra. Ferrán' : 'Dr. Ferrán', 'cardiologia'],
    [-118, es ? 'Análisis de sangre' : 'Blood tests', es ? 'Laboratorio Sur' : 'South Lab', 'laboratorio'],
    [12, es ? 'Revisión con el cardiólogo' : 'Cardiologist follow-up', es ? 'Dra. Ferrán' : 'Dr. Ferrán', 'cardiologia'],
  ]
  for (const [dia, titulo, con, especialidad] of citasMadre) {
    agendar('salud', dia, titulo, {
      hora: conHora('salud', dia),
      con,
      contactoId: contactoIds[0],
      especialidad,
    })
  }

  for (const e of datos.personas) {
    agendar('personas', e.dia, e.titulo, {
      hora: conHora('personas', e.dia),
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
      creadoEn: enHora(-20 + i * 3, '09:15'),
    })
  })

  // Lo que viene: la agenda no se acaba hoy.
  const proximos: [number, 'trabajo' | 'salud' | 'personas', string, string][] = es
    ? [
        [2, 'trabajo', 'Turno extra en la cafetería', '14:30'],
        [4, 'personas', 'Café con la familia', '17:30'],
        [9, 'salud', 'Revisión de la rodilla', '11:00'],
        [16, 'trabajo', 'Entrega del proyecto semestral', '10:00'],
      ]
    : [
        [2, 'trabajo', 'Extra shift at the coffee shop', '14:30'],
        [4, 'personas', 'Coffee with the family', '17:30'],
        [9, 'salud', 'Knee check-up', '11:00'],
        [16, 'trabajo', 'Semester project hand-in', '10:00'],
      ]
  for (const [dia, area, titulo, hora] of proximos) {
    eventos.push({
      evId: nuevoId('ag'),
      area,
      titulo,
      fecha: ctx.fecha(dia),
      // La hora escrita es la PREFERIDA; si ese día ya está ocupada, el
      // planificador mueve el bloque al primer hueco.
      hora: horario.reservar(ctx.fecha(dia), DURACION_DEFECTO_MIN, [hora, ...PREFERIDAS[area]]) ?? hora,
      prioridad: 2,
      creadoEn: enHora(-6, '09:00'),
    })
  }

  await eventosAgendaRepo.bulkAdd(eventos)

  // La entrega del proyecto semestral como meta, con el plan que la trajo hasta
  // aquí ya aceptado: sus fases son las sub-metas del cronograma.
  await sembrarMetasApp(ctx, 'agenda')

  // Deja las rutinas proyectadas en su punto fijo (ver cabecera).
  await reconciliarAgenda()
}
