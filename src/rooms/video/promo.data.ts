// GENERADO por marketing/promo/empaquetar-studio.mjs — no editar a mano.
//
// El video de fábrica de MindHaOS («Día 1 → Día 365») montado para el Studio de video, resuelto por idioma: las
// tomas en orden con su duración (el sobrante de la voz ya repartido), dónde
// entra cada línea de voz, y los textos. Los binarios viven en
// `public/promo/`; `rooms/video/promo.ts` los siembra como un proyecto normal.
import type { PorIdioma } from '../../core/i18n/porIdioma'

/** `sfx`: sonido de fábrica (clave de `sonidos.ts`) que suena con el corte de la toma. */
export type TomaPromo =
  | { tipo: 'clip'; clip: string; seg: number; sfx?: string }
  /** Un calendario en otro idioma (la ráfaga «16 idiomas»). */
  | { tipo: 'rafaga'; idioma: string; seg: number; sfx?: string }
  | { tipo: 'escritorio'; seg: number; sfx?: string }
  | { tipo: 'cierre'; seg: number; sfx?: string }

export interface PlanPromo {
  nombre: string
  /** Carpeta de clips de la app en ese idioma (`public/promo/clips/<clips>/`); la captura de escritorio va igual. */
  clips: 'es' | 'en'
  lineas: Record<string, string>
  cierre: string[]
  gratis: string
  tomas: TomaPromo[]
  voces: { linea: string; desde: number; seg: number }[]
  /** Sonidos de fábrica que van DESPUÉS de una línea de voz (se cortan si entra la siguiente). */
  efectos: { clave: string; desde: number }[]
}

/** Duraciones (s) y tamaños de lo que hay en `public/promo/`. */
export const PROMO_MEDIOS: {
  clips: Record<string, Record<string, number>>
  /** El calendario de cada idioma grabado (la ráfaga). */
  calendarios: Record<string, number>
  escritorio: Record<string, { ancho: number; alto: number }>
  musica: number | null
} = {
  clips: {
    es: { "00-dia1": 3.27, "11-dia365": 8.67 }
  },
  calendarios: { ja: 0.7, ar: 0.7, hi: 0.7, ko: 0.7, ru: 0.7, zh: 0.7, es: 0.7 },
  escritorio: {},
  musica: null
}

export const PROMO_NOMBRES: Record<'es' | 'en', Record<string, string>> = {
  es: {
    "01-avatar": 'Avatar en primer plano',
    "02-casa-gira": 'La casa gira',
    "03-app-cocina": 'App Cocina',
    "03-app-ejercicio": 'App Ejercicio',
    "03-app-finanzas": 'App Finanzas',
    "03-app-metas": 'App Metas',
    "03-app-studio": 'App Studio',
    "04-mosaico": 'Mosaico de apps',
    "04-editor": 'Editor de la casa',
    "04-temas": 'Temas de la casa',
    "05-calendario": 'Calendario',
    "05-misiones": 'Misiones',
    "05-cronograma": 'Cronograma',
    "06-avatar-asistente": 'Avatar y asistente',
    "06-chat": 'Chat con el asistente',
    "06-fotos": 'Anecdotario',
    "06-ideas": 'Ideas',
    "06-diagrama": 'Diagrama de decisión',
    "06-formulas": 'Formulario de fórmulas',
    "06-grafica": 'Superficie 3D',
    "07-sisifo": 'Sísifo',
    "07-wrapped": 'Resumen',
    "07-baile": 'Baile',
    "07-panel-ia": 'Panel de IA',
    "09-atardecer": 'Atardecer',
    "10-zoom-out": 'La casa desde lejos',
    "00-dia1": 'Día uno',
    "11-dia365": 'Día 365',
    escritorio: 'MindHaOS en escritorio',
    musica: 'Música del anuncio'
  },
  en: {
    "01-avatar": 'Avatar close-up',
    "02-casa-gira": 'The house spins',
    "03-app-cocina": 'Kitchen app',
    "03-app-ejercicio": 'Workout app',
    "03-app-finanzas": 'Finances app',
    "03-app-metas": 'Goals app',
    "03-app-studio": 'Studio app',
    "04-mosaico": 'App mosaic',
    "04-editor": 'House editor',
    "04-temas": 'House themes',
    "05-calendario": 'Calendar',
    "05-misiones": 'Missions',
    "05-cronograma": 'Schedule',
    "06-avatar-asistente": 'Avatar and assistant',
    "06-chat": 'Chat with the assistant',
    "06-fotos": 'Journal',
    "06-ideas": 'Ideas',
    "06-diagrama": 'Decision diagram',
    "06-formulas": 'Formula book',
    "06-grafica": '3D surface',
    "07-sisifo": 'Sisyphus',
    "07-wrapped": 'Recap',
    "07-baile": 'Dance',
    "07-panel-ia": 'AI panel',
    "09-atardecer": 'Sunset',
    "10-zoom-out": 'The house from afar',
    "00-dia1": 'Day one',
    "11-dia365": 'Day 365',
    escritorio: 'MindHaOS on desktop',
    musica: 'Ad music'
  }
}

export const PROMO: PorIdioma<PlanPromo> = {
  es: {
    nombre: 'Día 1 → Día 365',
    clips: 'es',
    lineas: {
      gancho: '¿Y si el tamagotchi… fueras tú mismo?',
      casa: 'Mira, esta es mi casa, y cada cuarto es una app: la cocina, el ejercicio, mis finanzas, mis metas, mi música… y muchas más.',
      disena: 'Y la armas como tú quieras. Tú decides qué va en cada cuarto.',
      metas: 'Aquí organizo mi semana, mis pendientes y mis metas… y las cumplo en la vida real.',
      ia: 'Y si quieres, platicas con tus asistentes: te ayudan con tu día y te hacen imágenes, diagramas, lo que necesites.',
      cerebro: 'Así que en vez de nada más scrollear… mejor ve cómo van creciendo tus hábitos.',
      idiomas: 'Está en dieciséis idiomas, en la web, en la compu y en el cel. Con IA o sin IA, tú eliges.',
      cta: 'Se llama MindHaOS. Prueba hacer tu casa gratis.',
      eslogan: 'Construye tu personaje… construyendo tus hábitos.',
      dia1: 'Día uno en MindHaOS.',
      dia365: 'Día 365 en MindHaOS.'
    },
    cierre: [
      'Construye a tu personaje, construyendo tus hábitos.',
      'Diseña tu casa, diseñando tu futuro.',
      'Conquista los objetivos de los cuartos, conquistando tus pendientes.'
    ],
    gratis: 'Pruébala gratis',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.67, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.53 },
      { linea: 'dia365', desde: 5.8, seg: 2.51 },
      { linea: 'eslogan', desde: 8.56, seg: 2.81 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.47 }
    ]
  },
  en: {
    nombre: 'Day 1 → Day 365',
    clips: 'es',
    lineas: {
      gancho: 'What if the Tamagotchi… was you?',
      casa: 'Look, this is my house, and every room is an app: the kitchen, workouts, my finances, my goals, my music… and lots more.',
      disena: 'And you build it however you want. You decide what goes in each room.',
      metas: 'Here I plan my week, my to-dos and my goals… and I actually hit them in real life.',
      ia: 'And if you want, you chat with your assistants: they help with your day and make you images, diagrams, whatever you need.',
      cerebro: 'So instead of just scrolling… watch your habits grow.',
      idiomas: 'It\'s in sixteen languages, on the web, your computer and your phone. With AI or without it, your call.',
      cta: 'It\'s called MindHaOS. Try building your house for free.',
      eslogan: 'Build your character… by building your habits.',
      dia1: 'Day one in MindHaOS.',
      dia365: 'Day 365 in MindHaOS.'
    },
    cierre: [
      'Build your character, building your habits.',
      'Design your house, designing your future.',
      'Conquer the goals of each room, conquering your to-dos.'
    ],
    gratis: 'Try it for free',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 6.66, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.29 },
      { linea: 'dia365', desde: 5.8, seg: 2.07 },
      { linea: 'eslogan', desde: 8.12, seg: 2.24 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.46 }
    ]
  },
  pt: {
    nombre: 'Dia 1 → Dia 365',
    clips: 'es',
    lineas: {
      gancho: 'E se o tamagotchi… fosse você?',
      casa: 'Olha, essa é a minha casa, e cada cômodo é um app: a cozinha, os treinos, minhas finanças, minhas metas, minha música… e muito mais.',
      disena: 'E você monta do jeito que quiser. Você decide o que vai em cada cômodo.',
      metas: 'Aqui eu organizo minha semana, minhas tarefas e minhas metas… e cumpro na vida real.',
      ia: 'E se quiser, você conversa com seus assistentes: eles te ajudam no dia a dia e criam imagens, diagramas, o que você precisar.',
      cerebro: 'Então, em vez de só ficar rolando a tela… veja seus hábitos crescerem.',
      idiomas: 'Está em dezesseis idiomas, na web, no computador e no celular. Com IA ou sem IA, você escolhe.',
      cta: 'Se chama MindHaOS. Experimente criar sua casa grátis.',
      eslogan: 'Construa seu personagem… construindo seus hábitos.',
      dia1: 'Dia um no MindHaOS.',
      dia365: 'Dia 365 no MindHaOS.'
    },
    cierre: [
      'Construa seu personagem, construindo seus hábitos.',
      'Projete sua casa, projetando seu futuro.',
      'Conquiste os objetivos dos cômodos, conquistando suas pendências.'
    ],
    gratis: 'Experimente grátis',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.53, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.23 },
      { linea: 'dia365', desde: 5.8, seg: 2.33 },
      { linea: 'eslogan', desde: 8.38, seg: 2.85 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.33 }
    ]
  },
  fr: {
    nombre: 'Jour 1 → Jour 365',
    clips: 'es',
    lineas: {
      gancho: 'Et si le tamagotchi… c\'était toi ?',
      casa: 'Regarde, voici ma maison, et chaque pièce est une app : la cuisine, le sport, mes finances, mes objectifs, ma musique… et plein d\'autres.',
      disena: 'Et tu l\'aménages comme tu veux. C\'est toi qui décides ce qui va dans chaque pièce.',
      metas: 'Ici j\'organise ma semaine, mes tâches et mes objectifs… et je les tiens dans la vraie vie.',
      ia: 'Et si tu veux, tu discutes avec tes assistants : ils t\'aident au quotidien et te créent des images, des schémas, tout ce qu\'il te faut.',
      cerebro: 'Alors au lieu de juste scroller… regarde tes habitudes grandir.',
      idiomas: 'C\'est en seize langues, sur le web, sur ton ordi et sur ton téléphone. Avec ou sans IA, c\'est toi qui choisis.',
      cta: 'Ça s\'appelle MindHaOS. Essaie de créer ta maison gratuitement.',
      eslogan: 'Construis ton personnage… en construisant tes habitudes.',
      dia1: 'Jour un dans MindHaOS.',
      dia365: 'Jour 365 dans MindHaOS.'
    },
    cierre: [
      'Construis ton personnage, en construisant tes habitudes.',
      'Conçois ta maison, en concevant ton avenir.',
      'Conquiers les objectifs de chaque pièce, en venant à bout de tes tâches.'
    ],
    gratis: 'Essayer gratuitement',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 6.72, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 0.96 },
      { linea: 'dia365', desde: 5.8, seg: 1.71 },
      { linea: 'eslogan', desde: 7.76, seg: 2.66 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.52 }
    ]
  },
  de: {
    nombre: 'Tag 1 → Tag 365',
    clips: 'es',
    lineas: {
      gancho: 'Was wäre, wenn das Tamagotchi… du selbst wärst?',
      casa: 'Schau, das ist mein Haus, und jeder Raum ist eine App: die Küche, Training, meine Finanzen, meine Ziele, meine Musik… und noch viel mehr.',
      disena: 'Und du baust es, wie du willst. Du entscheidest, was in jeden Raum kommt.',
      metas: 'Hier plane ich meine Woche, meine Aufgaben und meine Ziele… und schaffe sie im echten Leben.',
      ia: 'Und wenn du willst, chattest du mit deinen Assistenten: Sie helfen dir durch den Tag und machen dir Bilder, Diagramme, was du brauchst.',
      cerebro: 'Also statt nur zu scrollen… sieh zu, wie deine Gewohnheiten wachsen.',
      idiomas: 'Es gibt es in sechzehn Sprachen, im Web, am Computer und auf dem Handy. Mit KI oder ohne, du entscheidest.',
      cta: 'Es heißt MindHaOS. Bau dein Haus – gratis ausprobieren.',
      eslogan: 'Bau deinen Charakter… indem du deine Gewohnheiten aufbaust.',
      dia1: 'Tag eins in MindHaOS.',
      dia365: 'Tag 365 in MindHaOS.'
    },
    cierre: [
      'Baue deine Figur, indem du deine Gewohnheiten aufbaust.',
      'Gestalte dein Haus, und gestalte deine Zukunft.',
      'Erobere die Ziele der Räume, und erledige deine Aufgaben.'
    ],
    gratis: 'Gratis ausprobieren',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.87, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.4 },
      { linea: 'dia365', desde: 5.8, seg: 2.48 },
      { linea: 'eslogan', desde: 8.53, seg: 3.04 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.67 }
    ]
  },
  it: {
    nombre: 'Giorno 1 → Giorno 365',
    clips: 'es',
    lineas: {
      gancho: 'E se il tamagotchi… fossi tu?',
      casa: 'Guarda, questa è casa mia: ogni stanza è un\'app. Cucina, allenamento, finanze, obiettivi, musica… e tanto altro.',
      disena: 'E la arredi come vuoi tu. Sei tu a decidere cosa va in ogni stanza.',
      metas: 'Qui organizzo la mia settimana, le cose da fare e i miei obiettivi… e li raggiungo nella vita vera.',
      ia: 'E se vuoi, chiacchieri con i tuoi assistenti: ti aiutano con la giornata e ti creano immagini, diagrammi, quello che ti serve.',
      cerebro: 'Quindi invece di scrollare e basta… guarda crescere le tue abitudini.',
      idiomas: 'È in sedici lingue, sul web, sul computer e sul telefono. Con l\'IA o senza, scegli tu.',
      cta: 'Si chiama MindHaOS. Prova a creare la tua casa gratis.',
      eslogan: 'Costruisci il tuo personaggio… costruendo le tue abitudini.',
      dia1: 'Giorno uno su MindHaOS.',
      dia365: 'Giorno 365 su MindHaOS.'
    },
    cierre: [
      'Costruisci il tuo personaggio, costruendo le tue abitudini.',
      'Progetta la tua casa, progettando il tuo futuro.',
      'Conquista gli obiettivi delle stanze, conquistando le tue cose da fare.'
    ],
    gratis: 'Provala gratis',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 8.39, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.54 },
      { linea: 'dia365', desde: 5.8, seg: 2.58 },
      { linea: 'eslogan', desde: 8.63, seg: 3.46 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.19 }
    ]
  },
  ja: {
    nombre: '1日目 → 365日目',
    clips: 'es',
    lineas: {
      gancho: 'もしたまごっちが…あなた自身だったら？',
      casa: '見て、これがぼくの家。部屋ひとつひとつがアプリなんだ。キッチン、運動、お金、目標、音楽…ほかにもたくさん。',
      disena: '家は好きなように作れる。どの部屋に何を置くかは、あなたが決める。',
      metas: 'ここで一週間の予定、やること、目標を整理して…ちゃんと現実で達成する。',
      ia: 'その気になれば、アシスタントとおしゃべりも。毎日を手伝ってくれて、画像や図も、必要なものを作ってくれる。',
      cerebro: 'だから、ただスクロールするかわりに…習慣が育っていくのを見よう。',
      idiomas: '16の言語に対応。ウェブでも、パソコンでも、スマホでも。AIありでもなしでも、あなた次第。',
      cta: 'その名はMindHaOS。無料で家づくりを試してみて。',
      eslogan: 'キャラクターを育てよう…習慣を育てながら。',
      dia1: 'MindHaOSの1日目。',
      dia365: 'MindHaOSの365日目。'
    },
    cierre: [
      '習慣を育てて、キャラクターを育てる。',
      '家をデザインして、未来をデザインする。',
      '部屋の目標を制覇して、やることを制覇する。'
    ],
    gratis: '無料で試す',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'es', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.51, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.88 },
      { linea: 'dia365', desde: 5.8, seg: 2.52 },
      { linea: 'eslogan', desde: 8.57, seg: 2.64 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.31 }
    ]
  },
  zh: {
    nombre: '第1天 → 第365天',
    clips: 'es',
    lineas: {
      gancho: '如果电子宠物……就是你自己呢？',
      casa: '看，这是我的家，每个房间都是一个应用：厨房、健身、我的财务、我的目标、我的音乐……还有很多很多。',
      disena: '家想怎么搭就怎么搭。每个房间放什么，你说了算。',
      metas: '我在这里安排一周、待办和目标……然后在现实生活里把它们完成。',
      ia: '想的话，还能和你的助手聊天：它们帮你打理每一天，还能给你做图片、图表，你要什么都行。',
      cerebro: '所以别再只是刷手机了……看着你的习惯一点点长大吧。',
      idiomas: '支持十六种语言，网页、电脑、手机都能用。用不用 AI，你来定。',
      cta: '它叫 MindHaOS。免费试试打造你的家。',
      eslogan: '打造你的角色……从打造你的习惯开始。',
      dia1: 'MindHaOS 第一天。',
      dia365: 'MindHaOS 第365天。'
    },
    cierre: [
      '养成习惯，养成你的角色。',
      '设计你的家，设计你的未来。',
      '攻克每个房间的目标，攻克你的待办。'
    ],
    gratis: '免费试用',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'es', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 6.94, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.45 },
      { linea: 'dia365', desde: 5.8, seg: 2.03 },
      { linea: 'eslogan', desde: 8.08, seg: 2.56 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.74 }
    ]
  },
  ko: {
    nombre: '1일 차 → 365일 차',
    clips: 'es',
    lineas: {
      gancho: '다마고치가… 바로 너라면?',
      casa: '봐, 이게 내 집인데 방마다 앱이 하나씩 있어: 주방, 운동, 돈 관리, 목표, 음악, 그리고 훨씬 더 많아.',
      disena: '집은 네 마음대로 꾸며. 방마다 뭘 넣을지는 네가 정해.',
      metas: '여기서 한 주 계획, 할 일, 목표를 정리하고… 진짜 생활에서 해내는 거야.',
      ia: '원하면 어시스턴트랑 대화도 해. 하루를 도와주고 이미지, 다이어그램, 필요한 건 다 만들어 줘.',
      cerebro: '그러니까 그냥 스크롤만 하지 말고… 네 습관이 자라는 걸 봐.',
      idiomas: '16개 언어로, 웹에서도, 컴퓨터에서도, 폰에서도. AI가 있든 없든, 네가 골라.',
      cta: '이름은 MindHaOS. 집 만들기를 무료로 해 봐.',
      eslogan: '캐릭터를 키워… 습관을 키우면서.',
      dia1: 'MindHaOS 1일 차.',
      dia365: 'MindHaOS 365일 차.'
    },
    cierre: [
      '습관을 쌓아, 캐릭터를 키우세요.',
      '집을 디자인하며, 미래를 디자인하세요.',
      '방의 목표를 정복하며, 할 일을 정복하세요.'
    ],
    gratis: '무료로 써 보기',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'es', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 6.44, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.27 },
      { linea: 'dia365', desde: 5.8, seg: 1.71 },
      { linea: 'eslogan', desde: 7.76, seg: 2.38 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.24 }
    ]
  },
  ru: {
    nombre: 'День 1 → День 365',
    clips: 'es',
    lineas: {
      gancho: 'А что, если тамагочи… это ты сам?',
      casa: 'Смотри, это мой дом, и каждая комната — приложение: кухня, тренировки, мои финансы, мои цели, моя музыка… и ещё много всего.',
      disena: 'И обустраиваешь его как хочешь. Ты решаешь, что будет в каждой комнате.',
      metas: 'Здесь я планирую неделю, дела и цели… и выполняю их в реальной жизни.',
      ia: 'А если хочешь, болтаешь со своими помощниками: они помогают с делами и делают тебе картинки, схемы — всё, что нужно.',
      cerebro: 'Так что вместо того, чтобы просто листать ленту… смотри, как растут твои привычки.',
      idiomas: 'Шестнадцать языков, в браузере, на компьютере и на телефоне. С ИИ или без — выбираешь ты.',
      cta: 'Это MindHaOS. Попробуй построить свой дом бесплатно.',
      eslogan: 'Строй своего персонажа… строя свои привычки.',
      dia1: 'День первый в MindHaOS.',
      dia365: 'День 365 в MindHaOS.'
    },
    cierre: [
      'Строй персонажа, выстраивая привычки.',
      'Проектируй дом, проектируя будущее.',
      'Покоряй цели комнат, разбираясь с делами.'
    ],
    gratis: 'Попробовать бесплатно',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'es', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.61, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.62 },
      { linea: 'dia365', desde: 5.8, seg: 2.52 },
      { linea: 'eslogan', desde: 8.57, seg: 2.74 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.41 }
    ]
  },
  hi: {
    nombre: 'दिन 1 → दिन 365',
    clips: 'es',
    lineas: {
      gancho: 'क्या हो अगर तामागोची… तुम ख़ुद हो?',
      casa: 'देखो, ये मेरा घर है, और हर कमरा एक ऐप है: रसोई, कसरत, मेरे पैसे, मेरे लक्ष्य, मेरा संगीत… और भी बहुत कुछ।',
      disena: 'और घर तुम जैसे चाहो वैसे सजाओ। किस कमरे में क्या होगा, ये तुम तय करो।',
      metas: 'यहाँ मैं अपना हफ़्ता, अपने काम और अपने लक्ष्य प्लान करता हूँ… और असल ज़िंदगी में उन्हें पूरा करता हूँ।',
      ia: 'और चाहो तो अपने असिस्टेंट से बात करो: वो तुम्हारे दिन में मदद करते हैं और तस्वीरें, डायग्राम, जो चाहिए बना देते हैं।',
      cerebro: 'तो बस स्क्रॉल करने के बजाय… अपनी आदतों को बढ़ते देखो।',
      idiomas: 'सोलह भाषाओं में, वेब पर, कंप्यूटर पर और फ़ोन पर। AI के साथ या बिना, तुम चुनो।',
      cta: 'इसका नाम है MindHaOS। अपना घर बनाना मुफ़्त आज़माओ।',
      eslogan: 'अपना किरदार बनाओ… अपनी आदतें बनाते हुए।',
      dia1: 'MindHaOS में पहला दिन।',
      dia365: 'MindHaOS में 365वाँ दिन।'
    },
    cierre: [
      'आदतें बनाते हुए, अपना किरदार बनाओ।',
      'घर डिज़ाइन करते हुए, अपना भविष्य डिज़ाइन करो।',
      'कमरों के लक्ष्य जीतते हुए, अपने काम निपटाओ।'
    ],
    gratis: 'मुफ़्त में आज़माओ',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'es', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.94, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.61 },
      { linea: 'dia365', desde: 5.8, seg: 2.47 },
      { linea: 'eslogan', desde: 8.52, seg: 3.12 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.74 }
    ]
  },
  tr: {
    nombre: '1. gün → 365. gün',
    clips: 'es',
    lineas: {
      gancho: 'Ya tamagotchi… sen olsaydın?',
      casa: 'Bak, burası benim evim ve her oda bir uygulama: mutfak, egzersiz, finanslarım, hedeflerim, müziğim… ve çok daha fazlası.',
      disena: 'Evi istediğin gibi kurarsın. Hangi odaya ne gireceğine sen karar verirsin.',
      metas: 'Burada haftamı, yapılacaklarımı ve hedeflerimi planlıyorum… ve gerçek hayatta tamamlıyorum.',
      ia: 'İstersen asistanlarınla sohbet edersin: gününe yardım ederler, sana görseller, diyagramlar, ne lazımsa yaparlar.',
      cerebro: 'Yani sadece ekranı kaydırmak yerine… alışkanlıklarının büyümesini izle.',
      idiomas: 'On altı dilde, webde, bilgisayarda ve telefonda. Yapay zekâyla ya da onsuz, seçim senin.',
      cta: 'Adı MindHaOS. Evini kurmayı ücretsiz dene.',
      eslogan: 'Karakterini kur… alışkanlıklarını kurarak.',
      dia1: 'MindHaOS\'ta birinci gün.',
      dia365: 'MindHaOS\'ta 365. gün.'
    },
    cierre: [
      'Alışkanlıklarını kurarak, karakterini kur.',
      'Evini tasarlarken, geleceğini tasarla.',
      'Odaların hedeflerini fethederken, yapılacaklarını bitir.'
    ],
    gratis: 'Ücretsiz dene',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 6.71, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.37 },
      { linea: 'dia365', desde: 5.8, seg: 2.1 },
      { linea: 'eslogan', desde: 8.15, seg: 2.26 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.51 }
    ]
  },
  id: {
    nombre: 'Hari 1 → Hari 365',
    clips: 'es',
    lineas: {
      gancho: 'Gimana kalau tamagotchi-nya… itu kamu sendiri?',
      casa: 'Lihat, ini rumahku, dan tiap ruangan adalah aplikasi: dapur, olahraga, keuanganku, targetku, musikku… dan masih banyak lagi.',
      disena: 'Dan kamu bisa menatanya sesukamu. Kamu yang tentukan isi tiap ruangan.',
      metas: 'Di sini aku atur mingguku, tugas-tugasku, dan targetku… lalu kucapai di kehidupan nyata.',
      ia: 'Kalau mau, kamu bisa ngobrol dengan asistenmu: mereka bantu harimu dan bikinin gambar, diagram, apa pun yang kamu butuhkan.',
      cerebro: 'Jadi daripada cuma scroll… lihat kebiasaanmu tumbuh.',
      idiomas: 'Ada dalam enam belas bahasa, di web, di komputer, dan di HP. Pakai AI atau tidak, kamu yang pilih.',
      cta: 'Namanya MindHaOS. Coba bangun rumahmu gratis.',
      eslogan: 'Bangun karaktermu… dengan membangun kebiasaanmu.',
      dia1: 'Hari pertama di MindHaOS.',
      dia365: 'Hari ke-365 di MindHaOS.'
    },
    cierre: [
      'Bangun karaktermu, dengan membangun kebiasaanmu.',
      'Rancang rumahmu, sambil merancang masa depanmu.',
      'Taklukkan target tiap ruangan, sambil menuntaskan tugasmu.'
    ],
    gratis: 'Coba gratis',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.22, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.46 },
      { linea: 'dia365', desde: 5.8, seg: 2.23 },
      { linea: 'eslogan', desde: 8.28, seg: 2.64 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 11.02 }
    ]
  },
  pl: {
    nombre: 'Dzień 1 → Dzień 365',
    clips: 'es',
    lineas: {
      gancho: 'A gdyby tamagotchi… to byłeś ty?',
      casa: 'Patrz, to mój dom, a każdy pokój to aplikacja: kuchnia, trening, moje finanse, moje cele, moja muzyka… i dużo więcej.',
      disena: 'I urządzasz go, jak chcesz. Ty decydujesz, co trafi do każdego pokoju.',
      metas: 'Tu planuję tydzień, zadania i cele… i realizuję je w prawdziwym życiu.',
      ia: 'A jeśli chcesz, gadasz ze swoimi asystentami: pomagają ci w ciągu dnia i robią obrazy, diagramy, co tylko potrzebujesz.',
      cerebro: 'Więc zamiast tylko scrollować… patrz, jak rosną twoje nawyki.',
      idiomas: 'Szesnaście języków, w przeglądarce, na komputerze i w telefonie. Z AI albo bez, ty wybierasz.',
      cta: 'Nazywa się MindHaOS. Wypróbuj za darmo: zbuduj swój dom.',
      eslogan: 'Buduj swoją postać… budując swoje nawyki.',
      dia1: 'Dzień pierwszy w MindHaOS.',
      dia365: 'Dzień 365 w MindHaOS.'
    },
    cierre: [
      'Buduj postać, budując nawyki.',
      'Projektuj dom, projektując przyszłość.',
      'Zdobywaj cele pokoi, rozprawiając się z zadaniami.'
    ],
    gratis: 'Wypróbuj za darmo',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.46 },
      { linea: 'dia365', desde: 5.8, seg: 2.12 },
      { linea: 'eslogan', desde: 8.17, seg: 2.53 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.8 }
    ]
  },
  nl: {
    nombre: 'Dag 1 → Dag 365',
    clips: 'es',
    lineas: {
      gancho: 'Wat als de tamagotchi… jij zelf was?',
      casa: 'Kijk, dit is mijn huis, en elke kamer is een app: de keuken, sporten, mijn financiën, mijn doelen, mijn muziek… en nog veel meer.',
      disena: 'En je richt het in zoals jij wilt. Jij bepaalt wat er in elke kamer komt.',
      metas: 'Hier plan ik mijn week, mijn taken en mijn doelen… en ik haal ze in het echte leven.',
      ia: 'En als je wilt, klets je met je assistenten: ze helpen je door de dag en maken afbeeldingen, diagrammen, alles wat je nodig hebt.',
      cerebro: 'Dus in plaats van alleen te scrollen… kijk hoe je gewoontes groeien.',
      idiomas: 'Het is er in zestien talen, op het web, op je computer en op je telefoon. Met of zonder AI, jij kiest.',
      cta: 'Het heet MindHaOS. Probeer gratis je huis te bouwen.',
      eslogan: 'Bouw je personage… door je gewoontes te bouwen.',
      dia1: 'Dag één in MindHaOS.',
      dia365: 'Dag 365 in MindHaOS.'
    },
    cierre: [
      'Bouw je personage, door je gewoontes op te bouwen.',
      'Ontwerp je huis, en ontwerp je toekomst.',
      'Verover de doelen van elke kamer, en werk je taken weg.'
    ],
    gratis: 'Gratis proberen',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ar', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 7.01, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.44 },
      { linea: 'dia365', desde: 5.8, seg: 2.4 },
      { linea: 'eslogan', desde: 8.45, seg: 2.26 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 10.81 }
    ]
  },
  ar: {
    nombre: 'اليوم 1 ← اليوم 365',
    clips: 'es',
    lineas: {
      gancho: 'ماذا لو كان التاماغوتشي… هو أنت؟',
      casa: 'انظر، هذا بيتي، وكل غرفة تطبيق: المطبخ، التمارين، المال، الأهداف، الموسيقى… وأكثر.',
      disena: 'وتجهّزه كما تريد. أنت من يقرّر ماذا يوضع في كل غرفة.',
      metas: 'هنا أنظّم أسبوعي ومهامي وأهدافي… وأحقّقها في الحياة الحقيقية.',
      ia: 'وإن أردت، تتحدّث مع مساعديك: يساعدونك في يومك ويصنعون لك صورًا ومخطّطات، وكل ما تحتاجه.',
      cerebro: 'فبدلًا من التمرير فقط… شاهد عاداتك وهي تكبر.',
      idiomas: 'متوفّر بست عشرة لغة، على الويب والكمبيوتر والهاتف. مع الذكاء الاصطناعي أو بدونه، القرار لك.',
      cta: 'اسمه MindHaOS. جرّب بناء بيتك مجانًا.',
      eslogan: 'ابنِ شخصيتك… ببناء عاداتك.',
      dia1: 'اليوم الأول في MindHaOS.',
      dia365: 'اليوم 365 في MindHaOS.'
    },
    cierre: [
      'ابنِ شخصيتك، ببناء عاداتك.',
      'صمّم بيتك، وأنت تصمّم مستقبلك.',
      'افتح أهداف الغرف، وأنت تنجز مهامك.'
    ],
    gratis: 'جرّبه مجانًا',
    tomas: [
      { tipo: 'clip', clip: '00-dia1', seg: 3 },
      { tipo: 'rafaga', idioma: 'ja', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'hi', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ko', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'ru', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'zh', seg: 0.45, sfx: 'click' },
      { tipo: 'rafaga', idioma: 'es', seg: 0.45, sfx: 'click' },
      { tipo: 'clip', clip: '11-dia365', seg: 8.3, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 2.03 },
      { linea: 'dia365', desde: 5.8, seg: 3.17 },
      { linea: 'eslogan', desde: 9.22, seg: 2.78 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.1 }
    ]
  }
}
