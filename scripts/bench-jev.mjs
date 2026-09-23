/**
 * Banco del piloto de Jev (TypeSafe AI) para el chat de la casa: mide si decide
 * bien QUÉ APPS toca un mensaje y si es un REGISTRO SIMPLE, en los 16 idiomas,
 * con su latencia y su costo. Es el sí/no de docs/COSTOS.md antes de encender
 * `IA_CHAT_JEV_PCT` o las respuestas rápidas para usuarios reales.
 *
 * Las preguntas son las mismas que `porJev()` en supabase/functions/ia-chat:
 * si cambian allá, cámbialas aquí.
 *
 *   node --env-file=.env.local scripts/bench-jev.mjs           → solo Jev (Cloudflare o TYPESAFE_API_KEY)
 *   node --env-file=.env.local scripts/bench-jev.mjs --haiku   → además Haiku 4.5 (ANTHROPIC_API_KEY)
 *   node scripts/bench-jev.mjs --dry                           → no llama a nadie
 *
 * Costo de una pasada: Jev < $0.001; con --haiku ~ $0.05.
 */

const DRY = process.argv.includes('--dry')
const CON_HAIKU = process.argv.includes('--haiku')
const MODELO_JEV = process.env.JEV_MODEL ?? 'jev-latest'
const POR_CF = !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_AI_TOKEN
const UMBRAL_APP = 0.3
const UMBRAL_SIMPLE = 0.9

/** Apps de un usuario típico, descritas como las describe `appsRuteo()` en ia.ts. */
const APPS = [
  { id: 'cocina', descripcion: 'Cocina: comidas, calorías, agua bebida, recetas, lista de compras y dietas', capturable: true },
  { id: 'despacho', descripcion: 'Finanzas: gastos e ingresos con monto y categoría', capturable: true },
  { id: 'descanso', descripcion: 'Descanso: horas de sueño y calidad del descanso', capturable: true },
  { id: 'ejercicio', descripcion: 'Ejercicio: sesiones de entrenamiento con duración y tipo, series y rutinas', capturable: true },
  { id: 'jardin', descripcion: 'Jardín: sesiones de meditación o respiración y estado de ánimo', capturable: true },
  { id: 'entretenimiento', descripcion: 'Entretenimiento: películas, series, libros y juegos vistos o por ver', capturable: true },
  { id: 'agenda', descripcion: 'Agenda: pendientes, citas, medicamentos, contactos y cumpleaños', capturable: false },
  { id: 'idiomas', descripcion: 'Idiomas: vocabulario y práctica de un idioma', capturable: true },
  { id: 'biblioteca', descripcion: 'Biblioteca: temas estudiados y sesiones de estudio', capturable: false },
  { id: 'hobbies', descripcion: 'Hobbies: sesiones y proyectos de pasatiempos', capturable: true },
]

/** [idioma, mensaje, apps esperadas, ¿registro simple?]. Apps de más no cuentan como fallo. */
const CASOS = [
  ['es', 'gasté 250 en el súper', ['despacho'], true],
  ['es', 'dormí 7 horas y media', ['descanso'], true],
  ['es', 'corrí 30 minutos y luego comí una ensalada', ['ejercicio', 'cocina'], true],
  ['es', '¿cuánto llevo gastado esta semana?', ['despacho'], false],
  ['es', '¿por qué el cielo es azul?', [], false],
  ['en', 'Spent 40 dollars on gas', ['despacho'], true],
  ['en', 'Drank 2 liters of water today', ['cocina'], true],
  ['en', 'Meditated for 10 minutes, feeling calm', ['jardin'], true],
  ['en', 'Remind me to call the dentist on Friday', ['agenda'], false],
  ['en', 'Can you suggest a good sci-fi series?', ['entretenimiento'], false],
  ['pt', 'Gastei 80 reais no almoço', ['despacho'], true],
  ['pt', 'Dormi mal, só 5 horas', ['descanso'], true],
  ['pt', 'Treinei pernas por uma hora', ['ejercicio'], true],
  ['pt', 'Qual receita posso fazer com frango e arroz?', ['cocina'], false],
  ['pt', 'Terminei de ler Dom Casmurro', ['entretenimiento'], true],
  ['fr', "J'ai dépensé 35 euros au restaurant", ['despacho'], true],
  ['fr', "J'ai nagé 45 minutes", ['ejercicio'], true],
  ['fr', "J'ai regardé Inception hier soir", ['entretenimiento'], true],
  ['fr', 'Aide-moi à planifier mes repas de la semaine', ['cocina'], false],
  ['fr', "Qu'est-ce qu'un trou noir ?", [], false],
  ['de', 'Habe 12 Euro für Kaffee ausgegeben', ['despacho'], true],
  ['de', 'Heute 8 Stunden geschlafen', ['descanso'], true],
  ['de', 'Eine Stunde Gitarre geübt', ['hobbies'], true],
  ['de', 'Wie viel Protein sollte ich am Tag essen?', ['cocina'], false],
  ['de', 'Erstelle mir einen Trainingsplan für drei Tage', ['ejercicio'], false],
  ['it', 'Ho speso 60 euro di benzina', ['despacho'], true],
  ['it', 'Ho mangiato una pizza margherita a cena', ['cocina'], true],
  ['it', 'Ho fatto 20 minuti di yoga e poi ho meditato', ['ejercicio', 'jardin'], true],
  ['it', 'Consigliami un libro giallo', ['entretenimiento'], false],
  ['it', 'Oggi mi sento un po’ giù, possiamo parlare?', [], false],
  ['nl', 'Ik heb 30 euro uitgegeven aan boodschappen', ['despacho'], true],
  ['nl', 'Vannacht maar 6 uur geslapen', ['descanso'], true],
  ['nl', 'Vandaag 5 km hardgelopen', ['ejercicio'], true],
  ['nl', 'Hoeveel heb ik deze maand uitgegeven aan eten?', ['despacho'], false],
  ['nl', 'Vertel me een grap', [], false],
  ['pl', 'Wydałem 100 zł na buty', ['despacho'], true],
  ['pl', 'Wypiłem trzy szklanki wody', ['cocina'], true],
  ['pl', 'Obejrzałem dwa odcinki serialu', ['entretenimiento'], true],
  ['pl', 'Ułóż mi plan nauki angielskiego', ['idiomas'], false],
  ['pl', 'Dlaczego liście zmieniają kolor jesienią?', [], false],
  ['tr', 'Markette 450 lira harcadım', ['despacho'], true],
  ['tr', 'Dün gece 7 saat uyudum', ['descanso'], true],
  ['tr', 'Kahvaltıda iki yumurta yedim', ['cocina'], true],
  ['tr', 'Bana kolay bir akşam yemeği tarifi öner', ['cocina'], false],
  ['tr', 'İspanyolca "teşekkürler" nasıl denir?', ['idiomas'], false],
  ['ru', 'Потратил 500 рублей на такси', ['despacho'], true],
  ['ru', 'Сегодня позанимался в зале полтора часа', ['ejercicio'], true],
  ['ru', 'Выучил 15 новых слов по-испански', ['idiomas'], true],
  ['ru', 'Сколько калорий в банане?', ['cocina'], false],
  ['ru', 'Запиши меня к врачу на понедельник', ['agenda'], false],
  ['ar', 'أنفقت 50 ريالاً على الغداء', ['despacho'], true],
  ['ar', 'نمت ست ساعات فقط', ['descanso'], true],
  ['ar', 'مشيت ساعة في الحديقة', ['ejercicio'], true],
  ['ar', 'ما هي عاصمة أستراليا؟', [], false],
  ['ar', 'اقترح عليّ فيلماً كوميدياً', ['entretenimiento'], false],
  ['hi', 'मैंने किराने पर 300 रुपये खर्च किए', ['despacho'], true],
  ['hi', 'आज 20 मिनट ध्यान किया', ['jardin'], true],
  ['hi', 'रात को 8 घंटे सोया', ['descanso'], true],
  ['hi', 'मुझे वजन घटाने के लिए डाइट प्लान बनाओ', ['cocina'], false],
  ['hi', 'इंद्रधनुष कैसे बनता है?', [], false],
  ['ja', 'ランチに1200円使った', ['despacho'], true],
  ['ja', '昨夜は6時間寝た', ['descanso'], true],
  ['ja', 'ジムで1時間トレーニングした', ['ejercicio'], true],
  ['ja', '今週の支出を教えて', ['despacho'], false],
  ['ja', 'おすすめのアニメはある？', ['entretenimiento'], false],
  ['ko', '커피에 5000원 썼어', ['despacho'], true],
  ['ko', '오늘 물 2리터 마셨어', ['cocina'], true],
  ['ko', '30분 동안 요가했어', ['ejercicio'], true],
  ['ko', '다음 주 화요일에 치과 예약 잡아줘', ['agenda'], false],
  ['ko', '블랙홀은 어떻게 생겨?', [], false],
  ['zh', '打车花了35块', ['despacho'], true],
  ['zh', '昨晚睡了7个小时', ['descanso'], true],
  ['zh', '晚饭吃了一碗牛肉面', ['cocina'], true],
  ['zh', '帮我制定一个跑步计划', ['ejercicio'], false],
  ['zh', '为什么海水是咸的？', [], false],
  ['id', 'Habis 50 ribu buat makan siang', ['despacho'], true],
  ['id', 'Tidur cuma 5 jam semalam', ['descanso'], true],
  ['id', 'Lari pagi 3 km lalu minum jus jeruk', ['ejercicio', 'cocina'], true],
  ['id', 'Rekomendasikan novel fantasi yang bagus', ['entretenimiento'], false],
  ['id', 'Berapa banyak aku habiskan bulan ini?', ['despacho'], false],
]

/** Mismas preguntas que `porJev()` de ia-chat. */
function preguntasJev() {
  const q = {
    simple: {
      type: 'noul',
      instructions:
        'El último mensaje del usuario SOLO informa algo que ya hizo o midió (un gasto, una comida, horas de sueño, un ejercicio, una sesión…) para que se anote, sin preguntar, pedir consejo ni pedir crear, cambiar o explicar nada.',
    },
  }
  APPS.forEach((a, i) => {
    q[`app_${i}`] = {
      type: 'noul',
      instructions: `El último mensaje del usuario registra, pide o consulta algo de esta app: ${a.descripcion}`,
    }
  })
  return q
}

async function porJev(texto) {
  const t0 = Date.now()
  const peticion = { state: { mensajes: [{ rol: 'usuario', texto }] }, questions: preguntasJev() }
  // Igual que ia-chat: por Cloudflare Workers AI si hay credenciales, si no directo a TypeSafe.
  const resp = POR_CF
    ? await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_AI_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'typesafe/jev', input: peticion }),
      })
    : await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODELO_JEV, ...peticion }),
      })
  if (!resp.ok) throw new Error(`jev ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
  const crudo = await resp.json()
  const data = POR_CF ? (crudo.result?.result ?? {}) : crudo
  const p = (k) => Number(data.answers?.[k]?.noul ?? 0)
  return {
    apps: Object.fromEntries(APPS.map((a, i) => [a.id, p(`app_${i}`)])),
    simple: p('simple'),
    ms: Date.now() - t0,
    usd: (Number(data.usage?.input_tokens ?? 0) * 0.042) / 1e6,
    modelo: data.model,
  }
}

async function porHaiku(texto) {
  const t0 = Date.now()
  const system =
    'Clasifica el mensaje del usuario de una app de vida personal. Responde SOLO un JSON ' +
    '{"apps":[ids],"simple":true|false}. apps = las apps que el mensaje registra, pide o consulta, de esta lista:\n' +
    APPS.map((a) => `- ${a.id}: ${a.descripcion}`).join('\n') +
    '\nsimple = true solo si el mensaje SOLO informa algo que ya hizo o midió para anotarlo, sin preguntar ni pedir nada.'
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 100, system, messages: [{ role: 'user', content: texto }] }),
  })
  if (!resp.ok) throw new Error(`haiku ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
  const data = await resp.json()
  const crudo = data.content?.find((b) => b.type === 'text')?.text ?? '{}'
  let json = { apps: [], simple: false }
  try {
    json = JSON.parse(crudo.slice(crudo.indexOf('{'), crudo.lastIndexOf('}') + 1))
  } catch {
    /* respuesta inservible: cuenta como fallo */
  }
  const elegidas = new Set(Array.isArray(json.apps) ? json.apps : [])
  return {
    apps: Object.fromEntries(APPS.map((a) => [a.id, elegidas.has(a.id) ? 1 : 0])),
    simple: json.simple === true ? 1 : 0,
    ms: Date.now() - t0,
    usd: ((data.usage?.input_tokens ?? 0) * 1 + (data.usage?.output_tokens ?? 0) * 5) / 1e6,
  }
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '—')
const percentil = (xs, q) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))] ?? 0

async function evaluar(nombre, decidir) {
  const r = { recall: 0, conApps: 0, extras: 0, rapidas: 0, rapidasBien: 0, simplesReales: 0, simplesCazados: 0, ms: [], usd: 0, fallos: 0 }
  const errores = []
  const porIdioma = {}
  for (const [idioma, texto, esperadas, simple] of CASOS) {
    let d
    try {
      d = await decidir(texto)
    } catch (e) {
      r.fallos++
      errores.push(`${idioma} «${texto}»: ${e.message}`)
      continue
    }
    r.ms.push(d.ms)
    r.usd += d.usd
    const elegidas = APPS.filter((a) => d.apps[a.id] >= UMBRAL_APP).map((a) => a.id)
    const faltan = esperadas.filter((id) => !elegidas.includes(id))
    if (esperadas.length) {
      r.conApps++
      if (!faltan.length) r.recall++
    }
    r.extras += elegidas.filter((id) => !esperadas.includes(id)).length
    // Misma regla que ia-chat para devolver una respuesta rápida.
    const seguras = APPS.filter((a) => d.apps[a.id] >= 0.5)
    const rapida = d.simple >= UMBRAL_SIMPLE && seguras.length > 0 && seguras.every((a) => a.capturable)
    if (simple) r.simplesReales++
    if (rapida) {
      r.rapidas++
      if (simple) r.rapidasBien++
      if (simple) r.simplesCazados++
    }
    porIdioma[idioma] ??= { bien: 0, total: 0 }
    porIdioma[idioma].total++
    if (!faltan.length && !(rapida && !simple)) porIdioma[idioma].bien++
    if (faltan.length) errores.push(`${idioma} «${texto}»: faltó ${faltan.join(', ')}`)
    if (rapida && !simple) errores.push(`${idioma} «${texto}»: respuesta rápida SIN ser registro simple`)
  }
  console.log(`\n== ${nombre} ==`)
  console.table({
    'recall de apps (≥98 %)': pct(r.recall, r.conApps),
    'apps de más por mensaje': (r.extras / CASOS.length).toFixed(2),
    'precisión de rápidas (≥97 %)': pct(r.rapidasBien, r.rapidas),
    'registros simples cazados': pct(r.simplesCazados, r.simplesReales),
    'ms p50': percentil(r.ms, 0.5),
    'ms p95': percentil(r.ms, 0.95),
    'USD total': r.usd.toFixed(5),
    fallos: r.fallos,
  })
  console.log('Por idioma (mensajes sin fallo):', Object.entries(porIdioma).map(([k, v]) => `${k} ${v.bien}/${v.total}`).join(' · '))
  if (errores.length) console.log('Errores:\n  ' + errores.join('\n  '))
}

if (DRY) {
  console.log(`${CASOS.length} mensajes en ${new Set(CASOS.map((c) => c[0])).size} idiomas, ${APPS.length} apps.`)
} else {
  if (!POR_CF && !process.env.TYPESAFE_API_KEY) throw new Error('Faltan CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN o TYPESAFE_API_KEY en .env.local')
  await evaluar(`Jev (${MODELO_JEV})`, porJev)
  if (CON_HAIKU) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY para --haiku')
    await evaluar('Haiku 4.5 (clasificación)', porHaiku)
  }
}
