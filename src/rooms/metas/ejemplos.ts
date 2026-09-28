import type { NodoPlan, PasoRutina } from '../../core/data/db'
import { esEjemplo } from '../../core/data/ejemplos'
import { planesMetaRepo, rutinasRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { borrarMetaConDescendencia, esMeta } from '../../core/metas'
import { COLORES_RUTINA, colorPorProfundidad } from '../../core/ui/coloresRutina'
import {
  filaEjemplo,
  porIdioma,
  retraducido,
  yaMaterializado,
  type PaqueteEjemplo,
  type TablaEjemplo,
} from '../_shared/ejemplos/tipos'
import { TEXTOS_METAS } from './ejemplos.data'

/**
 * Ejemplo de fábrica del cuarto Metas: una meta por cada estado, para que sus
 * tres menús (Metas · Planes · Cronograma) no abran vacíos.
 * - «Correr 5 km», EN CURSO: su plan ya se aceptó, así que sus fases son
 *   sub-metas reales y la primera está cumplida (el eje enseña avance).
 * - «Leer 6 libros», POR HACER: dos pasos y un plan PROPUESTO, la tarjeta de Planes.
 * - «Dejar el refresco», CUMPLIDA: la tercera columna del tablero.
 *
 * Todo con `plantillaId: 'metas'` (no sale dentro de ninguna otra app) y fechas
 * colgadas de HOY: un cronograma fechado en el pasado no enseña nada. Las filas
 * son las mismas que dejan `crearMeta` y `aceptarPlan`, con la marca del ejemplo.
 */

const ID = 'metas.metas'
const APP = 'metas'

type Texto = keyof (typeof TEXTOS_METAS)['es']

/** El plan aceptado de «Correr»: días contados desde su arranque, hace tres semanas. */
const ARRANQUE_CORRER = -21
const FASES_CORRER: { nombre: Texto; ini: number; fin: number }[] = [
  { nombre: 'fase1', ini: 0, fin: 13 },
  { nombre: 'fase2', ini: 14, fin: 34 },
  { nombre: 'fase3', ini: 35, fin: 56 },
]

/** El plan propuesto de «Leer», con los ids en pre-orden como los deja `aplanar`. */
const ARRANQUE_LEER = 7
const NODOS_LEER: { id: number; padre?: number; nombre: Texto; ini: number; fin: number }[] = [
  { id: 1, nombre: 'leerFase1', ini: 0, fin: 55 },
  { id: 2, padre: 1, nombre: 'leerSub1', ini: 0, fin: 27 },
  { id: 3, padre: 1, nombre: 'leerSub2', ini: 28, fin: 55 },
  { id: 4, nombre: 'leerFase2', ini: 56, fin: 118 },
  { id: 5, nombre: 'leerFase3', ini: 119, fin: 181 },
]

// Qué claves del catálogo puede llevar cada campo (la guarda de `retraducido`).
const NOMBRES: Texto[] = ['correr', 'leer', 'refresco', 'fase1', 'fase2', 'fase3']
const NOTAS: Texto[] = ['notaCorrer', 'notaRefresco']
const PASOS: Texto[] = ['pasoLeer1', 'pasoLeer2', 'pasoRefresco1', 'pasoRefresco2']
const NODOS: Texto[] = ['fase1', 'fase2', 'fase3', 'leerFase1', 'leerSub1', 'leerSub2', 'leerFase2', 'leerFase3']
const RESUMENES: Texto[] = ['resumenCorrer', 'resumenLeer']

/**
 * `rutinas` tal como la ve el ejemplo. Quitar una de sus metas es borrarla como
 * desde su hoja: se lleva lo que el usuario le colgó después (sub-metas, las del
 * plan que aceptó, los planes que pidió), que no lleva la marca y se quedaría
 * apuntando a una madre que ya no existe.
 */
const metasDelEjemplo: TablaEjemplo = {
  alguna: (pred) => rutinasRepo.alguna(pred),
  list: () => rutinasRepo.list(),
  remove: (id) => borrarMetaConDescendencia(id),
}

export const ejemploMetas: PaqueteEjemplo = {
  id: ID,
  tablas: [metasDelEjemplo, planesMetaRepo],
  // La tabla `rutinas` la comparten todas las apps: aquí solo cuentan las METAS.
  hayPropios: () => rutinasRepo.alguna((r) => esMeta(r) && !esEjemplo(r)),

  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => rutinasRepo.list(), () => planesMetaRepo.list())) return
    const T = porIdioma(TEXTOS_METAS)
    const hoy = fechaLocalISO()
    const dia = (n: number) => isoMasDias(hoy, n)
    const hora = (n: number, hhmm: string) => `${dia(n)}T${hhmm}:00.000Z`
    // Al restaurarlo, detrás de las metas que ya haya: el ejemplo no se cuela arriba.
    const orden = (await rutinasRepo.list()).filter((r) => esMeta(r) && r.padreId == null).length
    // Lo que `crearMeta` le pone a toda meta.
    const meta = {
      emoji: '🎯',
      dias: [] as number[],
      pasos: [] as PasoRutina[],
      activa: true,
      esMeta: true,
      repeticion: 'una_vez' as const,
      plantillaId: APP,
    }

    // ── 1. En curso, con su plan ya aceptado ──────────────────────────────────
    const colorCorrer = COLORES_RUTINA[0]
    const inicioCorrer = dia(ARRANQUE_CORRER)
    const aceptado = hora(ARRANQUE_CORRER - 1, '20:10')
    const correrId = await rutinasRepo.addSeed(
      filaEjemplo(ID, 'correr', restaurar, {
        ...meta,
        nombre: T.correr,
        emoji: '🏃',
        nota: T.notaCorrer,
        color: colorCorrer,
        orden,
        fechaInicio: inicioCorrer,
        fechaFin: isoMasDias(inicioCorrer, FASES_CORRER[FASES_CORRER.length - 1].fin),
        creadoEn: hora(ARRANQUE_CORRER - 2, '19:00'),
      }),
    )
    // Cada fase es la sub-meta que `aceptarPlan` crea del nodo, y el nodo la
    // recuerda en `metaRealId`.
    const nodosCorrer: NodoPlan[] = []
    for (const [i, f] of FASES_CORRER.entries()) {
      const faseId = await rutinasRepo.addSeed(
        filaEjemplo(ID, `correrFase${i + 1}`, restaurar, {
          ...meta,
          nombre: T[f.nombre],
          color: colorPorProfundidad(colorCorrer, 1),
          padreId: correrId,
          orden: i,
          fechaInicio: isoMasDias(inicioCorrer, f.ini),
          fechaFin: isoMasDias(inicioCorrer, f.fin),
          // La primera ya se corrió: es lo que le da avance a la barra.
          ...(i === 0 && { completada: true }),
          creadoEn: aceptado,
        }),
      )
      nodosCorrer.push({ id: i + 1, nombre: T[f.nombre], ini: f.ini, fin: f.fin, metaRealId: faseId })
    }
    await planesMetaRepo.addSeed(
      filaEjemplo(ID, 'correrPlan', restaurar, {
        metaId: correrId,
        nombre: T.planA,
        inicioISO: inicioCorrer,
        nodos: nodosCorrer,
        entrada: {
          fechaInicio: inicioCorrer,
          fechaObjetivo: isoMasDias(inicioCorrer, FASES_CORRER[FASES_CORRER.length - 1].fin),
          horasSemana: 3,
          dias: [1, 3, 5],
          nivel: 'cero' as const,
        },
        resumen: T.resumenCorrer,
        creadoEn: hora(ARRANQUE_CORRER - 1, '20:00'),
        aceptadoEn: aceptado,
      }),
    )

    // ── 2. Por hacer: dos pasos y un plan todavía propuesto ───────────────────
    const inicioLeer = dia(ARRANQUE_LEER)
    const finLeer = isoMasDias(inicioLeer, NODOS_LEER[NODOS_LEER.length - 1].fin)
    const leerId = await rutinasRepo.addSeed(
      filaEjemplo(ID, 'leer', restaurar, {
        ...meta,
        nombre: T.leer,
        emoji: '📚',
        pasos: [
          { titulo: T.pasoLeer1, roomId: '' },
          { titulo: T.pasoLeer2, roomId: '' },
        ],
        color: COLORES_RUTINA[1],
        orden: orden + 1,
        fechaInicio: inicioLeer,
        fechaFin: finLeer,
        creadoEn: hora(-3, '21:00'),
      }),
    )
    await planesMetaRepo.addSeed(
      filaEjemplo(ID, 'leerPlan', restaurar, {
        metaId: leerId,
        nombre: T.planA,
        inicioISO: inicioLeer,
        nodos: NODOS_LEER.map((n) => ({ ...n, nombre: T[n.nombre] })),
        entrada: {
          fechaInicio: inicioLeer,
          fechaObjetivo: finLeer,
          horasSemana: 3,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'algo' as const,
        },
        resumen: T.resumenLeer,
        creadoEn: hora(-2, '21:30'),
      }),
    )

    // ── 3. Cumplida ───────────────────────────────────────────────────────────
    await rutinasRepo.addSeed(
      filaEjemplo(ID, 'refresco', restaurar, {
        ...meta,
        nombre: T.refresco,
        emoji: '🥤',
        pasos: [
          { titulo: T.pasoRefresco1, roomId: '' },
          { titulo: T.pasoRefresco2, roomId: '' },
        ],
        pasosHechos: [0, 1],
        completada: true,
        nota: T.notaRefresco,
        color: COLORES_RUTINA[2],
        orden: orden + 2,
        fechaInicio: dia(-75),
        fechaFin: dia(-46),
        creadoEn: hora(-77, '08:30'),
      }),
    )
  },

  async retraducir() {
    for (const r of await rutinasRepo.list()) {
      if (r.ejemploDe !== ID || r.id == null) continue
      const nombre = retraducido(TEXTOS_METAS, r.nombre, ...NOMBRES)
      const nota = retraducido(TEXTOS_METAS, r.nota, ...NOTAS)
      const titulos = r.pasos.map((p) => retraducido(TEXTOS_METAS, p.titulo, ...PASOS))
      const pasos = titulos.some(Boolean) ? r.pasos.map((p, i) => ({ ...p, titulo: titulos[i] ?? p.titulo })) : null
      if (nombre || nota || pasos) {
        await rutinasRepo.update(r.id, { ...(nombre && { nombre }), ...(nota && { nota }), ...(pasos && { pasos }) })
      }
    }
    // Releídas: las del ejemplo ya van en el idioma nuevo.
    const metas = await rutinasRepo.list()
    for (const p of await planesMetaRepo.list()) {
      if (p.ejemploDe !== ID || p.id == null) continue
      const nombre = retraducido(TEXTOS_METAS, p.nombre, 'planA')
      const resumen = retraducido(TEXTOS_METAS, p.resumen, ...RESUMENES)
      let nodosCambian = false
      const nodos: NodoPlan[] = []
      for (const n of p.nodos) {
        const nuevo = retraducido(TEXTOS_METAS, n.nombre, ...NODOS)
        nodos.push(nuevo ? { ...n, nombre: nuevo } : n)
        if (!nuevo) continue
        nodosCambian = true
        // La sub-meta que nació del nodo al aceptar el plan (aunque la aceptara el
        // usuario y no lleve marca) se llama igual: se renombra a la par, o la hoja
        // del plan dejaría de emparejarlos por nombre.
        const real = metas.find((m) => m.id === n.metaRealId && m.nombre === n.nombre)
        if (real?.id != null) await rutinasRepo.update(real.id, { nombre: nuevo })
      }
      if (nombre || resumen || nodosCambian) {
        await planesMetaRepo.update(p.id, {
          ...(nombre && { nombre }),
          ...(resumen && { resumen }),
          ...(nodosCambian && { nodos }),
        })
      }
    }
  },
}
