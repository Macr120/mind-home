import { useDiseño, objetosDeCuarto } from '../state/disenoStore'
import { useCuartos } from '../state/cuartosStore'
import { tipoYColor } from '../house/modelosRecursos'
import { objetosDe } from '../state/objetosPlantillaStore'
import { getPlantilla } from '../registry'
import type { SideKey } from '../house/walls'

/** Objeto 3D por defecto que encarna una app cuando su plantilla no tiene conjunto. */
const TIPO_OBJETO_APP = 'mesa'

/** Con su PRIMERA app, el cuarto adopta la identidad de la plantilla (nombre + icono). */
async function adoptarIdentidad(cuartoId: string, plantillaId: string, teniaApps: boolean) {
  if (teniaApps) return
  const p = getPlantilla(plantillaId)
  if (!p) return
  const { renombrar, setIcon } = useCuartos.getState()
  await renombrar(cuartoId, p.nombre.split(' · ')[0])
  await setIcon(cuartoId, p.icon)
  // Apps de espacio abierto (jardín): al adoptarlas, el cuarto queda sin muros ni techo.
  if (p.sinMuros) {
    const { useLayout } = await import('../state/layoutStore')
    await useLayout.getState().marcarSinMuros(cuartoId)
  }
  // Garage: su puerta exterior nace como portón, a todo el ancho del vano.
  if (plantillaId === 'garage') {
    const { useLayout } = await import('../state/layoutStore')
    const { SIZE, DOOR_W } = await import('../house/walls')
    const clave = Object.entries(useLayout.getState().wallOverrides[cuartoId] ?? {}).find(
      ([, v]) => v === 'puerta',
    )?.[0]
    if (clave) {
      const [col, row, side] = clave.split(',')
      await useLayout
        .getState()
        .setEdgeEstilo(cuartoId, { col: Number(col), row: Number(row) }, side as SideKey, {
          puerta: { tipo: 'porton', anchoVano: SIZE / DOOR_W },
        })
    }
  }
}

/**
 * Asignar una plantilla (app) a un cuarto trae el paquete de objetos:
 * - el CONJUNTO de objetos de la app (su siembra 3D), sin duplicar los que ya haya,
 * - el objeto principal con la app ligada (`plantillaId`).
 * El asistente que la atiende se elige aparte (catálogo de Plantillas).
 *
 * Con `soloPrincipal`, el cuarto recibe solo el objeto principal (la app), sin el
 * resto del mobiliario.
 */
export async function asignarPlantillaACuarto(
  cuartoId: string,
  plantillaId: string,
  soloPrincipal = false,
): Promise<void> {
  const { objetos, addObjeto, setObjetoPlantilla, setObjetoPrincipal, setObjetoRotacion, setObjetoEscala } = useDiseño.getState()
  const existentes = objetosDeCuarto(objetos, cuartoId)

  // Cada app vive en UN solo cuarto: si ya está asignada (aquí o en otro), no se duplica.
  if (objetos.some((o) => o.plantillaId === plantillaId)) return
  const teniaApps = existentes.some((o) => o.plantillaId)

  const conjunto = objetosDe(plantillaId)
  const siembra = soloPrincipal ? conjunto.filter((s) => s.principal) : conjunto
  let idApp: number | null = null

  if (siembra.length) {
    // No duplicar tipos que el cuarto ya tenía antes de sembrar.
    const tiposPrevios = new Set(existentes.map((o) => o.tipo))
    for (const s of siembra) {
      const { tipo, color } = tipoYColor(s)
      const esPrincipal = s.principal === true
      if (tiposPrevios.has(tipo)) {
        // El cuarto ya tiene ese objeto: si es el principal, liga la app ahí.
        if (esPrincipal) {
          const previo = existentes.find((o) => o.tipo === tipo)
          if (previo?.id != null) {
            await setObjetoPlantilla(previo.id, plantillaId)
            idApp = previo.id
          }
        }
        continue
      }
      const id = await addObjeto(
        cuartoId,
        tipo,
        color,
        esPrincipal ? plantillaId : undefined,
        { x: s.x, z: s.z },
      )
      if (s.rotY) await setObjetoRotacion(id, s.rotY)
      if (s.escala) await setObjetoEscala(id, s.escala)
      if (esPrincipal) idApp = id
    }
    // Sin item principal en la siembra: liga la app al primer objeto sembrado.
    if (idApp == null) {
      const nuevos = objetosDeCuarto(useDiseño.getState().objetos, cuartoId)
      const primero = nuevos.find((o) => !existentes.some((e) => e.id === o.id))
      if (primero?.id != null) {
        await useDiseño.getState().setObjetoPlantilla(primero.id, plantillaId)
        idApp = primero.id
      }
    }
  }

  // Plantillas sin conjunto de objetos (o siembra fallida): objeto-app genérico.
  if (idApp == null) {
    const color = getPlantilla(plantillaId)?.color ?? '#94a3b8'
    idApp = await addObjeto(cuartoId, TIPO_OBJETO_APP, color, plantillaId)
  }

  // El objeto con la app es el punto de entrada del cuarto.
  await setObjetoPrincipal(idApp)

  await adoptarIdentidad(cuartoId, plantillaId, teniaApps)
}

/**
 * Liga la app a UN objeto existente y trae el resto del paquete: el conjunto de
 * objetos que aún falte en el cuarto.
 *
 * Con `soloPrincipal`, solo se liga la app al objeto y no se siembra mobiliario.
 */
export async function asignarPlantillaAObjeto(
  cuartoId: string,
  objetoId: number,
  plantillaId: string,
  soloPrincipal = false,
): Promise<void> {
  const { objetos, setObjetoPlantilla, addObjeto, setObjetoRotacion, setObjetoEscala } = useDiseño.getState()
  // Cada app vive en UN solo cuarto: si ya está asignada a otro objeto, no se duplica.
  if (objetos.some((o) => o.plantillaId === plantillaId && o.id !== objetoId)) return
  const teniaApps = objetosDeCuarto(objetos, cuartoId).some(
    (o) => o.plantillaId && o.id !== objetoId,
  )
  await setObjetoPlantilla(objetoId, plantillaId)

  const existentes = objetosDeCuarto(useDiseño.getState().objetos, cuartoId)
  const tiposPrevios = new Set(existentes.map((o) => o.tipo))
  for (const s of soloPrincipal ? [] : objetosDe(plantillaId)) {
    const { tipo, color } = tipoYColor(s)
    if (tiposPrevios.has(tipo)) continue
    const id = await addObjeto(cuartoId, tipo, color, undefined, { x: s.x, z: s.z })
    if (s.rotY) await setObjetoRotacion(id, s.rotY)
    if (s.escala) await setObjetoEscala(id, s.escala)
  }

  await adoptarIdentidad(cuartoId, plantillaId, teniaApps)
}
