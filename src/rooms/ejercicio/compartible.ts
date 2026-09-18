import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoEntrenamiento } from '../../core/data/db'
import {
  gruposCardioRepo,
  gruposFlexRepo,
  gruposFuerzaRepo,
  rutinasCardioRepo,
  rutinasFlexRepo,
  rutinasFuerzaRepo,
} from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { nombreRutina } from './nombres'
import { normalizarEjercicio } from './stats'
import type { RutinaCatalogo } from './TarjetaRutina'

/**
 * Las rutinas que el gimnasio manda por el buzón. Una rutina referencia sus
 * ejercicios POR NOMBRE (no hay claves foráneas), así que viaja entera; si al
 * receptor le faltan ejercicios en su catálogo solo se le avisa: la miniatura y
 * el reproductor degradan solos.
 */

interface RutinaDatos {
  modalidad: TipoEntrenamiento
  nombre: string
  duracionMin: number
  ejercicios: string[]
  descripcion?: string
  enfoque?: string
}

const MODALIDADES: TipoEntrenamiento[] = ['fuerza', 'resistencia', 'flexibilidad']

const repoDe = (m: TipoEntrenamiento) =>
  m === 'fuerza' ? rutinasFuerzaRepo : m === 'flexibilidad' ? rutinasFlexRepo : rutinasCardioRepo

const etiquetaModalidad = (m: TipoEntrenamiento) =>
  m === 'fuerza'
    ? tGlobal('room.ejercicio.cmd.fuerza', 'Fuerza')
    : m === 'flexibilidad'
      ? tGlobal('room.ejercicio.cmd.flexibilidad', 'Flexibilidad')
      : tGlobal('room.ejercicio.cmd.resistencia', 'Resistencia')

const resumen = (d: RutinaDatos) => `${etiquetaModalidad(d.modalidad)} · ${d.duracionMin} min`

function datosDe(modalidad: TipoEntrenamiento, r: RutinaCatalogo & { enfoque?: string }): RutinaDatos {
  return {
    modalidad,
    nombre: r.nombre,
    duracionMin: r.duracionMin,
    ejercicios: r.ejercicios ?? [],
    ...(r.descripcion ? { descripcion: r.descripcion } : {}),
    ...(r.enfoque ? { enfoque: r.enfoque } : {}),
  }
}

export async function empaquetarRutina(modalidad: TipoEntrenamiento, r: RutinaCatalogo): Promise<Paquete> {
  const datos = datosDe(modalidad, r)
  return {
    app: 'ejercicio',
    tipo: 'rutina',
    version: 1,
    nombre: nombreRutina(tGlobal, r.nombre),
    resumen: resumen(datos),
    datos,
  }
}

export async function listarRutinas(): Promise<ItemCompartible[]> {
  const items: ItemCompartible[] = []
  for (const m of MODALIDADES) {
    for (const r of await repoDe(m).list()) {
      if (r.id == null) continue
      items.push({ clave: `rutina:${m}:${r.id}`, nombre: nombreRutina(tGlobal, r.nombre), detalle: resumen(datosDe(m, r)) })
    }
  }
  return items
}

export async function empaquetarRutinaPorClave(clave: string): Promise<Paquete | null> {
  const [, m, idTxt] = clave.split(':')
  const modalidad = MODALIDADES.find((x) => x === m)
  if (!modalidad) return null
  const r = (await repoDe(modalidad).list()).find((x) => x.id === Number(idTxt))
  return r ? empaquetarRutina(modalidad, r) : null
}

/** Nombres de todos los ejercicios del catálogo del receptor, normalizados. */
async function catalogoNombres(modalidad: TipoEntrenamiento): Promise<Set<string>> {
  const repo = modalidad === 'fuerza' ? gruposFuerzaRepo : modalidad === 'flexibilidad' ? gruposFlexRepo : gruposCardioRepo
  const nombres = new Set<string>()
  for (const g of (await repo.list()) as { ejercicios?: unknown }[]) {
    for (const e of Array.isArray(g.ejercicios) ? (g.ejercicios as unknown[]) : []) {
      const n = typeof e === 'string' ? e : (e as { nombre?: unknown })?.nombre
      if (typeof n === 'string') nombres.add(normalizarEjercicio(n))
    }
  }
  return nombres
}

export async function importarRutina(p: Paquete): Promise<{ seccion?: string; aviso?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<RutinaDatos> | null
  if (!d || typeof d.nombre !== 'string' || !Array.isArray(d.ejercicios)) throw new Error('Rutina inválida')
  const modalidad = MODALIDADES.find((x) => x === d.modalidad) ?? 'fuerza'
  const repo = repoDe(modalidad)
  const existente = (await repo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre!))
  if (existente && !(await confirmarDuplicado(nombreRutina(tGlobal, d.nombre)))) return { cancelado: true }
  const ejercicios = d.ejercicios.filter((e): e is string => typeof e === 'string')
  const descripcion = [d.descripcion, p.deAlias ? `@${p.deAlias}` : ''].filter(Boolean).join(' · ') || undefined
  await repo.add({
    nombre: d.nombre,
    duracionMin: Number(d.duracionMin) || 30,
    ejercicios,
    ...(descripcion ? { descripcion } : {}),
    ...(modalidad === 'flexibilidad' && d.enfoque ? { enfoque: d.enfoque } : {}),
    creadoEn: new Date().toISOString(),
  })
  const conocidos = await catalogoNombres(modalidad)
  const faltan = ejercicios.filter((e) => !conocidos.has(normalizarEjercicio(e))).length
  return {
    seccion: modalidad,
    ...(faltan > 0 ? { aviso: tGlobal('buzon.rutina.desconocidos', '{n} ejercicios no están en tu catálogo', { n: faltan }) } : {}),
  }
}
