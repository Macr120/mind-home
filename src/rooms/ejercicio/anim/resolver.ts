import { estatico, resolverPatron, sostenido, type PatronResuelto } from './pose'
import { PATRONES } from './patrones'
import { POSTURAS } from './posturas'
import { MAPA, type EntradaMapa } from './mapa'
import { slugTexto } from '../slug'

const cache = new Map<string, PatronResuelto | null>()

function construir(e: EntradaMapa | undefined): PatronResuelto | null {
  if (!e) return null
  if ('patron' in e) return resolverPatron(PATRONES[e.patron], e.variante)
  const pose = e.pose ? { ...POSTURAS[e.postura], ...e.pose } : POSTURAS[e.postura]
  const extra = {
    periodo: e.periodo,
    alterno: e.alterno,
    utiles: e.utiles,
    apoyo: e.apoyo,
    camara: e.camara,
    respiracion: e.respiracion,
  }
  return resolverPatron(e.modo === 'estatico' ? estatico(pose, extra) : sostenido(pose, extra))
}

/** Patrón resuelto (canales numéricos) del ejercicio, o null si no tiene animación. */
export function patronDe(nombre: string): PatronResuelto | null {
  const slug = slugTexto(nombre)
  let r = cache.get(slug)
  if (r === undefined) {
    r = construir(MAPA[slug])
    cache.set(slug, r)
  }
  return r
}
