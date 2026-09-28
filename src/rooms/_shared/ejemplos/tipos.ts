// El catálogo por idioma vive en `core/i18n` (lo comparten el demo, Sísifo y el
// diario); se re-exporta aquí porque los ejemplos fueron su primer usuario.
import { porIdioma, type PorIdioma } from '../../../core/i18n/porIdioma'
import {
  esEjemplo,
  syncListoParaEjemplos,
  uidEjemplo,
  useEjemplos,
  type FilaEjemplo,
} from '../../../core/data/ejemplos'
import { esDemo, esVisita } from '../../../core/edicion'
export { porIdioma, type PorIdioma } from '../../../core/i18n/porIdioma'

/** Lo que un paquete usa de un repositorio de `repository.ts`. */
export interface TablaEjemplo {
  alguna(pred: (fila: FilaEjemplo) => boolean): Promise<boolean>
  list(): Promise<unknown[]>
  remove(id: number): Promise<void>
}

/**
 * Contrato de un ejemplo de fábrica.
 *
 * La primera vez que se abre la sección vacía, `BarraEjemplo` lo pone solo
 * (`ponerPrimeraVez`); desde ahí sus filas son datos normales que se borran
 * como cualquier otro, y cuando ya no queda ninguna la barra ofrece
 * restaurarlo. El paquete solo sabe crear sus filas y en qué tablas viven.
 */
export interface PaqueteEjemplo {
  /** Id de la sección: `'<cuarto>.<sección>'`. También es el sufijo del `data-tut`. */
  id: string
  /**
   * Tablas en las que el ejemplo deja filas: se miran para saber si la
   * sección está vacía y se vacían (solo sus filas de ejemplo) al borrarlo.
   */
  tablas: TablaEjemplo[]
  /**
   * Crea las filas del ejemplo con `filaEjemplo` y `repo.addSeed`.
   * `restaurar`: lo pidió el usuario tras borrarlo (ver `filaEjemplo`).
   */
  materializar(restaurar: boolean): Promise<void>
  /**
   * ¿Hay datos del usuario en la sección? Sin esto, cualquier fila que no sea
   * de ejemplo en `tablas`. Hace falta cuando la sección comparte tabla con
   * otras (p. ej. una sola tabla de eventos para varias pestañas).
   */
  hayPropios?(): Promise<boolean>
  /**
   * Por qué no se puede poner ahora mismo (clave de `dict.ts`), p. ej. el mapa
   * sin sitio libre en la infraestructura 3D. Sin esto, siempre se puede.
   */
  impedimento?(): Promise<string | null>
  /**
   * Reescribe al idioma activo los campos de texto de las filas que sigan
   * siendo los de fábrica (ver `retraducido`): las filas se crean una sola vez,
   * así que sin esto un cambio de idioma dejaría el ejemplo en el idioma
   * viejo. Los ejemplos sin texto (huerto, granja, caminos) no lo llevan.
   */
  retraducir?(): Promise<void>
  /** Limpieza que no sale de `tablas` (p. ej. lo proyectado en el calendario). */
  alBorrar?(): Promise<void>
  /**
   * `false`: el ejemplo lo siembra la propia app al montarse (cocina, garage…),
   * con sus filas `seed-…` sin marca. La barra entonces no lo pone: solo ofrece
   * borrarlo y restaurarlo, y para eso el paquete trae `hayEjemplo` y `borrar`.
   */
  auto?: false
  /** ¿Queda algo del ejemplo? Sin esto, alguna fila de `tablas` con `ejemploDe === id`. */
  hayEjemplo?(): Promise<boolean>
  /** Borra el ejemplo entero. Sin esto, las filas de `tablas` con `ejemploDe === id` y `alBorrar`. */
  borrar?(): Promise<void>
}

/**
 * Una fila de ejemplo lista para `repo.addSeed`: la marca de su sección y su uid
 * fijo (`clave` distingue las filas de la sección, y tiene que ser estable).
 *
 * Nace con el sello de semilla (`updatedAt: 1`): si otro dispositivo ya puso el
 * mismo ejemplo, las dos copias se funden, y cualquier cambio real del usuario
 * les gana. `restaurar` la sella con la hora actual: el servidor guarda el
 * borrado de ese mismo uid, y con el sello de semilla el borrado ganaría y el
 * ejemplo restaurado nunca llegaría a los demás dispositivos.
 */
export function filaEjemplo<T extends object>(
  seccion: string,
  clave: string | number,
  restaurar: boolean,
  fila: T,
): T {
  return { ...fila, ejemploDe: seccion, uid: uidEjemplo(seccion, clave), updatedAt: restaurar ? Date.now() : 1 }
}

/**
 * El texto de fábrica en el idioma activo para un campo de una fila de ejemplo,
 * o `null` si no hay nada que cambiar.
 *
 * Es la guarda de `retraducir`: solo propone valor si el guardado sigue siendo
 * el de fábrica de alguna de las `claves` en ALGÚN idioma del catálogo. Lo que
 * el usuario editó no casa con ningún catálogo y se queda como está para
 * siempre, igual que las siembras (`esSeedIntacta` en cocina y garage).
 */
export function retraducido<T extends Record<string, string>>(
  catalogo: PorIdioma<T>,
  valor: string | undefined,
  ...claves: (keyof T & string)[]
): string | null {
  if (!valor) return null
  const versiones = Object.values(catalogo) as T[]
  for (const clave of claves) {
    if (versiones.some((v) => v[clave] === valor)) {
      const activo = porIdioma(catalogo)[clave]
      return activo === valor ? null : activo
    }
  }
  return null
}

/**
 * ¿Las filas de este ejemplo ya están creadas? Cinturón de `materializar`: el
 * uid es único, así que crear dos veces el mismo ejemplo fallaría a medias.
 */
export async function yaMaterializado(
  id: string,
  ...listas: Array<() => Promise<unknown[]>>
): Promise<boolean> {
  for (const lista of listas) {
    if ((await lista()).some((f) => (f as FilaEjemplo).ejemploDe === id)) return true
  }
  return false
}

/** Qué hay en la sección: su ejemplo y/o datos del usuario. */
export interface EstadoSeccion {
  ejemplo: boolean
  propios: boolean
}

export async function estadoSeccion(p: PaqueteEjemplo): Promise<EstadoSeccion> {
  let ejemplo = p.hayEjemplo ? await p.hayEjemplo() : false
  let propios = false
  for (const t of p.tablas) {
    if (!ejemplo && !p.hayEjemplo) ejemplo = await t.alguna((f) => f.ejemploDe === p.id)
    if (!propios && !p.hayPropios) propios = await t.alguna((f) => !esEjemplo(f))
  }
  if (p.hayPropios) propios = await p.hayPropios()
  return { ejemplo, propios }
}

/** Borra TODAS las filas del ejemplo de la sección; lo del usuario no se toca. */
export async function borrarEjemplo(p: PaqueteEjemplo): Promise<void> {
  if (p.borrar) return p.borrar()
  for (const t of p.tablas) {
    for (const f of await t.list()) {
      const fila = f as FilaEjemplo & { id?: number }
      if (fila.ejemploDe === p.id && fila.id != null) await t.remove(fila.id)
    }
  }
  await p.alBorrar?.()
}

/** Tareas en vuelo: StrictMode, dos barras del mismo paquete o dos pestañas de la app. */
const enCurso = new Map<string, Promise<string | null>>()

/**
 * La primera vez que se abre la sección vacía, pone su ejemplo. Devuelve la
 * razón (clave de `dict.ts`) si ahora mismo no se pudo, o `null`.
 *
 * Solo una vez por sección y dispositivo: si ya había algo (el ejemplo o datos
 * del usuario) o si ya se puso antes, la sección queda decidida y no se toca.
 * Si la nube aún no bajó, no se decide nada: se reintenta al volver a abrirla.
 */
export function ponerPrimeraVez(p: PaqueteEjemplo): Promise<string | null> {
  const previa = enCurso.get(p.id)
  if (previa) return previa
  const tarea = (async (): Promise<string | null> => {
    const { decididas, decidir } = useEjemplos.getState()
    if (decididas.includes(p.id) || esDemo() || esVisita()) return null
    if (!(await syncListoParaEjemplos())) return null
    const estado = await estadoSeccion(p)
    if (estado.ejemplo || estado.propios) {
      decidir(p.id)
      return null
    }
    // Lo siembra la propia app: aquí solo se decide al verlo puesto.
    if (p.auto === false) return null
    const razon = (await p.impedimento?.()) ?? null
    if (razon) return razon
    // Antes de escribir: si algo falla a medias, no se reintenta en bucle.
    decidir(p.id)
    await p.materializar(false)
    return null
  })().finally(() => enCurso.delete(p.id))
  enCurso.set(p.id, tarea)
  return tarea
}

/** Vuelve a poner el ejemplo que el usuario borró. Misma respuesta que `ponerPrimeraVez`. */
export async function restaurarEjemplo(p: PaqueteEjemplo): Promise<string | null> {
  const razon = (await p.impedimento?.()) ?? null
  if (razon) return razon
  useEjemplos.getState().decidir(p.id)
  await p.materializar(true)
  return null
}
