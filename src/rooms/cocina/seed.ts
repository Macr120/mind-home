import { db } from '../../core/data/db'
import type { DietaGuardada, RegistroComida } from '../../core/data/db'
import { DIETAS_EJEMPLO, RECETAS_EJEMPLO } from './ejemplos'
import { PERFIL_DEFECTO } from './constantes'
import { adivinarCategoria } from './categoriasCompra'
import { hoyISO, sumarDias } from './fecha'
import { claveLS } from '../../core/edicion'
import { filaSeed, filasSeed } from '../../core/data/sync/syncables'

/** Clave estable para el uid de siembra (misma en todo dispositivo). */
const slugSeed = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

let sembrado = false

/** Bandera persistente versionada: al subir la versión se añaden los ejemplos nuevos. */
const LS_EJEMPLOS = claveLS('cocina.ejemplosSembrados')
const VERSION_EJEMPLOS = '4'

/** Datos iniciales de cocina (solo la primera vez). */
export async function sembrarCocina() {
  if (sembrado) return
  sembrado = true

  const perfil = await db.perfilNutricion.toCollection().first()
  if (!perfil) await db.perfilNutricion.add(filaSeed('perfilNutricion-0', PERFIL_DEFECTO))

  if (localStorage.getItem(LS_EJEMPLOS) !== VERSION_EJEMPLOS) {
    await sembrarEjemplos()
    await catalogarMomentos()
    await sembrarDiaEjemplo()
    await sembrarListaEjemplo()
    localStorage.setItem(LS_EJEMPLOS, VERSION_EJEMPLOS)
  }
}

/**
 * Pone los momentos del día a las recetas de fábrica que se sembraron antes de
 * que existiera el campo (v4). Sin esto el filtro del plan de comidas nacería
 * inerte para quien ya tenía la app: todo valdría para todo.
 *
 * Solo toca las que siguen sin catalogar: lo que el usuario haya puesto manda.
 */
async function catalogarMomentos() {
  const porNombre = new Map(RECETAS_EJEMPLO.map((r) => [r.nombre, r.momentos]))
  for (const r of await db.recetas.toArray()) {
    const momentos = porNombre.get(r.nombre)
    if (r.id == null || !momentos?.length || r.momentos?.length) continue
    await db.recetas.update(r.id, { momentos })
  }
}

/**
 * Un día completo de comidas + agua fechado AYER: deja hoy libre para los datos
 * reales del usuario, pero la gráfica de 7 días y la adherencia nacen con algo
 * que mostrar. Se borran como cualquier registro.
 */
async function sembrarDiaEjemplo() {
  const fecha = sumarDias(hoyISO(), -1)
  if (await db.registrosComida.where('fecha').equals(fecha).count()) return

  const comidas: Omit<RegistroComida, 'id'>[] = [
    {
      fecha, momento: 'desayuno', nombre: 'Avena overnight con plátano',
      calorias: 350, proteinas: 14, carbohidratos: 55, grasas: 8,
      nota: 'Ejemplo: así se ve un día registrado.',
    },
    {
      fecha, momento: 'snack', nombre: 'Yogur griego con nueces',
      calorias: 230, proteinas: 18, carbohidratos: 12, grasas: 12,
    },
    {
      fecha, momento: 'comida', nombre: 'Pollo a la parrilla con arroz y verduras',
      calorias: 845, proteinas: 62, carbohidratos: 95, grasas: 24,
    },
    {
      fecha, momento: 'cena', nombre: 'Salmón al horno con ensalada',
      calorias: 595, proteinas: 48, carbohidratos: 24, grasas: 34,
    },
  ]
  await db.registrosComida.bulkAdd(filasSeed('registrosComida-demo', comidas))

  if (!(await db.registrosAgua.where('fecha').equals(fecha).count())) {
    await db.registrosAgua.bulkAdd(
      filasSeed('registrosAgua-demo', [
        { fecha, ml: 750 },
        { fecha, ml: 750 },
        { fecha, ml: 500 },
      ]),
    )
  }
}

/** Lista del súper de ejemplo, ya guardada y con parte marcada como comprada. */
async function sembrarListaEjemplo() {
  const nombre = 'Ejemplo: Súper semanal'
  // `nombre` no está indexado (listasCompra: '++id, creadoEn'): se filtra en memoria.
  if ((await db.listasCompra.toArray()).some((l) => l.nombre === nombre)) return

  const creadoEn = new Date().toISOString()
  const listaId = await db.listasCompra.add(filaSeed('listasCompra-super', { nombre, creadoEn }))
  const items: [string, string, boolean][] = [
    // [nombre, cantidad, comprado]
    ['Pechuga de pollo', '1 kg', true],
    ['Salmón', '2 filetes', false],
    ['Huevos', '1 docena', true],
    ['Jitomate', '1 kg', false],
    ['Aguacate', '3 piezas', false],
    ['Espinaca', '1 bolsa', false],
    ['Yogur griego', '1 L', true],
    ['Queso feta', '200 g', false],
    ['Avena', '1 kg', false],
    ['Arroz integral', '1 kg', false],
    ['Aceite de oliva', '1 botella', false],
    ['Tortillas de maíz', '1 kg', false],
  ]
  await db.itemsCompra.bulkAdd(
    filasSeed(
      'itemsCompra-super',
      items.map(([nombreItem, cantidad, comprado]) => ({
        nombre: nombreItem,
        cantidad,
        categoria: adivinarCategoria(nombreItem),
        comprado,
        creadoEn,
        listaId,
      })),
    ),
  )
}

/**
 * Siembra recetas de ejemplo (con carpeta) y dietas preguardadas que las usan.
 * Idempotente por NOMBRE: no duplica lo que ya exista, así se pueden añadir
 * ejemplos nuevos subiendo VERSION_EJEMPLOS sin repetir los anteriores.
 */
async function sembrarEjemplos() {
  const creadaEn = new Date().toISOString()
  const idPorNombre = new Map<string, number>()
  for (const r of await db.recetas.toArray()) if (r.id != null) idPorNombre.set(r.nombre, r.id)

  for (const r of RECETAS_EJEMPLO) {
    if (idPorNombre.has(r.nombre)) continue
    const id = await db.recetas.add(
      filaSeed(`recetas-${slugSeed(r.nombre)}`, { ...r, fuente: 'seed', creadaEn }),
    )
    idPorNombre.set(r.nombre, id)
  }

  const yaExisten = new Set((await db.dietasGuardadas.toArray()).map((d) => d.nombre))
  const dietas: Omit<DietaGuardada, 'id'>[] = DIETAS_EJEMPLO.filter((d) => !yaExisten.has(d.nombre)).map(
    ({ recetas, ...d }) => ({
      ...d,
      recetaIds: recetas.map((n) => idPorNombre.get(n)).filter((id): id is number => id != null),
      creadoEn: creadaEn,
    }),
  )
  const nuevas = filasSeed('dietasGuardadas', dietas, (d) => slugSeed(d.nombre))
  if (nuevas.length) await db.dietasGuardadas.bulkAdd(nuevas)
}
