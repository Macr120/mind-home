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
    es: { "00-dia1": 3.27, "11-dia365": 11.27 }
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
      gancho: 'What if the Tamagotchi… were you?',
      casa: 'MindHaOS is a 3D house where every room is an app: kitchen, workouts, finances, goals, music…',
      disena: 'Design your house and choose which app goes in each room: your hub for entertainment, study, creativity and self-care.',
      metas: 'Your agenda, your calendar, your journal and a personal assistant to hit your goals in real life.',
      ia: 'Talk to your assistants like you would with ChatGPT, Gemini or Claude: they log your day and create images, resources and 3D models.',
      cerebro: 'Social media fragments your attention and technology thinks for you. MindHaOS is the most complete and fun way to use your brain and watch the habits you choose grow.',
      idiomas: 'In 16 languages. Web, desktop and mobile. With AI credits, with free local models… or with no AI at all.',
      cta: 'Try it for free. Or make it yours with a single payment.',
      eslogan: 'Build your character by building your habits. Design your house, designing your future.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 8.68, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.29 },
      { linea: 'dia365', desde: 5.8, seg: 2.07 },
      { linea: 'eslogan', desde: 8.12, seg: 4.26 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.48 }
    ]
  },
  pt: {
    nombre: 'Dia 1 → Dia 365',
    clips: 'es',
    lineas: {
      gancho: 'E se o Tamagotchi… fosse você?',
      casa: 'O MindHaOS é uma casa 3D em que cada cômodo é um app: cozinha, exercícios, finanças, metas, música…',
      disena: 'Projete sua casa e escolha qual app vai em cada cômodo: seu centro de entretenimento, estudo, criatividade e cuidado.',
      metas: 'Sua agenda, seu calendário, seu diário de bordo e um assistente pessoal para cumprir suas metas na vida real.',
      ia: 'Converse com seus assistentes como faria com o ChatGPT, o Gemini ou o Claude: eles registram seu dia e criam imagens, recursos e modelos 3D.',
      cerebro: 'As redes sociais fragmentam sua atenção e a tecnologia pensa por você. O MindHaOS é a forma mais completa e divertida de usar seu cérebro e ver progredir os hábitos que você escolhe.',
      idiomas: 'Em 16 idiomas. Web, desktop e celular. Com créditos de IA, com modelos locais gratuitos… ou sem IA.',
      cta: 'Experimente grátis. Ou faça dele seu com um pagamento único.',
      eslogan: 'Construa seu personagem construindo seus hábitos. Projete sua casa, projetando seu futuro.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 9.98, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.23 },
      { linea: 'dia365', desde: 5.8, seg: 2.33 },
      { linea: 'eslogan', desde: 8.38, seg: 5.3 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 13.78 }
    ]
  },
  fr: {
    nombre: 'Jour 1 → Jour 365',
    clips: 'es',
    lineas: {
      gancho: 'Et si le Tamagotchi… c\'était toi ?',
      casa: 'MindHaOS est une maison 3D où chaque pièce est une app : cuisine, sport, finances, objectifs, musique…',
      disena: 'Conçois ta maison et choisis quelle app va dans chaque pièce : ton centre de divertissement, d\'étude, de créativité et de bien-être.',
      metas: 'Ton agenda, ton calendrier, ton journal de bord et un assistant personnel pour atteindre tes objectifs dans la vraie vie.',
      ia: 'Discute avec tes assistants comme avec ChatGPT, Gemini ou Claude : ils notent ta journée et créent des images, des ressources et des modèles 3D.',
      cerebro: 'Les réseaux sociaux fragmentent ton attention et la technologie pense à ta place. MindHaOS est la façon la plus complète et la plus amusante d\'utiliser ton cerveau et de voir progresser les habitudes que tu choisis.',
      idiomas: 'En 16 langues. Web, ordinateur et mobile. Avec des crédits d\'IA, avec des modèles locaux gratuits… ou sans IA.',
      cta: 'Essaie-la gratuitement. Ou fais-la tienne en un seul paiement.',
      eslogan: 'Construis ton personnage en construisant tes habitudes. Conçois ta maison en concevant ton avenir.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 8.52, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 0.96 },
      { linea: 'dia365', desde: 5.8, seg: 1.71 },
      { linea: 'eslogan', desde: 7.76, seg: 4.46 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.32 }
    ]
  },
  de: {
    nombre: 'Tag 1 → Tag 365',
    clips: 'es',
    lineas: {
      gancho: 'Und wenn das Tamagotchi… du wärst?',
      casa: 'MindHaOS ist ein 3D-Haus, in dem jeder Raum eine App ist: Küche, Training, Finanzen, Ziele, Musik…',
      disena: 'Gestalte dein Haus und entscheide, welche App in welchen Raum kommt: dein Zentrum für Unterhaltung, Lernen, Kreativität und Selbstfürsorge.',
      metas: 'Dein Terminplaner, dein Kalender, dein Logbuch und ein persönlicher Assistent, damit du deine Ziele im echten Leben erreichst.',
      ia: 'Sprich mit deinen Assistenten wie mit ChatGPT, Gemini oder Claude: Sie halten deinen Tag fest und erstellen Bilder, Ressourcen und 3D-Modelle.',
      cerebro: 'Soziale Netzwerke zersplittern deine Aufmerksamkeit, und die Technik denkt für dich. MindHaOS ist der vollständigste und unterhaltsamste Weg, dein Gehirn zu nutzen und die Gewohnheiten wachsen zu sehen, die du selbst wählst.',
      idiomas: 'In 16 Sprachen. Web, Desktop und Handy. Mit KI-Guthaben, mit kostenlosen lokalen Modellen… oder ganz ohne KI.',
      cta: 'Probier es gratis. Oder mach es mit einer einzigen Zahlung zu deinem.',
      eslogan: 'Baue deine Figur, indem du deine Gewohnheiten aufbaust. Gestalte dein Haus und gestalte deine Zukunft.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 10.33, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.4 },
      { linea: 'dia365', desde: 5.8, seg: 2.48 },
      { linea: 'eslogan', desde: 8.53, seg: 5.5 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 14.13 }
    ]
  },
  it: {
    nombre: 'Giorno 1 → Giorno 365',
    clips: 'es',
    lineas: {
      gancho: 'E se il Tamagotchi… fossi tu?',
      casa: 'MindHaOS è una casa 3D in cui ogni stanza è un\'app: cucina, allenamento, finanze, obiettivi, musica…',
      disena: 'Progetta la tua casa e decidi quale app va in ogni stanza: il tuo centro di intrattenimento, studio, creatività e cura di te.',
      metas: 'La tua agenda, il tuo calendario, il tuo diario di bordo e un assistente personale per raggiungere i tuoi obiettivi nella vita reale.',
      ia: 'Parla con i tuoi assistenti come faresti con ChatGPT, Gemini o Claude: registrano la tua giornata e creano immagini, risorse e modelli 3D.',
      cerebro: 'I social frammentano la tua attenzione e la tecnologia pensa al posto tuo. MindHaOS è il modo più completo e divertente di usare il cervello e vedere crescere le abitudini che scegli tu.',
      idiomas: 'In 16 lingue. Web, desktop e mobile. Con crediti IA, con modelli locali gratuiti… o senza IA.',
      cta: 'Provala gratis. Oppure falla tua con un solo pagamento.',
      eslogan: 'Costruisci il tuo personaggio costruendo le tue abitudini. Progetta la tua casa, progettando il tuo futuro.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 10.99, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.54 },
      { linea: 'dia365', desde: 5.8, seg: 2.58 },
      { linea: 'eslogan', desde: 8.63, seg: 6.06 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 14.79 }
    ]
  },
  ja: {
    nombre: '1日目 → 365日目',
    clips: 'es',
    lineas: {
      gancho: 'もし、たまごっちが…あなた自身だったら？',
      casa: 'MindHaOSは、部屋ひとつひとつがアプリになった3Dの家。キッチン、運動、家計、目標、音楽…',
      disena: '家をデザインして、どの部屋にどのアプリを置くか決めよう。娯楽、勉強、創作、そして心と体のケアの拠点に。',
      metas: '手帳、カレンダー、日誌、そして現実の目標を叶えるためのパーソナルアシスタント。',
      ia: 'ChatGPTやGemini、Claudeと話すように、アシスタントと会話しよう。毎日を記録し、画像や素材、3Dモデルまで作ってくれる。',
      cerebro: 'SNSは集中力を細切れにし、テクノロジーはあなたの代わりに考える。MindHaOSは、脳を使い、自分で選んだ習慣の成長を実感できる、いちばん充実して楽しい方法。',
      idiomas: '16言語対応。Web、デスクトップ、スマホで。AIクレジットでも、無料のローカルモデルでも…AIなしでも。',
      cta: '無料で試そう。気に入ったら、一回払いで自分のものに。',
      eslogan: '習慣を育てて、キャラクターを育てる。家をデザインして、未来をデザインする。',
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
      { tipo: 'clip', clip: '11-dia365', seg: 10, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.88 },
      { linea: 'dia365', desde: 5.8, seg: 2.52 },
      { linea: 'eslogan', desde: 8.57, seg: 5.13 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 13.8 }
    ]
  },
  zh: {
    nombre: '第1天 → 第365天',
    clips: 'es',
    lineas: {
      gancho: '如果那只电子宠物……就是你自己呢？',
      casa: 'MindHaOS 是一座 3D 的家，每个房间都是一个应用：厨房、健身、理财、目标、音乐……',
      disena: '设计你的家，决定每个房间放哪个应用：你的娱乐、学习、创作和身心照护中心。',
      metas: '你的日程、日历、日志，还有一位私人助手，帮你在现实生活中达成目标。',
      ia: '像和 ChatGPT、Gemini 或 Claude 聊天一样和助手交谈：他们记录你的每一天，还能生成图片、素材和 3D 模型。',
      cerebro: '社交媒体切碎了你的注意力，科技替你思考。MindHaOS 是最完整、最有趣的方式，让你用脑，看见自己选择的习惯一点点进步。',
      idiomas: '支持 16 种语言。网页、桌面和手机。可以用 AI 点数，可以用免费的本地模型……也可以完全不用 AI。',
      cta: '免费试用。喜欢的话，一次付费，永久拥有。',
      eslogan: '养成习惯，养成你的角色。设计你的家，设计你的未来。',
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
      { tipo: 'clip', clip: '11-dia365', seg: 8.85, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.45 },
      { linea: 'dia365', desde: 5.8, seg: 2.03 },
      { linea: 'eslogan', desde: 8.08, seg: 4.47 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.65 }
    ]
  },
  ko: {
    nombre: '1일 차 → 365일 차',
    clips: 'es',
    lineas: {
      gancho: '만약 그 다마고치가… 바로 당신이라면?',
      casa: 'MindHaOS는 방 하나하나가 앱인 3D 집이에요. 주방, 운동, 재정, 목표, 음악…',
      disena: '집을 디자인하고 어떤 방에 어떤 앱을 둘지 정하세요. 즐거움, 공부, 창작, 몸과 마음 돌봄의 중심이 됩니다.',
      metas: '일정, 달력, 일지, 그리고 현실의 목표를 이루도록 돕는 개인 비서까지.',
      ia: 'ChatGPT, Gemini, Claude와 이야기하듯 비서와 대화하세요. 하루를 기록하고 이미지, 자료, 3D 모델까지 만들어 줍니다.',
      cerebro: 'SNS는 집중력을 조각내고, 기술은 당신 대신 생각합니다. MindHaOS는 뇌를 쓰고, 스스로 고른 습관이 자라는 걸 지켜보는 가장 완전하고 재미있는 방법이에요.',
      idiomas: '16개 언어. 웹, 데스크톱, 모바일. AI 크레딧으로, 무료 로컬 모델로… 아니면 AI 없이도.',
      cta: '무료로 써 보세요. 마음에 들면 한 번 결제로 내 것으로.',
      eslogan: '습관을 쌓아 캐릭터를 키우고, 집을 디자인하며 미래를 디자인하세요.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 8.43, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.27 },
      { linea: 'dia365', desde: 5.8, seg: 1.71 },
      { linea: 'eslogan', desde: 7.76, seg: 4.37 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.23 }
    ]
  },
  ru: {
    nombre: 'День 1 → День 365',
    clips: 'es',
    lineas: {
      gancho: 'А если бы тамагочи… был ты?',
      casa: 'MindHaOS — это 3D-дом, где каждая комната — приложение: кухня, тренировки, финансы, цели, музыка…',
      disena: 'Спроектируй свой дом и реши, какое приложение будет в каждой комнате: твой центр развлечений, учёбы, творчества и заботы о себе.',
      metas: 'Твой ежедневник, календарь, бортовой журнал и личный ассистент, чтобы достигать целей в реальной жизни.',
      ia: 'Общайся с ассистентами, как с ChatGPT, Gemini или Claude: они записывают твой день и создают изображения, материалы и 3D-модели.',
      cerebro: 'Соцсети дробят твоё внимание, а технологии думают за тебя. MindHaOS — самый полный и увлекательный способ использовать мозг и видеть, как растут привычки, которые выбираешь ты сам.',
      idiomas: 'На 16 языках. Веб, компьютер и телефон. С кредитами ИИ, с бесплатными локальными моделями… или вовсе без ИИ.',
      cta: 'Попробуй бесплатно. Или сделай своим за один платёж.',
      eslogan: 'Строй персонажа, выстраивая привычки. Проектируй дом — проектируй будущее.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 9.6, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.62 },
      { linea: 'dia365', desde: 5.8, seg: 2.52 },
      { linea: 'eslogan', desde: 8.57, seg: 4.73 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 13.4 }
    ]
  },
  hi: {
    nombre: 'दिन 1 → दिन 365',
    clips: 'es',
    lineas: {
      gancho: 'और अगर वो तमागोची… तुम ही होते?',
      casa: 'MindHaOS एक 3D घर है, जहाँ हर कमरा एक ऐप है: रसोई, कसरत, पैसे, लक्ष्य, संगीत…',
      disena: 'अपना घर डिज़ाइन करो और तय करो कि किस कमरे में कौन-सा ऐप रहेगा: मनोरंजन, पढ़ाई, रचनात्मकता और अपनी देखभाल का केंद्र।',
      metas: 'तुम्हारा एजेंडा, कैलेंडर, डायरी और एक निजी सहायक, ताकि असली ज़िंदगी में लक्ष्य पूरे हों।',
      ia: 'अपने सहायकों से वैसे ही बात करो जैसे ChatGPT, Gemini या Claude से: वे तुम्हारा दिन दर्ज करते हैं और तस्वीरें, सामग्री और 3D मॉडल बनाते हैं।',
      cerebro: 'सोशल मीडिया तुम्हारा ध्यान बिखेरता है और तकनीक तुम्हारी जगह सोचती है। MindHaOS दिमाग़ इस्तेमाल करने और अपनी चुनी हुई आदतों को बढ़ते देखने का सबसे संपूर्ण और मज़ेदार तरीका है।',
      idiomas: '16 भाषाओं में। वेब, डेस्कटॉप और मोबाइल पर। AI क्रेडिट के साथ, मुफ़्त लोकल मॉडल के साथ… या बिना AI के।',
      cta: 'मुफ़्त में आज़माओ। या एक ही भुगतान में इसे अपना बना लो।',
      eslogan: 'आदतें बनाते हुए अपना किरदार बनाओ। घर डिज़ाइन करते हुए अपना भविष्य डिज़ाइन करो।',
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
      { tipo: 'clip', clip: '11-dia365', seg: 10.32, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.61 },
      { linea: 'dia365', desde: 5.8, seg: 2.47 },
      { linea: 'eslogan', desde: 8.52, seg: 5.5 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 14.12 }
    ]
  },
  tr: {
    nombre: '1. gün → 365. gün',
    clips: 'es',
    lineas: {
      gancho: 'Ya o Tamagotchi… sen olsaydın?',
      casa: 'MindHaOS, her odası bir uygulama olan 3D bir ev: mutfak, egzersiz, finans, hedefler, müzik…',
      disena: 'Evini tasarla ve her odaya hangi uygulamanın gireceğine karar ver: eğlence, ders, yaratıcılık ve kendine bakım merkezin.',
      metas: 'Ajandan, takvimin, seyir defterin ve gerçek hayattaki hedeflerine ulaşman için kişisel bir asistan.',
      ia: 'Asistanlarınla ChatGPT, Gemini ya da Claude ile konuşur gibi konuş: gününü kaydeder; görseller, kaynaklar ve 3D modeller üretir.',
      cerebro: 'Sosyal medya dikkatini parçalıyor, teknoloji senin yerine düşünüyor. MindHaOS, beynini kullanmanın ve kendi seçtiğin alışkanlıkların büyüdüğünü görmenin en eksiksiz ve en eğlenceli yolu.',
      idiomas: '16 dilde. Web, masaüstü ve mobil. Yapay zekâ kredisiyle, ücretsiz yerel modellerle… ya da hiç yapay zekâ olmadan.',
      cta: 'Ücretsiz dene. Ya da tek ödemeyle senin olsun.',
      eslogan: 'Alışkanlıklarını kurarak karakterini kur. Evini tasarlarken geleceğini tasarla.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 8.86, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.37 },
      { linea: 'dia365', desde: 5.8, seg: 2.1 },
      { linea: 'eslogan', desde: 8.15, seg: 4.41 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.66 }
    ]
  },
  id: {
    nombre: 'Hari 1 → Hari 365',
    clips: 'es',
    lineas: {
      gancho: 'Bagaimana kalau Tamagotchi itu… adalah kamu?',
      casa: 'MindHaOS adalah rumah 3D yang setiap ruangannya adalah aplikasi: dapur, olahraga, keuangan, target, musik…',
      disena: 'Rancang rumahmu dan tentukan aplikasi apa di tiap ruangan: pusat hiburan, belajar, kreativitas, dan perawatan dirimu.',
      metas: 'Agendamu, kalendermu, jurnal harianmu, dan asisten pribadi untuk mencapai targetmu di kehidupan nyata.',
      ia: 'Ngobrol dengan asistenmu seperti dengan ChatGPT, Gemini, atau Claude: mereka mencatat harimu dan membuat gambar, materi, dan model 3D.',
      cerebro: 'Media sosial memecah perhatianmu dan teknologi berpikir untukmu. MindHaOS adalah cara paling lengkap dan seru untuk memakai otakmu dan melihat kebiasaan pilihanmu tumbuh.',
      idiomas: 'Dalam 16 bahasa. Web, desktop, dan ponsel. Dengan kredit AI, dengan model lokal gratis… atau tanpa AI sama sekali.',
      cta: 'Coba gratis. Atau miliki selamanya dengan sekali bayar.',
      eslogan: 'Bangun karaktermu dengan membangun kebiasaanmu. Rancang rumahmu, rancang masa depanmu.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 9.25, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.46 },
      { linea: 'dia365', desde: 5.8, seg: 2.23 },
      { linea: 'eslogan', desde: 8.28, seg: 4.67 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 13.05 }
    ]
  },
  pl: {
    nombre: 'Dzień 1 → Dzień 365',
    clips: 'es',
    lineas: {
      gancho: 'A gdyby tamagotchi… było tobą?',
      casa: 'MindHaOS to dom 3D, w którym każdy pokój jest aplikacją: kuchnia, trening, finanse, cele, muzyka…',
      disena: 'Zaprojektuj swój dom i zdecyduj, która aplikacja trafi do którego pokoju: twoje centrum rozrywki, nauki, kreatywności i dbania o siebie.',
      metas: 'Twój terminarz, kalendarz, dziennik pokładowy i osobisty asystent, żebyś realizował swoje cele w prawdziwym życiu.',
      ia: 'Rozmawiaj z asystentami jak z ChatGPT, Gemini czy Claude: zapisują twój dzień i tworzą obrazy, materiały i modele 3D.',
      cerebro: 'Media społecznościowe rozpraszają twoją uwagę, a technologia myśli za ciebie. MindHaOS to najpełniejszy i najfajniejszy sposób, żeby używać mózgu i widzieć, jak rosną nawyki, które sam wybierasz.',
      idiomas: 'W 16 językach. Web, komputer i telefon. Z kredytami AI, z darmowymi modelami lokalnymi… albo zupełnie bez AI.',
      cta: 'Wypróbuj za darmo. Albo zdobądź na własność za jedną opłatą.',
      eslogan: 'Buduj postać, budując nawyki. Projektuj dom, projektując swoją przyszłość.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 9.12, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.46 },
      { linea: 'dia365', desde: 5.8, seg: 2.12 },
      { linea: 'eslogan', desde: 8.17, seg: 4.65 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 12.92 }
    ]
  },
  nl: {
    nombre: 'Dag 1 → Dag 365',
    clips: 'es',
    lineas: {
      gancho: 'En als de Tamagotchi… jij was?',
      casa: 'MindHaOS is een 3D-huis waarin elke kamer een app is: keuken, sport, financiën, doelen, muziek…',
      disena: 'Ontwerp je huis en kies welke app in welke kamer komt: jouw plek voor ontspanning, studie, creativiteit en zelfzorg.',
      metas: 'Je agenda, je kalender, je logboek en een persoonlijke assistent om je doelen in het echte leven te halen.',
      ia: 'Praat met je assistenten zoals met ChatGPT, Gemini of Claude: ze leggen je dag vast en maken afbeeldingen, materiaal en 3D-modellen.',
      cerebro: 'Sociale media versnipperen je aandacht en technologie denkt voor je. MindHaOS is de meest complete en leukste manier om je brein te gebruiken en de gewoontes die jij kiest te zien groeien.',
      idiomas: 'In 16 talen. Web, desktop en mobiel. Met AI-credits, met gratis lokale modellen… of helemaal zonder AI.',
      cta: 'Probeer het gratis. Of maak het van jou met één betaling.',
      eslogan: 'Bouw je personage door je gewoontes op te bouwen. Ontwerp je huis, en ontwerp je toekomst.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 9.9, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 1.44 },
      { linea: 'dia365', desde: 5.8, seg: 2.4 },
      { linea: 'eslogan', desde: 8.45, seg: 5.15 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 13.7 }
    ]
  },
  ar: {
    nombre: 'اليوم 1 ← اليوم 365',
    clips: 'es',
    lineas: {
      gancho: 'ماذا لو كان التاماغوتشي… هو أنت؟',
      casa: 'MindHaOS بيت ثلاثي الأبعاد كل غرفة فيه تطبيق: المطبخ، التمارين، المال، الأهداف، الموسيقى…',
      disena: 'صمّم بيتك وقرّر أي تطبيق يذهب إلى كل غرفة: مركزك للترفيه والدراسة والإبداع والعناية بنفسك.',
      metas: 'مفكرتك وتقويمك ويومياتك ومساعد شخصي يعينك على تحقيق أهدافك في الحياة الحقيقية.',
      ia: 'تحدّث مع مساعديك كما تفعل مع ChatGPT أو Gemini أو Claude: يسجّلون يومك ويصنعون الصور والموارد والنماذج ثلاثية الأبعاد.',
      cerebro: 'تشتّت الشبكات الاجتماعية انتباهك، والتقنية تفكّر بدلًا عنك. MindHaOS هو الطريقة الأكمل والأمتع لاستخدام عقلك ورؤية العادات التي تختارها وهي تنمو.',
      idiomas: 'بـ16 لغة. ويب وحاسوب وهاتف. برصيد ذكاء اصطناعي، أو بنماذج محلية مجانية… أو من دونه.',
      cta: 'جرّبه مجانًا. أو اجعله ملكك بدفعة واحدة.',
      eslogan: 'ابنِ شخصيتك ببناء عاداتك. صمّم بيتك، وأنت تصمّم مستقبلك.',
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
      { tipo: 'clip', clip: '11-dia365', seg: 10.83, sfx: 'wow' }
    ],
    voces: [
      { linea: 'dia1', desde: 0.1, seg: 2.03 },
      { linea: 'dia365', desde: 5.8, seg: 3.17 },
      { linea: 'eslogan', desde: 9.22, seg: 5.31 }
    ],
    efectos: [
      { clave: 'jeje-boy', desde: 14.63 }
    ]
  }
}
