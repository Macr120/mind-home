/**
 * Modo probar: la casa PROPIA sin cuenta — una BD paralela (`mind-home-probar`)
 * donde el visitante hace la bienvenida y usa la app de verdad, pero nada
 * cuenta como guardado: sin sesión no hay IA ni sync, y al editar se le avisa
 * que inicie sesión. Si crea cuenta y paga, `migrarPruebaALaCasa()` vuelca la
 * prueba a la BD real; si no, la BD de prueba se queda como caché de reentrada
 * hasta que la conversión (o elegir la bienvenida de nuevo) la borre.
 *
 * Entrar y salir SIEMPRE recargan la página: `esProbar()` está congelado a la
 * carga y la BD ya abrió con un nombre (ver core/edicion.ts y data/db.ts).
 */
import Dexie from 'dexie'
import { LS_PROBAR, esDemo, esProbar } from '../core/edicion'

const DB_PROBAR = 'mind-home-probar'

/**
 * Marca CRUDA (sin `claveLS`): hay ediciones del visitante en la BD de prueba.
 * Se lee desde el modo REAL en la conversión (¿recuperar la prueba o hacer la
 * bienvenida?), así que no puede llevar el prefijo `probar:`.
 */
const LS_PROBAR_SUCIO = 'mh.probar.sucio'

export function hayPruebaSucia(): boolean {
  return localStorage.getItem(LS_PROBAR_SUCIO) === '1'
}

export function marcarPruebaSucia(): void {
  localStorage.setItem(LS_PROBAR_SUCIO, '1')
}

export function entrarProbar(): void {
  void (async () => {
    // La prueba SIEMPRE arranca de cero: quien vuelve a entrar (p. ej. después
    // de salir a crear su cuenta) no debe encontrarse la casa de la vez
    // anterior. La BD pendiente de conversión solo sobrevive mientras NO se
    // reentre a probar — la conversión corre desde el modo real y no pasa por aquí.
    await borrarProbar()
    localStorage.setItem(LS_PROBAR, '1')
    location.reload()
  })()
}

/** La BD de prueba se conserva (caché de reentrada); solo se apaga el modo. */
export function salirProbar(): void {
  localStorage.setItem(LS_PROBAR, '0')
  location.reload()
}

/**
 * Borra la BD de prueba y todo su rastro en localStorage. Solo desde el modo
 * real (en probar la BD está abierta y el delete quedaría bloqueado).
 */
export async function borrarProbar(): Promise<void> {
  if (esProbar()) return
  await Dexie.delete(DB_PROBAR)
  for (const clave of Object.keys(localStorage)) {
    if (clave.startsWith('probar:')) localStorage.removeItem(clave)
  }
  localStorage.removeItem(LS_PROBAR_SUCIO)
}

/**
 * ¿Existe la BD de prueba? La conversión lo verifica antes de ofrecer
 * recuperarla (el flag sucio podría sobrevivir a una BD purgada por el navegador).
 */
export function existePrueba(): Promise<boolean> {
  return Dexie.exists(DB_PROBAR)
}

/**
 * Vuelca la casa de prueba a la BD REAL como foto completa (mismo patrón que
 * restaurar un respaldo: una sola transacción, `bulkAdd` conserva ids y uids, y
 * las tablas `_` quedan intactas — el middleware de sync encola cada fila en el
 * `_outbox`, así la sync sube toda la casa al tener plan). Al final recarga:
 * los stores de la casa solo leen al arrancar.
 */
export async function migrarPruebaALaCasa(): Promise<void> {
  if (esDemo() || esProbar()) return
  // Dexie sin `version()` abre en modo dinámico con el esquema instalado; como
  // es el mismo build, las tablas coinciden con las de la BD real.
  const cruda = new Dexie(DB_PROBAR)
  const datos: Record<string, unknown[]> = {}
  try {
    await cruda.open()
    for (const tabla of cruda.tables) {
      if (tabla.name.startsWith('_')) continue
      datos[tabla.name] = await tabla.toArray()
    }
  } finally {
    cruda.close()
  }
  const { db } = await import('../core/data/db')
  await db.transaction('rw', db.tables, async () => {
    for (const tabla of db.tables) {
      if (tabla.name.startsWith('_')) continue
      await tabla.clear()
      const filas = datos[tabla.name]
      if (filas?.length) await tabla.bulkAdd(filas)
    }
  })
  // Los flags de la prueba pasan a ser los de la casa ANTES de borrarlos: los
  // seeds son idempotentes solo por su flag LS (sin esto resembrarían encima) y
  // `probar:mh.bienvenida` deja además la bienvenida como ya hecha.
  for (const clave of Object.keys(localStorage)) {
    if (!clave.startsWith('probar:')) continue
    const valor = localStorage.getItem(clave)
    if (valor !== null) localStorage.setItem(clave.slice('probar:'.length), valor)
  }
  await borrarProbar()
  location.reload()
}
