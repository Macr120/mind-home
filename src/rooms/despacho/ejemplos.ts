import type { Meta, Patrimonio, Transaccion } from '../../core/data/db'
import { finanzasRepo, metasRepo, patrimonioRepo } from '../../core/data/repository'
import { idiomaActual } from '../../core/i18n/useT'
import type { Idioma } from '../../core/state/ajustesStore'
import { hoyISO, sumarPeriodo } from './mes'
import type { TipoMeta } from './MetasTab'

/**
 * Ejemplos de fábrica del despacho: se cargan y se borran de golpe desde su
 * propia sección (ver `BarraEjemplo.tsx`), igual que en la agenda. El
 * contenido va en los dos idiomas: es dato del usuario en cuanto se crea, no
 * interfaz, así que no vive en `dict.ts`.
 */

const NOMBRES: Record<
  Idioma,
  {
    fondoEmergencia: string
    fondoIndexado: string
    tarjeta: string
    sueldo: string
    renta: string
    internet: string
    casa: string
    coche: string
    hipoteca: string
  }
> = {
  es: {
    fondoEmergencia: 'Fondo de emergencia',
    fondoIndexado: 'Fondo indexado',
    tarjeta: 'Tarjeta de crédito',
    sueldo: 'Sueldo',
    renta: 'Renta',
    internet: 'Internet',
    casa: 'Departamento',
    coche: 'Coche',
    hipoteca: 'Hipoteca',
  },
  en: {
    fondoEmergencia: 'Emergency fund',
    fondoIndexado: 'Index fund',
    tarjeta: 'Credit card',
    sueldo: 'Salary',
    renta: 'Rent',
    internet: 'Internet',
    casa: 'Flat',
    coche: 'Car',
    hipoteca: 'Mortgage',
  },
}

// ----- Gastos e ingresos (el ejemplo muestra lo que se repite) -----

export const hayEjemplo = (movs: Transaccion[], tipo: Transaccion['tipo']): boolean =>
  movs.some((m) => m.ejemplo && m.tipo === tipo)

export async function cargarEjemplo(tipo: Transaccion['tipo']): Promise<void> {
  const N = NOMBRES[idiomaActual()]
  const fecha = hoyISO()
  if (tipo === 'ingreso') {
    await finanzasRepo.add({ fecha, tipo: 'ingreso', categoria: 'salario', monto: 15000, nota: N.sueldo, periodo: 'mes', ejemplo: true })
  } else {
    await finanzasRepo.add({ fecha, tipo: 'gasto', categoria: 'hogar', monto: 6000, nota: N.renta, periodo: 'mes', ejemplo: true })
    await finanzasRepo.add({ fecha, tipo: 'gasto', categoria: 'servicios', monto: 350, nota: N.internet, periodo: 'mes', ejemplo: true })
  }
}

export async function borrarEjemplo(movs: Transaccion[], tipo: Transaccion['tipo']): Promise<void> {
  for (const m of movs.filter((x) => x.ejemplo && x.tipo === tipo)) if (m.id != null) await finanzasRepo.remove(m.id)
}

// ----- Metas -----

const EJEMPLO_META: Record<TipoMeta, { nombre: keyof (typeof NOMBRES)['es']; objetivo: number; ahorrado: number }> = {
  ahorro: { nombre: 'fondoEmergencia', objetivo: 30000, ahorrado: 12000 },
  inversion: { nombre: 'fondoIndexado', objetivo: 100000, ahorrado: 35000 },
  deuda: { nombre: 'tarjeta', objetivo: 15000, ahorrado: 6000 },
}

export const hayEjemploMeta = (metas: Meta[], tipo: TipoMeta): boolean =>
  metas.some((m) => m.ejemplo && (m.tipo ?? 'ahorro') === tipo)

export async function cargarEjemploMeta(tipo: TipoMeta): Promise<void> {
  const N = NOMBRES[idiomaActual()]
  const e = EJEMPLO_META[tipo]
  await metasRepo.add({ nombre: N[e.nombre], objetivo: e.objetivo, ahorrado: e.ahorrado, tipo, ejemplo: true })
}

export async function borrarEjemploMeta(metas: Meta[], tipo: TipoMeta): Promise<void> {
  for (const m of metas.filter((x) => x.ejemplo && (x.tipo ?? 'ahorro') === tipo)) if (m.id != null) await metasRepo.remove(m.id)
}

// ----- Patrimonio -----

/**
 * Tres líneas que enseñan las tres formas de cambiar con el tiempo: algo que se
 * aprecia, algo que se deprecia y una deuda que se amortiza. Sin ellas la
 * pestaña Simulación no tendría nada que dibujar la primera vez.
 */
export const hayEjemploPatrimonio = (filas: Patrimonio[], naturaleza: Patrimonio['naturaleza']): boolean =>
  filas.some((f) => f.ejemplo && f.naturaleza === naturaleza)

export async function cargarEjemploPatrimonio(naturaleza: Patrimonio['naturaleza']): Promise<void> {
  const N = NOMBRES[idiomaActual()]
  const creadoEn = new Date().toISOString()
  const hace = (meses: number) => sumarPeriodo(hoyISO(), 'mes', -meses)

  if (naturaleza === 'activo') {
    await patrimonioRepo.add({
      clase: 'fisico',
      naturaleza: 'activo',
      nombre: N.casa,
      monto: 1800000,
      tasaAnual: 6,
      fechaValor: hace(36),
      creadoEn,
      ejemplo: true,
    })
    await patrimonioRepo.add({
      clase: 'fisico',
      naturaleza: 'activo',
      nombre: N.coche,
      monto: 280000,
      tasaAnual: -12,
      fechaValor: hace(18),
      creadoEn,
      ejemplo: true,
    })
  } else {
    await patrimonioRepo.add({
      clase: 'fisico',
      naturaleza: 'pasivo',
      nombre: N.hipoteca,
      monto: 950000,
      tasaAnual: 10.5,
      pagoMensual: 12000,
      fechaValor: hoyISO(),
      creadoEn,
      ejemplo: true,
    })
  }
}

export async function borrarEjemploPatrimonio(
  filas: Patrimonio[],
  naturaleza: Patrimonio['naturaleza'],
): Promise<void> {
  for (const f of filas.filter((x) => x.ejemplo && x.naturaleza === naturaleza)) {
    if (f.id != null) await patrimonioRepo.remove(f.id)
  }
}
