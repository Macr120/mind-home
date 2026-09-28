import type { ClipVideo } from '../../core/data/db'
import { esEjemplo } from '../../core/data/ejemplos'
import { proyectosVideoRepo } from '../../core/data/repository'
import { ES_JUGADOR } from '../../core/state/peliculaStore'
import { filaEjemplo, porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { EN_OFF } from './constantes'
import type { ProyectoAbierto } from './modelo'
import { esLineaObra, nuevaLineaObra, type DuracionMedio } from './obra'

/**
 * Ejemplo de fábrica de la pestaña «Animación 3D»: una escena corta con tres
 * líneas de obra encadenadas (voz en off, tu avatar, voz en off). Solo guion:
 * sin voz generada ni medios, así que viaja entero por el sync y en cualquier
 * dispositivo se lee con la voz del sistema o se le genera la suya.
 */

const ID = 'video.animacion3d'

const TEXTOS = {
  es: {
    nombre: 'Mi primera escena',
    linea1: 'Una tarde cualquiera, en una casa como cualquier otra…',
    linea2: '¡Hoy voy a rodar mi primera película!',
    linea3: 'Y así empezó todo. Cambia estas líneas y rueda la tuya.',
  },
  en: {
    nombre: 'My first scene',
    linea1: 'An ordinary afternoon, in a house like any other…',
    linea2: "Today I'm shooting my very first movie!",
    linea3: "And that's how it all began. Change these lines and shoot your own.",
  },
  pt: {
    nombre: 'Minha primeira cena',
    linea1: 'Uma tarde qualquer, numa casa como qualquer outra…',
    linea2: 'Hoje vou filmar o meu primeiro filme!',
    linea3: 'E foi assim que tudo começou. Mude estas falas e filme a sua.',
  },
  fr: {
    nombre: 'Ma première scène',
    linea1: 'Un après-midi ordinaire, dans une maison comme les autres…',
    linea2: "Aujourd'hui, je tourne mon tout premier film !",
    linea3: "Et c'est ainsi que tout a commencé. Modifie ces répliques et tourne la tienne.",
  },
  de: {
    nombre: 'Meine erste Szene',
    linea1: 'Ein ganz normaler Nachmittag, in einem Haus wie jedem anderen …',
    linea2: 'Heute drehe ich meinen allerersten Film!',
    linea3: 'Und so fing alles an. Ändere diese Zeilen und dreh deine eigene Szene.',
  },
  it: {
    nombre: 'La mia prima scena',
    linea1: 'Un pomeriggio qualunque, in una casa come tante…',
    linea2: 'Oggi giro il mio primo film!',
    linea3: 'Ed è così che tutto è cominciato. Cambia queste battute e gira la tua.',
  },
  nl: {
    nombre: 'Mijn eerste scène',
    linea1: 'Een gewone middag, in een huis zoals elk ander…',
    linea2: 'Vandaag draai ik mijn allereerste film!',
    linea3: 'En zo begon het allemaal. Verander deze regels en draai je eigen scène.',
  },
  pl: {
    nombre: 'Moja pierwsza scena',
    linea1: 'Zwykłe popołudnie, w domu jak każdy inny…',
    linea2: 'Dziś kręcę mój pierwszy film!',
    linea3: 'I tak to wszystko się zaczęło. Zmień te kwestie i nakręć własną scenę.',
  },
  tr: {
    nombre: 'İlk sahnem',
    linea1: 'Sıradan bir öğleden sonra, herhangi bir evde…',
    linea2: 'Bugün ilk filmimi çekiyorum!',
    linea3: 'Ve her şey böyle başladı. Bu replikleri değiştir ve kendi sahneni çek.',
  },
  id: {
    nombre: 'Adegan pertamaku',
    linea1: 'Suatu sore biasa, di sebuah rumah seperti rumah lainnya…',
    linea2: 'Hari ini aku akan merekam film pertamaku!',
    linea3: 'Dan begitulah semuanya dimulai. Ubah dialog ini dan rekam adeganmu sendiri.',
  },
  ja: {
    nombre: 'はじめてのシーン',
    linea1: 'なんでもない午後、どこにでもある家で…',
    linea2: '今日は初めての映画を撮るぞ！',
    linea3: 'こうしてすべてが始まった。セリフを書き換えて、自分のシーンを撮ってみよう。',
  },
  zh: {
    nombre: '我的第一场戏',
    linea1: '一个平常的下午，在一座普普通通的房子里……',
    linea2: '今天我要拍我的第一部电影！',
    linea3: '一切就这样开始了。改一改这些台词，拍出你自己的一场戏吧。',
  },
  ko: {
    nombre: '나의 첫 장면',
    linea1: '어느 평범한 오후, 여느 집과 다름없는 집에서…',
    linea2: '오늘 내 첫 영화를 찍을 거야!',
    linea3: '그렇게 모든 것이 시작됐다. 대사를 바꿔서 나만의 장면을 찍어 보세요.',
  },
  ru: {
    nombre: 'Моя первая сцена',
    linea1: 'Обычный день, в самом обычном доме…',
    linea2: 'Сегодня я снимаю свой первый фильм!',
    linea3: 'Так всё и началось. Измени эти реплики и сними свою сцену.',
  },
  hi: {
    nombre: 'मेरा पहला दृश्य',
    linea1: 'एक आम-सी दोपहर, बाकी घरों जैसे ही एक घर में…',
    linea2: 'आज मेरी पहली फ़िल्म की शूटिंग है!',
    linea3: 'और इस तरह सब शुरू हुआ। इन पंक्तियों को बदलें और अपना दृश्य फ़िल्माएँ।',
  },
  ar: {
    nombre: 'مشهدي الأول',
    linea1: 'عصرٌ عادي، في بيتٍ كأي بيتٍ آخر…',
    linea2: 'اليوم سأصوّر فيلمي الأول!',
    linea3: 'وهكذا بدأ كل شيء. غيّر هذه الجمل وصوّر مشهدك الخاص.',
  },
}

/** Las líneas aún no tienen audio: dura lo que tarda en leerse. */
const sinAudio: DuracionMedio = () => undefined

export const ejemploAnimacion3d: PaqueteEjemplo = {
  id: ID,
  tablas: [proyectosVideoRepo],
  // La tabla la comparten los videos (y el anuncio de fábrica): solo cuentan las animaciones del usuario.
  hayPropios: () => proyectosVideoRepo.alguna((p) => p.escenario === '3d' && !esEjemplo(p)),
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => proyectosVideoRepo.list())) return
    const T = porIdioma(TEXTOS)
    const ahora = new Date().toISOString()
    let p: ProyectoAbierto = {
      nombre: T.nombre,
      aspecto: '16:9',
      escenario: '3d',
      escenas: [],
      clips: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    }
    // Encadenadas: cada línea empieza donde acaba la anterior; tu avatar actúa en su sitio del mapa.
    p = nuevaLineaObra(p, EN_OFF, T.linea1, sinAudio).p
    p = nuevaLineaObra(p, ES_JUGADOR, T.linea2, sinAudio, { emocion: 'felicidad', anim: 'rebotar' }).p
    p = nuevaLineaObra(p, EN_OFF, T.linea3, sinAudio).p
    await proyectosVideoRepo.addSeed(filaEjemplo(ID, 'escena', restaurar, p))
  },

  async retraducir() {
    for (const p of await proyectosVideoRepo.list()) {
      if (p.ejemploDe !== ID || p.id == null) continue
      const nombre = retraducido(TEXTOS, p.nombre, 'nombre')
      let cambio = false
      const clips = p.clips?.map((c): ClipVideo => {
        // Con audio ya generado, el texto se queda: si no, diría una cosa y se leería otra.
        if (!esLineaObra(c) || c.medioId != null) return c
        const texto = retraducido(TEXTOS, c.texto, 'linea1', 'linea2', 'linea3')
        if (!texto) return c
        cambio = true
        return { ...c, texto }
      })
      if (nombre || cambio) await proyectosVideoRepo.update(p.id, { ...(nombre && { nombre }), ...(cambio ? { clips } : {}) })
    }
  },
}
