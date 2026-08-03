import { db } from '../../core/data/db'
import { filaSeed, filasSeed } from '../../core/data/sync/syncables'
import { hoyISO, sumarDias } from './fecha'

let sembrado = false

/** Datos de ejemplo si el garaje está vacío. */
export async function sembrarGarage() {
  // La bandera se marca ANTES del primer await: en StrictMode el efecto corre
  // dos veces y ambas leerían count()===0, duplicando la siembra.
  if (sembrado) return
  sembrado = true
  const n = await db.vehiculos.count()
  if (n > 0) return

  const hoy = hoyISO()
  const biciId = await db.vehiculos.add(filaSeed('vehiculos-bici', {
    nombre: 'Bici urbana',
    tipo: 'bicicleta',
    marca: 'Genérica',
    odometroActual: 1240,
    unidad: 'km',
    creadoEn: hoy,
  }))
  const autoId = await db.vehiculos.add(filaSeed('vehiculos-auto', {
    nombre: 'Auto familiar',
    tipo: 'auto',
    marca: 'Ejemplo',
    modelo: 'Sedán',
    anio: 2019,
    odometroActual: 48500,
    unidad: 'km',
    matricula: 'ABC-123',
    creadoEn: hoy,
  }))

  // Los ids estables van escritos a mano (y no con `nuevoId`): la siembra corre
  // en cada dispositivo y dos UUID distintos serían dos contactos duplicados.
  await db.talleresVehiculo.bulkAdd(filasSeed('talleresVehiculo-demo', [
    {
      tallerId: 'tl-seed-taller',
      nombre: 'Taller centro',
      tipo: 'taller' as const,
      telefono: '55 1234 5678',
      direccion: 'Av. Ejemplo 120',
      creadoEn: hoy,
    },
    {
      tallerId: 'tl-seed-seguro',
      nombre: 'Aseguradora Ejemplo',
      tipo: 'aseguradora' as const,
      telefono: '800 000 0000',
      creadoEn: hoy,
    },
  ]))

  await db.tramitesVehiculo.bulkAdd(filasSeed('tramitesVehiculo-demo', [
    {
      tramiteId: 'tv-seed-verificacion',
      vehiculoId: autoId,
      tipo: 'verificacion' as const,
      titulo: 'Verificación',
      fecha: sumarDias(hoy, 40),
      cadaMeses: 6,
      avisoDias: 15,
      costo: 600,
      activo: true,
      creadoEn: hoy,
    },
    {
      tramiteId: 'tv-seed-seguro',
      vehiculoId: autoId,
      tipo: 'seguro' as const,
      titulo: 'Renovación de póliza',
      fecha: sumarDias(hoy, 90),
      cadaMeses: 12,
      avisoDias: 30,
      tallerId: 'tl-seed-seguro',
      activo: true,
      creadoEn: hoy,
    },
  ]))

  await db.registrosMantenimiento.bulkAdd(filasSeed('registrosMantenimiento-demo', [
    {
      vehiculoId: biciId,
      fecha: sumarDias(hoy, -12),
      tipo: 'cadena',
      titulo: 'Lubricar cadena',
      costo: 0,
      odometro: 1180,
      proximoOdometro: 1480,
      nota: 'Cadena limpia y aceitada.',
    },
    {
      vehiculoId: autoId,
      fecha: sumarDias(hoy, -45),
      tipo: 'aceite',
      titulo: 'Cambio de aceite sintético',
      costo: 890,
      odometro: 47200,
      taller: 'Taller centro',
      proximoOdometro: 52200,
      proximaFecha: sumarDias(hoy, 135),
    },
  ]))
}
