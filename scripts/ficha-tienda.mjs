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
 * Lo que SÍ es obligatorio es lo contrario: con suscripciones auto-renovables,
 * Apple rechaza la ficha si la descripción no enlaza los Términos de uso (EULA).
 * La línea final es la misma de `ficha-appstore.mjs` (de ahí salen `EULA` y
 * `TERMINOS`): enlaza el EULA estándar de Apple, no la web, así que no choca
 * con la 3.1.1. Sin ella, `asc:ficha` (que sube ESTE markdown) borraría el
 * enlace de la ficha publicada.
 *
 * Los límites los IMPONE App Store Connect: pasarse no da un aviso, corta.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { EULA, TERMINOS, mayus } from '../marketing/tienda/generador/ficha-appstore.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'marketing/ficha')

/** Los 16 de `src/core/i18n/idiomas.ts`, en el mismo orden. */
const IDIOMAS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

/** Tope de caracteres de cada campo en App Store Connect. */
const LIMITES = { nombre: 30, subtitulo: 30, promocional: 170, palabras: 100, descripcion: 4000 }

/** El nombre es la marca: igual en las 16 fichas. */
const NOMBRE = 'MindHaOS'

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
    // En japonés y chino la puntuación de ancho completo no lleva espacio alrededor.
    .replace(/\s*([，、。！？；：])\s*/g, '$1')
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

/**
 * Facebook e Instagram NO salen en iOS mientras Meta no apruebe sus permisos
 * (`usePlataformasVisibles` en `redesStore.ts`): la ficha no puede prometer lo
 * que la app no enseña (2.3.1). Cuando Meta apruebe y `REDES_META_LIVE` pase a 1,
 * se quita esto y se regenera. Si la landing cambia la frase, el generador falla
 * en vez de dejar pasar la mención.
 */
const SIN_META = {
  en: ['YouTube, TikTok, Facebook or Instagram', 'YouTube or TikTok'],
  es: ['YouTube, TikTok, Facebook o Instagram', 'YouTube o TikTok'],
  pt: ['YouTube, TikTok, Facebook ou Instagram', 'YouTube ou TikTok'],
  fr: ['YouTube, TikTok, Facebook ou Instagram', 'YouTube ou TikTok'],
  de: ['YouTube, TikTok, Facebook oder Instagram', 'YouTube oder TikTok'],
  it: ['YouTube, TikTok, Facebook o Instagram', 'YouTube o TikTok'],
  ja: ['YouTube・TikTok・Facebook・Instagram', 'YouTube・TikTok'],
  zh: ['YouTube、TikTok、Facebook 或 Instagram', 'YouTube 或 TikTok'],
  ko: ['YouTube·TikTok·Facebook·Instagram', 'YouTube·TikTok'],
  ru: ['YouTube, TikTok, Facebook или Instagram', 'YouTube или TikTok'],
  hi: ['YouTube, TikTok, Facebook या Instagram', 'YouTube या TikTok'],
  tr: ['YouTube, TikTok, Facebook veya Instagram', 'YouTube veya TikTok'],
  id: ['YouTube, TikTok, Facebook, atau Instagram', 'YouTube atau TikTok'],
  pl: ['YouTube, TikToku, Facebooku czy na Instagramie', 'YouTube czy TikToku'],
  nl: ['YouTube-, TikTok-, Facebook- of Instagram-account', 'YouTube- of TikTok-account'],
  ar: ['YouTube أو TikTok أو Facebook أو Instagram', 'YouTube أو TikTok'],
}
const sinMeta = (texto, id) => {
  const [de, a] = SIN_META[id]
  if (!texto.includes(de)) throw new Error(`${id}: la frase de redes cambió en la landing; actualiza SIN_META`)
  return texto.replace(de, a)
}

function descripcion(t, id) {
  const bloques = [
    quitarPrecio(limpiar(t['meta.desc'])),
    // Cómo funciona: los tres pasos.
    [
      mayus(limpiar(t['como.h2']), id),
      `1. ${limpiar(t['como.1.t'])}\n${limpiar(t['como.1.p'])}`,
      `2. ${limpiar(t['como.2.t'])}\n${limpiar(t['como.2.p'])}`,
      `3. ${limpiar(t['como.3.t'])}\n${limpiar(t['como.3.p'])}`,
    ].join('\n\n'),
    // Qué trae: las siete tarjetas más las dos de cabecera.
    [
      mayus(limpiar(t['car.h2']), id),
      ...['todo', 'nocaduca', '1', 'studio', '2', '3', '4', '5', '6'].map(
        (n) => `• ${limpiar(t[`car.${n}.t`])}: ${n === 'studio' ? sinMeta(limpiar(t[`car.${n}.p`]), id) : limpiar(t[`car.${n}.p`])}`,
      ),
    ].join('\n'),
    // Sin el bloque de la IA local (Ollama): habla con un modelo en el ordenador
    // y en iOS no está probado; la app ya lo esconde en las tiendas.
    // Qué cuesta. SOLO los tres puntos de `precio.app.*`: el pie de esa
    // sección manda a comprar en la web y eso aquí es 3.1.1 (ver cabecera).
    [
      // El encabezado va SIN la cifra (ver quitarPrecio).
      mayus(limpiar(t['precio.app.nombre']), id),
      `• ${limpiar(t['precio.app.1'])}`,
      `• ${limpiar(t['precio.app.2'])}`,
      `• ${limpiar(t['precio.app.3'])}`,
    ].join('\n'),
    limpiar(t['mani.cierre']),
    `${TERMINOS[id]}: ${EULA}`,
  ]
  return bloques.join('\n\n')
}

function campos(id, t) {
  return {
    nombre: NOMBRE,
    // El subtítulo es la marca traducida («Casa Mental OS»), igual que debajo del
    // logo en la app; el inglés no la tiene y va sin subtítulo.
    subtitulo: t['marca.sub'] ?? SUBTITULO_PROPIO[id] ?? limpiar(t['hero.h1']),
    promocional: quitarPrecio(limpiar(t['og.desc'])),
    palabras: PALABRAS[id],
    descripcion: descripcion(t, id),
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
