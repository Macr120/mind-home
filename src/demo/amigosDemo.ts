import { guardarContactos, guardarMensajeLocal, limpiarCacheBuzon } from '../core/buzon/cache'
import { tipoCompartible } from '../core/buzon/compartibles'
import { contenidoDe, recontar } from '../core/buzon/motor'
import type { Contacto, MensajeBuzon } from '../core/buzon/tipos'
import { esDemo } from '../core/edicion'
import { idiomaActual } from '../core/i18n/useT'

/**
 * Dos amigos de mentira para la vista «Amigos» de la casa demo: Nadia y Tomás,
 * que ya están en la Agenda de Pep@ (así el grafo los une con su ficha). Cada
 * uno trae una conversación corta; Nadia comparte una receta del recetario.
 *
 * Vive solo en las tablas locales del buzón de la BD del demo: el motor del
 * buzón no arranca en el demo (`main.tsx`), así que nada llega al servidor, y
 * lo que Pep@ escriba se queda en el hilo (ver `motor.enviar`).
 */

type Frases = [string, string, string, string, string, string, string]

/** n1–n4: la charla con Nadia (n3 acompaña la receta); t1–t3: con Tomás. */
const FRASES: Record<string, Frases> = {
  es: [
    '¡Hola! ¿Sigues entrenando para el medio maratón?',
    '¡Sí! Salgo a correr los domingos temprano.',
    'Te paso la receta de la que te hablé.',
    '¿La cocinamos el sábado en tu casa?',
    '¿Viste el partido de anoche?',
    '¡Qué final! Esta semana te reto al ajedrez en tu casa.',
    'Hecho, te aviso cuando abra la sala.',
  ],
  en: [
    'Hi! Are you still training for the half marathon?',
    'Yes! I go running early on Sundays.',
    'Here’s the recipe I told you about.',
    'Shall we cook it at your place on Saturday?',
    'Did you watch last night’s game?',
    'What a finish! This week I’m challenging you to chess at your place.',
    'Deal, I’ll let you know when I open the room.',
  ],
  ar: [
    'مرحبًا! هل ما زلت تتدرب لنصف الماراثون؟',
    'نعم! أخرج للجري صباح كل أحد.',
    'إليك الوصفة التي حدثتك عنها.',
    'هل نطبخها يوم السبت في بيتك؟',
    'هل شاهدت مباراة البارحة؟',
    'يا لها من نهاية! هذا الأسبوع أتحداك في الشطرنج في بيتك.',
    'اتفقنا، سأخبرك عندما أفتح الغرفة.',
  ],
  de: [
    'Hallo! Trainierst du noch für den Halbmarathon?',
    'Ja! Sonntags gehe ich früh laufen.',
    'Hier ist das Rezept, von dem ich dir erzählt habe.',
    'Kochen wir es am Samstag bei dir?',
    'Hast du das Spiel gestern Abend gesehen?',
    'Was für ein Finale! Diese Woche fordere ich dich bei dir zum Schach heraus.',
    'Abgemacht, ich sag dir Bescheid, wenn ich den Raum öffne.',
  ],
  fr: [
    'Salut ! Tu t’entraînes toujours pour le semi-marathon ?',
    'Oui ! Je vais courir tôt le dimanche.',
    'Voici la recette dont je t’ai parlé.',
    'On la cuisine samedi chez toi ?',
    'Tu as vu le match hier soir ?',
    'Quelle fin ! Cette semaine, je te défie aux échecs chez toi.',
    'Ça marche, je te préviens quand j’ouvre la salle.',
  ],
  hi: [
    'नमस्ते! क्या आप अब भी हाफ़ मैराथन की तैयारी कर रहे हैं?',
    'हाँ! मैं रविवार को सुबह जल्दी दौड़ने जाता हूँ।',
    'यह रही वह रेसिपी जिसके बारे में मैंने बताया था।',
    'क्या शनिवार को आपके घर पर इसे बनाएँ?',
    'क्या आपने कल रात का मैच देखा?',
    'क्या शानदार अंत था! इस हफ़्ते आपके घर पर शतरंज का मुक़ाबला।',
    'ठीक है, कमरा खोलते ही बताऊँगा।',
  ],
  id: [
    'Hai! Masih latihan untuk half marathon?',
    'Iya! Aku lari pagi-pagi tiap Minggu.',
    'Ini resep yang pernah aku ceritakan.',
    'Kita masak hari Sabtu di rumahmu?',
    'Kamu nonton pertandingan semalam?',
    'Akhir yang seru! Minggu ini aku tantang kamu main catur di rumahmu.',
    'Oke, nanti aku kabari kalau ruangannya sudah kubuka.',
  ],
  it: [
    'Ciao! Ti stai ancora allenando per la mezza maratona?',
    'Sì! La domenica vado a correre presto.',
    'Ecco la ricetta di cui ti parlavo.',
    'La cuciniamo sabato a casa tua?',
    'Hai visto la partita di ieri sera?',
    'Che finale! Questa settimana ti sfido a scacchi a casa tua.',
    'Affare fatto, ti avviso quando apro la stanza.',
  ],
  ja: [
    'やあ！まだハーフマラソンの練習してる？',
    'うん！日曜の朝早くに走ってるよ。',
    '話してたレシピを送るね。',
    '土曜にあなたの家で作らない？',
    '昨日の夜の試合、見た？',
    'すごい結末だったね！今週はあなたの家でチェスの勝負をしよう。',
    'いいよ、部屋を開けたら知らせるね。',
  ],
  ko: [
    '안녕! 아직 하프 마라톤 준비하고 있어?',
    '응! 일요일마다 아침 일찍 달리러 가.',
    '내가 말했던 레시피 보내 줄게.',
    '토요일에 너희 집에서 같이 만들까?',
    '어젯밤 경기 봤어?',
    '대단한 결말이었지! 이번 주에 너희 집에서 체스로 한판 붙자.',
    '좋아, 방 열면 알려 줄게.',
  ],
  nl: [
    'Hoi! Train je nog steeds voor de halve marathon?',
    'Ja! Op zondag ga ik vroeg hardlopen.',
    'Hier is het recept waar ik het over had.',
    'Zullen we het zaterdag bij jou koken?',
    'Heb je de wedstrijd van gisteravond gezien?',
    'Wat een ontknoping! Deze week daag ik je bij jou thuis uit voor schaken.',
    'Afgesproken, ik laat het weten als ik de kamer open.',
  ],
  pl: [
    'Cześć! Nadal trenujesz do półmaratonu?',
    'Tak! W niedziele biegam wcześnie rano.',
    'Przesyłam przepis, o którym ci mówiłam.',
    'Ugotujemy to w sobotę u ciebie?',
    'Widziałeś wczorajszy mecz?',
    'Co za końcówka! W tym tygodniu wyzywam cię na szachy u ciebie.',
    'Umowa stoi, dam znać, kiedy otworzę pokój.',
  ],
  pt: [
    'Oi! Você ainda está treinando para a meia maratona?',
    'Sim! Corro cedo aos domingos.',
    'Aqui está a receita de que te falei.',
    'Vamos cozinhar no sábado na sua casa?',
    'Você viu o jogo de ontem à noite?',
    'Que final! Esta semana te desafio no xadrez na sua casa.',
    'Combinado, te aviso quando abrir a sala.',
  ],
  ru: [
    'Привет! Ты всё ещё готовишься к полумарафону?',
    'Да! По воскресеньям бегаю рано утром.',
    'Держи рецепт, о котором я рассказывала.',
    'Приготовим его в субботу у тебя?',
    'Ты видел вчерашний матч?',
    'Вот это концовка! На этой неделе вызываю тебя на шахматы у тебя дома.',
    'Договорились, напишу, когда открою комнату.',
  ],
  tr: [
    'Selam! Hâlâ yarı maraton için antrenman yapıyor musun?',
    'Evet! Pazar sabahları erkenden koşuya çıkıyorum.',
    'Sana bahsettiğim tarifi gönderiyorum.',
    'Cumartesi sende pişirelim mi?',
    'Dün akşamki maçı izledin mi?',
    'Ne final ama! Bu hafta evinde sana satranç meydan okuyorum.',
    'Anlaştık, odayı açınca haber veririm.',
  ],
  zh: [
    '嗨！你还在为半程马拉松训练吗？',
    '是的！我每个星期天一早去跑步。',
    '把我跟你说过的那个食谱发给你。',
    '星期六在你家一起做吧？',
    '你看昨晚的比赛了吗？',
    '结局太精彩了！这周在你家跟你下一盘国际象棋。',
    '好的，我开好房间就告诉你。',
  ],
}

const HILO_NADIA = 'demo-hilo-nadia'
const HILO_TOMAS = 'demo-hilo-tomas'

let sembrado: Promise<void> | null = null

/**
 * Repone los amigos del demo UNA vez por carga de la página: lo que Pep@
 * escribió se borra al recargar, como el resto de la casa demo («nada se
 * guarda»; las tablas del buzón no entran en la foto del sandbox). Una sola
 * promesa: el doble montaje de desarrollo la lanzaba dos veces y el segundo
 * alta chocaba con el `&uid` de los mensajes.
 */
export function sembrarAmigosDemo(): Promise<void> {
  // Los no leídos se cuentan aquí: el motor del buzón (que lo hace fuera del demo) no corre.
  sembrado ??= sembrar().then(recontar)
  return sembrado
}

async function sembrar(): Promise<void> {
  if (!esDemo()) return
  await limpiarCacheBuzon()
  const f = FRASES[idiomaActual()] ?? FRASES.es!
  const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

  const contacto = (id: string, hiloId: string, alias: string, nombre: string, emoji: string): Contacto => ({
    contactoId: id,
    hiloId,
    alias,
    nombre,
    emoji,
    retrato: null,
    estado: 'aceptado',
    direccion: 'enviada',
    bloqueadoPorMi: false,
    actualizadoEn: hace(60 * 24 * 30),
  })
  await guardarContactos([
    contacto('demo-ct-nadia', HILO_NADIA, 'nadia_s', 'Nadia Serrano', '🦊'),
    contacto('demo-ct-tomas', HILO_TOMAS, 'tomas_iri', 'Tomás Iriarte', '🐻'),
  ])

  // La receta que comparte Nadia: una del recetario del demo, con preferencia por los tacos.
  const recetas = tipoCompartible('cocina', 'receta')
  const lista = (await recetas?.listar()) ?? []
  const elegida = lista.find((r) => /pastor/i.test(r.nombre)) ?? lista[0]
  const paquete = elegida ? await recetas?.empaquetar(elegida.clave) : null

  let seq = 0
  const mensaje = (hiloId: string, mio: boolean, texto: string, min: number, leido = true): MensajeBuzon => ({
    uid: `demo-msg-${hiloId}-${++seq}`,
    hiloId,
    mio,
    tipo: 'texto',
    texto,
    serverSeq: seq,
    creadoEn: hace(min),
    ...(leido || mio ? { leidoEn: hace(min) } : {}),
  })
  const [n1, n2, n3, n4, t1, t2, t3] = f
  const mensajes: MensajeBuzon[] = [
    mensaje(HILO_NADIA, false, n1, 60 * 50),
    mensaje(HILO_NADIA, true, n2, 60 * 49),
    paquete
      ? { ...mensaje(HILO_NADIA, false, n3, 60 * 26), tipo: 'contenido', contenido: contenidoDe(paquete, {}) }
      : mensaje(HILO_NADIA, false, n3, 60 * 26),
    mensaje(HILO_NADIA, false, n4, 25, false),
    mensaje(HILO_TOMAS, true, t1, 60 * 20),
    mensaje(HILO_TOMAS, false, t2, 60 * 19),
    mensaje(HILO_TOMAS, true, t3, 60 * 3),
  ]
  for (const m of mensajes) await guardarMensajeLocal(m)
}
