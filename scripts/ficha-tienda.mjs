/**
 * Ficha del App Store en los 16 idiomas, sacada de la landing.
 *
 *   npm run ficha:tienda
 *
 * La copia de venta ya existe traducida y revisada en `web/i18n/paginas/*.mjs`
 * (es lo que lee la landing): reescribirla a mano para la tienda sería tener
 * dos verdades y una se quedaría vieja. Aquí solo se recorta a los límites de
 * Apple y se sale a `marketing/ficha/<id>.md`, listo para copiar y pegar en
 * App Store Connect.
 *
 * ⚠️ REGLA 3.1.1 DE APPLE: dentro de la ficha (y de la app) NO se puede
 * mencionar ni enlazar la compra de la web. Por eso se excluyen a propósito
 * `hero.nota` y `precio.app.pie`, que en la landing dicen «cómprala aquí
 * mismo, sin tienda de por medio». Si algún día se añaden textos nuevos a la
 * descripción, revisar que no vuelvan a colarse.
 *
 * Los límites los IMPONE App Store Connect: pasarse no da un aviso, corta.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'marketing/ficha')

/** Los 16 de `src/core/i18n/idiomas.ts`, en el mismo orden. */
const IDIOMAS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

/** Tope de caracteres de cada campo en App Store Connect. */
const LIMITES = { nombre: 30, subtitulo: 30, promocional: 170, palabras: 100, descripcion: 4000 }

/** El nombre es la marca: igual en las 16 fichas. */
const NOMBRE = 'Mind Planner Home'

/**
 * Subtítulos que NO caben en 30 al salir de `hero.h1`. Solo el indonesio se
 * pasa (32), y se arregla quitando el artículo.
 */
const SUBTITULO_PROPIO = { id: 'Pikiranmu, dalam rumah 3D' }

/**
 * Palabras clave (100 caracteres CONTANDO las comas; sin espacio detrás de la
 * coma, que Apple los cuenta). No repiten el nombre ni el subtítulo: Apple ya
 * los indexa por su cuenta y gastarlos aquí es tirar caracteres.
 */
const PALABRAS = {
  en: 'habits,goals,planner,journal,budget,nutrition,workout,sleep,study,ai,assistant,organizer',
  es: 'hábitos,metas,agenda,diario,finanzas,nutrición,ejercicio,sueño,estudio,ia,asistente,organizar',
  pt: 'hábitos,metas,agenda,diário,finanças,nutrição,treino,sono,estudo,ia,assistente,organizar',
  fr: 'habitudes,objectifs,agenda,journal,budget,nutrition,sport,sommeil,étude,ia,assistant',
  de: 'gewohnheiten,ziele,planer,tagebuch,finanzen,ernährung,training,schlaf,lernen,ki,assistent',
  it: 'abitudini,obiettivi,agenda,diario,finanze,nutrizione,allenamento,sonno,studio,ia,assistente',
  ja: '習慣,目標,手帳,日記,家計簿,栄養,運動,睡眠,学習,AI,アシスタント,管理,ライフログ',
  zh: '习惯,目标,计划,日记,记账,营养,运动,睡眠,学习,AI,助手,管理,生活',
  ko: '습관,목표,플래너,일기,가계부,영양,운동,수면,학습,AI,비서,관리,일상',
  ru: 'привычки,цели,планер,дневник,бюджет,питание,тренировки,сон,учёба,ии,помощник',
  hi: 'आदतें,लक्ष्य,प्लानर,डायरी,बजट,पोषण,व्यायाम,नींद,पढ़ाई,एआई,सहायक',
  tr: 'alışkanlık,hedef,ajanda,günlük,bütçe,beslenme,egzersiz,uyku,çalışma,yapay zeka,asistan',
  id: 'kebiasaan,tujuan,agenda,jurnal,anggaran,nutrisi,olahraga,tidur,belajar,ai,asisten,atur',
  pl: 'nawyki,cele,planer,dziennik,budżet,dieta,trening,sen,nauka,ai,asystent,organizer',
  nl: 'gewoontes,doelen,planner,dagboek,budget,voeding,training,slaap,studie,ai,assistent',
  ar: 'عادات,أهداف,مخطط,يوميات,ميزانية,تغذية,تمارين,نوم,دراسة,ذكاء اصطناعي,مساعد',
}

/** Quita el marcado de la landing (`<strong>`, `<br />`, `<span>`) y aprieta espacios. */
const limpiar = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Frases que llevan un precio dentro. La landing sí los dice; la ficha NO.
 *
 * Dos motivos. Uno: cambiar un precio obligaría a reescribir y reenviar los 16
 * idiomas, y el precio ya cambió cuatro veces (ver el historial de BACKEND.md).
 * Dos: el número sería mentira fuera de EE. UU. — Apple cobra en la moneda de
 * cada una de las 175 tiendas, y la ficha se lee en todas. El precio de verdad
 * lo pinta Apple solo, sacado de los productos de compra.
 *
 * Se corta por frases y no por palabras para no dejar el «Un solo pago de»
 * colgando. OJO con el corte: el japonés y el chino NO ponen espacio tras el
 * punto («。»), y el hindi cierra con danda («।»). Exigiendo espacio, esos tres
 * idiomas eran UNA sola frase y el filtro se llevaba el texto entero — se vio:
 * su promocional salió vacío.
 */
const CON_PRECIO = /\d+[.,]\d{2}|USD|\$|€/
const quitarPrecio = (texto) =>
  texto
    .split(/(?<=[.!?])\s+|(?<=[。！？；।])/)
    .filter((frase) => !CON_PRECIO.test(frase))
    .join(' ')
    // Al volver a unir no se cuela un espacio donde ese idioma no lo pone.
    .replace(/([。！？；।])\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

function descripcion(t) {
  const bloques = [
    quitarPrecio(limpiar(t['meta.desc'])),
    // Cómo funciona: los tres pasos.
    [
      limpiar(t['como.h2']).toUpperCase(),
      `1. ${limpiar(t['como.1.t'])}\n${limpiar(t['como.1.p'])}`,
      `2. ${limpiar(t['como.2.t'])}\n${limpiar(t['como.2.p'])}`,
      `3. ${limpiar(t['como.3.t'])}\n${limpiar(t['como.3.p'])}`,
    ].join('\n\n'),
    // Qué trae: las seis tarjetas más las dos de cabecera.
    [
      limpiar(t['car.h2']).toUpperCase(),
      ...['todo', 'nocaduca', '1', '2', '3', '4', '5', '6'].map(
        (n) => `• ${limpiar(t[`car.${n}.t`])}: ${limpiar(t[`car.${n}.p`])}`,
      ),
    ].join('\n'),
    // La IA, incluido que puede ser local (es diferencial y Apple lo agradece).
    [
      limpiar(t['ia.h2']).toUpperCase(),
      limpiar(t['ia.sub']),
      `• ${limpiar(t['ia.local.t'])}: ${limpiar(t['ia.local.p'])}`,
    ].join('\n\n'),
    // Qué cuesta. SOLO los tres puntos de `precio.app.*`: el pie de esa
    // sección manda a comprar en la web y eso aquí es 3.1.1 (ver cabecera).
    [
      // El encabezado va SIN la cifra (ver quitarPrecio).
      limpiar(t['precio.app.nombre']).toUpperCase(),
      `• ${limpiar(t['precio.app.1'])}`,
      `• ${limpiar(t['precio.app.2'])}`,
      `• ${limpiar(t['precio.app.3'])}`,
    ].join('\n'),
    limpiar(t['mani.cierre']),
  ]
  return bloques.join('\n\n')
}

function campos(id, t) {
  return {
    nombre: NOMBRE,
    subtitulo: SUBTITULO_PROPIO[id] ?? limpiar(t['hero.h1']),
    promocional: quitarPrecio(limpiar(t['og.desc'])),
    palabras: PALABRAS[id],
    descripcion: descripcion(t),
  }
}

mkdirSync(destino, { recursive: true })
const problemas = []

for (const id of IDIOMAS) {
  const { TEXTOS } = await import(`../web/i18n/paginas/${id}.mjs`)
  const c = campos(id, TEXTOS)
  for (const [campo, tope] of Object.entries(LIMITES)) {
    if ([...c[campo]].length > tope) {
      problemas.push(`${id}/${campo}: ${[...c[campo]].length} de ${tope}`)
    }
  }
  const md = `# Ficha App Store — ${id}

<!-- GENERADO por \`npm run ficha:tienda\` desde web/i18n/paginas/${id}.mjs.
     No editar a mano: el cambio se hace en la landing y se regenera. -->

## Nombre (${[...c.nombre].length}/${LIMITES.nombre})

${c.nombre}

## Subtítulo (${[...c.subtitulo].length}/${LIMITES.subtitulo})

${c.subtitulo}

## Texto promocional (${[...c.promocional].length}/${LIMITES.promocional})

${c.promocional}

## Palabras clave (${[...c.palabras].length}/${LIMITES.palabras})

${c.palabras}

## Descripción (${[...c.descripcion].length}/${LIMITES.descripcion})

${c.descripcion}
`
  writeFileSync(join(destino, `${id}.md`), md)
}

if (problemas.length) {
  console.error('Campos que NO caben en App Store Connect:\n  ' + problemas.join('\n  '))
  process.exit(1)
}
console.log(`Ficha generada en marketing/ficha/ para ${IDIOMAS.length} idiomas.`)
