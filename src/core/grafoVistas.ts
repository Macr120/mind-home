import { getPlantilla } from './appContrato'
import { useBuzon } from './buzon/buzonStore'
import { nombreAsistente } from './chat/mascotas'
import { db } from './data/db'
import { categoriasLugarRepo, lugaresNavRepo, lugaresViajeRepo } from './data/repository'
import { abrirEnlace } from './enlaces'
import type { Espacio, EspacioCache, TipoEspacio } from './espacios/tipos'
import { filasNodo, type NodoEntidadApp } from './grafoApps'
import { normalizar, refApp, refNodo, type RefNodo } from './grafo/memoria'
import { tGlobal } from './i18n/useT'
import { categoriaDe, categoriasVisibles } from './navegador/categoriasWeb'
import { segundosDe, sitioDeVisita } from './navegador/estadisticas'
import { useAsistentes } from './state/asistentesStore'
import { traerAsistente } from './chat/chatsAsistentes'
import { useMascota } from './state/mascotaStore'
import { useOrdenRuta } from '../rooms/sala/navegacion/ordenRuta'

/**
 * Los nodos de las cuatro vistas del chat para el grafo de memoria: cada
 * asistente con sus apps, los amigos con lo que se compartieron y sus espacios,
 * los lugares guardados con su categoría (y los viajes por país) y los sitios
 * web con su categoría. Todo sale de datos que ya están en el dispositivo; no
 * se pide nada al servidor.
 *
 * Lo carga `grafoApps.nodosDeApps` con import diferido (este módulo tira del
 * buzón, los asistentes y el navegador, y aquel lo importan los cuartos).
 */

const COLOR_AMIGO = '#f472b6'
const COLOR_ESPACIO = '#38bdf8'
const COLOR_PAIS = '#14b8a6'

/** Sitios web que entran al grafo: los de más tiempo en los últimos 30 días. */
const MAX_SITIOS = 40
/** Un lugar guardado y uno de viaje a menos de esto son el mismo sitio (km). */
const CERCA_KM = 25

/** La app de cada tipo de espacio compartido (el calendario no es una app). */
const APP_DE_ESPACIO: Record<TipoEspacio, string | null> = {
  calendario: null,
  documento: 'escritura',
  dibujo: 'arte',
  audio: 'audio',
  video: 'video',
}
const EMOJI_ESPACIO: Record<TipoEspacio, string> = {
  calendario: '📅',
  documento: '📝',
  dibujo: '🎨',
  audio: '🎵',
  video: '🎬',
}

export async function nodosVistas(deApps: readonly NodoEntidadApp[]): Promise<NodoEntidadApp[]> {
  const partes = await Promise.all([asistentes(), amigosYEspacios(deApps), lugares(), sitiosWeb()])
  return partes.flat()
}

function asistentes(): NodoEntidadApp[] {
  return useAsistentes.getState().lista.map((a) => ({
    ref: refNodo('asistente', a.id),
    tipo: 'asistente',
    titulo: nombreAsistente(tGlobal, a),
    emoji: a.emoji,
    color: a.color,
    // Las apps de las que responde; sin ninguna, responde de todas y no se enlaza.
    enlaces: a.cuartos.filter((id) => getPlantilla(id)).map(refApp),
    abrir: () => {
      void traerAsistente(a.id)
      useMascota.getState().abrirConversacion(a.id)
    },
  }))
}

async function amigosYEspacios(deApps: readonly NodoEntidadApp[]): Promise<NodoEntidadApp[]> {
  const [contactos, compartidos, espacios] = await Promise.all([
    db._buzonContactos.toArray(),
    db._buzonMensajes.filter((m) => m.tipo === 'contenido' && !!m.contenido).toArray(),
    db._espacios.toArray(),
  ])
  const amigos = contactos.filter((c) => c.estado === 'aceptado' && !c.bloqueadoPorMi)
  const porHilo = new Map(amigos.flatMap((c) => (c.hiloId ? [[c.hiloId, c] as const] : [])))
  const porAlias = new Map(amigos.map((c) => [c.alias, c]))

  // Lo que se compartieron: la app de donde salió y, si coincide el nombre, la
  // receta o la idea concreta.
  const titulos = new Map<string, RefNodo>()
  for (const e of deApps) titulos.set(`${e.appId ?? ''}|${normalizar(e.titulo)}`, e.ref)
  const vecinos = new Map<string, Set<RefNodo>>()
  const sumar = (contactoId: string, ref: RefNodo) => {
    const s = vecinos.get(contactoId) ?? new Set<RefNodo>()
    s.add(ref)
    vecinos.set(contactoId, s)
  }
  for (const m of compartidos) {
    const c = porHilo.get(m.hiloId)
    const cont = m.contenido
    if (!c || !cont) continue
    if (getPlantilla(cont.app)) sumar(c.contactoId, refApp(cont.app))
    const cosa = titulos.get(`${cont.app}|${normalizar(cont.nombre)}`)
    if (cosa) sumar(c.contactoId, cosa)
  }
  // El amigo que también está en la agenda con el mismo nombre.
  for (const c of amigos) {
    const persona = deApps.find((e) => e.tipo === 'persona' && normalizar(e.titulo) === normalizar(c.nombre))
    if (persona) sumar(c.contactoId, persona.ref)
  }

  const nodosAmigos = amigos.map(
    (c): NodoEntidadApp => ({
      ref: refNodo('amigo', c.contactoId),
      tipo: 'amigo',
      titulo: c.nombre || c.alias,
      alias: [c.alias, c.nombre.trim().split(/\s+/)[0] ?? ''].filter((x) => x && x !== c.nombre),
      resumen: `amigo en MindHaOS (@${c.alias})`,
      emoji: c.emoji,
      color: COLOR_AMIGO,
      enlaces: [...(vecinos.get(c.contactoId) ?? [])],
      abrir: c.hiloId ? () => useBuzon.getState().abrirHilo(c.hiloId ?? '') : undefined,
    }),
  )

  const nodosEspacios = espacios.map((e: EspacioCache): NodoEntidadApp => {
    const app = APP_DE_ESPACIO[e.tipo]
    const dueno = porAlias.get(e.duenoAlias)
    return {
      ref: refNodo('espacio', e.espacioId),
      tipo: 'espacio',
      titulo: e.titulo,
      resumen: `espacio compartido de @${e.duenoAlias}`,
      emoji: EMOJI_ESPACIO[e.tipo],
      color: COLOR_ESPACIO,
      enlaces: [
        ...(app && getPlantilla(app) ? [refApp(app)] : []),
        ...(dueno ? [refNodo('amigo', dueno.contactoId)] : []),
      ],
      abrir: () => void import('./espacios/enlaces').then((m) => m.aterrizar(e as Espacio)),
    }
  })

  return [...nodosAmigos, ...nodosEspacios]
}

/** Distancia en km entre dos coordenadas (haversine). */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

async function lugares(): Promise<NodoEntidadApp[]> {
  const [guardados, categorias, viajes] = await Promise.all([
    filasNodo(lugaresNavRepo),
    filasNodo(categoriasLugarRepo),
    filasNodo(lugaresViajeRepo),
  ])
  const catPorId = new Map(categorias.map((c) => [c.id, c]))
  const usadas = new Set<number>()

  const nodos: NodoEntidadApp[] = guardados.map((l) => {
    const cat = l.categoriaId != null ? catPorId.get(l.categoriaId) : undefined
    if (cat?.id != null) usadas.add(cat.id)
    const cercanos = viajes.filter(
      (v) => v.lat != null && v.lng != null && km(l, { lat: v.lat, lng: v.lng }) < CERCA_KM,
    )
    return {
      ref: refNodo('ubicacion', l.uid),
      tipo: 'ubicacion',
      titulo: l.nombre,
      resumen: l.detalle ? `lugar guardado: ${l.detalle}` : 'lugar guardado',
      emoji: '📍',
      color: cat?.color,
      enlaces: [
        ...(cat ? [refNodo('categoria', `lugar-${cat.uid}`)] : []),
        ...cercanos.map((v) => refNodo('lugar', v.uid)),
      ],
      // «Cómo llegar» reconoce los lugares guardados por su nombre.
      abrir: () => useOrdenRuta.getState().pedirRuta(l.nombre),
    }
  })

  for (const c of categorias) {
    if (c.id == null || !usadas.has(c.id)) continue
    nodos.push({ ref: refNodo('categoria', `lugar-${c.uid}`), tipo: 'categoria', titulo: c.nombre, emoji: '🏷️', color: c.color })
  }

  // Los viajes, agrupados por país (los nodos de cada viaje los aporta la sala).
  const porPais = new Map<string, { nombre: string; refs: RefNodo[] }>()
  for (const v of viajes) {
    if (!v.pais?.trim()) continue
    const clave = normalizar(v.pais.trim())
    const p = porPais.get(clave) ?? { nombre: v.pais.trim(), refs: [] }
    p.refs.push(refNodo('lugar', v.uid))
    porPais.set(clave, p)
  }
  for (const [clave, p] of porPais) {
    nodos.push({
      ref: refNodo('categoria', `pais-${clave}`),
      tipo: 'categoria',
      titulo: p.nombre,
      emoji: '🌍',
      color: COLOR_PAIS,
      enlaces: p.refs,
    })
  }
  return nodos
}

async function sitiosWeb(): Promise<NodoEntidadApp[]> {
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [visitas, fichas, propias] = await Promise.all([
    db.visitasWeb.where('inicio').aboveOrEqual(desde).toArray(),
    db.sitiosWeb.toArray(),
    db.categoriasWeb.toArray(),
  ])
  const segundos = new Map<string, number>()
  for (const v of visitas) {
    const host = sitioDeVisita(v)
    segundos.set(host, (segundos.get(host) ?? 0) + segundosDe(v))
  }
  const fichaDe = new Map(fichas.map((f) => [f.host, f]))
  const hosts = new Set([...segundos.keys(), ...fichas.filter((f) => f.favorito).map((f) => f.host)])
  const elegidos = [...hosts]
    .sort((a, b) => (segundos.get(b) ?? 0) - (segundos.get(a) ?? 0))
    .slice(0, MAX_SITIOS)

  const categorias = new Map(categoriasVisibles(propias, tGlobal).map((c) => [c.clave, c]))
  const usadas = new Set<string>()
  const nodos: NodoEntidadApp[] = elegidos.map((host) => {
    const ficha = fichaDe.get(host)
    const clave = categoriaDe(host, ficha)
    const cat = categorias.get(clave)
    usadas.add(clave)
    const min = Math.round((segundos.get(host) ?? 0) / 60)
    const nombre = ficha?.nombre || host
    return {
      ref: refNodo('web', host),
      tipo: 'web',
      titulo: nombre,
      // «youtube.com» también se nombra «youtube».
      alias: [host, host.split('.')[0] ?? ''].filter((x) => x && x !== nombre),
      resumen: `sitio web · ${cat?.nombre ?? clave} · ${min} min en 30 días${ficha?.favorito ? ' · favorito' : ''}`,
      emoji: '🌐',
      color: cat?.color,
      enlaces: [refNodo('categoria', `web-${clave}`)],
      abrir: () => void abrirEnlace(`https://${host}`, nombre),
    }
  })
  for (const clave of usadas) {
    const cat = categorias.get(clave)
    nodos.push({
      ref: refNodo('categoria', `web-${clave}`),
      tipo: 'categoria',
      titulo: cat?.nombre ?? clave,
      emoji: cat?.emoji ?? '🏷️',
      color: cat?.color,
    })
  }
  return nodos
}
