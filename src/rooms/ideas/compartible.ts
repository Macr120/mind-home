import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { FormaNodo, Idea, MapaIdeas, TipoMapa } from '../../core/data/db'
import { ideasRepo, mapasIdeasRepo, nodosMapaRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { TIPOS_MAPA, defTipo } from './tiposMapa'

/**
 * Lo que Ideas manda por el buzón: una idea (con sus puntos) o un mapa entero
 * (nodos y jerarquía). Los `nodoId` se regeneran al importar: son identidad
 * entre dispositivos del MISMO usuario, no entre casas.
 */

interface IdeaDatos {
  texto: string
  detalle?: string
  tema?: string
  puntos?: { texto: string }[]
  favorita?: boolean
}

interface NodoDatos {
  nodoId: string
  padreId: string | null
  texto: string
  x: number
  y: number
  color?: string
  zona?: string
  forma?: FormaNodo
  peso?: number
}

interface MapaDatos {
  nombre: string
  tipo?: TipoMapa
  color?: string
  nodos: NodoDatos[]
}

// ─── ideas ───────────────────────────────────────────────────────────────────

export async function empaquetarIdea(i: Idea): Promise<Paquete> {
  const datos: IdeaDatos = {
    texto: i.texto,
    ...(i.detalle ? { detalle: i.detalle } : {}),
    ...(i.tema ? { tema: i.tema } : {}),
    ...(i.puntos?.length ? { puntos: i.puntos.map((p) => ({ texto: p.texto })) } : {}),
    ...(i.favorita ? { favorita: true } : {}),
  }
  return {
    app: 'ideas',
    tipo: 'idea',
    version: 1,
    nombre: i.texto,
    resumen: i.puntos?.length ? tGlobal('buzon.idea.puntos', '{n} puntos', { n: i.puntos.length }) : undefined,
    datos,
  }
}

export async function listarIdeas(): Promise<ItemCompartible[]> {
  return (await ideasRepo.list())
    .filter((i) => i.id != null)
    .map((i) => ({ clave: `idea:${i.id}`, nombre: i.texto, detalle: i.tema }))
}

export async function empaquetarIdeaPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const i = (await ideasRepo.list()).find((x) => x.id === id)
  return i ? empaquetarIdea(i) : null
}

export async function importarIdea(p: Paquete): Promise<{ seccion?: string }> {
  const d = p.datos as Partial<IdeaDatos> | null
  if (!d || typeof d.texto !== 'string') throw new Error('Idea inválida')
  const base = Date.now().toString(36)
  await ideasRepo.add({
    texto: d.texto,
    ...(typeof d.detalle === 'string' ? { detalle: d.detalle } : {}),
    ...(typeof d.tema === 'string' ? { tema: d.tema } : {}),
    ...(Array.isArray(d.puntos)
      ? { puntos: d.puntos.filter((x) => typeof x?.texto === 'string').map((x, i) => ({ puntoId: `pt-${base}-${i}`, texto: x.texto })) }
      : {}),
    ...(d.favorita ? { favorita: true } : {}),
    fecha: fechaLocalISO(),
    creadoEn: new Date().toISOString(),
  })
  return { seccion: 'diario' }
}

// ─── mapas y diagramas ───────────────────────────────────────────────────────

const nombreTipo = (tipo: TipoMapa | undefined) => {
  const d = defTipo(tipo)
  return tGlobal(`ideas.tipo.${d.id}`, d.nombreEs)
}

export async function empaquetarMapa(m: MapaIdeas): Promise<Paquete> {
  const nodos = (await nodosMapaRepo.list()).filter((n) => n.mapaId === m.id)
  const datos: MapaDatos = {
    nombre: m.nombre,
    ...(m.tipo ? { tipo: m.tipo } : {}),
    ...(m.color ? { color: m.color } : {}),
    nodos: nodos.map((n) => ({
      nodoId: n.nodoId,
      padreId: n.padreId,
      texto: n.texto,
      x: n.x,
      y: n.y,
      ...(n.color ? { color: n.color } : {}),
      ...(n.zona ? { zona: n.zona } : {}),
      ...(n.forma ? { forma: n.forma } : {}),
      ...(n.peso != null ? { peso: n.peso } : {}),
    })),
  }
  return { app: 'ideas', tipo: 'mapa', version: 1, nombre: m.nombre, resumen: nombreTipo(m.tipo), datos }
}

export async function listarMapas(): Promise<ItemCompartible[]> {
  return (await mapasIdeasRepo.list())
    .filter((m) => m.id != null)
    .map((m) => ({ clave: `mapa:${m.id}`, nombre: m.nombre, detalle: nombreTipo(m.tipo) }))
}

export async function empaquetarMapaPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const m = (await mapasIdeasRepo.list()).find((x) => x.id === id)
  return m ? empaquetarMapa(m) : null
}

export async function importarMapa(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<MapaDatos> | null
  if (!d || typeof d.nombre !== 'string' || !Array.isArray(d.nodos)) throw new Error('Mapa inválido')
  const tipo = TIPOS_MAPA.some((t) => t.id === d.tipo) ? d.tipo : undefined
  const existente = (await mapasIdeasRepo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre!))
  if (existente && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  const ahora = new Date().toISOString()
  const fecha = fechaLocalISO()
  const mapaId = (await mapasIdeasRepo.add({
    nombre: d.nombre,
    ...(tipo ? { tipo } : {}),
    ...(typeof d.color === 'string' ? { color: d.color } : {}),
    fecha,
    creadoEn: ahora,
  })) as number
  // Ids nuevos, padres antes que hijos (el remapeo del padre exige que ya exista).
  const validos = d.nodos.filter((n): n is NodoDatos => !!n && typeof n.nodoId === 'string' && typeof n.texto === 'string')
  const nuevoId = new Map<string, string>()
  for (const n of validos) nuevoId.set(n.nodoId, `nod-${crypto.randomUUID()}`)
  const pendientes = [...validos]
  const hechos = new Set<string>()
  while (pendientes.length) {
    const antes = pendientes.length
    for (let i = 0; i < pendientes.length; i++) {
      const n = pendientes[i]
      const padreListo = n.padreId == null || !nuevoId.has(n.padreId) || hechos.has(n.padreId)
      if (!padreListo) continue
      await nodosMapaRepo.add({
        mapaId,
        nodoId: nuevoId.get(n.nodoId)!,
        padreId: n.padreId != null && nuevoId.has(n.padreId) ? nuevoId.get(n.padreId)! : null,
        texto: n.texto,
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
        ...(typeof n.color === 'string' ? { color: n.color } : {}),
        ...(typeof n.zona === 'string' ? { zona: n.zona } : {}),
        ...(n.forma ? { forma: n.forma } : {}),
        ...(typeof n.peso === 'number' ? { peso: n.peso } : {}),
        fecha,
        creadoEn: ahora,
      })
      hechos.add(n.nodoId)
      pendientes.splice(i, 1)
      i--
    }
    if (pendientes.length === antes) break // ciclo raro: lo que queda se descarta
  }
  return { seccion: defTipo(tipo).familia === 'mapas' ? 'mapas' : 'diagramas', dato: String(mapaId) }
}
