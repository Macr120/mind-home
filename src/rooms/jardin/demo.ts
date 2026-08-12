/**
 * Año demo del jardín: la práctica de Pep@ empieza tímida en el mes 3, se
 * vuelve casi diaria en el bache del mes 7 (es lo que lo sostiene), pausa en
 * Japón y cierra constante. Las sesiones "de relleno" son algorítmicas (RNG
 * determinista); las notas y las gratitudes vienen del contenido generado.
 */
import { gratitudDiariaRepo, sesionesMindfulnessRepo } from '../../core/data/repository'
import type { TipoPractica } from '../../core/data/db'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { sembrarMetasApp } from '../../demo/metasPep'
import type { Idioma } from '../../core/i18n/idiomas'
import { enIdioma, type PorIdioma } from '../../core/i18n/porIdioma'
import { DEMO_JARDIN } from './demo.data'

const PISTAS = ['bosque', 'mar', 'lluvia', 'cuencos', 'libre'] as const

type Pista = (typeof PISTAS)[number]

const NOMBRE_PISTA: PorIdioma<Record<Exclude<Pista, 'libre'>, string>> = {
  es: { bosque: 'Bosque', mar: 'Mar', lluvia: 'Lluvia', cuencos: 'Cuencos' },
  en: { bosque: 'Forest', mar: 'Sea', lluvia: 'Rain', cuencos: 'Singing bowls' },
}

/** El título de la sesión, con la etiqueta delante del nombre de la pista. */
const ETIQUETA_MEDITACION: PorIdioma<{ libre: string; con: string }> = {
  es: { libre: 'Meditación libre', con: 'Meditación' },
  en: { libre: 'Free meditation', con: 'Meditation' },
}

const TITULO_RESPIRACION: PorIdioma<{ caja: string; '478': string }> = {
  es: { caja: 'Respiración en caja 4-4-4-4', '478': 'Respiración 4-7-8' },
  en: { caja: 'Box breathing 4-4-4-4', '478': '4-7-8 breathing' },
}

function tituloMeditacion(idioma: Idioma, pista: Pista): string {
  const etiqueta = enIdioma(ETIQUETA_MEDITACION, idioma)
  if (pista === 'libre') return etiqueta.libre
  return `${etiqueta.con} · ${enIdioma(NOMBRE_PISTA, idioma)[pista]}`
}

function tituloRespiracion(idioma: Idioma, tema: 'caja' | '478'): string {
  return enIdioma(TITULO_RESPIRACION, idioma)[tema]
}

/** Probabilidad de practicar según el arco del año (M3 arranque, M7 bache…). */
function probabilidad(off: number): number {
  if (off < -304) return 0 // la práctica nace en el mes 3
  if (off >= -124 && off <= -100) return 0.08 // Japón: pausa honesta
  if (off >= -184 && off <= -155) return 0.85 // el bache del mes 7 la vuelve diaria
  if (off < -244) return 0.42 // meses 3-4
  if (off < -184) return 0.55 // meses 5-6
  if (off < -124) return 0.68 // mes 8, recuperación
  return 0.75 // meses 10-12
}

export async function construirDemoJardin(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_JARDIN, () => import('./demo.data.i18n'))
  const r = rngDemo(20260731)

  type Fila = {
    fecha: string
    tipo: TipoPractica
    titulo: string
    duracionMin: number
    tema?: string
    nota?: string
    animoAntes?: number
    animoDespues?: number
  }
  const filas: Fila[] = []
  const porDia = new Map<number, Fila>()

  for (let off = -364; off <= 0; off++) {
    if (r() >= probabilidad(off)) continue
    const enBache = off >= -184 && off <= -155
    const fila: Fila = { fecha: ctx.fecha(off), tipo: 'meditacion', titulo: '', duracionMin: 10 }
    if (r() < 0.8) {
      const pista = PISTAS[Math.floor(r() * PISTAS.length)]
      fila.tipo = 'meditacion'
      fila.titulo = tituloMeditacion(ctx.idioma, pista)
      fila.tema = pista
      fila.duracionMin = [5, 10, 10, 20][Math.floor(r() * 4)]
    } else {
      const tema = r() < 0.6 ? 'caja' : '478'
      fila.tipo = 'respiracion'
      fila.titulo = tituloRespiracion(ctx.idioma, tema)
      fila.tema = tema
      fila.duracionMin = [2, 3, 5][Math.floor(r() * 3)]
    }
    // El ánimo antes/después solo a veces, más honesto en el bache.
    if (r() < 0.4) {
      fila.animoAntes = enBache ? 2 : 3
      fila.animoDespues = enBache ? 4 : 4 + (r() < 0.4 ? 1 : 0)
    }
    filas.push(fila)
    porDia.set(off, fila)
  }

  // Las notas generadas se cuelgan de la sesión de su día (o crean una).
  for (const nota of datos.notasSesion) {
    const existente = porDia.get(nota.dia)
    if (existente && existente.tipo === nota.tipo) {
      existente.nota = nota.nota
      continue
    }
    const fila: Fila =
      nota.tipo === 'respiracion'
        ? {
            fecha: ctx.fecha(nota.dia),
            tipo: 'respiracion',
            titulo: tituloRespiracion(ctx.idioma, 'caja'),
            tema: 'caja',
            duracionMin: 5,
            nota: nota.nota,
          }
        : {
            fecha: ctx.fecha(nota.dia),
            tipo: 'meditacion',
            titulo: tituloMeditacion(ctx.idioma, 'lluvia'),
            tema: 'lluvia',
            duracionMin: 10,
            nota: nota.nota,
          }
    filas.push(fila)
    porDia.set(nota.dia, fila)
  }

  await sesionesMindfulnessRepo.bulkAdd(filas)

  await gratitudDiariaRepo.bulkAdd(
    datos.gratitudes.map((g) => ({
      fecha: ctx.fecha(g.dia),
      item1: g.item1,
      item2: g.item2 ?? '',
      item3: g.item3 ?? '',
    })),
  )

  // Las dos metas del jardín. Su plan se queda PROPUESTO a propósito: este es
  // el cuarto que no empuja (ni rachas ni puntos), así que está por si lo
  // quiere, no esperándolo.
  await sembrarMetasApp(ctx, 'jardin')
}
