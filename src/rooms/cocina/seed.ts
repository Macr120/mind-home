import { db } from '../../core/data/db'
import type { DietaGuardada, RegistroComida } from '../../core/data/db'
import { DIETAS_EJEMPLO, RECETAS_EJEMPLO } from './ejemplos'
import { textosEjemplosCocina, type TextosEjemplosCocina } from './ejemplos.i18n'
import { PERFIL_DEFECTO } from './constantes'
import { adivinarCategoria } from './categoriasCompra'
import { hoyISO, sumarDias } from './fecha'
import { claveLS } from '../../core/edicion'
import { esSeedIntacta, filaSeed, filasSeed } from '../../core/data/sync/syncables'
import { idiomaActual } from '../../core/i18n/useT'

let sembrado = false

/** Bandera persistente versionada: al subir la versión se añaden los ejemplos nuevos. */
const LS_EJEMPLOS = claveLS('cocina.ejemplosSembrados')
const VERSION_EJEMPLOS = '4'

/** El español base del día de ejemplo y la lista, compartido por siembra y retraducción. */
const DIA_EJEMPLO: { momento: RegistroComida['momento']; nombre: string; nota?: string; kcal: [number, number, number, number] }[] = [
  { momento: 'desayuno', nombre: 'Avena overnight con plátano', nota: 'Ejemplo: así se ve un día registrado.', kcal: [350, 14, 55, 8] },
  { momento: 'snack', nombre: 'Yogur griego con nueces', kcal: [230, 18, 12, 12] },
  { momento: 'comida', nombre: 'Pollo a la parrilla con arroz y verduras', kcal: [845, 62, 95, 24] },
  { momento: 'cena', nombre: 'Salmón al horno con ensalada', kcal: [595, 48, 24, 34] },
]

const LISTA_EJEMPLO = {
  nombre: 'Ejemplo: Súper semanal',
  // [nombre, cantidad, comprado]
  items: [
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
  ] as [string, string, boolean][],
}

/** Datos iniciales de cocina (solo la primera vez). La siembra sale YA en el idioma activo. */
export async function sembrarCocina() {
  if (sembrado) return
  sembrado = true

  const perfil = await db.perfilNutricion.toCollection().first()
  if (!perfil) await db.perfilNutricion.add(filaSeed('perfilNutricion-0', PERFIL_DEFECTO))

  if (localStorage.getItem(LS_EJEMPLOS) !== VERSION_EJEMPLOS) {
    const textos = await textosEjemplosCocina(idiomaActual())
    await sembrarEjemplos(textos)
    await catalogarMomentos()
    await sembrarDiaEjemplo(textos)
    await sembrarListaEjemplo(textos)
    localStorage.setItem(LS_EJEMPLOS, VERSION_EJEMPLOS)
  }
}

/** La `clave` de ejemplo de una fila sembrada, leída de su uid `seed-<prefijo>-<clave>`. */
const claveDeUid = (uid: string | undefined, prefijo: string): string | null =>
  uid?.startsWith(`seed-${prefijo}-`) ? uid.slice(`seed-${prefijo}-`.length) : null

/**
 * Pone los momentos del día a las recetas de fábrica que se sembraron antes de
 * que existiera el campo (v4). Sin esto el filtro del plan de comidas nacería
 * inerte para quien ya tenía la app: todo valdría para todo.
 *
 * Casa por la CLAVE del uid (no por nombre: la fila puede estar traducida).
 * Solo toca las que siguen sin catalogar: lo que el usuario haya puesto manda.
 */
async function catalogarMomentos() {
  const porClave = new Map(RECETAS_EJEMPLO.map((r) => [r.clave, r.momentos]))
  for (const r of await db.recetas.toArray()) {
    const clave = claveDeUid(r.uid, 'recetas')
    const momentos = clave ? porClave.get(clave) : undefined
    if (r.id == null || !momentos?.length || r.momentos?.length) continue
    await db.recetas.update(r.id, { momentos })
  }
}

/**
 * Un día completo de comidas + agua fechado AYER: deja hoy libre para los datos
 * reales del usuario, pero la gráfica de 7 días y la adherencia nacen con algo
 * que mostrar. Se borran como cualquier registro.
 */
async function sembrarDiaEjemplo(textos: TextosEjemplosCocina | null) {
  const fecha = sumarDias(hoyISO(), -1)
  // Idempotencia por UID y no por fecha. Los uid de la siembra son fijos
  // (`seed-registrosComida-demo-N`) pero la fecha es AYER, que cambia cada día:
  // preguntando por la fecha, al día siguiente parecía que no había nada sembrado
  // y se volvía a intentar. El índice `&uid` rechazaba las filas repetidas y la
  // transacción abortaba… y una transacción abortada deja las `liveQuery` de
  // Dexie en un estado que revienta al leer («Cannot read properties of null»):
  // la cocina dejaba de abrir entera, con todos sus datos intactos.
  if (await db.registrosComida.where('uid').startsWith('seed-registrosComida-demo').count()) return

  const comidas: Omit<RegistroComida, 'id'>[] = DIA_EJEMPLO.map((c, i) => ({
    fecha,
    momento: c.momento,
    nombre: textos?.dia[i]?.nombre ?? c.nombre,
    calorias: c.kcal[0],
    proteinas: c.kcal[1],
    carbohidratos: c.kcal[2],
    grasas: c.kcal[3],
    ...(c.nota ? { nota: textos?.dia[i]?.nota ?? c.nota } : {}),
  }))
  await db.registrosComida.bulkAdd(filasSeed('registrosComida-demo', comidas))

  // Mismo motivo que arriba: por uid, que es lo que el índice único protege.
  if (!(await db.registrosAgua.where('uid').startsWith('seed-registrosAgua-demo').count())) {
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
async function sembrarListaEjemplo(textos: TextosEjemplosCocina | null) {
  // Idempotencia por uid (el nombre puede estar traducido).
  if ((await db.listasCompra.toArray()).some((l) => l.uid === 'seed-listasCompra-super')) return

  const creadoEn = new Date().toISOString()
  const listaId = await db.listasCompra.add(
    filaSeed('listasCompra-super', { nombre: textos?.lista.nombre ?? LISTA_EJEMPLO.nombre, creadoEn }),
  )
  await db.itemsCompra.bulkAdd(
    filasSeed(
      'itemsCompra-super',
      LISTA_EJEMPLO.items.map(([nombreEs, cantidad, comprado], i) => ({
        nombre: textos?.lista.items[i] ?? nombreEs,
        cantidad,
        // La categoría se adivina del ESPAÑOL canónico: el diccionario de
        // `adivinarCategoria` no conoce los nombres traducidos.
        categoria: adivinarCategoria(nombreEs),
        comprado,
        creadoEn,
        listaId,
      })),
    ),
  )
}

/**
 * Siembra recetas de ejemplo (con carpeta) y dietas preguardadas que las usan.
 * Idempotente por CLAVE (el uid de siembra): no duplica lo que ya exista, así
 * se pueden añadir ejemplos nuevos subiendo VERSION_EJEMPLOS sin repetir los
 * anteriores.
 */
async function sembrarEjemplos(textos: TextosEjemplosCocina | null) {
  const creadaEn = new Date().toISOString()
  const idPorClave = new Map<string, number>()
  for (const r of await db.recetas.toArray()) {
    const clave = claveDeUid(r.uid, 'recetas')
    if (clave && r.id != null) idPorClave.set(clave, r.id)
  }

  for (const r of RECETAS_EJEMPLO) {
    if (idPorClave.has(r.clave)) continue
    const { clave, ...base } = r
    const id = await db.recetas.add(
      filaSeed(`recetas-${clave}`, { ...base, ...textos?.recetas[clave], fuente: 'seed', creadaEn }),
    )
    idPorClave.set(clave, id)
  }

  const clavesExistentes = new Set(
    (await db.dietasGuardadas.toArray()).map((d) => claveDeUid(d.uid, 'dietasGuardadas')).filter(Boolean),
  )
  const faltantes = DIETAS_EJEMPLO.filter((d) => !clavesExistentes.has(d.clave))
  const dietas: Omit<DietaGuardada, 'id'>[] = faltantes.map(({ clave, recetas, ...d }) => ({
    ...d,
    ...textos?.dietas[clave],
    recetaIds: recetas.map((c) => idPorClave.get(c)).filter((id): id is number => id != null),
    creadoEn: creadaEn,
  }))
  const nuevas = filasSeed('dietasGuardadas', dietas, (_, i) => faltantes[i].clave)
  if (nuevas.length) await db.dietasGuardadas.bulkAdd(nuevas)
}

/**
 * Reescribe al idioma activo las filas de siembra que el usuario NO ha tocado
 * (`esSeedIntacta`): cubre de una vez la instalación vieja (sembrada en
 * español) y el cambio de idioma posterior. Escribe con `db.tabla.update`
 * crudo a propósito: el middleware conserva `updatedAt: 1` en uids `seed-…`,
 * así la fila sigue siendo retraducible y cualquier edición real le gana por
 * LWW. En cuanto el usuario edita una fila, deja de ser intacta y su texto
 * manda para siempre.
 */
export async function retraducirCocina() {
  const textos = await textosEjemplosCocina(idiomaActual())

  // Recetas: el destino es el paquete del idioma o el español base.
  const basePorClave = new Map(RECETAS_EJEMPLO.map((r) => [r.clave, r]))
  for (const r of await db.recetas.toArray()) {
    const clave = claveDeUid(r.uid, 'recetas')
    if (!clave || r.id == null || !esSeedIntacta(r) || r.fuente !== 'seed') continue
    const base = basePorClave.get(clave)
    if (!base) continue
    const destino = textos?.recetas[clave] ?? {
      nombre: base.nombre,
      carpeta: base.carpeta ?? '',
      etiquetas: base.etiquetas,
      ingredientes: base.ingredientes,
      pasos: base.pasos,
    }
    if (
      r.nombre !== destino.nombre ||
      (r.carpeta ?? '') !== destino.carpeta ||
      JSON.stringify(r.etiquetas) !== JSON.stringify(destino.etiquetas) ||
      JSON.stringify(r.ingredientes) !== JSON.stringify(destino.ingredientes) ||
      JSON.stringify(r.pasos) !== JSON.stringify(destino.pasos)
    ) {
      await db.recetas.update(r.id, {
        nombre: destino.nombre,
        carpeta: destino.carpeta,
        etiquetas: destino.etiquetas,
        ingredientes: destino.ingredientes,
        pasos: destino.pasos,
      })
    }
  }

  const dietaPorClave = new Map(DIETAS_EJEMPLO.map((d) => [d.clave, d]))
  for (const d of await db.dietasGuardadas.toArray()) {
    const clave = claveDeUid(d.uid, 'dietasGuardadas')
    if (!clave || d.id == null || !esSeedIntacta(d)) continue
    const base = dietaPorClave.get(clave)
    if (!base) continue
    const destino = textos?.dietas[clave] ?? { nombre: base.nombre, descripcion: base.descripcion ?? '' }
    if (d.nombre !== destino.nombre || (d.descripcion ?? '') !== destino.descripcion) {
      await db.dietasGuardadas.update(d.id, { nombre: destino.nombre, descripcion: destino.descripcion })
    }
  }

  // Día de ejemplo y lista del súper: por índice del uid de siembra.
  for (const c of await db.registrosComida.toArray()) {
    const idx = Number(claveDeUid(c.uid, 'registrosComida-demo'))
    if (!Number.isInteger(idx) || c.id == null || !esSeedIntacta(c)) continue
    const baseDia = DIA_EJEMPLO[idx]
    if (!baseDia) continue
    const destino = textos?.dia[idx] ?? { nombre: baseDia.nombre, nota: baseDia.nota }
    if (c.nombre !== destino.nombre || (baseDia.nota && c.nota !== destino.nota)) {
      await db.registrosComida.update(c.id, {
        nombre: destino.nombre,
        ...(baseDia.nota ? { nota: destino.nota ?? baseDia.nota } : {}),
      })
    }
  }

  for (const l of await db.listasCompra.toArray()) {
    if (l.uid !== 'seed-listasCompra-super' || l.id == null || !esSeedIntacta(l)) continue
    const nombre = textos?.lista.nombre ?? LISTA_EJEMPLO.nombre
    if (l.nombre !== nombre) await db.listasCompra.update(l.id, { nombre })
  }
  for (const it of await db.itemsCompra.toArray()) {
    const idx = Number(claveDeUid(it.uid, 'itemsCompra-super'))
    if (!Number.isInteger(idx) || it.id == null || !esSeedIntacta(it)) continue
    const nombre = textos?.lista.items[idx] ?? LISTA_EJEMPLO.items[idx]?.[0]
    if (nombre && it.nombre !== nombre) await db.itemsCompra.update(it.id, { nombre })
  }
}
