import { db, type CapaDibujo, type Dibujo } from '../../core/data/db'
import { esSeedIntacta, filaSeed } from '../../core/data/sync/syncables'
import { claveLS, esDemo } from '../../core/edicion'
import { porIdioma } from '../../core/i18n/porIdioma'
import { miniaturaFoto } from '../_shared/fotos'
import { ALTO, ANCHO, DIBUJOS_FABRICA, lienzo, type DibujoFabrica } from './ejemplos'
import { TEXTOS_ARTE } from './ejemplos.data'

let sembrado = false

/** Bandera persistente versionada: al subir la versión se añaden los dibujos nuevos. */
const LS_EJEMPLOS = claveLS('arte.ejemplosSembrados')
const VERSION_EJEMPLOS = '1'

/** La sección del ejemplo viejo (el interruptor «Ver un ejemplo»), ya retirado. */
const EJEMPLO_VIEJO = 'arte.dibujos'

const uidDe = (f: DibujoFabrica) => `seed-dibujos-${f.clave}`

/**
 * Los dos dibujos de fábrica (el paisaje y el bodegón, ambos por capas). Son
 * filas normales: se renombran, se editan y se BORRAN como cualquier dibujo, y
 * la bandera evita que vuelvan. En el demo no hay bandera: la BD se repone al
 * recargar, así que se siembran siempre que falten (`sembrado` evita repetirlo
 * en la misma sesión, que es lo que dura lo borrado allí).
 */
export async function sembrarArte() {
  if (sembrado) return
  sembrado = true

  const filas = await db.dibujos.toArray()
  // Las filas del ejemplo viejo vivían escondidas tras el interruptor: fuera.
  const viejos = filas.filter((d) => d.ejemploDe === EJEMPLO_VIEJO && d.id != null).map((d) => d.id!)
  if (viejos.length) await db.dibujos.bulkDelete(viejos)

  if (!esDemo() && localStorage.getItem(LS_EJEMPLOS) === VERSION_EJEMPLOS) return
  // Idempotencia por uid (el nombre puede estar traducido o editado).
  const uids = new Set(filas.map((d) => d.uid))
  const T = porIdioma(TEXTOS_ARTE)
  for (const f of DIBUJOS_FABRICA) {
    if (uids.has(uidDe(f))) continue
    const ahora = new Date().toISOString()
    const capas: CapaDibujo[] = []
    for (const [i, c] of f.capas.entries()) {
      capas.push({
        capaId: `ca-${f.clave}-${i}`,
        nombre: T[c.nombre],
        visible: true,
        opacidad: 1,
        imagen: await lienzo(c.pintar),
      })
    }
    // La composición aplanada sobre blanco: es la que leen galería, IA y export.
    const imagen = await lienzo((ctx) => f.capas.forEach((c) => c.pintar(ctx)), '#ffffff')
    const dibujo: Dibujo = {
      nombre: T[f.nombre],
      imagen,
      miniatura: await miniaturaFoto(imagen),
      ancho: ANCHO,
      alto: ALTO,
      capas,
      // Igual que `actualizadoEn`: manda la versión con capas (ver `Dibujo`).
      capasEn: ahora,
      creadoEn: ahora,
      actualizadoEn: ahora,
    }
    await db.dibujos.add(filaSeed(`dibujos-${f.clave}`, dibujo))
  }
  if (!esDemo()) localStorage.setItem(LS_EJEMPLOS, VERSION_EJEMPLOS)
}

/**
 * Reescribe al idioma activo el nombre y las capas de los dibujos de fábrica
 * que nadie ha tocado (`esSeedIntacta`). Escribe con `db.dibujos.update` crudo
 * a propósito: el middleware conserva `updatedAt: 1` en uids `seed-…`, así la
 * fila sigue siendo retraducible; en cuanto el usuario la edita en el editor
 * (por el repo), deja de ser intacta y sus textos mandan para siempre.
 */
export async function retraducirArte() {
  const T = porIdioma(TEXTOS_ARTE)
  for (const d of await db.dibujos.toArray()) {
    const f = DIBUJOS_FABRICA.find((x) => uidDe(x) === d.uid)
    if (!f || d.id == null || !esSeedIntacta(d)) continue
    const cambios: Partial<Dibujo> = {}
    const nombre = T[f.nombre]
    if (nombre !== d.nombre) cambios.nombre = nombre
    // Los nombres de capa viven dentro de la fila: se reescribe el array entero.
    const capas = d.capas?.map((c, i) => {
      const clave = f.capas[i]?.nombre
      return clave && T[clave] !== c.nombre ? { ...c, nombre: T[clave] } : c
    })
    if (capas?.some((c, i) => c !== d.capas?.[i])) cambios.capas = capas
    if (Object.keys(cambios).length) await db.dibujos.update(d.id, cambios)
  }
}
