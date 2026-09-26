/**
 * Separa un compuesto (`separables.ts`): la base queda `separado` y cada parte
 * nace como objeto de piezas propio, apoyado en ella (o en el suelo a su lado,
 * con `NIVEL_SUELO`), con el giro y la escala de la base. Los uid son
 * deterministas (`<uid>-parte-<id>`): si dos dispositivos separan a la vez, el
 * sync funde las partes en vez de duplicarlas.
 *
 * EXCEPCIÓN A LA REGLA 1 DE CLAUDE.md, como `recetasSiembra.ts`: la migración
 * de casas ya creadas escribe con `db` directo porque corre dentro de
 * `useDiseño.cargar()`, antes de que el store tenga estado.
 */
import { db, type ObjetoCuarto } from '../data/db'
import { tGlobal } from '../i18n/useT'
import { aCuarto, NIVEL_SUELO, superficiesDeObjeto, yApoyo } from './apoyos'
import { defSeparable, type DefSeparable, type ParteSeparable } from './separables'

/** = `TIPO_PIEZAS` de `catalogo.tsx`; no se importa para no arrastrar la escena. */
const TIPO_PIEZAS = 'piezas'
/** = `LIBRERIA_ROOM` de `state/disenoStore.ts`: el inventario sigue mostrando el conjunto. */
const LIBRERIA_ROOM = '__libreria__'

/** Qué separar de `o`, o nada: inventario, ya separado, piezas del usuario o un .glb. */
function defDe(o: ObjetoCuarto): DefSeparable | null {
  if (o.id == null || o.separado || o.roomId === LIBRERIA_ROOM || o.tipo === 'glb') return null
  // Lo pasado a piezas a mano ya no tiene partes que soltar; una receta del taller sí.
  if (o.tipo === TIPO_PIEZAS && !o.mueble) return null
  return defSeparable(o) ?? null
}

/** El nivel de la base cuya superficie queda a la altura de `parte.sobre`. */
function nivelDe(base: ObjetoCuarto, parte: ParteSeparable): number {
  if (parte.sobre === 'suelo') return NIVEL_SUELO
  const alto = parte.sobre
  const sup = superficiesDeObjeto(base)
  if (!sup.length) return NIVEL_SUELO
  return sup.reduce((mejor, s) => (Math.abs(s.y - alto) < Math.abs(mejor.y - alto) ? s : mejor)).nivel
}

/** La base marcada y una fila por parte, listas para guardar. Null si `o` no se separa. */
export function planSeparacion(o: ObjetoCuarto): { base: Partial<ObjetoCuarto>; partes: ObjetoCuarto[] } | null {
  const def = defDe(o)
  if (!def) return null
  const base: ObjetoCuarto = { ...o, separado: true }
  const uidBase = (o as { uid?: string }).uid
  const partes = def.partes.map((p): ObjetoCuarto => {
    const [x, z] = aCuarto(o, p.x, p.z)
    const nivel = nivelDe(base, p)
    const piezas = p.piezas(o.color)
    const giro = (o.rotY ?? 0) + ((p.rotY ?? 0) * 180) / Math.PI
    return {
      roomId: o.roomId,
      tipo: TIPO_PIEZAS,
      // El de su primera pieza: con él se regenera si luego toma una entrada (un libro rojo sigue rojo).
      color: piezas[0]?.color ?? o.color,
      slot: o.slot,
      x,
      z,
      rotY: ((giro % 360) + 360) % 360,
      ...(o.escala != null ? { escala: o.escala } : {}),
      piezas,
      nombre: tGlobal(p.clave, p.es),
      parte: `${o.tipoOriginal ?? o.tipo}#${p.id}`,
      apoyoId: o.id,
      apoyoNivel: nivel,
      y: yApoyo(base, nivel, { tipo: TIPO_PIEZAS, escala: o.escala }),
      ...(p.forma ? { formaEntrada: p.forma } : {}),
      ...(uidBase ? ({ uid: `${uidBase}-parte-${p.id}` } as object) : {}),
    }
  })
  return { base: { separado: true }, partes }
}

/**
 * Guarda la separación de `o` (la base y las partes que falten). Devuelve las
 * partes creadas, o null si `o` no se separa.
 */
export async function guardarSeparacion(o: ObjetoCuarto): Promise<ObjetoCuarto[] | null> {
  const plan = planSeparacion(o)
  if (!plan || o.id == null) return null
  await db.objetosCuarto.update(o.id, plan.base)
  const creadas: ObjetoCuarto[] = []
  for (const fila of plan.partes) {
    const uid = (fila as { uid?: string }).uid
    if (uid && (await db.objetosCuarto.where('uid').equals(uid).count())) continue
    fila.id = (await db.objetosCuarto.add(fila)) as number
    creadas.push(fila)
  }
  return creadas
}

/** Casas ya creadas y la demo: separa todo lo que falte. Muta `objetos` para que el store arranque con el resultado. */
export async function separarCompuestos(objetos: ObjetoCuarto[]): Promise<void> {
  for (const o of [...objetos]) {
    const creadas = await guardarSeparacion(o)
    if (!creadas) continue
    o.separado = true
    objetos.push(...creadas)
  }
}
