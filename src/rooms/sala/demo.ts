/**
 * Año demo de la sala: el viaje que Pep@ ahorró todo el año y el que viene.
 *
 * Las coordenadas van escritas a mano a propósito: el geocoder pide red y la
 * casa demo tiene que verse igual sin conexión.
 *
 * Regla que hay que respetar: todo lugar POR CONOCER nace con al menos una
 * fila de itinerario. Si no, la hoja de plan crea el «día 1» sola al abrirla y
 * en la casa demo esa escritura dispara el aviso de solo lectura.
 */
import {
  bitacoraViajeRepo,
  diasItinerarioRepo,
  lugaresViajeRepo,
  metasRepo,
  portadasLugarRepo,
  portadasViajeRepo,
  rutasViajeRepo,
} from '../../core/data/repository'
import { isoMasDias } from '../../core/fechaLocal'
import type { CtxDemo } from '../../demo/builders'
import {
  AHORRADO_COREA,
  COREA_EN_DIAS,
  JAPON_INICIO,
  META_COREA,
} from '../../demo/hitosPep'
import { sembrarMetasApp } from '../../demo/metasPep'
import { DEMO_SALA } from './demo.data'

type ClaveLugar =
  | 'tokio' | 'hakone' | 'kawaguchiko' | 'kioto' | 'nara' | 'osaka' | 'hiroshima'
  | 'oaxaca' | 'valle' | 'seul' | 'patagonia' | 'islandia'

/** El mapa de Pep@: coordenadas reales, sin pedirle nada a la red. */
const LUGARES: Record<ClaveLugar, {
  nombre: string
  pais: string
  paisEn: string
  ciudad?: string
  lat: number
  lng: number
  visitado: 0 | 1
  /** Offset del día en que lo visitó (visitados) y en que lo apuntó (todos). */
  visita?: number
  apuntado: number
}> = {
  tokio: { nombre: 'Tokio', pais: 'Japón', paisEn: 'Japan', ciudad: 'Tokio', lat: 35.6762, lng: 139.6503, visitado: 1, visita: JAPON_INICIO, apuntado: -270 },
  hakone: { nombre: 'Hakone', pais: 'Japón', paisEn: 'Japan', lat: 35.2324, lng: 139.1069, visitado: 1, visita: -119, apuntado: -200 },
  kawaguchiko: { nombre: 'Lago Kawaguchi', pais: 'Japón', paisEn: 'Japan', lat: 35.4975, lng: 138.7541, visitado: 1, visita: -118, apuntado: -200 },
  kioto: { nombre: 'Kioto', pais: 'Japón', paisEn: 'Japan', ciudad: 'Kioto', lat: 35.0116, lng: 135.7681, visitado: 1, visita: -117, apuntado: -265 },
  nara: { nombre: 'Nara', pais: 'Japón', paisEn: 'Japan', lat: 34.6851, lng: 135.8048, visitado: 1, visita: -113, apuntado: -198 },
  osaka: { nombre: 'Osaka', pais: 'Japón', paisEn: 'Japan', ciudad: 'Osaka', lat: 34.6937, lng: 135.5023, visitado: 1, visita: -111, apuntado: -198 },
  hiroshima: { nombre: 'Hiroshima', pais: 'Japón', paisEn: 'Japan', lat: 34.3853, lng: 132.4553, visitado: 1, visita: -109, apuntado: -190 },
  oaxaca: { nombre: 'Oaxaca', pais: 'México', paisEn: 'Mexico', ciudad: 'Oaxaca de Juárez', lat: 17.0732, lng: -96.7266, visitado: 1, visita: -280, apuntado: -292 },
  valle: { nombre: 'Valle de Bravo', pais: 'México', paisEn: 'Mexico', lat: 19.1953, lng: -100.131, visitado: 1, visita: -40, apuntado: -46 },
  seul: { nombre: 'Seúl', pais: 'Corea del Sur', paisEn: 'South Korea', ciudad: 'Seúl', lat: 37.5665, lng: 126.978, visitado: 0, apuntado: -12 },
  patagonia: { nombre: 'Patagonia', pais: 'Argentina', paisEn: 'Argentina', lat: -49.3315, lng: -72.8863, visitado: 0, apuntado: -60 },
  islandia: { nombre: 'Reikiavik', pais: 'Islandia', paisEn: 'Iceland', lat: 64.1466, lng: -21.9426, visitado: 0, apuntado: -120 },
}

/** Gasto de cada día en Japón (MXN): suma 25 200 — con el vuelo, la meta. */
const PRESUPUESTO_JAPON = [
  2450, 900, 1100, 1250, 1050, // Tokio
  2600, 1700, // Hakone y Fuji
  1400, 800, 950, 900, 850, 700, // Kioto y Nara
  1200, 950, // Osaka
  1300, 1050, // Hiroshima
  900, 1300, 1100, 750, // vuelta y vuelo
]

/** Los 8 días de Corea: suman los 38 000 de la meta nueva. */
const PRESUPUESTO_COREA = [8200, 3400, 4100, 3800, 5600, 4300, 4800, 3800]

/** Una fila de la hoja de plan tal como la escribió el generador. */
interface FilaPlan {
  n: number
  inicio: string
  destino: string
  hospedaje: string
  actividades: string
  transporte: string
}

/**
 * El contenido se generó en dos tandas y cada una dejó un elemento de relleno
 * en los arrays de la otra: para cada clave repetida se queda la fila con más
 * texto, que siempre es la de verdad.
 */
function unicos<T extends object>(filas: readonly T[], clave: (f: T) => string | number): T[] {
  const peso = (f: T) => Object.values(f).join('').length
  const mejor = new Map<string | number, T>()
  for (const f of filas) {
    const k = clave(f)
    const previa = mejor.get(k)
    if (!previa || peso(f) > peso(previa)) mejor.set(k, f)
  }
  return [...mejor.values()]
}

export async function construirDemoSala(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_SALA, () => import('./demo.data.i18n'))
  // Aquí «es» significa «no es inglés»: los idiomas que todavía no tienen
  // su variante inline leen el español, que es el respaldo de todo.
  const es = ctx.idioma !== 'en'
  // El `as const` del contenido genera tuplas literales distintas por idioma:
  // se copian a un tipo propio para poder trabajarlas.
  const lugaresTxt = unicos<{ clave: string; nota: string }>([...datos.lugares], (l) => l.clave)
  const japon = unicos<FilaPlan>([...datos.itinerarioJapon], (d) => d.n).sort((a, b) => a.n - b.n)
  const corea = unicos<FilaPlan>([...datos.itinerarioCorea], (d) => d.n).sort((a, b) => a.n - b.n)
  const notaDe = new Map<string, string>(lugaresTxt.map((l) => [l.clave, l.nota]))

  // ── Los 12 pines del mapa ────────────────────────────────────────────────
  const idPorClave = new Map<ClaveLugar, number>()
  for (const [clave, l] of Object.entries(LUGARES) as [ClaveLugar, (typeof LUGARES)[ClaveLugar]][]) {
    const id = await lugaresViajeRepo.add({
      nombre: l.nombre,
      pais: es ? l.pais : l.paisEn,
      ...(l.ciudad ? { ciudad: l.ciudad } : {}),
      lat: l.lat,
      lng: l.lng,
      visitado: l.visitado,
      ...(l.visita != null ? { fechaVisita: ctx.fecha(l.visita) } : {}),
      ...(clave === 'seul' ? { fechaPlan: isoMasDias(ctx.hoy, COREA_EN_DIAS) } : {}),
      ...(notaDe.has(clave) ? { nota: notaDe.get(clave) } : {}),
      creadoEn: `${ctx.fecha(l.apuntado)}T12:00:00.000Z`,
    })
    idPorClave.set(clave, id)
  }

  // ── Japón: la hoja de plan de las tres semanas ───────────────────────────
  const tokioId = idPorClave.get('tokio')!
  await diasItinerarioRepo.bulkAdd(
    japon.map((d) => ({
      lugarId: tokioId,
      dia: d.n,
      fecha: ctx.fecha(JAPON_INICIO - 1 + d.n),
      inicio: d.inicio,
      destino: d.destino,
      hospedaje: d.hospedaje,
      actividades: d.actividades,
      transporte: d.transporte,
      presupuesto: PRESUPUESTO_JAPON[d.n - 1] ?? 900,
    })),
  )

  // ── Corea: el plan que viene, con su meta de ahorro en el despacho ───────
  const seulId = idPorClave.get('seul')!
  const metaId = await metasRepo.add({
    nombre: `✈️ ${LUGARES.seul.nombre}`,
    objetivo: META_COREA,
    ahorrado: AHORRADO_COREA,
    tipo: 'ahorro',
  })
  await lugaresViajeRepo.update(seulId, { metaId })
  await diasItinerarioRepo.bulkAdd(
    corea.map((d) => ({
      lugarId: seulId,
      dia: d.n,
      fecha: isoMasDias(ctx.hoy, COREA_EN_DIAS + d.n - 1),
      inicio: d.inicio,
      destino: d.destino,
      hospedaje: d.hospedaje,
      actividades: d.actividades,
      transporte: d.transporte,
      presupuesto: PRESUPUESTO_COREA[d.n - 1] ?? 4000,
    })),
  )

  // Los otros dos sueños: una fila cada uno para que su hoja no nazca vacía
  // (si no, abrirla escribiría y el guard del demo la frenaría).
  for (const clave of ['patagonia', 'islandia'] as const) {
    await diasItinerarioRepo.add({
      lugarId: idPorClave.get(clave)!,
      dia: 1,
      destino: LUGARES[clave].nombre,
      actividades: notaDe.get(clave) ?? '',
    })
  }

  // ── La bitácora, con sus fotos ───────────────────────────────────────────
  for (const rec of datos.recuerdos) {
    const lugarId = idPorClave.get(rec.lugar as ClaveLugar)
    if (!lugarId) continue
    const clave = 'foto' in rec ? rec.foto : undefined
    const foto = clave ? await ctx.foto(`sala/${clave}`) : null
    await bitacoraViajeRepo.add({
      lugarId,
      fecha: ctx.fecha(rec.dia),
      texto: rec.texto,
      ...(foto ? { fotos: [foto] } : {}),
      creadoEn: `${ctx.fecha(rec.dia)}T21:00:00.000Z`,
    })
  }

  // Portadas: una por país (índice único) y la de Kioto como lugar destacado.
  const portadaJapon = await ctx.foto('sala/japon-fuji')
  if (portadaJapon) await portadasViajeRepo.add({ pais: es ? 'Japón' : 'Japan', foto: portadaJapon })
  const portadaMexico = await ctx.foto('sala/mexico-oaxaca')
  if (portadaMexico) await portadasViajeRepo.add({ pais: es ? 'México' : 'Mexico', foto: portadaMexico })
  const portadaKioto = await ctx.foto('sala/japon-kioto-bambu')
  if (portadaKioto) await portadasLugarRepo.add({ lugarId: idPorClave.get('kioto')!, foto: portadaKioto })

  // ── Dos rutas: la que ya caminó y la que sueña ───────────────────────────
  await rutasViajeRepo.bulkAdd([
    {
      nombre: es ? 'Japón: de Tokio a Hiroshima' : 'Japan: Tokyo to Hiroshima',
      lugarIds: (['tokio', 'hakone', 'kawaguchiko', 'kioto', 'nara', 'osaka', 'hiroshima'] as const).map(
        (c) => idPorClave.get(c)!,
      ),
      creadoEn: `${ctx.fecha(-190)}T12:00:00.000Z`,
    },
    {
      nombre: es ? 'Lo que sigue: Corea' : "What's next: Korea",
      lugarIds: [seulId],
      creadoEn: `${ctx.fecha(-12)}T12:00:00.000Z`,
    },
  ])

  // El viaje que fue (cumplido) y el que viene, con el itinerario de doce días
  // todavía como propuesta: en Viajes, un plan ES el itinerario.
  await sembrarMetasApp(ctx, 'sala')
}
