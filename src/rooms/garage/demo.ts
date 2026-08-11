/**
 * Año demo del garaje: la bici de todos los días y un coche viejo heredado.
 *
 * El seed de fábrica ya creó dos vehículos genéricos antes de que corra esto
 * (lo hace `construirDemo`), así que en vez de duplicarlos se REESCRIBEN: sus
 * uid e ids estables son únicos en la base y borrarlos rompería el sync.
 *
 * Los costos y el odómetro no vienen escritos: se calculan aquí interpolando
 * el kilometraje por fecha, que es lo que hace verosímil un historial.
 */
import type { RegistroMantenimiento, TipoMantenimiento, Vehiculo } from '../../core/data/db'
import {
  registrosMantenimientoRepo,
  talleresVehiculoRepo,
  tramitesVehiculoRepo,
  vehiculosRepo,
} from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { AVERIA_COCHE, AVERIA_DIA } from '../../demo/hitosPep'
import { crearPlanificador } from '../../demo/horarioPep'
import { sembrarMetasApp } from '../../demo/metasPep'
import { reconciliarGarage } from './calendario'
import { sumarDias } from './fecha'
import { DEMO_GARAGE } from './demo.data'

/** Kilometraje al empezar y al terminar el año, por vehículo. */
const BICI_KM = { inicio: 1240, fin: 4860 }
const AUTO_KM = { inicio: 209400, fin: 218400 }

/** Costo típico de cada tipo de servicio (el builder le mete ruido). */
const COSTO: Partial<Record<TipoMantenimiento, [number, number]>> = {
  cadena: [0, 180],
  llantas: [420, 2900],
  frenos: [260, 1750],
  revision: [180, 2300],
  aceite: [820, 980],
  filtros: [340, 620],
  bateria: [1450, 1900],
  transmision: [380, 900],
  lavado: [90, 180],
  otro: [200, 900],
}

export async function construirDemoGarage(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_GARAGE[ctx.idioma]
  const r = rngDemo(20040419)
  // Los trámites proyectan bloque con hora al calendario: se piden a la semana
  // fija de Pep@ para que no caigan encima del turno ni de las clases.
  const horario = crearPlanificador()

  // ── Los dos vehículos: se reescriben los del seed ────────────────────────
  // `uid` no está en la interfaz (vive solo en el esquema Dexie), de ahí el cast.
  const todos = (await vehiculosRepo.list()) as (Vehiculo & { uid?: string })[]
  const bici = todos.find((v) => v.uid === 'seed-vehiculos-bici') ?? todos.find((v) => v.tipo === 'bicicleta')
  const auto = todos.find((v) => v.uid === 'seed-vehiculos-auto') ?? todos.find((v) => v.tipo === 'auto')
  if (!bici?.id || !auto?.id) return

  await vehiculosRepo.update(bici.id, {
    nombre: datos.vehiculos.biciNombre,
    marca: 'Benotto',
    modelo: 'Urbana 700c',
    anio: 2019,
    odometroActual: BICI_KM.fin,
    notas: datos.vehiculos.biciNota,
    // Sin matrícula: así el garaje esconde solo los trámites de placa.
    matricula: undefined,
    // El seed la fecha HOY; en el demo lleva todo el año en la casa.
    creadoEn: ctx.fecha(-364),
  })
  await vehiculosRepo.update(auto.id, {
    nombre: datos.vehiculos.autoNombre,
    marca: 'Nissan',
    modelo: 'Tsuru',
    anio: 2004,
    odometroActual: AUTO_KM.fin,
    matricula: 'MXP-42-19',
    notas: datos.vehiculos.autoNota,
    creadoEn: ctx.fecha(-364),
  })
  const idDe = { bici: bici.id, auto: auto.id }

  // ── Talleres: los dos del seed se reescriben, tres son nuevos ────────────
  const talleresSeed = await talleresVehiculoRepo.list()
  const porClave: Record<string, string> = {
    taller: 'tl-seed-taller',
    aseguradora: 'tl-seed-seguro',
    verificentro: 'tl-pep-verificentro',
    ciclos: 'tl-pep-ciclos',
    grua: 'tl-pep-grua',
  }
  const TIPO_TALLER = {
    taller: 'taller',
    aseguradora: 'aseguradora',
    verificentro: 'verificentro',
    ciclos: 'refaccionaria',
    grua: 'grua',
  } as const

  for (const t of datos.talleres) {
    const tallerId = porClave[t.clave]
    const previo = talleresSeed.find((x) => x.tallerId === tallerId)
    const fila = {
      tallerId,
      nombre: t.nombre,
      tipo: TIPO_TALLER[t.clave],
      direccion: t.direccion,
      notas: t.notas,
      ...(t.clave === 'ciclos' ? { vehiculoId: idDe.bici } : {}),
      ...(t.clave === 'taller' || t.clave === 'aseguradora' ? { vehiculoId: idDe.auto } : {}),
      creadoEn: ctx.fecha(-350),
    }
    if (previo?.id) await talleresVehiculoRepo.update(previo.id, fila)
    else await talleresVehiculoRepo.add(fila)
  }

  // ── Trámites: solo el PRÓXIMO vencimiento de cada uno (el historial va en
  // los servicios). Los dos del seed se reescriben por su id estable. ───────
  const TRAMITES = {
    afinacionBici: { veh: 'bici', tipo: 'mantenimiento', dias: 24, cadaMeses: 6, aviso: 7, costo: 450, taller: 'tl-pep-ciclos', id: 'tv-pep-afinacion-bici' },
    verificacion: { veh: 'auto', tipo: 'verificacion', dias: 52, cadaMeses: 6, aviso: 15, costo: 610, taller: 'tl-pep-verificentro', id: 'tv-seed-verificacion' },
    seguro: { veh: 'auto', tipo: 'seguro', dias: 118, cadaMeses: 12, aviso: 30, costo: 6480, taller: 'tl-seed-seguro', id: 'tv-seed-seguro' },
    tenencia: { veh: 'auto', tipo: 'tenencia', dias: 160, cadaMeses: 12, aviso: 30, costo: 1890, taller: undefined, id: 'tv-pep-tenencia' },
    circulacion: { veh: 'auto', tipo: 'circulacion', dias: 300, cadaMeses: 36, aviso: 30, costo: 1040, taller: undefined, id: 'tv-pep-circulacion' },
  } as const

  const tramitesSeed = await tramitesVehiculoRepo.list()
  for (const t of datos.tramites) {
    const def = TRAMITES[t.clave]
    if (!def) continue
    const fila = {
      tramiteId: def.id,
      vehiculoId: def.veh === 'bici' ? idDe.bici : idDe.auto,
      tipo: def.tipo,
      titulo: t.titulo,
      fecha: sumarDias(ctx.hoy, def.dias),
      // Hueco real en vez de las 09:00 de fábrica: media semana Pep@ está en el
      // turno de la cafetería a esa hora (ver horarioPep.ts). La hora tiene que
      // caber también el día del AVISO previo, que el garaje pinta a la misma
      // hora `avisoDias` antes.
      hora:
        horario.reservarEnVarios(
          [sumarDias(ctx.hoy, def.dias), sumarDias(ctx.hoy, def.dias - def.aviso)],
          30,
          ['10:00', '15:00', '11:30'],
        ) ?? '15:00',
      cadaMeses: def.cadaMeses,
      avisoDias: def.aviso,
      costo: def.costo,
      nota: t.nota,
      ...(def.taller ? { tallerId: def.taller } : {}),
      activo: true,
      creadoEn: ctx.fecha(-340),
    }
    const previo = tramitesSeed.find((x) => x.tramiteId === def.id)
    if (previo?.id) await tramitesVehiculoRepo.update(previo.id, fila)
    else await tramitesVehiculoRepo.add(fila)
  }

  // ── El historial del año: los del seed sobran (no tienen id estable) ─────
  const viejos = await registrosMantenimientoRepo.list()
  for (const v of viejos) if (v.id) await registrosMantenimientoRepo.remove(v.id)

  /** Odómetro interpolado por fecha: un historial coherente se lee solo. */
  const odometro = (veh: 'bici' | 'auto', off: number) => {
    const km = veh === 'bici' ? BICI_KM : AUTO_KM
    const avance = (off + 364) / 364
    return Math.round(km.inicio + (km.fin - km.inicio) * avance)
  }

  const servicios: Omit<RegistroMantenimiento, 'id'>[] = datos.servicios.map((s) => {
    const esAveria = s.dia === AVERIA_DIA
    const [min, max] = COSTO[s.tipo] ?? [150, 600]
    const costo = esAveria ? AVERIA_COCHE : Math.round(min + r() * (max - min))
    return {
      vehiculoId: s.vehiculo === 'bici' ? idDe.bici : idDe.auto,
      fecha: ctx.fecha(s.dia),
      tipo: s.tipo,
      titulo: s.titulo,
      costo,
      odometro: odometro(s.vehiculo, s.dia),
      nota: s.nota,
      ...(esAveria ? { taller: datos.talleres.find((t) => t.clave === 'grua')?.nombre } : {}),
    }
  })

  // El último aceite del coche deja una revisión a la vuelta de la esquina:
  // es lo que enciende el semáforo ámbar del resumen.
  const ultimoAceite = servicios.filter((s) => s.tipo === 'aceite').sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  if (ultimoAceite) {
    ultimoAceite.proximaFecha = sumarDias(ctx.hoy, 22)
    ultimoAceite.proximoOdometro = AUTO_KM.fin + 1500
    ultimoAceite.taller = datos.talleres.find((t) => t.clave === 'taller')?.nombre
  }
  await registrosMantenimientoRepo.bulkAdd(servicios)

  // Poner el coche a punto y la transmisión de la bici: las dos metas del
  // taller, la primera con el plan que ordena los trámites por urgencia.
  await sembrarMetasApp(ctx, 'garage')

  // Los bloques del calendario los proyecta la app al abrirse; en la casa demo
  // esa escritura estaría bloqueada, así que se hace aquí (guard abierto).
  await reconciliarGarage()
}
