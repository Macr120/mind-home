import type { MomentoComida, PlanComida, RegistroComida } from '../../core/data/db'
import { esEjemplo } from '../../core/data/ejemplos'
import { aguaRepo, comidasRepo, perfilNutricionRepo, pesoRepo, planComidasRepo, recetasRepo } from '../../core/data/repository'
import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../../core/fechaLocal'
import { filaEjemplo, porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { RECETAS_EJEMPLO } from './ejemplos'
import { sembrarCocina } from './seed'

/**
 * Ejemplo de fábrica del «Control de alimentación»: lo comido HOY (dos comidas
 * de recetas de fábrica y el agua), unas celdas del plan de comidas dentro de la
 * semana que se ve y seis pesajes con una tendencia suave hacia la meta.
 *
 * Aparte del ejemplo del recetario (`ejemplos.paquete.ts`), que siembra la app
 * sola: este lo pone la barra la primera vez que se abre el control vacío. Las
 * celdas del plan cuelgan de las recetas de fábrica (`seed-recetas-<clave>`);
 * si el usuario ya borró alguna, esa celda no se pone.
 */

const ID = 'cocina.control'

/** Nombres de las recetas de fábrica que se registran hoy, tal como los siembra `seed.ts`. */
const TEXTOS_CONTROL = {
  es: { desayuno: 'Avena overnight', comida: 'Pollo a la parrilla' },
  en: { desayuno: 'Overnight oats', comida: 'Grilled chicken' },
  pt: { desayuno: 'Aveia overnight', comida: 'Frango grelhado' },
  fr: { desayuno: 'Avoine overnight', comida: 'Poulet grillé' },
  de: { desayuno: 'Overnight Oats', comida: 'Gegrilltes Hähnchen' },
  it: { desayuno: 'Avena overnight', comida: 'Pollo alla griglia' },
  nl: { desayuno: 'Overnight oats', comida: 'Gegrilde kip' },
  pl: { desayuno: 'Owsianka na noc', comida: 'Grillowany kurczak' },
  tr: { desayuno: 'Gece yulafı', comida: 'Izgara tavuk' },
  id: { desayuno: 'Oat rendam semalam', comida: 'Ayam panggang' },
  ja: { desayuno: 'オーバーナイトオーツ', comida: 'グリルチキン' },
  zh: { desayuno: '隔夜燕麦', comida: '烤鸡肉' },
  ko: { desayuno: '오버나이트 오츠', comida: '그릴 치킨' },
  ru: { desayuno: 'Овсянка с вечера', comida: 'Курица на гриле' },
  hi: { desayuno: 'ओवरनाइट ओट्स', comida: 'ग्रिल्ड चिकन' },
  ar: { desayuno: 'شوفان منقوع طوال الليل', comida: 'دجاج مشوي' },
}

/** Lo comido hoy: cada una también es la celda «ya comida» del plan de hoy. */
const COMIDAS_HOY: { momento: 'desayuno' | 'comida'; receta: string }[] = [
  { momento: 'desayuno', receta: 'avena-overnight' },
  { momento: 'comida', receta: 'pollo-a-la-parrilla' },
]

/** Lo que falta por comer: `dia` 0 = hoy; 1 y 2 = los días de la semana más cercanos a hoy. */
const PLANEADAS: { dia: 0 | 1 | 2; momento: MomentoComida; receta: string }[] = [
  { dia: 0, momento: 'cena', receta: 'salm-n-al-horno' },
  { dia: 1, momento: 'desayuno', receta: 'chilaquiles-verdes' },
  { dia: 1, momento: 'comida', receta: 'pasta-al-pesto' },
  { dia: 2, momento: 'cena', receta: 'ensalada-mediterr-nea' },
]

/** Días atrás de cada pesaje y cuánto le faltaba entonces para el peso de hoy. */
const PESAJES: { dias: number; delta: number }[] = [
  { dias: -35, delta: 2.1 },
  { dias: -28, delta: 1.6 },
  { dias: -21, delta: 1.3 },
  { dias: -14, delta: 0.8 },
  { dias: -7, delta: 0.5 },
  { dias: 0, delta: 0 },
]

const TABLAS = [comidasRepo, aguaRepo, planComidasRepo, pesoRepo]

/** Dato del usuario: ni ejemplo ni siembra del recetario (`seed-…`, el día de ejemplo de ayer). */
const esPropia = (f: unknown) => !esEjemplo(f) && !(f as { uid?: string }).uid?.startsWith('seed-')

/** Los otros días de la semana que se ve (lunes a domingo), del más cercano a hoy al más lejano. */
function otrosDiasDeLaSemana(hoy: string): string[] {
  const lunes = fechaLocalISO(inicioSemana(deIso(hoy)))
  const distancia = (d: string) => Math.abs(deIso(d).getTime() - deIso(hoy).getTime())
  return Array.from({ length: 7 }, (_, i) => isoMasDias(lunes, i))
    .filter((d) => d !== hoy)
    .sort((a, b) => distancia(a) - distancia(b) || a.localeCompare(b))
}

export const ejemploControl: PaqueteEjemplo = {
  id: ID,
  tablas: TABLAS,
  async hayPropios() {
    for (const t of TABLAS) if (await t.alguna(esPropia)) return true
    return false
  },
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => comidasRepo.list(), () => pesoRepo.list())) return
    // Las celdas del plan y los pesajes cuelgan de las recetas y del perfil de la siembra.
    await sembrarCocina()
    const T = porIdioma(TEXTOS_CONTROL)
    const hoy = fechaLocalISO()
    const fechaDe = [hoy, ...otrosDiasDeLaSemana(hoy)]
    const creadoEn = new Date().toISOString()

    const recetaId = new Map<string, number>()
    for (const r of await recetasRepo.list()) {
      if (r.id != null && r.uid?.startsWith('seed-recetas-')) recetaId.set(r.uid.slice('seed-recetas-'.length), r.id)
    }

    for (const c of COMIDAS_HOY) {
      const base = RECETAS_EJEMPLO.find((r) => r.clave === c.receta)!
      const comidaId = await comidasRepo.addSeed(
        filaEjemplo<Omit<RegistroComida, 'id'>>(ID, `comida-${c.momento}`, restaurar, {
          fecha: hoy,
          momento: c.momento,
          nombre: T[c.momento],
          calorias: base.calorias,
          proteinas: base.proteinas,
          carbohidratos: base.carbohidratos,
          grasas: base.grasas,
        }),
      )
      // La celda del plan apunta a la comida registrada (como «Comida» en la
      // rejilla): el plan suma recetas y el registro, comidas; nada cuenta dos veces.
      const id = recetaId.get(c.receta)
      if (id != null) {
        await planComidasRepo.addSeed(
          filaEjemplo<Omit<PlanComida, 'id'>>(ID, `plan-${c.momento}`, restaurar, {
            fecha: hoy,
            momento: c.momento,
            recetaId: id,
            comidaId,
            creadoEn,
          }),
        )
      }
    }

    for (const [i, p] of PLANEADAS.entries()) {
      const id = recetaId.get(p.receta)
      if (id == null) continue
      await planComidasRepo.addSeed(
        filaEjemplo<Omit<PlanComida, 'id'>>(ID, `plan${i}`, restaurar, {
          fecha: fechaDe[p.dia],
          momento: p.momento,
          recetaId: id,
          creadoEn,
        }),
      )
    }

    for (const [i, ml] of [500, 750].entries()) {
      await aguaRepo.addSeed(filaEjemplo(ID, `agua${i}`, restaurar, { fecha: hoy, ml }))
    }

    // La tendencia va hacia la meta del perfil (bajando si no hay meta).
    const perfil = (await perfilNutricionRepo.list())[0]
    const actual = perfil?.pesoKg ?? 74
    const signo = perfil?.pesoObjetivoKg != null && perfil.pesoObjetivoKg > actual ? -1 : 1
    for (const [i, p] of PESAJES.entries()) {
      await pesoRepo.addSeed(
        filaEjemplo(ID, `peso${i}`, restaurar, {
          fecha: isoMasDias(hoy, p.dias),
          kg: Math.round((actual + signo * p.delta) * 10) / 10,
        }),
      )
    }
  },

  async retraducir() {
    for (const c of await comidasRepo.list()) {
      if (c.ejemploDe !== ID || c.id == null) continue
      const nombre = retraducido(TEXTOS_CONTROL, c.nombre, 'desayuno', 'comida')
      if (nombre) await comidasRepo.update(c.id, { nombre })
    }
  },
}
