import type { Meta, Patrimonio, Transaccion } from '../../core/data/db'
import { finanzasRepo, metasRepo, patrimonioRepo } from '../../core/data/repository'
import { porIdioma, type PorIdioma } from '../_shared/ejemplos/tipos'
import { hoyISO, sumarPeriodo } from './mes'
import type { TipoMeta } from './MetasTab'

/**
 * Ejemplos de fábrica del despacho: se cargan y se borran de golpe desde su
 * propia sección (ver `BarraEjemplo.tsx`), igual que en la agenda. El
 * contenido va en los dos idiomas: es dato del usuario en cuanto se crea, no
 * interfaz, así que no vive en `dict.ts`.
 */

const NOMBRES: PorIdioma<{
  fondoEmergencia: string
  fondoIndexado: string
  tarjeta: string
  sueldo: string
  renta: string
  internet: string
  casa: string
  coche: string
  hipoteca: string
}> = {
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
  pt: {
    fondoEmergencia: 'Fundo de emergência',
    fondoIndexado: 'Fundo de índice',
    tarjeta: 'Cartão de crédito',
    sueldo: 'Salário',
    renta: 'Aluguel',
    internet: 'Internet',
    casa: 'Apartamento',
    coche: 'Carro',
    hipoteca: 'Hipoteca',
  },
  fr: {
    fondoEmergencia: "Fonds d'urgence",
    fondoIndexado: 'Fonds indiciel',
    tarjeta: 'Carte de crédit',
    sueldo: 'Salaire',
    renta: 'Loyer',
    internet: 'Internet',
    casa: 'Appartement',
    coche: 'Voiture',
    hipoteca: 'Hypothèque',
  },
  de: {
    fondoEmergencia: 'Notfallfonds',
    fondoIndexado: 'Indexfonds',
    tarjeta: 'Kreditkarte',
    sueldo: 'Gehalt',
    renta: 'Miete',
    internet: 'Internet',
    casa: 'Wohnung',
    coche: 'Auto',
    hipoteca: 'Hypothek',
  },
  it: {
    fondoEmergencia: 'Fondo di emergenza',
    fondoIndexado: 'Fondo indicizzato',
    tarjeta: 'Carta di credito',
    sueldo: 'Stipendio',
    renta: 'Affitto',
    internet: 'Internet',
    casa: 'Appartamento',
    coche: 'Auto',
    hipoteca: 'Mutuo',
  },
  ja: {
    fondoEmergencia: '緊急資金',
    fondoIndexado: 'インデックスファンド',
    tarjeta: 'クレジットカード',
    sueldo: '給料',
    renta: '家賃',
    internet: 'インターネット',
    casa: 'マンション',
    coche: '車',
    hipoteca: '住宅ローン',
  },
  zh: {
    fondoEmergencia: '应急基金',
    fondoIndexado: '指数基金',
    tarjeta: '信用卡',
    sueldo: '工资',
    renta: '房租',
    internet: '网络',
    casa: '公寓',
    coche: '汽车',
    hipoteca: '房贷',
  },
  ko: {
    fondoEmergencia: '비상금',
    fondoIndexado: '인덱스 펀드',
    tarjeta: '신용카드',
    sueldo: '월급',
    renta: '월세',
    internet: '인터넷',
    casa: '아파트',
    coche: '자동차',
    hipoteca: '주택담보대출',
  },
  ru: {
    fondoEmergencia: 'Резервный фонд',
    fondoIndexado: 'Индексный фонд',
    tarjeta: 'Кредитная карта',
    sueldo: 'Зарплата',
    renta: 'Аренда жилья',
    internet: 'Интернет',
    casa: 'Квартира',
    coche: 'Машина',
    hipoteca: 'Ипотека',
  },
  hi: {
    fondoEmergencia: 'इमरजेंसी फ़ंड',
    fondoIndexado: 'इंडेक्स फ़ंड',
    tarjeta: 'क्रेडिट कार्ड',
    sueldo: 'सैलरी',
    renta: 'किराया',
    internet: 'इंटरनेट',
    casa: 'फ़्लैट',
    coche: 'गाड़ी',
    hipoteca: 'होम लोन',
  },
  tr: {
    fondoEmergencia: 'Acil durum fonu',
    fondoIndexado: 'Endeks fonu',
    tarjeta: 'Kredi kartı',
    sueldo: 'Maaş',
    renta: 'Kira',
    internet: 'İnternet',
    casa: 'Daire',
    coche: 'Araba',
    hipoteca: 'Konut kredisi',
  },
  id: {
    fondoEmergencia: 'Dana darurat',
    fondoIndexado: 'Reksa dana indeks',
    tarjeta: 'Kartu kredit',
    sueldo: 'Gaji',
    renta: 'Sewa',
    internet: 'Internet',
    casa: 'Apartemen',
    coche: 'Mobil',
    hipoteca: 'KPR',
  },
  pl: {
    fondoEmergencia: 'Fundusz awaryjny',
    fondoIndexado: 'Fundusz indeksowy',
    tarjeta: 'Karta kredytowa',
    sueldo: 'Pensja',
    renta: 'Czynsz',
    internet: 'Internet',
    casa: 'Mieszkanie',
    coche: 'Samochód',
    hipoteca: 'Kredyt hipoteczny',
  },
  ar: {
    fondoEmergencia: 'صندوق الطوارئ',
    fondoIndexado: 'صندوق مؤشر',
    tarjeta: 'بطاقة ائتمان',
    sueldo: 'الراتب',
    renta: 'الإيجار',
    internet: 'الإنترنت',
    casa: 'شقة',
    coche: 'سيارة',
    hipoteca: 'قرض عقاري',
  },
  nl: {
    fondoEmergencia: 'Noodfonds',
    fondoIndexado: 'Indexfonds',
    tarjeta: 'Creditcard',
    sueldo: 'Salaris',
    renta: 'Huur',
    internet: 'Internet',
    casa: 'Appartement',
    coche: 'Auto',
    hipoteca: 'Hypotheek',
  },
}

// ----- Gastos e ingresos (el ejemplo muestra lo que se repite) -----

export const hayEjemplo = (movs: Transaccion[], tipo: Transaccion['tipo']): boolean =>
  movs.some((m) => m.ejemplo && m.tipo === tipo)

export async function cargarEjemplo(tipo: Transaccion['tipo']): Promise<void> {
  const N = porIdioma(NOMBRES)
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
  const N = porIdioma(NOMBRES)
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
  const N = porIdioma(NOMBRES)
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
