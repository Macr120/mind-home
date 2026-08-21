import { db } from '../../core/data/db'
import { esSeedIntacta, filaSeed, filasSeed } from '../../core/data/sync/syncables'
import { enIdioma } from '../../core/i18n/porIdioma'
import { idiomaActual } from '../../core/i18n/useT'
import { hoyISO, sumarDias } from './fecha'
import type { Table, UpdateSpec } from 'dexie'
import { TEXTOS_GARAGE } from './seed.i18n'

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
  const tx = enIdioma(TEXTOS_GARAGE, idiomaActual())
  const biciId = await db.vehiculos.add(filaSeed('vehiculos-bici', {
    nombre: tx.bici.nombre,
    tipo: 'bicicleta',
    marca: tx.bici.marca,
    odometroActual: 1240,
    unidad: 'km',
    creadoEn: hoy,
  }))
  const autoId = await db.vehiculos.add(filaSeed('vehiculos-auto', {
    nombre: tx.auto.nombre,
    tipo: 'auto',
    marca: tx.auto.marca,
    modelo: tx.auto.modelo,
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
      nombre: tx.taller.nombre,
      tipo: 'taller' as const,
      telefono: '55 1234 5678',
      direccion: tx.taller.direccion,
      creadoEn: hoy,
    },
    {
      tallerId: 'tl-seed-seguro',
      nombre: tx.seguro.nombre,
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
      titulo: tx.verificacion.titulo,
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
      titulo: tx.seguroTramite.titulo,
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
      titulo: tx.mant0.titulo,
      costo: 0,
      odometro: 1180,
      proximoOdometro: 1480,
      nota: tx.mant0.nota,
    },
    {
      vehiculoId: autoId,
      fecha: sumarDias(hoy, -45),
      tipo: 'aceite',
      titulo: tx.mant1.titulo,
      costo: 890,
      odometro: 47200,
      taller: tx.mant1.taller,
      proximoOdometro: 52200,
      proximaFecha: sumarDias(hoy, 135),
    },
  ]))
}

/**
 * Reescribe al idioma activo las filas de la semilla que el usuario NO ha
 * tocado (`esSeedIntacta`), con `db.tabla.update` crudo: el middleware conserva
 * `updatedAt: 1` en uids `seed-…`, así siguen retraducibles y cualquier
 * edición real les gana por LWW. Cubre la instalación vieja (sembrada en
 * español) y los cambios de idioma posteriores.
 */
export async function retraducirGarage() {
  const tx = enIdioma(TEXTOS_GARAGE, idiomaActual())

  const cambiar = async <T extends { id?: number; uid?: string }>(
    tabla: Table<T, number>,
    uid: string,
    destino: Partial<T>,
  ) => {
    const fila = (await tabla.toArray()).find((f) => f.uid === uid)
    if (!fila || fila.id == null || !esSeedIntacta(fila)) return
    const cambios = Object.fromEntries(
      Object.entries(destino).filter(([k, v]) => (fila as Record<string, unknown>)[k] !== v),
    )
    if (Object.keys(cambios).length) await tabla.update(fila.id, cambios as UpdateSpec<T>)
  }

  await cambiar(db.vehiculos, 'seed-vehiculos-bici', { nombre: tx.bici.nombre, marca: tx.bici.marca })
  await cambiar(db.vehiculos, 'seed-vehiculos-auto', {
    nombre: tx.auto.nombre,
    marca: tx.auto.marca,
    modelo: tx.auto.modelo,
  })
  await cambiar(db.talleresVehiculo, 'seed-talleresVehiculo-demo-0', {
    nombre: tx.taller.nombre,
    direccion: tx.taller.direccion,
  })
  await cambiar(db.talleresVehiculo, 'seed-talleresVehiculo-demo-1', { nombre: tx.seguro.nombre })
  await cambiar(db.tramitesVehiculo, 'seed-tramitesVehiculo-demo-0', { titulo: tx.verificacion.titulo })
  await cambiar(db.tramitesVehiculo, 'seed-tramitesVehiculo-demo-1', { titulo: tx.seguroTramite.titulo })
  await cambiar(db.registrosMantenimiento, 'seed-registrosMantenimiento-demo-0', {
    titulo: tx.mant0.titulo,
    nota: tx.mant0.nota,
  })
  await cambiar(db.registrosMantenimiento, 'seed-registrosMantenimiento-demo-1', {
    titulo: tx.mant1.titulo,
    taller: tx.mant1.taller,
  })
}
