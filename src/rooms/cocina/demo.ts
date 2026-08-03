/**
 * Año demo de cocina: 74 → 67 kg, sin dejar de comer bien.
 *
 * Pep@ empieza a registrar en el mes 3, cuando arranca la dieta: los dos
 * primeros meses casi no hay datos, y eso también cuenta la historia. La
 * densidad sube con los meses, baja en el bache y en Japón casi desaparece
 * (allí solo quedó lo memorable). Las calorías del día se acercan al objetivo
 * a medida que avanza el año: es lo que pinta de verde el calendario de
 * adherencia al final y de rojo el mes del viaje.
 *
 * Los platos y las recetas vienen escritos; los días, las cantidades y el peso
 * se calculan aquí. El seed de la app ya dejó 9 recetas, 7 dietas, un día de
 * comidas y una lista de ejemplo: lo del día suelto y la lista se retiran
 * (son de «ejemplo», no de Pep@) y el resto convive con lo suyo.
 */
import type { RegistroAgua, RegistroComida, RegistroPeso } from '../../core/data/db'
import {
  aguaRepo,
  comidasRepo,
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  perfilNutricionRepo,
  pesoRepo,
  recetasRepo,
} from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { enBache, enJapon, JAPON_FIN, JAPON_INICIO, MARATON_DIA } from '../../demo/hitosPep'
import { adivinarCategoria } from './categoriasCompra'
import { DEMO_COCINA } from './demo.data'
import { DEMO_COCINA_RECETAS } from './demo.recetas.data'

type Comida = Omit<RegistroComida, 'id'>
type Agua = Omit<RegistroAgua, 'id'>
type Peso = Omit<RegistroPeso, 'id'>
type Etapa = 'inicio' | 'dieta' | 'japon' | 'maraton'

/** Un plato del pool generado. El `as const` del data lo tiparía con literales
 *  distintos en cada idioma, así que se rebaja a esta forma para manejarlo. */
interface Plato {
  momento: RegistroComida['momento']
  etapa: string
  nombre: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

/** El día en que Pep@ se sentó a calcular sus macros por primera vez. */
const DIETA_DESDE = -304

/** Objetivo diario del perfil (el que la app usa para medir la adherencia). */
const KCAL_OBJETIVO = 2400

function etapaDe(off: number): Etapa {
  if (enJapon(off)) return 'japon'
  if (off < -274) return 'inicio'
  if (off < -94) return 'dieta'
  return 'maraton'
}

/** Cuántos días de ese tramo quedaron registrados. */
function densidad(off: number): number {
  if (off < DIETA_DESDE) return 0.12 // antes de la dieta casi no apuntaba
  if (enJapon(off)) return 0.2
  if (enBache(off)) return 0.42
  if (off < -244) return 0.68
  if (off < -184) return 0.75
  if (off < JAPON_INICIO) return 0.72
  if (off < -40) return 0.85
  return 0.92
}

/**
 * Calorías del día: empiezan muy por encima del objetivo y se van acercando.
 * El ruido va bajando con el año (al principio cualquier día se le iba de las
 * manos), y en Japón se dispara: ramen, izakaya y un mes de vacaciones.
 */
function kcalDelDia(off: number, r: () => number): number {
  const t = Math.min(1, Math.max(0, (off + 304) / 304))
  let media = 2780 - 380 * t
  let ruido = 420 - 300 * t
  if (enJapon(off)) {
    media = 2950
    ruido = 380
  } else if (enBache(off)) {
    media += 180 // el mes que comió por aburrimiento
  } else if (off > MARATON_DIA - 4 && off <= MARATON_DIA) {
    media += 320 // carga de carbohidratos
  }
  return Math.round(media + (r() - 0.5) * 2 * ruido)
}

/** Kilos de ese día: la bajada real, con su rebote en el bache y en Japón. */
function pesoDelDia(off: number, r: () => number): number {
  const tramos: [number, number][] = [
    [-364, 74.2],
    [-304, 74],
    [-184, 71],
    [-155, 71.8],
    [JAPON_INICIO, 70.4],
    [JAPON_FIN, 71.6],
    [-65, 69.2],
    [-35, 68.1],
    [0, 67],
  ]
  let kg = 67
  for (let i = 0; i < tramos.length - 1; i++) {
    const [a, va] = tramos[i]
    const [b, vb] = tramos[i + 1]
    if (off >= a && off <= b) {
      kg = va + ((vb - va) * (off - a)) / (b - a)
      break
    }
  }
  return Math.round((kg + (r() - 0.5) * 0.5) * 10) / 10
}

export async function construirDemoCocina(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_COCINA[ctx.idioma]
  const recetario = DEMO_COCINA_RECETAS[ctx.idioma]
  const r = rngDemo(20260801)
  const uno = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]

  // ── Retirar lo que el seed dejó como «ejemplo» ──────────────────────────
  // El seed escribe un día completo de AYER y una lista llamada «Ejemplo:…».
  // Son filas normales (uid `seed-*`, sin marca de ejemplo): si se quedan,
  // ese día sumaría 2 020 kcal ajenas y el recetario tendría una lista que no
  // es de Pep@.
  const ayer = ctx.fecha(-1)
  for (const c of await comidasRepo.list()) {
    if (c.fecha === ayer && c.id != null) await comidasRepo.remove(c.id)
  }
  for (const a of await aguaRepo.list()) {
    if (a.fecha === ayer && a.id != null) await aguaRepo.remove(a.id)
  }
  const listaEjemplo = (await listasCompraRepo.list()).find((l) => l.nombre.startsWith('Ejemplo:'))
  if (listaEjemplo?.id != null) {
    for (const i of await itemsCompraRepo.list()) {
      if (i.listaId === listaEjemplo.id && i.id != null) await itemsCompraRepo.remove(i.id)
    }
    await listasCompraRepo.remove(listaEjemplo.id)
  }

  // ── Perfil (singleton: la app lee la PRIMERA fila) ──────────────────────
  // Sin `sexo`: Pep@ es de género neutro y la app solo ofrece hombre/mujer.
  // La calculadora de TDEE sigue disponible, pero es el usuario quien la pulsa.
  const META = {
    calorias: KCAL_OBJETIVO,
    proteinas: 145,
    carbohidratos: 300,
    grasas: 70,
    aguaMl: 2800,
    pesoKg: 67,
    alturaCm: 172,
    edad: 25,
    actividad: 1.725,
    objetivo: 'deficit' as const,
    pesoObjetivoKg: 66,
    ritmoKgSemana: 0.3,
  }
  const [perfil] = await perfilNutricionRepo.list()
  if (perfil?.id != null) await perfilNutricionRepo.update(perfil.id, META)
  else await perfilNutricionRepo.add(META)

  // ── El año de comidas ───────────────────────────────────────────────────
  const platos: readonly Plato[] = datos.comidas
  const porEtapa = new Map<Etapa, Plato[]>()
  for (const e of ['inicio', 'dieta', 'japon', 'maraton'] as const) {
    porEtapa.set(e, platos.filter((c) => c.etapa === e))
  }
  const notaDia = new Map<number, string>(datos.notasDia.map((n) => [n.dia, n.nota]))

  const comidas: Comida[] = []
  const aguas: Agua[] = []
  for (let off = -364; off <= 0; off++) {
    if (off === -1) continue // el día que acabamos de limpiar del seed
    if (r() >= densidad(off)) continue
    const etapa = etapaDe(off)
    const pool = porEtapa.get(etapa) ?? platos
    // 3 o 4 momentos: el snack no todos los días.
    const momentos: RegistroComida['momento'][] =
      r() < 0.65 ? ['desayuno', 'comida', 'cena', 'snack'] : ['desayuno', 'comida', 'cena']
    const elegidas = momentos.map((m) => {
      const delMomento = pool.filter((c) => c.momento === m)
      return delMomento.length ? uno(delMomento) : uno(pool)
    })
    // Escalado: las raciones se ajustan para clavar las kcal del día.
    const suma = elegidas.reduce((acc, c) => acc + c.calorias, 0)
    const k = Math.min(1.3, Math.max(0.7, kcalDelDia(off, r) / Math.max(1, suma)))
    const nota = notaDia.get(off)
    elegidas.forEach((c, i) => {
      comidas.push({
        fecha: ctx.fecha(off),
        momento: c.momento,
        nombre: c.nombre,
        calorias: Math.round(c.calorias * k),
        proteinas: Math.round(c.proteinas * k),
        carbohidratos: Math.round(c.carbohidratos * k),
        grasas: Math.round(c.grasas * k),
        ...(nota && i === 0 ? { nota } : {}),
      })
    })
    // Agua: dos o tres cargas al día; en el mes 1 se le olvidaba beber.
    const objetivoMl = off < DIETA_DESDE ? 1400 : enJapon(off) ? 2000 : 2600 + Math.round(r() * 600)
    let restante = objetivoMl
    while (restante > 0) {
      const ml = Math.min(restante, 500 + Math.round(r() * 4) * 125)
      aguas.push({ fecha: ctx.fecha(off), ml })
      restante -= ml
    }
  }
  await comidasRepo.bulkAdd(comidas)
  await aguaRepo.bulkAdd(aguas)

  // ── Pesajes: semanales al empezar, casi diarios en la recta final ──────
  const pesos: Peso[] = []
  for (let off = DIETA_DESDE; off <= 0; off++) {
    const cada = off > -30 ? 2 : off > -90 ? 4 : 7
    if (off % cada !== 0) continue
    pesos.push({ fecha: ctx.fecha(off), kg: pesoDelDia(off, r) })
  }
  await pesoRepo.bulkAdd(pesos)

  // ── El recetario propio (con su foto) ──────────────────────────────────
  // `creadaEn` escalonado: es la clave por la que el repo ordena la lista.
  const idPorNombre = new Map<string, number>()
  for (const [i, rec] of recetario.recetas.entries()) {
    const foto = await ctx.foto(`cocina/${rec.clave}`)
    const id = await recetasRepo.add({
      nombre: rec.nombre,
      emoji: rec.emoji,
      carpeta: rec.carpeta,
      porciones: rec.porciones,
      minutos: rec.minutos,
      etiquetas: [rec.carpeta],
      ingredientes: [...rec.ingredientes],
      pasos: [...rec.pasos],
      calorias: rec.calorias,
      proteinas: rec.proteinas,
      carbohidratos: rec.carbohidratos,
      grasas: rec.grasas,
      fuente: 'manual',
      creadaEn: `${ctx.fecha(-280 + i * 27)}T19:30:00.000Z`,
      ...(foto ? { foto } : {}),
    })
    idPorNombre.set(rec.nombre, id)
  }

  await dietasGuardadasRepo.bulkAdd(
    recetario.dietas.map((d, i) => ({
      nombre: d.nombre,
      descripcion: d.descripcion,
      recetaIds: d.recetas.map((n) => idPorNombre.get(n)).filter((x): x is number => x != null),
      creadoEn: `${ctx.fecha(-120 + i * 45)}T20:00:00.000Z`,
    })),
  )

  for (const l of recetario.listas) {
    const creadoEn = `${ctx.fecha(l.dia)}T11:00:00.000Z`
    const listaId = await listasCompraRepo.add({ nombre: l.nombre, creadoEn })
    await itemsCompraRepo.bulkAdd(
      l.items.map((texto, i) => ({
        nombre: texto,
        categoria: adivinarCategoria(texto),
        // La compra vieja está hecha; en la reciente aún faltan cosas.
        comprado: l.dia < -30 || i % 4 !== 0,
        precio: 25 + Math.round(r() * 90),
        creadoEn,
        listaId,
      })),
    )
  }
}
