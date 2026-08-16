/**
 * Mide el COSTO REAL de cada operación de IA para calibrar la tabla de créditos.
 *
 * Ejecuta una muestra representativa de cada `op` contra la API con la clave
 * propia, con prompts del mismo tamaño que los de la app, y vuelca tokens reales
 * y USD. Es la fuente de los números de docs/COSTOS.md: sin esto la tabla de
 * `costo_op()` son estimaciones.
 *
 *   set ANTHROPIC_API_KEY=sk-ant-...   (PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-...")
 *   node scripts/medir-costos.mjs
 *   node scripts/medir-costos.mjs --dry     → no llama a la API, solo imprime el plan
 *   node scripts/medir-costos.mjs --reps 3  → repite cada op (la salida varía mucho)
 *   node scripts/medir-costos.mjs --op texto_largo   → solo esa operación
 *
 * Con Node ≥20 la clave puede venir del archivo:
 *   node --env-file=.env.local scripts/medir-costos.mjs
 *
 * Coste de una pasada completa: ~0.15 USD (el modelo3d es casi todo).
 */

const DRY = process.argv.includes('--dry')
const REPS = Number(process.argv[process.argv.indexOf('--reps') + 1]) || 1
/** `--op texto_largo` mide una sola operación: recalibrar una tarifa sin pagar el modelo3d. */
const SOLO = process.argv.includes('--op') ? process.argv[process.argv.indexOf('--op') + 1] : null

/** Precio por millón de tokens. Ver docs/COSTOS.md § Precios de proveedor. */
const TARIFA = {
  'claude-haiku-4-5': { entrada: 1.0, salida: 5.0 },
  // Precio PLENO: el introductorio ($2/$10) vence el 31-ago-2026 y calibrar con
  // él dejaría la tabla corta desde el día siguiente.
  'claude-sonnet-5': { entrada: 3.0, salida: 15.0 },
}

/** Lo que cobra `costo_op()` hoy, para comparar contra lo medido. */
const CREDITOS = { chat: 1, texto: 1, vision: 1, texto_largo: 4, modelo3d: 10, imagen: 3, imagen_alta: 10, voz: 1, tts: 3, pdf: 4 }
const USD_POR_CREDITO = 0.005

/** Relleno determinista para simular prompts del tamaño real de la app. */
function relleno(palabras) {
  const base = 'rutina meta receta ejercicio idioma finanzas descanso hobby viaje lectura '
  return base.repeat(Math.ceil(palabras / 10)).split(' ').slice(0, palabras).join(' ')
}

/**
 * Una entrada por operación, dimensionada como el call-site más representativo.
 * `system`/`user` se rellenan para que los tokens de ENTRADA se parezcan a los
 * reales; `max` es el tope que impone el proxy para esa op.
 */
const CASOS = [
  {
    op: 'chat',
    modelo: 'claude-haiku-4-5',
    max: 2048, // TOPES.chat del proxy; con 4096 la medición sobreestimaba la op
    // Chat de la casa SIN intención de editor: tools de captura + system + historial.
    system: `Eres el asistente de la casa. ${relleno(700)}`,
    user: 'Apunta que hoy comí pollo con arroz y fui a correr 5 km',
  },
  {
    op: 'texto',
    modelo: 'claude-haiku-4-5',
    max: 1500,
    system: `Eres un chef. Devuelve una receta en JSON. ${relleno(150)}`,
    user: 'Una receta de pasta con champiñones para dos personas',
  },
  {
    op: 'texto_largo',
    modelo: 'claude-haiku-4-5',
    max: 4096,
    // Plan IA: la llamada con más datos reales de la BD (guía + contexto + material).
    system: `Eres un planificador. Devuelve un cronograma en JSON. ${relleno(1800)}`,
    user: 'Un plan de 8 semanas para correr 10 km, con progresión semanal y descansos',
  },
  {
    op: 'modelo3d',
    modelo: 'claude-sonnet-5',
    max: 8192,
    calidad: true,
    system: `Devuelve un arreglo JSON de piezas primitivas. ${relleno(600)}`,
    user: 'una lámpara de escritorio con brazo articulado',
  },
]

async function medir(caso) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY')
  const t0 = Date.now()
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: caso.modelo,
      max_tokens: caso.max,
      ...(caso.calidad
        ? { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } }
        : {}),
      system: caso.system,
      messages: [{ role: 'user', content: caso.user }],
    }),
  })
  if (!resp.ok) throw new Error(`http ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
  const data = await resp.json()
  return {
    entrada: data.usage?.input_tokens ?? 0,
    salida: data.usage?.output_tokens ?? 0,
    ms: Date.now() - t0,
  }
}

function usd(caso, m) {
  const t = TARIFA[caso.modelo]
  return (m.entrada * t.entrada + m.salida * t.salida) / 1e6
}

const filas = []
for (const caso of SOLO ? CASOS.filter((c) => c.op === SOLO) : CASOS) {
  if (DRY) {
    console.log(`${caso.op.padEnd(12)} ${caso.modelo}  max=${caso.max}`)
    continue
  }
  const medidas = []
  for (let i = 0; i < REPS; i++) {
    try {
      medidas.push(await medir(caso))
    } catch (e) {
      console.error(`${caso.op}: ${e.message}`)
    }
  }
  if (!medidas.length) continue
  const media = (f) => Math.round(medidas.reduce((a, m) => a + f(m), 0) / medidas.length)
  const m = { entrada: media((x) => x.entrada), salida: media((x) => x.salida), ms: media((x) => x.ms) }
  const coste = usd(caso, m)
  filas.push({
    op: caso.op,
    entrada: m.entrada,
    salida: m.salida,
    seg: (m.ms / 1000).toFixed(1),
    usd: coste.toFixed(4),
    creditos_reales: (coste / USD_POR_CREDITO).toFixed(1),
    creditos_cobrados: CREDITOS[caso.op],
  })
}

if (!DRY) {
  console.table(filas)
  console.log(
    '\nSi `creditos_reales` supera a `creditos_cobrados` de forma sostenida, la op\n' +
      'está subvencionada: ajustar costo_op() en SQL y su espejo en costos.ts.\n' +
      'Las imágenes no se miden aquí (precio plano por imagen, no por token).',
  )
}
