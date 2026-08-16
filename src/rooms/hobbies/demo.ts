/**
 * Año demo de hobbies: el PIANO (el proyecto del año, del teclado usado del
 * mes 2 a «Clair de Lune» tocada para la familia) y la ASTROFOTOGRAFÍA (una
 * salida por luna llena). Las sesiones de piano "de relleno" son algorítmicas;
 * las notas y las salidas astro vienen del contenido generado.
 */
import { hobbiesRepo, proyectosHobbyRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { sembrarMetasApp } from '../../demo/metasPep'
import { DEMO_HOBBIES } from './demo.data'
import { enIdioma, type PorIdioma } from '../../core/i18n/porIdioma'

// Hitos del piano (offsets −364..0), alineados con el canon.
const PIANO_NACE = -334 // llega el teclado (mes 2)
const PRIMERA_NACE = -320
const PRIMERA_FIN = -215 // primera pieza completa (mes 5)
const CLAIR_NACE = -200
const CLAIR_FIN = -8 // tocada para la familia (mes 12)
const ASTRO_NACE = -302 // el hobby menor arranca en el mes 3
const LUNAS_NACE = -296

const NOMBRES: PorIdioma<Record<'piano' | 'astro' | 'primera' | 'clair' | 'lunas', string>> = {
  es: {
    piano: 'Piano',
    astro: 'Astrofotografía',
    primera: 'Primera pieza: Himno a la alegría',
    clair: 'Clair de Lune',
    lunas: 'Doce lunas llenas',
  },
  en: {
    piano: 'Piano',
    astro: 'Astrophotography',
    primera: 'First piece: Ode to Joy',
    clair: 'Clair de Lune',
    lunas: 'Twelve full moons',
  },
  pt: {
    piano: 'Piano',
    astro: 'Astrofotografia',
    primera: 'Primeira peça: Hino à Alegria',
    clair: 'Clair de Lune',
    lunas: 'Doze luas cheias',
  },
  fr: {
    piano: 'Piano',
    astro: 'Astrophotographie',
    primera: 'Premier morceau : Hymne à la joie',
    clair: 'Clair de Lune',
    lunas: 'Douze pleines lunes',
  },
  de: {
    piano: 'Klavier',
    astro: 'Astrofotografie',
    primera: 'Erstes Stück: Ode an die Freude',
    clair: 'Clair de Lune',
    lunas: 'Zwölf Vollmonde',
  },
  it: {
    piano: 'Pianoforte',
    astro: 'Astrofotografia',
    primera: 'Primo brano: Inno alla gioia',
    clair: 'Clair de Lune',
    lunas: 'Dodici lune piene',
  },
  ja: {
    piano: 'ピアノ',
    astro: '天体写真',
    primera: '最初の曲:歓喜の歌',
    clair: 'Clair de Lune',
    lunas: '十二の満月',
  },
  zh: {
    piano: '钢琴',
    astro: '天文摄影',
    primera: '第一首曲子:欢乐颂',
    clair: 'Clair de Lune',
    lunas: '十二次满月',
  },
  ko: {
    piano: '피아노',
    astro: '천체사진',
    primera: '첫 곡: 환희의 송가',
    clair: 'Clair de Lune',
    lunas: '열두 번의 보름달',
  },
  ru: {
    piano: 'Пианино',
    astro: 'Астрофотография',
    primera: 'Первая пьеса: Ода к радости',
    clair: 'Clair de Lune',
    lunas: 'Двенадцать полнолуний',
  },
  hi: {
    piano: 'पियानो',
    astro: 'खगोल फ़ोटोग्राफ़ी',
    primera: 'पहली रचना: आनंद का गीत',
    clair: 'Clair de Lune',
    lunas: 'बारह पूर्णिमाएँ',
  },
  tr: {
    piano: 'Piyano',
    astro: 'Astrofotoğrafçılık',
    primera: 'İlk parça: Neşeye Övgü',
    clair: 'Clair de Lune',
    lunas: 'On iki dolunay',
  },
  id: {
    piano: 'Piano',
    astro: 'Astrofotografi',
    primera: 'Karya pertama: Ode to Joy',
    clair: 'Clair de Lune',
    lunas: 'Dua belas bulan purnama',
  },
  pl: {
    piano: 'Pianino',
    astro: 'Astrofotografia',
    primera: 'Pierwszy utwór: Oda do radości',
    clair: 'Clair de Lune',
    lunas: 'Dwanaście pełni księżyca',
  },
  ar: {
    piano: 'البيانو',
    astro: 'التصوير الفلكي',
    primera: 'القطعة الأولى: نشيد الفرح',
    clair: 'Clair de Lune',
    lunas: 'اثنا عشر بدرًا',
  },
  nl: {
    piano: 'Piano',
    astro: 'Astrofotografie',
    primera: 'Eerste stuk: Ode aan de vreugde',
    clair: 'Clair de Lune',
    lunas: 'Twaalf volle manen',
  },
} as const

/** Probabilidad de sentarse al teclado: sube con el año, sostiene el bache. */
function probabilidadPiano(off: number): number {
  if (off < PIANO_NACE) return 0
  if (off >= -124 && off <= -100) return 0 // Japón: sin teclado
  if (off >= -184 && off <= -155) return 0.8 // el bache: el piano sostiene
  if (off < -304) return 0.5 // mes 2: entusiasmo nuevo
  if (off < -184) return 0.65
  return 0.7 // la recta final hacia Clair de Lune
}

export async function construirDemoHobbies(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_HOBBIES, () => import('./demo.data.i18n'))
  const nombres = enIdioma(NOMBRES, ctx.idioma)
  const r = rngDemo(19181107)
  const enFecha = (off: number) => `${ctx.fecha(off)}T10:00:00.000Z`

  // ── Piano: hobby + sus dos proyectos ────────────────────────────────────
  const pianoId = await hobbiesRepo.add({
    nombre: nombres.piano,
    emoji: '🎹',
    color: '#8b5cf6',
    metaDiasSemana: 4,
    creadoEn: enFecha(PIANO_NACE),
  })
  const primeraId = await proyectosHobbyRepo.add({
    hobbyId: pianoId,
    nombre: nombres.primera,
    estado: 'terminado',
    creadoEn: enFecha(PRIMERA_NACE),
    terminadoEn: ctx.fecha(PRIMERA_FIN),
    nota: datos.proyectos.primeraPieza,
  })
  const partitura = await ctx.foto('hobbies/partitura')
  const clairId = await proyectosHobbyRepo.add({
    hobbyId: pianoId,
    nombre: nombres.clair,
    estado: 'terminado',
    creadoEn: enFecha(CLAIR_NACE),
    terminadoEn: ctx.fecha(CLAIR_FIN),
    nota: datos.proyectos.clairDeLune,
    ...(partitura ? { imagenes: [partitura] } : {}),
  })

  // Sesiones de relleno + notas generadas colgadas de su día.
  const proyectoDe = (off: number) =>
    off >= CLAIR_NACE ? clairId : off >= PRIMERA_NACE && off <= PRIMERA_FIN ? primeraId : undefined
  const notasPorDia = new Map<number, string>(datos.notasPiano.map((n) => [n.dia, n.nota]))
  const dias = new Set<number>()
  for (let off = PIANO_NACE; off <= 0; off++) {
    if (r() < probabilidadPiano(off)) dias.add(off)
  }
  for (const dia of notasPorDia.keys()) dias.add(dia) // toda nota tiene sesión

  const sesionesPiano = [...dias].sort((a, b) => a - b).map((off) => {
    const progreso = (off - PIANO_NACE) / -PIANO_NACE // 0 → 1 a lo largo del año
    const minutos = Math.round(15 + progreso * 20 + r() * 10)
    const nota = notasPorDia.get(off)
    const proyectoId = proyectoDe(off)
    return {
      hobbyId: pianoId,
      fecha: ctx.fecha(off),
      minutos,
      ...(nota ? { nota } : {}),
      ...(proyectoId ? { proyectoId } : {}),
    }
  })
  await sesionesHobbyRepo.bulkAdd(sesionesPiano)

  // ── Astrofotografía: una salida por luna llena, todas con nota ──────────
  const astroId = await hobbiesRepo.add({
    nombre: nombres.astro,
    emoji: '🔭',
    color: '#0ea5e9',
    creadoEn: enFecha(ASTRO_NACE),
  })
  const luna1 = await ctx.foto('hobbies/luna-1')
  const luna2 = await ctx.foto('hobbies/luna-2')
  const lunas = [luna1, luna2].filter((b): b is Blob => !!b)
  const lunasId = await proyectosHobbyRepo.add({
    hobbyId: astroId,
    nombre: nombres.lunas,
    estado: 'en-curso',
    creadoEn: enFecha(LUNAS_NACE),
    nota: datos.proyectos.doceLunas,
    ...(lunas.length ? { imagenes: lunas } : {}),
  })
  await sesionesHobbyRepo.bulkAdd(
    datos.sesionesAstro.map((s) => ({
      hobbyId: astroId,
      fecha: ctx.fecha(s.dia),
      minutos: 45 + Math.round(r() * 45),
      nota: s.nota,
      ...(s.dia >= LUNAS_NACE ? { proyectoId: lunasId } : {}),
    })),
  )

  // ── Las metas, cada una en su ámbito ────────────────────────────────────
  // Aquí el ámbito importa más que en ninguna otra app: el cronograma de
  // Hobbies se abre DENTRO de un hobby o de un proyecto, así que una meta sin
  // `ambitoId` no se vería en ninguno de los dos.
  await sembrarMetasApp(ctx, 'hobbies', {
    ambitos: {
      piano: `hobby:${pianoId}`,
      clair: `proyecto:${clairId}`,
      lunas: `proyecto:${lunasId}`,
    },
  })
}
