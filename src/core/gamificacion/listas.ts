import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ListaCumplida } from '../data/db'
import { fechaLocalISO } from '../fechaLocal'
import { armarPasosHoy, repartirPasos } from '../hoy'
import { useCelebracion } from '../state/celebracionStore'
import { FUENTES, XP_POR_NIVEL, racha, registrosDelDia } from './actividad'

/**
 * La moneda del XP: completar la lista «Objetivos» del día de una app
 * (`listasCumplidas`, una fila por app y día). Aquí viven el otorgamiento —con
 * sus celebraciones—, la red de seguridad del cierre de día y la siembra del
 * histórico. El cálculo del progreso que la consume está en `actividad.ts`.
 */

/** XP que vale completar la lista «Objetivos» del día de una app. */
export const XP_POR_LISTA = 20

/**
 * Otorga el día si no estaba ya otorgado; devuelve si INSERTÓ. Con `celebrar`,
 * encola la celebración de lista (+XP) y, si el salto cruza nivel, la de nivel.
 * Solo celebra quien inserta: el índice único `&[plantillaId+fecha]` cierra la
 * carrera de dos paneles (o dos pestañas) viendo la misma lista completarse.
 */
export async function otorgarListaCumplida(
  plantillaId: string,
  fecha: string,
  celebrar = false,
): Promise<boolean> {
  try {
    const previas = await db.listasCumplidas.where('plantillaId').equals(plantillaId).toArray()
    if (previas.some((f) => f.fecha === fecha)) return false
    await db.listasCumplidas.add({ plantillaId, fecha, xp: XP_POR_LISTA })
    if (celebrar) {
      const xpAntes = previas.reduce((acc, f) => acc + f.xp, 0)
      const xpDespues = xpAntes + XP_POR_LISTA
      const { encolar } = useCelebracion.getState()
      encolar({ tipo: 'lista', plantillaId, xpAntes, xpDespues })
      if (Math.floor(xpDespues / XP_POR_NIVEL) > Math.floor(xpAntes / XP_POR_NIVEL))
        encolar({ tipo: 'nivel', plantillaId, nivel: 1 + Math.floor(xpDespues / XP_POR_NIVEL) })
    }
    return true
  } catch {
    return false // ConstraintError: otro panel u otra pestaña otorgó primero
  }
}

/**
 * Otorga las listas que este render ve completas. Lo comparten el panel del
 * cuarto (`ListaHoy`) y el del calendario (`ObjetivosCasa`) — recibe un array
 * porque el calendario pinta varias apps y un hook no puede ir dentro de un
 * bucle. Días pasados otorgan sin celebrar (palomear el martes desde el
 * calendario no es una victoria de hoy); futuros no otorgan. Solo otorga, nunca
 * revoca: una lista ganada se queda aunque después se despalomee.
 */
export function useOtorgarListasCompletas(completas: string[] | undefined, fecha: string) {
  const clave = completas?.length ? [...completas].sort().join(',') : ''
  useEffect(() => {
    if (!clave) return
    const hoy = fechaLocalISO()
    if (fecha > hoy) return
    for (const id of clave.split(',')) void otorgarListaCumplida(id, fecha, fecha === hoy)
  }, [clave, fecha])
}

/**
 * Celebra la racha de la app del cuarto abierto: el PRIMER registro del día
 * siempre la sube en uno (con hoy vacío, `racha()` ancla en ayer), así que la
 * transición 0 → >0 de los registros de hoy ES la subida. Solo mira las tablas
 * de esta app y solo mientras el cuarto está abierto; al montar, `prev` arranca
 * vacío y no celebra en frío (recargas, o un registro hecho fuera del cuarto).
 * Montar con `key={plantillaId}` para que cambiar de cuarto reinicie el prev.
 */
export function useCelebrarRachaApp(plantillaId: string) {
  const hoy = fechaLocalISO()
  const n = useLiveQuery(() => registrosDelDia(plantillaId, hoy), [plantillaId, hoy])
  const prev = useRef<number | undefined>(undefined)
  useEffect(() => {
    const antes = prev.current
    prev.current = n
    if (n === undefined || antes !== 0 || n === 0) return
    void (async () => {
      // La racha se lee DESPUÉS del registro, ya con el día de hoy dentro.
      const fechas = new Set(await (FUENTES[plantillaId] ?? (async () => []))())
      useCelebracion.getState().encolar({ tipo: 'racha', plantillaId, racha: racha(fechas) })
    })()
  }, [n, plantillaId])
}

/** El vigía de racha del cuarto abierto. Montarlo con `key={plantillaId}`. */
export function VigiaRachaApp({ plantillaId }: { plantillaId: string }) {
  useCelebrarRachaApp(plantillaId)
  return null
}

// Memo de sesión: el tick corre cada 60 s y `armarPasosHoy` no es gratis.
const revisadas = new Set<string>()

/**
 * Red de seguridad del cierre de día (la llama `mantenimientoDiario` con el día
 * ya sellado): si la lista de ese día quedó completa sin que ningún panel lo
 * viera, se otorga aquí, sin celebración. Para un día cerrado los objetivos van
 * por sello y las ejecuciones de rutina son fieles; la única pata coja son los
 * pasos de metas (sin fecha) — aproximación asumida.
 */
export async function otorgarSiDiaCerradoCompleto(plantillaId: string, fecha: string): Promise<void> {
  const memo = `${plantillaId}|${fecha}`
  if (revisadas.has(memo)) return
  revisadas.add(memo)
  if (await db.listasCumplidas.where('[plantillaId+fecha]').equals([plantillaId, fecha]).first()) return
  const pasos = await armarPasosHoy(plantillaId, fecha)
  if (repartirPasos(pasos).completa) await otorgarListaCumplida(plantillaId, fecha)
}

const LS_SEMBRADAS = 'mh.listas.sembradas'

/**
 * Siembra el histórico aproximado UNA vez por dispositivo: un día pasado cuenta
 * si TODOS sus objetivos sellados (`cumplimientosDiarios`, con objetivo > 0)
 * quedaron cumplidos — con la palomita manual mandando sobre la cifra real,
 * igual que en vivo. Va en runtime y no en un upgrade de Dexie porque los
 * upgrades no corren en una BD creada de cero. Es determinista: dos
 * dispositivos siembran lo mismo y la clave natural del sync los funde.
 */
export async function sembrarListasHistoricas(): Promise<void> {
  if (localStorage.getItem(LS_SEMBRADAS)) return
  const [sellos, manuales, existentes] = await Promise.all([
    db.cumplimientosDiarios.toArray(),
    db.metasDiariasManual.toArray(),
    db.listasCumplidas.toArray(),
  ])
  const manual = new Map(manuales.map((m) => [`${m.plantillaId}|${m.fecha}|${m.clave ?? ''}`, m.hecha]))
  const porDia = new Map<string, { total: number; ok: number }>()
  for (const s of sellos) {
    if (s.objetivo <= 0) continue // apagado: nadie se lo propuso
    const k = `${s.plantillaId}|${s.fecha}`
    const acc = porDia.get(k) ?? { total: 0, ok: 0 }
    acc.total++
    const override = manual.get(`${s.plantillaId}|${s.fecha}|${s.clave}`)
    if (override ?? s.hecho >= s.objetivo) acc.ok++
    porDia.set(k, acc)
  }
  const ya = new Set(existentes.map((f) => `${f.plantillaId}|${f.fecha}`))
  const filas: ListaCumplida[] = []
  for (const [k, v] of porDia) {
    if (v.ok < v.total || ya.has(k)) continue
    const [plantillaId, fecha] = k.split('|')
    filas.push({ plantillaId, fecha, xp: XP_POR_LISTA })
  }
  if (filas.length) await db.listasCumplidas.bulkAdd(filas)
  try {
    localStorage.setItem(LS_SEMBRADAS, '1')
  } catch {
    /* sin sitio: la próxima pasada deduplica sola */
  }
}
