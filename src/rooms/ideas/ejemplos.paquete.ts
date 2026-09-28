import type { TipoMapa } from '../../core/data/db'
import { esEjemplo, uidEjemplo } from '../../core/data/ejemplos'
import {
  borrarMapaIdeas,
  carpetasIdeaRepo,
  ideasRepo,
  mapasIdeasRepo,
  nodosMapaRepo,
} from '../../core/data/repository'
import { DIA_MS, fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import type { Idioma } from '../../core/i18n/idiomas'
import { enIdioma } from '../../core/i18n/porIdioma'
import {
  filaEjemplo,
  porIdioma,
  retraducido,
  yaMaterializado,
  type PaqueteEjemplo,
  type PorIdioma,
} from '../_shared/ejemplos/tipos'
import { COLOR } from './constantes'
import { filasDeMapa } from './crear'
import { ejemploEnIdiomas, type ContenidoEjemplo } from './ejemplos'
import { TEXTOS_IDEAS } from './ejemplos.data'
import { defTipo } from './tiposMapa'

/**
 * Ejemplos de fábrica de Ideas, uno por pestaña.
 *
 * El del DIARIO cuenta un proyecto que arranca: la idea del pódcast con sus
 * puntos, una idea de episodio en su subcarpeta y la lluvia del nombre —suelta
 * en el diario, que es donde cae lo que se anota sin elegir carpeta—, más una
 * idea de casa. Van en cuatro días distintos para que «Por día» tenga historia.
 *
 * Los de MAPAS y DIAGRAMAS son el ejemplo del catálogo por formato
 * (`ejemplos.ts`), el mismo de «Ver un ejemplo». Llevan también la marca vieja
 * `ejemplo`: el lienzo les pone encima la guía del formato y el botón los
 * reutiliza en vez de crear otro igual.
 */

type Textos = (typeof TEXTOS_IDEAS)['es']
type Clave = keyof Textos

/** El uid que lleva cada fila (las interfaces de `db.ts` no lo declaran). */
const uidDe = (fila: object) => (fila as { uid?: string }).uid

// ----- Diario -----

const DIARIO = 'ideas.diario'

/** `carpetaId` FIJO: dos dispositivos que ponen el ejemplo convergen en las mismas carpetas. */
const CARPETAS: { carpetaId: string; padreId: string | null; nombre: Clave; orden: number; dias: number }[] = [
  { carpetaId: 'cid-ej-proyectos', padreId: null, nombre: 'carpetaProyectos', orden: 0, dias: 8 },
  { carpetaId: 'cid-ej-episodios', padreId: 'cid-ej-proyectos', nombre: 'carpetaEpisodios', orden: 0, dias: 5 },
  { carpetaId: 'cid-ej-casa', padreId: null, nombre: 'carpetaCasa', orden: 1, dias: 2 },
]

interface IdeaEjemplo {
  /** Clave de la fila en la sección (de ella sale su uid). */
  clave: string
  texto: Clave
  /** Días atrás. */
  dias: number
  carpetaId?: string
  /** De la lluvia del nombre: lleva su `tema`. */
  lluvia?: true
  favorita?: true
  puntos?: { puntoId: string; texto: Clave; hecho?: true }[]
}

/** En orden de creación: la lista del diario va al revés, la última arriba. */
const IDEAS: IdeaEjemplo[] = [
  {
    clave: 'podcast',
    texto: 'podcast',
    dias: 8,
    carpetaId: 'cid-ej-proyectos',
    puntos: [
      { puntoId: 'pt-ej-1', texto: 'podcastPunto1', hecho: true },
      { puntoId: 'pt-ej-2', texto: 'podcastPunto2' },
      { puntoId: 'pt-ej-3', texto: 'podcastPunto3' },
    ],
  },
  { clave: 'relojeria', texto: 'relojeria', dias: 5, carpetaId: 'cid-ej-episodios' },
  {
    clave: 'huerto',
    texto: 'huerto',
    dias: 2,
    carpetaId: 'cid-ej-casa',
    puntos: [
      { puntoId: 'pt-ej-1', texto: 'huertoPunto1', hecho: true },
      { puntoId: 'pt-ej-2', texto: 'huertoPunto2' },
    ],
  },
  { clave: 'lluvia3', texto: 'lluvia3', dias: 0, lluvia: true },
  { clave: 'lluvia2', texto: 'lluvia2', dias: 0, lluvia: true },
  { clave: 'lluvia1', texto: 'lluvia1', dias: 0, lluvia: true, favorita: true },
]

export const ejemploDiario: PaqueteEjemplo = {
  id: DIARIO,
  tablas: [ideasRepo, carpetasIdeaRepo],
  async materializar(restaurar) {
    if (await yaMaterializado(DIARIO, () => ideasRepo.list(), () => carpetasIdeaRepo.list())) return
    const T = porIdioma(TEXTOS_IDEAS)
    const hoy = fechaLocalISO()
    const ahora = Date.now()
    const hace = (dias: number, minutos: number) => new Date(ahora - dias * DIA_MS - minutos * 60_000).toISOString()

    for (const c of CARPETAS) {
      await carpetasIdeaRepo.addSeed(
        filaEjemplo(DIARIO, c.carpetaId, restaurar, {
          carpetaId: c.carpetaId,
          padreId: c.padreId,
          nombre: T[c.nombre],
          orden: c.orden,
          creadoEn: hace(c.dias, 60),
        }),
      )
    }
    for (const [i, d] of IDEAS.entries()) {
      await ideasRepo.addSeed(
        filaEjemplo(DIARIO, d.clave, restaurar, {
          texto: T[d.texto],
          ...(d.lluvia && { tema: T.temaLluvia }),
          ...(d.carpetaId && { carpetaId: d.carpetaId }),
          ...(d.favorita && { favorita: true }),
          ...(d.puntos && {
            puntos: d.puntos.map((p) => ({ puntoId: p.puntoId, texto: T[p.texto], ...(p.hecho && { hecho: true }) })),
          }),
          fecha: isoMasDias(hoy, -d.dias),
          // Un minuto entre una y otra: el orden de la lista no queda al azar.
          creadoEn: hace(d.dias, IDEAS.length - i),
        }),
      )
    }
  },

  async retraducir() {
    for (const c of await carpetasIdeaRepo.list()) {
      const def = CARPETAS.find((d) => d.carpetaId === c.carpetaId)
      if (c.ejemploDe !== DIARIO || c.id == null || !def) continue
      const nombre = retraducido(TEXTOS_IDEAS, c.nombre, def.nombre)
      if (nombre) await carpetasIdeaRepo.update(c.id, { nombre })
    }
    const ideas = await ideasRepo.list()
    // Una lluvia a la que el usuario ya le sumó ideas también es suya: cambiarle
    // aquí el tema la partiría en dos.
    const temasPropios = new Set(ideas.filter((i) => i.tema && !esEjemplo(i)).map((i) => i.tema))
    for (const i of ideas) {
      const def = IDEAS.find((d) => uidEjemplo(DIARIO, d.clave) === uidDe(i))
      if (i.ejemploDe !== DIARIO || i.id == null || !def) continue
      const texto = retraducido(TEXTOS_IDEAS, i.texto, def.texto)
      const tema = temasPropios.has(i.tema) ? null : retraducido(TEXTOS_IDEAS, i.tema, 'temaLluvia')
      // Punto a punto: los que el usuario añadió o reescribió se quedan tal cual.
      const puntos = (i.puntos ?? []).map((p) => {
        const clave = def.puntos?.find((d) => d.puntoId === p.puntoId)?.texto
        const nuevo = clave && retraducido(TEXTOS_IDEAS, p.texto, clave)
        return nuevo ? { ...p, texto: nuevo } : p
      })
      const cambianPuntos = puntos.some((p, k) => p !== i.puntos?.[k])
      if (texto || tema || cambianPuntos) {
        await ideasRepo.update(i.id, {
          ...(texto && { texto }),
          ...(tema && { tema }),
          ...(cambianPuntos && { puntos }),
        })
      }
    }
  },

  async alBorrar() {
    // Lo que el usuario guardó en las carpetas del ejemplo sube a la raíz: sin
    // esto colgaría de una carpeta que ya no existe y dejaría de verse.
    const delEjemplo = new Set(CARPETAS.map((c) => c.carpetaId))
    for (const c of await carpetasIdeaRepo.list()) {
      if (c.id != null && c.padreId && delEjemplo.has(c.padreId)) {
        await carpetasIdeaRepo.update(c.id, { padreId: null })
      }
    }
    for (const i of await ideasRepo.list()) {
      if (i.id != null && i.carpetaId && delEjemplo.has(i.carpetaId)) {
        await ideasRepo.update(i.id, { carpetaId: undefined })
      }
    }
  },
}

// ----- Mapas y diagramas -----

/**
 * El ejemplo de una pestaña de mapas: el del catálogo para su formato, con
 * `nodoId` FIJO por posición (dos dispositivos convergen en los mismos nodos).
 * `columnas` titula las raíces de los formatos por zonas con el texto de
 * `ejemplos.data.ts`, para que se retraduzcan con lo demás.
 */
function ejemploMapa(
  id: string,
  familia: 'mapas' | 'diagramas',
  tipo: TipoMapa,
  columnas?: (T: Textos) => string[],
): PaqueteEjemplo {
  const nodoId = (i: number) => `nod-ej-${familia}-${i}`
  const filas = (c: ContenidoEjemplo, T: Textos, mapaId: number, creadoEn: string, fecha: string) =>
    filasDeMapa({ ...c.propuesta, conjuntos: c.propuesta.conjuntos ?? columnas?.(T) }, tipo, mapaId, creadoEn, fecha)

  /** En cada idioma, el nombre del mapa y el texto de cada nodo por su `nodoId` fijo. */
  const catalogo = (): PorIdioma<Record<string, string>> => {
    const todos = ejemploEnIdiomas(tipo)
    const textos = (idioma: Idioma): Record<string, string> => {
      const c = todos[idioma] ?? todos.es
      const nodos = filas(c, enIdioma(TEXTOS_IDEAS, idioma), 0, '', '')
      return { nombre: c.titulo, ...Object.fromEntries(nodos.map((n, i) => [nodoId(i), n.texto])) }
    }
    const cat: PorIdioma<Record<string, string>> = { es: textos('es') }
    for (const idioma of Object.keys(todos) as Idioma[]) cat[idioma] = textos(idioma)
    return cat
  }

  return {
    id,
    tablas: [mapasIdeasRepo, nodosMapaRepo],
    // Las dos pestañas comparten tablas: cuenta solo lo de ESTA, incluidos los
    // ejemplos viejos de «Ver un ejemplo» (así no sale otro igual al lado).
    hayPropios: () => mapasIdeasRepo.alguna((m) => m.ejemploDe !== id && defTipo(m.tipo).familia === familia),

    async materializar(restaurar) {
      if (await yaMaterializado(id, () => mapasIdeasRepo.list(), () => nodosMapaRepo.list())) return
      const c = porIdioma(ejemploEnIdiomas(tipo))
      const fecha = fechaLocalISO()
      const creadoEn = new Date().toISOString()
      const mapaId = await mapasIdeasRepo.addSeed(
        filaEjemplo(id, 'mapa', restaurar, { nombre: c.titulo, tipo, color: COLOR, ejemplo: true, fecha, creadoEn }),
      )
      const nodos = filas(c, porIdioma(TEXTOS_IDEAS), mapaId, creadoEn, fecha)
      const fijo = new Map(nodos.map((n, i) => [n.nodoId, nodoId(i)]))
      for (const [i, n] of nodos.entries()) {
        await nodosMapaRepo.addSeed(
          filaEjemplo(id, `nodo${i}`, restaurar, {
            ...n,
            nodoId: nodoId(i),
            padreId: n.padreId && (fijo.get(n.padreId) ?? n.padreId),
            // La matriz guarda en `zona` el nodoId de la opción de cada celda.
            ...(n.zona && fijo.has(n.zona) && { zona: fijo.get(n.zona) }),
          }),
        )
      }
    },

    async retraducir() {
      const cat = catalogo()
      for (const m of await mapasIdeasRepo.list()) {
        if (m.ejemploDe !== id || m.id == null) continue
        const nombre = retraducido(cat, m.nombre, 'nombre')
        if (nombre) await mapasIdeasRepo.update(m.id, { nombre })
      }
      for (const n of await nodosMapaRepo.list()) {
        if (n.ejemploDe !== id || n.id == null) continue
        const texto = retraducido(cat, n.texto, n.nodoId)
        if (texto) await nodosMapaRepo.update(n.id, { texto })
      }
    },

    async borrar() {
      // El mapa se va con TODOS sus nodos, también los que le añadió el usuario
      // (esos no llevan la marca): borrar solo lo marcado los dejaría huérfanos.
      for (const m of await mapasIdeasRepo.list()) {
        if (m.ejemploDe === id && m.id != null) await borrarMapaIdeas(m.id)
      }
      for (const n of await nodosMapaRepo.list()) {
        if (n.ejemploDe === id && n.id != null) await nodosMapaRepo.remove(n.id)
      }
    },
  }
}

export const ejemploMapas = ejemploMapa('ideas.mapas', 'mapas', 'mental')

export const ejemploDiagramas = ejemploMapa('ideas.diagramas', 'diagramas', 'proscontras', (T) => [
  T.ventajas,
  T.desventajas,
])
