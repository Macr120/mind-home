import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { archivosNubeRepo, carpetasArchivoRepo } from '../../core/data/repository'
import type { CarpetaArchivo } from '../../core/data/db'
import { getPlantilla } from '../../core/appContrato'
import { abrirApp } from '../../core/abrirApp'
import { esDemo, tieneAcceso } from '../../core/edicion'
import { esAppNativa } from '../../core/plataforma'
import { hayBackend } from '../../core/cuenta/supabase'
import { useSesion } from '../../core/cuenta/sesionStore'
import { purgarPapelera } from '../../core/cuenta/papelera'
import { useArrastre } from '../../core/ui/comun/arrastre'
import { useDiseño, esObjetoLibreria } from '../../core/state/disenoStore'
import { tabInicial } from '../../core/state/intencionApp'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { BotonSecundario, INPUT, TARJETA, Vacio } from '../_shared/ui'
import {
  aPapelera,
  borrarParaSiempre,
  carpetaDeCuarto,
  conExtension,
  conRutas,
  crearCarpeta,
  descargar,
  descendencia,
  destacar,
  entradasSoltadas,
  leerEntradas,
  mensajeDeError,
  mover,
  raicesPapelera,
  renombrarArchivo,
  renombrarCarpeta,
  restaurar,
  subirArchivos,
  subirConRutas,
  type Abrible,
  type Seleccion,
} from './acciones'
import { FUENTES, useElementos } from './fuentes'
import {
  DESTINO_DESTACADOS,
  DESTINO_MIA,
  DESTINO_PAPELERA,
  appsSinCuarto,
  destinoCuarto,
  esReal,
  nombreDe,
  normalizar,
  ordenar,
  useCuartosArchivo,
  type Item,
  type Orden,
  type Ubicacion,
} from './modelo'
import { Compartir } from './Compartir'
import { Lateral } from './Lateral'
import { Medidor } from './Medidor'
import { MenuArchivo, type OpcionMenu } from './MenuArchivo'
import { MoverA } from './MoverA'
import { Subidas } from './Subidas'
import { Vista, type ModoVista } from './Vista'
import { Visor, type BotonVisor } from './Visor'

/**
 * El cuarto Archivo: la nube del usuario (Pro), con la forma de Google Drive.
 * Menú a la izquierda (Mi Archivo, los cuartos de la casa, Recientes,
 * Destacados, Papelera), cuadrícula o lista, selección múltiple, menú con clic
 * derecho y arrastrar y soltar: lo de dentro con el gesto de la casa (vale en
 * táctil) y lo que llega del sistema con el drag & drop del navegador.
 *
 * Los bytes viven en Cloudflare R2; aquí solo se leen sus metadatos, que el sync
 * reparte. Cada cuarto enseña además lo que su app ya guarda (`fuentes.ts`).
 */

const LS_VISTA = 'mh.archivos.vista'
const LS_ORDEN = 'mh.archivos.orden'
const SECCIONES = ['archivos', 'recientes', 'studio', 'destacados', 'papelera'] as const

function leerLS(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function guardarLS(k: string, v: string): void {
  try {
    localStorage.setItem(k, v)
  } catch {
    // Sin almacenamiento (ventana privada): la preferencia dura la sesión.
  }
}

function ordenInicial(): Orden {
  const [por, dir] = (leerLS(LS_ORDEN) ?? '').split(':')
  return { por: por === 'fecha' || por === 'tamano' ? por : 'nombre', asc: dir !== 'desc' }
}

/** Sección pedida por el chat (`abre archivos del studio`…) o Mi Archivo. */
function ubicacionInicial(): Ubicacion {
  const s = tabInicial('archivos', SECCIONES, 'archivos')
  if (s === 'recientes' || s === 'destacados' || s === 'papelera') return { tipo: s }
  if (s === 'studio') {
    const video = useDiseño.getState().objetos.find((o) => o.plantillaId === 'video' && !esObjetoLibreria(o))
    return video ? { tipo: 'cuarto', cuartoId: video.roomId, carpetaId: null } : { tipo: 'otras', appId: 'video' }
  }
  return { tipo: 'mia', carpetaId: null }
}

const puedeSubirCarpetas = () => !esAppNativa() && 'webkitdirectory' in document.createElement('input')

export function ArchivosApp() {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  // Leído para repintar cuando cambia el plan; el gate en sí es `tieneAcceso()`.
  useSesion((s) => s.plan)

  if (esDemo() || !hayBackend()) {
    return <Vacio icono="nube" titulo={t('archivos.demo.titulo', 'La demo no sube archivos')} sub={t('archivos.demo.sub', 'En tu casa, con Pro, aquí guardas tus archivos en la nube y los abres desde cualquier dispositivo.')} />
  }
  if (!usuario) {
    return <Vacio icono="nube" titulo={t('archivos.sinSesion.titulo', 'Inicia sesión para usar tu Archivo')} sub={t('archivos.sinSesion.sub', 'Tus archivos viven en tu cuenta, no en este dispositivo.')} />
  }
  return <Explorador puedeSubir={tieneAcceso()} />
}

function Explorador({ puedeSubir }: { puedeSubir: boolean }) {
  const t = useT()
  const carpetas = carpetasArchivoRepo.useAll()
  const archivos = archivosNubeRepo.useAll()
  const cuartos = useCuartosArchivo()
  const [ubi, setUbi] = useState<Ubicacion>(ubicacionInicial)
  const [sel, setSel] = useState<Set<string>>(() => new Set())
  const [ancla, setAncla] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [modo, setModo] = useState<ModoVista>(() => (leerLS(LS_VISTA) === 'lista' ? 'lista' : 'rejilla'))
  const [orden, setOrden] = useState<Orden>(ordenInicial)
  const [abierto, setAbierto] = useState<{ a: Abrible; item: Item } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; opciones: OpcionMenu[] } | null>(null)
  const [moviendo, setMoviendo] = useState<Seleccion | null>(null)
  const [compartiendo, setCompartiendo] = useState<{ clave: string; nombre: string } | null>(null)
  const [soltarSO, setSoltarSO] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const entradaArchivos = useRef<HTMLInputElement>(null)
  const entradaCarpeta = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void purgarPapelera()
  }, [])

  const todas: Seleccion = useMemo(() => ({ carpetas: carpetas ?? [], archivos: archivos ?? [] }), [carpetas, archivos])
  const vivas = useMemo(() => todas.carpetas.filter((c) => !c.borradoEn), [todas])
  const vivos = useMemo(() => todas.archivos.filter((a) => !a.borradoEn), [todas])
  const porId = useMemo(() => new Map(todas.carpetas.map((c) => [c.id!, c])), [todas])
  const cuartoPorId = useMemo(() => new Map(cuartos.map((c) => [c.cuarto.id, c])), [cuartos])
  /** Las carpetas raíz de cada cuarto que existe (más de una si dos dispositivos la crearon a la vez). */
  const carpetasDeCuarto = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const c of vivas) if (c.cuartoId && c.padreId == null && cuartoPorId.has(c.cuartoId)) m.set(c.cuartoId, [...(m.get(c.cuartoId) ?? []), c.id!])
    return m
  }, [vivas, cuartoPorId])
  const esDeCuarto = (c: CarpetaArchivo) => c.padreId == null && !!c.cuartoId && cuartoPorId.has(c.cuartoId)
  const cuenta = useMemo(() => {
    const m = new Map<number, number>()
    for (const c of vivas) if (c.padreId != null) m.set(c.padreId, (m.get(c.padreId) ?? 0) + 1)
    for (const a of vivos) if (a.carpetaId != null) m.set(a.carpetaId, (m.get(a.carpetaId) ?? 0) + 1)
    return m
  }, [vivas, vivos])

  const otras = useMemo(() => appsSinCuarto(cuartos), [cuartos])
  const appDeUbi = ubi.tipo === 'cuarto' ? cuartoPorId.get(ubi.cuartoId)?.appId : ubi.tipo === 'otras' ? ubi.appId : undefined
  const fuentesVisibles = useMemo(() => {
    if (ubi.tipo === 'cuarto' && ubi.carpetaId == null) return (appDeUbi && FUENTES[appDeUbi]) || []
    if (ubi.tipo === 'otras') return ubi.appId ? (FUENTES[ubi.appId] ?? []) : otras.flatMap((a) => FUENTES[a])
    return []
  }, [ubi, appDeUbi, otras])
  const elementos = useElementos(fuentesVisibles)

  const nombreApp = (appId: string) => t(`room.${appId}.nombre`, getPlantilla(appId)?.nombre ?? appId).split(' · ')[0]
  const tituloFuente = (clave: string) => {
    const f = Object.values(FUENTES).flat().find((x) => x.clave === clave)
    return f ? t(`archivos.fuente.${f.clave}`, f.titulo) : clave
  }

  /** De la carpeta hacia arriba, sin pasar de 50 niveles. */
  const cadena = (id: number | null): CarpetaArchivo[] => {
    const r: CarpetaArchivo[] = []
    let c = id != null ? porId.get(id) : undefined
    while (c && r.length < 50) {
      r.unshift(c)
      c = c.padreId != null ? porId.get(c.padreId) : undefined
    }
    return r
  }
  /** Dónde vive una carpeta: en Mi Archivo o dentro de un cuarto (su raíz lo decide). */
  const ubicacionDe = (carpetaId: number | null): Ubicacion => {
    const [raiz] = cadena(carpetaId)
    if (raiz && esDeCuarto(raiz)) return { tipo: 'cuarto', cuartoId: raiz.cuartoId!, carpetaId: raiz.id === carpetaId ? null : carpetaId }
    return { tipo: 'mia', carpetaId }
  }
  const rutaTexto = (carpetaId: number | null): string => {
    const c = cadena(carpetaId)
    const inicio = c[0] && esDeCuarto(c[0]) ? [cuartoPorId.get(c[0].cuartoId!)!.nombre, ...c.slice(1)] : [t('archivos.raiz', 'Mi Archivo'), ...c]
    return inicio.map((x) => (typeof x === 'string' ? x : x.nombre)).join(' › ')
  }

  const itemCarpeta = (c: CarpetaArchivo): Item => ({ k: `c:${c.id}`, tipo: 'carpeta', carpeta: c, n: cuenta.get(c.id!) ?? 0 })
  const q = normalizar(busca.trim())

  let items: Item[]
  if (ubi.tipo === 'mia') {
    const enTodo = !!q
    items = [
      ...vivas.filter((c) => !esDeCuarto(c) && (enTodo || c.padreId === ubi.carpetaId)).map(itemCarpeta),
      ...vivos.filter((a) => enTodo || a.carpetaId === ubi.carpetaId).map((a): Item => ({ k: `a:${a.id}`, tipo: 'archivo', archivo: a })),
    ]
  } else if (ubi.tipo === 'cuartos') {
    items = cuartos.map((c) => ({
      k: `v:cuarto:${c.cuarto.id}`,
      tipo: 'virtual',
      nombre: c.nombre,
      icono: 'cuartos',
      cuarto: c.cuarto,
      ir: { tipo: 'cuarto', cuartoId: c.cuarto.id, carpetaId: null },
      destino: destinoCuarto(c.cuarto.id),
    }))
  } else if (ubi.tipo === 'cuarto' || ubi.tipo === 'otras') {
    const fuente = ubi.fuente
    if (fuente) {
      items = (elementos?.get(fuente) ?? []).map((e) => ({ k: e.llave, tipo: 'app', elem: e }))
    } else if (ubi.tipo === 'cuarto' && ubi.carpetaId != null) {
      const id = ubi.carpetaId
      items = [
        ...vivas.filter((c) => c.padreId === id).map(itemCarpeta),
        ...vivos.filter((a) => a.carpetaId === id).map((a): Item => ({ k: `a:${a.id}`, tipo: 'archivo', archivo: a })),
      ]
    } else if (ubi.tipo === 'otras' && !ubi.appId) {
      // Solo las apps que de verdad guardan algo: las demás serían carpetas vacías.
      items = otras.flatMap((a): Item[] => {
        const n = FUENTES[a].reduce((s, f) => s + (elementos?.get(f.clave)?.length ?? 0), 0)
        return n ? [{ k: `v:app:${a}`, tipo: 'virtual', nombre: nombreApp(a), icono: 'rejilla', n, ir: { tipo: 'otras', appId: a } }] : []
      })
    } else {
      const deFuentes = fuentesVisibles.flatMap((f): Item[] => {
        const n = elementos?.get(f.clave)?.length ?? 0
        return n ? [{ k: `v:f:${f.clave}`, tipo: 'virtual', nombre: t(`archivos.fuente.${f.clave}`, f.titulo), icono: f.icono, n, ir: { ...ubi, fuente: f.clave } }] : []
      })
      const raices = ubi.tipo === 'cuarto' ? (carpetasDeCuarto.get(ubi.cuartoId) ?? []) : []
      items = [
        ...deFuentes,
        ...vivas.filter((c) => c.padreId != null && raices.includes(c.padreId)).map(itemCarpeta),
        ...vivos.filter((a) => a.carpetaId != null && raices.includes(a.carpetaId)).map((a): Item => ({ k: `a:${a.id}`, tipo: 'archivo', archivo: a })),
      ]
    }
  } else if (ubi.tipo === 'recientes') {
    items = [...vivos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, 50).map((a) => ({ k: `a:${a.id}`, tipo: 'archivo', archivo: a }))
  } else if (ubi.tipo === 'destacados') {
    items = [
      ...vivas.filter((c) => c.destacado).map(itemCarpeta),
      ...vivos.filter((a) => a.destacado).map((a): Item => ({ k: `a:${a.id}`, tipo: 'archivo', archivo: a })),
    ]
  } else {
    const r = raicesPapelera(todas.carpetas, todas.archivos)
    items = [...r.carpetas.map(itemCarpeta), ...r.archivos.map((a): Item => ({ k: `a:${a.id}`, tipo: 'archivo', archivo: a }))]
  }
  if (q) items = items.filter((i) => normalizar(nombreDe(i)).includes(q))
  if (ubi.tipo !== 'recientes') items = ordenar(items, orden)

  const reales = items.filter(esReal)
  const enPapelera = ubi.tipo === 'papelera'
  const seleccion: Seleccion = {
    carpetas: reales.flatMap((i) => (i.tipo === 'carpeta' && sel.has(i.k) ? [i.carpeta] : [])),
    archivos: reales.flatMap((i) => (i.tipo === 'archivo' && sel.has(i.k) ? [i.archivo] : [])),
  }
  /** Lo que se lleva un gesto sobre `k`: la selección entera si `k` está en ella. */
  const seleccionDe = (k: string): Seleccion => {
    if (sel.has(k)) return seleccion
    const i = reales.find((x) => x.k === k)
    return { carpetas: i?.tipo === 'carpeta' ? [i.carpeta] : [], archivos: i?.tipo === 'archivo' ? [i.archivo] : [] }
  }

  const ir = (u: Ubicacion) => {
    setUbi(u)
    setSel(new Set())
    setBusca('')
    setError(null)
  }

  const intentar = async (f: () => Promise<void>) => {
    setError(null)
    try {
      await f()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  /** Carpeta real a la que va lo que cae en un destino (`data-destino`). */
  const resolverDestino = async (d: string): Promise<number | null> => {
    if (d.startsWith('carpeta:')) return Number(d.slice('carpeta:'.length))
    if (d.startsWith('cuarto:')) {
      const id = d.slice('cuarto:'.length)
      return carpetaDeCuarto(id, cuartoPorId.get(id)?.nombre ?? id)
    }
    return null
  }
  /** Carpeta de la ubicación actual (lo que se crea o sube «aquí»). */
  const destinoAqui = async (): Promise<number | null> => {
    if (ubi.tipo === 'mia') return ubi.carpetaId
    if (ubi.tipo === 'cuarto') return ubi.carpetaId ?? resolverDestino(destinoCuarto(ubi.cuartoId))
    return null
  }

  // --- Acciones sobre la selección -------------------------------------------

  const alPapelera = (s: Seleccion) =>
    intentar(async () => {
      await aPapelera(s, todas)
      setSel(new Set())
    })
  const borrarSiempre = async (s: Seleccion) => {
    const n = s.carpetas.length + s.archivos.length
    const ok = await confirmar({
      titulo: t('archivos.borrarSiempre.titulo', '¿Borrar para siempre?'),
      mensaje: t('archivos.borrarSiempre.msg', 'Se borran {n} elementos de la nube y de todos tus dispositivos. No se puede deshacer.', { n }),
      textoOk: t('archivos.borrarSiempre', 'Borrar para siempre'),
      peligro: true,
    })
    if (ok)
      await intentar(async () => {
        await borrarParaSiempre(s, todas)
        setSel(new Set())
      })
  }
  const vaciarPapelera = () => borrarSiempre(raicesPapelera(todas.carpetas, todas.archivos))
  const restaurarSel = (s: Seleccion) =>
    intentar(async () => {
      await restaurar(s, todas)
      setSel(new Set())
    })
  const descargarSel = (s: Seleccion) => intentar(async () => {
    for (const a of s.archivos) await descargar(a)
  })
  const destacarSel = (s: Seleccion, v: boolean) => intentar(() => destacar(s, v))
  const renombrar = async (i: Item) => {
    if (i.tipo !== 'carpeta' && i.tipo !== 'archivo') return
    const actual = nombreDe(i)
    const nombre = await pedirTexto({ titulo: t('archivos.renombrar', 'Renombrar'), valor: actual, textoOk: t('archivos.guardar', 'Guardar') })
    if (!nombre?.trim() || nombre.trim() === actual) return
    await intentar(() => (i.tipo === 'carpeta' ? renombrarCarpeta(i.carpeta, nombre.trim()) : renombrarArchivo(i.archivo, nombre.trim())))
  }
  const nuevaCarpeta = async () => {
    const nombre = await pedirTexto({
      titulo: t('archivos.nuevaCarpeta', 'Nueva carpeta'),
      mensaje: t('archivos.nombreCarpeta', 'Nombre de la carpeta'),
      textoOk: t('archivos.crear', 'Crear'),
    })
    if (nombre?.trim()) await intentar(async () => void (await crearCarpeta(nombre.trim(), await destinoAqui())))
  }
  const moverA = (d: string) => {
    const s = moviendo
    setMoviendo(null)
    if (s)
      void intentar(async () => {
        await mover(s, await resolverDestino(d), todas)
        setSel(new Set())
      })
  }

  const abrir = (i: Item) => {
    if (i.tipo === 'carpeta') ir(ubicacionDe(i.carpeta.id!))
    else if (i.tipo === 'virtual') ir(i.ir)
    else if (i.tipo === 'archivo') setAbierto({ a: i.archivo, item: i })
    else setAbierto({ a: { ...i.elem, clave: i.elem.nube?.clave }, item: i })
  }

  // --- Menú contextual --------------------------------------------------------

  /** Compartir solo lo que tiene copia en R2, y solo con plan (el servidor lo vuelve a mirar). */
  const opcionCompartir = (clave: string | undefined, nombre: string): OpcionMenu[] =>
    clave && puedeSubir ? [{ icono: 'compartir', texto: t('archivos.compartir', 'Compartir'), onClick: () => setCompartiendo({ clave, nombre }) }] : []

  const opcionesDe = (i: Item): OpcionMenu[] => {
    const abrirO: OpcionMenu = { icono: 'carpeta', texto: t('archivos.abrir', 'Abrir'), onClick: () => abrir(i) }
    if (i.tipo === 'virtual') return [abrirO]
    if (i.tipo === 'app') {
      const a: Abrible = { ...i.elem, clave: i.elem.nube?.clave }
      return [
        abrirO,
        { icono: 'descargar', texto: t('archivos.descargar', 'Descargar'), onClick: () => void intentar(() => descargar(a)) },
        { icono: 'cuartos', texto: t('archivos.abrirEnApp', 'Abrir en su cuarto'), onClick: () => void abrirApp(i.elem.appId) },
        ...opcionCompartir(a.clave, conExtension(a.nombre, a.mime)),
      ]
    }
    const s = seleccionDe(i.k)
    const varios = s.carpetas.length + s.archivos.length > 1
    if (enPapelera) {
      return [
        { icono: 'restaurar', texto: t('archivos.restaurar', 'Restaurar'), onClick: () => void restaurarSel(s) },
        { icono: 'basura', texto: t('archivos.borrarSiempre', 'Borrar para siempre'), onClick: () => void borrarSiempre(s), peligro: true },
      ]
    }
    const todosDestacados = [...s.carpetas, ...s.archivos].every((x) => x.destacado)
    return [
      ...(varios ? [] : [abrirO]),
      ...(s.archivos.length ? [{ icono: 'descargar' as const, texto: t('archivos.descargar', 'Descargar'), onClick: () => void descargarSel(s) }] : []),
      ...(!varios && s.archivos.length === 1 ? opcionCompartir(s.archivos[0].clave, s.archivos[0].nombre) : []),
      {
        icono: 'estrella',
        texto: todosDestacados ? t('archivos.quitarDestacado', 'Quitar de Destacados') : t('archivos.destacar', 'Añadir a Destacados'),
        onClick: () => void destacarSel(s, !todosDestacados),
      },
      ...(varios ? [] : [{ icono: 'editar' as const, texto: t('archivos.renombrar', 'Renombrar'), onClick: () => void renombrar(i) }]),
      { icono: 'mover', texto: t('archivos.mover', 'Mover'), onClick: () => setMoviendo(s) },
      { icono: 'basura', texto: t('archivos.aPapelera', 'Mover a la papelera'), onClick: () => void alPapelera(s), peligro: true },
    ]
  }

  const alMenu = (i: Item, x: number, y: number) => {
    // Como Drive: el clic derecho sobre algo fuera de la selección lo selecciona solo a él.
    if (esReal(i) && !sel.has(i.k)) setSel(new Set([i.k]))
    setMenu({ x, y, opciones: opcionesDe(i) })
  }

  const alPulsar = (i: Item, e: MouseEvent, tactil: boolean) => {
    if (!esReal(i)) return abrir(i)
    if (tactil) {
      if (sel.size) marcar(i)
      else abrir(i)
      return
    }
    if (e.ctrlKey || e.metaKey) marcar(i)
    else if (e.shiftKey && ancla) {
      const a = reales.findIndex((x) => x.k === ancla)
      const b = reales.findIndex((x) => x.k === i.k)
      if (a >= 0 && b >= 0) setSel(new Set(reales.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.k)))
    } else setSel(new Set([i.k]))
    setAncla(i.k)
  }
  const marcar = (i: Item) => {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(i.k)) n.delete(i.k)
      else n.add(i.k)
      return n
    })
    setAncla(i.k)
  }

  // --- Arrastrar y soltar -------------------------------------------------------

  const valido = (d: string, mano: string) => {
    if (d.startsWith('carpeta:')) {
      const id = Number(d.slice('carpeta:'.length))
      return !seleccionDe(mano).carpetas.some((c) => descendencia(c.id!, todas.carpetas).has(id))
    }
    return true
  }
  const soltarEn = (mano: string, d: string) => {
    const s = seleccionDe(mano)
    if (d === DESTINO_PAPELERA) return void alPapelera(s)
    if (d === DESTINO_DESTACADOS) return void destacarSel(s, true)
    void intentar(async () => {
      await mover(s, await resolverDestino(d), todas)
      setSel(new Set())
    })
  }
  const { props: arrastrar, enMano, destino } = useArrastre<string>(
    (e, mano) => {
      const d = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-destino]')?.getAttribute('data-destino')
      return d && valido(d, mano) ? d : null
    },
    soltarEn,
  )

  /** Lo que llega del sistema: archivos sueltos o carpetas enteras. */
  const subirSoltado = (d: string, entradas: FileSystemEntry[], sueltos: File[]) =>
    intentar(async () => {
      const carpeta = d === 'aqui' ? await destinoAqui() : await resolverDestino(d)
      if (entradas.some((x) => x.isDirectory)) {
        const r = await leerEntradas(entradas)
        await subirConRutas(r.archivos, r.carpetas, carpeta)
      } else if (sueltos.length) await subirArchivos(sueltos, carpeta)
    })

  // --- Teclado --------------------------------------------------------------------

  const hayCapa = !!(abierto || moviendo || menu || compartiendo)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (hayCapa || (e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'Escape' && sel.size) setSel(new Set())
      else if (e.key === 'Delete' && sel.size) void (enPapelera ? borrarSiempre(seleccion) : alPapelera(seleccion))
      else if (e.key === 'F2' && sel.size === 1) {
        const i = reales.find((x) => sel.has(x.k))
        if (i) void renombrar(i)
      } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey) && reales.length) {
        e.preventDefault()
        setSel(new Set(reales.map((x) => x.k)))
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  if (!carpetas || !archivos) return null

  // --- Migas ----------------------------------------------------------------------------

  const migas: { texto: string; ir?: Ubicacion; destino?: string }[] = []
  if (ubi.tipo === 'mia') {
    migas.push({ texto: t('archivos.raiz', 'Mi Archivo'), ir: { tipo: 'mia', carpetaId: null }, destino: DESTINO_MIA })
    for (const c of cadena(ubi.carpetaId)) migas.push({ texto: c.nombre, ir: { tipo: 'mia', carpetaId: c.id! }, destino: `carpeta:${c.id}` })
  } else if (ubi.tipo === 'cuartos' || ubi.tipo === 'cuarto') {
    migas.push({ texto: t('archivos.cuartos', 'Cuartos'), ir: { tipo: 'cuartos' } })
    if (ubi.tipo === 'cuarto') {
      const c = cuartoPorId.get(ubi.cuartoId)
      migas.push({ texto: c?.nombre ?? '', ir: { tipo: 'cuarto', cuartoId: ubi.cuartoId, carpetaId: null }, destino: destinoCuarto(ubi.cuartoId) })
      for (const x of cadena(ubi.carpetaId).filter((x) => !esDeCuarto(x)))
        migas.push({ texto: x.nombre, ir: { tipo: 'cuarto', cuartoId: ubi.cuartoId, carpetaId: x.id! }, destino: `carpeta:${x.id}` })
      if (ubi.fuente) migas.push({ texto: tituloFuente(ubi.fuente) })
    }
  } else if (ubi.tipo === 'otras') {
    migas.push({ texto: t('archivos.otras', 'Otras apps'), ir: { tipo: 'otras' } })
    if (ubi.appId) migas.push({ texto: nombreApp(ubi.appId), ir: { tipo: 'otras', appId: ubi.appId } })
    if (ubi.fuente) migas.push({ texto: tituloFuente(ubi.fuente) })
  } else {
    migas.push({
      texto:
        ubi.tipo === 'recientes'
          ? t('archivos.tab.recientes', 'Recientes')
          : ubi.tipo === 'destacados'
            ? t('archivos.destacados', 'Destacados')
            : t('archivos.papelera', 'Papelera'),
    })
  }

  const resaltado = destino ?? (soltarSO && soltarSO !== 'aqui' ? soltarSO : null)
  const soloLectura = (ubi.tipo === 'cuarto' || ubi.tipo === 'otras') && !!ubi.fuente
  const conRuta = ubi.tipo === 'recientes' || ubi.tipo === 'destacados' || ubi.tipo === 'papelera' || (ubi.tipo === 'mia' && !!q)
  const subtitulo = conRuta
    ? (i: Item) =>
        i.tipo === 'archivo' ? rutaTexto(i.archivo.carpetaId) : i.tipo === 'carpeta' ? rutaTexto(i.carpeta.padreId) : undefined
    : undefined
  const n = sel.size

  const abrirNuevo = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMenu({
      x: r.left,
      y: r.bottom + 4,
      opciones: [
        { icono: 'carpeta', texto: t('archivos.nuevaCarpeta', 'Nueva carpeta'), onClick: () => void nuevaCarpeta() },
        { icono: 'subir', texto: t('archivos.subirArchivos', 'Subir archivos'), onClick: () => entradaArchivos.current?.click() },
        ...(puedeSubirCarpetas()
          ? [{ icono: 'subirCarpeta' as const, texto: t('archivos.subirCarpeta', 'Subir carpeta'), onClick: () => entradaCarpeta.current?.click() }]
          : []),
      ],
    })
  }
  const abrirOrden = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const poner = (o: Orden) => {
      setOrden(o)
      guardarLS(LS_ORDEN, `${o.por}:${o.asc ? 'asc' : 'desc'}`)
    }
    const por = (clave: Orden['por'], texto: string): OpcionMenu => ({
      icono: orden.por === clave ? 'confirmar' : 'ordenar',
      texto,
      onClick: () => poner({ ...orden, por: clave }),
    })
    setMenu({
      x: r.left,
      y: r.bottom + 4,
      opciones: [
        por('nombre', t('archivos.orden.nombre', 'Nombre')),
        por('fecha', t('archivos.orden.fecha', 'Fecha')),
        por('tamano', t('archivos.orden.tamano', 'Tamaño')),
        {
          icono: 'ordenar',
          texto: orden.asc ? t('archivos.orden.desc', 'Invertir: de mayor a menor') : t('archivos.orden.asc', 'Invertir: de menor a mayor'),
          onClick: () => poner({ ...orden, asc: !orden.asc }),
        },
      ],
    })
  }

  let vacio: { titulo: string; sub?: string } | null = null
  if (!items.length) {
    if (q) vacio = { titulo: t('archivos.buscar.vacio', 'Nada coincide con «{q}»', { q: busca.trim() }) }
    else if (ubi.tipo === 'recientes') vacio = { titulo: t('archivos.recientes.vacio', 'Aún no has subido nada') }
    else if (ubi.tipo === 'destacados')
      vacio = { titulo: t('archivos.destacados.vacio', 'Nada destacado'), sub: t('archivos.destacados.vacioSub', 'Marca con la estrella lo que quieras tener a mano.') }
    else if (enPapelera)
      vacio = { titulo: t('archivos.papelera.vacio', 'La papelera está vacía'), sub: t('archivos.papelera.vacioSub', 'Lo que borres se queda aquí 30 días antes de irse para siempre.') }
    else if (ubi.tipo === 'otras' || ubi.tipo === 'cuartos') vacio = { titulo: t('archivos.cuartos.vacio', 'Aún no hay nada aquí') }
    else
      vacio = {
        titulo: t('archivos.vacio.titulo', 'Esta carpeta está vacía'),
        sub: puedeSubir ? t('archivos.vacio.sub', 'Sube archivos o arrástralos aquí. Se guardan en tu nube y los ves en todos tus dispositivos.') : undefined,
      }
  }

  const botonesVisor = (i: Item): BotonVisor[] => {
    const cerrarY = (f: () => unknown) => () => {
      setAbierto(null)
      void f()
    }
    const compartir = (clave: string | undefined, nombre: string): BotonVisor[] =>
      opcionCompartir(clave, nombre).map((o) => ({ icono: o.icono, texto: o.texto, onClick: cerrarY(o.onClick) }))
    if (i.tipo === 'app')
      return [
        { icono: 'cuartos', texto: t('archivos.abrirEnApp', 'Abrir en su cuarto'), onClick: cerrarY(() => abrirApp(i.elem.appId)) },
        ...compartir(i.elem.nube?.clave, conExtension(i.elem.nombre, i.elem.mime)),
      ]
    if (i.tipo !== 'archivo') return []
    const s = { carpetas: [], archivos: [i.archivo] }
    if (i.archivo.borradoEn)
      return [
        { icono: 'restaurar', texto: t('archivos.restaurar', 'Restaurar'), onClick: cerrarY(() => restaurarSel(s)) },
        { icono: 'basura', texto: t('archivos.borrarSiempre', 'Borrar para siempre'), onClick: cerrarY(() => borrarSiempre(s)), peligro: true },
      ]
    return [
      ...compartir(i.archivo.clave, i.archivo.nombre),
      { icono: 'estrella', texto: i.archivo.destacado ? t('archivos.quitarDestacado', 'Quitar de Destacados') : t('archivos.destacar', 'Añadir a Destacados'), onClick: cerrarY(() => destacarSel(s, !i.archivo.destacado)) },
      { icono: 'editar', texto: t('archivos.renombrar', 'Renombrar'), onClick: cerrarY(() => renombrar(i)) },
      { icono: 'mover', texto: t('archivos.mover', 'Mover'), onClick: cerrarY(() => setMoviendo(s)) },
      { icono: 'basura', texto: t('archivos.aPapelera', 'Mover a la papelera'), onClick: cerrarY(() => alPapelera(s)), peligro: true },
    ]
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl md:flex-row md:gap-5 ${soltarSO === 'aqui' ? 'outline-2 outline-dashed outline-sky-400/60' : ''}`}
      onDragOver={(e) => {
        if (!puedeSubir || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        const d = (e.target as Element).closest?.('[data-destino]')?.getAttribute('data-destino')
        setSoltarSO(d && d !== DESTINO_PAPELERA && d !== DESTINO_DESTACADOS ? d : 'aqui')
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSoltarSO(null)
      }}
      onDrop={(e) => {
        if (!soltarSO) return
        e.preventDefault()
        const d = soltarSO
        setSoltarSO(null)
        // Las entradas se sacan AQUÍ, dentro del evento: después ya no se pueden leer.
        void subirSoltado(d, entradasSoltadas(e.dataTransfer), [...e.dataTransfer.files])
      }}
    >
      <Lateral
        ubi={ubi}
        ir={ir}
        cuartos={cuartos}
        hayOtras={otras.length > 0}
        resaltado={resaltado}
        puedeSubir={puedeSubir}
        onNuevo={abrirNuevo}
        medidor={<Medidor puedeSubir={puedeSubir} />}
      />

      <div className="min-w-0 flex-1 space-y-3">
        <div className="md:hidden">
          <Medidor puedeSubir={puedeSubir} />
        </div>

        <div className={`${TARJETA} space-y-2 p-2`}>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 text-sm">
              {migas.map((m, idx) => (
                <span key={idx} className="flex min-w-0 items-center gap-0.5">
                  {idx > 0 && <span className="text-white/30">›</span>}
                  {m.ir && idx < migas.length - 1 ? (
                    <button
                      type="button"
                      data-destino={m.destino}
                      onClick={() => ir(m.ir!)}
                      className={`max-w-40 truncate rounded-lg px-2 py-1 hover:bg-white/10 ${m.destino && resaltado === m.destino ? 'ring-2 ring-emerald-400/80' : ''}`}
                    >
                      {m.texto}
                    </button>
                  ) : (
                    <span className="max-w-56 truncate px-2 py-1 font-semibold">{m.texto}</span>
                  )}
                </span>
              ))}
            </nav>
            {enPapelera && items.length > 0 && (
              <BotonSecundario pequeno onClick={() => void vaciarPapelera()}>
                <Icono nombre="basura" /> {t('archivos.vaciarPapelera', 'Vaciar papelera')}
              </BotonSecundario>
            )}
            {puedeSubir && !soloLectura && (ubi.tipo === 'mia' || ubi.tipo === 'cuarto') && (
              <BotonSecundario pequeno onClick={abrirNuevo} className="md:hidden">
                <Icono nombre="agregar" /> {t('archivos.nuevo', 'Nuevo')}
              </BotonSecundario>
            )}
          </div>
          {n > 0 ? (
            <div className="flex min-h-9 flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSel(new Set())}
                aria-label={t('archivos.quitarSeleccion', 'Quitar la selección')}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
              >
                <Icono nombre="cerrar" />
              </button>
              <span className="me-auto text-sm font-semibold">{n === 1 ? t('archivos.seleccionado', '1 seleccionado') : t('archivos.seleccionados', '{n} seleccionados', { n })}</span>
              {enPapelera ? (
                <>
                  <BotonSecundario pequeno onClick={() => void restaurarSel(seleccion)}>
                    <Icono nombre="restaurar" /> {t('archivos.restaurar', 'Restaurar')}
                  </BotonSecundario>
                  <BotonSecundario pequeno onClick={() => void borrarSiempre(seleccion)}>
                    <Icono nombre="basura" /> {t('archivos.borrarSiempre', 'Borrar para siempre')}
                  </BotonSecundario>
                </>
              ) : (
                <>
                  {seleccion.archivos.length > 0 && (
                    <BotonSecundario pequeno onClick={() => void descargarSel(seleccion)} aria-label={t('archivos.descargar', 'Descargar')}>
                      <Icono nombre="descargar" />
                    </BotonSecundario>
                  )}
                  <BotonSecundario pequeno onClick={() => setMoviendo(seleccion)} aria-label={t('archivos.mover', 'Mover')}>
                    <Icono nombre="mover" />
                  </BotonSecundario>
                  <BotonSecundario
                    pequeno
                    onClick={() => void destacarSel(seleccion, ![...seleccion.carpetas, ...seleccion.archivos].every((x) => x.destacado))}
                    aria-label={t('archivos.destacar', 'Añadir a Destacados')}
                  >
                    <Icono nombre="estrella" />
                  </BotonSecundario>
                  <BotonSecundario pequeno onClick={() => void alPapelera(seleccion)} aria-label={t('archivos.aPapelera', 'Mover a la papelera')}>
                    <Icono nombre="basura" />
                  </BotonSecundario>
                </>
              )}
            </div>
          ) : (
            <div className="flex min-h-9 items-center gap-1.5">
              <label className="relative min-w-0 flex-1">
                <Icono nombre="lupa" className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={ubi.tipo === 'mia' ? t('archivos.buscar.todo', 'Buscar en tu Archivo') : t('archivos.buscar.aqui', 'Buscar aquí')}
                  aria-label={t('archivos.buscar.aqui', 'Buscar aquí')}
                  className={`${INPUT} py-1.5 ps-8`}
                />
              </label>
              {ubi.tipo !== 'recientes' && (
                <button
                  type="button"
                  onClick={abrirOrden}
                  title={t('archivos.ordenar', 'Ordenar')}
                  aria-label={t('archivos.ordenar', 'Ordenar')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                >
                  <Icono nombre="ordenar" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const m = modo === 'lista' ? 'rejilla' : 'lista'
                  setModo(m)
                  guardarLS(LS_VISTA, m)
                }}
                title={modo === 'lista' ? t('archivos.vista.rejilla', 'Ver en cuadrícula') : t('archivos.vista.lista', 'Ver en lista')}
                aria-label={modo === 'lista' ? t('archivos.vista.rejilla', 'Ver en cuadrícula') : t('archivos.vista.lista', 'Ver en lista')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
              >
                <Icono nombre={modo === 'lista' ? 'rejilla' : 'lista'} />
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {soloLectura && <p className="text-xs text-white/45">{t('archivos.deApp', 'Esto lo guarda su app: aquí se ve y se baja; para cambiarlo, ábrelo en su cuarto.')}</p>}

        {vacio ? (
          <Vacio icono={enPapelera ? 'basura' : ubi.tipo === 'destacados' ? 'estrella' : 'carpeta'} titulo={vacio.titulo} sub={vacio.sub} />
        ) : (
          <Vista
            items={items}
            modo={modo}
            seleccion={sel}
            resaltado={resaltado}
            enMano={enMano}
            subtitulo={subtitulo}
            alPulsar={alPulsar}
            alDoble={abrir}
            alMenu={alMenu}
            alMarcar={marcar}
            arrastre={(i) => (esReal(i) && !enPapelera ? arrastrar(i.k) : undefined)}
          />
        )}
      </div>

      <input
        ref={entradaArchivos}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length) void intentar(async () => subirArchivos(files, await destinoAqui()))
        }}
      />
      <input
        ref={(el) => {
          entradaCarpeta.current = el
          if (el) el.webkitdirectory = true
        }}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (!files.length) return
          const r = conRutas(files)
          void intentar(async () => subirConRutas(r.archivos, r.carpetas, await destinoAqui()))
        }}
      />

      <Subidas />
      {menu && <MenuArchivo x={menu.x} y={menu.y} opciones={menu.opciones} onCerrar={() => setMenu(null)} />}
      {moviendo && (
        <MoverA
          carpetas={vivas}
          cuartos={cuartos}
          carpetasDeCuarto={carpetasDeCuarto}
          excluir={new Set(moviendo.carpetas.flatMap((c) => [...descendencia(c.id!, todas.carpetas)]))}
          onElegir={moverA}
          onCerrar={() => setMoviendo(null)}
        />
      )}
      {compartiendo && <Compartir clave={compartiendo.clave} nombre={compartiendo.nombre} onCerrar={() => setCompartiendo(null)} />}
      {abierto && (
        <Visor
          archivo={abierto.a}
          onCerrar={() => setAbierto(null)}
          onDescargar={() => void intentar(() => descargar(abierto.a))}
          botones={botonesVisor(abierto.item)}
        />
      )}
    </div>
  )
}
