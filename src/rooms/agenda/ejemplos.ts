import type {
  AreaAgenda,
  ContactoAgenda,
  EventoAgenda,
  Mascota,
  Medicamento,
} from '../../core/data/db'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { porIdioma, type PorIdioma } from '../_shared/ejemplos/tipos'
import {
  borrarContacto,
  borrarEvento,
  borrarMascota,
  borrarMedicamento,
  guardarContacto,
  guardarCuidado,
  guardarEvento,
  guardarMascota,
  guardarMedicamento,
} from './crear'
import { nuevoId } from './ids'

/**
 * Ejemplo de fábrica de cada sección de la agenda.
 *
 * Se carga y se borra ENTERO desde la propia sección, y pasa por las mismas
 * altas y bajas que el usuario (`guardarEvento`, `borrarContacto`…): así el
 * ejemplo proyecta sus bloques al calendario igual que lo haría a mano, y al
 * borrarlo se los lleva consigo en vez de dejarlos huérfanos.
 *
 * Las fechas son RELATIVAS a hoy: un ejemplo fechado en el pasado no se ve en
 * el calendario y no enseña nada. El contenido va en los dos idiomas (es dato
 * del usuario en cuanto se crea, no interfaz: por eso no está en `dict.ts`).
 */

type Clave =
  | 'contrato'
  | 'textos'
  | 'hosting'
  | 'junta'
  | 'oficina'
  | 'cliente'
  | 'limpieza'
  | 'clinica'
  | 'doctora'
  | 'vitamina'
  | 'dosis'
  | 'ana'
  | 'amigos'
  | 'luis'
  | 'trabajo'
  | 'cafe'
  | 'cafeteria'
  | 'perro'
  | 'raza'
  | 'vacuna'
  | 'desparasitar'
  | 'veterinaria'
  | 'cotizacion'
  | 'dominio'
  | 'notaDominio'
  | 'maqueta'
  | 'antibiotico'
  | 'capsula'
  | 'analisis'
  | 'laboratorio'
  | 'gotas'
  | 'dosisGotas'
  | 'bano'
  | 'carmen'
  | 'familia'
  | 'direccion'
  | 'notasCarmen'
  | 'cena'

const TEXTOS: PorIdioma<Record<Clave, string>> = {
  es: {
    contrato: 'Firmar el contrato',
    textos: 'Escribir los textos',
    hosting: 'Cotizar el hosting',
    junta: 'Junta de arranque',
    oficina: 'Oficina',
    cliente: 'Marta (cliente)',
    limpieza: 'Limpieza dental',
    clinica: 'Clínica del centro',
    doctora: 'Dra. Ruiz',
    vitamina: 'Vitamina D',
    dosis: '1 pastilla',
    ana: 'Ana Torres',
    amigos: 'Amigos',
    luis: 'Luis Pérez',
    trabajo: 'Trabajo',
    cafe: 'Café con Ana',
    cafeteria: 'La cafetería de siempre',
    perro: 'Kira',
    raza: 'Labrador',
    vacuna: 'Vacuna anual',
    desparasitar: 'Desparasitación',
    veterinaria: 'Veterinaria del parque',
    cotizacion: 'Pedir cotización a la mudanza',
    dominio: 'Renovar el dominio',
    notaDominio: 'Ojo: la renovación automática está apagada.',
    maqueta: 'Entregar la maqueta',
    antibiotico: 'Antibiótico',
    capsula: '1 cápsula',
    analisis: 'Análisis de sangre',
    laboratorio: 'Laboratorio de la esquina',
    gotas: 'Gotas para el oído',
    dosisGotas: '3 gotas',
    bano: 'Baño',
    carmen: 'Carmen Ruiz',
    familia: 'Familia',
    direccion: 'Av. de los Olivos 42',
    notasCarmen: 'No le gusta el cilantro. Le encantan las plantas.',
    cena: 'Cena de cumpleaños',
  },
  en: {
    contrato: 'Sign the contract',
    textos: 'Write the copy',
    hosting: 'Get a hosting quote',
    junta: 'Kick-off meeting',
    oficina: 'The office',
    cliente: 'Marta (client)',
    limpieza: 'Dental cleaning',
    clinica: 'Clinic downtown',
    doctora: 'Dr. Ruiz',
    vitamina: 'Vitamin D',
    dosis: '1 pill',
    ana: 'Ana Torres',
    amigos: 'Friends',
    luis: 'Luis Pérez',
    trabajo: 'Work',
    cafe: 'Coffee with Ana',
    cafeteria: 'The usual coffee shop',
    perro: 'Kira',
    raza: 'Labrador',
    vacuna: 'Yearly shot',
    desparasitar: 'Deworming',
    veterinaria: 'The vet by the park',
    cotizacion: 'Ask the movers for a quote',
    dominio: 'Renew the domain',
    notaDominio: 'Heads up: auto-renewal is off.',
    maqueta: 'Hand in the mockup',
    antibiotico: 'Antibiotic',
    capsula: '1 capsule',
    analisis: 'Blood test',
    laboratorio: 'The lab around the corner',
    gotas: 'Ear drops',
    dosisGotas: '3 drops',
    bano: 'Bath',
    carmen: 'Carmen Ruiz',
    familia: 'Family',
    direccion: '42 Olive Avenue',
    notasCarmen: 'Hates cilantro. Loves plants.',
    cena: 'Birthday dinner',
  },
}

/** ¿Esta sección ya tiene su ejemplo cargado? */
export const hayEjemplo = (
  area: AreaAgenda,
  eventos: EventoAgenda[],
  contactos: ContactoAgenda[],
  medicinas: Medicamento[],
  mascotas: Mascota[] = [],
): boolean =>
  eventos.some((e) => e.ejemplo && e.area === area) ||
  (area === 'salud' && (medicinas.some((m) => m.ejemplo) || mascotas.some((m) => m.ejemplo))) ||
  (area === 'personas' && contactos.some((c) => c.ejemplo))

/** Carga el ejemplo de una sección. Las fechas cuelgan de hoy. */
export async function cargarEjemplo(area: AreaAgenda): Promise<void> {
  const T = porIdioma(TEXTOS)
  const hoy = fechaLocalISO()
  const enDias = (n: number) => isoMasDias(hoy, n)

  if (area === 'trabajo') {
    const base = { area: 'trabajo' as const, ejemplo: true }
    // Uno por columna del tablero: por hacer, en curso y hecho.
    await guardarEvento(null, { ...base, titulo: T.hosting, prioridad: 3 })
    await guardarEvento(null, { ...base, titulo: T.textos, prioridad: 1, enCurso: true })
    await guardarEvento(null, { ...base, titulo: T.contrato, prioridad: 2, hecho: true, hechoEn: hoy })
    await guardarEvento(null, { ...base, titulo: T.cotizacion, prioridad: 1 })
    // El que estrena las notas de la tarjeta.
    await guardarEvento(null, { ...base, titulo: T.dominio, prioridad: 2, notas: T.notaDominio })
    await guardarEvento(null, {
      ...base,
      titulo: T.junta,
      fecha: enDias(2),
      hora: '10:00',
      horaFin: '11:00',
      lugar: T.oficina,
      con: T.cliente,
    })
    // Uno ya entregado la semana pasada: estrena la columna «Hecho» con algo
    // que sí tuvo fecha.
    await guardarEvento(null, {
      ...base,
      titulo: T.maqueta,
      fecha: enDias(-4),
      hora: '13:00',
      hecho: true,
      hechoEn: enDias(-4),
    })
    return
  }

  if (area === 'salud') {
    await guardarEvento(null, {
      area: 'salud',
      ejemplo: true,
      titulo: T.limpieza,
      fecha: enDias(5),
      hora: '17:00',
      lugar: T.clinica,
      con: T.doctora,
    })
    // Una cita ya pasada para que el archivador tenga historial que plegar.
    await guardarEvento(null, {
      area: 'salud',
      ejemplo: true,
      titulo: T.analisis,
      fecha: enDias(-9),
      hora: '08:30',
      lugar: T.laboratorio,
      hecho: true,
      hechoEn: enDias(-9),
    })
    await guardarMedicamento(null, {
      nombre: T.vitamina,
      dosis: T.dosis,
      horas: ['09:00'],
      dias: [],
      fechaInicio: hoy,
      activo: true,
      ejemplo: true,
    })
    // El otro tipo de tratamiento: dos tomas al día y con fecha de fin.
    await guardarMedicamento(null, {
      nombre: T.antibiotico,
      dosis: T.capsula,
      horas: ['08:00', '20:00'],
      dias: [],
      fechaInicio: hoy,
      fechaFin: enDias(6),
      activo: true,
      ejemplo: true,
    })
    // Una mascota con lo que de verdad se olvida: la vacuna que toca una vez al
    // año, la desparasitación trimestral y la cita que ya está apalabrada.
    const mascotaId = nuevoId('ms')
    await guardarMascota({ mascId: mascotaId } as Mascota, {
      nombre: T.perro,
      especie: 'perro',
      raza: T.raza,
      nacimiento: `${Number(hoy.slice(0, 4)) - 3}${hoy.slice(4)}`,
      peso: 24,
      ejemplo: true,
    })
    await guardarCuidado(
      null,
      {
        mascotaId,
        tipo: 'vacuna',
        titulo: T.vacuna,
        fecha: enDias(12),
        hora: '10:00',
        cadaMeses: 12,
        activo: true,
        ejemplo: true,
      },
      T.perro,
    )
    await guardarCuidado(
      null,
      {
        mascotaId,
        tipo: 'desparasitacion',
        titulo: T.desparasitar,
        fecha: enDias(4),
        hora: '09:00',
        cadaMeses: 3,
        activo: true,
        ejemplo: true,
      },
      T.perro,
    )
    // Uno que ya se hizo: enseña la «última vez» y de dónde sale la próxima.
    await guardarCuidado(
      null,
      {
        mascotaId,
        tipo: 'bano',
        titulo: T.bano,
        fecha: enDias(9),
        hora: '12:00',
        cadaMeses: 1,
        ultima: enDias(-21),
        activo: true,
        ejemplo: true,
      },
      T.perro,
    )
    await guardarEvento(null, {
      area: 'salud',
      ejemplo: true,
      titulo: T.vacuna,
      fecha: enDias(12),
      hora: '10:00',
      lugar: T.veterinaria,
      mascotaId,
    })
    // Un tratamiento a nombre de la mascota: es lo que pinta su chip en la lista
    // y lo que deja ver para qué sirve el «¿para quién es?» del formulario.
    await guardarMedicamento(null, {
      nombre: T.gotas,
      dosis: T.dosisGotas,
      mascotaId,
      horas: ['08:00', '21:00'],
      dias: [],
      fechaInicio: hoy,
      fechaFin: enDias(4),
      activo: true,
      ejemplo: true,
    })
    return
  }

  // Personas: tres fichas (una por carpeta de relación) y dos planes con la misma
  // persona, uno por venir y otro ya pasado, para estrenar su historial.
  const contactoId = nuevoId('ct')
  // El cumpleaños se deja a la vuelta de la esquina para que se vea en el
  // calendario; el año es el de nacimiento y de ahí sale la edad que cumple.
  await guardarContacto({ contactoId } as ContactoAgenda, {
    nombre: T.ana,
    relacion: T.amigos,
    telefono: '555 123 4567',
    cumple: `1994${enDias(6).slice(4)}`,
    ejemplo: true,
  })
  await guardarContacto(null, { nombre: T.luis, relacion: T.trabajo, correo: 'luis@ejemplo.com', ejemplo: true })
  // La ficha completa: teléfono, correo, cumpleaños con su hora, dirección y notas.
  await guardarContacto(null, {
    nombre: T.carmen,
    relacion: T.familia,
    telefono: '555 987 6543',
    correo: 'carmen@ejemplo.com',
    cumple: `1961${enDias(20).slice(4)}`,
    horaCumple: '08:00',
    direccion: T.direccion,
    notas: T.notasCarmen,
    ejemplo: true,
  })
  await guardarEvento(null, {
    area: 'personas',
    ejemplo: true,
    titulo: T.cafe,
    fecha: enDias(3),
    hora: '18:00',
    lugar: T.cafeteria,
    contactoId,
  })
  await guardarEvento(null, {
    area: 'personas',
    ejemplo: true,
    titulo: T.cena,
    fecha: enDias(-12),
    hora: '21:00',
    contactoId,
    hecho: true,
    hechoEn: enDias(-12),
  })
}

/** Borra el ejemplo de una sección con lo que haya proyectado al calendario. */
export async function borrarEjemplo(
  area: AreaAgenda,
  eventos: EventoAgenda[],
  contactos: ContactoAgenda[],
  medicinas: Medicamento[],
  mascotas: Mascota[] = [],
): Promise<void> {
  for (const e of eventos.filter((x) => x.ejemplo && x.area === area)) await borrarEvento(e)
  if (area === 'salud') {
    for (const m of medicinas.filter((x) => x.ejemplo)) await borrarMedicamento(m)
    // La mascota se lleva sus cuidados (y con ellos sus bloques del calendario).
    for (const m of mascotas.filter((x) => x.ejemplo)) await borrarMascota(m)
  }
  if (area === 'personas') for (const c of contactos.filter((x) => x.ejemplo)) await borrarContacto(c)
}
