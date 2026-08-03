/**
 * Banco de pruebas del generador de modelos 3D: mide LATENCIA y CALIDAD de cada
 * combinación de modelo/esfuerzo con el mismo prompt que usa la app
 * (`src/core/chat/prompt3d.ts`), para decidir el perfil `calidad` con datos.
 *
 *   set ANTHROPIC_API_KEY=sk-ant-...        (PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-...")
 *   node scripts/bench3d.mjs "un carro deportivo rojo" objeto
 *   node scripts/bench3d.mjs --dry          → solo imprime el prompt, no llama a la API
 *
 * Coste aproximado de una pasada completa: ~0.20 USD.
 */
import { systemModelo3D } from '../src/core/chat/prompt3d.ts'

const DRY = process.argv.includes('--dry')
const TIPO = 'objeto'
/** `--reps N` repite cada combinación N veces (la variabilidad entre tiradas es alta). */
const REPS = Number(process.argv[process.argv.indexOf('--reps') + 1]) || 1
/** `--solo <texto>` filtra las configuraciones por nombre. */
const SOLO = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : ''

/** Piezas a pedir: una compleja (el caso que falla) y una simple de control. */
const PRUEBAS = process.argv.includes('--carro')
  ? ['un carro deportivo rojo']
  : ['un carro deportivo rojo', 'una lámpara de escritorio con brazo articulado']

/** Mismo modelo (Sonnet 5), distinto esfuerzo. Haiku va de referencia. */
const CONFIGS = [
  { id: 'haiku-4-5 (referencia)', model: 'claude-haiku-4-5', thinking: null, effort: null, max: 4096 },
  { id: 'sonnet-5 · high', model: 'claude-sonnet-5', thinking: 'adaptive', effort: 'high', max: 8192 },
  { id: 'sonnet-5 · medium', model: 'claude-sonnet-5', thinking: 'adaptive', effort: 'medium', max: 8192 },
  { id: 'sonnet-5 · low', model: 'claude-sonnet-5', thinking: 'adaptive', effort: 'low', max: 8192 },
  { id: 'sonnet-5 · sin thinking', model: 'claude-sonnet-5', thinking: 'disabled', effort: 'low', max: 4096 },
]

/** Media altura de la pieza sobre su centro (aproximada: con rot manda el radio). */
function mediaAltura(p) {
  const t = p.tam ?? []
  if (p.tipo === 'caja') return (t[1] ?? 0) / 2
  if (p.tipo === 'esfera') return t[1] ?? t[0] ?? 0
  if (p.tipo === 'cono') return (t[1] ?? 0) / 2
  if (p.tipo === 'plano') return (t[1] ?? 0) / 2
  const tumbado = Math.abs(p.rot?.[0] ?? 0) > 0.5 || Math.abs(p.rot?.[2] ?? 0) > 0.5
  return tumbado ? Math.max(t[0] ?? 0, t[1] ?? 0) : (t[2] ?? 0) / 2
}

/** Métricas de calidad geométrica del arreglo devuelto. */
function evaluar(texto) {
  const ini = texto.indexOf('[')
  const fin = texto.lastIndexOf(']')
  if (ini < 0 || fin <= ini) return { ok: false, motivo: 'sin JSON' }
  let piezas
  try {
    piezas = JSON.parse(texto.slice(ini, fin + 1))
  } catch {
    return { ok: false, motivo: 'JSON roto (¿truncado?)' }
  }
  const validas = piezas.filter(
    (p) =>
      ['caja', 'esfera', 'cono', 'cilindro', 'plano'].includes(p.tipo) &&
      Array.isArray(p.pos) && p.pos.length === 3 && Array.isArray(p.tam) && p.tam.length > 0,
  )
  const hundidas = validas.filter((p) => p.pos[1] - mediaAltura(p) < -0.02).length
  const cilindros = validas.filter((p) => p.tipo === 'cilindro')
  const tumbados = cilindros.filter((p) => Math.abs(Math.abs(p.rot?.[2] ?? 0) - 1.5708) < 0.2).length
  const ejes = [0, 1, 2].map((e) => {
    const v = validas.map((p) => p.pos[e])
    return +(Math.max(...v) - Math.min(...v)).toFixed(2)
  })
  return {
    ok: true,
    piezas: validas.length,
    descartadas: piezas.length - validas.length,
    hundidas,
    cilindros: cilindros.length,
    tumbados,
    bbox: `${ejes[0]}×${ejes[1]}×${ejes[2]}`,
  }
}

async function correr(cfg, system, desc) {
  const cuerpo = {
    model: cfg.model,
    max_tokens: cfg.max,
    system,
    messages: [{ role: 'user', content: desc }],
  }
  if (cfg.thinking === 'adaptive') cuerpo.thinking = { type: 'adaptive' }
  if (cfg.thinking === 'disabled') cuerpo.thinking = { type: 'disabled' }
  if (cfg.effort) cuerpo.output_config = { effort: cfg.effort }

  const t0 = Date.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  })
  const ms = Date.now() - t0
  if (!res.ok) return { cfg, ms, error: `${res.status}: ${(await res.text()).slice(0, 160)}` }

  const data = await res.json()
  const texto = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  return {
    cfg,
    ms,
    entrada: data.usage?.input_tokens ?? 0,
    salida: data.usage?.output_tokens ?? 0,
    corte: data.stop_reason,
    ev: evaluar(texto),
  }
}

const system = systemModelo3D(TIPO, 'normal')
console.log(`tipo: ${TIPO}   ·   system: ${system.length} chars   ·   ${PRUEBAS.length} piezas × ${CONFIGS.length} configuraciones\n`)

if (DRY) {
  console.log(system)
  process.exit(0)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta ANTHROPIC_API_KEY en el entorno.')
  process.exit(1)
}

const activas = SOLO ? CONFIGS.filter((c) => c.id.includes(SOLO)) : CONFIGS
const filas = []
for (const desc of PRUEBAS) {
  console.log(`\n### "${desc}"`)
  for (const cfg of activas) {
    for (let rep = 1; rep <= REPS; rep++) {
      process.stdout.write(`  · ${cfg.id.padEnd(24)}${REPS > 1 ? ` #${rep}` : ''} … `)
      const r = await correr(cfg, system, desc)
      r.desc = desc
      if (r.error) console.log(`ERROR ${r.error}`)
      else {
        const e = r.ev
        console.log(
          `${(r.ms / 1000).toFixed(1)}s · ${r.salida} tok · ` +
            (e.ok ? `${e.piezas} piezas, ${e.hundidas} hundidas, ${e.cilindros} cil (${e.tumbados} tumbados)` : e.motivo) +
            (r.corte === 'max_tokens' ? '  ⚠ CORTADO' : ''),
        )
      }
      filas.push(r)
    }
  }
}

console.log('\n' + '='.repeat(90))
console.log('RESUMEN por configuración (promedio de las 2 piezas)')
console.log('-'.repeat(90))
console.log(
  'configuración'.padEnd(26) + 'tiempo'.padStart(9) + 'tok.sal'.padStart(9) +
  'piezas'.padStart(8) + 'hundidas'.padStart(10) + 'ruedas ok'.padStart(11) + '   fallos',
)
for (const cfg of activas) {
  const f = filas.filter((x) => x.cfg.id === cfg.id)
  const buenas = f.filter((x) => !x.error && x.ev.ok)
  const media = (sel) => (buenas.length ? (buenas.reduce((a, x) => a + sel(x), 0) / buenas.length) : 0)
  const fallos = f.length - buenas.length + f.filter((x) => x.corte === 'max_tokens').length
  console.log(
    cfg.id.padEnd(26) +
      `${(media((x) => x.ms) / 1000).toFixed(1)}s`.padStart(9) +
      Math.round(media((x) => x.salida)).toString().padStart(9) +
      media((x) => x.ev.piezas).toFixed(1).padStart(8) +
      media((x) => x.ev.hundidas).toFixed(1).padStart(10) +
      `${buenas.reduce((a, x) => a + x.ev.tumbados, 0)}/${buenas.reduce((a, x) => a + x.ev.cilindros, 0)}`.padStart(11) +
      `   ${fallos || '—'}`,
  )
}
console.log('='.repeat(90))
console.log(
  '\nhundidas = piezas bajo el suelo (menos es mejor) · ruedas ok = cilindros tumbados / total' +
    '\nfallos = respuestas sin JSON válido o cortadas por max_tokens.',
)
