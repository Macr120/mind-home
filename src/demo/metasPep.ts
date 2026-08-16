/**
 * Las metas de Pep@, una carpeta por app de la casa.
 *
 * Están todas juntas y no repartidas por los `demo.ts` de cada cuarto porque lo
 * que hay que poder revisar de un vistazo es LA COHERENCIA: que la meta de la
 * cocina apunte al maratón que entrena el cuarto de ejercicio, que el fondo de
 * imprevistos del despacho hable de la misma avería que arregla el garaje, y que
 * dos metas no venzan el mismo día en el calendario. Repartidas por quince
 * archivos, esa lectura no existe (es lo mismo que ya justifica `hitosPep.ts`).
 *
 * Sembrar sí sigue siendo cosa de cada builder: llaman a `sembrarMetasApp` con
 * su clave, así que la carga perezosa por app se mantiene y una app construida
 * sola trae sus metas y ninguna otra.
 *
 * Lo que el conjunto tiene que enseñar —son los flujos que el visitante viene a
 * ver— es una de cada:
 *   · metas cumplidas, vivas y sin fecha (esas viven solo en la lista);
 *   · metas con pasos, con sub-metas y con plan;
 *   · planes PROPUESTOS (esperando en la pestaña Planes) y ya ACEPTADOS (con sus
 *     fases convertidas en sub-metas del cronograma);
 *   · metas de un sub-ámbito (un hobby, un idioma, el ahorro del despacho).
 */
import type { NivelPartida, PasoRutina } from '../core/data/db'
import { planesMetaRepo, rutinasRepo } from '../core/data/repository'
import { esMeta } from '../core/metas'
import { aceptarPlan } from '../core/planMeta'
import { colorPorProfundidad } from '../core/ui/coloresRutina'
import type { CtxDemo } from './builders'
import { PLANES_DEMO, sembrarPlanDemo, type ClavePlan } from './planesPep'
import { enIdioma, type PorIdioma } from '../core/i18n/porIdioma'

/** Un texto de la casa demo: se escribe en los dos idiomas o no se escribe. */
/** Un texto del catálogo: español obligatorio, el resto según se vaya traduciendo. */
type Texto = PorIdioma<string>

/** El plan que cuelga de una meta, con el estado en que lo encuentra el visitante. */
interface PlanDeMeta {
  clave: ClavePlan
  /** Día 0 del plan en el calendario (offset respecto a hoy). */
  inicio: number
  /** Se pidió con fecha límite: la de su meta. Sin esto, «sin plazo». */
  conPlazo?: boolean
  horasSemana: number
  /** Días de la semana que Pep@ dijo poder dedicarle (0=domingo … 6=sábado). */
  dias: number[]
  nivel: NivelPartida
  /** Ya está en el cronograma: sus nodos son sub-metas reales con su periodo. */
  aceptado?: boolean
  /** Nodos cumplidos (ids de `NodoPlan`: pre-orden, la fase antes que sus hijos). */
  hechos?: number[]
}

interface MetaDemo {
  nombre: Texto
  /**
   * Día objetivo. SIN VALOR = la meta vive solo en la lista y no ocupa sitio en
   * el calendario; hay una así a propósito en varias apps.
   */
  dia?: number
  completada?: boolean
  /** Cuándo se escribió; por defecto, dos meses antes de su fecha objetivo. */
  nace?: number
  nota?: Texto
  pasos?: Texto[]
  /** Índices de `pasos` ya palomeados. */
  pasosHechos?: number[]
  /** Clave del sub-ámbito; la resuelve quien siembra (`hobby:3`, `ahorro`…). */
  ambito?: string
  hijas?: MetaDemo[]
  plan?: PlanDeMeta
}

interface CarpetaMetas {
  /** El de la plantilla: es el punto de color que el panel pinta en cada fila. */
  color: string
  metas: MetaDemo[]
}

/**
 * El año de Pep@ contado en metas. Las fechas objetivo van repartidas a
 * propósito (ninguna cae el mismo día que otra): amontonadas, la vista de mes
 * del calendario se leería como un solo bloque.
 */
export const METAS_PEP: Record<string, CarpetaMetas> = {
  // ── Cocina · Nutrición ────────────────────────────────────────────────────
  cocina: {
    color: '#f59e0b',
    metas: [
      {
        nombre: {
          es: 'Comer para el siguiente maratón',
          en: 'Eat for the next marathon',
          pt: 'Comer para a próxima maratona',
          fr: 'Manger pour le prochain marathon',
          de: 'Essen für den nächsten Marathon',
          it: 'Mangiare per la prossima maratona',
          ja: '次のマラソンに向けた食事',
          zh: '为下一场马拉松吃好',
          ko: '다음 마라톤을 위한 식단',
          ru: 'Питание для следующего марафона',
          hi: 'अगली मैराथन के लिए सही खाना',
          tr: 'Sonraki maraton için beslenmek',
          id: 'Makan untuk maraton berikutnya',
          pl: 'Odżywiać się przed kolejnym maratonem',
          nl: 'Eten voor de volgende marathon',
          ar: 'الأكل استعدادًا للماراثون القادم',
        },
        dia: 150,
        nace: -16,
        plan: {
          clave: 'nutricion',
          inicio: -14,
          conPlazo: true,
          horasSemana: 3,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'medio',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: {
          es: 'Llegar a 67 kg sin dejar de comer',
          en: 'Get to 67 kg without giving up food',
          pt: 'Chegar aos 67 kg sem deixar de comer',
          fr: 'Atteindre 67 kg sans arrêter de manger',
          de: '67 kg erreichen, ohne aufs Essen zu verzichten',
          it: 'Arrivare a 67 kg senza smettere di mangiare',
          ja: '食べるのをやめずに67kgになる',
          zh: '不用节食,也能瘦到67公斤',
          ko: '안 굶고 67kg 되기',
          ru: 'Дойти до 67 кг, не переставая есть',
          hi: 'खाना बंद किए बिना 67 किलो तक पहुँचना',
          tr: 'Yemekten vazgeçmeden 67 kiloya ulaşmak',
          id: 'Mencapai 67 kg tanpa berhenti makan',
          pl: 'Dojść do 67 kg, nie przestając jeść',
          nl: '67 kg bereiken zonder te stoppen met eten',
          ar: 'الوصول إلى 67 كغ دون التوقف عن الأكل',
        },
        dia: -20,
        nace: -304,
        completada: true,
        nota: {
          es: 'Siete kilos en nueve meses. Ni una semana de hambre.',
          en: 'Seven kilos in nine months. Not one week of going hungry.',
          pt: 'Sete quilos em nove meses. Nem uma semana de fome.',
          fr: 'Sept kilos en neuf mois. Pas une seule semaine de faim.',
          de: 'Sieben Kilo in neun Monaten. Keine einzige Woche Hunger.',
          it: 'Sette chili in nove mesi. Nemmeno una settimana di fame.',
          ja: '9か月で7キロ落としました。空腹の週は一度もありませんでした。',
          zh: '九个月瘦了七公斤，一周都没挨过饿。',
          ko: '아홉 달 만에 7kg. 배고픈 한 주도 없었어요.',
          ru: 'Семь килограммов за девять месяцев. Ни одной голодной недели.',
          hi: 'नौ महीनों में सात किलो। भूखा एक भी हफ़्ता नहीं गया।',
          tr: 'Dokuz ayda yedi kilo. Tek bir aç hafta bile yok.',
          id: 'Tujuh kilo dalam sembilan bulan. Tanpa satu minggu pun kelaparan.',
          pl: 'Siedem kilo w dziewięć miesięcy. Ani jednego głodnego tygodnia.',
          nl: 'Zeven kilo in negen maanden. Geen enkele week honger geleden.',
          ar: 'سبعة كيلوغرامات في تسعة أشهر، دون أسبوع واحد من الجوع.',
        },
      },
      {
        // Sin fecha: es la meta que enseña que una meta puede vivir en la lista
        // y no pedirle nada al calendario.
        nombre: {
          es: 'Cocinar doce recetas nuevas del recetario',
          en: 'Cook twelve new recipes from the book',
          pt: 'Cozinhar doze receitas novas do livro de receitas',
          fr: 'Cuisiner douze nouvelles recettes du livre',
          de: 'Zwölf neue Rezepte aus dem Kochbuch kochen',
          it: 'Cucinare dodici nuove ricette dal ricettario',
          ja: 'レシピ帳から新しいレシピを12品作る',
          zh: '做十二道菜谱里的新菜',
          ko: '레시피북에서 새 레시피 12가지 만들기',
          ru: 'Приготовить двенадцать новых рецептов из книги',
          hi: 'रेसिपी बुक से बारह नई रेसिपी बनाना',
          tr: 'Yemek kitabından on iki yeni tarif pişirmek',
          id: 'Memasak dua belas resep baru dari buku resep',
          pl: 'Ugotować dwanaście nowych przepisów z książki kucharskiej',
          nl: 'Twaalf nieuwe recepten uit het receptenboek koken',
          ar: 'طهي اثنتي عشرة وصفة جديدة من كتاب الوصفات',
        },
        nace: -60,
        pasos: [
          {
            es: 'Elegir tres recetas al empezar el mes',
            en: 'Pick three recipes at the start of the month',
            pt: 'Escolher três receitas no começo do mês',
            fr: 'Choisir trois recettes en début de mois',
            de: 'Zu Monatsbeginn drei Rezepte auswählen',
            it: 'Scegliere tre ricette a inizio mese',
            ja: '月の初めに3つのレシピを選ぶ',
            zh: '每月初选三道菜谱',
            ko: '매달 초에 레시피 세 가지 고르기',
            ru: 'Выбирать три рецепта в начале месяца',
            hi: 'महीने की शुरुआत में तीन रेसिपी चुनना',
            tr: 'Ayın başında üç tarif seçmek',
            id: 'Memilih tiga resep di awal bulan',
            pl: 'Wybrać trzy przepisy na początku miesiąca',
            nl: 'Aan het begin van de maand drie recepten kiezen',
            ar: 'اختيار ثلاث وصفات في بداية الشهر',
          },
          {
            es: 'Cocinar una entre semana, no solo en domingo',
            en: 'Cook one on a weekday, not just on Sunday',
            pt: 'Cozinhar uma durante a semana, não só no domingo',
            fr: 'En cuisiner une en semaine, pas seulement le dimanche',
            de: 'Eines unter der Woche kochen, nicht nur sonntags',
            it: 'Cucinarne una durante la settimana, non solo la domenica',
            ja: '日曜日だけでなく、平日にも1品作る',
            zh: '平时也做一道菜，不只是周日',
            ko: '일요일만 말고 평일에도 하나 만들기',
            ru: 'Готовить один рецепт в будни, а не только по воскресеньям',
            hi: 'सिर्फ़ रविवार को नहीं, हफ़्ते के बीच में भी एक बनाना',
            tr: 'Sadece pazar değil, hafta içi de bir tane pişirmek',
            id: 'Memasak satu di hari kerja, bukan cuma hari Minggu',
            pl: 'Ugotować jeden w tygodniu, nie tylko w niedzielę',
            nl: 'Er één doordeweeks koken, niet alleen op zondag',
            ar: 'طهي واحدة خلال الأسبوع، لا يوم الأحد فقط',
          },
          {
            es: 'Apuntar en la ficha qué cambiaría',
            en: 'Note on the card what I would change',
            pt: 'Anotar na ficha o que mudaria',
            fr: 'Noter sur la fiche ce que je changerais',
            de: 'Auf der Karte notieren, was ich ändern würde',
            it: 'Annotare sulla scheda cosa cambierei',
            ja: '何を変えたいか、カードに書き留める',
            zh: '在卡片上记下想改的地方',
            ko: '뭘 바꾸고 싶은지 카드에 적어두기',
            ru: 'Записывать на карточке, что стоило бы изменить',
            hi: 'कार्ड पर यह लिखना कि क्या बदलना चाहिए',
            tr: 'Kartına neyi değiştireceğini not almak',
            id: 'Mencatat di kartu apa yang akan diubah',
            pl: 'Zapisać na karcie, co warto zmienić',
            nl: 'Op de kaart noteren wat ik zou veranderen',
            ar: 'تدوين ما يمكن تغييره في البطاقة',
          },
          {
            es: 'Repetir las tres que salieron mejor',
            en: 'Repeat the three that came out best',
            pt: 'Repetir as três que ficaram melhores',
            fr: 'Refaire les trois qui ont le mieux marché',
            de: 'Die drei besten wiederholen',
            it: 'Rifare le tre riuscite meglio',
            ja: '一番おいしくできた3品を作り直す',
            zh: '重做做得最好的三道',
            ko: '제일 잘 나온 세 가지 다시 만들기',
            ru: 'Повторить три рецепта, которые получились лучше всего',
            hi: 'सबसे अच्छी निकलीं तीन रेसिपी दोहराना',
            tr: 'En iyi çıkan üç tarifi tekrarlamak',
            id: 'Mengulang tiga yang hasilnya paling enak',
            pl: 'Powtórzyć trzy, które wyszły najlepiej',
            nl: 'De drie die het beste lukten herhalen',
            ar: 'إعادة تحضير الثلاث الأنجح',
          },
        ],
        pasosHechos: [0, 1],
      },
    ],
  },

  // ── Recámara · Descanso ───────────────────────────────────────────────────
  descanso: {
    color: '#22d3ee',
    metas: [
      {
        nombre: {
          es: 'Dormirme en menos de 15 minutos',
          en: 'Fall asleep in under 15 minutes',
          pt: 'Adormecer em menos de 15 minutos',
          fr: "M'endormir en moins de 15 minutes",
          de: 'In weniger als 15 Minuten einschlafen',
          it: 'Addormentarmi in meno di 15 minuti',
          ja: '15分以内に眠りにつく',
          zh: '15分钟内入睡',
          ko: '15분 안에 잠들기',
          ru: 'Засыпать меньше чем за 15 минут',
          hi: '15 मिनट से कम में सो जाना',
          tr: '15 dakikadan kısa sürede uykuya dalmak',
          id: 'Tertidur dalam waktu kurang dari 15 menit',
          pl: 'Zasypiać w mniej niż 15 minut',
          nl: 'Binnen 15 minuten in slaap vallen',
          ar: 'النوم في أقل من 15 دقيقة',
        },
        dia: 35,
        nace: -9,
        plan: {
          clave: 'sueno',
          inicio: -7,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'algo',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: {
          es: 'Un mes entero durmiendo 7:30 de media',
          en: 'A whole month averaging 7:30 of sleep',
          pt: 'Um mês inteiro dormindo em média 7h30',
          fr: 'Un mois entier à dormir 7h30 en moyenne',
          de: 'Ein ganzer Monat mit durchschnittlich 7:30 Stunden Schlaf',
          it: 'Un mese intero dormendo in media 7:30',
          ja: '平均7時間30分の睡眠を1か月続ける',
          zh: '连续一个月平均睡7小时30分钟',
          ko: '한 달 내내 평균 7시간 30분 자기',
          ru: 'Целый месяц спать в среднем 7:30',
          hi: 'पूरे एक महीने औसतन 7:30 घंटे सोना',
          tr: 'Tam bir ay boyunca ortalama 7.30 saat uyumak',
          id: 'Sebulan penuh tidur rata-rata 7:30 jam',
          pl: 'Cały miesiąc spania średnio 7:30',
          nl: 'Een hele maand gemiddeld 7:30 uur slapen',
          ar: 'شهر كامل بمعدل نوم 7:30 ساعات',
        },
        dia: -35,
        nace: -120,
        completada: true,
      },
    ],
  },

  // ── Anecdotario ───────────────────────────────────────────────────────────
  anecdotario: {
    color: '#a78bfa',
    metas: [
      {
        nombre: {
          es: 'Cerrar el año con doce recuerdos escritos',
          en: 'Close the year with twelve memories written',
          pt: 'Fechar o ano com doze memórias escritas',
          fr: "Terminer l'année avec douze souvenirs écrits",
          de: 'Das Jahr mit zwölf geschriebenen Erinnerungen abschließen',
          it: "Chiudere l'anno con dodici ricordi scritti",
          ja: '12個の思い出を書いて1年を締めくくる',
          zh: '写下十二篇回忆，给这一年画上句号',
          ko: '추억 열두 개를 적으며 한 해 마무리하기',
          ru: 'Закончить год двенадцатью записанными воспоминаниями',
          hi: 'बारह यादें लिखकर साल का समापन करना',
          tr: 'Yılı on iki yazılı anıyla kapatmak',
          id: 'Menutup tahun dengan dua belas kenangan tertulis',
          pl: 'Zamknąć rok dwunastoma spisanymi wspomnieniami',
          nl: 'Het jaar afsluiten met twaalf opgeschreven herinneringen',
          ar: 'إنهاء السنة باثنتي عشرة ذكرى مكتوبة',
        },
        dia: 58,
        nace: -8,
        plan: {
          clave: 'memorias',
          inicio: -5,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 6],
          nivel: 'algo',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: {
          es: 'Escribir tres veces por semana',
          en: 'Write three times a week',
          pt: 'Escrever três vezes por semana',
          fr: 'Écrire trois fois par semaine',
          de: 'Dreimal pro Woche schreiben',
          it: 'Scrivere tre volte a settimana',
          ja: '週に3回書く',
          zh: '每周写三次',
          ko: '일주일에 세 번 쓰기',
          ru: 'Писать три раза в неделю',
          hi: 'हफ़्ते में तीन बार लिखना',
          tr: 'Haftada üç kez yazmak',
          id: 'Menulis tiga kali seminggu',
          pl: 'Pisać trzy razy w tygodniu',
          nl: 'Drie keer per week schrijven',
          ar: 'الكتابة ثلاث مرات في الأسبوع',
        },
        dia: -66,
        nace: -240,
        completada: true,
        nota: {
          es: 'Lo que costó no fue escribir: fue no borrarlo al día siguiente.',
          en: 'The hard part was not writing: it was not deleting it the next day.',
          pt: 'O difícil não foi escrever: foi não apagar no dia seguinte.',
          fr: "Le plus dur n'était pas d'écrire : c'était de ne pas l'effacer le lendemain.",
          de: 'Das Schwierige war nicht das Schreiben, sondern es am nächsten Tag nicht zu löschen.',
          it: 'La parte difficile non era scrivere: era non cancellarlo il giorno dopo.',
          ja: '大変だったのは書くことではなく、翌日に消さずにおくことでした。',
          zh: '难的不是写，而是第二天不把它删掉。',
          ko: '힘들었던 건 쓰는 게 아니라, 다음 날 지우지 않는 거였어요.',
          ru: 'Трудным было не само письмо, а то, чтобы не удалить его на следующий день.',
          hi: 'लिखना मुश्किल नहीं था, मुश्किल था अगले दिन उसे न मिटाना।',
          tr: 'Zor olan yazmak değildi: ertesi gün silmemekti.',
          id: 'Yang susah bukan menulisnya, tapi tidak menghapusnya keesokan harinya.',
          pl: 'Trudne nie było pisanie, tylko to, żeby nie skasować tego następnego dnia.',
          nl: 'Het moeilijke was niet het schrijven: het was het de volgende dag niet wissen.',
          ar: 'الصعب لم يكن الكتابة، بل عدم حذفها في اليوم التالي.',
        },
      },
    ],
  },

  // ── Jardín · Calma ────────────────────────────────────────────────────────
  // Aquí no hay rachas ni puntos a propósito (es el cuarto que no empuja), así
  // que su plan se queda PROPUESTO: está ahí por si lo quiere, no esperándolo.
  jardin: {
    color: '#4ade80',
    metas: [
      {
        nombre: {
          es: 'Diez minutos de calma todos los días',
          en: 'Ten minutes of calm every day',
          pt: 'Dez minutos de calma todos os dias',
          fr: 'Dix minutes de calme chaque jour',
          de: 'Jeden Tag zehn Minuten Ruhe',
          it: 'Dieci minuti di calma ogni giorno',
          ja: '毎日10分の静けさ',
          zh: '每天十分钟的平静',
          ko: '매일 10분의 고요함',
          ru: 'Десять минут покоя каждый день',
          hi: 'हर दिन दस मिनट की शांति',
          tr: 'Her gün on dakika sükunet',
          id: 'Sepuluh menit ketenangan setiap hari',
          pl: 'Dziesięć minut spokoju każdego dnia',
          nl: 'Elke dag tien minuten rust',
          ar: 'عشر دقائق من الهدوء كل يوم',
        },
        dia: 30,
        nace: -2,
        plan: {
          clave: 'calma',
          inicio: 2,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'algo',
        },
      },
      {
        nombre: {
          es: 'Volver a sentarme después del viaje',
          en: 'Sit back down after the trip',
          pt: 'Voltar a sentar depois da viagem',
          fr: 'Se remettre à méditer après le voyage',
          de: 'Nach der Reise wieder hinsetzen',
          it: 'Tornare a sedermi dopo il viaggio',
          ja: '旅から戻って、また座る',
          zh: '旅行回来后，重新坐下来',
          ko: '여행 다녀와서 다시 앉기',
          ru: 'Снова сесть на подушку после поездки',
          hi: 'यात्रा के बाद फिर से बैठना',
          tr: 'Yolculuktan sonra yeniden oturmaya başlamak',
          id: 'Kembali duduk setelah perjalanan',
          pl: 'Znów usiąść po podróży',
          nl: 'Na de reis weer gaan zitten',
          ar: 'العودة إلى الجلوس بعد الرحلة',
        },
        dia: -95,
        nace: -110,
        completada: true,
        nota: {
          es: 'Tres semanas fuera y el cojín seguía donde lo dejé.',
          en: 'Three weeks away and the cushion was still where I left it.',
          pt: 'Três semanas fora e a almofada continuava onde eu a deixei.',
          fr: "Trois semaines d'absence et le coussin était resté à sa place.",
          de: 'Drei Wochen weg, und das Kissen lag noch genau da, wo ich es gelassen hatte.',
          it: "Tre settimane fuori e il cuscino era ancora dove l'avevo lasciato.",
          ja: '3週間家を空けていましたが、クッションは置いた場所のままでした。',
          zh: '出门三周，坐垫还留在我放下它的地方。',
          ko: '3주나 집을 비웠는데 방석은 놓아둔 자리 그대로였어요.',
          ru: 'Три недели вне дома — а подушка так и осталась там, где её оставили.',
          hi: 'तीन हफ़्तों की यात्रा, और तकिया वहीं था जहाँ छोड़ा था।',
          tr: 'Üç hafta uzaktaydım ve minder tam bıraktığım yerdeydi.',
          id: 'Tiga minggu pergi, dan bantalnya masih di tempat aku meninggalkannya.',
          pl: 'Trzy tygodnie nieobecności, a poduszka wciąż leżała tam, gdzie została zostawiona.',
          nl: 'Drie weken weg en het kussen lag nog precies waar ik het had achtergelaten.',
          ar: 'ثلاثة أسابيع بعيدًا، والوسادة ما زالت في مكانها حيث تركتها.',
        },
      },
    ],
  },

  // ── Hobbies (ámbitos: el hobby 'piano' y sus proyectos 'clair' y 'lunas') ─
  hobbies: {
    color: '#8b5cf6',
    metas: [
      {
        nombre: {
          es: 'Tocar el Nocturno op. 9 n.º 2',
          en: 'Play the Nocturne op. 9 no. 2',
          pt: 'Tocar o Noturno op. 9 n.º 2',
          fr: 'Jouer le Nocturne op. 9 n° 2',
          de: 'Das Nocturne op. 9 Nr. 2 spielen',
          it: 'Suonare il Notturno op. 9 n. 2',
          ja: 'ノクターン作品9-2を弾く',
          zh: '弹奏夜曲作品9号之2',
          ko: '녹턴 작품 9-2 연주하기',
          ru: 'Сыграть Ноктюрн ор. 9 № 2',
          hi: 'नॉक्टर्न ऑप. 9 नं. 2 बजाना',
          tr: "Nocturne op. 9 no. 2'yi çalmak",
          id: 'Memainkan Nocturne op. 9 no. 2',
          pl: 'Zagrać Nokturn op. 9 nr 2',
          nl: 'Het Nocturne op. 9 nr. 2 spelen',
          ar: 'عزف نوكتورن أوب. 9 رقم 2',
        },
        dia: 120,
        nace: -3,
        ambito: 'piano',
        plan: {
          clave: 'nocturno',
          inicio: 2,
          conPlazo: true,
          horasSemana: 4,
          dias: [1, 3, 5, 6],
          nivel: 'medio',
        },
      },
      {
        nombre: {
          es: 'Tocarla de memoria, sin partitura',
          en: 'Play it from memory, no score',
          pt: 'Tocá-lo de memória, sem partitura',
          fr: 'Le jouer de mémoire, sans partition',
          de: 'Es auswendig spielen, ohne Noten',
          it: 'Suonarlo a memoria, senza spartito',
          ja: '楽譜なしで、暗譜で弾く',
          zh: '不看谱，凭记忆弹奏',
          ko: '악보 없이 외워서 연주하기',
          ru: 'Играть её по памяти, без нот',
          hi: 'बिना सरगम के, याद से बजाना',
          tr: 'Onu ezbere, nota kağıdı olmadan çalmak',
          id: 'Memainkannya di luar kepala, tanpa partitur',
          pl: 'Zagrać go z pamięci, bez nut',
          nl: 'Het uit het hoofd spelen, zonder bladmuziek',
          ar: 'عزفها عن ظهر قلب، دون نوتة',
        },
        dia: -8,
        nace: -200,
        completada: true,
        ambito: 'clair',
      },
      {
        nombre: {
          es: 'Cazar las cuatro lunas que faltan',
          en: 'Catch the four moons still missing',
          pt: 'Capturar as quatro luas que faltam',
          fr: 'Chasser les quatre lunes qui manquent',
          de: 'Die vier fehlenden Monde jagen',
          it: 'Cacciare le quattro lune mancanti',
          ja: '残り4つの月を撮る',
          zh: '拍下剩下的四个月相',
          ko: '남은 달 네 개 찍기',
          ru: 'Поймать в кадр четыре недостающие луны',
          hi: 'बची हुई चार चाँद की तस्वीरें लेना',
          tr: 'Eksik kalan dört ayı kareye almak',
          id: 'Memburu empat bulan yang masih kurang',
          pl: 'Upolować cztery brakujące księżyce',
          nl: 'De vier ontbrekende manen vastleggen',
          ar: 'اصطياد الأقمار الأربعة المتبقية',
        },
        dia: 64,
        nace: -296,
        ambito: 'lunas',
        nota: {
          es: 'Van ocho de doce. Faltan las tres del invierno y la de agosto, que se nubló.',
          en: 'Eight of twelve. Missing the three winter ones and August, which clouded over.',
          pt: 'Já são oito de doze. Faltam as três do inverno e a de agosto, que ficou nublada.',
          fr: "Huit sur douze. Il manque les trois de l'hiver et celle d'août, restée nuageuse.",
          de: 'Acht von zwölf. Es fehlen die drei vom Winter und die vom August, die bewölkt war.',
          it: "Otto su dodici. Mancano le tre dell'inverno e quella di agosto, coperta dalle nuvole.",
          ja: '12個中8個。残っているのは冬の3つと、曇ってしまった8月の分です。',
          zh: '十二个里拍了八个，还差冬天那三个和多云错过的八月那次。',
          ko: '열두 개 중 여덟 개. 겨울 세 개와 구름 낀 8월 것이 남았어요.',
          ru: 'Восемь из двенадцати. Осталось три зимние и августовская, которую закрыло облаками.',
          hi: 'बारह में से आठ हो गए। बाकी हैं सर्दी के तीन और अगस्त वाला, जो बादलों में छिप गया।',
          tr: 'On ikiden sekizi tamam. Kışın üçü ve bulutlanan ağustos kalanı eksik.',
          id: 'Delapan dari dua belas sudah. Tinggal tiga musim dingin dan yang Agustus, yang tertutup awan.',
          pl: 'Osiem z dwunastu gotowe. Brakuje trzech zimowych i tego z sierpnia, który zasnuły chmury.',
          nl: 'Acht van de twaalf klaar. Nog de drie van de winter en die van augustus, die bewolkt was.',
          ar: 'ثمانية من اثني عشر. تبقّت الثلاثة الشتوية وقمر أغسطس الذي حجبته الغيوم.',
        },
      },
    ],
  },

  // ── Ideas ─────────────────────────────────────────────────────────────────
  ideas: {
    color: '#facc15',
    metas: [
      {
        nombre: {
          es: 'Convertir la idea del mapa en algo real',
          en: 'Turn the idea from the map into something real',
          pt: 'Transformar a ideia do mapa em algo real',
          fr: "Transformer l'idée de la carte en quelque chose de réel",
          de: 'Die Idee aus der Mindmap in etwas Reales verwandeln',
          it: "Trasformare l'idea della mappa in qualcosa di reale",
          ja: 'マップのアイデアを現実にする',
          zh: '把图谱里的想法变成现实',
          ko: '맵 속 아이디어를 현실로 만들기',
          ru: 'Превратить идею с карты во что-то реальное',
          hi: 'मैप वाले आइडिया को असली बनाना',
          tr: 'Haritadaki fikri gerçeğe dönüştürmek',
          id: 'Mengubah ide dari peta menjadi sesuatu yang nyata',
          pl: 'Zamienić pomysł z mapy w coś realnego',
          nl: 'Het idee van de kaart iets echts maken',
          ar: 'تحويل فكرة الخريطة إلى شيء حقيقي',
        },
        dia: 75,
        nace: -4,
        plan: {
          clave: 'prototipo',
          inicio: 2,
          conPlazo: true,
          horasSemana: 4,
          dias: [0, 6],
          nivel: 'algo',
          aceptado: true,
        },
      },
      {
        nombre: {
          es: 'Elegir a qué dedicar el verano',
          en: 'Decide what to spend the summer on',
          pt: 'Decidir a que dedicar o verão',
          fr: "Décider à quoi consacrer l'été",
          de: 'Entscheiden, wofür der Sommer genutzt wird',
          it: "Decidere a cosa dedicare l'estate",
          ja: '夏に何をするか決める',
          zh: '决定这个夏天要做什么',
          ko: '여름에 뭘 할지 정하기',
          ru: 'Решить, чему посвятить лето',
          hi: 'गर्मियों को किसमें लगाना है, यह तय करना',
          tr: 'Yazı neye ayıracağına karar vermek',
          id: 'Memilih akan dihabiskan untuk apa musim panas ini',
          pl: 'Wybrać, czemu poświęcić lato',
          nl: 'Kiezen waar de zomer aan besteden',
          ar: 'اختيار ما سيُخصَّص له الصيف',
        },
        dia: -140,
        nace: -170,
        completada: true,
        nota: {
          es: 'El diagrama de decisión dijo Japón. La lista de contras cabía en dos líneas.',
          en: 'The decision diagram said Japan. The cons fitted in two lines.',
          pt: 'O diagrama de decisão disse Japão. A lista de contras cabia em duas linhas.',
          fr: 'Le diagramme de décision a dit Japon. La liste des inconvénients tenait en deux lignes.',
          de: 'Das Entscheidungsdiagramm sagte Japan. Die Liste der Nachteile passte in zwei Zeilen.',
          it: 'Il diagramma di decisione ha detto Giappone. La lista dei contro stava in due righe.',
          ja: '決定ダイアグラムの答えはメキシコでした。デメリット欄は2行に収まりました。',
          zh: '决策图给出的答案是日本。缺点那栏两行就写完了。',
          ko: '결정 다이어그램의 답은 일본이었어요. 단점 목록은 두 줄이면 충분했어요.',
          ru: 'Диаграмма решений сказала: Япония. Список минусов уместился в две строки.',
          hi: 'फ़ैसले के डायग्राम ने कहा: जापान। नुकसानों की सूची दो लाइनों में समा गई।',
          tr: 'Karar diyagramı Japonya dedi. Eksiler listesi iki satıra sığdı.',
          id: 'Diagram keputusan bilang Jepang. Daftar kontranya muat dalam dua baris.',
          pl: 'Diagram decyzyjny wskazał Japonię. Lista minusów zmieściła się w dwóch linijkach.',
          nl: 'Het beslisdiagram zei Japan. De lijst met nadelen paste in twee regels.',
          ar: 'مخطط القرار اختار اليابان. قائمة السلبيات لم تتجاوز سطرين.',
        },
      },
    ],
  },

  // ── Biblioteca (ya tiene sus dos metas en su propio builder) ──────────────
  biblioteca: {
    color: '#818cf8',
    metas: [
      {
        nombre: {
          es: 'Cerrar la rama de astrofísica del árbol',
          en: 'Finish the astrophysics branch of the tree',
          pt: 'Fechar o ramo de astrofísica da árvore',
          fr: "Terminer la branche d'astrophysique de l'arbre",
          de: 'Den Astrophysik-Zweig des Baums abschließen',
          it: "Completare il ramo di astrofisica dell'albero",
          ja: '知識の木の天体物理学の枝を完成させる',
          zh: '完成知识树里天体物理学的分支',
          ko: '지식 트리의 천체물리학 가지를 완성하기',
          ru: 'Закрыть ветку астрофизики в дереве знаний',
          hi: 'नॉलेज ट्री की एस्ट्रोफ़िज़िक्स वाली शाखा पूरी करना',
          tr: 'Ağacın astrofizik dalını tamamlamak',
          id: 'Menuntaskan cabang astrofisika di pohon',
          pl: 'Zamknąć gałąź astrofizyki na drzewie',
          nl: 'De astrofysica-tak van de boom afronden',
          ar: 'إنهاء فرع الفيزياء الفلكية في الشجرة',
        },
        dia: 45,
        nace: -70,
        pasos: [
          {
            es: 'Escribir las cinco entradas que faltan',
            en: 'Write the five missing entries',
            pt: 'Escrever as cinco entradas que faltam',
            fr: 'Écrire les cinq entrées manquantes',
            de: 'Die fünf fehlenden Einträge schreiben',
            it: 'Scrivere le cinque voci mancanti',
            ja: '残り5つの項目を書く',
            zh: '写完剩下的五个词条',
            ko: '남은 항목 다섯 개 작성하기',
            ru: 'Написать пять недостающих статей',
            hi: 'बची हुई पाँच एंट्री लिखना',
            tr: 'Eksik kalan beş girdiyi yazmak',
            id: 'Menulis lima entri yang masih kurang',
            pl: 'Napisać pięć brakujących haseł',
            nl: 'De vijf ontbrekende items schrijven',
            ar: 'كتابة المداخل الخمس الناقصة',
          },
          {
            es: 'Ilustrar las tres más largas',
            en: 'Illustrate the three longest ones',
            pt: 'Ilustrar as três mais longas',
            fr: 'Illustrer les trois plus longues',
            de: 'Die drei längsten illustrieren',
            it: 'Illustrare le tre più lunghe',
            ja: '一番長い3つに図を入れる',
            zh: '给最长的三篇配上插图',
            ko: '가장 긴 세 개에 그림 넣기',
            ru: 'Проиллюстрировать три самые длинные',
            hi: 'सबसे लंबी तीन एंट्रीज़ को इलस्ट्रेट करना',
            tr: 'En uzun üç tanesini görselleştirmek',
            id: 'Memberi ilustrasi pada tiga yang paling panjang',
            pl: 'Zilustrować trzy najdłuższe',
            nl: 'De drie langste illustreren',
            ar: 'توضيح أطول ثلاثة مداخل بالصور',
          },
          {
            es: 'Enlazarlas con las de mecánica',
            en: 'Link them to the mechanics ones',
            pt: 'Vincular com as de mecânica',
            fr: 'Les relier à celles de mécanique',
            de: 'Sie mit den Mechanik-Einträgen verknüpfen',
            it: 'Collegarle a quelle di meccanica',
            ja: '力学の項目とリンクさせる',
            zh: '和力学的词条建立链接',
            ko: '역학 항목들과 연결하기',
            ru: 'Связать их со статьями по механике',
            hi: 'उन्हें मैकेनिक्स वाली एंट्रीज़ से जोड़ना',
            tr: 'Onları mekanik girdileriyle bağlantılamak',
            id: 'Menautkannya dengan entri mekanika',
            pl: 'Połączyć je z hasłami o mechanice',
            nl: 'Ze koppelen aan die van mechanica',
            ar: 'ربطها بمداخل الميكانيكا',
          },
        ],
        pasosHechos: [0],
      },
    ],
  },

  // ── Sala de cómputo ───────────────────────────────────────────────────────
  computo: {
    color: '#0ea5e9',
    metas: [
      {
        nombre: {
          es: 'Llevar el formulario de Física II completo al final',
          en: 'Get the Physics II formula book done by the end',
          pt: 'Terminar o formulário de Física II até o final',
          fr: "Terminer le formulaire de Physique II d'ici la fin",
          de: 'Die Formelsammlung für Physik II bis zum Ende fertigstellen',
          it: 'Completare il formulario di Fisica II entro la fine',
          ja: '物理IIの公式集を最後まで完成させる',
          zh: '把物理II公式手册做完整',
          ko: '물리학II 공식집을 끝까지 완성하기',
          ru: 'Довести формуляр по Физике II до полного вида',
          hi: 'फ़िज़िक्स II की फ़ॉर्मूला बुक आख़िर तक पूरी करना',
          tr: 'Fizik II formül defterini sona kadar tamamlamak',
          id: 'Menyelesaikan buku rumus Fisika II sampai akhir',
          pl: 'Doprowadzić zbiór wzorów z Fizyki II do końca',
          nl: 'Het formuleboek van Natuurkunde II tot het einde afmaken',
          ar: 'إتمام كراسة معادلات الفيزياء 2 حتى النهاية',
        },
        dia: 22,
        nace: -35,
        // Plan PROPUESTO y sin aceptar: en esta parte del año no hay otro así, y
        // es el estado que el visitante casi nunca ve.
        plan: {
          clave: 'formulario',
          inicio: -20,
          conPlazo: true,
          horasSemana: 4,
          dias: [1, 2, 3, 4],
          nivel: 'medio',
        },
      },
      {
        nombre: {
          es: 'Dejar el costeo de la cafetería en una hoja',
          en: 'Move the café costing into a spreadsheet',
          pt: 'Colocar o custeio da cafeteria em uma planilha',
          fr: 'Mettre le calcul des coûts de la cafétéria dans un tableur',
          de: 'Die Kalkulation des Cafés in eine Tabelle bringen',
          it: 'Mettere il calcolo dei costi del bar in un foglio di calcolo',
          ja: 'カフェの原価計算をシートにまとめる',
          zh: '把咖啡馆的成本核算做成表格',
          ko: '카페 원가 계산을 시트로 정리하기',
          ru: 'Перенести расчёт себестоимости кафе в таблицу',
          hi: 'कैफ़े की लागत का हिसाब एक शीट में लगाना',
          tr: 'Kafeteryanın maliyet hesabını bir tabloya geçirmek',
          id: 'Memindahkan perhitungan biaya kafe ke dalam spreadsheet',
          pl: 'Przenieść kalkulację kosztów kawiarni do arkusza',
          nl: 'De kostenberekening van het café in een spreadsheet zetten',
          ar: 'تحويل حساب تكاليف المقهى إلى جدول بيانات',
        },
        dia: -78,
        nace: -110,
        completada: true,
        nota: {
          es: 'Antes lo hacía de memoria y siempre salía distinto. Ahora cambio el precio del kilo y ya.',
          en: 'I used to do it from memory and it never came out the same. Now I change the price per kilo and that is it.',
          pt: 'Antes eu fazia de cabeça e nunca dava o mesmo valor. Agora mudo o preço do quilo e pronto.',
          fr:
            'Avant je le faisais de tête et le résultat changeait à chaque fois. Maintenant je change le prix au ' +
            "kilo et c'est réglé.",
          de:
            'Früher habe ich es im Kopf gemacht, und es kam nie dasselbe raus. Jetzt ändere ich den Preis pro ' +
            'Kilo, und fertig.',
          it: 'Prima lo facevo a mente e non veniva mai uguale. Ora cambio il prezzo al chilo e basta.',
          ja: '前は暗算でやっていて、いつも結果が違っていました。今はキロ単価を変えるだけで済みます。',
          zh: '以前全靠心算，每次结果都不一样。现在只要改一下每公斤的价格就行了。',
          ko: '예전엔 암산으로 했는데 늘 결과가 달랐어요. 이제는 킬로당 가격만 바꾸면 끝이에요.',
          ru: 'Раньше это считалось на глаз, и каждый раз выходило по-разному. Теперь достаточно поменять цену за кило — и готово.',
          hi: 'पहले यह अंदाज़े से होता था और हर बार अलग निकलता था। अब बस किलो का दाम बदलना होता है, बस।',
          tr: 'Eskiden aklımdan hesaplardım ve hep farklı çıkardı. Şimdi kilonun fiyatını değiştiriyorum, o kadar.',
          id: 'Dulu aku hitung dari ingatan dan hasilnya selalu beda. Sekarang tinggal ganti harga per kilonya, selesai.',
          pl: 'Kiedyś liczyło się to na pamięć i zawsze wychodziło inaczej. Teraz wystarczy zmienić cenę za kilogram — i gotowe.',
          nl: 'Vroeger deed ik het uit het hoofd en het kwam nooit hetzelfde uit. Nu verander ik de prijs per kilo en klaar.',
          ar: 'كنتُ أحسبها عن ظهر قلب وكانت تختلف في كل مرة. الآن أغيّر سعر الكيلو وحسب.',
        },
        pasos: [
          {
            es: 'Apuntar lo que cuesta cada insumo',
            en: 'Write down what each supply costs',
            pt: 'Anotar quanto custa cada insumo',
            fr: 'Noter le coût de chaque ingrédient',
            de: 'Aufschreiben, was jede Zutat kostet',
            it: 'Annotare quanto costa ogni ingrediente',
            ja: '材料それぞれの原価を書き出す',
            zh: '记下每种食材的成本',
            ko: '재료마다 드는 비용 적어두기',
            ru: 'Записывать стоимость каждого ингредиента',
            hi: 'हर सामग्री की क़ीमत लिखना',
            tr: 'Her malzemenin maliyetini not almak',
            id: 'Mencatat harga setiap bahan',
            pl: 'Zapisać koszt każdego składnika',
            nl: 'Opschrijven wat elk ingrediënt kost',
            ar: 'تدوين تكلفة كل مكوّن',
          },
          {
            es: 'Montar la fórmula del costo por taza',
            en: 'Build the cost-per-cup formula',
            pt: 'Montar a fórmula do custo por xícara',
            fr: 'Construire la formule du coût par tasse',
            de: 'Die Formel für die Kosten pro Tasse aufstellen',
            it: 'Costruire la formula del costo per tazza',
            ja: '1杯あたりの原価の計算式を作る',
            zh: '建立每杯成本的计算公式',
            ko: '한 잔당 원가 공식 만들기',
            ru: 'Составить формулу стоимости одной чашки',
            hi: 'एक कप की लागत का फ़ॉर्मूला बनाना',
            tr: 'Fincan başına maliyet formülünü oluşturmak',
            id: 'Menyusun rumus biaya per cangkir',
            pl: 'Ułożyć wzór na koszt jednej filiżanki',
            nl: 'De formule voor de kostprijs per kopje opstellen',
            ar: 'بناء معادلة تكلفة الفنجان الواحد',
          },
          {
            es: 'Comparar con lo que cobramos',
            en: 'Compare it with what we charge',
            pt: 'Comparar com o que cobramos',
            fr: "Comparer avec ce qu'on facture",
            de: 'Mit dem vergleichen, was wir verlangen',
            it: 'Confrontarlo con quanto facciamo pagare',
            ja: '実際の販売価格と比べる',
            zh: '和我们收的价格做对比',
            ko: '우리가 받는 가격과 비교하기',
            ru: 'Сравнить с тем, сколько мы берём с клиентов',
            hi: 'हम जो दाम लेते हैं, उससे तुलना करना',
            tr: 'Aldığımız ücretle karşılaştırmak',
            id: 'Membandingkannya dengan harga jual kami',
            pl: 'Porównać z tym, ile bierzemy',
            nl: 'Vergelijken met wat we rekenen',
            ar: 'مقارنتها بما نتقاضاه',
          },
        ],
        pasosHechos: [0, 1, 2],
      },
      {
        // Sin fecha: vive solo en la lista.
        nombre: {
          es: 'Entender de una vez la energía potencial',
          en: 'Finally understand potential energy',
          pt: 'Entender de uma vez a energia potencial',
          fr: "Comprendre enfin l'énergie potentielle",
          de: 'Die potenzielle Energie endlich verstehen',
          it: "Capire una volta per tutte l'energia potenziale",
          ja: '位置エネルギーをちゃんと理解する',
          zh: '彻底搞懂势能',
          ko: '위치 에너지를 제대로 이해하기',
          ru: 'Наконец разобраться с потенциальной энергией',
          hi: 'पोटेंशियल एनर्जी को एक बार में समझ लेना',
          tr: 'Potansiyel enerjiyi bir kere olsun anlamak',
          id: 'Akhirnya memahami energi potensial',
          pl: 'Zrozumieć wreszcie energię potencjalną',
          nl: 'Potentiële energie eindelijk begrijpen',
          ar: 'فهم الطاقة الكامنة أخيرًا',
        },
        nace: -50,
      },
    ],
  },

  // ── Idiomas (ámbitos: 'principal', 'japones') ─────────────────────────────
  idiomas: {
    color: '#f472b6',
    metas: [
      {
        nombre: {
          es: 'Presentar el B2',
          en: 'Sit the B2 exam',
          pt: 'Fazer a prova do B2',
          fr: "Passer l'examen du B2",
          de: 'Die B2-Prüfung ablegen',
          it: "Sostenere l'esame B2",
          ja: 'B2を受験する',
          zh: '参加B2考试',
          ko: 'B2 시험 보기',
          ru: 'Сдать экзамен B2',
          hi: 'B2 परीक्षा देना',
          tr: 'B2 sınavına girmek',
          id: 'Mengikuti ujian B2',
          pl: 'Zdawać egzamin B2',
          nl: 'Het B2-examen afleggen',
          ar: 'خوض اختبار B2',
        },
        dia: 180,
        nace: -5,
        ambito: 'principal',
        plan: {
          clave: 'b2',
          inicio: 7,
          conPlazo: true,
          horasSemana: 5,
          dias: [1, 2, 3, 4, 5],
          nivel: 'medio',
        },
      },
      {
        nombre: {
          es: 'Pedir de comer en japonés sin señalar',
          en: 'Order food in Japanese without pointing',
          pt: 'Pedir comida em japonês sem apontar',
          fr: 'Commander à manger en japonais sans montrer du doigt',
          de: 'Auf Japanisch bestellen, ohne mit dem Finger zu zeigen',
          it: 'Ordinare da mangiare in giapponese senza indicare',
          // ja: el segundo perfil de idiomas es ESPAÑOL en esta rama (coherente con el destino México)
          ja: '指差しせずにスペイン語で注文する',
          zh: '不用手指，直接用日语点餐',
          ko: '손으로 가리키지 않고 일본어로 주문하기',
          ru: 'Заказать еду по-японски, не показывая пальцем',
          hi: 'बिना उंगली दिखाए जापानी में खाना ऑर्डर करना',
          tr: 'İşaret etmeden Japonca yemek sipariş etmek',
          id: 'Memesan makanan dalam bahasa Jepang tanpa menunjuk',
          pl: 'Zamówić jedzenie po japońsku, nie wskazując palcem',
          nl: 'Eten bestellen in het Japans zonder te wijzen',
          ar: 'طلب الطعام باليابانية دون الإشارة بالإصبع',
        },
        dia: -130,
        nace: -200,
        completada: true,
        ambito: 'japones',
      },
    ],
  },

  // ── Agenda ────────────────────────────────────────────────────────────────
  agenda: {
    color: '#a855f7',
    metas: [
      {
        nombre: {
          es: 'Entregar el proyecto semestral',
          en: 'Hand in the semester project',
          pt: 'Entregar o projeto semestral',
          fr: 'Rendre le projet du semestre',
          de: 'Das Semesterprojekt abgeben',
          it: 'Consegnare il progetto semestrale',
          ja: '学期末プロジェクトを提出する',
          zh: '提交学期项目',
          ko: '학기 프로젝트 제출하기',
          ru: 'Сдать семестровый проект',
          hi: 'सेमेस्टर प्रोजेक्ट जमा करना',
          tr: 'Dönem projesini teslim etmek',
          id: 'Menyerahkan proyek semester',
          pl: 'Oddać projekt semestralny',
          nl: 'Het semesterproject inleveren',
          ar: 'تسليم مشروع الفصل الدراسي',
        },
        dia: 16,
        nace: -44,
        plan: {
          clave: 'semestral',
          inicio: -40,
          conPlazo: true,
          horasSemana: 8,
          dias: [1, 2, 3, 4, 5],
          nivel: 'medio',
          aceptado: true,
          // Las dos primeras fases enteras: teoría y laboratorio ya están.
          hechos: [1, 2, 3, 4, 5, 6],
        },
      },
      {
        nombre: {
          es: 'Cerrar el semestre sin pendientes atrasados',
          en: 'End the term with no overdue tasks',
          pt: 'Fechar o semestre sem pendências atrasadas',
          fr: 'Terminer le semestre sans tâches en retard',
          de: 'Das Semester ohne überfällige Aufgaben abschließen',
          it: 'Chiudere il semestre senza attività in ritardo',
          ja: '遅れているタスクなしで学期を終える',
          zh: '学期结束时不留任何拖欠的事项',
          ko: '밀린 일 없이 학기 마무리하기',
          ru: 'Закончить семестр без просроченных дел',
          hi: 'बिना किसी लेट काम के सेमेस्टर ख़त्म करना',
          tr: 'Dönemi geciken iş bırakmadan kapatmak',
          id: 'Menutup semester tanpa tugas yang menumpuk',
          pl: 'Zakończyć semestr bez zaległych spraw',
          nl: 'Het semester afsluiten zonder achterstallige taken',
          ar: 'إنهاء الفصل الدراسي دون مهام متأخرة',
        },
        nace: -50,
        pasos: [
          {
            es: 'Vaciar la bandeja cada domingo',
            en: 'Empty the inbox every Sunday',
            pt: 'Esvaziar a caixa de entrada todo domingo',
            fr: 'Vider la boîte de réception chaque dimanche',
            de: 'Jeden Sonntag den Posteingang leeren',
            it: 'Svuotare la casella ogni domenica',
            ja: '毎週日曜日に受信トレイを空にする',
            zh: '每周日清空收件箱',
            ko: '매주 일요일 받은편지함 비우기',
            ru: 'Разбирать входящие каждое воскресенье',
            hi: 'हर रविवार इनबॉक्स खाली करना',
            tr: 'Her pazar gelen kutusunu boşaltmak',
            id: 'Mengosongkan kotak masuk setiap hari Minggu',
            pl: 'Opróżniać skrzynkę w każdą niedzielę',
            nl: 'Elke zondag het postvak leegmaken',
            ar: 'تفريغ صندوق الوارد كل أحد',
          },
          {
            es: 'Nada en el tablero más de dos semanas',
            en: 'Nothing on the board for over two weeks',
            pt: 'Nada no quadro por mais de duas semanas',
            fr: 'Rien sur le tableau pendant plus de deux semaines',
            de: 'Nichts länger als zwei Wochen auf dem Board',
            it: 'Niente in bacheca per più di due settimane',
            ja: 'ボードに2週間以上残さない',
            zh: '看板上不留超过两周的事项',
            ko: '보드에 2주 넘게 남겨두지 않기',
            ru: 'Ничего не держать на доске больше двух недель',
            hi: 'बोर्ड पर कुछ भी दो हफ़्ते से ज़्यादा न रहने देना',
            tr: 'Panoda iki haftadan uzun kalan hiçbir şey olmasın',
            id: 'Tidak ada yang menumpuk di papan lebih dari dua minggu',
            pl: 'Nic na tablicy dłużej niż dwa tygodnie',
            nl: 'Niets langer dan twee weken op het bord',
            ar: 'لا شيء يبقى في اللوحة أكثر من أسبوعين',
          },
          {
            es: 'Un día a la semana sin citas',
            en: 'One day a week with no appointments',
            pt: 'Um dia por semana sem compromissos',
            fr: 'Un jour par semaine sans rendez-vous',
            de: 'Ein Tag pro Woche ohne Termine',
            it: 'Un giorno a settimana senza appuntamenti',
            ja: '週に1日は予定を入れない',
            zh: '每周留一天不排日程',
            ko: '일주일에 하루는 약속 없이 보내기',
            ru: 'Один день в неделю без встреч',
            hi: 'हफ़्ते में एक दिन बिना अपॉइंटमेंट के',
            tr: 'Haftada bir gün randevusuz kalmak',
            id: 'Satu hari dalam seminggu tanpa janji temu',
            pl: 'Jeden dzień w tygodniu bez spotkań',
            nl: 'Eén dag per week zonder afspraken',
            ar: 'يوم واحد في الأسبوع دون مواعيد',
          },
        ],
        pasosHechos: [0],
      },
    ],
  },

  // ── Noticias (el cuarto del diario) ───────────────────────────────────────
  diario: {
    color: '#f472b6',
    metas: [
      {
        nombre: {
          es: 'Un mes leyendo la edición de la mañana',
          en: 'A month reading the morning edition',
          pt: 'Um mês lendo a edição da manhã',
          fr: "Un mois à lire l'édition du matin",
          de: 'Einen Monat lang die Morgenausgabe lesen',
          it: "Un mese leggendo l'edizione del mattino",
          ja: '1か月間、朝刊を読み続ける',
          zh: '连续一个月读晨报',
          ko: '한 달 동안 아침판 읽기',
          ru: 'Месяц читать утренний выпуск',
          hi: 'एक महीने तक सुबह का संस्करण पढ़ना',
          tr: 'Bir ay boyunca sabah baskısını okumak',
          id: 'Sebulan membaca edisi pagi',
          pl: 'Miesiąc czytania porannego wydania',
          nl: 'Een maand lang de ochtendeditie lezen',
          ar: 'شهر من قراءة النشرة الصباحية',
        },
        dia: 28,
        nace: -2,
        plan: {
          clave: 'racha',
          inicio: 0,
          conPlazo: true,
          horasSemana: 2,
          dias: [1, 2, 3, 4, 5],
          nivel: 'algo',
          aceptado: true,
        },
      },
      {
        nombre: {
          es: 'Repartir la edición entre los asistentes',
          en: 'Share the edition out among the assistants',
          pt: 'Dividir a edição entre os assistentes',
          fr: "Répartir l'édition entre les assistants",
          de: 'Die Ausgabe unter den Assistenten aufteilen',
          it: "Dividere l'edizione tra gli assistenti",
          ja: '朝刊の担当をアシスタントで分ける',
          zh: '把报纸的内容分给各位助手',
          ko: '신문을 어시스턴트들에게 나눠 맡기기',
          ru: 'Распределить выпуск между помощниками',
          hi: 'संस्करण को सहायकों में बाँटना',
          tr: 'Baskıyı asistanlar arasında paylaştırmak',
          id: 'Membagi edisi ke antar asisten',
          pl: 'Rozdzielić wydanie między asystentów',
          nl: 'De editie verdelen onder de assistenten',
          ar: 'توزيع النشرة على المساعدين',
        },
        dia: -30,
        nace: -60,
        completada: true,
      },
    ],
  },

  // ── Entretenimiento (ya tiene su programa de clásicos) ────────────────────
  entretenimiento: {
    color: '#34d399',
    metas: [
      {
        nombre: {
          es: 'Vaciar los pendientes del archivo',
          en: 'Empty the archive backlog',
          pt: 'Esvaziar as pendências do arquivo',
          fr: 'Vider les archives en attente',
          de: 'Den Rückstand im Archiv aufarbeiten',
          it: "Svuotare l'arretrato dell'archivio",
          ja: 'アーカイブの積み残しを片付ける',
          zh: '清空归档里积压的内容',
          ko: '아카이브에 밀린 것들 정리하기',
          ru: 'Разобрать накопившееся в архиве',
          hi: 'आर्काइव के बचे हुए काम निपटाना',
          tr: 'Arşivdeki bekleyenleri bitirmek',
          id: 'Menuntaskan tunggakan di arsip',
          pl: 'Uporać się z zaległościami w archiwum',
          nl: 'De achterstand in het archief wegwerken',
          ar: 'تصفية المتراكمات في الأرشيف',
        },
        dia: 96,
        nace: -6,
        plan: {
          clave: 'archivo',
          inicio: 3,
          conPlazo: true,
          horasSemana: 5,
          dias: [2, 4, 5, 6],
          nivel: 'algo',
        },
      },
    ],
  },

  // ── Garaje ────────────────────────────────────────────────────────────────
  garage: {
    color: '#fbbf24',
    metas: [
      {
        nombre: {
          es: 'Dejar el coche listo para el invierno',
          en: 'Get the car ready for winter',
          pt: 'Deixar o carro pronto para o inverno',
          fr: "Préparer la voiture pour l'hiver",
          de: 'Das Auto winterfest machen',
          it: "Preparare l'auto per l'inverno",
          ja: '車を冬支度させる',
          zh: '把车准备好过冬',
          ko: '차 겨울 준비 끝내기',
          ru: 'Подготовить машину к зиме',
          hi: 'गाड़ी को सर्दियों के लिए तैयार करना',
          tr: 'Arabayı kışa hazır hale getirmek',
          id: 'Menyiapkan mobil untuk musim dingin',
          pl: 'Przygotować samochód na zimę',
          nl: 'De auto klaarmaken voor de winter',
          ar: 'تجهيز السيارة للشتاء',
        },
        dia: 60,
        nace: -14,
        plan: {
          clave: 'coche',
          inicio: -12,
          conPlazo: true,
          horasSemana: 3,
          dias: [0, 6],
          nivel: 'algo',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: {
          es: 'Cambiar la transmisión de la bici a los 5 000 km',
          en: 'Change the bike drivetrain at 5,000 km',
          pt: 'Trocar a transmissão da bike aos 5.000 km',
          fr: 'Changer la transmission du vélo à 5 000 km',
          de: 'Den Fahrradantrieb bei 5.000 km wechseln',
          it: 'Cambiare la trasmissione della bici a 5.000 km',
          ja: '5,000kmで自転車のドライブトレインを交換する',
          zh: '骑行5,000公里后更换自行车传动系统',
          ko: '자전거 구동계 5,000km에서 교체하기',
          ru: 'Поменять трансмиссию велосипеда на отметке 5000 км',
          hi: 'साइकिल की ट्रांसमिशन 5,000 किमी पर बदलना',
          tr: "Bisikletin aktarma organlarını 5.000 km'de değiştirmek",
          id: 'Mengganti transmisi sepeda di 5.000 km',
          pl: 'Wymienić napęd roweru po 5000 km',
          nl: 'De aandrijving van de fiets vervangen bij 5.000 km',
          ar: 'تغيير ناقل حركة الدراجة عند 5000 كم',
        },
        dia: 40,
        nace: -40,
        pasos: [
          {
            es: 'Medir el desgaste de la cadena',
            en: 'Measure the chain wear',
            pt: 'Medir o desgaste da corrente',
            fr: "Mesurer l'usure de la chaîne",
            de: 'Den Kettenverschleiß messen',
            it: "Misurare l'usura della catena",
            ja: 'チェーンの摩耗を測る',
            zh: '测量链条的磨损程度',
            ko: '체인 마모 측정하기',
            ru: 'Замерить износ цепи',
            hi: 'चेन की घिसावट नापना',
            tr: 'Zincirin aşınmasını ölçmek',
            id: 'Mengukur keausan rantai',
            pl: 'Zmierzyć zużycie łańcucha',
            nl: 'De slijtage van de ketting meten',
            ar: 'قياس مدى تآكل السلسلة',
          },
          {
            es: 'Pedir cadena, casete y platos',
            en: 'Order chain, cassette and chainrings',
            pt: 'Pedir corrente, cassete e coroas',
            fr: 'Commander chaîne, cassette et plateaux',
            de: 'Kette, Kassette und Kettenblätter bestellen',
            it: 'Ordinare catena, cassetta e guarnitura',
            ja: 'チェーン、カセット、チェーンリングを注文する',
            zh: '订购链条、飞轮和牙盘',
            ko: '체인, 카세트, 체인링 주문하기',
            ru: 'Заказать цепь, кассету и звёзды',
            hi: 'चेन, कैसेट और चेनरिंग ऑर्डर करना',
            tr: 'Zincir, kaset ve pedal dişlisi sipariş etmek',
            id: 'Memesan rantai, kaset, dan chainring',
            pl: 'Zamówić łańcuch, kasetę i zębatki',
            nl: 'Ketting, cassette en kettingbladen bestellen',
            ar: 'طلب سلسلة وكاسيت وأطباق دواسة',
          },
          {
            es: 'Montarlo en el taller de la esquina',
            en: 'Have the corner shop fit it',
            pt: 'Montar na oficina da esquina',
            fr: "Faire poser ça par l'atelier du coin",
            de: 'In der Werkstatt um die Ecke einbauen lassen',
            it: "Farlo montare dall'officina all'angolo",
            ja: '近所の自転車屋で取り付けてもらう',
            zh: '拿去街角的车行安装',
            ko: '동네 자전거 가게에서 조립 맡기기',
            ru: 'Поставить это в мастерской за углом',
            hi: 'कोने वाली दुकान से फ़िट करवाना',
            tr: 'Köşedeki tamirciye taktırmak',
            id: 'Memasangnya di bengkel dekat rumah',
            pl: 'Zamontować to w warsztacie na rogu',
            nl: 'Het laten monteren bij de fietsenmaker om de hoek',
            ar: 'تركيبها في ورشة الحي',
          },
        ],
        pasosHechos: [0],
      },
    ],
  },

  // ── Sala · Viajes ─────────────────────────────────────────────────────────
  sala: {
    color: '#2dd4bf',
    metas: [
      {
        nombre: {
          es: 'Corea del Sur, doce días',
          en: 'South Korea, twelve days',
          pt: 'Coreia do Sul, doze dias',
          fr: 'Corée du Sud, douze jours',
          de: 'Südkorea, zwölf Tage',
          it: 'Corea del Sud, dodici giorni',
          ja: '韓国、12日間',
          zh: '韩国，十二天',
          // ko: el próximo viaje ya es Vietnam en esta rama (coherente con sala/demo.data.i18n.ts)
          ko: '베트남, 여드레',
          ru: 'Южная Корея, двенадцать дней',
          hi: 'दक्षिण कोरिया, बारह दिन',
          tr: 'Güney Kore, on iki gün',
          id: 'Korea Selatan, dua belas hari',
          pl: 'Korea Południowa, dwanaście dni',
          nl: 'Zuid-Korea, twaalf dagen',
          ar: 'كوريا الجنوبية، اثنا عشر يومًا',
        },
        dia: 341,
        nace: -9,
        plan: {
          clave: 'corea',
          inicio: 330,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 6],
          nivel: 'cero',
        },
      },
      {
        nombre: {
          es: 'Tres semanas en Japón',
          en: 'Three weeks in Japan',
          pt: 'Três semanas no Japão',
          fr: 'Trois semaines au Japon',
          de: 'Drei Wochen in Japan',
          it: 'Tre settimane in Giappone',
          // ja: destino cambiado a México (decisión del 13 ago 2026, ver glosario.mjs DECISIONES.viaje)
          ja: 'メキシコで3週間',
          zh: '在日本三周',
          ko: '일본에서 3주',
          ru: 'Три недели в Японии',
          hi: 'जापान में तीन हफ़्ते',
          tr: "Japonya'da üç hafta",
          id: 'Tiga minggu di Jepang',
          pl: 'Trzy tygodnie w Japonii',
          nl: 'Drie weken in Japan',
          ar: 'ثلاثة أسابيع في اليابان',
        },
        dia: -104,
        nace: -300,
        completada: true,
        nota: {
          es: 'Un año de quincenas cabía en veintiún días. Volvería mañana.',
          en: 'A year of paychecks fitted into twenty-one days. I would go back tomorrow.',
          pt: 'Um ano de salários cabia em vinte e um dias. Eu voltaria amanhã.',
          fr: 'Un an de payes tenait en vingt et un jours. Je repartirais demain.',
          de: 'Ein Jahr Gehaltsabrechnungen passte in einundzwanzig Tage. Ich würde morgen wieder hinfahren.',
          it: 'Un anno di stipendi stava in ventun giorni. Ripartirei domani.',
          ja: '1年分の給料が21日間に収まりました。明日にでもまた行きたいです。',
          zh: '一年攒的工资，都花在这二十一天里了。明天我还想再去一次。',
          ko: '일 년치 월급이 21일 안에 다 들어갔어요. 내일이라도 다시 가고 싶어요.',
          ru: 'Год выплат уместился в двадцать один день. Так и тянет вернуться завтра же.',
          hi: 'साल भर की तनख़्वाहें इक्कीस दिनों में समा गईं। मन है कि कल ही फिर वहाँ पहुँच जाऊं।',
          tr: 'Bir yıllık maaşlar yirmi bir güne sığdı. Yarın yine giderim.',
          id: 'Setahun gaji dua mingguan muat dalam dua puluh satu hari. Aku mau balik lagi besok kalau bisa.',
          pl: 'Rok wypłat zmieścił się w dwudziestu jeden dniach. Wróciłoby się tam choćby jutro.',
          nl: 'Een jaar aan loon paste in eenentwintig dagen. Ik zou morgen weer gaan.',
          ar: 'انضغط عام كامل من الرواتب في واحد وعشرين يومًا. سأعود غدًا لو استطعت.',
        },
      },
    ],
  },

  // ── Despacho · Finanzas (ámbitos fijos de la app: ahorro / deuda) ─────────
  despacho: {
    color: '#60a5fa',
    metas: [
      {
        nombre: {
          es: 'Fondo de imprevistos de tres meses',
          en: 'Three-month emergency fund',
          pt: 'Fundo de emergência de três meses',
          fr: "Fonds d'urgence de trois mois",
          de: 'Notfallfonds für drei Monate',
          it: 'Fondo di emergenza di tre mesi',
          ja: '3か月分の緊急資金',
          zh: '三个月的应急基金',
          ko: '3개월치 비상금',
          ru: 'Резервный фонд на три месяца',
          hi: 'तीन महीने का इमरजेंसी फ़ंड',
          tr: 'Üç aylık acil durum fonu',
          id: 'Dana darurat tiga bulan',
          pl: 'Fundusz awaryjny na trzy miesiące',
          nl: 'Noodfonds voor drie maanden',
          ar: 'صندوق طوارئ لثلاثة أشهر',
        },
        dia: 175,
        nace: -16,
        ambito: 'ahorro',
        plan: {
          clave: 'fondo',
          inicio: -14,
          conPlazo: true,
          horasSemana: 1,
          dias: [5],
          nivel: 'algo',
          aceptado: true,
          hechos: [1, 2, 3],
        },
      },
      {
        nombre: {
          es: 'Ahorrar 45 000 para Japón',
          en: 'Save 45,000 for Japan',
          pt: 'Poupar 45.000 para o Japão',
          fr: 'Économiser 45 000 pour le Japon',
          de: '45.000 für Japan sparen',
          it: 'Risparmiare 45.000 per il Giappone',
          // Cifras ya fijadas en rooms/anecdotario/demo.data.i18n.ts (mismo ahorro del año demo)
          ja: 'メキシコに向けて390,000円貯める',
          zh: '存19,500元去日本',
          ko: '일본 여행 자금 3,900,000원 모으기',
          ru: 'Накопить 260 000 рублей на Японию',
          hi: 'जापान के लिए 234,000 रुपये बचाना',
          tr: 'Japonya için 117.000 ₺ biriktirmek',
          id: 'Menabung Rp45,5 juta untuk Jepang',
          pl: 'Zaoszczędzić 11 000 zł na Japonię',
          nl: '2.600 € sparen voor Japan',
          ar: 'ادّخار 10.400 ر.س لليابان',
        },
        dia: -130,
        nace: -280,
        completada: true,
        ambito: 'ahorro',
      },
      {
        nombre: {
          es: 'Terminar de pagar la reparación del coche',
          en: 'Finish paying off the car repair',
          pt: 'Terminar de pagar o conserto do carro',
          fr: 'Finir de payer la réparation de la voiture',
          de: 'Die Autoreparatur fertig abbezahlen',
          it: "Finire di pagare la riparazione dell'auto",
          ja: '車の修理代を払い終える',
          zh: '还清车辆维修的钱',
          ko: '자동차 수리비 다 갚기',
          ru: 'Полностью расплатиться за ремонт машины',
          hi: 'गाड़ी की मरम्मत का बचा हुआ पैसा चुकाना',
          tr: 'Araba tamirini ödemeyi bitirmek',
          id: 'Melunasi biaya perbaikan mobil',
          pl: 'Dokończyć spłatę naprawy samochodu',
          nl: 'De autoreparatie helemaal afbetalen',
          ar: 'الانتهاء من سداد تكلفة إصلاح السيارة',
        },
        dia: -62,
        nace: -178,
        completada: true,
        ambito: 'deuda',
        nota: {
          es: 'Cuatro meses. Y la lección: sin fondo, la grúa la paga el viaje.',
          en: 'Four months. And the lesson: with no fund, the tow truck is paid by the trip.',
          pt: 'Quatro meses. E a lição: sem fundo, quem paga o guincho é a viagem.',
          fr: "Quatre mois. Et la leçon : sans fonds, c'est le voyage qui paie la dépanneuse.",
          de: 'Vier Monate. Und die Lektion: ohne Fonds zahlt die Reise den Abschleppwagen.',
          it: 'Quattro mesi. E la lezione: senza fondo, è il viaggio a pagare il carro attrezzi.',
          ja: '4か月。教訓は、備えがなければレッカー代を旅費が肩代わりするということです。',
          zh: '四个月。教训是：没有应急金，拖车费就得旅行基金来出。',
          ko: '넉 달. 배운 건 비상금이 없으면 견인비는 여행 자금이 내게 된다는 거예요.',
          ru: 'Четыре месяца. И урок: без резерва за эвакуатор платит поездка.',
          hi: 'चार महीने। और सबक़ यह: बिना फ़ंड के, टोइंग का ख़र्च ट्रिप के पैसों से ही निकलता है।',
          tr: 'Dört ay. Ders şu: fon yoksa çekiciyi seyahat öder.',
          id: 'Empat bulan. Dan pelajarannya: tanpa dana darurat, biaya derek dibayar oleh tabungan liburan.',
          pl: 'Cztery miesiące. I nauczka: bez funduszu awaryjnego to podróż płaci za lawetę.',
          nl: 'Vier maanden. En de les: zonder buffer betaalt de reis de sleepwagen.',
          ar: 'أربعة أشهر. والدرس: بلا صندوق طوارئ، رحلة السفر هي من تدفع ثمن السحب.',
        },
      },
    ],
  },
}

/** Ámbitos que la app resuelve al sembrar (`piano` → `hobby:3`). */
export type AmbitosDemo = Record<string, string>

export interface OpcionesMetas {
  /**
   * Primer `orden` libre: las apps que ya siembran metas propias en su builder
   * (biblioteca, entretenimiento, idiomas) pasan cuántas llevan, o las nuevas
   * saldrían empatadas con ellas y el panel las ordenaría por fecha de creación.
   */
  ordenDesde?: number
  ambitos?: AmbitosDemo
}

/**
 * Siembra las metas de una app (y sus planes). La llama el builder de esa app,
 * al final de su año: las metas hablan de lo que ya está sembrado.
 */
export async function sembrarMetasApp(
  ctx: CtxDemo,
  app: string,
  opts: OpcionesMetas = {},
): Promise<void> {
  const carpeta = METAS_PEP[app]
  if (!carpeta) return
  const desde = opts.ordenDesde ?? 0
  for (const [i, meta] of carpeta.metas.entries()) {
    await sembrarMeta(ctx, app, meta, {
      color: carpeta.color,
      orden: desde + i,
      profundidad: 0,
      ambitos: opts.ambitos ?? {},
    })
  }
}

interface Sitio {
  color: string
  orden: number
  profundidad: number
  ambitos: AmbitosDemo
  padreId?: number
  /** El de la madre: una sub-meta no vuelve a declarar su ámbito. */
  ambitoId?: string
}

async function sembrarMeta(ctx: CtxDemo, app: string, meta: MetaDemo, sitio: Sitio): Promise<void> {
  const idioma = ctx.idioma
  const enHora = (off: number, hora: string) => `${ctx.fecha(off)}T${hora}:00.000Z`
  // Sin `nace`, se da por escrita dos meses antes de su fecha (o hace uno, si no
  // tiene): `creadoEn` es lo que ordena la lista cuando el `orden` empata.
  const nace = meta.nace ?? (meta.dia != null ? Math.max(-364, meta.dia - 60) : -30)
  const ambitoId = sitio.ambitoId ?? (meta.ambito ? sitio.ambitos[meta.ambito] : undefined)
  const pasos: PasoRutina[] = (meta.pasos ?? []).map((p) => ({ titulo: enIdioma(p, idioma), roomId: '' }))

  const id = await rutinasRepo.add({
    nombre: enIdioma(meta.nombre, idioma),
    emoji: '🎯',
    dias: [],
    pasos,
    ...(meta.pasosHechos ? { pasosHechos: [...meta.pasosHechos] } : {}),
    activa: true,
    esMeta: true,
    repeticion: 'una_vez',
    ...(meta.completada ? { completada: true } : {}),
    // Fecha objetivo suelta, nunca un rango: un rango pintaría la meta en todos
    // los días que abarca.
    ...(meta.dia != null ? { fechaInicio: ctx.fecha(meta.dia) } : {}),
    ...(meta.nota ? { nota: enIdioma(meta.nota, idioma) } : {}),
    color: sitio.profundidad === 0 ? sitio.color : colorPorProfundidad(sitio.color, sitio.profundidad),
    orden: sitio.orden,
    ...(sitio.padreId != null ? { padreId: sitio.padreId } : {}),
    plantillaId: app,
    ...(ambitoId ? { ambitoId } : {}),
    creadoEn: enHora(nace, '09:00'),
  })
  if (typeof id !== 'number') return

  for (const [i, hija] of (meta.hijas ?? []).entries()) {
    await sembrarMeta(ctx, app, hija, {
      ...sitio,
      orden: i,
      profundidad: sitio.profundidad + 1,
      padreId: id,
      ambitoId,
    })
  }

  if (meta.plan) await sembrarPlan(ctx, meta, meta.plan, id, sitio.color)
}

async function sembrarPlan(
  ctx: CtxDemo,
  meta: MetaDemo,
  def: PlanDeMeta,
  metaId: number,
  color: string,
): Promise<void> {
  const enHora = (off: number, hora: string) => `${ctx.fecha(off)}T${hora}:00.000Z`
  const planId = await sembrarPlanDemo({
    metaId,
    clave: def.clave,
    plan: enIdioma(PLANES_DEMO, ctx.idioma)[def.clave],
    inicioISO: ctx.fecha(def.inicio),
    entrada: {
      fechaInicio: ctx.fecha(def.inicio),
      ...(def.conPlazo && meta.dia != null ? { fechaObjetivo: ctx.fecha(meta.dia) } : {}),
      horasSemana: def.horasSemana,
      dias: [...def.dias],
      nivel: def.nivel,
    },
    // Se generó la víspera de su día 0 (o de hoy, si el plan empieza más
    // adelante: nadie pide un plan y lo guarda un año antes de generarlo).
    creadoEn: enHora(Math.min(-1, def.inicio - 1), '20:00'),
    hechos: def.hechos,
  })
  if (!def.aceptado) return

  // Aceptar de verdad, con la misma función que la hoja del plan: es quien sabe
  // crear las sub-metas al derecho, ponerles el periodo y amarrar cada nodo con
  // la meta que nació de él (ver `aceptarPlan`).
  const vivas = (await rutinasRepo.list()).filter(esMeta)
  const guardado = (await planesMetaRepo.list()).find((p) => p.id === planId)
  const origen = vivas.find((m) => m.id === metaId)
  if (guardado && origen)
    await aceptarPlan(vivas, guardado, origen, (p) => colorPorProfundidad(color, p + 1))
  await planesMetaRepo.update(planId, { aceptadoEn: enHora(Math.min(0, def.inicio), '09:30') })
}
