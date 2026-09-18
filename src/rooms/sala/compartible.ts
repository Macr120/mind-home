import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { FilaItinerarioGuardado } from '../../core/data/db'
import { itinerariosGuardadosRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'

/**
 * Los itinerarios que Viajes manda por el buzón: la copia congelada (nombre,
 * contexto y filas por día), la misma que «Guardar» archiva en Itinerarios
 * guardados. Es autocontenida: no arrastra lugares ni rutas.
 */

interface ItinerarioDatos {
  nombre: string
  contexto?: string
  filas: FilaItinerarioGuardado[]
}

const detalleDias = (n: number) => tGlobal('buzon.itinerario.dias', '{n} días', { n })

export async function empaquetarItinerario(it: ItinerarioDatos): Promise<Paquete> {
  const datos: ItinerarioDatos = {
    nombre: it.nombre,
    ...(it.contexto ? { contexto: it.contexto } : {}),
    filas: it.filas.map((f) => ({
      dia: f.dia,
      ...(f.fecha ? { fecha: f.fecha } : {}),
      ...(f.inicio ? { inicio: f.inicio } : {}),
      ...(f.destino ? { destino: f.destino } : {}),
      ...(f.hospedaje ? { hospedaje: f.hospedaje } : {}),
      ...(f.actividades ? { actividades: f.actividades } : {}),
      ...(f.transporte ? { transporte: f.transporte } : {}),
      ...(f.presupuesto ? { presupuesto: f.presupuesto } : {}),
    })),
  }
  return {
    app: 'sala',
    tipo: 'itinerario',
    version: 1,
    nombre: it.nombre,
    resumen: [it.contexto, detalleDias(it.filas.length)].filter(Boolean).join(' · '),
    datos,
  }
}

export async function listarItinerarios(): Promise<ItemCompartible[]> {
  return (await itinerariosGuardadosRepo.list())
    .filter((it) => it.id != null)
    .map((it) => ({ clave: `itinerario:${it.id}`, nombre: it.nombre, detalle: [it.contexto, detalleDias(it.filas.length)].filter(Boolean).join(' · ') }))
}

export async function empaquetarItinerarioPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const it = (await itinerariosGuardadosRepo.list()).find((x) => x.id === id)
  return it ? empaquetarItinerario(it) : null
}

export async function importarItinerario(p: Paquete): Promise<{ seccion?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<ItinerarioDatos> | null
  if (!d || typeof d.nombre !== 'string' || !Array.isArray(d.filas)) throw new Error('Itinerario inválido')
  const existente = (await itinerariosGuardadosRepo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre!))
  if (existente && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  await itinerariosGuardadosRepo.add({
    nombre: d.nombre,
    ...(typeof d.contexto === 'string' ? { contexto: d.contexto } : {}),
    filas: d.filas
      .filter((f): f is FilaItinerarioGuardado => !!f && typeof f.dia === 'number')
      .map((f) => ({
        dia: f.dia,
        ...(typeof f.fecha === 'string' ? { fecha: f.fecha } : {}),
        ...(typeof f.inicio === 'string' ? { inicio: f.inicio } : {}),
        ...(typeof f.destino === 'string' ? { destino: f.destino } : {}),
        ...(typeof f.hospedaje === 'string' ? { hospedaje: f.hospedaje } : {}),
        ...(typeof f.actividades === 'string' ? { actividades: f.actividades } : {}),
        ...(typeof f.transporte === 'string' ? { transporte: f.transporte } : {}),
        ...(typeof f.presupuesto === 'number' ? { presupuesto: f.presupuesto } : {}),
      })),
    creadoEn: new Date().toISOString(),
  })
  return { seccion: 'porConocer' }
}
