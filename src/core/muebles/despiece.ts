import { LUZ_MAXIMA, TABLERO_ESTANDAR } from './materiales'
import type {
  AvisoMueble,
  Cantos,
  Cuerpo,
  Despiece,
  Herraje,
  Mm,
  Mueble,
  ParteMueble,
  PiezaCorte,
  PiezaTubo,
  RolPieza,
  RolTubo,
} from './tipos'

/**
 * Proyección del `Cuerpo` a lista de corte: qué se compra y qué se corta. Es lo
 * que consumen el diagrama de cortes (`corte.ts`) y el cotizador (`costos.ts`).
 *
 * Aquí no se calcula geometría nueva: solo se lee la que armó el módulo y se
 * proyecta el rectángulo según el eje del grosor (la tabla está documentada en
 * `armar/comun.ts`).
 */

const SIN_CANTOS: Cantos = { arriba: false, abajo: false, izq: false, der: false }

/** Rectángulo de corte de una parte de tablero, según en qué eje va el grosor. */
function rectangulo(p: ParteMueble): { ancho: Mm; alto: Mm; grosor: Mm } {
  if (p.eje === 'x') return { ancho: p.dz, alto: p.dy, grosor: p.dx }
  if (p.eje === 'y') return { ancho: p.dx, alto: p.dz, grosor: p.dy }
  return { ancho: p.dx, alto: p.dy, grosor: p.dz }
}

/**
 * Cómo se puede apoyar una pieza en la hoja, sabiendo que la veta de la hoja
 * corre a lo largo de su lado mayor (los 2440 mm). Es la ÚNICA definición de la
 * regla: la usan tanto el aviso de «no cabe» como el optimizador de corte.
 *
 * `rotada` significa girada 90° respecto a (ancho, alto) de la `PiezaCorte`.
 */
export function orientaciones(p: {
  ancho: Mm
  alto: Mm
  veta: PiezaCorte['veta']
}): { w: Mm; h: Mm; rotada: boolean }[] {
  if (p.veta === 'ancho') return [{ w: p.ancho, h: p.alto, rotada: false }]
  if (p.veta === 'alto') return [{ w: p.alto, h: p.ancho, rotada: true }]
  return [
    { w: p.ancho, h: p.alto, rotada: false },
    { w: p.alto, h: p.ancho, rotada: true },
  ]
}

/** Metros lineales de cinta que pide una pieza (solo los lados marcados). */
export function mlCanto(ancho: Mm, alto: Mm, cantos: Cantos): number {
  let mm = 0
  if (cantos.arriba) mm += ancho
  if (cantos.abajo) mm += ancho
  if (cantos.izq) mm += alto
  if (cantos.der) mm += alto
  return mm / 1000
}

/** Suma un valor en una lista agrupada por una clave calculada. */
function acumular<T>(lista: T[], clave: (x: T) => string, nuevo: T, sumar: (a: T, b: T) => void): void {
  const previo = lista.find((x) => clave(x) === clave(nuevo))
  if (previo) sumar(previo, nuevo)
  else lista.push(nuevo)
}

export function despiezar(c: Cuerpo, m: Mueble): Despiece {
  const tableros: PiezaCorte[] = []
  const tubos: PiezaTubo[] = []
  const herrajes: Herraje[] = []
  const avisos: AvisoMueble[] = [...c.avisos]

  // Cuántos grupos distintos lleva ya cada rol, para numerar los ids.
  const porRol = new Map<string, number>()
  const idDeGrupo = (rol: string): string => {
    const n = (porRol.get(rol) ?? 0) + 1
    porRol.set(rol, n)
    return `${rol}.${n}`
  }

  for (const p of c.partes) {
    for (const h of p.herrajes ?? []) {
      const previo = herrajes.find((x) => x.id === h.id && x.unidad === h.unidad)
      if (previo) previo.cantidad += h.cantidad
      else herrajes.push({ ...h })
    }
    if (p.soloVisual) continue

    if (p.hechoDe === 'tablero') {
      const { ancho, alto, grosor } = rectangulo(p)
      if (ancho <= 0 || alto <= 0 || grosor <= 0) continue
      const cantos = p.cantos ?? SIN_CANTOS
      const veta = p.veta ?? 'libre'
      const materialId = p.materialTablero ?? m.tablero.materialId
      const igual = tableros.find(
        (x) =>
          x.rol === p.rol &&
          x.ancho === Math.round(ancho) &&
          x.alto === Math.round(alto) &&
          x.grosor === grosor &&
          x.materialId === materialId &&
          x.veta === veta &&
          x.color === p.color &&
          x.cantos.arriba === cantos.arriba &&
          x.cantos.abajo === cantos.abajo &&
          x.cantos.izq === cantos.izq &&
          x.cantos.der === cantos.der,
      )
      if (igual) {
        igual.cantidad += 1
        continue
      }
      tableros.push({
        id: idDeGrupo(p.rol),
        rol: p.rol as RolPieza,
        clave: p.clave,
        nombreEs: p.nombreEs,
        ancho: Math.round(ancho),
        alto: Math.round(alto),
        grosor,
        cantidad: 1,
        materialId,
        cantos: { ...cantos },
        veta,
        color: p.color,
        nota: p.nota,
      })
    } else if (p.hechoDe === 'tubo') {
      const largo = Math.round(Math.max(p.dx, p.dy, p.dz))
      if (largo <= 0 || !p.tubo) continue
      const materialId = p.materialTubo ?? m.metal.materialId
      const seccionTxt = p.tubo.seccion.join('x')
      const igual = tubos.find(
        (x) =>
          x.largo === largo &&
          x.perfil === p.tubo!.perfil &&
          x.pared === p.tubo!.pared &&
          x.materialId === materialId &&
          x.seccion.join('x') === seccionTxt &&
          x.rol === p.rol,
      )
      if (igual) {
        igual.cantidad += 1
        continue
      }
      tubos.push({
        id: idDeGrupo(p.rol),
        rol: p.rol as RolTubo,
        clave: p.clave,
        nombreEs: p.nombreEs,
        largo,
        perfil: p.tubo.perfil,
        seccion: p.tubo.seccion,
        pared: p.tubo.pared,
        cantidad: 1,
        materialId,
        color: p.color,
      })
    }
  }

  const cantoMl: Despiece['cantoMl'] = []
  const areaM2: Despiece['areaM2'] = []
  for (const t of tableros) {
    const ml = mlCanto(t.ancho, t.alto, t.cantos) * t.cantidad
    if (ml > 0) {
      acumular(
        cantoMl,
        (x) => `${x.materialId}|${x.cintaMm}`,
        { materialId: t.materialId, cintaMm: m.tablero.cintaMm, ml },
        (a, b) => {
          a.ml += b.ml
        },
      )
    }
    acumular(
      areaM2,
      (x) => `${x.materialId}|${x.grosor}`,
      { materialId: t.materialId, grosor: t.grosor, m2: (t.ancho * t.alto * t.cantidad) / 1e6 },
      (a, b) => {
        a.m2 += b.m2
      },
    )
  }

  const tuboMl: Despiece['tuboMl'] = []
  for (const t of tubos) {
    acumular(
      tuboMl,
      (x) => `${x.materialId}|${x.perfil}|${x.seccion.join('x')}|${x.pared}`,
      {
        materialId: t.materialId,
        perfil: t.perfil,
        seccion: t.seccion,
        pared: t.pared,
        ml: (t.largo * t.cantidad) / 1000,
      },
      (a, b) => {
        a.ml += b.ml
      },
    )
  }

  // Avisos de fabricación: lo que hay que saber ANTES de cortar.
  for (const t of tableros) {
    const cabe = orientaciones(t).some(
      (o) => o.w <= TABLERO_ESTANDAR.ancho && o.h <= TABLERO_ESTANDAR.alto,
    )
    if (!cabe) {
      avisos.push({
        nivel: 'error',
        clave: 'muebles.aviso.noCabe',
        textoEs: '«{pieza}» ({ancho} × {alto} mm) no cabe en una hoja de tablero.',
        vars: { pieza: t.nombreEs, ancho: t.ancho, alto: t.alto },
        ref: t.id,
      })
    }
    const luzMax = LUZ_MAXIMA[t.grosor] ?? 900
    if ((t.rol === 'entrepano' || t.rol === 'repisa') && t.ancho > luzMax) {
      avisos.push({
        nivel: 'aviso',
        clave: 'muebles.aviso.luz',
        textoEs:
          '«{pieza}» mide {ancho} mm de claro: con {grosor} mm se pandea. Ponle una división o sube el grosor.',
        vars: { pieza: t.nombreEs, ancho: t.ancho, grosor: t.grosor },
        ref: t.id,
      })
    }
  }

  return { tableros, tubos, cantoMl, areaM2, tuboMl, herrajes, avisos }
}

/** Firma barata del despiece, para no re-optimizar el corte con cada render. */
export function firmaDespiece(d: Despiece): string {
  return d.tableros
    .map((t) => `${t.materialId}${t.grosor}:${t.ancho}x${t.alto}x${t.cantidad}:${t.veta}`)
    .join('|')
}
