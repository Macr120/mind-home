import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { EntradaBiblio } from '../../core/data/db'
import { entradasBiblioRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { PILAR_GENERAL } from './constantes'
import { PILARES } from './pilares'

/**
 * Lo que la Biblioteca manda por el buzón: una entrada de la enciclopedia
 * (resumen, puntos clave e ilustración). Su material son enlaces a hojas, mapas
 * o ideas de la casa de quien la manda, así que no viaja; la charla de origen
 * tampoco.
 *
 * El campo y el tema de fábrica (`pilares.ts`) existen en todas las casas; uno
 * propio no, y entonces la entrada cae en su campo o en el general.
 */

interface EntradaDatos {
  titulo: string
  resumen: string
  puntosClave: string[]
  pilarId: string
  temaId?: string
}

/** Ids de los campos y de todo lo que cuelga de ellos en el índice de fábrica. */
function idsDeFabrica(): Set<string> {
  const ids = new Set<string>([PILAR_GENERAL.id])
  for (const p of PILARES) {
    ids.add(p.id)
    for (const r of p.ramas) {
      ids.add(r.id)
      for (const t of r.temas) ids.add(t.id)
    }
  }
  return ids
}

const detalleEntrada = (e: { puntosClave: string[] }) =>
  e.puntosClave.length ? tGlobal('buzon.entrada.puntos', '{n} puntos clave', { n: String(e.puntosClave.length) }) : undefined

export async function empaquetarEntrada(e: EntradaBiblio): Promise<Paquete> {
  const datos: EntradaDatos = {
    titulo: e.titulo,
    resumen: e.resumen,
    puntosClave: e.puntosClave,
    pilarId: e.pilarId,
    ...(e.temaId ? { temaId: e.temaId } : {}),
  }
  return {
    app: 'biblioteca',
    tipo: 'entrada',
    version: 1,
    nombre: e.titulo,
    resumen: detalleEntrada(e),
    emoji: PILARES.find((p) => p.id === e.pilarId)?.icon ?? '📚',
    datos,
    // `imagen` es una de las claves que el buzón toma como vista previa.
    ...(e.imagen ? { blobs: { imagen: e.imagen } } : {}),
  }
}

export async function listarEntradas(): Promise<ItemCompartible[]> {
  return (await entradasBiblioRepo.list())
    .filter((e) => e.id != null)
    .map((e) => ({ clave: `entrada:${e.id}`, nombre: e.titulo, detalle: detalleEntrada(e) }))
}

export async function empaquetarEntradaPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const e = (await entradasBiblioRepo.list()).find((x) => x.id === id)
  return e ? empaquetarEntrada(e) : null
}

export async function importarEntrada(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<EntradaDatos> | null
  if (!d || typeof d.titulo !== 'string' || typeof d.resumen !== 'string') throw new Error('Entrada inválida')
  const existe = (await entradasBiblioRepo.list()).some((x) => normalizar(x.titulo) === normalizar(d.titulo!))
  if (existe && !(await confirmarDuplicado(d.titulo))) return { cancelado: true }
  const fabrica = idsDeFabrica()
  const pilarId = typeof d.pilarId === 'string' && fabrica.has(d.pilarId) ? d.pilarId : PILAR_GENERAL.id
  const ahora = new Date().toISOString()
  const id = (await entradasBiblioRepo.add({
    pilarId,
    ...(d.temaId && fabrica.has(d.temaId) && pilarId !== PILAR_GENERAL.id ? { temaId: d.temaId } : {}),
    titulo: d.titulo,
    resumen: d.resumen,
    puntosClave: Array.isArray(d.puntosClave) ? d.puntosClave.filter((x): x is string => typeof x === 'string') : [],
    ...(p.blobs?.imagen ? { imagen: p.blobs.imagen } : {}),
    creadoEn: ahora,
    actualizadoEn: ahora,
  })) as number
  return { seccion: 'enciclopedia', dato: `entrada:${id}` }
}
