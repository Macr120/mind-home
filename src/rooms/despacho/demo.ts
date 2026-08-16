/**
 * Año demo de las finanzas: cómo un barista de medio tiempo pagó Japón.
 *
 * El propio modelo de datos cuenta el arco sin que nadie lo explique: el mes 1
 * son movimientos sueltos sin presupuesto (el caos), en el mes 2 nacen los
 * fijos (el primer orden), en el mes 4 entran las clases de física (justo al
 * decidir el viaje) y los meses 7, 8 y 9 salen en rojo — la avería, el vuelo y
 * las tres semanas fuera.
 *
 * Las notas vienen escritas; los montos y las fechas se calculan aquí.
 */
import type { Transaccion } from '../../core/data/db'
import { finanzasRepo, metasRepo, patrimonioRepo, presupuestosRepo, watchlistRepo } from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { hoyISO } from './mes'
import {
  AGUINALDO,
  AVERIA_COCHE,
  AVERIA_DIA,
  CLASES_DESDE,
  CLASES_FISICA,
  enBache,
  enJapon,
  HOSPEDAJE_JAPON,
  JAPON_INICIO,
  JR_PASS,
  META_JAPON,
  PATRIMONIO_HOY,
  PRESUPUESTO_MES,
  REGALO_FAMILIA,
  RENTA,
  SUELDO_QUINCENA,
  VUELO_JAPON,
} from '../../demo/hitosPep'
import { sembrarMetasApp } from '../../demo/metasPep'
import { DEMO_DESPACHO } from './demo.data'
import { enIdioma, type PorIdioma } from '../../core/i18n/porIdioma'

/** El mes 2: cuando Pep@ se sentó a ordenar sus cuentas. */
const ORDEN = -334

/**
 * Su línea de patrimonio. Va aquí y no en `demo.data.ts` porque ese archivo lo
 * genera la IA (`npm run demo:texto`) y esto es una etiqueta, no contenido.
 */
const AHORROS: PorIdioma<string> = {
  es: 'Mis ahorros',
  en: 'Savings',
  pt: 'Minhas economias',
  fr: 'Mon épargne',
  de: 'Meine Ersparnisse',
  it: 'I miei risparmi',
  ja: '貯金',
  zh: '我的存款',
  ko: '내 저축',
  ru: 'Мои сбережения',
  hi: 'मेरी बचत',
  tr: 'Birikimlerim',
  id: 'Tabunganku',
  pl: 'Moje oszczędności',
  ar: 'مدخراتي',
  nl: 'Mijn spaargeld',
}

type Fila = Omit<Transaccion, 'id'>

/** Gastos variables: cuántos al mes y en qué rango, por categoría. */
const VARIABLES = [
  { categoria: 'comida', veces: 5, min: 180, max: 420 },
  { categoria: 'transporte', veces: 2, min: 60, max: 200 },
  { categoria: 'ocio', veces: 2, min: 90, max: 220 },
  { categoria: 'compras', veces: 1, min: 150, max: 600 },
  { categoria: 'servicios', veces: 1, min: 90, max: 260 },
] as const

export async function construirDemoDespacho(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_DESPACHO, () => import('./demo.data.i18n'))
  const r = rngDemo(20261102)
  // Aquí «es» significa «no es inglés»: los idiomas que todavía no tienen
  // su variante inline leen el español, que es el respaldo de todo.
  const es = ctx.idioma !== 'en'

  const notaHito = new Map<string, string>(datos.hitos.map((h) => [h.clave, h.nota]))
  const plantillas = new Map<string, readonly string[]>(datos.plantillas.map((p) => [p.categoria, p.notas]))
  /** Una nota distinta cada vez, rotando la lista de esa categoría. */
  const notaDe = (categoria: string): string | undefined => {
    const lista = plantillas.get(categoria)
    if (!lista?.length) return undefined
    return lista[Math.floor(r() * lista.length)]
  }

  const filas: Fila[] = []

  // ── Los fijos, todos dados de alta en el mes 2 ───────────────────────────
  // `periodo: 'mes'` = la app los repite sola: una fila cuenta todo el año.
  filas.push(
    { fecha: ctx.fecha(ORDEN), tipo: 'ingreso', categoria: 'salario', monto: SUELDO_QUINCENA, periodo: 'mes', nota: notaHito.get('sueldoQuincena') },
    { fecha: ctx.fecha(ORDEN + 15), tipo: 'ingreso', categoria: 'salario', monto: SUELDO_QUINCENA, periodo: 'mes', nota: notaHito.get('sueldoQuincena') },
    { fecha: ctx.fecha(ORDEN), tipo: 'gasto', categoria: 'hogar', monto: RENTA, periodo: 'mes', nota: notaHito.get('renta') },
    { fecha: ctx.fecha(ORDEN + 1), tipo: 'gasto', categoria: 'servicios', monto: 480, periodo: 'mes', nota: notaHito.get('internetLuz') },
    { fecha: ctx.fecha(ORDEN + 1), tipo: 'gasto', categoria: 'servicios', monto: 199, periodo: 'mes', nota: notaHito.get('celular') },
    { fecha: ctx.fecha(ORDEN + 2), tipo: 'gasto', categoria: 'ocio', monto: 149, periodo: 'mes', nota: notaHito.get('streaming') },
    { fecha: ctx.fecha(ORDEN + 3), tipo: 'gasto', categoria: 'transporte', monto: 540, periodo: 'mes', nota: notaHito.get('polizaMensual') },
    // Las clases de física: el ingreso que hizo posible el viaje.
    { fecha: ctx.fecha(CLASES_DESDE), tipo: 'ingreso', categoria: 'freelance', monto: CLASES_FISICA, periodo: 'mes', nota: notaHito.get('clasesFisica') },
  )

  // ── El mes 1: caos, movimientos sueltos y sin presupuesto ────────────────
  for (let off = -364; off < ORDEN; off++) {
    if (r() < 0.55) {
      filas.push({
        fecha: ctx.fecha(off),
        tipo: 'gasto',
        categoria: r() < 0.5 ? 'comida' : 'otros_gasto',
        monto: Math.round(120 + r() * 480),
        nota: notaDe('comida'),
      })
    }
    // El sueldo de esas primeras quincenas, aún sin registrar como fijo.
    if (off === -360 || off === -345) {
      filas.push({ fecha: ctx.fecha(off), tipo: 'ingreso', categoria: 'salario', monto: SUELDO_QUINCENA })
    }
  }

  // ── Gastos variables del resto del año ───────────────────────────────────
  for (const v of VARIABLES) {
    for (let off = ORDEN; off <= 0; off++) {
      // Japón: lo de casa se detiene (allá se gasta en otra cosa).
      if (enJapon(off)) continue
      // En el bache se aprieta el cinturón de verdad.
      const factor = enBache(off) ? 0.75 : 1
      if (r() >= (v.veces / 30) * factor) continue
      filas.push({
        fecha: ctx.fecha(off),
        tipo: 'gasto',
        categoria: v.categoria,
        monto: Math.round((v.min + r() * (v.max - v.min)) * factor),
        nota: notaDe(v.categoria),
      })
    }
  }

  // ── Las propinas de la cafetería: el ingreso variable de cada semana ─────
  for (let off = -360; off <= 0; off += 7) {
    if (enJapon(off)) continue
    filas.push({
      fecha: ctx.fecha(off),
      tipo: 'ingreso',
      categoria: es ? 'Propinas' : 'Tips',
      monto: Math.round(240 + r() * 260),
      nota: notaDe('propinas'),
    })
  }

  // ── Los hitos: lo que de verdad cuenta la historia ───────────────────────
  const hito = (off: number, tipo: 'ingreso' | 'gasto', categoria: string, monto: number, clave: string) =>
    filas.push({ fecha: ctx.fecha(off), tipo, categoria, monto, nota: notaHito.get(clave) })

  hito(-310, 'gasto', 'compras', 1290, 'tenisCorrer')
  hito(-290, 'gasto', 'salud', 800, 'veterinarioLaika')
  hito(-268, 'gasto', 'ocio', 350, 'insc5k')
  hito(-238, 'gasto', 'ocio', 480, 'insc10k')
  hito(-205, 'gasto', 'otros_gasto', 1620, 'pasaporte')
  hito(-196, 'gasto', 'transporte', 2900, 'llantas')
  // El golpe del mes 7.
  hito(AVERIA_DIA, 'gasto', 'transporte', AVERIA_COCHE, 'averiaCoche')
  for (let i = 0; i < 6; i++) hito(-172 + i * 4, 'gasto', 'salud', 400, 'fisioterapia')
  hito(-152, 'ingreso', 'regalo', REGALO_FAMILIA, 'regaloFamilia')
  hito(-145, 'gasto', 'compras', 890, 'mochilaViaje')
  // El viaje se vuelve real.
  hito(-140, 'gasto', 'transporte', VUELO_JAPON, 'vueloJapon')
  hito(-132, 'gasto', 'transporte', JR_PASS, 'jrPass')
  hito(-128, 'gasto', 'hogar', HOSPEDAJE_JAPON, 'hospedajeJapon')

  // Las tres semanas allá: un gasto por día, en su moneda de todos modos.
  for (let d = 0; d < 21; d++) {
    const off = JAPON_INICIO + d
    filas.push({
      fecha: ctx.fecha(off),
      tipo: 'gasto',
      categoria: d % 3 === 0 ? 'transporte' : d % 3 === 1 ? 'comida' : 'ocio',
      monto: Math.round(320 + r() * 700),
      nota: notaHito.get('gastoJapon'),
    })
  }

  hito(-92, 'gasto', 'transporte', 1750, 'servicioMayor')
  hito(-48, 'gasto', 'transporte', 2300, 'servicioMayor')
  hito(-40, 'gasto', 'ocio', 750, 'insc21k')
  hito(-30, 'ingreso', 'salario', AGUINALDO, 'aguinaldo')
  hito(-22, 'gasto', 'otros_gasto', 1890, 'tenencia')
  hito(-16, 'gasto', 'ocio', 1450, 'inscMaraton')

  await finanzasRepo.bulkAdd(filas)

  // ── El presupuesto del mes (fila con clave mágica de `presupuestos`) ──────
  await presupuestosRepo.add({ categoria: '__mensual__', monto: PRESUPUESTO_MES })

  // Lo que Pep@ tiene guardado, como una línea de patrimonio de verdad. La casa
  // demo se CONSTRUYE, no se migra: la fila mágica `__patrimonio__` del modelo
  // viejo se retiró en la v123 y aquí ya no se siembra.
  await patrimonioRepo.add({
    clase: 'liquido',
    naturaleza: 'activo',
    nombre: enIdioma(AHORROS, ctx.idioma),
    monto: PATRIMONIO_HOY,
    creadoEn: new Date().toISOString(),
    fechaValor: hoyISO(),
  })

  // ── Las metas: una cumplida, dos vivas y la deuda saldada ────────────────
  await metasRepo.bulkAdd([
    { nombre: datos.metas.japon, objetivo: META_JAPON, ahorrado: META_JAPON, tipo: 'ahorro' },
    { nombre: datos.metas.emergencia, objetivo: 20000, ahorrado: 9600, tipo: 'ahorro' },
    { nombre: datos.metas.deuda, objetivo: AVERIA_COCHE, ahorrado: AVERIA_COCHE, tipo: 'deuda' },
  ])

  // Los CETES van aparte porque necesitan su id: la fila de patrimonio cuelga de
  // ellos y así la pestaña Simulación tiene algo que proyectar (lo demás de
  // Pep@ es dinero quieto). Enlazadas son UNA sola cosa: el saldo lo manda la
  // meta y la tasa la fila, así que el patrimonio no cambia ni un peso.
  const cetes = (await metasRepo.add({
    nombre: datos.metas.inversion,
    objetivo: 10000,
    ahorrado: 4200,
    tipo: 'inversion',
  })) as number
  await patrimonioRepo.add({
    clase: 'liquido',
    naturaleza: 'activo',
    nombre: datos.metas.inversion,
    monto: 4200,
    tasaAnual: 9,
    fechaValor: hoyISO(),
    metaId: cetes,
    creadoEn: new Date().toISOString(),
  })

  // Lo que mira de reojo: el yen del viaje que fue y el won del que viene.
  await watchlistRepo.bulkAdd([
    { simbolo: 'JPY/MXN', mercado: 'divisas' },
    { simbolo: 'KRW/MXN', mercado: 'divisas' },
    { simbolo: 'USD/MXN', mercado: 'divisas' },
    { simbolo: 'VOO', mercado: 'acciones' },
  ])

  // Las metas del CRONOGRAMA (las de arriba son las huchas de la app). Van al
  // ámbito de su pestaña: el fondo y Japón en Ahorro, la reparación en Deudas.
  // La casa demo se CONSTRUYE, no se migra: aquí el ámbito ya tiene que ser el
  // fusionado o las metas de ahorro no saldrían en su panel.
  await sembrarMetasApp(ctx, 'despacho', { ambitos: { ahorro: 'ahorroInversion', deuda: 'deuda' } })
}
