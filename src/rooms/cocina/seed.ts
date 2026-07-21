import { db } from '../../core/data/db'
import type { DietaGuardada, Receta, RegistroComida } from '../../core/data/db'
import { PERFIL_DEFECTO } from './constantes'
import { adivinarCategoria } from './categoriasCompra'
import { hoyISO, sumarDias } from './fecha'
import { filaSeed, filasSeed } from '../../core/data/sync/syncables'

/** Clave estable para el uid de siembra (misma en todo dispositivo). */
const slugSeed = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

let sembrado = false

/** Bandera persistente versionada: al subir la versión se añaden los ejemplos nuevos. */
const LS_EJEMPLOS = 'cocina.ejemplosSembrados'
const VERSION_EJEMPLOS = '3'

/** Datos iniciales de cocina (solo la primera vez). */
export async function sembrarCocina() {
  if (sembrado) return
  sembrado = true

  const perfil = await db.perfilNutricion.toCollection().first()
  if (!perfil) await db.perfilNutricion.add(filaSeed('perfilNutricion-0', PERFIL_DEFECTO))

  if (localStorage.getItem(LS_EJEMPLOS) !== VERSION_EJEMPLOS) {
    await sembrarEjemplos()
    await sembrarDiaEjemplo()
    await sembrarListaEjemplo()
    localStorage.setItem(LS_EJEMPLOS, VERSION_EJEMPLOS)
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

/** Receta de ejemplo sin los campos comunes (fuente/creadaEn). */
type RecetaSeed = Omit<Receta, 'id' | 'fuente' | 'creadaEn'>

/**
 * Siembra recetas de ejemplo (con carpeta) y dietas preguardadas que las usan.
 * Idempotente por NOMBRE: no duplica lo que ya exista, así se pueden añadir
 * ejemplos nuevos subiendo VERSION_EJEMPLOS sin repetir los anteriores.
 */
async function sembrarEjemplos() {
  const creadaEn = new Date().toISOString()
  const idPorNombre = new Map<string, number>()
  for (const r of await db.recetas.toArray()) if (r.id != null) idPorNombre.set(r.nombre, r.id)

  const rec = async (r: RecetaSeed): Promise<number> => {
    const ya = idPorNombre.get(r.nombre)
    if (ya != null) return ya
    const id = await db.recetas.add(
      filaSeed(`recetas-${slugSeed(r.nombre)}`, { ...r, fuente: 'seed', creadaEn }),
    )
    idPorNombre.set(r.nombre, id)
    return id
  }

  const pastaPesto = await rec({
    nombre: 'Pasta al pesto', emoji: '🍝', carpeta: 'Italiana', porciones: 2, minutos: 20,
    etiquetas: ['pasta', 'rápida', 'vegetariana'],
    ingredientes: ['200 g de pasta', '4 cucharadas de pesto', '30 g de queso parmesano', '1 cucharada de aceite de oliva'],
    pasos: ['Cuece la pasta al dente.', 'Escúrrela y mézclala con el pesto.', 'Sirve con parmesano rallado.'],
    calorias: 520, proteinas: 16, carbohidratos: 70, grasas: 20,
  })
  await rec({
    nombre: 'Pizza margarita', emoji: '🍕', carpeta: 'Italiana', porciones: 2, minutos: 30,
    etiquetas: ['horno', 'vegetariana'],
    ingredientes: ['1 base de pizza', '150 g de salsa de tomate', '125 g de mozzarella', 'Hojas de albahaca'],
    pasos: ['Extiende la salsa sobre la base.', 'Añade la mozzarella.', 'Hornea a 220 °C 12 min.', 'Termina con albahaca.'],
    calorias: 610, proteinas: 24, carbohidratos: 78, grasas: 22,
  })
  const tacosPastor = await rec({
    nombre: 'Tacos al pastor', emoji: '🌮', carpeta: 'Mexicana', porciones: 3, minutos: 40,
    etiquetas: ['cerdo', 'clásico'],
    ingredientes: ['400 g de carne de cerdo adobada', '9 tortillas de maíz', '1/2 piña', '1 cebolla', 'Cilantro al gusto'],
    pasos: ['Asa la carne adobada.', 'Pícala fina con piña.', 'Sirve en tortillas con cebolla y cilantro.'],
    calorias: 430, proteinas: 28, carbohidratos: 34, grasas: 20,
  })
  const chilaquiles = await rec({
    nombre: 'Chilaquiles verdes', emoji: '🍳', carpeta: 'Mexicana', porciones: 2, minutos: 25,
    etiquetas: ['desayuno'],
    ingredientes: ['200 g de totopos', '300 ml de salsa verde', '2 huevos', '50 g de queso fresco', 'Crema al gusto'],
    pasos: ['Calienta la salsa verde.', 'Añade los totopos y mezcla.', 'Sirve con huevo, queso y crema.'],
    calorias: 480, proteinas: 18, carbohidratos: 52, grasas: 22,
  })
  const ensaladaMed = await rec({
    nombre: 'Ensalada mediterránea', emoji: '🥗', carpeta: 'Saludable', porciones: 2, minutos: 15,
    etiquetas: ['ligera', 'vegetariana'],
    ingredientes: ['1 pepino', '2 jitomates', '80 g de queso feta', '10 aceitunas', '2 cucharadas de aceite de oliva'],
    pasos: ['Pica las verduras.', 'Añade feta y aceitunas.', 'Aliña con aceite de oliva.'],
    calorias: 280, proteinas: 10, carbohidratos: 14, grasas: 20,
  })
  const salmonHorno = await rec({
    nombre: 'Salmón al horno', emoji: '🐟', carpeta: 'Saludable', porciones: 2, minutos: 25,
    etiquetas: ['pescado', 'alta proteína'],
    ingredientes: ['2 filetes de salmón (300 g)', '1 limón', '2 dientes de ajo', 'Eneldo y sal al gusto'],
    pasos: ['Coloca el salmón en una charola.', 'Sazona con ajo, limón y eneldo.', 'Hornea a 200 °C 18 min.'],
    calorias: 370, proteinas: 40, carbohidratos: 2, grasas: 22,
  })
  const polloParrilla = await rec({
    nombre: 'Pollo a la parrilla', emoji: '🍗', carpeta: 'Saludable', porciones: 2, minutos: 20,
    etiquetas: ['pollo', 'alta proteína'],
    ingredientes: ['300 g de pechuga de pollo', '1 cucharada de aceite de oliva', 'Especias y sal al gusto', '1 limón'],
    pasos: ['Sazona el pollo.', 'Ásalo 6-7 min por lado.', 'Reposa y sirve con limón.'],
    calorias: 330, proteinas: 52, carbohidratos: 2, grasas: 12,
  })
  const bowlQuinoa = await rec({
    nombre: 'Bowl de quinoa', emoji: '🥙', carpeta: 'Saludable', porciones: 2, minutos: 25,
    etiquetas: ['vegetariana', 'fibra'],
    ingredientes: ['150 g de quinoa', '100 g de garbanzos cocidos', '1 zanahoria', '1/2 aguacate', '2 cucharadas de aceite de oliva'],
    pasos: ['Cuece la quinoa.', 'Pica las verduras.', 'Mezcla todo y aliña.'],
    calorias: 430, proteinas: 16, carbohidratos: 58, grasas: 16,
  })
  const avena = await rec({
    nombre: 'Avena overnight', emoji: '🥣', carpeta: 'Saludable', porciones: 1, minutos: 5,
    etiquetas: ['desayuno', 'rápida'],
    ingredientes: ['60 g de avena', '200 ml de leche', '1 plátano', '1 cucharada de semillas de chía'],
    pasos: ['Mezcla avena, leche y chía.', 'Refrigera toda la noche.', 'Sirve con plátano en rodajas.'],
    calorias: 350, proteinas: 14, carbohidratos: 55, grasas: 8,
  })

  const dietas: Omit<DietaGuardada, 'id' | 'creadoEn'>[] = [
    {
      nombre: 'Mediterránea', descripcion: 'Rica en vegetales, pescado y aceite de oliva. Equilibrada y sostenible.',
      calorias: 2000, proteinas: 110, carbohidratos: 210, grasas: 70,
      recetaIds: [ensaladaMed, salmonHorno, pastaPesto],
    },
    {
      nombre: 'Alta en proteína', descripcion: 'Prioriza proteína para recomposición corporal y saciedad.',
      calorias: 2200, proteinas: 180, carbohidratos: 170, grasas: 70,
      recetaIds: [salmonHorno, tacosPastor, chilaquiles],
    },
    {
      nombre: 'Keto', descripcion: 'Baja en carbohidratos y alta en grasas saludables.',
      calorias: 1800, proteinas: 120, carbohidratos: 40, grasas: 130,
      recetaIds: [salmonHorno, ensaladaMed],
    },
    {
      nombre: 'Vegetariana', descripcion: 'Sin carne, basada en vegetales, legumbres y cereales integrales.',
      calorias: 2000, proteinas: 90, carbohidratos: 250, grasas: 65,
      recetaIds: [ensaladaMed, pastaPesto, bowlQuinoa, avena],
    },
    {
      nombre: 'Ganancia muscular', descripcion: 'Superávit calórico con proteína alta para ganar masa muscular.',
      calorias: 2800, proteinas: 170, carbohidratos: 300, grasas: 85,
      recetaIds: [polloParrilla, salmonHorno, tacosPastor, pastaPesto, avena],
    },
    {
      nombre: 'Pérdida de grasa', descripcion: 'Déficit calórico con proteína alta para conservar músculo.',
      calorias: 1600, proteinas: 140, carbohidratos: 120, grasas: 50,
      recetaIds: [ensaladaMed, salmonHorno, polloParrilla, bowlQuinoa],
    },
    {
      nombre: 'Sin gluten', descripcion: 'Evita el trigo y derivados; base de maíz, arroz, pescado y verduras.',
      calorias: 2000, proteinas: 120, carbohidratos: 180, grasas: 70,
      recetaIds: [tacosPastor, chilaquiles, salmonHorno, ensaladaMed, polloParrilla],
    },
  ]

  const yaExisten = new Set((await db.dietasGuardadas.toArray()).map((d) => d.nombre))
  const nuevas = filasSeed(
    'dietasGuardadas',
    dietas.filter((d) => !yaExisten.has(d.nombre)).map((d) => ({ ...d, creadoEn: creadaEn })),
    (d) => slugSeed(d.nombre),
  )
  if (nuevas.length) await db.dietasGuardadas.bulkAdd(nuevas)
}
