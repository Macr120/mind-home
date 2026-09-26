/**
 * Los muebles que siembran las plantillas, hechos RECETAS del taller: así se
 * reabren en «Editar en el taller» y tienen entrepaños reales donde apoyar
 * cosas (`superficies.ts`). Se decide por el id de recurso, de modo que vale
 * igual para la `SIEMBRA` de fábrica que para un conjunto editado por el usuario.
 *
 * Las medidas copian las del modelo viejo (`modelosRecursos.tsx`) y los topes
 * caen donde lo que va encima ya trae su altura dentro (`BASE_HORNEADA`). Lo que
 * pasa del ancho de una hoja (2400) se parte en copias: el rack de 3.6 m son dos
 * de 1.8, y el par de burós, dos burós.
 *
 * EXCEPCIÓN A LA REGLA 1 DE CLAUDE.md, como `catalogoSiembra.ts`: la conversión
 * de casas ya creadas escribe con `db` directo porque corre dentro de
 * `useDiseño.cargar()`, antes de que el store tenga estado.
 */
import { db, type ObjetoCuarto } from '../data/db'
import { aCuarto, apoyoEn, TIPOS_ENCIMA } from '../house/apoyos'
import type { TipoEstante } from '../house/formasEntrada'
import { RECURSOS } from '../house/recursos'
import { tGlobal } from '../i18n/useT'
import { tono } from './armar/comun'
import { muebleNuevo, normalizarMueble } from './modulos'
import { piezas3DDeMueble } from './piezas3d'
import type { ModuloId, Mueble } from './tipos'

/** = `TIPO_PIEZAS` de `house/catalogo.tsx`; no se importa para no arrastrar la escena. */
const TIPO_PIEZAS = 'piezas'
/** = `LIBRERIA_ROOM` de `state/disenoStore.ts` (que importa este módulo en diferido). */
const LIBRERIA_ROOM = '__libreria__'

interface DefReceta {
  modulo: ModuloId
  medidas: Mueble['medidas']
  opciones: Mueble['opciones']
  /** Desplazamientos en X (m, en el sistema del objeto) de cada copia. */
  copias?: number[]
  /** Nombre de cada copia si no es el del recurso (el par de burós → «Buró»). */
  nombre?: [clave: string, es: string]
  /** Estante de entradas que crece a lo largo del muro (el rack del gimnasio). */
  estante?: TipoEstante
}

const RECETAS: Record<number, DefReceta> = {
  // Sus mancuernas se sueltan como objetos (separables.ts) y crece con los ejercicios.
  11: {
    modulo: 'metal',
    medidas: { ancho: 1600, alto: 950, fondo: 500 },
    opciones: { niveles: 3, repisa: 'tablero' },
    estante: 'rack-mancuernas',
  },
  21: { modulo: 'mesa', medidas: { ancho: 2000, alto: 660, fondo: 800 }, opciones: { patas: 'tablero', entrepano: true } },
  22: { modulo: 'metal', medidas: { ancho: 1000, alto: 2000, fondo: 600 }, opciones: { niveles: 4, repisa: 'tablero' } },
  39: {
    modulo: 'madera',
    medidas: { ancho: 700, alto: 700, fondo: 600 },
    opciones: { cajones: 2, entrepanos: 0 },
    copias: [-1.7, 1.7],
    nombre: ['muebles.siembra.buro', 'Buró'],
  },
  41: { modulo: 'madera', medidas: { ancho: 1000, alto: 1000, fondo: 600 }, opciones: { cajones: 3, entrepanos: 0 } },
  48: { modulo: 'mesa', medidas: { ancho: 2400, alto: 560, fondo: 900 }, opciones: { patas: 'tablero' } },
  67: { modulo: 'mesa', medidas: { ancho: 1400, alto: 320, fondo: 800 }, opciones: { patas: 'tubo' } },
  68: { modulo: 'madera', medidas: { ancho: 2400, alto: 650, fondo: 500 }, opciones: { columnas: 2, entrepanos: 1 } },
  88: {
    modulo: 'metal',
    medidas: { ancho: 1800, alto: 2200, fondo: 600 },
    opciones: { niveles: 4, repisa: 'tablero' },
    copias: [-0.9, 0.9],
  },
}

const recursoDe = (tipo: string): number | null =>
  tipo.startsWith('recurso:') ? Number(tipo.slice('recurso:'.length)) : null

/** Receta del mueble que antes era `recurso:<n>`, con el color del objeto; null si no se convierte. */
export function recetaDeRecurso(n: number, color: string): Mueble | null {
  const def = RECETAS[n]
  if (!def) return null
  const base = muebleNuevo(def.modulo)
  const nombre = def.nombre
    ? tGlobal(def.nombre[0], def.nombre[1])
    : tGlobal(`recurso.${n}`, RECURSOS.find((r) => r.id === n)?.nombre ?? base.nombre)
  return normalizarMueble({
    ...base,
    nombre,
    medidas: def.medidas,
    opciones: { ...base.opciones, ...def.opciones },
    tablero: { ...base.tablero, color: def.modulo === 'metal' ? tono(color, 0.12) : color },
    metal: def.modulo === 'metal' ? { ...base.metal, color } : base.metal,
    frentes: { ...base.frentes, colorFrente: tono(color, 0.08) },
  })
}

export interface InstanciaSiembra {
  tipo: string
  color: string
  x: number
  z: number
  /** Campos de mueble del taller (piezas, receta, nombre, tipo de origen). */
  extra?: Partial<ObjetoCuarto>
  /** La primera copia es la que conserva la app y lo de principal. */
  primera: boolean
}

/**
 * Lo que hay que crear para un objeto de siembra `tipo` en `base`: él mismo si
 * no tiene receta, o sus copias ya hechas mueble del taller.
 */
export function instanciasSiembra(
  tipo: string,
  color: string,
  base: Pick<ObjetoCuarto, 'x' | 'z' | 'rotY' | 'escala'>,
): InstanciaSiembra[] {
  const n = recursoDe(tipo)
  const m = n != null ? recetaDeRecurso(n, color) : null
  if (n == null || !m) return [{ tipo, color, x: base.x ?? 0, z: base.z ?? 0, primera: true }]
  const piezas = piezas3DDeMueble(m)
  const estante = RECETAS[n].estante
  return (RECETAS[n].copias ?? [0]).map((dx, i) => {
    const [x, z] = aCuarto(base, dx, 0)
    return {
      tipo: TIPO_PIEZAS,
      color,
      x,
      z,
      extra: { piezas, mueble: m, nombre: m.nombre, tipoOriginal: tipo, ...(estante ? { estante: { tipo: estante } } : {}) },
      primera: i === 0,
    }
  })
}

/**
 * Casas ya creadas: convierte los muebles de siembra que siguen siendo el
 * recurso de fábrica (lo que el usuario ya pasó a piezas, a .glb o por el
 * taller no se toca) y apoya en ellos lo que la siembra dejó encima. Muta
 * `objetos` para que el store arranque ya con el resultado.
 *
 * Las copias nacen con uid DETERMINISTA (`<uid>-copia<i>`): si dos
 * dispositivos migran a la vez, el sync las funde en vez de duplicarlas.
 */
export async function convertirMueblesDeRecurso(objetos: ObjetoCuarto[], soloIds?: number[]): Promise<void> {
  const tocados: ObjetoCuarto[] = []
  for (const o of [...objetos]) {
    if (o.id == null || o.roomId === LIBRERIA_ROOM || o.mueble) continue
    // Una receta nueva se aplica sola, sin volver a convertir lo que ya se decidió dejar.
    if (soloIds && !soloIds.includes(recursoDe(o.tipo) ?? -1)) continue
    const ins = instanciasSiembra(o.tipo, o.color, o)
    if (ins[0].tipo === o.tipo) continue
    const [primera, ...resto] = ins
    const cambios: Partial<ObjetoCuarto> = { tipo: primera.tipo, x: primera.x, z: primera.z, ...primera.extra }
    // Un nombre puesto a mano se respeta.
    if (o.nombre) delete cambios.nombre
    await db.objetosCuarto.update(o.id, cambios)
    Object.assign(o, cambios)
    tocados.push(o)
    for (const [i, c] of resto.entries()) {
      const base = (o as { uid?: string }).uid
      const uid = base ? `${base}-copia${i + 1}` : undefined
      if (uid && (await db.objetosCuarto.where('uid').equals(uid).count())) continue
      const fila: ObjetoCuarto = {
        roomId: o.roomId,
        tipo: c.tipo,
        color: c.color,
        slot: o.slot,
        x: c.x,
        z: c.z,
        rotY: o.rotY,
        escala: o.escala,
        y: o.y,
        ...c.extra,
        ...(uid ? ({ uid } as object) : {}),
      }
      fila.id = (await db.objetosCuarto.add(fila)) as number
      objetos.push(fila)
      tocados.push(fila)
    }
  }
  if (!tocados.length) return
  const cuartos = new Set(tocados.map((o) => o.roomId))
  for (const a of objetos) {
    if (a.id == null || !cuartos.has(a.roomId) || a.apoyoId != null || !TIPOS_ENCIMA.has(a.tipo)) continue
    const ap = apoyoEn(objetos, a, a.x ?? 0, a.z ?? 0)
    if (!ap) continue
    await db.objetosCuarto.update(a.id, { ...ap })
    Object.assign(a, ap)
  }
}
