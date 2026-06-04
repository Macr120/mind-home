import { db } from '../../core/data/db'
import { hoyISO, sumarDias } from './fecha'

/** Datos de ejemplo si el garaje está vacío. */
export async function sembrarGarage() {
  const n = await db.vehiculos.count()
  if (n > 0) return

  const hoy = hoyISO()
  const biciId = await db.vehiculos.add({
    nombre: 'Bici urbana',
    tipo: 'bicicleta',
    marca: 'Genérica',
    odometroActual: 1240,
    unidad: 'km',
    creadoEn: hoy,
  })
  const autoId = await db.vehiculos.add({
    nombre: 'Auto familiar',
    tipo: 'auto',
    marca: 'Ejemplo',
    modelo: 'Sedán',
    anio: 2019,
    odometroActual: 48500,
    unidad: 'km',
    matricula: 'ABC-123',
    creadoEn: hoy,
  })

  await db.registrosMantenimiento.bulkAdd([
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
  ])
}
