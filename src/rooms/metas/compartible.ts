import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { EnlaceApp, EntradaPlan, MaterialPlan, NodoPlan, Rutina } from '../../core/data/db'
import { planesMetaRepo, rutinasRepo } from '../../core/data/repository'
import { DIA_MS, fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { crearMeta, esMeta, hijasDe } from '../../core/metas'

/**
 * Lo que Metas manda por el buzón: una meta con todas sus sub-metas y los planes
 * que aún son propuesta. Es una PLANTILLA para quien la recibe, no un espejo:
 *
 * - Nace sin fechas y sin nada palomeado (la lista primero; el cronograma, cuando
 *   la otra persona decida cuándo empezar).
 * - Los planes llegan como propuesta con el día 0 en la fecha de hoy: sus nodos
 *   ya cuentan días relativos, así que el cronograma sale igual de proporcionado.
 * - No viaja lo que es de esta casa: el calendario compartido, el sub-ámbito
 *   (`hobby:3` es un id local) ni los enlaces entre nodos y sub-metas reales.
 */

interface MetaDatos {
  nombre: string
  emoji: string
  nota?: string
  color?: string
  plantillaId?: string
  categoriaMeta?: string
  enlaceApp?: EnlaceApp
  pasos: string[]
  hijas: MetaDatos[]
}

interface PlanDatos {
  nombre: string
  nodos: NodoPlan[]
  entrada: EntradaPlan
  /** Días entre el arranque y la fecha objetivo del plan original (si la tenía). */
  diasObjetivo?: number
  resumen?: string
  material?: MaterialPlan[]
}

interface PaqueteMeta {
  meta: MetaDatos
  planes: PlanDatos[]
}

function arbol(todas: Rutina[], m: Rutina): MetaDatos {
  return {
    nombre: m.nombre,
    emoji: m.emoji,
    ...(m.nota ? { nota: m.nota } : {}),
    ...(m.color ? { color: m.color } : {}),
    ...(m.plantillaId ? { plantillaId: m.plantillaId } : {}),
    ...(m.categoriaMeta ? { categoriaMeta: m.categoriaMeta } : {}),
    ...(m.enlaceApp ? { enlaceApp: m.enlaceApp } : {}),
    pasos: m.pasos.map((p) => p.titulo),
    hijas: hijasDe(todas, m.id).map((h) => arbol(todas, h)),
  }
}

const contar = (m: MetaDatos): number => m.hijas.reduce((n, h) => n + 1 + contar(h), 0)

const detalleMeta = (n: number) => (n > 0 ? tGlobal('buzon.meta.submetas', '{n} sub-metas', { n: String(n) }) : undefined)

const metasDeLaCasa = async () => (await rutinasRepo.list()).filter((r) => esMeta(r) && !r.calendarioId)

export async function empaquetarMeta(metaId: number): Promise<Paquete | null> {
  const todas = await metasDeLaCasa()
  const m = todas.find((x) => x.id === metaId)
  if (!m) return null
  const meta = arbol(todas, m)
  const planes: PlanDatos[] = (await planesMetaRepo.list())
    .filter((p) => p.metaId === metaId && !p.aceptadoEn)
    .map((p) => {
      const inicio = p.entrada.fechaInicio ?? p.inicioISO
      const objetivo = p.entrada.fechaObjetivo
      return {
        nombre: p.nombre,
        nodos: p.nodos.map(({ metaRealId: _local, ...n }) => n),
        entrada: { horasSemana: p.entrada.horasSemana, dias: p.entrada.dias, nivel: p.entrada.nivel },
        ...(objetivo
          ? { diasObjetivo: Math.round((new Date(objetivo + 'T12:00').getTime() - new Date(inicio + 'T12:00').getTime()) / DIA_MS) }
          : {}),
        ...(p.resumen ? { resumen: p.resumen } : {}),
        ...(p.material?.length ? { material: p.material } : {}),
      }
    })
  const datos: PaqueteMeta = { meta, planes }
  return { app: 'metas', tipo: 'meta', version: 1, nombre: m.nombre, resumen: detalleMeta(contar(meta)), emoji: m.emoji, datos }
}

export async function listarMetas(): Promise<ItemCompartible[]> {
  const todas = await metasDeLaCasa()
  return todas
    .filter((m) => m.id != null && m.padreId == null)
    .map((m) => ({ clave: `meta:${m.id}`, nombre: `${m.emoji} ${m.nombre}`, detalle: detalleMeta(contar(arbol(todas, m))) }))
}

export async function empaquetarMetaPorClave(clave: string): Promise<Paquete | null> {
  return empaquetarMeta(Number(clave.split(':')[1]))
}

/** Crea la meta y, debajo, sus sub-metas en el mismo orden. */
async function crearArbol(d: MetaDatos, padre?: Rutina): Promise<Rutina | undefined> {
  const metas = (await rutinasRepo.list()).filter(esMeta)
  const nueva = await crearMeta(metas, d.nombre, padre, d.color, d.plantillaId)
  if (!nueva?.id) return
  await rutinasRepo.update(nueva.id, {
    emoji: typeof d.emoji === 'string' && d.emoji ? d.emoji : '🎯',
    pasos: Array.isArray(d.pasos) ? d.pasos.filter((x) => typeof x === 'string').map((titulo) => ({ titulo, roomId: '' })) : [],
    ...(d.nota ? { nota: d.nota } : {}),
    ...(d.categoriaMeta ? { categoriaMeta: d.categoriaMeta } : {}),
    ...(d.enlaceApp ? { enlaceApp: d.enlaceApp } : {}),
  })
  // `crearMeta` pone cada hija al PRINCIPIO de sus hermanas: se crean al revés
  // para que queden en el orden en que venían.
  for (const h of [...(Array.isArray(d.hijas) ? d.hijas : [])].reverse()) await crearArbol(h, nueva)
  return nueva
}

export async function importarMeta(p: Paquete): Promise<{ seccion?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<PaqueteMeta> | null
  if (!d?.meta || typeof d.meta.nombre !== 'string') throw new Error('Meta inválida')
  const existe = (await metasDeLaCasa()).some((m) => m.padreId == null && normalizar(m.nombre) === normalizar(d.meta!.nombre))
  if (existe && !(await confirmarDuplicado(d.meta.nombre))) return { cancelado: true }
  const raiz = await crearArbol(d.meta)
  if (!raiz?.id) throw new Error('Meta inválida')
  const hoy = fechaLocalISO()
  for (const plan of Array.isArray(d.planes) ? d.planes : []) {
    if (!Array.isArray(plan?.nodos) || !plan.entrada) continue
    await planesMetaRepo.add({
      metaId: raiz.id,
      nombre: plan.nombre,
      inicioISO: hoy,
      nodos: plan.nodos,
      entrada: {
        ...plan.entrada,
        fechaInicio: hoy,
        ...(typeof plan.diasObjetivo === 'number' ? { fechaObjetivo: isoMasDias(hoy, plan.diasObjetivo) } : {}),
      },
      ...(plan.resumen ? { resumen: plan.resumen } : {}),
      ...(plan.material ? { material: plan.material } : {}),
      creadoEn: new Date().toISOString(),
    })
  }
  return {}
}
