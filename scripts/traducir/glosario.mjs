/**
 * Voz y vocabulario fijo de MPH para las traducciones automáticas.
 *
 * El glosario NO es decorativo: la interfaz se traduce en ~80 lotes por idioma
 * y cada lote es una llamada independiente, así que sin un término fijado de
 * antemano el modelo elegiría «meta» de tres maneras distintas según el lote.
 * Aquí se decide una vez y se repite en todos.
 */

/** Instrucciones comunes a todos los idiomas. */
export const VOZ = `Traduces la interfaz de Mind Planner Home (MPH), una app personal donde la
vida del usuario es una CASA ISOMÉTRICA 3D y cada cuarto es una mini-app:
cocina y nutrición, ejercicio, descanso, finanzas, aprendizaje, viajes,
mindfulness, agenda, ideas… Se acompaña de una gamificación suave (rachas,
insignias, un ascenso anual) y de asistentes que charlan con el usuario.

El tono es cálido y cercano, de alguien que acompaña sin sermonear: ni
corporativo ni infantil. Frases cortas, verbos directos.

REGLAS DURAS
1. Devuelve SOLO la traducción de cada texto. Nada de comentarios ni comillas
   añadidas.
2. Los marcadores entre llaves —{nombre}, {n}, {total}— se copian TAL CUAL,
   sin traducir, sin cambiar de nombre y sin añadir ni quitar ninguno.
3. «Mind Planner Home» y «MPH» no se traducen DENTRO de una frase. La ÚNICA
   excepción es la clave «app.brand» (el rótulo de la barra), que lleva el
   nombre de la marca ya localizado y debe decir lo MISMO que «marca.nombre»
   de la web (web/i18n/paginas/<id>.mjs) — decidido el 20 ago 2026.
4. No metas emojis. Si el original no lleva, la traducción tampoco.
5. Respeta el marcado del manual de comandos: los corchetes [así] y las llaves
   {así} delimitan partes de la frase y deben seguir delimitando lo mismo.
6. Conserva mayúsculas iniciales, signos finales y saltos de línea (\\n) del
   original.
7. Los textos de botón, pestaña y menú son ESTRECHOS: si el inglés cabe en una
   o dos palabras, la traducción también tiene que caber. Prefiere la palabra
   corta aunque pierdas un matiz.
8. Traduce el SENTIDO, no las palabras: si la frase española es idiomática,
   busca la expresión natural equivalente en tu idioma.`

/**
 * Un idioma de destino: cómo se le habla al usuario y qué palabra fija se usa
 * para cada concepto de la casa.
 *
 * Los términos van en español porque el español es el original; la columna de
 * la derecha es la palabra que debe aparecer en la traducción.
 */
export const IDIOMAS = {
  pt: {
    nombre: 'portugués de Brasil (pt-BR)',
    registro:
      'Trata al usuario de «você», nunca de «tu» ni de «o senhor». Portugués de BRASIL: ' +
      'usa el léxico brasileño (celular, tela, ônibus, café da manhã), no el europeo.',
    terminos: {
      casa: 'casa',
      cuarto: 'cômodo (NUNCA «quarto», que en portugués es solo el dormitorio)',
      mapa: 'mapa',
      plantilla: 'modelo',
      objeto: 'objeto',
      meta: 'meta',
      plan: 'plano',
      paso: 'passo',
      cronograma: 'cronograma',
      racha: 'sequência',
      insignia: 'emblema',
      rango: 'patente',
      nivel: 'nível',
      asistente: 'assistente',
      mascota: 'mascote',
      ámbito: 'âmbito',
      rutina: 'rotina',
      hábito: 'hábito',
      huerto: 'horta',
      granja: 'fazenda',
      cancha: 'quadra',
      recámara: 'quarto',
      despacho: 'escritório',
      anecdotario: 'diário de memórias',
      bitácora: 'diário de bordo',
      respaldo: 'backup',
      créditos: 'créditos',
      'ejemplo de fábrica': 'exemplo pronto',
    },
  },

  fr: {
    nombre: 'francés',
    registro:
      'Tutea al usuario: «tu», nunca «vous». Es una app personal, no una herramienta ' +
      'de empresa. Evita el anglicismo cuando exista la palabra francesa corriente.',
    terminos: {
      casa: 'maison',
      cuarto: 'pièce',
      mapa: 'plan',
      plantilla: 'modèle',
      objeto: 'objet',
      meta: 'objectif',
      plan: 'plan',
      paso: 'étape',
      cronograma: 'planning',
      racha: 'série',
      insignia: 'badge',
      rango: 'rang',
      nivel: 'niveau',
      asistente: 'assistant',
      mascota: 'mascotte',
      ámbito: 'domaine',
      rutina: 'routine',
      hábito: 'habitude',
      huerto: 'potager',
      granja: 'ferme',
      cancha: 'terrain',
      recámara: 'chambre',
      despacho: 'bureau',
      anecdotario: 'carnet de souvenirs',
      bitácora: 'journal de bord',
      respaldo: 'sauvegarde',
      créditos: 'crédits',
      'ejemplo de fábrica': 'exemple prêt à l’emploi',
    },
  },

  de: {
    nombre: 'alemán',
    registro:
      'Tutea al usuario: «du» y sus formas (dein, dir), nunca «Sie». Es una app ' +
      'personal. Sustantivos siempre en mayúscula, como manda la ortografía.',
    terminos: {
      casa: 'Haus',
      cuarto: 'Raum',
      mapa: 'Karte',
      plantilla: 'Vorlage',
      objeto: 'Objekt',
      meta: 'Ziel',
      plan: 'Plan',
      paso: 'Schritt',
      cronograma: 'Zeitplan',
      racha: 'Serie',
      insignia: 'Abzeichen',
      rango: 'Rang',
      nivel: 'Level',
      asistente: 'Assistent',
      mascota: 'Maskottchen',
      ámbito: 'Bereich',
      rutina: 'Routine',
      hábito: 'Gewohnheit',
      huerto: 'Gemüsegarten',
      granja: 'Bauernhof',
      cancha: 'Platz',
      recámara: 'Schlafzimmer',
      despacho: 'Arbeitszimmer',
      anecdotario: 'Erinnerungsbuch',
      bitácora: 'Logbuch',
      respaldo: 'Sicherung',
      créditos: 'Credits',
      'ejemplo de fábrica': 'fertiges Beispiel',
    },
  },

  it: {
    nombre: 'italiano',
    registro:
      'Da del «tu» al usuario, nunca del «Lei». Es una app personal. Evita el ' +
      'anglicismo cuando exista la palabra italiana corriente.',
    terminos: {
      casa: 'casa',
      cuarto: 'stanza',
      mapa: 'mappa',
      plantilla: 'modello',
      objeto: 'oggetto',
      meta: 'obiettivo',
      plan: 'piano',
      paso: 'passo',
      cronograma: 'programma',
      racha: 'serie',
      insignia: 'distintivo',
      rango: 'grado',
      nivel: 'livello',
      asistente: 'assistente',
      mascota: 'mascotte',
      ámbito: 'ambito',
      rutina: 'routine',
      hábito: 'abitudine',
      huerto: 'orto',
      granja: 'fattoria',
      cancha: 'campo',
      recámara: 'camera da letto',
      despacho: 'studio',
      anecdotario: 'diario dei ricordi',
      bitácora: 'diario di bordo',
      respaldo: 'backup',
      créditos: 'crediti',
      'ejemplo de fábrica': 'esempio pronto',
    },
  },

  ja: {
    nombre: 'japonés',
    registro:
      'Habla en です・ます (丁寧語), nunca en 常体 ni en 敬語 de servicio al cliente: ' +
      'es una app personal que acompaña, no una empresa que atiende. Evita «あなた»: ' +
      'el japonés omite el sujeto y la frase queda más natural sin él. Botones y ' +
      'pestañas en forma nominal corta (「保存」, no 「保存します」).',
    terminos: {
      casa: '家',
      cuarto: '部屋',
      mapa: 'マップ',
      plantilla: 'テンプレート',
      objeto: 'オブジェクト',
      meta: '目標',
      plan: 'プラン',
      paso: 'ステップ',
      cronograma: 'スケジュール',
      racha: '連続記録',
      insignia: 'バッジ',
      rango: '称号',
      nivel: 'レベル',
      asistente: 'アシスタント',
      mascota: 'マスコット',
      ámbito: '分野',
      rutina: 'ルーティン',
      hábito: '習慣',
      huerto: '菜園',
      granja: '牧場',
      cancha: 'コート',
      recámara: '寝室',
      despacho: '書斎',
      anecdotario: '思い出ノート',
      bitácora: '旅日記',
      respaldo: 'バックアップ',
      créditos: 'クレジット',
      'ejemplo de fábrica': 'サンプル',
    },
  },

  zh: {
    nombre: 'chino simplificado (zh-CN)',
    registro:
      'Trata al usuario de «你», nunca de «您»: es una app personal y cercana. ' +
      'Chino simplificado continental (软件, 视频, 网络), no el léxico de Taiwán. ' +
      'Sin espacios de relleno y con puntuación de ancho completo (，。：).',
    terminos: {
      casa: '家',
      cuarto: '房间',
      mapa: '地图',
      plantilla: '模板',
      objeto: '物件',
      meta: '目标',
      plan: '计划',
      paso: '步骤',
      cronograma: '日程',
      racha: '连续天数',
      insignia: '徽章',
      rango: '段位',
      nivel: '等级',
      asistente: '助手',
      mascota: '吉祥物',
      ámbito: '领域',
      rutina: '日常安排',
      hábito: '习惯',
      huerto: '菜园',
      granja: '农场',
      cancha: '球场',
      recámara: '卧室',
      despacho: '书房',
      anecdotario: '回忆本',
      bitácora: '旅行日志',
      respaldo: '备份',
      créditos: '点数',
      'ejemplo de fábrica': '示例',
    },
  },

  ko: {
    nombre: 'coreano',
    registro:
      'Habla en 해요체 (친근한 존댓말), nunca en 합쇼체 de anuncio ni en 반말. ' +
      'Evita «당신»: en coreano suena distante o de traducción; omite el sujeto. ' +
      'Botones y pestañas en forma nominal corta (「저장」, no 「저장해요」).',
    terminos: {
      casa: '집',
      cuarto: '방',
      mapa: '지도',
      plantilla: '템플릿',
      objeto: '오브젝트',
      meta: '목표',
      plan: '계획',
      paso: '단계',
      cronograma: '일정',
      racha: '연속 기록',
      insignia: '배지',
      rango: '등급',
      nivel: '레벨',
      asistente: '어시스턴트',
      mascota: '마스코트',
      ámbito: '분야',
      rutina: '루틴',
      hábito: '습관',
      huerto: '텃밭',
      granja: '농장',
      cancha: '코트',
      recámara: '침실',
      despacho: '서재',
      anecdotario: '추억 노트',
      bitácora: '여행 일지',
      respaldo: '백업',
      créditos: '크레딧',
      'ejemplo de fábrica': '예시',
    },
  },

  ru: {
    nombre: 'ruso',
    registro:
      'Tutea al usuario: «ты» y sus formas (твой, тебе), nunca «Вы». Es una app ' +
      'personal. Evita el calco del inglés cuando exista la palabra rusa corriente, ' +
      'y prefiere el sustantivo verbal corto en botones («Сохранить», no «Сохраните»).',
    terminos: {
      casa: 'дом',
      cuarto: 'комната',
      mapa: 'карта',
      plantilla: 'шаблон',
      objeto: 'объект',
      meta: 'цель',
      plan: 'план',
      paso: 'шаг',
      cronograma: 'расписание',
      racha: 'серия',
      insignia: 'значок',
      rango: 'ранг',
      nivel: 'уровень',
      asistente: 'помощник',
      mascota: 'талисман',
      ámbito: 'сфера',
      rutina: 'рутина (la actividad que se repite; NUNCA con el matiz negativo de «однообразие»)',
      hábito: 'привычка',
      huerto: 'огород',
      granja: 'ферма',
      cancha: 'площадка',
      recámara: 'спальня',
      despacho: 'кабинет',
      anecdotario: 'дневник воспоминаний',
      bitácora: 'путевой дневник',
      respaldo: 'резервная копия',
      créditos: 'кредиты',
      'ejemplo de fábrica': 'готовый пример',
    },
  },

  ar: {
    nombre: 'árabe estándar moderno (MSA)',
    registro:
      'Árabe estándar moderno, en trato DIRECTO de segunda persona masculina ' +
      '(أنتَ implícito): la app se dirige a una sola persona, sin fórmulas de ' +
      'cortesía comercial ni dialecto regional. Evita la doble forma masculina/' +
      'femenina («مرحبًا بك/بكِ»): elige la construcción neutra o nominal cuando ' +
      'exista. Sin tashkīl salvo cuando evite una ambigüedad real.',
    terminos: {
      casa: 'البيت',
      cuarto: 'غرفة',
      mapa: 'الخريطة',
      plantilla: 'قالب',
      objeto: 'عنصر',
      meta: 'هدف',
      plan: 'خطة',
      paso: 'خطوة',
      cronograma: 'جدول زمني',
      racha: 'سلسلة',
      insignia: 'شارة',
      rango: 'رتبة',
      nivel: 'مستوى',
      asistente: 'مساعد',
      mascota: 'تميمة',
      ámbito: 'مجال',
      rutina: 'روتين',
      hábito: 'عادة',
      huerto: 'حديقة الخضروات',
      granja: 'مزرعة',
      cancha: 'ملعب',
      recámara: 'غرفة النوم',
      despacho: 'المكتب',
      anecdotario: 'دفتر الذكريات',
      bitácora: 'يوميات الرحلة',
      respaldo: 'نسخة احتياطية',
      créditos: 'أرصدة',
      'ejemplo de fábrica': 'مثال جاهز',
    },
  },

  hi: {
    nombre: 'hindi',
    registro:
      'Trata al usuario de «आप» (nunca «तू» ni «तुम»): en hindi «आप» es el trato ' +
      'normal y cordial, no el distante. Hindi corriente y hablado, no sánscrito ' +
      'de registro oficial; los préstamos ingleses ya asentados (ऐप, फ़ोटो, बैकअप) ' +
      'se escriben en devanagari y se prefieren a un neologismo forzado.',
    terminos: {
      casa: 'घर',
      cuarto: 'कमरा',
      mapa: 'नक्शा',
      plantilla: 'टेम्पलेट',
      objeto: 'वस्तु',
      meta: 'लक्ष्य',
      plan: 'योजना',
      paso: 'चरण',
      cronograma: 'समय-सारणी',
      racha: 'सिलसिला',
      insignia: 'बैज',
      rango: 'रैंक',
      nivel: 'स्तर',
      asistente: 'सहायक',
      mascota: 'शुभंकर',
      ámbito: 'क्षेत्र',
      rutina: 'दिनचर्या',
      hábito: 'आदत',
      huerto: 'सब्ज़ी बगीचा',
      granja: 'फ़ार्म',
      cancha: 'मैदान',
      recámara: 'शयनकक्ष',
      despacho: 'कार्यकक्ष',
      anecdotario: 'यादों की डायरी',
      bitácora: 'सफ़रनामा',
      respaldo: 'बैकअप',
      créditos: 'क्रेडिट',
      'ejemplo de fábrica': 'तैयार उदाहरण',
    },
  },

  tr: {
    nombre: 'turco (tr-TR)',
    registro:
      'Trata al usuario de «sen», nunca de «siz»: es una app personal y el «sen» es el ' +
      'registro normal de las apps cercanas en turco. Botones y órdenes en imperativo ' +
      'corto («Kaydet», «Sil»), como el software turco corriente. Evita el anglicismo ' +
      'cuando exista la palabra turca asentada.',
    terminos: {
      casa: 'ev',
      cuarto: 'oda',
      mapa: 'harita',
      plantilla: 'şablon',
      objeto: 'nesne',
      meta: 'hedef',
      plan: 'plan',
      paso: 'adım',
      cronograma: 'zaman çizelgesi',
      racha: 'seri',
      insignia: 'rozet',
      rango: 'rütbe',
      nivel: 'seviye',
      asistente: 'asistan',
      mascota: 'maskot',
      ámbito: 'alan',
      rutina: 'rutin',
      hábito: 'alışkanlık',
      huerto: 'sebze bahçesi',
      granja: 'çiftlik',
      cancha: 'saha',
      recámara: 'yatak odası',
      despacho: 'çalışma odası',
      anecdotario: 'anı defteri',
      bitácora: 'seyir defteri',
      respaldo: 'yedek',
      créditos: 'kredi',
      'ejemplo de fábrica': 'hazır örnek',
    },
  },

  pl: {
    nombre: 'polaco',
    registro:
      'Trata al usuario de «ty», nunca de «Pan/Pani»: es una app personal y cercana. ' +
      'Botones y órdenes en imperativo corto («Zapisz», «Usuń»), como el software ' +
      'polaco corriente. Evita el anglicismo cuando exista la palabra polaca asentada.',
    terminos: {
      casa: 'dom',
      cuarto: 'pokój',
      mapa: 'mapa',
      plantilla: 'szablon',
      objeto: 'obiekt',
      meta: 'cel',
      plan: 'plan',
      paso: 'krok',
      cronograma: 'harmonogram',
      racha: 'seria',
      insignia: 'odznaka',
      rango: 'ranga',
      nivel: 'poziom',
      asistente: 'asystent',
      mascota: 'maskotka',
      ámbito: 'obszar',
      rutina: 'rutyna',
      hábito: 'nawyk',
      huerto: 'warzywnik',
      granja: 'farma',
      cancha: 'boisko',
      recámara: 'sypialnia',
      despacho: 'gabinet',
      anecdotario: 'dziennik wspomnień',
      bitácora: 'dziennik podróży',
      respaldo: 'kopia zapasowa',
      créditos: 'kredyty',
      'ejemplo de fábrica': 'gotowy przykład',
    },
  },

  id: {
    nombre: 'indonesio (id-ID)',
    registro:
      'Trata al usuario de «kamu», nunca de «Anda»: es una app personal y cercana, no ' +
      'un trámite. Indonesio corriente de app (el de Gojek o Duolingo), sin jerga de ' +
      'Yakarta ni registro burocrático; los préstamos ya asentados (level, backup → ' +
      'cadangan solo si es natural) se usan como los usa el software indonesio.',
    terminos: {
      casa: 'rumah',
      cuarto: 'ruangan',
      mapa: 'peta',
      plantilla: 'templat',
      objeto: 'objek',
      meta: 'target',
      plan: 'rencana',
      paso: 'langkah',
      cronograma: 'linimasa',
      racha: 'runtunan',
      insignia: 'lencana',
      rango: 'pangkat',
      nivel: 'level',
      asistente: 'asisten',
      mascota: 'maskot',
      ámbito: 'bidang',
      rutina: 'rutinitas',
      hábito: 'kebiasaan',
      huerto: 'kebun sayur',
      granja: 'peternakan',
      cancha: 'lapangan',
      recámara: 'kamar tidur',
      despacho: 'ruang kerja',
      anecdotario: 'buku kenangan',
      bitácora: 'jurnal perjalanan',
      respaldo: 'cadangan',
      créditos: 'kredit',
      'ejemplo de fábrica': 'contoh siap pakai',
    },
  },

  nl: {
    nombre: 'neerlandés (nl-NL)',
    registro:
      'Trata al usuario de «je/jij», nunca de «u»: es una app personal y el «je» es el ' +
      'registro normal de las apps cercanas en neerlandés. Botones y órdenes en ' +
      'imperativo corto («Opslaan», «Verwijderen»), como el software neerlandés ' +
      'corriente. Evita el anglicismo cuando exista la palabra neerlandesa asentada.',
    terminos: {
      casa: 'huis',
      cuarto: 'kamer',
      mapa: 'kaart',
      plantilla: 'sjabloon',
      objeto: 'object',
      meta: 'doel',
      plan: 'plan',
      paso: 'stap',
      cronograma: 'planning',
      racha: 'reeks',
      insignia: 'badge',
      rango: 'rang',
      nivel: 'niveau',
      asistente: 'assistent',
      mascota: 'mascotte',
      ámbito: 'gebied',
      rutina: 'routine',
      hábito: 'gewoonte',
      huerto: 'moestuin',
      granja: 'boerderij',
      cancha: 'veld',
      recámara: 'slaapkamer',
      despacho: 'werkkamer',
      anecdotario: 'herinneringsdagboek',
      bitácora: 'logboek',
      respaldo: 'back-up',
      créditos: 'credits',
      'ejemplo de fábrica': 'kant-en-klaar voorbeeld',
    },
  },
}

/**
 * Decisiones de CONTENIDO que no caben en una tabla de términos.
 *
 * El año demo está escrito desde una vida concreta (Pep@, hispanohablante, que
 * ahorra un año para irse tres semanas a Japón y estudia inglés). Traducirlo
 * palabra por palabra deja escenas imposibles: un japonés no viaja a Japón a
 * practicar japonés. Aquí se decide UNA VEZ qué se adapta, porque si no cada
 * sesión de contenido improvisa distinto y las apps dejan de concordar entre sí.
 *
 * Regla que las gobierna a todas: se adapta la CULTURA (moneda, comida, lugares,
 * idioma que se estudia), nunca lo que PASÓ (los días, las cifras de la rodilla,
 * el orden de los hechos, el tono de cada entrada).
 */
export const DECISIONES = {
  /**
   * (a) La arroba de género: «Pep@», «inquiet@», «list@».
   *
   * Es un guiño del español que no viaja. No se calca ni se inventa un signo
   * nuevo: se resuelve por idioma.
   */
  genero: {
    politica:
      'El nombre «Pep@» se escribe SIN la arroba en todos los idiomas nuevos: transcríbelo ' +
      'como nombre propio corto y neutro. En los adjetivos con arroba («inquiet@»), REESCRIBE ' +
      'la frase para esquivar la forma marcada — un sustantivo, una construcción impersonal o ' +
      'un verbo — en vez de elegir masculino o femenino.',
    porIdioma: {
      ja: 'Desaparece sola: el japonés no marca género en el adjetivo. Escribe la frase natural.',
      zh: 'Desaparece sola: el chino no marca género en el adjetivo. Escribe la frase natural.',
      ko: 'Desaparece sola: el coreano no marca género en el adjetivo. Escribe la frase natural.',
      ru: 'El ruso SÍ marca género en adjetivos y en el pasado del verbo: reescribe con sustantivo ' +
        'o con construcción impersonal («хочется», «получилось») para no fijar el género del usuario.',
      hi: 'El hindi marca género hasta en el verbo: reescribe con sustantivo o con construcción ' +
        'impersonal («लगता है», «हो गया») en vez de elegir forma masculina o femenina.',
      ar: 'El árabe marca género en verbo, adjetivo y pronombre: prefiere la forma nominal ' +
        '(«التسجيل», «المتابعة») a la conjugada, y evita la doble forma «بك/بكِ».',
      tr: 'Desaparece sola: el turco no marca género gramatical. Escribe la frase natural.',
      id: 'Desaparece sola: el indonesio no marca género gramatical. Escribe la frase natural.',
      nl: 'Desaparece casi sola: el adjetivo neerlandés no marca el género natural. Escribe la ' +
        'frase natural y evita «hij/zij» para el yo.',
      pl: 'El polaco marca género en el pasado del verbo y en el adjetivo: reescribe con ' +
        'sustantivo o construcción impersonal («udało się», «warto») para no fijar el género ' +
        'del usuario.',
    },
  },

  /**
   * (b) El viaje del año demo. En la rama japonesa el destino CAMBIA; en chino y
   * coreano se queda en Japón pero el tramo de avión y la moneda no cuadran.
   */
  viaje: {
    original:
      'Tres semanas por Japón (Tokio, Hakone, Kioto, Nara, Osaka, Hiroshima) tras ahorrar ' +
      '2.600 € durante un año, con pase de tren de 14 días, vuelo largo con escala en Helsinki ' +
      'y un cuaderno de frases de supervivencia en japonés.',
    ja:
      'DESTINO NUEVO: México (decidido por el usuario el 13 ago 2026; sustituye a la decisión ' +
      'anterior de España) — Ciudad de México, Teotihuacán, Oaxaca, San Miguel de Allende, Mérida ' +
      'y Chichén Itzá (mismo reparto de días y mismo número de paradas que el itinerario ' +
      'original). Es el viaje INVERSO al de la rama española (Pep viaja de Japón a México), lo ' +
      'que mantiene todas las anécdotas simétricas. Qué se adapta:\n' +
      '  · Idioma de supervivencia: ESPAÑOL en vez de japonés (igual que con el destino anterior; ' +
      'afecta al segundo perfil del cuarto Idiomas y a las frases sueltas: «dónde está la ' +
      'estación», «cuánto cuesta», «sin carne, por favor»).\n' +
      '  · Moneda: ahorra en YENES (≈390.000 ¥) y gasta en PESOS MEXICANOS durante el viaje ' +
      '(≈49.000 $ MXN al cambio ≈8 ¥/peso; las cifras del ahorro NO cambian, solo la moneda de ' +
      'los gastos en destino).\n' +
      '  · Comida: ramen, udon y okonomiyaki → tacos al pastor, tamales y mole; «comer de pie en ' +
      'un mercado» se conserva (los mercados de Oaxaca, una taquería de pie).\n' +
      '  · Lugares: templos y toriis → pirámides y cenotes; Fushimi Inari al amanecer → ' +
      'Teotihuacán a las seis de la mañana; el Fuji desde Hakone → el Popocatépetl desde Puebla.\n' +
      '  · Los ciervos de Nara → las iguanas de las ruinas o los coatís: misma escena del pequeño ' +
      'desastre simpático con un animal, sin cambiar el día ni lo que Pep@ siente al contarlo.\n' +
      '  · Tren: el pase de 14 días pasa a ser autobuses de primera clase (ADO) y un vuelo ' +
      'interno. El vuelo largo se conserva (Narita–Ciudad de México, ~13 horas, directo: la ' +
      'escala en Helsinki desaparece pero la noche en el avión se queda).',
    zh:
      'Se queda en Japón (destino natural desde China), con dos retoques: el vuelo es DIRECTO y ' +
      'corto (tres horas, sin escala en Helsinki ni noche en el avión) y el ahorro se cuenta en ' +
      'yuanes; el resto del itinerario y de las anécdotas no se toca.',
    ko:
      'Se queda en Japón (destino natural desde Corea), con dos retoques: el vuelo es DIRECTO y ' +
      'corto (dos horas, sin escala ni catorce horas de asiento) y el ahorro se cuenta en wones; ' +
      'el resto del itinerario y de las anécdotas no se toca.',
    tr:
      'Se queda en Japón con el itinerario intacto; el ahorro se cuenta en LIRAS ' +
      '(≈×45 sobre el euro: 2.600 € → 117.000 ₺, redondeo natural). El vuelo sigue siendo ' +
      'largo pero DIRECTO (Estambul–Tokio, ~11 horas): la escala en Helsinki desaparece y ' +
      'la noche en el avión se queda.',
    id:
      'Se queda en Japón con el itinerario intacto; el ahorro se cuenta en RUPIAS ' +
      'INDONESIAS (≈×17.500 sobre el euro: 2.600 € → 45,5 millones Rp; escribe las cifras ' +
      'grandes como las escribe el software indonesio: «Rp45,5 juta»). El vuelo es ' +
      'Yakarta–Tokio directo (~7 horas): la escala en Helsinki y la noche entera en el ' +
      'avión desaparecen, el madrugón se queda.',
    pl:
      'Se queda en Japón con el vuelo largo y el itinerario intactos; el ahorro se cuenta en ' +
      'ESLOTIS (≈×4,25 sobre el euro: 2.600 € → 11.000 zł, redondeo natural).',
    resto:
      'pt, fr, de, it, nl, ru, hi y ar mantienen Japón, el vuelo largo y todo el itinerario: ' +
      'solo cambia la moneda del ahorro a la del país del idioma (nl ya es euro: no cambia nada, ' +
      'como fr/de/it).',
  },

  /**
   * (c) Qué idioma estudia Pep@ en el cuarto Idiomas (`PERFIL_PRINCIPAL` de
   * `src/rooms/idiomas/demo.ts`). Nadie estudia su propia lengua.
   */
  perfilPrincipal: {
    politica:
      'El perfil PRINCIPAL es el INGLÉS en todos los idiomas de la interfaz salvo en la rama ' +
      'inglesa, donde es el español. El nombre y la bandera se escriben en el idioma de la ' +
      'interfaz; el código de idioma (en-US / es-ES) no cambia.',
    segundoPerfil:
      'El segundo perfil («de supervivencia», el que se estudia para el viaje y casi se abandona ' +
      'al volver) es el JAPONÉS en todas las ramas menos en la japonesa, donde es el ESPAÑOL, ' +
      'coherente con el destino decidido arriba.',
  },

  /**
   * (d) Cifras: el árabe y el hindi tienen dos juegos de dígitos en uso.
   */
  cifras: {
    ar:
      'Cifras OCCIDENTALES (0-9), no las índico-arábigas orientales (٠١٢٣): la app está llena de ' +
      'gráficas, tablas y cantidades que se formatean con Intl, y mezclar juegos de dígitos entre ' +
      'el texto y los números calculados se vería incoherente. El locale es ar-SA con numeración ' +
      'latina.',
    hi:
      'Cifras OCCIDENTALES (0-9), no las devanagari (०१२३): es lo corriente en el uso digital ' +
      'indio y lo que devuelve Intl con hi-IN.',
  },

  /**
   * (e) Misión «catálogos 2026» (ago 2026): el catálogo de ejercicio, los
   * pilares de la biblioteca, la siembra de cocina/garaje, las cartas y el
   * Ahorcado. Reglas del dominio, cerradas ANTES de traducir.
   */
  catalogos2026: {
    ejercicio:
      'Nombres de ejercicio con la TERMINOLOGÍA DE GIMNASIO ASENTADA de cada idioma, no ' +
      'traducción literal: los préstamos universales se conservan (burpees, hip thrust, face ' +
      'pull, HIIT, plank/plancha según el uso local, curl, squat/sentadilla según el uso local); ' +
      'el CJK usa sus préstamos en katakana/hangul cuando son lo corriente en apps de fitness. ' +
      'Las posturas de yoga usan el nombre con que se enseñan allí (Cat-Cow, saludo al sol, ' +
      'Savasana queda). OJO tr: «kalça» es a la vez cadera y glúteo — para glúteos usa «kalça ' +
      'kasları» o el término de gimnasio asentado, y desambigua por contexto. Los NOMBRES son ' +
      'texto de BOTÓN/lista: cortos.',
    cocina:
      'El recetario de fábrica sigue el canon del recetario del demo (bitácora de TRADUCIR.md): ' +
      'los platos con nombre propio NO se traducen, se adaptan a la grafía local (Tacos al ' +
      'pastor queda; chilaquiles se translitera en ar); «bowl» se traduce en tr/id ' +
      '(kâse/mangkuk) y queda como préstamo en el resto; ingredientes con el término de ' +
      'supermercado local.',
    ahorcado:
      'Las 100 palabras del Ahorcado NO se traducen: se SUSTITUYEN por 100 palabras bonitas y ' +
      'cotidianas de ESE idioma (concretas, ilustrables, sin marcas), en MAYÚSCULAS, de 3 a 12 ' +
      'letras. Cada rama declara su alfabeto (el teclado del juego); los diacríticos que no ' +
      'estén en el alfabeto deben plegarse a una tecla (Á→A). SOLO escrituras alfabéticas: ' +
      'pt/fr/de/it/tr/id/pl/nl con latino (más las letras propias que declaren) y ru con ' +
      'cirílico; ja/zh/ko/ar/hi NO llevan banco y caen al inglés a propósito.',
    preguntas:
      'Las preguntas de los mazos de cartas son de sobremesa entre amigos: naturales y de ' +
      'registro hablado en cada idioma (con el tratamiento del glosario), nunca calco. Mismo ' +
      'ORDEN e índice que el español.',
    pilares:
      'El índice enciclopédico usa la terminología académica corriente del idioma; los títulos ' +
      'son frases nominales cortas.',
  },
}

/** Las decisiones que afectan a un idioma, en texto para el prompt. */
export function decisionesDe(id) {
  const lineas = []
  const genero = DECISIONES.genero.porIdioma[id]
  if (genero) lineas.push(`GÉNERO (la arroba de «Pep@»): ${DECISIONES.genero.politica}\n${genero}`)
  const viaje = DECISIONES.viaje[id]
  if (viaje) lineas.push(`EL VIAJE DEL AÑO DEMO\n${viaje}`)
  const cifras = DECISIONES.cifras[id]
  if (cifras) lineas.push(`CIFRAS\n${cifras}`)
  return lineas.join('\n\n')
}

/** El system prompt completo de un idioma (estable: se cachea entre lotes). */
export function sistemaDe(id) {
  const idioma = IDIOMAS[id]
  if (!idioma) throw new Error(`idioma sin glosario: ${id}`)
  const decisiones = decisionesDe(id)
  const glosario = Object.entries(idioma.terminos)
    .map(([es, destino]) => `  ${es} → ${destino}`)
    .join('\n')
  return `${VOZ}

IDIOMA DE DESTINO: ${idioma.nombre}

TRATAMIENTO
${idioma.registro}

GLOSARIO OBLIGATORIO (concepto en español → palabra que debes usar)
${glosario}

Cuando un texto use uno de estos conceptos, usa esa palabra y no un sinónimo:
la misma pantalla se traduce en tandas distintas y tienen que concordar.${
    decisiones ? `\n\nDECISIONES YA TOMADAS (no las replantees)\n${decisiones}` : ''
  }`
}
