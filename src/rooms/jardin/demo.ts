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
  pt: { bosque: 'Floresta', mar: 'Mar', lluvia: 'Chuva', cuencos: 'Tigelas tibetanas' },
  fr: { bosque: 'Forêt', mar: 'Mer', lluvia: 'Pluie', cuencos: 'Bols chantants' },
  de: { bosque: 'Wald', mar: 'Meer', lluvia: 'Regen', cuencos: 'Klangschalen' },
  it: { bosque: 'Foresta', mar: 'Mare', lluvia: 'Pioggia', cuencos: 'Ciotole tibetane' },
  ja: { bosque: '森', mar: '海', lluvia: '雨', cuencos: 'シンギングボウル' },
  zh: { bosque: '森林', mar: '海洋', lluvia: '雨声', cuencos: '颂钵' },
  ko: { bosque: '숲', mar: '바다', lluvia: '비', cuencos: '싱잉볼' },
  ru: { bosque: 'Лес', mar: 'Море', lluvia: 'Дождь', cuencos: 'Поющие чаши' },
  hi: { bosque: 'जंगल', mar: 'समुद्र', lluvia: 'बारिश', cuencos: 'सिंगिंग बाउल' },
  tr: { bosque: 'Orman', mar: 'Deniz', lluvia: 'Yağmur', cuencos: 'Tibet çanakları' },
  id: { bosque: 'Hutan', mar: 'Laut', lluvia: 'Hujan', cuencos: 'Mangkuk tibet' },
  pl: { bosque: 'Las', mar: 'Morze', lluvia: 'Deszcz', cuencos: 'Misy tybetańskie' },
  ar: { bosque: 'الغابة', mar: 'البحر', lluvia: 'المطر', cuencos: 'الأوعية الصوتية التبتية' },
  nl: { bosque: 'Bos', mar: 'Zee', lluvia: 'Regen', cuencos: 'Klankschalen' },
}

/** El título de la sesión, con la etiqueta delante del nombre de la pista. */
const ETIQUETA_MEDITACION: PorIdioma<{ libre: string; con: string }> = {
  es: { libre: 'Meditación libre', con: 'Meditación' },
  en: { libre: 'Free meditation', con: 'Meditation' },
  pt: { libre: 'Meditação livre', con: 'Meditação' },
  fr: { libre: 'Méditation libre', con: 'Méditation' },
  de: { libre: 'Freie Meditation', con: 'Meditation' },
  it: { libre: 'Meditazione libera', con: 'Meditazione' },
  ja: { libre: '自由瞑想', con: '瞑想' },
  zh: { libre: '自由冥想', con: '冥想' },
  ko: { libre: '자유 명상', con: '명상' },
  ru: { libre: 'Свободная медитация', con: 'Медитация' },
  hi: { libre: 'फ़्री मेडिटेशन', con: 'मेडिटेशन' },
  tr: { libre: 'Serbest meditasyon', con: 'Meditasyon' },
  id: { libre: 'Meditasi bebas', con: 'Meditasi' },
  pl: { libre: 'Medytacja swobodna', con: 'Medytacja' },
  ar: { libre: 'تأمل حر', con: 'تأمل' },
  nl: { libre: 'Vrije meditatie', con: 'Meditatie' },
}

const TITULO_RESPIRACION: PorIdioma<{ caja: string; '478': string }> = {
  es: { caja: 'Respiración en caja 4-4-4-4', '478': 'Respiración 4-7-8' },
  en: { caja: 'Box breathing 4-4-4-4', '478': '4-7-8 breathing' },
  pt: { caja: 'Respiração quadrada 4-4-4-4', '478': 'Respiração 4-7-8' },
  fr: { caja: 'Respiration carrée 4-4-4-4', '478': 'Respiration 4-7-8' },
  de: { caja: 'Box-Atmung 4-4-4-4', '478': '4-7-8-Atmung' },
  it: { caja: 'Respirazione quadrata 4-4-4-4', '478': 'Respirazione 4-7-8' },
  ja: { caja: 'ボックス呼吸法 4-4-4-4', '478': '4-7-8呼吸法' },
  zh: { caja: '箱式呼吸法 4-4-4-4', '478': '4-7-8呼吸法' },
  ko: { caja: '박스 호흡 4-4-4-4', '478': '4-7-8 호흡법' },
  ru: { caja: 'Квадратное дыхание 4-4-4-4', '478': 'Дыхание 4-7-8' },
  hi: { caja: 'बॉक्स ब्रीदिंग 4-4-4-4', '478': '4-7-8 ब्रीदिंग' },
  tr: { caja: 'Kutu nefesi 4-4-4-4', '478': '4-7-8 nefes tekniği' },
  id: { caja: 'Pernapasan kotak 4-4-4-4', '478': 'Pernapasan 4-7-8' },
  pl: { caja: 'Oddech pudełkowy 4-4-4-4', '478': 'Oddech 4-7-8' },
  ar: { caja: 'تنفس الصندوق 4-4-4-4', '478': 'تنفس 4-7-8' },
  nl: { caja: 'Vierkant ademhalen 4-4-4-4', '478': '4-7-8-ademhaling' },
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
