import { useDiseño, objetosDeCuarto } from '../state/disenoStore'
import type { ObjetoCuarto, SiembraGuardada } from '../data/db'
import { useCuartos } from '../state/cuartosStore'
import { tipoYColor } from '../house/modelosRecursos'
import { instanciasSiembra } from '../muebles/recetasSiembra'
import { objetosDe } from '../state/objetosPlantillaStore'
import { getPlantilla } from '../registry'
import type { SideKey } from '../house/walls'

/**
 * La pareja de `s` que ya está en el cuarto. Dos objetos de la siembra que
 * comparten x/z son un mueble y lo que va ENCIMA (el escritorio y su monitor,
 * ver los comentarios de `SIEMBRA`). Si uno de los dos ya estaba en el cuarto
 * —y por eso no se vuelve a sembrar—, el otro se coloca donde él esté y no en el
 * hueco de la siembra: sin su mesa debajo, el monitor se queda flotando.
 */
function parejaExistente(
  s: SiembraGuardada,
  conjunto: SiembraGuardada[],
  existentes: ObjetoCuarto[],
): ObjetoCuarto | undefined {
  const pareja = conjunto.find((o) => o !== s && o.x === s.x && o.z === s.z)
  if (!pareja) return undefined
  const { tipo } = tipoYColor(pareja)
  return existentes.find((o) => tipoDeSiembra(o) === tipo)
}

/** El tipo con el que la siembra reconoce un objeto: el de fábrica si ya se convirtió (a mueble del taller o a piezas). */
const tipoDeSiembra = (o: ObjetoCuarto): string => o.tipoOriginal ?? o.tipo

/**
 * Crea en el cuarto lo que aporta una entrada de la siembra: el objeto, o sus
 * copias ya hechas mueble del taller (`recetasSiembra.ts`). Solo la primera
 * lleva la app. Devuelve los ids creados.
 */
async function sembrar(
  cuartoId: string,
  tipo: string,
  color: string,
  plantillaId: string | undefined,
  pos: { x: number; z: number },
  giro?: number,
  escala?: number,
): Promise<number[]> {
  const { addObjeto } = useDiseño.getState()
  // Giro y escala en la misma escritura: un compuesto suelta sus partes al crearse
  // y deben nacer ya en su pose final.
  const pose: Partial<ObjetoCuarto> = {
    ...(giro ? { rotY: ((giro % 360) + 360) % 360 } : {}),
    ...(escala ? { escala } : {}),
  }
  const ids: number[] = []
  for (const c of instanciasSiembra(tipo, color, { ...pos, rotY: giro, escala })) {
    const id = await addObjeto(cuartoId, c.tipo, c.color, c.primera ? plantillaId : undefined, { x: c.x, z: c.z }, {
      ...c.extra,
      ...pose,
    })
    ids.push(id)
  }
  return ids
}

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
  const { objetos, addObjeto, setObjetoPlantilla, setObjetoPrincipal, asentarSobreMuebles } = useDiseño.getState()
  const existentes = objetosDeCuarto(objetos, cuartoId)

  // Cada app vive en UN solo cuarto: si ya está asignada (aquí o en otro), no se duplica.
  if (objetos.some((o) => o.plantillaId === plantillaId)) return
  const teniaApps = existentes.some((o) => o.plantillaId)

  const conjunto = objetosDe(plantillaId)
  const siembra = soloPrincipal ? conjunto.filter((s) => s.principal) : conjunto
  let idApp: number | null = null
  const nuevos: number[] = []

  if (siembra.length) {
    // No duplicar tipos que el cuarto ya tenía antes de sembrar.
    const tiposPrevios = new Set(existentes.map(tipoDeSiembra))
    for (const s of siembra) {
      const { tipo, color } = tipoYColor(s)
      const esPrincipal = s.principal === true
      if (tiposPrevios.has(tipo)) {
        // El cuarto ya tiene ese objeto: si es el principal, liga la app ahí.
        if (esPrincipal) {
          const previo = existentes.find((o) => tipoDeSiembra(o) === tipo)
          if (previo?.id != null) {
            await setObjetoPlantilla(previo.id, plantillaId)
            idApp = previo.id
          }
        }
        continue
      }
      const apoyo = parejaExistente(s, siembra, existentes)
      const ids = await sembrar(
        cuartoId,
        tipo,
        color,
        esPrincipal ? plantillaId : undefined,
        { x: apoyo?.x ?? s.x, z: apoyo?.z ?? s.z },
        apoyo?.rotY ?? s.rotY,
        s.escala,
      )
      nuevos.push(...ids)
      if (esPrincipal) idApp = ids[0]
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
  // Lo que la siembra deja encima de un mueble (monitor, TV, despertador…) queda apoyado en él.
  await asentarSobreMuebles(nuevos)

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
  const { objetos, setObjetoPlantilla, asentarSobreMuebles } = useDiseño.getState()
  // Cada app vive en UN solo cuarto: si ya está asignada a otro objeto, no se duplica.
  if (objetos.some((o) => o.plantillaId === plantillaId && o.id !== objetoId)) return
  const teniaApps = objetosDeCuarto(objetos, cuartoId).some(
    (o) => o.plantillaId && o.id !== objetoId,
  )
  await setObjetoPlantilla(objetoId, plantillaId)

  const existentes = objetosDeCuarto(useDiseño.getState().objetos, cuartoId)
  const tiposPrevios = new Set(existentes.map(tipoDeSiembra))
  const conjunto = soloPrincipal ? [] : objetosDe(plantillaId)
  const nuevos: number[] = []
  for (const s of conjunto) {
    const { tipo, color } = tipoYColor(s)
    if (tiposPrevios.has(tipo)) continue
    const apoyo = parejaExistente(s, conjunto, existentes)
    const pos = { x: apoyo?.x ?? s.x, z: apoyo?.z ?? s.z }
    nuevos.push(...(await sembrar(cuartoId, tipo, color, undefined, pos, apoyo?.rotY ?? s.rotY, s.escala)))
  }
  await asentarSobreMuebles(nuevos)

  await adoptarIdentidad(cuartoId, plantillaId, teniaApps)
}
