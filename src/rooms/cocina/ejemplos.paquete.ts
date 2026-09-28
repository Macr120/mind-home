import {
  aguaRepo,
  comidasRepo,
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  planComidasRepo,
  recetasRepo,
} from '../../core/data/repository'
import { esEjemplo } from '../../core/data/ejemplos'
import type { PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { sembrarEjemplosCocina } from './seed'

/**
 * Fila de la siembra de fábrica, tocada o no: la delata su uid (`seed-…`). Las
 * de otros paquetes de ejemplo de la cocina (`ejemploDe`, p. ej. el control de
 * alimentación) también empiezan por `seed-` y no son de este.
 */
const deFabrica = (fila: unknown) => !!(fila as { uid?: string }).uid?.startsWith('seed-') && !esEjemplo(fila)

/** Donde la siembra deja el ejemplo. El perfil no: es del usuario desde el primer día. */
const TABLAS = [recetasRepo, dietasGuardadasRepo, listasCompraRepo, itemsCompraRepo, comidasRepo, aguaRepo]

/**
 * El ejemplo de fábrica de la cocina: las recetas, las dietas que las usan, el
 * día de ejemplo del registro y la lista del súper. Lo siembra la propia app al
 * abrirse (`sembrarCocina`, filas `seed-…` sin marca): la barra solo lo borra
 * y lo restaura.
 */
export const ejemploCocina: PaqueteEjemplo = {
  id: 'cocina.recetario',
  // Sus filas no llevan `ejemploDe`: lo que la barra necesita saber de ellas lo
  // contestan `hayEjemplo` y `hayPropios`.
  tablas: [],
  auto: false,
  async hayEjemplo() {
    for (const t of TABLAS) if (await t.alguna(deFabrica)) return true
    return false
  },
  async hayPropios() {
    for (const t of TABLAS) if (await t.alguna((f: unknown) => !deFabrica(f) && !esEjemplo(f))) return true
    return false
  },
  async borrar() {
    // Como «Eliminar» en una receta: sin sus celdas, la rejilla del plan de
    // comidas apuntaría a la nada.
    const recetas = new Set((await recetasRepo.list()).filter(deFabrica).map((r) => r.id))
    for (const p of await planComidasRepo.list()) {
      if (p.id != null && recetas.has(p.recetaId)) await planComidasRepo.remove(p.id)
    }
    // Como «Eliminar lista»: se va con todo lo que lleve dentro. El gasto del
    // Despacho se queda, que el dinero ya se gastó.
    const listas = new Set((await listasCompraRepo.list()).filter(deFabrica).map((l) => l.id))
    for (const i of await itemsCompraRepo.list()) {
      if (i.id != null && i.listaId != null && listas.has(i.listaId)) await itemsCompraRepo.remove(i.id)
    }
    for (const t of TABLAS) {
      for (const f of await t.list()) {
        const id = (f as { id?: number }).id
        if (id != null && deFabrica(f)) await t.remove(id)
      }
    }
  },
  materializar: sembrarEjemplosCocina,
}
