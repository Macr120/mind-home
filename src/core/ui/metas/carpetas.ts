import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import type { TFunc } from '../../i18n/useT'
import { moverMetaACarpeta, type EstadoMeta } from '../../metas'
import { getPlantilla } from '../../registry'
import { CASA } from '../calendario/apps'

/**
 * A qué carpeta pertenece una meta: su app, la categoría que el usuario le puso,
 * o el cajón de la casa.
 *
 * Vive aparte porque lo necesitan las TRES vistas de metas (las carpetas, el
 * tablero y la lista de planes) y cada una lo había resuelto por su cuenta: el
 * día que se añadió el cajón «De la casa» hubo que tocarlo en dos sitios.
 */
export interface CarpetaMeta {
  /** Identidad del grupo: `cat:<nombre>` si es propia, el id de la app si no. */
  clave: string
  nombre: string
  /** Emoji de la app; las categorías propias llevan el de etiqueta. */
  icon: string
  color: string
  /** La inventó el usuario: se puede borrar y acepta metas nuevas suyas. */
  propia: boolean
}

/**
 * Cómo se pinta cada estado de una meta. Vive aquí, con lo demás que comparten las
 * tres vistas, porque estaba copiado en la fila-tarjeta, en el tablero y en la hoja
 * y los tres tonos ya habían empezado a separarse. El texto lo pone quien renderiza
 * (necesita `t`).
 */
export const TONO_ESTADO: Record<EstadoMeta, string> = {
  porHacer: 'border-white/15 bg-white/5 text-white/45',
  enCurso: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  hecho: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
}

/** El borde de cada columna del tablero y el punto de su cabecera. */
export const BORDE_ESTADO: Record<EstadoMeta, string> = {
  porHacer: 'border-white/10',
  enCurso: 'border-amber-400/30',
  hecho: 'border-emerald-400/30',
}

export const PUNTO_ESTADO: Record<EstadoMeta, string> = {
  porHacer: 'bg-white/25',
  enCurso: 'bg-amber-400',
  hecho: 'bg-emerald-400',
}

/** Prefijo de la clave de un grupo que es categoría propia, no app. */
export const PREFIJO_CAT = 'cat:'
/** Color de las categorías propias y del cajón: no salen de ninguna plantilla. */
export const COLOR_CATEGORIA = '#94a3b8'

/** La carpeta de una clave ya resuelta (para pintar grupos vacíos). */
export function carpetaDeClave(clave: string, t: TFunc): CarpetaMeta {
  if (clave.startsWith(PREFIJO_CAT)) {
    return {
      clave,
      nombre: clave.slice(PREFIJO_CAT.length),
      icon: '🏷️',
      color: COLOR_CATEGORIA,
      propia: true,
    }
  }
  if (clave === CASA) {
    return {
      clave,
      nombre: t('cal.filtro.casa', 'De la casa'),
      icon: '📅',
      color: COLOR_CATEGORIA,
      propia: false,
    }
  }
  const p = getPlantilla(clave)
  return {
    clave,
    nombre: p ? t(`room.${p.id}.nombre`, p.nombre) : clave,
    icon: p?.icon ?? '🎯',
    color: p?.color ?? COLOR_CATEGORIA,
    propia: false,
  }
}

/** La clave de carpeta de una meta: manda la categoría propia sobre la app. */
export function claveDeMeta(m: Rutina): string {
  const cat = m.categoriaMeta?.trim()
  return cat ? PREFIJO_CAT + cat : (m.plantillaId ?? CASA)
}

export const carpetaDeMeta = (m: Rutina, t: TFunc): CarpetaMeta => carpetaDeClave(claveDeMeta(m), t)

/**
 * Nombre corto de la carpeta: solo la primera parte del nombre de la app
 * («Agenda · Trabajo, salud y personas» → «Agenda»). Para etiquetas estrechas,
 * donde el nombre entero se come el ancho.
 */
export const nombreCorto = (c: CarpetaMeta): string => c.nombre.split('·')[0].trim()

/** Cómo se llama un plan en la interfaz: su carpeta y qué número hace en ella. */
export interface EtiquetaPlan {
  /** Nombre corto de la carpeta de su meta («Jardín», «Agenda», «Casa»). */
  nombre: string
  color: string
  numero: number
}

/**
 * Cómo se llama cada plan, por id.
 *
 * `PlanMeta.nombre` es «Plan A», «Plan B»… y se numera POR META, así que una lista
 * de dieciséis planes decía «Plan A» dieciséis veces sin distinguir de quién era
 * cada uno. La etiqueta que se pinta es la carpeta de su meta y su número dentro de
 * ella («Jardín · Plan 1»), numerando por orden de creación ASCENDENTE (el primero
 * es el 1) aunque las listas se lean de lo más reciente a lo más viejo.
 *
 * Se calcula sobre la lista de planes que se le pase, no sobre la base entera: las
 * dos vistas que la usan (Planes y el cronograma) parten de los mismos planes —los
 * de las metas visibles—, así que el número de un plan es el mismo en las dos.
 */
export function etiquetasDePlanes(
  planes: { id?: number; metaId: number; creadoEn: string }[],
  metas: Rutina[],
  t: TFunc,
): Map<number, EtiquetaPlan> {
  const porMeta = new Map(metas.map((m) => [m.id, m]))
  const contador = new Map<string, number>()
  const salida = new Map<number, EtiquetaPlan>()

  for (const p of [...planes].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))) {
    if (p.id == null) continue
    const meta = porMeta.get(p.metaId)
    const carpeta = carpetaDeClave(meta ? claveDeMeta(meta) : CASA, t)
    const n = (contador.get(carpeta.clave) ?? 0) + 1
    contador.set(carpeta.clave, n)
    salida.set(p.id, { nombre: nombreCorto(carpeta), color: carpeta.color, numero: n })
  }
  return salida
}

/** «Jardín · Plan 1»; sin etiqueta (plan de una meta que ya no está), el nombre guardado. */
export const textoEtiquetaPlan = (e: EtiquetaPlan | undefined, respaldo: string, t: TFunc): string =>
  e ? `${e.nombre} · ${t('cal.plan.numerado', 'Plan {n}', { n: e.numero })}` : respaldo

/**
 * Soltar una meta arrastrada: la lleva a `destino` (si venía de otra carpeta) y
 * la coloca justo antes de `antesDe`, o al final si no se soltó sobre ninguna.
 *
 * Las dos cosas van juntas a propósito: cambiar de carpeta sin poder decidir
 * dónde cae dejaría la meta siempre arriba del todo. Lo comparten la vista de
 * carpetas y el tablero, que arrastran igual.
 */
export async function soltarMeta(
  metas: Rutina[],
  mueve: Rutina,
  destino: CarpetaMeta,
  antesDe?: Rutina,
): Promise<void> {
  if (mueve.id == null || mueve.id === antesDe?.id) return
  if (claveDeMeta(mueve) !== destino.clave) {
    await moverMetaACarpeta(metas, mueve, {
      // La categoría propia manda sobre la app (así lo lee `claveDeMeta`), y el
      // cajón de la casa es no tener ninguna de las dos.
      plantillaId: destino.propia ? mueve.plantillaId : destino.clave === CASA ? undefined : destino.clave,
      categoriaMeta: destino.propia ? destino.nombre : undefined,
    })
  }

  // Renumera SOLO las de la carpeta de destino. No sirve `moverMeta`: allí las
  // hermanas son «las que comparten madre», y aquí todas son de primer nivel —
  // renumeraría de golpe las metas de las dieciséis carpetas y les mezclaría el
  // orden interno a las que nadie tocó.
  const enCarpeta = metas
    .filter((m) => m.padreId == null && m.id !== mueve.id && claveDeMeta(m) === destino.clave)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.creadoEn.localeCompare(b.creadoEn))
  const i = antesDe ? enCarpeta.findIndex((m) => m.id === antesDe.id) : -1
  const at = i === -1 ? enCarpeta.length : i
  const fila = [...enCarpeta.slice(0, at), mueve, ...enCarpeta.slice(at)]
  await Promise.all(fila.map((r, orden) => rutinasRepo.update(r.id!, { orden })))
}
