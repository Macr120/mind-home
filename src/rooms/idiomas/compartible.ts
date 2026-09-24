import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoTarjeta } from '../../core/data/db'
import { idiomasRepo, tarjetasIdiomaRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { cargarTemario, crearNodo, tituloTema } from './temarioVivo'

/**
 * Lo que Idiomas manda por el buzón: un MAZO, es decir, las tarjetas de un tema
 * del temario en un idioma. Viaja el vocabulario (término, traducción, ejemplo,
 * imagen), no el repaso: quien lo recibe empieza cada tarjeta desde la caja 0.
 *
 * Los temas de fábrica (`temario.ts`) existen en todas las casas y se reutilizan
 * por su id; uno propio (`din-…`) se crea de nuevo con su título.
 */

interface TarjetaDatos {
  termino: string
  traduccion: string
  ejemplo?: string
  tipo: TipoTarjeta
  nivel: string
  /** Clave del blob de su imagen, si tiene. */
  imagen?: string
}

interface MazoDatos {
  idioma: { codigo: string; nombre: string; bandera: string; nivel: string }
  tema: { temaId: string; titulo: string; nivel: string; fabrica: boolean }
  tarjetas: TarjetaDatos[]
}

const TIPOS: TipoTarjeta[] = ['palabra', 'frase', 'expresion']

const detalleMazo = (n: number, idioma: string) => tGlobal('buzon.mazo.detalle', '{n} tarjetas · {idioma}', { n: String(n), idioma })

/** Las tarjetas agrupadas por idioma y tema (un mazo por pareja; las sueltas no). */
async function mazos() {
  const [idiomas, tarjetas] = await Promise.all([idiomasRepo.list(), tarjetasIdiomaRepo.list()])
  const grupos = new Map<string, { idiomaId: number; temaId: string; n: number }>()
  for (const x of tarjetas) {
    if (!x.temaId) continue
    const k = `${x.idiomaId}:${x.temaId}`
    const g = grupos.get(k)
    if (g) g.n++
    else grupos.set(k, { idiomaId: x.idiomaId, temaId: x.temaId, n: 1 })
  }
  return { idiomas, grupos: [...grupos.values()] }
}

export async function listarMazos(): Promise<ItemCompartible[]> {
  const { idiomas, grupos } = await mazos()
  const salida: ItemCompartible[] = []
  for (const g of grupos) {
    const idioma = idiomas.find((i) => i.id === g.idiomaId)
    if (!idioma) continue
    const titulo = tituloTema(await cargarTemario(g.idiomaId), g.temaId) ?? g.temaId
    salida.push({ clave: `mazo:${g.idiomaId}:${g.temaId}`, nombre: `${idioma.bandera} ${titulo}`, detalle: detalleMazo(g.n, idioma.nombre) })
  }
  return salida
}

export async function empaquetarMazo(idiomaId: number, temaId: string): Promise<Paquete | null> {
  const idioma = (await idiomasRepo.list()).find((i) => i.id === idiomaId)
  const tarjetas = (await tarjetasIdiomaRepo.list()).filter((x) => x.idiomaId === idiomaId && x.temaId === temaId)
  if (!idioma || tarjetas.length === 0) return null
  const nodo = (await cargarTemario(idiomaId)).porId.get(temaId)
  const titulo = nodo?.titulo ?? temaId
  const blobs: Record<string, Blob> = {}
  const datos: MazoDatos = {
    idioma: { codigo: idioma.codigo, nombre: idioma.nombre, bandera: idioma.bandera, nivel: idioma.nivel },
    tema: { temaId, titulo, nivel: nodo?.nivel ?? tarjetas[0].nivel, fabrica: nodo?.fabrica ?? false },
    tarjetas: tarjetas.map((x, i) => {
      if (x.imagen) blobs[`img${i}`] = x.imagen
      return {
        termino: x.termino,
        traduccion: x.traduccion,
        ...(x.ejemplo ? { ejemplo: x.ejemplo } : {}),
        tipo: x.tipo,
        nivel: x.nivel,
        ...(x.imagen ? { imagen: `img${i}` } : {}),
      }
    }),
  }
  return {
    app: 'idiomas',
    tipo: 'mazo',
    version: 1,
    nombre: titulo,
    resumen: detalleMazo(tarjetas.length, idioma.nombre),
    emoji: idioma.bandera,
    datos,
    ...(Object.keys(blobs).length ? { blobs } : {}),
  }
}

export async function empaquetarMazoPorClave(clave: string): Promise<Paquete | null> {
  const [, idiomaId, ...resto] = clave.split(':')
  return empaquetarMazo(Number(idiomaId), resto.join(':'))
}

export async function importarMazo(p: Paquete): Promise<{ seccion?: string; aviso?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<MazoDatos> | null
  if (!d?.idioma || typeof d.idioma.codigo !== 'string' || !d.tema || !Array.isArray(d.tarjetas)) throw new Error('Mazo inválido')

  // El idioma se reconoce por su código; si no lo estudias todavía, se agrega.
  let idiomaId = (await idiomasRepo.list()).find((i) => i.codigo === d.idioma!.codigo)?.id
  if (idiomaId == null) {
    idiomaId = (await idiomasRepo.add({
      codigo: d.idioma.codigo,
      nombre: d.idioma.nombre,
      bandera: d.idioma.bandera,
      nivel: d.idioma.nivel,
      creadoEn: new Date().toISOString(),
    })) as number
  }

  // El tema: el de fábrica si existe aquí; si no, uno propio con su título.
  const tx = await cargarTemario(idiomaId)
  let temaId = d.tema.fabrica && tx.porId.has(d.tema.temaId) ? d.tema.temaId : null
  if (!temaId) {
    const mismo = [...tx.porId.values()].find((n) => n.tipo === 'tema' && normalizar(n.titulo) === normalizar(d.tema!.titulo))
    if (mismo && !(await confirmarDuplicado(d.tema.titulo))) return { cancelado: true }
    temaId = await crearNodo({
      idiomaId,
      tipo: 'tema',
      padre: tx.porId.get(`temas:${d.tema.nivel}`) ?? null,
      titulo: d.tema.titulo,
    })
  }

  // Las que ya tienes (mismo término en ese idioma) no se duplican.
  const ya = new Set((await tarjetasIdiomaRepo.list()).filter((x) => x.idiomaId === idiomaId).map((x) => normalizar(x.termino)))
  const hoy = fechaLocalISO()
  const ahora = new Date().toISOString()
  let nuevas = 0
  for (const x of d.tarjetas) {
    if (typeof x?.termino !== 'string' || typeof x.traduccion !== 'string' || ya.has(normalizar(x.termino))) continue
    const imagen = x.imagen ? p.blobs?.[x.imagen] : undefined
    await tarjetasIdiomaRepo.add({
      idiomaId,
      termino: x.termino,
      traduccion: x.traduccion,
      ...(typeof x.ejemplo === 'string' ? { ejemplo: x.ejemplo } : {}),
      ...(imagen ? { imagen } : {}),
      tipo: TIPOS.includes(x.tipo) ? x.tipo : 'palabra',
      temaId,
      nivel: typeof x.nivel === 'string' ? x.nivel : d.tema.nivel,
      caja: 0,
      proximaISO: hoy,
      fuente: 'manual',
      creadoEn: ahora,
    })
    nuevas++
  }

  // Que la app abra en ese idioma, no en el último que tenías elegido.
  try {
    localStorage.setItem(claveLS('mh.idiomaActivo'), String(idiomaId))
  } catch {
    // Sin almacenamiento: abre en el idioma de siempre.
  }
  const repetidas = d.tarjetas.length - nuevas
  return {
    seccion: 'temario',
    ...(repetidas > 0
      ? { aviso: tGlobal('buzon.mazo.repetidas', 'Guardé {n} tarjetas; {r} ya las tenías', { n: String(nuevas), r: String(repetidas) }) }
      : {}),
  }
}
