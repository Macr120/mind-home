import { db } from '../data/db'
import { tGlobal } from '../i18n/useT'
import { categoriaDe, categoriasVisibles } from './categoriasWeb'
import { porCategoria, porSitio, type EnCurso } from './estadisticas'

/**
 * Límites diarios por sitio y por categoría (`limiteMin`): al cruzarlos, el
 * asistente avisa UNA vez al día por clave y la tira/lista lo marcan. Nunca
 * bloquea: eso es el modo foco.
 */

export interface Exceso {
  tipo: 'sitio' | 'categoria'
  clave: string
  nombre: string
  limiteMin: number
  min: number
}

/** Clave estable de un exceso, para las marcas y los avisos. */
export function claveExceso(e: Pick<Exceso, 'tipo' | 'clave'>): string {
  return `${e.tipo}:${e.clave}`
}

function inicioHoyISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

/** Los límites superados HOY (con los segundos vivos de la visita abierta). */
export async function excesosDeHoy(enCurso: EnCurso | null): Promise<Exceso[]> {
  const visitas = await db.visitasWeb.where('inicio').aboveOrEqual(inicioHoyISO()).toArray()
  if (!visitas.length) return []
  const sitios = await db.sitiosWeb.toArray()
  const fichas = new Map(sitios.map((s) => [s.host, s]))
  const propias = await db.categoriasWeb.toArray()
  const cats = categoriasVisibles(propias, tGlobal)
  const porClaveCat = new Map(cats.map((c) => [c.clave, c]))
  const out: Exceso[] = []
  for (const r of porSitio(visitas, enCurso)) {
    const f = fichas.get(r.sitio)
    if (f?.limiteMin && r.seg >= f.limiteMin * 60) {
      out.push({ tipo: 'sitio', clave: r.sitio, nombre: f.nombre || r.sitio, limiteMin: f.limiteMin, min: Math.round(r.seg / 60) })
    }
  }
  for (const c of porCategoria(visitas, (sitio) => categoriaDe(sitio, fichas.get(sitio)), enCurso)) {
    const cat = porClaveCat.get(c.clave)
    if (cat?.limiteMin && c.seg >= cat.limiteMin * 60) {
      out.push({ tipo: 'categoria', clave: c.clave, nombre: cat.nombre, limiteMin: cat.limiteMin, min: Math.round(c.seg / 60) })
    }
  }
  return out
}

const LS_AVISADO = 'mh.nav.avisado'

/** De los excesos, los que aún no se avisaron hoy; los marca como avisados. */
export function sinAvisarHoy(excesos: Exceso[]): Exceso[] {
  const hoy = new Date().toDateString()
  let marcas: Record<string, string> = {}
  try {
    marcas = JSON.parse(localStorage.getItem(LS_AVISADO) || '{}') as Record<string, string>
  } catch {
    marcas = {}
  }
  const nuevos = excesos.filter((e) => marcas[claveExceso(e)] !== hoy)
  if (nuevos.length) {
    // Solo las marcas de hoy: las de otros días sobran.
    const limpio: Record<string, string> = {}
    for (const [k, v] of Object.entries(marcas)) if (v === hoy) limpio[k] = v
    for (const e of nuevos) limpio[claveExceso(e)] = hoy
    localStorage.setItem(LS_AVISADO, JSON.stringify(limpio))
  }
  return nuevos
}

/** Frase del asistente para un exceso. */
export function fraseExceso(e: Exceso): string {
  return tGlobal('nav.limite.aviso', 'Llevas {min} min hoy en {n}: pasaste tu límite de {l} min.', {
    min: e.min,
    n: e.nombre,
    l: e.limiteMin,
  })
}
